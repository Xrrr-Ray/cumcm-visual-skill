import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  loadTabularData,
  planPaperChart,
  profileRows,
  renderPaperChartHtml,
  renderPaperChartSvg,
  validatePaperChartPlan
} from "../paper-chart/paper-chart.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) args[key] = true;
    else {
      args[key] = value;
      index += 1;
    }
  }
  return args;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  process.stderr.write("用法：node scripts/generate-paper-chart.mjs --input data.csv|data.json|data.xlsx --output output-dir [--chart auto|line|bar|scatter|heatmap|boxplot|radar|errorbar] [--x column] [--y col1,col2] [--error column] [--series column] [--title title] [--sheet sheet]\n");
  process.exit(2);
}

const startedAt = new Date();
const inputPath = path.resolve(args.input);
const outputDir = path.resolve(args.output);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });

try {
  const loaded = loadTabularData(inputPath, { python: args.python || "python", sheet: args.sheet });
  const profile = profileRows(loaded.rows);
  const plan = planPaperChart(loaded.rows, {
    chart: args.chart || "auto",
    x: args.x,
    y: args.y,
    error: args.error,
    series: args.series,
    title: args.title,
    subtitle: args.subtitle,
    theme: args.theme,
    accent: args.accent,
    xTitle: args["x-title"],
    yTitle: args["y-title"],
    note: args.note,
    source: path.basename(inputPath),
    sheet: loaded.sheet
  });
  const validation = validatePaperChartPlan(plan, loaded.rows);
  if (validation.status !== "PASS") throw new Error(validation.errors.join("；"));
  const inputCopy = path.join(outputDir, path.basename(inputPath));
  fs.copyFileSync(inputPath, inputCopy);
  writeJson(path.join(outputDir, "chart-plan.json"), plan);
  writeJson(path.join(outputDir, "data-profile.json"), profile);
  fs.writeFileSync(path.join(outputDir, "chart.svg"), renderPaperChartSvg(plan, loaded.rows), "utf8");
  fs.writeFileSync(path.join(outputDir, "index.html"), renderPaperChartHtml(plan, loaded.rows), "utf8");
  fs.writeFileSync(path.join(outputDir, "edit.html"), renderPaperChartHtml(plan, loaded.rows, { edit: true }), "utf8");
  const checks = [
    { id: "plan_validation", pass: validation.status === "PASS", details: validation },
    { id: "svg_signature", pass: fs.readFileSync(path.join(outputDir, "chart.svg"), "utf8").includes("<svg") },
    { id: "svg_finite", pass: !/NaN|undefined|Infinity/.test(fs.readFileSync(path.join(outputDir, "chart.svg"), "utf8")) },
    { id: "self_contained_html", pass: !/<script[^>]+src=|<link[^>]+href=|<(?:img|iframe|video|audio|source)[^>]+src=["']https?:\/\//i.test(fs.readFileSync(path.join(outputDir, "index.html"), "utf8")) },
    { id: "editable_html", pass: fs.readFileSync(path.join(outputDir, "edit.html"), "utf8").includes("export-png") }
  ];
  const report = {
    schema_version: 1,
    status: checks.every((check) => check.pass) ? "PASS" : "FAIL",
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    input: { file: inputCopy, format: loaded.format, sheet: loaded.sheet, rows: loaded.rows.length },
    plan: { type: plan.type, title: plan.title, theme: plan.theme },
    checks
  };
  for (const name of ["chart-plan.json", "data-profile.json", "chart.svg", "index.html", "edit.html"]) {
    report[name] = { bytes: fs.statSync(path.join(outputDir, name)).size, sha256: sha256(path.join(outputDir, name)) };
  }
  writeJson(path.join(outputDir, "validation-report.json"), report);
  fs.writeFileSync(path.join(outputDir, "known-issues.md"), "# 已知问题\n\n- 当前支持折线图、柱状图、散点图、相关热力图、箱线图、雷达图和误差棒图。\n- 箱线图使用 1.5×IQR 识别离群值；误差棒图使用指定误差列的对称误差。\n- 浏览器编辑页可修改标题、副标题、首个系列主色和网格线；切换图型或数据字段时重新运行生成器。\n- 正式交付前仍须检查论文版心缩放、灰度打印和长分类标签。\n", "utf8");
  process.stdout.write(`${JSON.stringify({ status: report.status, type: plan.type, rows: loaded.rows.length, output: outputDir }, null, 2)}\n`);
  process.exitCode = report.status === "PASS" ? 0 : 1;
} catch (error) {
  writeJson(path.join(outputDir, "run-status.json"), {
    status: "FAIL",
    reason: error.message,
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString()
  });
  process.stderr.write(`FAIL：${error.message}\n`);
  process.exitCode = 1;
}
