# 中文学术演示固定工作流

## 输入约定

推荐 Markdown 结构：一级标题为演示标题，随后给出“受众”“目的”“建议页数”，二级标题作为内容章节。段落中的数据、方法与结论是唯一事实来源。

```markdown
# 标题

受众：答辩专家
目的：说明问题、方法、证据与结论
建议页数：10

## 研究问题
……
```

## 页面计划

```bash
node planner/plan-deck.mjs --input material.md --output plan.json --theme academic-light
```

计划必须满足：8～12 页；每页一个核心结论；`source` 指向输入章节；三页内避免重复同一模板；流程、数据、对比、时间信息分别选择对应类型。

## 页面生成

```bash
node scripts/generate-academic-deck.mjs --input material.md --output output/deck --theme competition-blue --case-id demo
```

生成目录包含输入、提示词、计划、HTML、本地资源、静态报告、元数据和已知问题。生成器拒绝非空目录，避免覆盖失败证据。

## 浏览器检查

在静态 HTTP 服务下打开 `index.html`，等待转场与检查器完成，然后读取 `#html-ppt-validation`。覆盖 1280×720、1600×900、1920×1080；检查方向键、页数、活动页、控制台、溢出、越界、遮挡、流程节点和外链资源。

## 编辑与回归

工具栏“编辑”启用文本编辑与拖动。修改会自动保存；刷新后应恢复。复制、删除、排序、图片替换和流程节点拖动后都要重跑检查。交付前使用“重置”确认默认版本未受临时测试状态影响。

## 导出

```bash
node exporters/export-deck.mjs --html output/deck/index.html --output output/deck/exports
```

导出器生成 1920×1080 PNG 与完整 PDF。`export-report.json` 检查 PNG 签名/尺寸和 PDF 签名/页数。PDF 必须用 Poppler 渲染后人工检查封面、流程页和总结页。

## 失败处理

失败结果和日志不得删除；新建 run 目录或把旧目录移到带迭代号的归档目录。缺少软件、依赖或权限为 `BLOCKED`；执行失败为 `FAIL`；部分有效为 `PARTIAL`；只有 HTML、浏览器布局、PNG、PDF 全部通过才能为 `PASS`。

