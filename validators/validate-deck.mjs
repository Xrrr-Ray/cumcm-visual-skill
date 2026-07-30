import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePlan } from "../planner/plan-deck.mjs";

const currentFile = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function issue(code, severity, detail, slide = null) { return { code, severity, detail, slide }; }

export function validateDeckFiles({ htmlPath, planPath }) {
  const htmlFile = path.resolve(htmlPath);
  const planFile = path.resolve(planPath);
  const html = fs.readFileSync(htmlFile, "utf8");
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  const baseDir = path.dirname(htmlFile);
  const issues = [];
  const slideMatches = [...html.matchAll(/<section\s+class="[^"]*\bslide\b[^>]*data-slide-type="([^"]+)"/g)];
  const notesCount = (html.match(/<aside\s+class="notes">/g) || []).length;
  const planValidation = validatePlan(plan);
  planValidation.errors.forEach((detail) => issues.push(issue("PLAN_ERROR", "error", detail)));
  planValidation.warnings.forEach((detail) => issues.push(issue("PLAN_WARNING", "warning", detail)));
  if (slideMatches.length !== plan.slides.length) issues.push(issue("SLIDE_COUNT", "error", `HTML ${slideMatches.length} 页，计划 ${plan.slides.length} 页`));
  if (notesCount !== plan.slides.length) issues.push(issue("NOTES_COUNT", "error", `notes ${notesCount} 个，计划 ${plan.slides.length} 页`));
  const htmlTypes = slideMatches.map((match) => match[1]);
  plan.slides.forEach((slide, index) => { if (htmlTypes[index] !== slide.type) issues.push(issue("TYPE_MISMATCH", "error", `HTML ${htmlTypes[index] || "缺失"}，计划 ${slide.type}`, index + 1)); });
  if (/https?:\/\//i.test(html)) issues.push(issue("EXTERNAL_RESOURCE", "error", "HTML 包含 http/https 引用"));
  if (!html.includes("assets/runtime.js")) issues.push(issue("RUNTIME_MISSING", "error", "缺少 runtime.js"));
  if (!html.includes("assets/editor.js")) issues.push(issue("EDITOR_MISSING", "error", "缺少 editor.js"));
  if (!html.includes("assets/inspector.js")) issues.push(issue("INSPECTOR_MISSING", "error", "缺少 inspector.js"));
  if (!html.includes("data-editable")) issues.push(issue("EDITABLE_MISSING", "error", "没有可编辑文本标记"));
  if (plan.slides.some((slide) => slide.type === "flowchart") && !html.includes("data-flowchart")) issues.push(issue("FLOWCHART_MISSING", "error", "计划包含流程图但 HTML 无流程图组件"));
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]).filter((ref) => !/^(?:data:|#|https?:)/i.test(ref));
  const missingRefs = refs.filter((ref) => !fs.existsSync(path.resolve(baseDir, ref)));
  if (missingRefs.length) issues.push(issue("MISSING_ASSET", "error", missingRefs.join("、")));
  const errors = issues.filter((item) => item.severity === "error");
  return {
    checkedAt: new Date().toISOString(),
    status: errors.length ? "FAIL" : "PASS",
    html: path.relative(process.cwd(), htmlFile).replaceAll("\\", "/"),
    plan: path.relative(process.cwd(), planFile).replaceAll("\\", "/"),
    slideCount: slideMatches.length,
    notesCount,
    types: htmlTypes,
    localReferences: refs.length,
    missingReferences: missingRefs,
    issues
  };
}

if (path.resolve(process.argv[1] || "") === currentFile) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.html || !args.plan) { process.stderr.write("usage: node validators/validate-deck.mjs --html index.html --plan plan.json [--output report.json]\n"); process.exit(2); }
  const report = validateDeckFiles({ htmlPath: args.html, planPath: args.plan });
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (args.output) { fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true }); fs.writeFileSync(path.resolve(args.output), text, "utf8"); }
  process.stdout.write(text);
  process.exitCode = report.status === "PASS" ? 0 : 1;
}

