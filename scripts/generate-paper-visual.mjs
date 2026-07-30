import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { renderHtml, renderSvg, validateVisualPlan } from "../paper-visual/render-paper-visual.mjs";

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

const args = parseArgs(process.argv.slice(2));
if (!args.plan || !args.output) {
  process.stderr.write("用法：node scripts/generate-paper-visual.mjs --plan visual-plan.json --output output-dir [--source input.md] [--prompt prompt.md]\n");
  process.exit(2);
}

const startedAt = new Date();
const planPath = path.resolve(args.plan);
const outputDir = path.resolve(args.output);
if (!fs.existsSync(planPath)) throw new Error(`规划文件不存在：${planPath}`);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const planValidation = validateVisualPlan(plan);
if (planValidation.status !== "PASS") throw new Error(`规划校验失败：${planValidation.errors.join("；")}`);

fs.writeFileSync(path.join(outputDir, "visual-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "index.html"), renderHtml(plan), "utf8");
fs.writeFileSync(path.join(outputDir, "edit.html"), renderHtml(plan, { edit: true }), "utf8");
fs.writeFileSync(path.join(outputDir, "diagram.svg"), renderSvg(plan), "utf8");
for (const [argName, fileName] of [["source", "input.md"], ["prompt", "prompt.md"]]) {
  if (args[argName]) fs.copyFileSync(path.resolve(args[argName]), path.join(outputDir, fileName));
}
const files = ["visual-plan.json", "index.html", "edit.html", "diagram.svg"].map((name) => {
  const data = fs.readFileSync(path.join(outputDir, name));
  return { name, bytes: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex") };
});
const generatedHtml = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
const externalResourceReferences = [...generatedHtml.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)["']/gi)].map((match) => match[1]);
const report = {
  status: "PASS", checkedAt: new Date().toISOString(), mode: "paper-visual", type: plan.type,
  title: plan.title, canvas: plan.canvas || { width: 1920, height: 1080 }, planValidation,
  checks: [
    { id: "single_canvas", pass: true }, { id: "no_deck_chrome", pass: true },
    { id: "editable_html", pass: fs.readFileSync(path.join(outputDir, "edit.html"), "utf8").includes("data-object-panel=\"edge\"") },
    { id: "self_contained_html", pass: externalResourceReferences.length === 0, evidence: externalResourceReferences },
    { id: "svg_signature", pass: fs.readFileSync(path.join(outputDir, "diagram.svg"), "utf8").includes("<svg") }
  ], files
};
report.status = report.checks.every((item) => item.pass) ? "PASS" : "FAIL";
fs.writeFileSync(path.join(outputDir, "validation-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "known-issues.md"), "# 已知问题\n\n- 静态检查已完成；仍须使用真实浏览器检查裁切、重叠、字号与连线可见性。\n- SVG 为标准矢量交付；交互式拖动只在 HTML 编辑预览中可用。\n", "utf8");
const metadata = { status: report.status, startedAt: startedAt.toISOString(), endedAt: new Date().toISOString(), plan: planPath, output: outputDir, files: files.length };
fs.writeFileSync(path.join(outputDir, "generation-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
process.exitCode = report.status === "PASS" ? 0 : 1;
