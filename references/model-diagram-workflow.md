# 模型关系图工作流

适用于数学规划、优化模型、预测模型和评价模型的“变量—目标—约束—求解—输出”关系图。

## 输入要求

使用 JSON 提供：

- `variables`：决策变量；
- `parameters`：已知参数与常量；
- `objective`：`sense`、`expression` 或 `latex`、`meaning`；
- `constraints`：名称、`expression` 或 `latex`、含义；
- `solver`：方法名称、步骤或说明；
- `validation`：可行性、稳健性、误差或对比检查；
- `outputs`：路径、参数估计、指标、预测值等实际输出。

不得根据常识补造公式、变量含义或约束。输入不完整时先列出缺失项。

## 生成

```bash
node scripts/generate-model-diagram.mjs --input model.json --output output/model-diagram
```

输出沿用论文单图协议：`visual-plan.json`、`diagram.svg`、`index.html`、`edit.html`、验证报告与已知问题。需要 PowerPoint 时，继续对同一 `visual-plan.json` 使用现有 PPTX 导出器。

```bash
node exporters/export-model-diagram-pptx.mjs \
  --plan output/model-diagram/visual-plan.json \
  --output output/model-diagram/pptx \
  --node-modules /path/to/node_modules
```

## 公式

- 常用 LaTeX 子集在离线环境中转换为可编辑 Unicode 数学文本，包括求和、积分、分式、根式、希腊字母、上下标、不等式和帽号。
- HTML 节点通过 `data-formula-latex` 保留原始 LaTeX；PPTX 使用 Cambria Math 文本，不把公式栅格化为图片。
- 复杂矩阵、多行对齐、自定义宏和特殊数学环境必须在最终排版软件中复核。
