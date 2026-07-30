import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadTabularData,
  parseCsv,
  planPaperChart,
  profileRows,
  renderPaperChartHtml,
  renderPaperChartSvg,
  validatePaperChartPlan
} from "../paper-chart/paper-chart.mjs";

const fixture = path.resolve("tests/fixtures/paper-chart-convergence.csv");
const loaded = loadTabularData(fixture);
assert.equal(loaded.rows.length, 6);
const profile = profileRows(loaded.rows);
assert.equal(profile.column_count, 3);
assert.equal(profile.columns.find((item) => item.name === "baseline").type, "number");

const plan = planPaperChart(loaded.rows, {
  chart: "auto",
  x: "iteration",
  y: "baseline,improved",
  title: "算法收敛性能对比",
  source: path.basename(fixture)
});
assert.equal(plan.type, "line");
assert.equal(validatePaperChartPlan(plan, loaded.rows).status, "PASS");
const svg = renderPaperChartSvg(plan, loaded.rows);
assert.match(svg, /^<svg/);
assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
assert.match(svg, /算法收敛性能对比/);
const html = renderPaperChartHtml(plan, loaded.rows);
const editHtml = renderPaperChartHtml(plan, loaded.rows, { edit: true });
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|<(?:img|iframe|video|audio|source)[^>]+src=["']https?:\/\//i);
assert.match(editHtml, /export-png/);

const quoted = parseCsv('name,value\n"A, B",12\n"C ""quoted""",13\n');
assert.equal(quoted[0].name, "A, B");
assert.equal(quoted[1].name, 'C "quoted"');

const barRows = [
  { model: "A", score: 0.82 },
  { model: "B", score: 0.88 },
  { model: "C", score: 0.91 }
];
assert.equal(planPaperChart(barRows, { chart: "auto", x: "model", y: "score" }).type, "bar");

const scatterRows = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 5 }
];
assert.equal(planPaperChart(scatterRows, { chart: "auto", x: "x", y: "y" }).type, "scatter");

const heatPlan = planPaperChart(loaded.rows, { chart: "heatmap", title: "相关矩阵" });
assert.equal(heatPlan.type, "heatmap");
assert.doesNotMatch(renderPaperChartSvg(heatPlan, loaded.rows), /NaN|undefined|Infinity/);

const distributionRows = [
  { group: "A", score: 72 }, { group: "A", score: 75 }, { group: "A", score: 78 },
  { group: "A", score: 80 }, { group: "A", score: 96 },
  { group: "B", score: 81 }, { group: "B", score: 83 }, { group: "B", score: 84 },
  { group: "B", score: 86 }, { group: "B", score: 88 }
];
const boxPlan = planPaperChart(distributionRows, { chart: "boxplot", x: "group", y: "score", title: "分布对比" });
assert.equal(boxPlan.type, "boxplot");
assert.match(renderPaperChartSvg(boxPlan, distributionRows), /data-series="0"/);

const radarRows = [
  { metric: "精度", modelA: 0.82, modelB: 0.89 },
  { metric: "召回率", modelA: 0.78, modelB: 0.86 },
  { metric: "稳定性", modelA: 0.75, modelB: 0.83 },
  { metric: "效率", modelA: 0.88, modelB: 0.81 },
  { metric: "可解释性", modelA: 0.84, modelB: 0.77 }
];
const radarPlan = planPaperChart(radarRows, { chart: "radar", x: "metric", y: "modelA,modelB", title: "综合能力" });
assert.equal(radarPlan.type, "radar");
assert.match(renderPaperChartSvg(radarPlan, radarRows), /量表上限/);

const errorRows = [
  { size: "20%", mean: 0.72, std: 0.03 },
  { size: "40%", mean: 0.79, std: 0.025 },
  { size: "60%", mean: 0.84, std: 0.018 }
];
const errorPlan = planPaperChart(errorRows, { chart: "errorbar", x: "size", y: "mean", error: "std", title: "均值与误差" });
assert.equal(errorPlan.type, "errorbar");
assert.match(renderPaperChartSvg(errorPlan, errorRows), /<line x1=/);

const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0) {
  const outputDir = path.resolve(process.argv[outputIndex + 1]);
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空：${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "chart-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "chart.svg"), svg, "utf8");
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
  fs.writeFileSync(path.join(outputDir, "edit.html"), editHtml, "utf8");
}

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  rows: loaded.rows.length,
  columns: profile.column_count,
  inferred: { convergence: plan.type, category: "bar", numeric: "scatter" },
  heatmap: "PASS",
  v2: { boxplot: "PASS", radar: "PASS", errorbar: "PASS" }
}, null, 2)}\n`);
