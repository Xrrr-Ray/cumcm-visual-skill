# 国赛论文单图可视化工作流

## 适用范围

默认用于论文流程图、思维导图、技术路线图、系统框架图、因果/反馈回路、层次结构图和研究路线图。一次只生成一张主图，不创建封面、目录或翻页结构。

## 固定步骤

1. 保存原始材料为 `input.md`，保存完整请求为 `prompt.md`。
2. 从材料中提取分组、节点、节点说明、边、方向、边标签、条件分支和回边。事实不充分时保留“待确认”，不得补造模型、指标、公式、结论或引用。
3. 先写 `visual-plan.json`，再渲染。规划至少包含 `mode`、`type`、`title`、`canvas`、`groups`、`nodes`、`edges`；节点使用稳定 ID，边使用稳定 ID、`from`、`to`、`kind`。若使用外部大模型，先按 `model-provider-workflow.md` 生成并校验无坐标的 `semantic-plan.json`，再由 Skill 的布局器生成 `visual-plan.json`。
4. 优先按语义选择图型：顺序和分支用 `flowchart`；中心主线与双翼任务用 `mindmap`；模块依赖用 `architecture`；层级指标用 `hierarchy`；反复修正用 `feedback-loop`；阶段演进用 `timeline`。
5. 使用 1920×1080 作为默认工作画布。按论文约 15 cm 版心复核时，节点标题不得低于 32 px，说明和边标签不得低于 28 px；高密度图应拆图，不得靠缩小字号硬塞。
6. 生成干净展示页 `index.html`、可编辑 `edit.html` 与独立 `diagram.svg`。默认白底或近白底、低饱和配色；正式展示页不显示页码、翻页提示、导航、进度条和编辑器端口。
7. 执行静态检查和真实 Chrome 检查：恰有一个画布、无滚动/裁切/节点重叠、所有边可见、有向边有箭头、边标签与分支一致、无脚本异常和外部资源失败。
8. 导出 PNG。默认 1920×1080；正式插图可用 `--scale 2` 生成 3840×2160。校验 PNG 签名和 IHDR 尺寸后再标记完成。
9. 人工检查灰度打印、15 cm 缩版、交叉线、回边、箭头方向、长中文换行和标题层级。记录限制，不删除失败输出。

## `visual-plan.json` 最小结构

```json
{
  "schema_version": 1,
  "mode": "paper-visual",
  "type": "flowchart",
  "title": "研究技术路线",
  "subtitle": "数据—建模—验证—决策",
  "theme": "academic-blue",
  "canvas": { "width": 1920, "height": 1080 },
  "groups": [{ "id": "G1", "label": "数据准备", "x": 60, "y": 190, "width": 520, "height": 780 }],
  "nodes": [{ "id": "N1", "group": "G1", "label": "数据清洗", "detail": "缺失值与异常值处理", "x": 120, "y": 320, "width": 360, "height": 150 }],
  "edges": [{ "id": "E01", "from": "N1", "to": "N2", "kind": "flow", "label": "标准化数据" }]
}
```

节点支持 `shape: process|decision|pill`、`tag`、`title_wrap`、`detail_wrap`、`fill`、`stroke`、`text_color`。分组支持 `fill`、`stroke`、`text_color`。边支持 `kind: flow|pass|reject|feedback`、`route: [[x,y], ...]`、`label_position: [x,y]`、`color`、`width`、`dash: solid|dashed|dotted`、`start_arrow|end_arrow: none|triangle|dot|diamond` 和 `start_anchor|end_anchor: auto|top|right|bottom|left`。复杂反馈边必须显式提供外侧路由。

## 浏览器内编辑

生成后直接打开 `edit.html`：

1. 单击节点、分组背景框或连线进行选择。
2. 节点可拖动，并可修改标题、说明、标签、填充色、边框色和文字色。
3. 分组背景框可拖动；拖动右下角橙色手柄缩放，也可在面板精确修改 X、Y、宽、高、标题和颜色。
4. 连线可在面板修改起终节点、起终锚点、起止箭头、标签、颜色、线宽与实线/虚线/点线。蓝色控制点调整折线路径；绿色端点拖到其他节点可重新连接。
5. 点击任一颜色按钮，优先从 10 列主题色及其 5 级明暗阶中选择；常见纯色使用“标准色”。当前颜色带橙色选中框。只有前两层没有合适颜色时，点击“更多颜色…”打开系统调色盘。
6. 使用“增加折点”“清除折点”改变箭头姿态；复杂回边仍应保持在节点区外侧。
7. 默认开启智能吸附：节点和分组框接近其他对象的左/中/右、上/中/下或画布中心时自动对齐并显示蓝色参考线；分组缩放也会吸附邻近边。
8. 连线折点接近相邻点的 X 或 Y 时自动变成竖直或水平；拖动时按 `Shift` 强制锁定一个方向。按 `Alt` 临时关闭当前拖动的吸附，或取消勾选“智能吸附与参考线”全局关闭。
9. 使用“撤销”“重做”“重置”管理修改；`Ctrl+Z`、`Ctrl+Y` 也可用。
10. 修改会自动保存在当前浏览器的 `localStorage` 中。需要跨电脑或继续生成时，点击“导出 JSON”保存 `visual-plan-edited.json`。
11. 点击“导出 SVG”或“导出 PNG”获得当前编辑状态；PNG 默认按 2× 画布导出。
12. `index.html?edit=1` 与按 `E` 可进入相同编辑模式。论文正式截图与自动导出仍使用无查询参数的 `index.html`，避免工具栏进入成图。

## PowerPoint 原生可编辑导出

用户要求 PPT、PPTX、PowerPoint 后续编辑或 Office 交付时，从最终确认的
`visual-plan.json` 额外导出单页 `diagram.pptx`。不要把这一请求误判为完整多页演示。

```bash
node exporters/export-paper-visual-pptx.mjs \
  --plan output/visual/visual-plan.json \
  --output output/visual/pptx \
  --node-modules /path/to/node_modules
```

`--node-modules` 必须指向包含 `@oai/artifact-tool` 的 Node 模块目录；如果运行环境
已经能直接解析该包，可以省略。导出目录必须为空。

导出映射：

- 分组背景框：PowerPoint 圆角矩形，标题保留在形状文本中；
- 流程、判断和胶囊节点：原生圆角矩形或菱形，标题与说明保留为可编辑富文本；
- 标签：独立原生文本框；
- 无显式路线的边：直接连接节点的原生连接符；
- 有 `route` 的边：多段原生连接符与不可见路线锚点，保持折线路径、箭头和线型；
- 边标签：带背景填充的原生文本框。

导出器同时生成导出前预览、PPTX 重新导入后的预览、布局 JSON 和验证报告。
只有 `pptx-export-report.json` 为 `PASS`，并且人工确认预览无裁切、重叠和错误换行，
才能交付 PPTX。复杂路线在 PowerPoint 中由多段连接符组成；移动节点时首尾段会跟随，
中间折点可通过路线锚点或连接线端点继续调整。

当前编辑器不提供自由手绘和任意新增/删除节点。需要大幅改变结构时，导出或修改 `visual-plan.json` 后重新生成。

## 命令

```bash
node scripts/generate-paper-visual.mjs --plan visual-plan.json --output output/visual --source input.md --prompt prompt.md
node exporters/export-paper-visual.mjs --html output/visual/index.html --output output/visual/exports --scale 2
node exporters/export-paper-visual-pptx.mjs --plan output/visual/visual-plan.json --output output/visual/pptx --node-modules /path/to/node_modules
```

输出目录非空时生成器与导出器都会拒绝覆盖。重跑时创建新目录，保留历史结果。
