# 主题与页面定制

学术模式内置 `academic-light`、`minimal-gray`、`competition-blue`。复制任一主题并只覆盖 `--bg`、`--surface`、`--text-*`、`--accent`、`--border*` 等 token，避免在页面组件中写死颜色。

新增页面类型时，先在 `templates/page-types.json` 描述适用场景和密度，再在 `academic-page-types.mjs` 注册 renderer，同时更新 planner 允许列表、静态校验和示例。不得为单一测试硬编码内容。

中文正文下限 18px，核心资源不依赖网络字体，长标题使用平衡换行。1280×720 下主体区域必须可收缩，不得依赖面向 1080p 的固定最小高度。

