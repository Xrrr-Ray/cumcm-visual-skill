import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

function resolveFrom(baseDir, value) {
  if (!value) return "";
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function pushOption(args, name, value) {
  if (value === undefined || value === null || value === "") return;
  args.push(`--${name}`, Array.isArray(value) ? value.join(",") : String(value));
}

function gallery(plan, results) {
  const cards = results.map((result) => {
    const figure = plan.figures.find((item) => item.id === result.id);
    const link = result.status === "PASS" ? `figures/${result.id}/index.html` : "";
    const pptx = result.pptx?.status === "PASS" ? `figures/${result.id}/pptx/${result.pptx.filename}` : "";
    return `<article class="${result.status.toLowerCase()}"><div class="meta">${result.id} · ${figure?.engine || ""} · ${result.status}</div><h2>${figure?.suggested_title || result.id}</h2><p>${figure?.purpose || result.reason || ""}</p>${link ? `<a href="${link}">打开结果</a>` : `<span>${result.reason || "未生成"}</span>`}${pptx ? `<a class="pptx" href="${pptx}">下载可编辑 PPTX</a>` : ""}</article>`;
  }).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${plan.paper_title} · 插图套件</title><style>*{box-sizing:border-box}body{margin:0;padding:56px;background:#f5f7fb;color:#172033;font-family:"Microsoft YaHei",sans-serif}header{max-width:1200px;margin:auto auto 36px}h1{font:700 42px/1.2 "Songti SC",serif;margin:0 0 10px}header p{color:#607086}.grid{max-width:1200px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}article{background:#fff;border:1px solid #d9e2ef;border-radius:16px;padding:22px;min-height:190px}article.fail{border-color:#e9aaa4}article.skipped{opacity:.68}.meta{font-size:13px;color:#63748b}h2{font-size:22px;margin:18px 0 10px}p{color:#53657c;line-height:1.7}a{display:inline-block;margin:10px 14px 0 0;color:#2457a7;font-weight:700;text-decoration:none}a.pptx{color:#26735b}</style></head><body><header><h1>${plan.paper_title}</h1><p>自动连续生成结果 · ${results.filter((item) => item.status === "PASS").length}/${results.length} 张已完成</p></header><main class="grid">${cards}</main></body></html>`;
}

const options = parseArgs(process.argv.slice(2));
if (!options.plan || !options.manifest || !options.output) {
  process.stderr.write("用法：node scripts/execute-figure-suite.mjs --plan figure-suite-plan.json --manifest inputs-manifest.json --output output-dir [--pptx] [--node-modules path] [--allow-partial]\n");
  process.exit(2);
}

const planPath = path.resolve(options.plan);
const manifestPath = path.resolve(options.manifest);
const outputDir = path.resolve(options.output);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(path.join(outputDir, "figures"), { recursive: true });
const startedAt = new Date();
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestDir = path.dirname(manifestPath);
const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

for (const figure of plan.figures) {
  const entry = manifest.figures?.[figure.id];
  if (!entry) {
    results.push({ id: figure.id, status: "SKIPPED", reason: "输入清单中没有对应条目" });
    continue;
  }
  const engine = entry.engine || figure.engine;
  const figureOutput = path.join(outputDir, "figures", figure.id);
  let script;
  const args = [];
  if (engine === "paper-chart") {
    script = path.join(suiteRoot, "scripts", "generate-paper-chart.mjs");
    pushOption(args, "input", resolveFrom(manifestDir, entry.input));
    pushOption(args, "output", figureOutput);
    pushOption(args, "chart", entry.chart || figure.visual_type);
    for (const key of ["x", "y", "error", "series", "title", "subtitle", "theme", "note", "sheet"]) pushOption(args, key, entry[key]);
    pushOption(args, "x-title", entry.x_title);
    pushOption(args, "y-title", entry.y_title);
  } else if (engine === "model-diagram") {
    script = path.join(suiteRoot, "scripts", "generate-model-diagram.mjs");
    pushOption(args, "input", resolveFrom(manifestDir, entry.input));
    pushOption(args, "output", figureOutput);
  } else if (engine === "paper-visual") {
    script = path.join(suiteRoot, "scripts", "generate-paper-visual.mjs");
    pushOption(args, "plan", resolveFrom(manifestDir, entry.plan || entry.input));
    pushOption(args, "output", figureOutput);
    pushOption(args, "source", resolveFrom(manifestDir, entry.source));
    pushOption(args, "prompt", resolveFrom(manifestDir, entry.prompt));
  } else {
    results.push({ id: figure.id, status: "FAIL", reason: `不支持的执行引擎：${engine}` });
    continue;
  }
  const run = spawnSync(process.execPath, [script, ...args], {
    cwd: suiteRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });
  const result = {
    id: figure.id,
    engine,
    status: run.status === 0 ? "PASS" : "FAIL",
    command: [process.execPath, script, ...args],
    stdout: run.stdout,
    stderr: run.stderr,
    reason: run.error?.message || (run.status === 0 ? "" : `退出码 ${run.status}`)
  };
  if (result.status === "PASS" && options.pptx) {
    const exportOutput = path.join(figureOutput, "pptx");
    let exporter;
    const exportArgs = [];
    if (engine === "paper-chart") {
      exporter = path.join(suiteRoot, "exporters", "export-paper-chart-pptx.mjs");
      pushOption(exportArgs, "plan", path.join(figureOutput, "chart-plan.json"));
      pushOption(exportArgs, "input", resolveFrom(manifestDir, entry.input));
      pushOption(exportArgs, "sheet", entry.sheet);
    } else {
      exporter = path.join(suiteRoot, "exporters", "export-model-diagram-pptx.mjs");
      pushOption(exportArgs, "plan", path.join(figureOutput, "visual-plan.json"));
    }
    pushOption(exportArgs, "output", exportOutput);
    pushOption(exportArgs, "node-modules", options["node-modules"]);
    const pptxRun = spawnSync(process.execPath, [exporter, ...exportArgs], {
      cwd: suiteRoot,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024
    });
    const filename = engine === "paper-chart" ? "chart.pptx" : "diagram.pptx";
    result.pptx = {
      status: pptxRun.status === 0 ? "PASS" : "FAIL",
      filename,
      command: [process.execPath, exporter, ...exportArgs],
      stdout: pptxRun.stdout,
      stderr: pptxRun.stderr,
      reason: pptxRun.error?.message || (pptxRun.status === 0 ? "" : `退出码 ${pptxRun.status}`)
    };
    if (result.pptx.status === "FAIL") {
      result.status = "FAIL";
      result.reason = `PPTX 导出失败：${result.pptx.reason}`;
    }
  }
  results.push(result);
}

const failed = results.filter((item) => item.status === "FAIL");
const skipped = results.filter((item) => item.status === "SKIPPED");
const status = failed.length ? "FAIL" : skipped.length ? (options["allow-partial"] ? "PARTIAL" : "FAIL") : "PASS";
fs.copyFileSync(planPath, path.join(outputDir, "figure-suite-plan.json"));
fs.copyFileSync(manifestPath, path.join(outputDir, "inputs-manifest.json"));
fs.writeFileSync(path.join(outputDir, "index.html"), gallery(plan, results), "utf8");
writeJson(path.join(outputDir, "suite-execution-report.json"), {
  schema_version: 1,
  status,
  started_at: startedAt.toISOString(),
  ended_at: new Date().toISOString(),
  figures_total: results.length,
  figures_passed: results.filter((item) => item.status === "PASS").length,
  figures_failed: failed.length,
  figures_skipped: skipped.length,
  results
});
process.stdout.write(`${JSON.stringify({ status, output: outputDir, passed: results.filter((item) => item.status === "PASS").length, failed: failed.length, skipped: skipped.length }, null, 2)}\n`);
process.exitCode = status === "PASS" || status === "PARTIAL" ? 0 : 1;
