import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planMaterial, validatePlan } from "../planner/plan-deck.mjs";
import { renderDeck } from "../templates/academic-page-types.mjs";
import { validateDeckFiles } from "../validators/validate-deck.mjs";

const currentFile = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(currentFile), "..");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function copy(file, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
}

function writeAssets(outputDir) {
  const files = [
    ["assets/base.css", "assets/base.css"], ["assets/runtime.js", "assets/runtime.js"], ["assets/academic-base.css", "assets/academic-base.css"],
    ["assets/editor.js", "assets/editor.js"], ["assets/inspector.js", "assets/inspector.js"],
    ["components/flowchart/flowchart.css", "assets/flowchart.css"], ["components/flowchart/flowchart.js", "assets/flowchart.js"],
    ["assets/themes/academic-light.css", "assets/themes/academic-light.css"], ["assets/themes/minimal-gray.css", "assets/themes/minimal-gray.css"], ["assets/themes/competition-blue.css", "assets/themes/competition-blue.css"]
  ];
  files.forEach(([source, target]) => copy(path.join(skillRoot, source), path.join(outputDir, target)));
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  process.stderr.write("usage: node scripts/generate-academic-deck.mjs --input material.md --output output-dir [--theme competition-blue] [--case-id name]\n");
  process.exit(2);
}

const startedAt = new Date();
const inputPath = path.resolve(args.input);
const outputDir = path.resolve(args.output);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });
const markdown = fs.readFileSync(inputPath, "utf8");
const plan = planMaterial(markdown, { theme: args.theme || "competition-blue" });
const planValidation = validatePlan(plan);
fs.writeFileSync(path.join(outputDir, "input.md"), markdown, "utf8");
fs.writeFileSync(path.join(outputDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "index.html"), renderDeck(plan), "utf8");
writeAssets(outputDir);
const caseId = args["case-id"] || path.basename(inputPath, path.extname(inputPath));
const prompt = `使用 html-ppt 学术模式，将 input.md 转换为可编辑中文 HTML 演示文稿。受众：${plan.presentation.audience}。目的：${plan.presentation.purpose}。必须先保存 plan.json，一页一个核心结论，按内容选择页面类型，不编造研究结论，核心内容不依赖外部 CDN，生成后执行自动检查。\n`;
fs.writeFileSync(path.join(outputDir, "prompt.md"), prompt, "utf8");
const staticReport = validateDeckFiles({ htmlPath: path.join(outputDir, "index.html"), planPath: path.join(outputDir, "plan.json") });
fs.writeFileSync(path.join(outputDir, "validation-report.json"), `${JSON.stringify(staticReport, null, 2)}\n`, "utf8");
const knownIssues = staticReport.issues.length ? staticReport.issues.map((item) => `- [${item.severity}] ${item.code}：${item.detail}`).join("\n") : "- 静态检查未发现问题；浏览器布局与导出仍需单独验证。";
fs.writeFileSync(path.join(outputDir, "known-issues.md"), `# 已知问题\n\n${knownIssues}\n`, "utf8");
const endedAt = new Date();
const metadata = { caseId, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), input: path.relative(process.cwd(), inputPath).replaceAll("\\", "/"), output: path.relative(process.cwd(), outputDir).replaceAll("\\", "/"), theme: plan.presentation.theme, slides: plan.slides.length, planValidation, staticStatus: staticReport.status };
fs.writeFileSync(path.join(outputDir, "generation-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ status: staticReport.status, ...metadata }, null, 2)}\n`);
process.exitCode = staticReport.status === "PASS" ? 0 : 1;

