# 论文数据图表工作流

## 路由

用户提供 CSV、JSON、XLSX、XLSM，或要求绘制折线图、柱状图、散点图、相关热力图、收敛曲线、模型指标对比时，执行 `paper-chart`，不要套用流程图节点布局。

## 固定步骤

1. 保存原始数据，不修改或补造数值。
2. 运行字段画像，检查列类型、缺失值、唯一值和数值范围。
3. 明确或自动选择 X、Y、误差与系列列。时间、迭代轮次优先折线图；类别对数值优先柱状图；两个连续数值优先散点图；三个以上数值变量的相关分析使用热力图；分布比较使用箱线图；多维能力比较使用雷达图；均值和离散度同时存在时使用误差棒图。
4. 创建 `chart-plan.json`，`mode` 固定为 `paper-chart`。
5. 生成 `index.html`、`edit.html` 与 `chart.svg`。编辑页支持标题、副标题、首系列主色、网格线、SVG、2× PNG 和 JSON 导出。
6. 检查 SVG 不含 `NaN`、`undefined` 或 `Infinity`，HTML 不依赖外部资源，数据行数与原始输入一致。
7. 用户要求 PowerPoint 时，从同一份 `chart-plan.json` 生成 PPTX：折线、柱状、散点和雷达使用 PowerPoint 原生图表；热力图、箱线图和误差棒使用原生形状组合。
8. 人工复核轴含义、单位、图例、零基线、异常值、灰度打印和论文版心缩放。

## 命令

```bash
node scripts/generate-paper-chart.mjs \
  --input data.csv \
  --output output/paper-chart \
  --chart auto \
  --x iteration \
  --y baseline,improved \
  --title "算法收敛性能对比"

node exporters/export-paper-chart-pptx.mjs \
  --plan output/paper-chart/chart-plan.json \
  --input data.csv \
  --output output/paper-chart/pptx \
  --node-modules /path/to/node_modules
```

Excel 默认读取第一个工作表；使用 `--sheet Sheet2` 指定工作表，使用 `--python /path/to/python` 指定含 `openpyxl` 的 Python。

## 图型

- `line`：趋势、时间序列、收敛曲线；
- `bar`：类别比较、模型指标比较；
- `scatter`：连续变量关系、拟合前的数据分布；
- `heatmap`：数值变量 Pearson 相关矩阵。
- `boxplot`：分组分布、中位数、四分位区间、须线与离群点；
- `radar`：同一量纲下的多维能力比较；
- `errorbar`：均值与指定误差列的对称误差棒。

箱线图使用 1.5×IQR 规则。误差棒列必须由输入数据明确提供，不能根据样本值擅自推算。置信区间、敏感性分析和帕累托前沿仍需根据论文语义提供相应数据。
