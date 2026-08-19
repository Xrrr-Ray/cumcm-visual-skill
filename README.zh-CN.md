# CUMCM Editable Visual Skill · 数模国赛论文可编辑可视化 Skill

> 面向 CUMCM（全国大学生数学建模竞赛）与一般学术论文的可编辑可视化增强版。

本项目基于 [lewislulu/html-ppt-skill](https://github.com/lewislulu/html-ppt-skill) 二次开发，保留原作者署名与 MIT 许可证。在原有 HTML 演示能力上，重点增强了国赛论文单图、数据图表、数学模型关系图、全文插图规划、浏览器可视化编辑、Codex / Kimi K3 语义规划，以及 PowerPoint 原生可编辑导出。

本项目不是全国大学生数学建模竞赛组委会的官方工具，也不代表组委会立场。

## 论文单图模式（CUMCM 论文配图的默认模式）

当请求是流程图、思维导图、技术路线图、研究框架图、系统架构图或反馈回路时，本版本默认只生成一张论文插图，不生成完整 PPT。交付自包含 `index.html`、独立 `diagram.svg` 与真实 Chrome 导出的 `diagram.png`；只有明确要求 PPT、slides、deck、答辩稿或多页汇报时才进入演示文稿模式。

```bash
node scripts/generate-paper-visual.mjs --plan visual-plan.json --output output/visual --source input.md --prompt prompt.md
node exporters/export-paper-visual.mjs --html output/visual/index.html --output output/visual/exports --scale 2
```

完整流程见 [`references/paper-visual-workflow.md`](references/paper-visual-workflow.md)，已验证的思维导图与闭环流程图见 `examples/paper-visual-suite/`。每次生成还会得到 `edit.html`：节点、分组背景框和连线均可选择；支持节点配色、分组框拖动缩放、连线锚点/箭头/折点/颜色/线型编辑。颜色选择优先提供主题色、主题色明暗阶和标准色，仍可通过“更多颜色…”调用系统调色盘。编辑器还提供 PPT 式智能吸附、临时参考线、连线水平/垂直锁定、撤销/重做、自动保存，以及导出编辑后的 SVG、2× PNG 和 JSON。`index.html` 保持为无编辑控件的正式展示页。

## 中文学术模式

本版本新增面向数学建模、科研答辩、算法介绍、数据分析和工作总结的严格工作流：先生成 `plan.json`，再从 13 种页面类型中按内容选型，使用 3 套本地学术主题，完成浏览器三视口检查后导出真实 PNG/PDF。内置编辑器支持文字、模块、页面和图片修改，流程图节点可拖动且连线自动刷新。

```bash
node scripts/generate-academic-deck.mjs --input material.md --output output/deck --theme competition-blue --case-id demo
node exporters/export-deck.mjs --html output/deck/index.html --output output/deck/exports
```

详细用法见 [`references/academic-workflow.md`](references/academic-workflow.md) 和 [`docs/usage.md`](docs/usage.md)，五套已验证示例见 `examples/academic-suite/`。

> 一款专业级的 AgentSkill，让 AI 做出真正能打的 HTML 演示文稿。
> **36 套主题**、**15 套完整 deck 模板**、**31 种页面布局**、**47 个动效**
> (27 个 CSS + 20 个 Canvas FX)，加上全新的 **演讲者模式** —— 像素级
> 完美预览 + 逐字稿提词器 + 计时器。纯静态 HTML/CSS/JS，无需构建。

**作者：** lewis &lt;sudolewis@gmail.com&gt;
**协议：** MIT
**English docs:** [README.md](README.md)

![cumcm-visual-skill 封面 · 实时预览](docs/readme/hero.gif)

> GitHub 仓库可由 Codex 直接安装为 Skill，同时包含数模论文图生成器、**36 主题 × 20 Canvas FX × 31 布局 × 15 完整 deck + 演讲者模式**。
> 上图里的每一个预览都是真实的 iframe 加载真实模板文件 —— 不是截图，不是色卡。

## 🎤 演讲者模式（全新）

在任何 deck 里按 `S` 键，弹出一个独立的演讲者窗口，包含 4 个**可拖拽、
可调整大小的磁吸卡片**：当前页预览、下一页预览、逐字稿、计时器。两个窗口
通过 `BroadcastChannel` 双向同步翻页。

![演讲者模式 · 4 个磁吸卡片](docs/readme/presenter-mode.png)

**为什么预览是像素级完美的：** 每个卡片是一个 `<iframe>`，加载的是**同一
份 deck HTML 文件**，只是 URL 多了 `?preview=N` 参数。runtime 检测到这个
参数后，只渲染第 N 页并隐藏所有 chrome —— 所以预览使用**和观众视图完全相
同的 CSS、主题、字体、viewport**，颜色和排版保证 100% 一致。

**丝滑翻页（零闪烁）：** 翻页时演讲者窗口通过 `postMessage({type:'preview-goto',
idx:N})` 通知 iframe，iframe 只是切换 `.is-active` class —— **不重新加载、
不白屏、不闪烁**。

**逐字稿 3 条铁律：**
1. **提示信号，不是讲稿** — 关键词加粗，过渡句独立成段
2. **每页 150–300 字** — 约 2–3 分钟/页的节奏
3. **用口语，不用书面语** — "所以" 不是 "因此"，"这个" 不是 "该"

详见 [`references/presenter-mode.md`](references/presenter-mode.md)，或直接复制
`templates/full-decks/presenter-mode-reveal/` 这个现成模板 —— 每一页都带完整
150–300 字的示例逐字稿。

## 在 Codex 中从 GitHub 安装（推荐）

不需要先下载 ZIP，也不需要打开终端。在 Codex 中直接粘贴：

```text
请使用 $skill-installer，从 GitHub 安装下面的 Skill：
仓库：https://github.com/Xrrr-Ray/cumcm-visual-skill
Skill 路径：仓库根目录（.）
安装名称：cumcm-editable-visual-skill
```

Codex 会从 GitHub 下载并安装标准 Skill。安装完成后，在下一条消息或新任务中直接点名 `$cumcm-editable-visual-skill`；若 Skill 列表没有刷新，重新打开 Codex。这个调用名与协会成员的 `$cumcm-visual-skill` 不同，两套可视化 Skill 可以同时安装。

如果电脑中仍有本项目 `v1.1.1` 或更早版本，它可能仍以 `cumcm-visual-skill` 安装。先完成新版安装并确认 `$cumcm-editable-visual-skill` 可用，再移除旧副本，随后即可把 `cumcm-visual-skill` 这个名称留给协会成员版本。

安装后可直接对 Codex 说：

> 使用 `$cumcm-editable-visual-skill`，根据我提供的论文方法部分生成一张适合国赛正文的技术路线图。不要生成完整 PPT；输出可编辑 HTML、SVG、2× PNG 和 PPTX，不得补造原文没有的数据、公式或结论。

### 下载 ZIP 后安装（Windows 备用方式）

如果无法让 Codex 联网访问 GitHub，可以下载并解压[一键安装包](https://xrrr-ray.github.io/cumcm-visual-skill/downloads/cumcm-editable-visual-skill-one-click.zip)，再双击 `安装数模Skill.cmd`。安装器会识别当前用户，不要求项目位于 D 盘；重复运行可更新，旧版本会自动备份。

### 本地命令行安装（可选）

需要自定义安装位置或自动化部署时，可运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-cumcm-visual-skill.ps1 -Action Install
```

查看状态、更新和可恢复卸载：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-cumcm-visual-skill.ps1 -Action Status
powershell -ExecutionPolicy Bypass -File .\scripts\install-cumcm-visual-skill.ps1 -Action Update
powershell -ExecutionPolicy Bypass -File .\scripts\install-cumcm-visual-skill.ps1 -Action Uninstall
```

## Skill 内容一览

| | 数量 | 位置 |
|---|---|---|
| 🎤 **演讲者模式** | **新增** | `S` 键 / `?preview=N` |
| 🎨 **主题** | **36** | `assets/themes/*.css` |
| 📑 **完整 deck 模板** | **15** | `templates/full-decks/<name>/` |
| 🧩 **单页布局** | **31** | `templates/single-page/*.html` |
| ✨ **CSS 动画** | **27** | `assets/animations/animations.css` |
| 💥 **Canvas FX 动画** | **20** | `assets/animations/fx/*.js` |
| 🖼️ **Showcase deck** | 4 | `templates/*-showcase.html` |
| 📸 **验证截图** | 56 | `scripts/verify-output/` |

### 36 套主题

`minimal-white`、`editorial-serif`、`soft-pastel`、`sharp-mono`、`arctic-cool`、
`sunset-warm`、`catppuccin-latte`、`catppuccin-mocha`、`dracula`、`tokyo-night`、
`nord`、`solarized-light`、`gruvbox-dark`、`rose-pine`、`neo-brutalism`、
`glassmorphism`、`bauhaus`、`swiss-grid`、`terminal-green`、`xiaohongshu-white`、
`rainbow-gradient`、`aurora`、`blueprint`、`memphis-pop`、`cyberpunk-neon`、
`y2k-chrome`、`retro-tv`、`japanese-minimal`、`vaporwave`、`midcentury`、
`corporate-clean`、`academic-paper`、`news-broadcast`、`pitch-deck-vc`、
`magazine-bold`、`engineering-whiteprint`

![36 主题 · 其中 8 个](docs/readme/themes.png)

每个主题都是一份纯 CSS token 文件 —— 只需要换一行 `<link>` 就能给整份 deck
换皮。在 `templates/theme-showcase.html` 里可以浏览全部（每一页用独立 iframe
渲染，避免样式互相污染）。

![15 套完整 deck 模板](docs/readme/templates.png)

### 15 套完整 deck 模板

8 个从真实作品提炼的视觉语言，7 个通用场景脚手架：

**提炼款**
- `xhs-white-editorial` — 小红书白底杂志风
- `graphify-dark-graph` — 暗底 + 力导向知识图谱
- `knowledge-arch-blueprint` — 蓝图 / 架构图风
- `hermes-cyber-terminal` — 终端 cyberpunk 风
- `obsidian-claude-gradient` — 紫色渐变卡
- `testing-safety-alert` — 红 / 琥珀警示风
- `xhs-pastel-card` — 柔和马卡龙图文
- `dir-key-nav-minimal` — 方向键极简

**场景款**
- `pitch-deck` — 投资人 pitch
- `product-launch` — 产品发布会
- `tech-sharing` — 技术分享
- `weekly-report` — 周报
- `xhs-post` — 小红书图文（9 页 3:4）
- `course-module` — 教学模块
- **`presenter-mode-reveal`** 🎤 — 完整分享模板，**每一页都带 150-300 字
  的示例逐字稿**，围绕 `S` 键演讲者模式专门设计

每个模板都是自包含的文件夹，用 scoped `.tpl-<name>` CSS，所以多个模板可以
同时加载不会互相污染。在 `templates/full-decks-index.html` 可以看全套 gallery。

![31 种单页布局](docs/readme/layouts.png)

### 31 种单页布局

cover · toc · section-divider · bullets · two-column · three-column ·
big-quote · stat-highlight · kpi-grid · table · code · diff · terminal ·
flow-diagram · timeline · roadmap · mindmap · comparison · pros-cons ·
todo-checklist · gantt · image-hero · image-grid · chart-bar · chart-line ·
chart-pie · chart-radar · arch-diagram · process-steps · cta · thanks

每个布局都带真实的示例数据，拖进 deck 立即看得到效果。

![31 种布局通过真实模板文件自动循环播放](docs/readme/layouts-live.gif)

*大 iframe 直接加载 `templates/single-page/<name>.html` 文件，每 2.8 秒
自动切换到下一个布局。*

![47 个动效 · 27 CSS + 20 Canvas FX](docs/readme/animations.png)

### 27 个 CSS 动画 + 20 个 Canvas FX

**CSS 动画（轻量）** — 方向性淡入、`rise-in`、`zoom-pop`、`blur-in`、
`glitch-in`、`typewriter`（打字机）、`neon-glow`（霓虹光晕）、
`shimmer-sweep`（流光）、`gradient-flow`（渐变流动）、`stagger-list`
（列表错开入场）、`counter-up`（数字滚动）、`path-draw`（路径绘制）、
`morph-shape`、`parallax-tilt`、`card-flip-3d`、`cube-rotate-3d`、
`page-turn-3d`、`perspective-zoom`、`marquee-scroll`、`kenburns`、
`ripple-reveal`、`spotlight`、…

**Canvas FX（电影级）** — `particle-burst`（粒子爆发）、`confetti-cannon`
（彩带）、`firework`（烟花）、`starfield`（星空）、`matrix-rain`
（代码雨）、`knowledge-graph`（力导向知识图谱）、`neural-net`（神经网络
脉冲）、`constellation`（星座连线）、`orbit-ring`（轨道环）、
`galaxy-swirl`（星系漩涡）、`word-cascade`、`letter-explode`、
`chain-react`、`magnetic-field`、`data-stream`、`gradient-blob`、
`sparkle-trail`、`shockwave`、`typewriter-multi`、`counter-explosion`。
每一个都是手写的 canvas 模块，进入 slide 时由 `fx-runtime.js` 自动初始化。

## 快速开始（手动 / 安装后 / git clone 后）

```bash
# 从 base 模板新建一个 deck
./scripts/new-deck.sh my-talk

# 浏览所有内容
open templates/theme-showcase.html         # 全部 36 主题（iframe 隔离）
open templates/layout-showcase.html        # 全部 31 布局
open templates/animation-showcase.html     # 全部 47 动效
open templates/full-decks-index.html       # 全部 15 个完整 deck

# 用 headless Chrome 导出 PNG
./scripts/render.sh templates/theme-showcase.html
./scripts/render.sh examples/my-talk/index.html 12
```

## 键盘快捷键

```
← → Space PgUp PgDn Home End   翻页
F                               全屏
S                               打开演讲者窗口（磁吸卡片模式）
N                               底部 notes 抽屉
R                               重置计时器（演讲者窗口内）
O                               slide 总览网格
T                               切换主题（自动同步到演讲者窗口）
A                               在当前 slide 循环演示一个动画
#/N (URL)                       深链到第 N 页
?preview=N (URL)                预览模式（只显示单页，隐藏 chrome）
```

## 项目结构

```
cumcm-editable-visual-skill/
├── SKILL.md                      agent 入口
├── README.md                     英文 README
├── README.zh-CN.md               本文件
├── references/                   详细文档
│   ├── themes.md                 36 主题 + 使用场景
│   ├── layouts.md                31 布局
│   ├── animations.md             27 CSS + 20 FX 目录
│   ├── full-decks.md             15 完整 deck 模板
│   ├── presenter-mode.md         🎤 演讲者模式 + 逐字稿指南
│   └── authoring-guide.md        完整工作流
├── assets/
│   ├── base.css                  共享 tokens + 基础组件
│   ├── fonts.css                 web 字体引入
│   ├── runtime.js                键盘导航 + 演讲者模式 + 总览
│   ├── themes/*.css              36 主题 token 文件
│   └── animations/
│       ├── animations.css        27 个命名 CSS 动画
│       ├── fx-runtime.js         进入 slide 自动初始化 [data-fx]
│       └── fx/*.js               20 个 Canvas FX 模块
├── templates/
│   ├── deck.html                 最小起步模板
│   ├── theme-showcase.html       iframe 隔离的主题 tour
│   ├── layout-showcase.html      全部 31 布局
│   ├── animation-showcase.html   47 动画 slide
│   ├── full-decks-index.html     15 deck gallery
│   ├── full-decks/<name>/        15 个 scoped 多页 deck 模板
│   └── single-page/*.html        31 个布局文件（带示例数据）
├── scripts/
│   ├── new-deck.sh               脚手架
│   ├── render.sh                 headless Chrome → PNG
│   └── verify-output/            56 张自测截图
└── examples/demo-deck/           完整可运行的示例 deck
```

## 设计理念

- **Token 驱动的设计系统。** 所有颜色、圆角、阴影、字体决策都在
  `assets/base.css` + 当前主题文件里。改一个变量，整份 deck 优雅地重排。
- **Iframe 隔离预览。** 主题 / 布局 / 完整 deck 的 showcase 都用 `<iframe>`，
  确保每个预览都是真实、独立的渲染结果。
- **零构建。** 纯静态 HTML/CSS/JS。只有 webfont / highlight.js / chart.js
  (可选) 走 CDN。
- **资深设计师的默认值。** 字号规律、间距节奏、渐变、卡片处理都有态度 ——
  绝不是 "PowerPoint 2006" 那种味道。
- **中英双语一等公民。** 预导入了 Noto Sans SC / Noto Serif SC。

## 协议

MIT © 2026 lewis &lt;sudolewis@gmail.com&gt;
