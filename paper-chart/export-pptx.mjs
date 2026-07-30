import fs from "node:fs/promises";
import path from "node:path";
import { loadArtifactTool } from "../paper-visual/export-pptx.mjs";
import { boxplotStats } from "./paper-chart.mjs";

const THEMES = {
  "academic-blue": { background: "#f7f9fc", ink: "#162033", muted: "#607086", axis: "#73839a", grid: "#dce4ef", palette: ["#2457a7", "#23856d", "#d07a2d", "#8055a6", "#c4513a", "#3b82a0"] },
  "academic-green": { background: "#f7faf8", ink: "#17312a", muted: "#60746c", axis: "#71877f", grid: "#dbe8e2", palette: ["#26735b", "#2f6fa3", "#c07a2a", "#7b5aa6", "#b94b46", "#4b8b70"] },
  "minimal-gray": { background: "#fafafa", ink: "#20242b", muted: "#68707c", axis: "#7b8490", grid: "#e3e6ea", palette: ["#374151", "#2563a6", "#52806c", "#a86734", "#86569d", "#a84949"] }
};

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePng(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    signature: buffer.length >= 24 && buffer.subarray(0, 8).equals(signature),
    width: buffer.length >= 24 ? buffer.readUInt32BE(16) : null,
    height: buffer.length >= 24 ? buffer.readUInt32BE(20) : null,
    bytes: buffer.length
  };
}

function addText(slide, { name, text, left, top, width, height, fontSize, color, bold = false, alignment = "left", typeface = "Microsoft YaHei" }) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 }
  });
  shape.text = String(text ?? "");
  shape.text.style = {
    fontSize,
    color,
    bold,
    alignment,
    verticalAlignment: "middle",
    typeface,
    autoFit: "shrinkText",
    wrap: "square",
    insets: { top: 0, right: 2, bottom: 0, left: 2 }
  };
  return shape;
}

function alignedSeries(plan, rows, theme) {
  const x = plan.encoding.x;
  const categories = [...new Set(rows.map((row) => String(row[x] ?? "")))];
  if (plan.encoding.series && plan.encoding.y.length) {
    const groups = [...new Set(rows.map((row) => String(row[plan.encoding.series] ?? "")))].slice(0, 8);
    return {
      categories,
      series: groups.map((group, index) => ({
        name: group,
        values: categories.map((category) => number(rows.find((row) => String(row[x] ?? "") === category && String(row[plan.encoding.series] ?? "") === group)?.[plan.encoding.y[0]]) ?? 0),
        fill: theme.palette[index % theme.palette.length],
        line: { style: "solid", fill: theme.palette[index % theme.palette.length], width: 3 },
        marker: { symbol: "circle", size: 7 }
      }))
    };
  }
  return {
    categories,
    series: plan.encoding.y.map((name, index) => ({
      name,
      values: rows.map((row) => number(row[name]) ?? 0),
      fill: index === 0 && plan.options.accent ? plan.options.accent : theme.palette[index % theme.palette.length],
      line: { style: "solid", fill: index === 0 && plan.options.accent ? plan.options.accent : theme.palette[index % theme.palette.length], width: 3 },
      marker: { symbol: "circle", size: 7 }
    }))
  };
}

function addNativeChart(slide, plan, rows, theme) {
  const position = { left: 82, top: 145, width: 1118, height: 500 };
  if (plan.type === "scatter") {
    const x = plan.encoding.x;
    const series = plan.encoding.y.map((name, index) => ({
      name,
      xValues: rows.map((row) => number(row[x])).filter((value) => value !== null),
      values: rows.filter((row) => number(row[x]) !== null).map((row) => number(row[name]) ?? 0),
      line: { style: "solid", fill: theme.palette[index % theme.palette.length], width: 1 },
      marker: { symbol: "circle", size: 8 }
    }));
    return slide.charts.add("scatter", {
      position,
      series,
      scatterOptions: { style: "marker", varyColors: false },
      hasLegend: series.length > 1,
      legend: { position: "top", overlay: false, textStyle: { fill: theme.ink, fontSize: 14 } },
      xAxis: { title: plan.encoding.x_title, textStyle: { fill: theme.muted, fontSize: 13 }, majorGridlines: { style: "solid", fill: theme.grid, width: 1 } },
      yAxis: { title: plan.encoding.y_title, textStyle: { fill: theme.muted, fontSize: 13 }, majorGridlines: { style: "solid", fill: theme.grid, width: 1 } },
      chartFill: theme.background,
      chartLine: { style: "solid", fill: "none", width: 0 },
      plotAreaFill: "none"
    });
  }
  const { categories, series } = alignedSeries(plan, rows, theme);
  const chartType = plan.type === "bar" ? "bar" : plan.type === "radar" ? "radar" : "line";
  return slide.charts.add(chartType, {
    position,
    categories,
    series,
    hasLegend: series.length > 1,
    legend: { position: "top", overlay: false, textStyle: { fill: theme.ink, fontSize: 14 } },
    barOptions: plan.type === "bar" ? { direction: "column", grouping: "clustered", gapWidth: 60 } : undefined,
    lineOptions: plan.type === "line" ? { grouping: "standard", smooth: false, varyColors: false } : undefined,
    xAxis: { title: plan.encoding.x_title, textStyle: { fill: theme.muted, fontSize: 13 }, line: { style: "solid", fill: theme.axis, width: 1 } },
    yAxis: { title: plan.encoding.y_title, min: plan.options.y_zero ? 0 : undefined, textStyle: { fill: theme.muted, fontSize: 13 }, majorGridlines: { style: "solid", fill: theme.grid, width: 1 } },
    chartFill: theme.background,
    chartLine: { style: "solid", fill: "none", width: 0 },
    plotAreaFill: "none"
  });
}

function extent(values, includeZero = false) {
  const finite = values.filter(Number.isFinite);
  let min = finite.length ? Math.min(...finite) : 0;
  let max = finite.length ? Math.max(...finite) : 1;
  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  return [includeZero && min === 0 ? 0 : min - pad, max + pad];
}

function heatColor(value) {
  const t = Math.max(-1, Math.min(1, value));
  if (t < 0) {
    const ratio = t + 1;
    return `#${[70 + 185 * ratio, 120 + 135 * ratio, 185 + 70 * ratio].map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`;
  }
  return `#${[255 - 75 * t, 255 - 165 * t, 255 - 160 * t].map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`;
}

function correlation(rows, left, right) {
  const pairs = rows.map((row) => [number(row[left]), number(row[right])]).filter(([a, b]) => a !== null && b !== null);
  if (pairs.length < 2) return 0;
  const meanA = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const meanB = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;
  for (const [a, b] of pairs) {
    numerator += (a - meanA) * (b - meanB);
    denominatorA += (a - meanA) ** 2;
    denominatorB += (b - meanB) ** 2;
  }
  return denominatorA && denominatorB ? numerator / Math.sqrt(denominatorA * denominatorB) : 0;
}

function addHeatmapShapes(slide, plan, rows, theme) {
  const names = plan.data.columns.filter((column) => column.type === "number").map((column) => column.name).slice(0, 10);
  const size = Math.min(62, 440 / names.length);
  const matrix = size * names.length;
  const left = 640 - matrix / 2;
  const top = 180;
  names.forEach((name, index) => {
    addText(slide, { name: `heat-row-${index}`, text: name, left: left - 150, top: top + index * size + size * 0.2, width: 138, height: size * 0.6, fontSize: 14, color: theme.ink, alignment: "right" });
    addText(slide, { name: `heat-col-${index}`, text: name, left: left + index * size - 18, top: top - 45, width: size + 36, height: 40, fontSize: 13, color: theme.ink, alignment: "center" });
  });
  for (let rowIndex = 0; rowIndex < names.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < names.length; columnIndex += 1) {
      const value = correlation(rows, names[rowIndex], names[columnIndex]);
      const cell = slide.shapes.add({
        geometry: "rect",
        name: `heat-cell-${rowIndex}-${columnIndex}`,
        position: { left: left + columnIndex * size, top: top + rowIndex * size, width: size, height: size },
        fill: heatColor(value),
        line: { style: "solid", fill: "#ffffff", width: 1 }
      });
      cell.text = value.toFixed(2);
      cell.text.style = { fontSize: 14, bold: true, color: Math.abs(value) > 0.55 ? "#ffffff" : theme.ink, alignment: "center", verticalAlignment: "middle", typeface: "Microsoft YaHei" };
    }
  }
}

function addErrorbarShapes(slide, plan, rows, theme) {
  const frame = { left: 120, top: 170, width: 1030, height: 430 };
  const x = plan.encoding.x;
  const y = plan.encoding.y[0];
  const error = plan.encoding.error;
  const categories = [...new Set(rows.map((row) => String(row[x] ?? "")))];
  const values = rows.flatMap((row) => {
    const value = number(row[y]);
    const spread = Math.abs(number(row[error]) ?? 0);
    return value === null ? [] : [value - spread, value + spread];
  });
  const [min, max] = extent(values);
  const yScale = (value) => frame.top + frame.height - (value - min) / (max - min) * frame.height;
  for (let index = 0; index <= 5; index += 1) {
    const value = min + (max - min) * index / 5;
    const yPos = yScale(value);
    slide.shapes.add({ geometry: "line", position: { left: frame.left, top: yPos, width: frame.width, height: 0 }, line: { style: "solid", fill: theme.grid, width: 1 } });
    addText(slide, { name: `error-y-${index}`, text: Number(value.toFixed(2)).toString(), left: 48, top: yPos - 10, width: 62, height: 20, fontSize: 12, color: theme.muted, alignment: "right" });
  }
  const points = rows.map((row, index) => {
    const value = number(row[y]);
    const spread = Math.abs(number(row[error]) ?? 0);
    const cx = frame.left + (index + 0.5) / rows.length * frame.width;
    return { cx, cy: yScale(value), upper: yScale(value + spread), lower: yScale(value - spread), label: String(row[x] ?? "") };
  });
  const color = plan.options.accent || theme.palette[0];
  const pointShapes = points.map((point, index) => slide.shapes.add({
    geometry: "ellipse",
    name: `error-point-${index}`,
    position: { left: point.cx - 5, top: point.cy - 5, width: 10, height: 10 },
    fill: color,
    line: { style: "solid", fill: "#ffffff", width: 1 }
  }));
  for (let index = 0; index < pointShapes.length - 1; index += 1) {
    slide.shapes.connect(pointShapes[index], pointShapes[index + 1], {
      kind: "straight",
      line: { style: "solid", fill: color, width: 3 },
      cap: "round",
      join: "round"
    });
  }
  points.forEach((point, index) => {
    slide.shapes.add({ geometry: "line", position: { left: point.cx, top: point.upper, width: 0, height: point.lower - point.upper }, line: { style: "solid", fill: color, width: 2 } });
    slide.shapes.add({ geometry: "line", position: { left: point.cx - 8, top: point.upper, width: 16, height: 0 }, line: { style: "solid", fill: color, width: 2 } });
    slide.shapes.add({ geometry: "line", position: { left: point.cx - 8, top: point.lower, width: 16, height: 0 }, line: { style: "solid", fill: color, width: 2 } });
    pointShapes[index].bringToFront();
    addText(slide, { name: `error-x-${index}`, text: point.label, left: point.cx - 50, top: frame.top + frame.height + 10, width: 100, height: 24, fontSize: 12, color: theme.muted, alignment: "center" });
  });
  addText(slide, { name: "error-x-title", text: plan.encoding.x_title, left: frame.left, top: 640, width: frame.width, height: 28, fontSize: 16, color: theme.ink, bold: true, alignment: "center" });
}

function addBoxplotShapes(slide, plan, rows, theme) {
  const frame = { left: 130, top: 170, width: 1020, height: 430 };
  const x = plan.encoding.x;
  const y = plan.encoding.y[0];
  const categories = [...new Set(rows.map((row) => String(row[x] ?? "")).filter(Boolean))];
  const summaries = categories.map((category) => ({
    category,
    stats: boxplotStats(
      rows
        .filter((row) => String(row[x] ?? "") === category)
        .map((row) => number(row[y]))
        .filter((value) => value !== null)
    )
  })).filter((item) => item.stats);
  const values = summaries.flatMap(({ stats }) => [stats.min, stats.q1, stats.median, stats.q3, stats.max, ...stats.outliers]);
  const [min, max] = extent(values);
  const yScale = (value) => frame.top + frame.height - (value - min) / (max - min) * frame.height;
  for (let index = 0; index <= 5; index += 1) {
    const value = min + (max - min) * index / 5;
    const yPos = yScale(value);
    slide.shapes.add({
      geometry: "line",
      name: `box-grid-${index}`,
      position: { left: frame.left, top: yPos, width: frame.width, height: 0 },
      line: { style: "solid", fill: theme.grid, width: 1 }
    });
    addText(slide, {
      name: `box-y-${index}`,
      text: Number(value.toFixed(3)).toString(),
      left: 48,
      top: yPos - 10,
      width: 70,
      height: 20,
      fontSize: 12,
      color: theme.muted,
      alignment: "right"
    });
  }
  const band = frame.width / Math.max(1, summaries.length);
  const boxWidth = Math.min(120, band * 0.42);
  summaries.forEach(({ category, stats }, index) => {
    const cx = frame.left + (index + 0.5) * band;
    const color = index === 0 && plan.options.accent ? plan.options.accent : theme.palette[index % theme.palette.length];
    slide.shapes.add({
      geometry: "line",
      name: `box-whisker-${index}`,
      position: { left: cx, top: yScale(stats.max), width: 0, height: yScale(stats.min) - yScale(stats.max) },
      line: { style: "solid", fill: color, width: 2 }
    });
    for (const [suffix, value] of [["max", stats.max], ["min", stats.min]]) {
      slide.shapes.add({
        geometry: "line",
        name: `box-cap-${suffix}-${index}`,
        position: { left: cx - boxWidth * 0.28, top: yScale(value), width: boxWidth * 0.56, height: 0 },
        line: { style: "solid", fill: color, width: 2 }
      });
    }
    slide.shapes.add({
      geometry: "rect",
      name: `box-iqr-${index}`,
      position: {
        left: cx - boxWidth / 2,
        top: yScale(stats.q3),
        width: boxWidth,
        height: Math.max(2, yScale(stats.q1) - yScale(stats.q3))
      },
      fill: { color, transparency: 72 },
      line: { style: "solid", fill: color, width: 2 }
    });
    slide.shapes.add({
      geometry: "line",
      name: `box-median-${index}`,
      position: { left: cx - boxWidth / 2, top: yScale(stats.median), width: boxWidth, height: 0 },
      line: { style: "solid", fill: color, width: 3 }
    });
    stats.outliers.forEach((value, outlierIndex) => {
      slide.shapes.add({
        geometry: "ellipse",
        name: `box-outlier-${index}-${outlierIndex}`,
        position: { left: cx - 4, top: yScale(value) - 4, width: 8, height: 8 },
        fill: theme.background,
        line: { style: "solid", fill: color, width: 2 }
      });
    });
    addText(slide, {
      name: `box-x-${index}`,
      text: category,
      left: cx - band * 0.42,
      top: frame.top + frame.height + 12,
      width: band * 0.84,
      height: 28,
      fontSize: 13,
      color: theme.muted,
      alignment: "center"
    });
  });
  addText(slide, {
    name: "box-x-title",
    text: plan.encoding.x_title,
    left: frame.left,
    top: 645,
    width: frame.width,
    height: 26,
    fontSize: 16,
    color: theme.ink,
    bold: true,
    alignment: "center"
  });
}

export function buildPaperChartPresentation(plan, rows, artifactTool) {
  const { Presentation } = artifactTool;
  const theme = THEMES[plan.theme] || THEMES["academic-blue"];
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  const slide = presentation.slides.add();
  slide.background.fill = theme.background;
  slide.shapes.add({ geometry: "rect", name: "title-rule", position: { left: 44, top: 36, width: 6, height: 76 }, fill: plan.options.accent || theme.palette[0], line: { style: "solid", fill: "none", width: 0 } });
  addText(slide, { name: "chart-title", text: plan.title, left: 70, top: 34, width: 1120, height: 52, fontSize: 38, color: theme.ink, bold: true, typeface: "Microsoft YaHei" });
  addText(slide, { name: "chart-subtitle", text: plan.subtitle || "", left: 72, top: 82, width: 1120, height: 30, fontSize: 18, color: theme.muted });
  let nativeMode;
  if (plan.type === "heatmap") {
    addHeatmapShapes(slide, plan, rows, theme);
    nativeMode = "editable-shapes";
  } else if (plan.type === "boxplot") {
    addBoxplotShapes(slide, plan, rows, theme);
    nativeMode = "editable-shapes";
  } else if (plan.type === "errorbar") {
    addErrorbarShapes(slide, plan, rows, theme);
    nativeMode = "editable-shapes";
  } else {
    addNativeChart(slide, plan, rows, theme);
    nativeMode = "native-chart";
  }
  return { presentation, slide, metadata: { nativeMode, type: plan.type, rows: rows.length, slideSize: { width: 1280, height: 720 } } };
}

export async function exportPaperChartPptx(plan, rows, { outputDir, nodeModules = [], refuseOverwrite = true } = {}) {
  if (!outputDir) throw new Error("缺少 outputDir");
  const resolvedOutput = path.resolve(outputDir);
  try {
    const entries = await fs.readdir(resolvedOutput);
    if (refuseOverwrite && entries.length) throw new Error(`导出目录非空，拒绝覆盖：${resolvedOutput}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.mkdir(resolvedOutput, { recursive: true });
  const startedAt = new Date();
  const { api, resolvedFrom } = await loadArtifactTool({ nodeModules });
  const built = buildPaperChartPresentation(plan, rows, api);
  const { PresentationFile, FileBlob } = api;
  const pptxPath = path.join(resolvedOutput, "chart.pptx");
  const previewPath = path.join(resolvedOutput, "chart-preview.png");
  const reimportPath = path.join(resolvedOutput, "chart-reimport.png");
  const layoutPath = path.join(resolvedOutput, "chart-layout.json");
  const previewBlob = await built.presentation.export({ slide: built.slide, format: "png", scale: 1 });
  const previewBuffer = Buffer.from(await previewBlob.arrayBuffer());
  await fs.writeFile(previewPath, previewBuffer);
  const layoutBlob = await built.slide.export({ format: "layout" });
  await fs.writeFile(layoutPath, await layoutBlob.text(), "utf8");
  const pptx = await PresentationFile.exportPptx(built.presentation);
  await pptx.save(pptxPath);
  const pptxBuffer = await fs.readFile(pptxPath);
  const imported = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  const importedSlide = imported.slides.items[0];
  const reimportBlob = await imported.export({ slide: importedSlide, format: "png", scale: 1 });
  const reimportBuffer = Buffer.from(await reimportBlob.arrayBuffer());
  await fs.writeFile(reimportPath, reimportBuffer);
  const snapshot = await imported.inspect({ kind: "slide,textbox,shape,chart", maxChars: 200000 });
  const previewInfo = parsePng(previewBuffer);
  const reimportInfo = parsePng(reimportBuffer);
  const snapshotText = snapshot.ndjson.replace(/\\[nrt]/g, "").replace(/\s/g, "");
  const checks = [
    { id: "pptx_zip_signature", pass: pptxBuffer[0] === 0x50 && pptxBuffer[1] === 0x4b, bytes: pptxBuffer.length },
    { id: "preview_png", pass: previewInfo.signature && previewInfo.width === 1280 && previewInfo.height === 720, ...previewInfo },
    { id: "reimport_png", pass: reimportInfo.signature && reimportInfo.width === 1280 && reimportInfo.height === 720, ...reimportInfo },
    { id: "reimport_title", pass: snapshotText.includes(String(plan.title).replace(/\s/g, "")) },
    { id: "single_slide", pass: imported.slides.items.length === 1, actual: imported.slides.items.length },
    { id: "native_editability", pass: built.metadata.nativeMode === "native-chart" ? snapshot.ndjson.includes("\"kind\":\"chart\"") : snapshot.ndjson.includes("\"kind\":\"shape\""), mode: built.metadata.nativeMode }
  ];
  const report = {
    schema_version: 1,
    status: checks.every((check) => check.pass) ? "PASS" : "FAIL",
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    artifact_tool: resolvedFrom,
    plan: { title: plan.title, type: plan.type, theme: plan.theme },
    metadata: built.metadata,
    outputs: { pptx: pptxPath, preview: previewPath, reimport_preview: reimportPath, layout: layoutPath },
    checks
  };
  const reportPath = path.join(resolvedOutput, "pptx-export-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { ...report, report: reportPath };
}
