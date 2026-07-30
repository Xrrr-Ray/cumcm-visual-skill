# 使用说明

## 国赛论文单图

流程图、思维导图、技术路线图、研究框架图、系统架构图和反馈回路默认使用单图模式。先按 `references/paper-visual-workflow.md` 创建 `visual-plan.json`，再执行：

```bash
node scripts/generate-paper-visual.mjs --plan visual-plan.json --output output/visual --source input.md --prompt prompt.md
node exporters/export-paper-visual.mjs --html output/visual/index.html --output output/visual/exports-1920 --scale 1
node exporters/export-paper-visual.mjs --html output/visual/index.html --output output/visual/exports-2x --scale 2
```

主要交付为 `diagram.svg`、1920×1080 PNG、3840×2160 PNG、干净展示页 `index.html` 和编辑页 `edit.html`。编辑页支持节点拖动与配色、分组背景框拖动/缩放/改字/配色，以及连线起终节点、锚点、箭头形态、路径折点、颜色、线宽和线型编辑。所有颜色字段共用 Office 式分层色板：10 列主题色及明暗阶、标准色，以及最后使用的“更多颜色…”系统调色盘。默认启用 PPT 式智能吸附与蓝色参考线；按 `Shift` 强制连线正交，按 `Alt` 临时关闭吸附。支持撤销、重做、重置及导出更新后的 SVG、2× PNG、JSON。修改自动保存到当前浏览器。正式截图使用 `index.html`，不显示工具栏。输出目录必须为空，重跑时新建目录。

## 完整演示文稿

```bash
node scripts/generate-academic-deck.mjs --input material.md --output output/deck --theme academic-light --case-id my-deck
node validators/validate-deck.mjs --html output/deck/index.html --plan output/deck/plan.json --output output/deck/validation-report.json
node exporters/export-deck.mjs --html output/deck/index.html --output output/deck/exports
```

生成后通过本地 HTTP 服务打开 `index.html`，方向键翻页；按 `T` 切换主题、`O` 查看总览、`S` 打开演讲者模式。

工具栏提供编辑、上移、下移、复制、删除、重置、检查和 PDF 打印。文字修改和拖动位置会自动保存到当前浏览器。

五套完整示例位于 `examples/academic-suite/`，覆盖数学建模、科研答辩、算法介绍、数据分析和工作总结。
