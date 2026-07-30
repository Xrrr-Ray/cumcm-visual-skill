import fs from "node:fs";
import path from "node:path";
import { planFigureSuite, renderFigurePrompt } from "../figure-suite/figure-suite.mjs";

function args(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    result[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const options = args(process.argv.slice(2));
if (!options.input || !options.output) {
  process.stderr.write("用法：node scripts/plan-figure-suite.mjs --input paper.md --output output-dir [--max-figures 8] [--theme academic-blue]\n");
  process.exit(2);
}
const outputDir = path.resolve(options.output);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });
try {
  const inputPath = path.resolve(options.input);
  const markdown = fs.readFileSync(inputPath, "utf8");
  const suite = planFigureSuite(markdown, {
    title: options.title,
    theme: options.theme,
    maxFigures: options["max-figures"]
  });
  fs.copyFileSync(inputPath, path.join(outputDir, path.basename(inputPath)));
  writeJson(path.join(outputDir, "figure-suite-plan.json"), suite);
  writeJson(path.join(outputDir, "style-guide.json"), suite.global_style);
  const promptDir = path.join(outputDir, "figure-prompts");
  fs.mkdirSync(promptDir);
  for (const figure of suite.figures) {
    fs.writeFileSync(path.join(promptDir, `${figure.id}-${figure.visual_type}.md`), renderFigurePrompt(figure, suite), "utf8");
  }
  writeJson(path.join(outputDir, "validation-report.json"), {
    schema_version: 1,
    status: suite.figures.length > 0 && suite.figures.every((figure) => figure.source_trace && figure.required_inputs.length) ? "PASS" : "FAIL",
    checks: [
      { id: "figure_count", pass: suite.figures.length > 0, value: suite.figures.length },
      { id: "source_trace", pass: suite.figures.every((figure) => Boolean(figure.source_trace)) },
      { id: "input_contracts", pass: suite.figures.every((figure) => figure.required_inputs.length > 0) },
      { id: "prompt_count", pass: fs.readdirSync(promptDir).length === suite.figures.length }
    ]
  });
  fs.writeFileSync(path.join(outputDir, "README.md"), `# 论文插图套件规划\n\n共规划 ${suite.figures.length} 张插图。先补齐每个提示词列出的必需输入，再分别调用 paper-chart、model-diagram 或 paper-visual 生成器。规划阶段不会伪造数据或公式。\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "PASS", output: outputDir, figures: suite.figures.length, coverage: suite.coverage }, null, 2)}\n`);
} catch (error) {
  writeJson(path.join(outputDir, "run-status.json"), { status: "FAIL", reason: error.message });
  process.stderr.write(`FAIL：${error.message}\n`);
  process.exitCode = 1;
}

