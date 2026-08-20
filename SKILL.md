---
name: cumcm-visual-skill
description: 面向 CUMCM（全国大学生数学建模竞赛）论文与一般学术论文的可编辑可视化 Skill。用户提到国赛论文配图、数学建模论文、Excel/CSV 数据可视化、折线图、柱状图、散点图、相关性热力图、收敛曲线、流程图、思维导图、技术路线图、研究框架图、系统架构图、因果关系图、反馈回路、决策树、层次结构图或可视化图片时，默认只生成一张可插入论文的 SVG/PNG，并附自包含可编辑 HTML；用户要求在 PowerPoint 中继续编辑时，为同一张图额外生成由原生形状、文本框和连接符组成的 PPTX；只有用户明确要求完整 PPT、slides、deck、幻灯片、答辩稿、演讲稿或多页汇报时才生成多页演示文稿。
---

# CUMCM Visual Skill

本 Skill 是基于开源 HTML-PPT Studio 扩展的数模国赛论文配图增强版，不是全国大学生数学建模竞赛组委会的官方工具。它的调用名是 `$cumcm-visual-skill`，可与协会成员维护的 `$cumcm-figure-skill` 同时安装和使用。

先判断用户要“论文单图”还是“多页演示”。不要因为 Skill 名称含 PPT 就自动制作完整 PPT。

## 路由优先级

1. 用户提供整篇论文并要求“规划一套插图”“统一论文可视化”或逐章配图：执行“全文插图套件模式”。
2. 用户明确要求变量—目标函数—约束—求解—输出关系，或提供结构化模型公式：执行“模型关系图模式”。
3. 用户提供 Excel、CSV、JSON 表格或明确要求折线图、柱状图、散点图、相关性热力图、收敛曲线等数据图表：执行“论文数据图表模式”。
4. 用户提到论文配图、流程图、思维导图、技术路线、框架图、机制图、反馈回路、决策树、架构图、模型关系、指标体系或“可视化图片”：执行“论文单图模式”。默认一次交付一张图。
5. 用户明确说 PPT、slides、deck、幻灯片、答辩、演讲稿、多页汇报或指定页数：执行“演示文稿模式”。
6. 同时出现“论文”和“PPT”时，以具体产物词为准；“论文流程图”是单图，“论文汇报 PPT”是多页演示。仍不明确时，优先单图并说明假设。

## 全文插图套件模式

必须阅读 `references/figure-suite-workflow.md`。先读取 Markdown 论文并建立 `figure-suite-plan.json`，为每张候选图记录所在章节、图型、生成引擎、用途、原文追踪和必需输入。规划阶段不生成虚构图表；数据与公式不完整时保留为 `planned` 并明确缺口。

```bash
node scripts/plan-figure-suite.mjs --input paper.md --output output/figure-suite --max-figures 8
```

根据 `figure-prompts/` 逐张调用 `paper-visual`、`model-diagram` 或 `paper-chart`。所有图共享 `style-guide.json` 的主题、字体、色彩顺序和导出规格。输入清单准备完成后，可连续执行并同时导出可编辑 PPTX：

```bash
node scripts/execute-figure-suite.mjs --plan figure-suite-plan.json --manifest inputs-manifest.json --output output/figure-suite-run --pptx --node-modules /path/to/node_modules
```

## 模型关系图模式

必须阅读 `references/model-diagram-workflow.md`。从 JSON 中读取决策变量、参数、目标函数、约束、求解方法、检验与输出，生成五区模型结构图，并沿用论文单图编辑器与 PPTX 导出链路。

```bash
node scripts/generate-model-diagram.mjs --input model.json --output output/model-diagram
node exporters/export-model-diagram-pptx.mjs --plan output/model-diagram/visual-plan.json --output output/model-diagram/pptx --node-modules /path/to/node_modules
```

`objective.latex` 与 `constraints[].latex` 支持常用 LaTeX 子集的离线可编辑排版，并在 HTML 节点元数据中保留原始公式。约束超过 4 类或输出超过 3 类时优先拆图。不得根据模型名称猜测公式和变量含义。

## 论文数据图表模式

必须阅读 `references/paper-chart-workflow.md`。读取 CSV、JSON、XLSX 或 XLSM 后先生成数据画像与 `chart-plan.json`，再生成论文可用的 `chart.svg`、自包含 `index.html` 和轻量可编辑 `edit.html`。不得编造缺失数据、统计显著性、单位、实验条件或结论。

支持 `line`、`bar`、`scatter`、`heatmap`、`boxplot`、`radar` 和 `errorbar`，也可使用 `auto` 根据列类型自动选图。默认 1600×1000 学术画布；编辑页支持修改标题、副标题、主色与网格，并导出更新后的 SVG、2× PNG 和 JSON。误差棒图需要通过 `--error` 指定对称误差列。

```bash
node scripts/generate-paper-chart.mjs --input data.csv --output output/chart --chart auto --x iteration --y objective
node scripts/generate-paper-chart.mjs --input results.xlsx --sheet Sheet1 --output output/chart-xlsx --chart heatmap
node exporters/export-paper-chart-pptx.mjs --plan output/chart/chart-plan.json --input data.csv --output output/chart/pptx --node-modules /path/to/node_modules
```

生成器拒绝覆盖非空目录。输出必须通过 `validation-report.json` 中的结构、SVG 有效数值与 HTML 自包含检查，未通过时不得标记完成。

## 论文单图模式

必须阅读 `references/paper-visual-workflow.md`，并按以下顺序执行：

1. 保存完整请求和原始材料。提取分组、节点、说明、边、方向、标签、判断分支和回边；不得编造模型、数据、公式、结论或引用。
2. 先创建 `visual-plan.json`，`mode` 固定为 `paper-visual`。为每个分组、节点和边分配稳定 ID；复杂回边显式写 `route`，不要让连线穿过节点正文。用户明确要求 Kimi 等外部模型规划时，额外阅读 `references/model-provider-workflow.md`；模型只生成 `semantic-plan.json`，再由确定性布局器转换为 `visual-plan.json`。
3. 按语义选图型：
   - `flowchart`：方法流程、技术路线、条件分支；
   - `mindmap`：中心主线、双翼结构、任务分解；
   - `architecture`：系统模块、数据流和依赖；
   - `hierarchy`：指标体系、层次结构、分类树；
   - `feedback-loop`：闭环决策、迭代优化、控制反馈；
   - `timeline`：阶段演进、实验计划、里程碑。
4. 默认画布为 1920×1080、白色或近白背景、低饱和学术配色。节点标题不得低于 32 px，说明与边标签不得低于 28 px。按约 15 cm 论文版心复核；内容过密时拆图，不得靠缩小字号硬塞。
5. 生成干净展示页 `index.html`、可视化编辑页 `edit.html` 和独立 `diagram.svg`。用户要求 PowerPoint 格式时，再从同一份 `visual-plan.json` 生成原生可编辑 `diagram.pptx`。`index.html` 不显示页码、翻页提示、键盘提示、导航、进度条、演讲者备注或网页控制栏。
6. 执行静态检查与真实浏览器检查。确认恰有一个画布、无裁切/滚动/节点重叠、所有边可见、有向边具有箭头、标签与分支语义一致、无脚本异常和外部资源失败。
7. 导出真实 PNG 并校验签名和尺寸。默认 1920×1080；正式论文插图优先导出 3840×2160。目视检查灰度打印、缩版、回边、箭头、长中文换行和交叉线。

在 Skill 根目录执行：

```bash
# Kimi API 开放平台：MOONSHOT_API_KEY + kimi-k3
node scripts/plan-paper-visual-with-model.mjs --provider kimi --input input.md --prompt prompt.md --output output/planning
# Kimi Code 会员权益：先执行一次 kimi login，再通过官方 CLI 调用
node scripts/plan-paper-visual-with-model.mjs --provider kimi-cli --model kimi-code/k3 --input input.md --prompt prompt.md --output output/member-planning
node scripts/generate-paper-visual.mjs --plan visual-plan.json --output output/visual --source input.md --prompt prompt.md
node exporters/export-paper-visual.mjs --html output/visual/index.html --output output/visual/exports --scale 2
node exporters/export-paper-visual-pptx.mjs --plan output/visual/visual-plan.json --output output/visual/pptx --node-modules /path/to/node_modules
```

生成器与导出器拒绝覆盖非空目录。重跑时使用新的输出目录并保留旧结果。

### 单图结构规则

- 节点必须有唯一 `id`、`group`、`label`、坐标和尺寸；边必须有唯一 `id`、`from`、`to`、`kind`。
- 判断节点使用 `shape: decision`；起止或中心主节点可使用 `shape: pill`。
- `pass`、`reject`、`feedback` 不能只靠颜色区分；同时使用文字、线型和箭头中的至少两种表达。
- 反馈边必须走节点区域外侧，并为关键回边写可见标签。
- 参考图只用于吸收分区、层级、连线和留白规律；不得嵌入、描摹或复制参考图文字和像素布局。
- 优先打开 `edit.html` 编辑。节点可拖动并修改文字、填充色、边框色和文字色；分组背景框可拖动、缩放并修改标题、填充色、边框色和文字色；连线可修改起终节点、两端锚点、起止箭头、颜色、线宽、线型和标签，并通过画布控制点调整折线路径。
- 颜色控件优先使用内置色板：先从 10 列主题颜色及其 5 级明暗阶中选择，再使用标准色；只有需要主题外颜色时才点击“更多颜色…”打开系统调色盘。主题色选择、系统调色盘、撤销和自动保存必须更新同一份编辑状态。
- 绿色连线端点可拖到其他节点，蓝色折点用于改变线路姿态；分组框右下角橙色手柄用于缩放。支持撤销、重做、重置，修改自动保存到当前浏览器。
- 默认开启智能吸附与参考线：移动节点/分组框时吸附其他对象的边缘、中心和画布中心；缩放分组框时吸附相邻边；拖动连线折点时接近水平或垂直方向自动锁直。按 `Shift` 强制锁定连线方向，按 `Alt` 临时关闭本次吸附，也可在面板中关闭全局吸附。
- `index.html?edit=1` 或在 HTML 中按 `E` 也可进入编辑模式。正式截图必须使用不带查询参数的 `index.html`，不得显示工具。
- 编辑页可导出更新后的 SVG、2× PNG 和 `visual-plan-edited.json`；需要继续由生成器加工时，优先交付并使用导出的 JSON。
- SVG 是论文矢量交付；HTML 是可浏览与可编辑版本；PNG 是经过真实 Chrome 渲染的位图交付。
- PPTX 必须使用 `@oai/artifact-tool` 生成，不得使用 `python-pptx`。节点、分组框、文字和连线必须是 PowerPoint 原生对象，禁止把整张 SVG/PNG 作为唯一图片嵌入。普通边使用连接到节点的原生连接符；显式 `route` 的复杂边拆为多段连接符，并保留不可见的路线锚点对象。
- PPTX 导出后必须重新导入并渲染，检查 ZIP/PPTX 签名、单页数量、1280×720 预览尺寸、标题和全部节点文字；未通过 `pptx-export-report.json` 不得标记完成。

### 单图交付清单

- `input.md` 与 `prompt.md`；
- `visual-plan.json`；
- `index.html` 与 `edit.html`；
- `diagram.svg`；
- `validation-report.json` 与 `known-issues.md`；
- `exports/diagram.png` 与 `exports/export-report.json`；
- 用户要求 PowerPoint 时，增加 `pptx/diagram.pptx`、两张渲染预览、布局 JSON 与 `pptx-export-report.json`；
- 浏览器检查报告和截图；
- 执行命令、stdout、stderr、依赖版本、开始/结束状态和结论。

HTML、SVG、PNG 未通过格式和视觉验证时不得标记完成。缺少 Chrome、权限或必要依赖时记录为 `BLOCKED`，不得伪造导出。

## 演示文稿模式

仅在用户明确要求多页演示时使用。完整流程见 `references/academic-workflow.md`；演讲者模式见 `references/presenter-mode.md`。

1. 先生成 `plan.json`，默认 8～12 页，每页一个核心结论。
2. 按内容选择页面类型，不连续套用同一布局；所有可见事实可追溯到输入。
3. 生成本地 HTML 与资源，使用浏览器检查 1280×720、1600×900、1920×1080。
4. 执行静态校验，导出 PNG/PDF，验证 PNG 尺寸、PDF 签名与页数。

```bash
node planner/plan-deck.mjs --input material.md --output plan.json --theme competition-blue
node scripts/generate-academic-deck.mjs --input material.md --output output/deck --theme competition-blue --case-id demo
node validators/validate-deck.mjs --html output/deck/index.html --plan output/deck/plan.json --output output/deck/validation-report.json
node exporters/export-deck.mjs --html output/deck/index.html --output output/deck/exports
```

通用演示资源：

- `references/themes.md`：主题目录；
- `references/layouts.md`：通用布局；
- `references/full-decks.md`：完整 deck；
- `references/animations.md`：CSS 与 Canvas 动效；
- `references/authoring-guide.md`：通用创作指南。
