# 全文插图套件工作流

`figure-suite` 读取 Markdown 论文，按章节规划一套风格统一、来源可追溯的插图。规划阶段只决定“哪里需要什么图、需要哪些输入”，不会根据常识伪造实验数据或公式。

```bash
node scripts/plan-figure-suite.mjs --input paper.md --output output/figure-suite --max-figures 8
```

输出包括：

- `figure-suite-plan.json`：插图位置、图型、生成引擎、用途、来源摘要和必需输入；
- `style-guide.json`：全套插图共用主题；
- `figure-prompts/`：每张图可直接继续执行的完整提示词；
- `validation-report.json`：来源追踪、输入契约和提示词数量检查。

生成顺序建议：先完成不依赖实验数据的 `paper-visual` 与 `model-diagram`，再补齐 CSV/Excel 后生成 `paper-chart`，最后统一做灰度、缩版、字号和配色检查。

## 连续执行

为计划中的每张图在输入清单中提供实际文件和字段映射后，可一次连续生成：

```bash
node scripts/execute-figure-suite.mjs \
  --plan figure-suite-plan.json \
  --manifest inputs-manifest.json \
  --output output/figure-suite-run \
  --pptx \
  --node-modules /path/to/node_modules
```

执行器逐图创建 `figures/Fxx/`，生成套件总目录 `index.html` 与 `suite-execution-report.json`。启用 `--pptx` 时，数据图和模型图会额外生成可编辑 PPTX、导出预览、重新导入预览和验证报告；任意一张图或 PPTX 失败都会使整套状态变为 `FAIL`。
