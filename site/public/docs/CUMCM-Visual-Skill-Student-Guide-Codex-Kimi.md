# CUMCM Editable Visual Skill 学生使用与交付说明

> 面向数学建模竞赛、国赛论文、课程论文、毕业论文和答辩展示。  
> 当前推荐入口：Codex 与 Kimi K3。  
> 文档对应版本：v1.1.1（GitHub 直装版）。

## 1. 这是什么

CUMCM Editable Visual Skill 不是一个“只能制作完整 PPT”的工具。它使用 `$cumcm-editable-visual-skill` 调用名，可与协会成员的 `$cumcm-visual-skill` 同时安装。

它首先是一个论文可视化生产系统，可以把论文材料、结构化模型和实验数据转换为：

- 可插入论文的 SVG 矢量图；
- 可在浏览器中拖动修改的 HTML；
- 可继续修改文字、节点、框、箭头和颜色的编辑页；
- 可在 PowerPoint 中继续编辑的 PPTX；
- 经过真实渲染验证的 PNG；
- 在用户明确要求时生成完整多页 HTML 演示文稿。

核心工作方式：

```text
Codex 或 Kimi 理解论文语义
            ↓
统一语义规划 / 数据规划
            ↓
本地确定性布局与渲染
            ↓
HTML + SVG + PNG + JSON + 可编辑 PPTX
```

大模型主要负责理解内容，不直接决定最终文件格式和全部坐标。最终布局、编辑器、导出与验证由本地脚本完成，因此更容易保持风格统一和结果可复现。

---

## 2. 当前全部功能

### 2.1 论文流程图与结构图

适用于：

- 研究流程图；
- 技术路线图；
- 算法流程图；
- 论文研究框架；
- 系统架构图；
- 数据处理流程；
- 因果关系图；
- 变量关系图。

支持的主要图型：

| 图型 | 典型用途 |
| --- | --- |
| `flowchart` | 方法流程、算法流程、条件分支 |
| `mindmap` | 研究主线、任务分解、论文结构 |
| `architecture` | 系统模块、模型结构、数据流 |
| `hierarchy` | 指标体系、层次结构、分类树 |
| `feedback-loop` | 迭代优化、闭环控制、反馈机制 |
| `timeline` | 研究阶段、实验计划、项目里程碑 |

默认一次生成一张适合插入论文的图，不会因为名称中包含 “PPT” 就自动生成完整幻灯片。

### 2.2 思维导图

可以生成：

- 中心主题—左右分支结构；
- 研究基础—研究主线—任务分解结构；
- 问题分析—模型建立—求解验证结构；
- 论文目录与章节关系；
- 指标体系和评价维度。

节点、背景分区、文字和箭头均可以继续编辑。

### 2.3 论文数据图表 `paper-chart`

支持读取：

- CSV；
- JSON 表格；
- XLSX；
- XLSM。

支持图表：

| 图表 | 适合表达 | PowerPoint 编辑方式 |
| --- | --- | --- |
| 折线图 `line` | 趋势、时间序列、算法收敛 | PowerPoint 原生图表 |
| 柱状图 `bar` | 模型指标、类别比较 | PowerPoint 原生图表 |
| 散点图 `scatter` | 连续变量关系、成本—性能权衡 | PowerPoint 原生图表 |
| 热力图 `heatmap` | Pearson 相关系数矩阵 | 原生矩形与文本 |
| 箱线图 `boxplot` | 中位数、四分位区间、离群点 | 原生线条与形状 |
| 雷达图 `radar` | 多维能力与指标比较 | PowerPoint 原生图表 |
| 误差棒图 `errorbar` | 均值、标准差、标准误 | 原生线条、点与文本 |

生成前会建立数据画像，记录：

- 字段名称和类型；
- 数值范围；
- 缺失值数量；
- 唯一值数量；
- 行数；
- 均值等基础统计信息。

不会自动编造缺失数据、单位、显著性结论或置信区间。

### 2.4 数学模型关系图 `model-diagram`

适用于：

- 优化模型；
- 预测模型；
- 评价模型；
- 数学规划模型；
- 变量—目标—约束关系图。

默认采用五区结构：

1. 模型输入；
2. 优化目标；
3. 约束体系；
4. 求解与检验；
5. 模型输出。

可以输入：

- 决策变量；
- 参数和常量；
- 目标函数；
- 约束条件；
- 求解算法；
- 模型验证方法；
- 输出指标。

支持常用 LaTeX 子集，包括：

- 求和、乘积、积分；
- 分式和根式；
- 上标、下标；
- 希腊字母；
- 不等式；
- 最大化与最小化；
- 帽号、横线和波浪符号。

原始 LaTeX 会保留在 HTML 节点元数据中。PPTX 使用 Cambria Math 可编辑文本，不把公式整体转换成图片。

### 2.5 全文插图套件 `figure-suite`

读取 Markdown 论文后，可以：

- 按章节识别需要插图的位置；
- 判断适合使用流程图、模型图还是数据图；
- 为每张图记录来源章节；
- 生成统一风格配置；
- 为每张图生成独立提示词；
- 根据输入清单连续生成全部插图；
- 生成整套插图总目录；
- 为支持的图同时生成可编辑 PPTX；
- 输出整套执行报告。

如果论文没有提供实验数据或公式，系统会标记缺失输入，不会根据常识伪造。

### 2.6 浏览器高级编辑器

#### 节点

- 拖动位置；
- 修改标题和说明；
- 修改填充色；
- 修改边框色；
- 修改文字色。

#### 背景分区框

- 拖动位置；
- 调整宽度和高度；
- 修改标题；
- 修改填充色；
- 修改边框色；
- 修改文字颜色。

#### 箭头和连线

- 修改起点和终点；
- 修改节点锚点；
- 拖动起点、终点和折点；
- 修改箭头姿态；
- 修改起止箭头样式；
- 修改颜色；
- 修改线宽和线型；
- 修改连线标签。

#### PowerPoint 风格辅助功能

- 对象边缘和中心吸附；
- 画布中心参考线；
- 接近水平或垂直时自动锁直；
- `Shift` 强制锁定方向；
- `Alt` 临时关闭吸附；
- 撤销和重做；
- 自动保存；
- 重置布局。

#### 颜色选择

- 10 列主题颜色；
- 主题色的多级明暗阶；
- 标准色；
- 系统调色盘；
- 节点、分组框和箭头均可使用。

### 2.7 输出和导出

单张论文图一般包括：

| 文件 | 作用 |
| --- | --- |
| `index.html` | 干净展示版 |
| `edit.html` | 浏览器拖动编辑版 |
| `diagram.svg` / `chart.svg` | 论文矢量图 |
| `visual-plan.json` / `chart-plan.json` | 可继续加工的规划数据 |
| `validation-report.json` | 结构和格式验证 |
| `known-issues.md` | 当前结果需要人工复核的内容 |
| `diagram.png` | 真实浏览器渲染位图 |
| `diagram.pptx` / `chart.pptx` | PowerPoint 可编辑版本 |
| `pptx-export-report.json` | PPTX 导出和重新导入验证 |

### 2.8 完整多页演示文稿

只有明确要求以下内容时，才进入完整演示文稿模式：

- “制作一份 PPT”；
- “制作答辩幻灯片”；
- “生成 10 页汇报”；
- “制作 slides / deck / keynote”；
- “制作演讲稿”。

当前多页模式支持：

- 8～12 页自动规划；
- 封面、目录、章节过渡；
- 数据大字报；
- 三栏结构；
- 对比页；
- 时间线；
- 流程图页；
- 总结页；
- HTML 键盘翻页；
- PNG 和 PDF 导出。

“论文流程图”默认是单张图；“论文答辩 PPT”才是多页演示。

---

## 3. 当前可用效果

当前完整示例库：

```text
{实际解压目录}\cumcm-editable-visual-skill\examples\showcase-v2\index.html
```

示例库包含：

- 1 类论文流程图；
- 7 类数据图；
- 3 类数学模型关系图；
- 1 套全文插图连续生成示例；
- 12 份完整提示词；
- HTML、SVG、输入文件、编辑页和 PPTX。

公开示例在发布前经过 HTML/SVG 格式检查、PPTX 重导入和画布越界检查。具体工程记录保留在项目验证报告中，不作为学生使用时需要理解的首页指标。论文事实、公式、单位和数据仍应由学生负责确认。

---

## 4. Codex 与 Kimi 的区别

| 项目 | Codex | Kimi K3 |
| --- | --- | --- |
| 当前角色 | 端到端执行入口 | 论文语义规划入口 |
| 使用方式 | 打开项目后直接用自然语言要求执行 | 通过 Kimi Code CLI 或 Moonshot API |
| 是否直接运行本地脚本 | 是 | Kimi 只返回语义规划，脚本在本地运行 |
| 是否负责最终坐标 | 否，最终仍由确定性布局器处理 | 否 |
| HTML / SVG / PPTX 风格 | 统一生成器 | 统一生成器 |
| 适合学生 | 想用自然语言完成全流程 | 已有 Kimi 会员或 Moonshot API |
| 当前覆盖 | 单图、数据图、模型图、全文套件、完整演示 | 目前正式接入论文单图的语义规划 |

重要说明：

- Codex 不是 `--provider codex` 形式的适配器。Codex 本身读取 `SKILL.md`，然后执行项目脚本。
- Kimi 目前通过 provider 适配器生成统一语义规划，再交给同一布局器。
- 因为最终渲染器相同，Codex 和 Kimi 生成结果的整体风格与编辑能力保持一致。
- 模型之间主要差异在“如何理解论文内容、如何拆分节点和关系”，而不是文件格式。

---

## 5. 开始前准备

### 5.1 从 GitHub 安装到 Codex（推荐）

无需先下载文件。在 Codex 中直接发送：

```text
请使用 $skill-installer，从 GitHub 安装下面的 Skill：
仓库：https://github.com/Xrrr-Ray/cumcm-visual-skill
Skill 路径：仓库根目录（.）
安装名称：cumcm-editable-visual-skill
```

安装完成后，在下一条消息或新任务中输入：

```text
请使用 $cumcm-editable-visual-skill 完成下面的任务。
```

若 Codex 无法联网访问 GitHub，再下载并解压[Windows 一键安装包](https://xrrr-ray.github.io/cumcm-visual-skill/downloads/cumcm-editable-visual-skill-one-click.zip)，双击 `安装数模Skill.cmd`。项目无须放在 D 盘；再次运行可更新并备份旧版本。

### 5.2 基础环境

建议：

- Windows 10/11；
- Node.js 18 或以上版本；
- Chrome 或 Edge；
- Microsoft PowerPoint，用于继续编辑 PPTX；
- Python 3，仅在读取 Excel 时需要；
- Python 安装 `openpyxl`，用于读取 XLSX/XLSM。

项目可以解压到任意磁盘。进入项目目录时，把下面的占位内容替换为你电脑上的真实路径：

```powershell
Set-Location "{实际解压目录}\cumcm-editable-visual-skill"
```

所有输出目录必须是新的空目录。生成器默认拒绝覆盖非空目录。

### 5.3 使用 Codex

1. 安装完成后，在 Codex 中打开存放论文、数据和结果的工作目录。
2. 在请求开头写明：

```text
请使用 $cumcm-editable-visual-skill 完成下面的任务。
```

3. 附上论文、CSV、Excel、JSON 或具体文字要求。
4. 让 Codex执行生成、导出和验证。

Codex 模式通常不需要学生手动输入脚本命令。

### 5.4 使用 Kimi Code 会员

Kimi 网页会员与 Moonshot API 是两个不同通道。已有 Kimi Code 会员时，推荐使用官方 CLI 登录。

安装：

```powershell
npm install -g @moonshot-ai/kimi-code@latest
kimi login
kimi --version
```

登录后不需要设置 `MOONSHOT_API_KEY`。

### 5.5 使用 Kimi 开放平台 API

只有拥有 Moonshot 开放平台 API Key 时才使用此方式。

在当前 PowerShell 会话安全输入：

```powershell
$secureKey = Read-Host "粘贴 Moonshot API Key" -AsSecureString
$env:MOONSHOT_API_KEY = [Net.NetworkCredential]::new("", $secureKey).Password.Trim()
```

不要把 Key 写入 Markdown、JSON、日志或项目文件。

---

## 6. Codex 使用方法

### 6.1 生成论文流程图

可以直接复制：

```text
请使用 $cumcm-editable-visual-skill。
根据我提供的论文方法部分生成一张技术路线图，不要生成完整 PPT。
要求输出干净展示版 HTML、可拖动编辑版 HTML、SVG、2× PNG 和可编辑 PPTX。
所有事实必须来自原文，不要补造模型或结论。
```

### 6.2 生成思维导图

```text
请使用 cumcm-editable-visual-skill，把下面的论文结构生成一张思维导图。
采用“模型基础—研究主线—任务分解”结构。
节点、背景框和箭头都要可编辑，并输出 SVG、edit.html 和 PPTX。
```

### 6.3 从 CSV/Excel 生成数据图

```text
请使用 cumcm-editable-visual-skill 读取附件中的 Excel。
先检查字段、缺失值和数值范围，再选择合适的数据图。
不要修改或补造数据。
输出论文版 SVG、可编辑 HTML 和 PowerPoint 原生可编辑 PPTX。
```

如果已经知道图型：

```text
请读取 CSV，生成带标准差误差棒的实验结果图。
横轴是“样本规模”，纵轴是“平均准确率”，误差列是“标准差”。
```

### 6.4 生成数学模型关系图

```text
请根据附件中的模型 JSON 生成变量—目标函数—约束—求解—输出关系图。
保留 LaTeX 原文，公式显示为可编辑数学文本。
约束和变量不得根据常识补充。
输出 HTML、SVG、PNG 和全元素可编辑 PPTX。
```

### 6.5 读取整篇论文生成插图套件

```text
请使用 cumcm-editable-visual-skill 读取这篇 Markdown 论文。
先规划整篇论文需要的插图，不要伪造实验数据或公式。
为每张图记录来源章节、用途和必需输入。
对输入完整的图连续生成 HTML、SVG 和可编辑 PPTX，并生成总目录和执行报告。
```

### 6.6 生成完整答辩 PPT

```text
请使用 cumcm-editable-visual-skill，根据论文生成一份 10 页答辩 HTML PPT。
包括研究背景、问题分析、模型建立、算法求解、结果分析、敏感性分析和总结。
这次需要完整多页演示，不是单张论文插图。
```

---

## 7. Kimi 使用方法

### 7.1 准备输入

论文材料保存为：

```text
input.md
```

生成要求保存为：

```text
prompt.md
```

示例 `prompt.md`：

```markdown
请根据输入材料规划一张论文技术路线图。
要求：
1. 提取研究阶段、核心任务和数据流；
2. 不得补造原文没有的模型或结论；
3. 使用适合国赛论文的低饱和学术配色；
4. 输出清晰的分组、节点、边、箭头方向和标签。
```

### 7.2 Kimi Code 会员通道

先确认已经执行过：

```powershell
kimi login
```

在 Skill 根目录运行：

```powershell
node scripts/plan-paper-visual-with-model.mjs `
  --provider kimi-cli `
  --model kimi-code/k3 `
  --input input.md `
  --prompt prompt.md `
  --output output\kimi-member-planning-001
```

注意：

- `kimi-cli` 使用 Kimi Code 会员登录状态；
- 不要把网页会员字符串当作 API Key；
- 每次重新运行必须使用新的空输出目录。

成功后会生成：

- `model-response.json`；
- `model-metadata.json`；
- `semantic-plan.json`；
- `semantic-validation.json`；
- `visual-plan.json`；
- `visual-plan-validation.json`。

继续生成最终图片：

```powershell
node scripts/generate-paper-visual.mjs `
  --plan output\kimi-member-planning-001\visual-plan.json `
  --source input.md `
  --prompt prompt.md `
  --output output\kimi-visual-001
```

### 7.3 Kimi 开放平台 API 通道

设置 `MOONSHOT_API_KEY` 后运行：

```powershell
node scripts/plan-paper-visual-with-model.mjs `
  --provider kimi `
  --model kimi-k3 `
  --input input.md `
  --prompt prompt.md `
  --output output\kimi-api-planning-001
```

然后使用同样的 `generate-paper-visual.mjs` 命令生成最终文件。

### 7.4 Kimi 当前覆盖范围

当前 Kimi provider 正式接入的是论文单图语义规划，包括：

- 流程图；
- 思维导图；
- 技术路线；
- 研究框架；
- 架构图；
- 层次图；
- 反馈回路等。

数据图表仍以真实 CSV/Excel/JSON 为输入，由 `paper-chart` 确定性生成。数学模型关系图建议先准备结构化 JSON，再由 `model-diagram` 生成。这样可以避免模型改写实验数据或公式。

---

## 8. 命令行直接使用方法

不依赖大模型也可以直接调用生成器。

### 8.1 数据图

折线图：

```powershell
node scripts/generate-paper-chart.mjs `
  --input data.csv `
  --output output\chart-line-001 `
  --chart line `
  --x iteration `
  --y baseline,improved `
  --title "算法收敛性能对比"
```

误差棒图：

```powershell
node scripts/generate-paper-chart.mjs `
  --input data.csv `
  --output output\chart-errorbar-001 `
  --chart errorbar `
  --x sample_size `
  --y mean_accuracy `
  --error standard_deviation `
  --title "样本规模对预测性能的影响"
```

Excel：

```powershell
node scripts/generate-paper-chart.mjs `
  --input results.xlsx `
  --sheet Sheet1 `
  --output output\chart-xlsx-001 `
  --chart heatmap
```

### 8.2 模型图

```powershell
node scripts/generate-model-diagram.mjs `
  --input model.json `
  --output output\model-diagram-001
```

最小输入示例：

```json
{
  "title": "配送路径优化模型",
  "variables": [
    { "symbol": "x_ijk", "meaning": "车辆 k 是否经过弧 i→j" }
  ],
  "parameters": [
    { "symbol": "d_ij", "meaning": "节点间距离" }
  ],
  "objective": {
    "sense": "min",
    "latex": "\\min Z = \\sum_{i,j,k} d_{ij}x_{ijk}",
    "meaning": "最小化配送距离"
  },
  "constraints": [
    {
      "name": "容量约束",
      "latex": "\\sum_i q_i x_{ijk} \\leq Q_k",
      "meaning": "装载量不超过车辆容量"
    }
  ],
  "solver": {
    "name": "遗传算法",
    "steps": ["初始化", "选择", "交叉", "变异"]
  },
  "validation": ["可行性检查", "基准算法对比"],
  "outputs": [
    { "name": "最优路径", "meaning": "车辆访问顺序" }
  ]
}
```

### 8.3 全文插图套件

先规划：

```powershell
node scripts/plan-figure-suite.mjs `
  --input paper.md `
  --output output\figure-suite-plan-001 `
  --max-figures 8 `
  --theme academic-blue
```

补齐输入清单后连续执行：

```powershell
node scripts/execute-figure-suite.mjs `
  --plan output\figure-suite-plan-001\figure-suite-plan.json `
  --manifest inputs-manifest.json `
  --output output\figure-suite-run-001 `
  --pptx `
  --node-modules "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
```

---

## 9. 导出可编辑 PPTX

### 9.1 数据图 PPTX

```powershell
node exporters/export-paper-chart-pptx.mjs `
  --plan output\chart-line-001\chart-plan.json `
  --input data.csv `
  --output output\chart-line-001-pptx `
  --node-modules "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
```

### 9.2 模型图 PPTX

```powershell
node exporters/export-model-diagram-pptx.mjs `
  --plan output\model-diagram-001\visual-plan.json `
  --output output\model-diagram-001-pptx `
  --node-modules "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
```

### 9.3 普通流程图 PPTX

```powershell
node exporters/export-paper-visual-pptx.mjs `
  --plan output\visual-001\visual-plan.json `
  --output output\visual-001-pptx `
  --node-modules "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
```

PPTX 使用 `@oai/artifact-tool` 生成。Codex 环境已经提供该依赖。仅使用 Kimi CLI、但没有 Codex 运行时的电脑仍可正常生成 HTML 和 SVG；PPTX 导出需要另外提供包含 `@oai/artifact-tool` 的 `node_modules` 路径。

---

## 10. 如何编辑生成结果

### 10.1 浏览器编辑

打开：

```text
输出目录\edit.html
```

也可以在展示版地址后添加：

```text
?edit=1
```

或者在页面中按 `E`。

编辑完成后可以导出：

- 更新后的 SVG；
- 2× PNG；
- `visual-plan-edited.json`。

如果需要重新生成 PPTX，优先使用导出的 JSON 作为下一轮输入。

### 10.2 PowerPoint 编辑

打开 `diagram.pptx` 或 `chart.pptx` 后：

- 双击原生图表可以修改数据和图表设置；
- 热力图、箱线图和误差棒可以逐个选择形状；
- 流程图节点是独立形状；
- 背景框是独立形状；
- 文字是 PowerPoint 文本；
- 箭头是连接到节点的连接符。

---

## 11. 推荐提示词写法

一个完整请求最好包含：

1. 产物类型；
2. 输入材料；
3. 需要表达的核心关系；
4. 画布方向；
5. 风格；
6. 是否需要浏览器编辑；
7. 是否需要 PPTX；
8. 禁止补造的内容。

通用模板：

```text
请使用 cumcm-editable-visual-skill，根据【输入材料】生成一张【图型】。

核心内容：
- 【内容 1】
- 【内容 2】
- 【内容 3】

要求：
- 用于国赛论文正文；
- 近白背景、低饱和学术配色；
- 中文清晰，缩小后仍可阅读；
- 节点、背景框、文字和箭头可编辑；
- 输出 index.html、edit.html、SVG、2× PNG、JSON；
- 同时输出 PowerPoint 可编辑 PPTX；
- 不得补造输入中没有的数据、公式、结论和引用。
```

---

## 12. 常见错误

### 12.1 `Cannot find module`

原因通常是 PowerShell 当前目录错误。

先执行：

```powershell
Set-Location "{实际解压目录}\cumcm-editable-visual-skill"
```

再运行脚本。

### 12.2 `输出目录非空，拒绝覆盖`

系统为了保护已有结果，不会覆盖非空目录。

把：

```text
run-001
```

改成：

```text
run-002
```

不要删除失败结果后伪装成第一次成功。

### 12.3 Kimi `Invalid Authentication`

先判断使用的是哪种通道：

- Kimi Code 会员：使用 `kimi login` 和 `--provider kimi-cli`；
- Moonshot API：使用 `MOONSHOT_API_KEY` 和 `--provider kimi`。

网页会员、Kimi CLI 登录状态和 Moonshot API Key 不能混用。

### 12.4 找不到 `@oai/artifact-tool`

只影响 PPTX 导出，不影响 HTML 和 SVG。

在 Codex 环境中传入：

```powershell
--node-modules "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
```

### 12.5 Excel 无法读取

确认 Python 安装了：

```powershell
python -m pip install openpyxl
```

并确认工作表名称正确。

### 12.6 误差棒图无法生成

必须明确指定误差列：

```powershell
--error standard_deviation
```

系统不会自行猜测标准差。

---

## 13. 当前能力边界

已经稳定支持：

- 论文单图；
- 思维导图；
- 流程图；
- 技术路线；
- 架构图；
- 层次结构；
- 反馈回路；
- 7 类论文数据图；
- 数学模型关系图；
- 常用 LaTeX；
- 全文插图规划和连续生成；
- 浏览器高级编辑；
- 单图可编辑 PPTX；
- 完整多页 HTML 演示。

仍需人工复核：

- 模型变量和公式是否与论文一致；
- 图表单位和实验条件；
- 复杂 LaTeX 矩阵和多行对齐；
- 灰度打印效果；
- 论文版心缩放；
- 超长中文标签；
- 内容过多时是否应该拆图。

当前尚未把所有复杂统计图都做成独立模块，例如：

- 帕累托前沿专用图；
- 敏感性龙卷风图；
- 生存分析图；
- 地理空间地图；
- 桑基图；
- 网络关系图。

这些图可以后续继续接入统一的 `paper-chart` 或 `paper-visual` Schema，但当前不应宣称已经稳定支持。

---

## 14. 推荐学生工作流

### 普通学生

1. 使用 `$skill-installer` 从 GitHub 安装；
2. 在 Codex 打开论文材料所在目录；
3. 上传论文或数据；
4. 使用自然语言说明需要的图；
5. 先查看 `index.html`；
6. 在 `edit.html` 调整；
7. 导出 SVG 插入论文，需要时打开 PPTX 精修。

### Kimi 会员学生

1. 安装 Kimi Code CLI；
2. 执行 `kimi login`；
3. 用 `kimi-cli` 生成语义规划；
4. 用本地生成器生成 HTML 和 SVG；
5. 在浏览器编辑；
6. 有 Codex 运行时依赖时继续导出 PPTX。

### 小组协作

1. 一名同学负责论文内容和公式；
2. 一名同学负责整理 CSV/Excel；
3. 使用全文插图套件统一规划；
4. 所有图共用同一主题；
5. 统一检查字号、颜色、图号和版心；
6. 最后同时保存 SVG、PPTX 和规划 JSON。

---

## 15. 项目入口

推荐通过 Codex 的 `/skills` 或 Skills 侧边栏确认安装。Windows ZIP 备用安装方式的默认目录是：

```text
%USERPROFILE%\.agents\skills\cumcm-editable-visual-skill
```

Skill 主说明：

```text
%USERPROFILE%\.agents\skills\cumcm-editable-visual-skill\SKILL.md
```

完整示例库：

```text
%USERPROFILE%\.agents\skills\cumcm-editable-visual-skill\examples\showcase-v2\index.html
```

示例提示词：

```text
{实际解压目录}\cumcm-editable-visual-skill\examples\showcase-v2-prompts
```

最终示例验证报告：

```text
{实际解压目录}\cumcm-editable-visual-skill\examples\showcase-v2\showcase-validation-report.json
```

---

## 16. 交付结论

当前版本已经可以作为面向学生的论文可视化 Skill 交付。

推荐首批正式支持：

1. Codex 端到端自然语言使用；
2. Kimi Code 会员 CLI 语义规划；
3. Kimi Moonshot API 语义规划；
4. 本地确定性 HTML/SVG 生成；
5. Codex 环境中的可编辑 PPTX 导出。

对外介绍时建议表述为：

> CUMCM Editable Visual Skill 是一个面向论文和数学建模竞赛的可编辑可视化系统。它支持 Codex 与 Kimi K3 理解论文内容，并使用统一生成器输出流程图、思维导图、模型关系图、数据图表、全文插图套件和多页 HTML 演示。生成结果可在浏览器中拖动编辑，也可导出 SVG、PNG 和 PowerPoint 可编辑 PPTX。
