import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  buildKimiSemanticUserPrompt,
  KIMI_SEMANTIC_SYSTEM_PROMPT
} from "./kimi.mjs";

export const KIMI_CLI_DEFAULT_MODEL = "kimi-code/k3";

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function contentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => {
    if (typeof item === "string") return item;
    if (item?.type === "text" || typeof item?.text === "string") return item.text || "";
    return "";
  }).join("");
}

function eventRole(event) {
  return event?.role || event?.message?.role || (event?.type === "assistant" ? "assistant" : "");
}

function hasToolCall(event) {
  if (eventRole(event) === "tool" || event?.type === "tool" || event?.type === "tool_result") return true;
  if (event?.tool_calls?.length || event?.message?.tool_calls?.length) return true;
  const contents = [event?.content, event?.message?.content].filter(Array.isArray);
  return contents.some((items) => items.some((item) =>
    ["tool_use", "tool_call", "tool_result"].includes(item?.type)
  ));
}

export function parseKimiCliStream(stdout) {
  const events = [];
  const assistantContents = [];
  for (const [index, rawLine] of String(stdout || "").split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw createError(`Kimi CLI 第 ${index + 1} 行不是有效 JSONL`, "KIMI_CLI_OUTPUT_INVALID");
    }
    if (hasToolCall(event)) {
      throw createError("Kimi CLI 尝试调用工具；为保护工作区，本次规划已中止", "KIMI_CLI_TOOL_CALL_REJECTED");
    }
    events.push(event);
    if (eventRole(event) === "assistant") {
      const content = contentToText(event?.content ?? event?.message?.content);
      if (content.trim()) assistantContents.push(content);
    }
  }
  if (!assistantContents.length) {
    throw createError("Kimi CLI 输出中没有 assistant 最终内容", "KIMI_CLI_OUTPUT_INVALID");
  }
  return { events, assistantContent: assistantContents.at(-1) };
}

export function parseKimiCliPlan(content) {
  let candidate = String(content || "").trim();
  const fenced = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) candidate = fenced[1].trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // 使用统一错误信息，避免把大段模型输出复制到 stderr。
      }
    }
  }
  throw createError("Kimi CLI 最终内容不是有效 JSON 对象", "KIMI_CLI_OUTPUT_INVALID");
}

export function resolveKimiCliEntry({
  env = process.env,
  platform = process.platform
} = {}) {
  if (env.KIMI_CLI_ENTRY) return path.resolve(env.KIMI_CLI_ENTRY);
  if (platform === "win32" && env.APPDATA) {
    return path.join(
      env.APPDATA,
      "npm",
      "node_modules",
      "@moonshot-ai",
      "kimi-code",
      "dist",
      "main.mjs"
    );
  }
  return null;
}

export function executeKimiCliProcess({
  prompt,
  model = KIMI_CLI_DEFAULT_MODEL,
  workingDirectory,
  skillsDirectory,
  cliEntry = resolveKimiCliEntry(),
  spawnImpl = spawn,
  timeoutMs = 180000
}) {
  return new Promise((resolve, reject) => {
    let command;
    let args;
    if (cliEntry) {
      if (!fs.existsSync(cliEntry)) {
        reject(createError(`未找到 Kimi Code CLI：${cliEntry}`, "KIMI_CLI_NOT_FOUND"));
        return;
      }
      command = process.execPath;
      args = [cliEntry, "-m", model, "-p", prompt, "--output-format", "stream-json"];
    } else {
      command = "kimi";
      args = ["-m", model, "-p", prompt, "--output-format", "stream-json"];
    }
    if (skillsDirectory) args.push("--skills-dir", skillsDirectory);

    const child = spawnImpl(command, args, {
      cwd: workingDirectory,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      child.kill();
      settled = true;
      reject(createError(`Kimi CLI 执行超时（${timeoutMs} ms）`, "KIMI_CLI_TIMEOUT"));
    }, timeoutMs);

    child.stdout?.setEncoding?.("utf8");
    child.stderr?.setEncoding?.("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
      stdoutLineBuffer += chunk;
      const lines = stdoutLineBuffer.split(/\r?\n/);
      stdoutLineBuffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          if (hasToolCall(JSON.parse(line))) {
            child.kill();
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              reject(createError(
                "Kimi CLI 尝试调用工具；为保护工作区，已终止子进程",
                "KIMI_CLI_TOOL_CALL_REJECTED"
              ));
            }
            return;
          }
        } catch {
          // 完整输出将在进程结束后由严格 JSONL 解析器报告格式错误。
        }
      }
    });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const code = error?.code === "ENOENT" ? "KIMI_CLI_NOT_FOUND" : "KIMI_CLI_EXECUTION_FAILED";
      reject(createError(`Kimi CLI 启动失败：${error.message}`, code));
    });
    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode,
        stdout,
        stderr,
        command,
        args: [...args.slice(0, 4), "<PROMPT>", ...args.slice(5)]
      });
    });
  });
}

function looksLikeLoginProblem(text) {
  return /(login|log in|authentication|unauthorized|invalid credential|401|登录|认证)/i.test(text);
}

export async function requestKimiCliSemanticPlan({
  input,
  prompt,
  model = KIMI_CLI_DEFAULT_MODEL,
  workingDirectory,
  executeImpl = executeKimiCliProcess,
  timeoutMs = 180000
}) {
  if (!input?.trim()) throw new Error("论文材料不能为空");
  if (!workingDirectory) throw new Error("Kimi CLI 必须使用隔离工作目录");
  fs.mkdirSync(workingDirectory, { recursive: true });
  if (fs.readdirSync(workingDirectory).length) {
    throw new Error(`Kimi CLI 隔离工作目录必须为空：${workingDirectory}`);
  }
  const skillsDirectory = path.join(workingDirectory, "empty-skills");
  fs.mkdirSync(skillsDirectory);

  const cliPrompt = [
    KIMI_SEMANTIC_SYSTEM_PROMPT,
    "本次任务禁止调用任何工具、禁止读取或写入文件、禁止执行命令。所有材料已包含在本提示中。",
    buildKimiSemanticUserPrompt({ input, prompt, includeSchema: true }),
    "只输出一个 JSON 对象；不要使用 Markdown 代码围栏。"
  ].join("\n\n");

  const execution = await executeImpl({
    prompt: cliPrompt,
    model,
    workingDirectory,
    skillsDirectory,
    timeoutMs
  });
  const combinedOutput = `${execution.stdout || ""}\n${execution.stderr || ""}`;
  if (execution.exitCode !== 0) {
    const code = looksLikeLoginProblem(combinedOutput)
      ? "KIMI_CLI_LOGIN_REQUIRED"
      : "KIMI_CLI_EXECUTION_FAILED";
    throw createError(
      code === "KIMI_CLI_LOGIN_REQUIRED"
        ? "Kimi Code CLI 尚未登录或登录已失效；请先执行 kimi login"
        : `Kimi CLI 执行失败（退出码 ${execution.exitCode}）`,
      code
    );
  }

  const parsed = parseKimiCliStream(execution.stdout);
  const plan = parseKimiCliPlan(parsed.assistantContent);
  return {
    plan,
    metadata: {
      provider: "kimi-cli",
      channel: "cli-membership",
      model,
      request_id: null,
      usage: null
    },
    raw: {
      exit_code: execution.exitCode,
      stdout_events: parsed.events,
      stderr: execution.stderr || "",
      command: execution.command || null,
      arguments: execution.args || null
    }
  };
}
