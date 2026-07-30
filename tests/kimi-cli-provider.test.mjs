import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import {
  executeKimiCliProcess,
  KIMI_CLI_DEFAULT_MODEL,
  parseKimiCliPlan,
  parseKimiCliStream,
  requestKimiCliSemanticPlan
} from "../providers/kimi-cli.mjs";
import { layoutSemanticPlan, validateSemanticPlan } from "../planner/paper-visual-semantic.mjs";
import { validateVisualPlan } from "../paper-visual/render-paper-visual.mjs";

const semanticPlan = {
  schema_version: 1,
  mode: "paper-visual-semantic",
  type: "feedback-loop",
  title: "闭环优化流程",
  subtitle: "数据处理—模型求解—结果检验—反馈修正",
  theme: "academic-blue",
  groups: [
    { id: "G1", label: "数据准备" },
    { id: "G2", label: "模型求解" },
    { id: "G3", label: "结果检验" }
  ],
  nodes: [
    { id: "N1", group: "G1", label: "数据清洗", detail: "处理缺失值与异常值", shape: "process", tag: "输入" },
    { id: "N2", group: "G2", label: "参数估计", detail: "基于训练数据求解参数", shape: "process", tag: "建模" },
    { id: "N3", group: "G3", label: "误差是否达标", detail: "依据既定阈值检验", shape: "decision", tag: "判定" },
    { id: "N4", group: "G3", label: "输出结果", detail: "形成论文图表与结论", shape: "pill", tag: "输出" }
  ],
  edges: [
    { id: "E1", from: "N1", to: "N2", kind: "flow", label: "标准化数据", start_arrow: "none", end_arrow: "triangle" },
    { id: "E2", from: "N2", to: "N3", kind: "flow", label: "预测结果", start_arrow: "none", end_arrow: "triangle" },
    { id: "E3", from: "N3", to: "N4", kind: "pass", label: "通过", start_arrow: "none", end_arrow: "triangle" },
    { id: "E4", from: "N3", to: "N2", kind: "feedback", label: "未通过：修正", start_arrow: "none", end_arrow: "triangle" }
  ]
};
const testInput = "先清洗数据，再估计参数；误差达标则输出，否则返回参数估计。";
const testPrompt = "生成闭环优化流程图。";

const outputIndex = process.argv.indexOf("--output");
const outputDir = path.resolve(
  outputIndex >= 0 ? process.argv[outputIndex + 1] : `outputs/ppt/kimi-cli-provider-test-${process.pid}`
);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) {
  throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
}
fs.mkdirSync(outputDir, { recursive: true });

const fenced = `\`\`\`json\n${JSON.stringify(semanticPlan)}\n\`\`\``;
const streamText = [
  JSON.stringify({ type: "status", status: "started" }),
  JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "text", text: fenced }] } })
].join("\n");

const parsedStream = parseKimiCliStream(streamText);
assert.equal(parsedStream.events.length, 2);
assert.deepEqual(parseKimiCliPlan(parsedStream.assistantContent), semanticPlan);

const successWorkspace = path.join(outputDir, "success-workspace");
const successResult = await requestKimiCliSemanticPlan({
  input: testInput,
  prompt: testPrompt,
  workingDirectory: successWorkspace,
  executeImpl: async ({ prompt, model, workingDirectory, skillsDirectory }) => {
    assert.equal(model, KIMI_CLI_DEFAULT_MODEL);
    assert.equal(workingDirectory, successWorkspace);
    assert.equal(skillsDirectory, path.join(successWorkspace, "empty-skills"));
    assert.equal(fs.readdirSync(skillsDirectory).length, 0);
    assert.match(prompt, /禁止调用任何工具/);
    assert.match(prompt, /JSON Schema/);
    return {
      exitCode: 0,
      stdout: streamText,
      stderr: "offline mock stderr",
      command: process.execPath,
      args: ["<kimi-entry>", "-m", model, "-p", "<PROMPT>", "--output-format", "stream-json"]
    };
  }
});
assert.equal(successResult.metadata.provider, "kimi-cli");
assert.equal(successResult.metadata.channel, "cli-membership");
assert.equal(successResult.raw.arguments.includes("<PROMPT>"), true);
assert.equal(successResult.raw.arguments.join(" ").includes("JSON Schema"), false);
assert.equal(validateSemanticPlan(successResult.plan).status, "PASS");
const visualPlan = layoutSemanticPlan(successResult.plan);
assert.equal(validateVisualPlan(visualPlan).status, "PASS");

await assert.rejects(
  () => requestKimiCliSemanticPlan({
    input: "材料",
    prompt: "要求",
    workingDirectory: path.join(outputDir, "login-workspace"),
    executeImpl: async () => ({ exitCode: 1, stdout: "", stderr: "Please login first" })
  }),
  (error) => error.code === "KIMI_CLI_LOGIN_REQUIRED"
);

await assert.rejects(
  () => requestKimiCliSemanticPlan({
    input: "材料",
    prompt: "要求",
    workingDirectory: path.join(outputDir, "tool-workspace"),
    executeImpl: async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        role: "assistant",
        content: "",
        tool_calls: [{ name: "shell", arguments: {} }]
      }),
      stderr: ""
    })
  }),
  (error) => error.code === "KIMI_CLI_TOOL_CALL_REJECTED"
);

let liveChild;
await assert.rejects(
  () => executeKimiCliProcess({
    prompt: "不得调用工具",
    workingDirectory: outputDir,
    skillsDirectory: path.join(outputDir, "empty-skills-live-test"),
    cliEntry: process.execPath,
    spawnImpl: () => {
      liveChild = new EventEmitter();
      liveChild.stdout = new PassThrough();
      liveChild.stderr = new PassThrough();
      liveChild.kill = () => {
        liveChild.killed = true;
        queueMicrotask(() => liveChild.emit("close", 143));
      };
      queueMicrotask(() => liveChild.stdout.write(`${JSON.stringify({
        role: "assistant",
        content: "",
        tool_calls: [{ name: "shell", arguments: {} }]
      })}\n`));
      return liveChild;
    }
  }),
  (error) => error.code === "KIMI_CLI_TOOL_CALL_REJECTED"
);
assert.equal(liveChild.killed, true);

fs.writeFileSync(
  path.join(outputDir, "input.md"),
  `${testInput}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "prompt.md"),
  `${testPrompt}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "model-response.json"),
  `${JSON.stringify(successResult.raw, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "model-metadata.json"),
  `${JSON.stringify(successResult.metadata, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "semantic-plan.json"),
  `${JSON.stringify(successResult.plan, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "visual-plan.json"),
  `${JSON.stringify(visualPlan, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "validation.json"),
  `${JSON.stringify({
    semantic: validateSemanticPlan(successResult.plan),
    visual: validateVisualPlan(visualPlan),
    login_error_mapping: "PASS",
    tool_call_rejection: "PASS",
    live_tool_call_termination: "PASS"
  }, null, 2)}\n`,
  "utf8"
);

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  provider: successResult.metadata.provider,
  model: successResult.metadata.model,
  output: outputDir
}, null, 2)}\n`);
