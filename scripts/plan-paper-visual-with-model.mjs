import fs from "node:fs";
import path from "node:path";
import { requestKimiSemanticPlan } from "../providers/kimi.mjs";
import { KIMI_CLI_DEFAULT_MODEL, requestKimiCliSemanticPlan } from "../providers/kimi-cli.mjs";
import { layoutSemanticPlan, validateSemanticPlan } from "../planner/paper-visual-semantic.mjs";
import { validateVisualPlan } from "../paper-visual/render-paper-visual.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    args[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const args = parseArgs(process.argv.slice(2));
if (!args.provider || !args.input || !args.output) {
  process.stderr.write("用法：node scripts/plan-paper-visual-with-model.mjs --provider kimi|kimi-code|kimi-cli --input input.md --output output-dir [--prompt prompt.md] [--model kimi-k3|k3|kimi-code/k3]\n");
  process.exit(2);
}

const startedAt = new Date();
const outputDir = path.resolve(args.output);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });

const inputPath = path.resolve(args.input);
const promptPath = args.prompt ? path.resolve(args.prompt) : null;
const input = fs.readFileSync(inputPath, "utf8");
const prompt = promptPath ? fs.readFileSync(promptPath, "utf8") : "";
fs.copyFileSync(inputPath, path.join(outputDir, "input.md"));
if (promptPath) fs.copyFileSync(promptPath, path.join(outputDir, "prompt.md"));

if (!["kimi", "kimi-code", "kimi-cli"].includes(args.provider)) {
  process.stderr.write(`当前不支持 provider=${args.provider}；已实现：kimi、kimi-code、kimi-cli\n`);
  process.exit(2);
}

try {
  const channel = args.provider === "kimi-cli"
    ? "cli-membership"
    : args.provider === "kimi-code" ? "code-membership" : "open-platform";
  const cliWorkspace = path.join(outputDir, "cli-workspace");
  const result = args.provider === "kimi-cli"
    ? await requestKimiCliSemanticPlan({
      input,
      prompt,
      model: args.model || KIMI_CLI_DEFAULT_MODEL,
      workingDirectory: cliWorkspace
    })
    : await requestKimiSemanticPlan({ input, prompt, model: args.model, channel });
  const semanticValidation = validateSemanticPlan(result.plan);
  if (semanticValidation.status !== "PASS") throw new Error(`Kimi 语义规划校验失败：${semanticValidation.errors.join("；")}`);
  const visualPlan = layoutSemanticPlan(result.plan);
  const visualValidation = validateVisualPlan(visualPlan);
  if (visualValidation.status !== "PASS") throw new Error(`最终 visual-plan 校验失败：${visualValidation.errors.join("；")}`);

  writeJson(path.join(outputDir, "model-response.json"), result.raw);
  writeJson(path.join(outputDir, "model-metadata.json"), {
    ...result.metadata,
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString()
  });
  writeJson(path.join(outputDir, "semantic-plan.json"), result.plan);
  writeJson(path.join(outputDir, "semantic-validation.json"), semanticValidation);
  writeJson(path.join(outputDir, "visual-plan.json"), visualPlan);
  writeJson(path.join(outputDir, "visual-plan-validation.json"), visualValidation);
  process.stdout.write(`${JSON.stringify({ status: "PASS", provider: result.metadata.provider, channel: result.metadata.channel, model: result.metadata.model, output: outputDir }, null, 2)}\n`);
} catch (error) {
  const blocked = new Set([
    "KIMI_API_KEY_MISSING",
    "KIMI_CLI_NOT_FOUND",
    "KIMI_CLI_LOGIN_REQUIRED"
  ]).has(error.code);
  const status = blocked ? "BLOCKED" : "FAIL";
  const channel = args.provider === "kimi-cli"
    ? "cli-membership"
    : args.provider === "kimi-code" ? "code-membership" : "open-platform";
  const fallbackModel = args.provider === "kimi-cli"
    ? KIMI_CLI_DEFAULT_MODEL
    : args.provider === "kimi-code" ? "k3" : "kimi-k3";
  writeJson(path.join(outputDir, "model-run-status.json"), {
    status,
    provider: args.provider,
    channel,
    model: args.model || fallbackModel,
    reason: error.message,
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString()
  });
  process.stderr.write(`${status}：${error.message}\n`);
  process.exit(blocked ? 3 : 1);
}
