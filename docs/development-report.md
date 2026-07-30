# 开发报告

本次优化以 `.agents/skills/ppt-target/` 为基线审计源，在独立可写工作副本 `html-ppt-skill/` 中完成；`vendor/` 和 `.agents/skills/` 未修改。

新增页面计划器、13 类学术页面、3 套主题、中文响应式排版、可编辑流程图、页面编辑器、浏览器检查器、静态校验器和跨平台 PNG/PDF 导出器。五套 10 页示例覆盖数学建模、科研答辩、算法介绍、数据分析和工作总结。

迭代修复了长标题裁切、流程图克隆、检查器时序、720p 固定最小高度、17px 图表文字、导出命令参数和打印连线坐标等问题。最终 15 个“案例×视口”组合全部通过，50 张正式 PNG 和 5 份 10 页 PDF 均通过格式验证，关键 PDF 页面经 Poppler 渲染目检通过。

完整阶段记录、命令、stdout/stderr、依赖版本和评分位于仓库根目录的 `docs/`、`tests/`、`evals/` 与 `logs/html-ppt-optimization/`。

## 2026-07-23 目标纠偏：论文单图可视化

用户进一步明确最终目标是使用本 Skill 制作国赛论文中的流程图、思维导图等可视化图片，而不是默认生成完整 PPT。此前完整演示文稿功能与测试材料原样保留；本轮只在可写开发副本 `html-ppt-skill/` 中新增论文单图模式，未修改 `vendor/` 与 `.agents/skills/`。

本轮新增：

- `paper-visual/render-paper-visual.mjs`：从冻结的 `visual-plan.json` 生成自包含 HTML 与标准 SVG；
- `scripts/generate-paper-visual.mjs`：单图生成、静态元数据和防覆盖；
- `exporters/export-paper-visual.mjs`：使用真实 Chrome 导出 1×/2× PNG 并校验签名与尺寸；
- `scripts/run-paper-visual-validation.mjs`：复用历史论文可视化评测器，保存静态与浏览器验证证据；
- `references/paper-visual-workflow.md`：单图路由、规划 schema、版心字号、回边和交付规则；
- `examples/paper-visual-plans/` 与 `examples/paper-visual-suite/`：思维导图和反馈闭环真实案例。

正式结果：思维导图静态检查 94/94、浏览器硬检查 23/23；反馈闭环静态检查 108/108、浏览器硬检查 24/24；两者打印字号分级均为 `PASS_PRINT`。两份 SVG 均由 .NET XML 解析为有效 `svg` 根节点；四份 PNG 分别通过 1920×1080 和 3840×2160 的签名与 IHDR 尺寸验证。`skill-creator` 的 `quick_validate.py` 返回 `Skill is valid!`，原有五类完整 deck 规划测试继续通过。

保留的失败证据包括：首轮外部资源检查误判 SVG 命名空间、PowerShell `Path/PATH` 验证封装失败、反馈图早期标签拥挤版本，以及 SVG `<tspan>` 多行文本导致的静态语义误判。最终修正未覆盖或删除这些结果。
