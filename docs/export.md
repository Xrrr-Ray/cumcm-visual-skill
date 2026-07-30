# 导出与验证

```bash
node exporters/export-deck.mjs --html output/deck/index.html --output output/deck/exports
```

可选 `--format png`、`--format pdf` 或 `--chrome <path>`。导出器生成 `png/slide-*.png`、`deck.pdf` 和 `export-report.json`，并检查 PNG 文件头/宽高与 PDF 文件头/页数。

Chrome 的 USB/系统 Web App stderr 若不影响退出码和产物校验，可作为环境噪声记录但不判失败。PDF 需用 `pdftoppm -png exports/deck.pdf tmp/page` 渲染目检，至少检查封面、流程页和总结页。

