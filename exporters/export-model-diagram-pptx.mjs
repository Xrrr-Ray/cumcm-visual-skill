import fs from "node:fs";
import path from "node:path";
import { exportPaperVisualPptx } from "../paper-visual/export-pptx.mjs";

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
if (!args.plan || !args.output) {
  process.stderr.write("用法：node exporters/export-model-diagram-pptx.mjs --plan visual-plan.json --output output-dir [--node-modules path]\n");
  process.exit(2);
}

try {
  const planPath = path.resolve(args.plan);
  if (!fs.existsSync(planPath)) throw new Error(`规划文件不存在：${planPath}`);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const result = await exportPaperVisualPptx(plan, {
    outputDir: path.resolve(args.output),
    nodeModules: args["node-modules"] ? [path.resolve(args["node-modules"])] : []
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === "PASS" ? 0 : 1;
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}
