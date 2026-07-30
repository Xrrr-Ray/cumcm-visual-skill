import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { planModelDiagram } from "../model-diagram/model-diagram.mjs";
import { renderHtml, renderSvg, validateVisualPlan } from "../paper-visual/render-paper-visual.mjs";

function args(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    result[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

function hash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function json(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const options = args(process.argv.slice(2));
if (!options.input || !options.output) {
  process.stderr.write("用法：node scripts/generate-model-diagram.mjs --input model.json --output output-dir\n");
  process.exit(2);
}
const startedAt = new Date();
const inputPath = path.resolve(options.input);
const outputDir = path.resolve(options.output);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });

try {
  const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const plan = planModelDiagram(source);
  const validation = validateVisualPlan(plan);
  if (validation.status !== "PASS") throw new Error(validation.errors.join("；"));
  fs.copyFileSync(inputPath, path.join(outputDir, path.basename(inputPath)));
  json(path.join(outputDir, "model-spec.json"), plan.model_spec);
  const visualPlan = structuredClone(plan);
  delete visualPlan.model_spec;
  json(path.join(outputDir, "visual-plan.json"), visualPlan);
  fs.writeFileSync(path.join(outputDir, "diagram.svg"), renderSvg(visualPlan), "utf8");
  fs.writeFileSync(path.join(outputDir, "index.html"), renderHtml(visualPlan), "utf8");
  fs.writeFileSync(path.join(outputDir, "edit.html"), renderHtml(visualPlan, { edit: true }), "utf8");
  const files = ["model-spec.json", "visual-plan.json", "diagram.svg", "index.html", "edit.html"];
  const checks = [
    { id: "visual_plan", pass: validation.status === "PASS", details: validation },
    { id: "svg_finite", pass: !/NaN|undefined|Infinity/.test(fs.readFileSync(path.join(outputDir, "diagram.svg"), "utf8")) },
    { id: "editor", pass: fs.readFileSync(path.join(outputDir, "edit.html"), "utf8").includes("论文图高级编辑器") }
  ];
  json(path.join(outputDir, "validation-report.json"), {
    schema_version: 1,
    status: checks.every((check) => check.pass) ? "PASS" : "FAIL",
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    checks,
    files: Object.fromEntries(files.map((name) => [name, { bytes: fs.statSync(path.join(outputDir, name)).size, sha256: hash(path.join(outputDir, name)) }]))
  });
  fs.writeFileSync(path.join(outputDir, "known-issues.md"), "# 已知问题\n\n- 当前单图最多展示 4 类约束和 3 类输出；更多内容应拆成主图与约束附图。\n- 当前离线公式排版支持常用 LaTeX 子集，并保留原始 LaTeX；复杂矩阵、多行对齐和自定义宏建议在最终排版软件中复核。\n", "utf8");
  process.stdout.write(`${JSON.stringify({ status: "PASS", output: outputDir, nodes: visualPlan.nodes.length, edges: visualPlan.edges.length }, null, 2)}\n`);
} catch (error) {
  json(path.join(outputDir, "run-status.json"), { status: "FAIL", reason: error.message, started_at: startedAt.toISOString(), ended_at: new Date().toISOString() });
  process.stderr.write(`FAIL：${error.message}\n`);
  process.exitCode = 1;
}
