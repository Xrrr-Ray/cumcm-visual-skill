# CUMCM Figure Skill｜数模国赛论文配图使用手册

> 面向数学建模竞赛、国赛论文、课程论文、毕业论文与答辩展示。  
> 当前推荐使用入口：Codex、Kimi K3。  
> 当前 GitHub 直装版为 v1.3.0，已通过 GitHub Pages 上线。

> 说明：本项目是面向 CUMCM 参赛学生的社区增强版，不是全国大学生数学建模竞赛组委会的官方工具。

## 一、它能做什么

CUMCM Figure Skill 是一套面向论文的可编辑可视化工具。它不只是制作完整 PPT，更主要的用途是把论文文字、模型公式和实验数据转换为可直接插入论文的图。它使用独立调用名 `$cumcm-figure-skill`，可与协会成员的 `$cumcm-visual-skill` 同时安装和使用。

目前支持：

- 论文流程图、技术路线图、算法流程图；
- 思维导图、研究框架图、指标体系图；
- 系统架构图、层次结构图、反馈回路、时间线；
- 折线图、柱状图、散点图、热力图、箱线图、雷达图、误差棒图；
- 变量—目标函数—约束—求解—输出关系图；
- 读取整篇 Markdown 论文，规划并连续生成一套风格统一的插图；
- 在明确要求时生成完整多页 HTML 演示文稿。

生成结果可以继续编辑：

- 在浏览器中拖动节点、分组框和箭头；
- 修改文字、颜色、边框、线型、箭头样式和连线路径；
- 使用类似 PowerPoint 的对齐参考线、水平/垂直吸附、撤销和重做；
- 导出 SVG、PNG、JSON；
- 在支持的环境中导出 PowerPoint 可编辑 PPTX。

## 二、快速判断应该生成哪种图

| 你的材料或需求 | 推荐功能 |
| --- | --- |
| 一段论文方法、算法步骤、研究过程 | 流程图 `flowchart` |
| 研究内容、论文结构、任务分解 | 思维导图 `mindmap` |
| 系统模块、数据流、模型组件 | 架构图 `architecture` |
| 指标体系、分类关系、层级结构 | 层次图 `hierarchy` |
| 迭代优化、闭环控制、动态反馈 | 反馈回路 `feedback-loop` |
| 研究阶段、实验计划、项目里程碑 | 时间线 `timeline` |
| CSV、Excel、JSON 实验数据 | 论文数据图 `paper-chart` |
| 变量、目标函数、约束和求解方法 | 模型关系图 `model-diagram` |
| 一篇完整 Markdown 论文 | 全文插图套件 `figure-suite` |
| 答辩、汇报、演讲，并明确要求多页 | 完整 HTML PPT |

注意：“论文流程图”默认生成一张论文插图；只有明确说“答辩 PPT”“10 页幻灯片”“完整汇报”时，才生成多页演示文稿。

## 三、开始前准备

### 1. 获取项目

推荐直接让 Codex 从 GitHub 安装，无须手动下载：

```text
请使用 $skill-installer，从 GitHub 安装下面的 Skill：
仓库：https://github.com/Xrrr-Ray/cumcm-visual-skill
Skill 路径：仓库根目录（.）
安装名称：cumcm-figure-skill
```

Codex 安装完成后，在下一条消息或新任务中直接使用 `$cumcm-figure-skill`。若列表没有立即刷新，重新打开 Codex。

旧版本迁移：如果本项目 `v1.2.0` 或更早版本仍以 `cumcm-editable-visual-skill` 或 `cumcm-visual-skill` 安装，请先安装并确认新版 `$cumcm-figure-skill` 可用，再移除旧副本。之后可将 `cumcm-visual-skill` 这个名称留给协会成员版本，两套工具即可并存。

相关地址：

- Skill 下载地址：[下载 CUMCM Figure Skill 一键安装包](https://xrrr-ray.github.io/cumcm-visual-skill/downloads/cumcm-figure-skill-one-click.zip)
- 在线示例地址：[CUMCM Figure Skill 公开网站](https://xrrr-ray.github.io/cumcm-visual-skill)
- 学生上手指南：[Codex / Kimi 使用说明](https://xrrr-ray.github.io/cumcm-visual-skill/student-guide/index.html)
- 完整示例库：[查看全部真实示例、提示词与可编辑 PPTX](https://xrrr-ray.github.io/cumcm-visual-skill/showcase-v2/index.html)
- 精选流程图：[产品批次质量检测与闭环处置流程](https://xrrr-ray.github.io/cumcm-visual-skill/showcase-v2/flowcharts/quality-loop/index.html)
- GitHub 仓库：[Xrrr-Ray/cumcm-visual-skill](https://github.com/Xrrr-Ray/cumcm-visual-skill)

如果 Codex 无法联网访问 GitHub，再使用 Windows 备用方式：

1. 下载并解压一键安装包；
2. 双击根目录中的 `安装数模Skill.cmd`；
3. 看到“安装成功”后打开 Codex。

安装器会自动安装到当前用户的 Skill 目录：

```text
%USERPROFILE%\.agents\skills\cumcm-figure-skill
```

它不要求文件在 D 盘，也不需要手动复制目录。重复双击安装器会检查版本并完成更新，旧版本自动保留在 `.cumcm-figure-skill-backups` 中。包内的 `检查安装状态.cmd` 可验证安装，`卸载数模Skill.cmd` 会把当前安装移到备份区，便于恢复。

发布包本身仍可解压到任意磁盘。只有在 Kimi CLI 中手动运行项目脚本时，才需要进入解压目录；将命令中的路径替换为电脑上的真实位置，例如：

```text
{实际解压目录}\cumcm-figure-skill
```

### 2. 基础环境

建议准备：

- Windows 10/11；
- Node.js 18 或以上版本；
- Chrome 或 Edge；
- Microsoft PowerPoint，用于继续编辑 PPTX；
- 读取 XLSX/XLSM 时需要 Python 3 和 `openpyxl`。

检查 Node.js：

```powershell
node --version
```

如需读取 Excel，可安装：

```powershell
python -m pip install openpyxl
```

### 3. 输入材料建议

为了减少模型误解，建议准备以下任一种材料：

- 论文正文或某一章节，推荐 Markdown 或纯文本；
- CSV、XLSX、XLSM 或 JSON 数据文件；
- 包含变量、目标函数、约束和输出的模型 JSON；
- 清晰列出的节点、分组、连接关系和图型要求。

不要在输入中省略关键单位、变量含义、误差列或实验条件。Skill 不会自动编造缺失的数据、公式、结论和引用。

## 四、方式一：使用 Codex（推荐）

Codex 不是只负责理解论文内容。它在读取 `SKILL.md` 后，会作为上层 Agent 自动选择功能、创建规划文件、调用本地脚本、检查输出并完成导出。学生使用 Codex 时通常不需要手动复制 Node.js 命令，适合希望直接用自然语言完成全流程的同学。

### 第一步：确认安装并打开材料目录

在 Codex 中运行 `/skills`，或输入 `$cumcm-figure-skill` 查看是否出现。确认后打开存放论文、数据和输出结果的工作目录即可，不必打开 Skill 源码目录。

### 第二步：上传材料并发送请求

建议每次请求都以这句话开头：

```text
请使用 $cumcm-figure-skill 完成下面的任务。
```

### 第三步：Codex 自动执行本地工作流

Codex 会根据任务自动完成下面的过程：

```text
自然语言请求
→ 读取 SKILL.md
→ 判断图型与生成模式
→ 创建 visual-plan.json 或 chart-plan.json
→ 调用生成、导出和验证脚本
→ 交付 HTML、SVG、PNG、JSON，以及按需生成的 PPTX
```

以论文单图为例，Codex 会在后台自动组织并执行类似命令，学生不需要手动输入：

```powershell
node scripts/generate-paper-visual.mjs `
  --plan visual-plan.json `
  --source input.md `
  --prompt prompt.md `
  --output output\visual

node exporters/export-paper-visual.mjs `
  --html output\visual\index.html `
  --output output\visual\exports `
  --scale 2
```

需要 PowerPoint 可编辑文件时，Codex 还会继续调用 PPTX 导出器并进行重导入检查。

项目中没有 `--provider codex`，因为 Codex 不是被某个规划脚本调用的模型接口，而是负责执行整个 Skill 的上层 Agent。

### 第四步：查看结果

Codex 完成后，优先查看：

- `index.html`：干净展示版；
- `edit.html`：浏览器可拖动编辑版；
- `diagram.svg` 或 `chart.svg`：论文矢量图；
- `diagram.png`：高分辨率位图；
- `diagram.pptx` 或 `chart.pptx`：PowerPoint 可编辑版；
- `validation-report.json`：验证结果；
- `known-issues.md`：需要人工复核的内容。

### Codex 提示词示例

#### 1. 论文技术路线图

```text
请使用 $cumcm-figure-skill。

根据附件中的论文方法部分，生成一张适合国赛论文正文的技术路线图，不要生成完整 PPT。

要求：
1. 只使用原文中出现的研究阶段、模型和结论，不得补造；
2. 使用近白背景和低饱和学术配色；
3. 清楚展示各阶段的数据流、处理步骤和反馈关系；
4. 节点、背景框、文字和箭头都可以继续编辑；
5. 输出 index.html、edit.html、SVG、2× PNG、规划 JSON；
6. 同时输出 PowerPoint 可编辑 PPTX；
7. 完成后执行格式和视觉验证。
```

#### 2. 思维导图

```text
请使用 cumcm-figure-skill，把附件中的研究内容生成一张思维导图。
采用“模型基础—研究主线—任务分解”的结构，不要生成完整 PPT。
节点、背景分区和箭头都要可编辑，并输出 SVG、edit.html 和 PPTX。
不得添加原文没有的研究任务。
```

#### 3. 从 Excel 生成论文数据图

```text
请使用 cumcm-figure-skill 读取附件中的 Excel。
先检查字段类型、缺失值、数值范围和工作表，再根据数据关系选择合适的论文图表。
不要修改或补造数据，不要自行添加显著性结论。
输出论文版 SVG、可编辑 HTML、2× PNG 和 PowerPoint 可编辑 PPTX。
```

#### 4. 数学模型关系图

```text
请使用 cumcm-figure-skill，根据附件中的模型 JSON 生成
“变量—目标函数—约束—求解与检验—模型输出”关系图。
保留原始 LaTeX，变量和约束不得根据常识补充。
输出 HTML、SVG、PNG 和全元素可编辑 PPTX。
```

#### 5. 整篇论文插图套件

```text
请使用 cumcm-figure-skill 读取附件中的 Markdown 论文。
先规划整篇论文需要的插图，为每张图记录来源章节、用途、图型和必需输入。
对输入完整的图连续生成 HTML、SVG 和可编辑 PPTX，并生成统一风格的插图总目录。
缺少数据或公式的部分只标记缺口，不得伪造。
```

## 五、方式二：使用 Kimi K3

Kimi 当前正式接入的是“论文单图的语义规划”，适合生成流程图、思维导图、技术路线图、研究框架图、架构图、层次图和反馈回路。

Kimi 负责理解论文内容并生成统一语义规划；最终布局、HTML、SVG 和编辑器仍由本地脚本确定性生成。因此，Codex 与 Kimi 的最终文件格式和编辑能力保持一致。

与 Codex 不同，当前 Kimi 接入使用的是 provider 模式：项目脚本主动调用 `kimi-cli` 或 Moonshot API，所以需要学生先在终端运行入口命令。这个差异来自接入方式，而不是 Kimi 只能理解、不能生成。

### 1. Kimi Code 会员方式（推荐）

Kimi 网页会员、Kimi Code CLI 登录和 Moonshot API Key 是不同通道，不能混用。已有 Kimi Code 会员的同学，推荐使用官方 CLI 登录。

安装并登录：

```powershell
npm install -g @moonshot-ai/kimi-code@latest
kimi login
kimi --version
```

登录成功后，进入 Skill 根目录：

```powershell
# 将下一行替换为 Skill 实际解压后的文件夹路径
Set-Location "{实际解压目录}\cumcm-figure-skill"
```

路径不要求在 D 盘。可以在资源管理器中打开解压后的 `cumcm-figure-skill` 文件夹，复制地址栏中的完整路径并替换占位内容。

准备两个文件：

- `input.md`：论文材料；
- `prompt.md`：本次生成要求。

`prompt.md` 示例：

```markdown
请根据输入材料规划一张论文技术路线图。

要求：
1. 提取研究阶段、核心任务、数据流和反馈关系；
2. 不得补造原文没有的模型、公式或结论；
3. 使用适合国赛论文的低饱和学术配色；
4. 输出清晰的分组、节点、边、方向和标签。
```

运行 Kimi 语义规划：

```powershell
node scripts/plan-paper-visual-with-model.mjs `
  --provider kimi-cli `
  --model kimi-code/k3 `
  --input input.md `
  --prompt prompt.md `
  --output output\kimi-planning-001
```

继续生成最终图：

```powershell
node scripts/generate-paper-visual.mjs `
  --plan output\kimi-planning-001\visual-plan.json `
  --source input.md `
  --prompt prompt.md `
  --output output\kimi-visual-001
```

每次重新运行都要使用新的输出目录，例如把 `001` 改成 `002`。生成器不会覆盖非空目录，以免误删已有结果。

### 2. Moonshot 开放平台 API 方式

只有拥有 Moonshot 开放平台 API Key 时才使用此方式。

在当前 PowerShell 会话中安全输入：

```powershell
$secureKey = Read-Host "粘贴 Moonshot API Key" -AsSecureString
$env:MOONSHOT_API_KEY = [Net.NetworkCredential]::new("", $secureKey).Password.Trim()
```

运行：

```powershell
node scripts/plan-paper-visual-with-model.mjs `
  --provider kimi `
  --model kimi-k3 `
  --input input.md `
  --prompt prompt.md `
  --output output\kimi-api-planning-001
```

再使用 `generate-paper-visual.mjs` 生成最终文件。

请勿把 API Key 写入 Markdown、JSON、聊天记录、日志或项目文件。

### 3. Kimi 当前能力边界

- Kimi provider 当前正式覆盖论文单图的语义规划；
- 数据图应直接使用真实 CSV、Excel 或 JSON，由 `paper-chart` 生成；
- 模型图建议先整理结构化模型 JSON，再由 `model-diagram` 生成；
- Kimi-only 环境可以生成 HTML 和 SVG；
- PPTX 导出目前需要包含 `@oai/artifact-tool` 的 Codex 运行环境或对应依赖。

## 六、浏览器中如何编辑

双击打开输出目录中的：

```text
edit.html
```

主要操作：

- 拖动节点改变位置；
- 双击或使用侧边栏修改文字；
- 修改节点填充色、边框色和文字色；
- 拖动背景分区框，调整宽度和高度；
- 修改背景框标题和颜色；
- 拖动箭头起点、终点和蓝色折点；
- 修改连线起止节点、锚点、箭头样式、线宽、线型、颜色和标签；
- 接近水平或垂直时自动锁直；
- 按 `Shift` 强制锁定方向；
- 按 `Alt` 临时关闭吸附；
- 使用撤销、重做、重置和自动保存。

编辑完成后可以导出更新后的 SVG、2× PNG 和规划 JSON。需要重新生成 PPTX 时，优先使用编辑器导出的 JSON。

## 七、如何放入论文和 PowerPoint

### 插入论文

优先使用 SVG：

- 矢量清晰，缩放不模糊；
- 适合 Word、WPS 和 LaTeX 工作流；
- 正式提交前检查学校或竞赛系统是否接受 SVG。

如系统不接受 SVG，可使用 2× PNG。

### 在 PowerPoint 中继续编辑

打开 `diagram.pptx` 或 `chart.pptx`：

- 流程图节点、背景框、文字和连接符是独立对象；
- 折线图、柱状图、散点图和雷达图是 PowerPoint 原生图表；
- 热力图、箱线图和误差棒图由可编辑形状组成；
- 可以继续修改文字、颜色、大小、坐标、数据和箭头。

## 八、推荐的通用提示词模板

```text
请使用 cumcm-figure-skill，根据【输入材料】生成一张【图型】。

核心内容：
- 【内容 1】
- 【内容 2】
- 【内容 3】

要求：
- 用于【国赛论文正文 / 课程论文 / 毕业论文 / 答辩】；
- 画布方向为【横向 / 纵向】；
- 使用近白背景、低饱和学术配色；
- 中文清晰，缩小到论文版心后仍可阅读；
- 节点、背景框、文字和箭头可以继续编辑；
- 输出 index.html、edit.html、SVG、2× PNG 和 JSON；
- 【需要 / 不需要】PowerPoint 可编辑 PPTX；
- 不得补造输入中没有的数据、公式、结论、单位和引用；
- 完成后执行格式验证和视觉检查。
```

提示词中最好明确四件事：

1. 想生成什么图；
2. 图中必须出现哪些内容；
3. 哪些内容绝对不能补造；
4. 是否需要 PPTX。

## 九、常见问题

### 1. 为什么生成了完整 PPT，而不是一张论文图？

请求中应明确写：

```text
生成一张可插入论文的图，不要生成完整 PPT。
```

### 2. 报错 `Cannot find module`

通常是当前目录不对。先进入 Skill 根目录，再运行脚本：

```powershell
Set-Location "{实际解压目录}\cumcm-figure-skill"
```

### 3. 报错“输出目录非空，拒绝覆盖”

这是保护机制。把输出目录从 `run-001` 改为 `run-002`，不要直接覆盖旧结果。

### 4. Kimi 报登录或认证错误

先确认通道：

- Kimi Code 会员：`kimi login` + `--provider kimi-cli`；
- Moonshot 开放平台：`MOONSHOT_API_KEY` + `--provider kimi`。

会员登录状态和 API Key 不能混用。

### 5. 找不到 `@oai/artifact-tool`

这只影响 PPTX 导出，不影响 HTML 和 SVG。建议在 Codex 环境中完成 PPTX 导出。

### 6. Excel 无法读取

确认已安装：

```powershell
python -m pip install openpyxl
```

并检查工作表名称是否正确。

### 7. 误差棒图无法生成

必须明确提供并指定误差列，系统不会自行猜测标准差、标准误或置信区间。

### 8. 生成结果是否可以直接提交？

不建议未经检查直接提交。请至少复核：

- 模型变量和公式是否与论文一致；
- 图表单位、实验条件和图例；
- 中文换行和最小字号；
- 灰度打印效果；
- 缩放到论文版心后的可读性；
- 是否存在过长连线、交叉线或内容过密；
- 图号、标题和正文引用是否一致。

## 十、当前公开交付范围

当前公开版面向学生展示：

- 4 类核心能力：论文结构图、论文数据图、数学模型图、全文插图套件；
- 7 类论文数据图：折线、柱状、散点、热力、箱线、雷达和误差棒图；
- 论文流程图、思维导图、技术路线、架构图、层次图、反馈回路和时间线；
- 3 类数学模型关系图场景：优化、预测和评价；
- 12 份完整提示词；
- 5 种常用交付格式：HTML、SVG、PNG、JSON、PPTX；
- 2 种模型入口：Codex 端到端执行、Kimi K3 语义规划。

公开示例在发布前经过格式、浏览器渲染、PPTX 重导入和资源链接检查。具体工程测试数字保留在项目验证报告中，不作为学生首页指标。

当前已稳定支持论文单图、数据图、模型关系图、全文插图套件、浏览器高级编辑和可编辑 PPTX。复杂 LaTeX 矩阵、超长中文标签、特殊统计图和地理空间图仍需要人工处理或后续扩展。

## 十一、给第一次使用者的最短流程

### 使用 Codex

1. 把 GitHub 安装提示词发送给 Codex；
2. 等待 `$skill-installer` 完成安装；
3. 上传论文或数据；
4. 发送“请使用 `$cumcm-figure-skill`”；
5. Codex 自动调用生成、导出和验证脚本；
6. 查看 `index.html`；
7. 打开 `edit.html` 调整；
8. 使用 SVG 插入论文，或打开 PPTX 精修。

### 使用 Kimi 会员

1. 下载并解压项目；
2. 安装 Kimi Code CLI；
3. 执行 `kimi login`；
4. 准备 `input.md` 和 `prompt.md`；
5. 运行 Kimi 规划命令；
6. 运行本地生成命令；
7. 打开 `edit.html` 调整并导出。

---

对外介绍可使用下面这段话：

> CUMCM Figure Skill 是一套面向 CUMCM 数模国赛和论文写作的可编辑可视化系统。Codex 可以读取 Skill 后自动调用本地生成、导出和验证脚本；Kimi K3 可以通过会员 CLI 或开放平台完成论文单图的语义规划。系统支持流程图、思维导图、模型关系图、论文数据图和全文插图套件，结果可在浏览器中拖动编辑，并导出 HTML、SVG、PNG、JSON 和 PowerPoint 可编辑 PPTX。
