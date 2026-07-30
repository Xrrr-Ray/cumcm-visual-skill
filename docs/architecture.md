# 架构说明

学术模式采用“材料 → 页面计划 → 页面渲染 → 浏览器检查 → 编辑 → 导出”的主链路。

- `planner/plan-deck.mjs`：解析 Markdown、选择类型、生成并校验计划。
- `templates/page-types.json`：13 类页面的场景、密度、字号和边距约束。
- `templates/academic-page-types.mjs`：将计划渲染为语义化 HTML。
- `assets/academic-base.css` 与 3 套主题：中文响应式排版与视觉 token。
- `components/flowchart/`：可拖动节点与动态边界连线。
- `assets/editor.js`：文字、模块、页面和图片编辑，localStorage 自动保存。
- `assets/inspector.js`：字号、溢出、越界、遮挡、密度和模板重复检查。
- `validators/validate-deck.mjs`：离线结构、资源、页数、notes 与计划一致性检查。
- `exporters/export-deck.mjs`：跨平台定位 Chrome，导出并验证 PNG/PDF。

既有基础 CSS、运行时、通用主题、31 个单页布局、15 套完整 deck 与动效资源继续保留。学术模式在其上增加严格规划与质量门槛，不破坏原有通用能力。

