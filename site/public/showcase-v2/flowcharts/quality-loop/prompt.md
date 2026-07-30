# `html-ppt` 国赛论文单页反馈决策回路评测

使用真实的 `$html-ppt` Skill 完成本案例。

必须先读取：

- 完整任务：`evals/paper-visuals/cases/paper-visual-feedback-loop-003.md`
- 结构真值：`evals/paper-visuals/specs/paper-visual-feedback-loop-003.json`
- 参考图：`fixtures/paper-visuals/references/24B决策树.png`
- 参考图：`fixtures/paper-visuals/references/思路图 (5).png`

参考图只用于吸收阶段分区、决策分支、跨区反馈路径和留白等构图规律；不得嵌入、描摹参考图，不得复制其中的文字、配色细节或像素布局。

需求已经确认：

- 用途与受众：国赛论文中的单页质量检测与闭环处置流程，面向评阅教师；
- 输出：恰好一页 16:9 HTML，不生成封面、目录、过渡页或收尾页；
- 主题：使用 Skill 现有的 `academic-paper`；
- 模板起点：必须从 Skill 现有的 `templates/single-page/flow-diagram.html` 开始，复用其设计系统、本地 runtime、键盘运行能力和隐藏 speaker notes；不得从零另建一套模板；
- 布局：主流程从左至右，两条反馈线从节点区外侧绕回，N3 和 N5 视觉上必须是决策节点；
- 页面标题和每个节点主标题在 1920×1080 视口中不得低于 32 px，节点说明和每个边标签不得低于 28 px；
- 页面使用白色或近白色背景及克制学术配色。

结构和标记要求：

1. 严格采用 JSON 中的 3 个分组、10 个节点与 13 条有向边，不得增加、删除、反转或改写节点、边、边类型或边标签。
2. 每个节点主容器必须写正确的 `data-node-id`、`data-group`。节点内部承载主标题的可见 HTML 元素必须写 `data-node-title="<JSON label>"`，承载说明的可见 HTML 元素必须写 `data-node-detail="<JSON detail>"`；每个节点各恰好一个标题标记和一个说明标记。
3. 每个分组可见容器必须写正确的 `data-group-id`。
4. 每条边必须写唯一的 `data-edge-id`，以及正确的 `data-edge-from`、`data-edge-to`、`data-edge-kind`；规范中带标签的边还必须在连接元素上写相同文字的 `data-edge-label`。
5. 每个有标签的边必须将可见标签写成 HTML，并在标签元素上写 `data-edge-label-for`，其值为对应边 ID。
6. SVG 只能画线、箭头和几何图形；SVG 不得承载任何可见文字。
7. `pass` 使用绿色实线并显示文字，`reject` 使用橙红实线并显示文字，`feedback` 使用青色或蓝色虚线并显示文字；不得只靠颜色表达分支含义。
8. N8 → N5 与 N10 → N2 两条回边必须真实可见，不得穿过节点或文字。

论文截图模式：

- 不得显示页码、翻页提示、键盘提示、导航按钮、进度条或网页控制栏。
- 键盘导航和其他运行能力可以保留，但其可见控件必须隐藏。
- 不使用照片、emoji、渐变、重阴影或装饰性插画。

输出要求：

1. 只将原始输出写入 `outputs/ppt/paper-visual-feedback-loop-003/html-ppt-run-003/deck/`。
2. 入口必须是 `outputs/ppt/paper-visual-feedback-loop-003/html-ppt-run-003/deck/index.html`。
3. 可以同时生成该目录下运行必需的 `style.css`，不得在其他位置写输出。
4. 保留 Skill 要求的本地 runtime 引用和隐藏 notes；notes 不得显示在图中。
5. 不得修改 `.agents/skills/ppt-target/`、`.agents/skills/flowchart-target/` 或 `vendor/`。
6. 不安装依赖，不调用图片生成模型或外部图片服务，不生成 PPTX，不提交 Git commit。
7. 不要提出澄清问题；读取上述文件后按已确认要求执行。
8. 完成后只简要说明实际创建的文件和自检结果。
