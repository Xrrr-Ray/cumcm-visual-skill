# HTML-PPT Skill 独立开发版

本目录是从已验证基线创建的独立开发项目，不再受原评测仓库“只测试、不开发”规则限制。

## 新增模块

### paper-chart

从 CSV、JSON、XLSX、XLSM 生成论文数据图表。

- 图型：折线图、柱状图、散点图、相关性热力图；
- 自动识别列类型与建议图型；
- 学术主题、自包含 HTML、SVG、轻量编辑页；
- 编辑标题、副标题、首系列颜色和网格；
- 编辑页导出 SVG、2× PNG 与 JSON。

```bash
node scripts/generate-paper-chart.mjs --input data.csv --output output/chart --chart auto --x iteration --y objective
```

### model-diagram

从结构化 JSON 生成“变量—目标—约束—求解—检验—输出”模型关系图，复用原论文单图编辑器和 PPTX 导出链路。

```bash
node scripts/generate-model-diagram.mjs --input model.json --output output/model-diagram
```

### figure-suite

读取 Markdown 论文，逐章规划风格统一的插图套件，并生成每张图的来源追踪、输入契约和后续提示词。

```bash
node scripts/plan-figure-suite.mjs --input paper.md --output output/figure-suite --max-figures 8
```

## 当前验证

- 三个新增模块单元测试通过；
- CSV 和中文工作表 XLSX 端到端生成通过；
- 折线图、柱状图、热力图和模型关系图完成真实 PNG 渲染检查；
- 原规划器、论文单图高级编辑器、Kimi/Kimi Code 提供方回归通过；
- `SKILL.md` 通过 Skill 规范快速校验；
- 所有最终示例的 `validation-report.json` 为 `PASS`。

## 下一阶段

1. paper-chart 增加箱线图、雷达图、误差棒、双轴图和显著性标注；
2. model-diagram 增加 LaTeX/MathML 公式排版、约束折叠和多图拆分；
3. figure-suite 增加大模型语义规划、逐图自动执行和整套视觉一致性评分；
4. 增加数据图表与模型关系图的原生 PowerPoint 图表/形状导出。
