import fs from "node:fs";
import path from "node:path";
import { exportPaperChartPptx } from "../paper-chart/export-pptx.mjs";
import { loadTabularData } from "../paper-chart/paper-chart.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    args[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.plan || !args.input || !args.output) {
  process.stderr.write("用法：node exporters/export-paper-chart-pptx.mjs --plan chart-plan.json --input data.csv|xlsx --output output-dir [--node-modules path] [--sheet name]\n");
  process.exit(2);
}

try {
  const planPath = path.resolve(args.plan);
  if (!fs.existsSync(planPath)) throw new Error(`规划文件不存在：${planPath}`);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const loaded = loadTabularData(path.resolve(args.input), { python: args.python || "python", sheet: args.sheet });
  const result = await exportPaperChartPptx(plan, loaded.rows, {
    outputDir: path.resolve(args.output),
    nodeModules: args["node-modules"] ? [path.resolve(args["node-modules"])] : []
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === "PASS" ? 0 : 1;
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}

