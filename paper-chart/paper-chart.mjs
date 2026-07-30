import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const THEMES = {
  "academic-blue": {
    background: "#f7f9fc",
    surface: "#ffffff",
    ink: "#162033",
    muted: "#607086",
    axis: "#73839a",
    grid: "#dce4ef",
    palette: ["#2457a7", "#23856d", "#d07a2d", "#8055a6", "#c4513a", "#3b82a0"]
  },
  "academic-green": {
    background: "#f7faf8",
    surface: "#ffffff",
    ink: "#17312a",
    muted: "#60746c",
    axis: "#71877f",
    grid: "#dbe8e2",
    palette: ["#26735b", "#2f6fa3", "#c07a2a", "#7b5aa6", "#b94b46", "#4b8b70"]
  },
  "minimal-gray": {
    background: "#fafafa",
    surface: "#ffffff",
    ink: "#20242b",
    muted: "#68707c",
    axis: "#7b8490",
    grid: "#e3e6ea",
    palette: ["#374151", "#2563a6", "#52806c", "#a86734", "#86569d", "#a84949"]
  }
};

const CHART_TYPES = new Set(["auto", "line", "bar", "scatter", "heatmap", "boxplot", "radar", "errorbar"]);

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slug(value) {
  return String(value || "series").replace(/[^\p{L}\p{N}_-]+/gu, "-");
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function isDateValue(value) {
  if (value === null || value === undefined || value === "") return false;
  const source = String(value).trim();
  if (!/[-/年月日:]/.test(source)) return false;
  return Number.isFinite(Date.parse(source.replace(/[年月]/g, "-").replace("日", "")));
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const nonEmpty = rows.filter((item) => item.some((cell) => String(cell).trim()));
  if (nonEmpty.length < 2) throw new Error("CSV 至少需要表头和一行数据");
  const headers = nonEmpty[0].map((item, index) => String(item).trim() || `column_${index + 1}`);
  if (new Set(headers).size !== headers.length) throw new Error("CSV 表头存在重复列名");
  return nonEmpty.slice(1).map((cells) => Object.fromEntries(
    headers.map((header, index) => [header, cells[index] === undefined ? "" : cells[index]])
  ));
}

function loadXlsx(inputPath, { python = "python", sheet } = {}) {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const helper = path.resolve(moduleDirectory, "../scripts/extract-paper-chart-data.py");
  const args = [helper, "--input", inputPath];
  if (sheet) args.push("--sheet", sheet);
  const result = spawnSync(python, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, windowsHide: true });
  if (result.error) throw new Error(`无法启动 Python 读取 Excel：${result.error.message}`);
  if (result.status !== 0) throw new Error(`Excel 读取失败：${(result.stderr || result.stdout).trim()}`);
  const payload = JSON.parse(result.stdout);
  return { rows: payload.rows, sheet: payload.sheet, sheets: payload.sheets };
}

export function loadTabularData(inputPath, options = {}) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) throw new Error(`数据文件不存在：${resolved}`);
  const extension = path.extname(resolved).toLowerCase();
  if (extension === ".csv") {
    return { rows: parseCsv(fs.readFileSync(resolved, "utf8")), format: "csv", sheet: null };
  }
  if (extension === ".json") {
    const payload = JSON.parse(fs.readFileSync(resolved, "utf8"));
    const rows = Array.isArray(payload) ? payload : payload?.rows;
    if (!Array.isArray(rows) || !rows.length) throw new Error("JSON 必须是非空对象数组，或包含 rows 数组");
    return { rows, format: "json", sheet: null };
  }
  if ([".xlsx", ".xlsm"].includes(extension)) {
    const result = loadXlsx(resolved, options);
    return { ...result, format: "xlsx" };
  }
  throw new Error(`不支持的数据格式：${extension || "无扩展名"}；支持 CSV、JSON、XLSX、XLSM`);
}

export function profileRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("数据不能为空");
  const names = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  if (!names.length) throw new Error("数据没有可用列");
  const columns = names.map((name) => {
    const values = rows.map((row) => row?.[name]).filter((value) => value !== null && value !== undefined && value !== "");
    const numeric = values.map(number).filter((value) => value !== null);
    const dates = values.filter(isDateValue);
    let type = "category";
    if (values.length && numeric.length / values.length >= 0.85) type = "number";
    else if (values.length && dates.length / values.length >= 0.85) type = "date";
    const result = {
      name,
      type,
      count: values.length,
      missing: rows.length - values.length,
      unique: new Set(values.map(String)).size
    };
    if (type === "number") {
      result.min = Math.min(...numeric);
      result.max = Math.max(...numeric);
      result.mean = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
    }
    return result;
  });
  return { row_count: rows.length, column_count: columns.length, columns };
}

function column(profile, name) {
  return profile.columns.find((item) => item.name === name);
}

function parseNames(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function planPaperChart(rows, options = {}) {
  const profile = profileRows(rows);
  const requestedType = options.chart || "auto";
  if (!CHART_TYPES.has(requestedType)) throw new Error(`不支持的图表类型：${requestedType}`);
  const numeric = profile.columns.filter((item) => item.type === "number");
  const dates = profile.columns.filter((item) => item.type === "date");
  const categories = profile.columns.filter((item) => item.type === "category");
  let x = options.x || dates[0]?.name || categories[0]?.name || profile.columns[0]?.name;
  let y = parseNames(options.y);
  const error = String(options.error || "").trim();
  if (!column(profile, x)) throw new Error(`X 列不存在：${x}`);
  if (!y.length) y = numeric.map((item) => item.name).filter((name) => name !== x).slice(0, 6);
  for (const name of y) {
    if (column(profile, name)?.type !== "number") throw new Error(`Y 列必须为数值列：${name}`);
  }
  if (error && column(profile, error)?.type !== "number") throw new Error(`误差列必须为数值列：${error}`);
  let type = requestedType;
  if (type === "auto") {
    const xColumn = column(profile, x);
    const temporalName = /(time|date|year|month|day|week|iteration|epoch|step|轮次|迭代|时间|日期|年份|月份)/i.test(x);
    if (error) type = "errorbar";
    else if (xColumn?.type === "date" || temporalName) type = "line";
    else if (xColumn?.type === "category") type = "bar";
    else if (xColumn?.type === "number" && y.length) type = "scatter";
    else if (numeric.length >= 3) type = "heatmap";
    else type = "bar";
  }
  if (type === "heatmap" && numeric.length < 2) throw new Error("相关热力图至少需要两个数值列");
  if (type === "boxplot" && column(profile, x)?.type === "number") throw new Error("箱线图 X 列必须为类别列");
  if (type === "boxplot" && y.length !== 1) throw new Error("箱线图需要且仅需要一个数值 Y 列");
  if (type === "radar" && (column(profile, x)?.type === "number" || y.length < 2)) throw new Error("雷达图需要类别 X 列和至少两个数值系列");
  if (type === "errorbar" && (!error || !y.length)) throw new Error("误差棒图需要 Y 列和 --error 数值列");
  if (type !== "heatmap" && !y.length) throw new Error("没有可绘制的数值 Y 列");
  const theme = THEMES[options.theme] ? options.theme : "academic-blue";
  return {
    schema_version: 1,
    mode: "paper-chart",
    type,
    title: options.title || `${y.join("、") || "数值变量"}分析`,
    subtitle: options.subtitle || `样本数 n=${rows.length}`,
    theme,
    canvas: { width: 1600, height: 1000 },
    data: {
      source: options.source || "",
      sheet: options.sheet || "",
      row_count: rows.length,
      columns: profile.columns
    },
    encoding: {
      x,
      y,
      error,
      series: options.series || "",
      x_title: options.xTitle || x,
      y_title: options.yTitle || y.join(" / ")
    },
    options: {
      show_grid: options.showGrid !== false,
      show_legend: options.showLegend !== false,
      y_zero: type === "bar" || type === "radar",
      accent: options.accent || "",
      note: options.note || ""
    }
  };
}

export function validatePaperChartPlan(plan, rows) {
  const errors = [];
  if (plan?.mode !== "paper-chart") errors.push("mode 必须为 paper-chart");
  if (!["line", "bar", "scatter", "heatmap", "boxplot", "radar", "errorbar"].includes(plan?.type)) errors.push("图表类型无效");
  if (!plan?.title) errors.push("缺少标题");
  if (!plan?.canvas || plan.canvas.width !== 1600 || plan.canvas.height !== 1000) errors.push("画布必须为 1600×1000");
  const names = new Set(Object.keys(rows?.[0] || {}));
  if (plan?.type !== "heatmap" && !names.has(plan?.encoding?.x)) errors.push("X 列不存在");
  for (const name of plan?.encoding?.y || []) if (!names.has(name)) errors.push(`Y 列不存在：${name}`);
  if (plan?.type === "errorbar" && !names.has(plan?.encoding?.error)) errors.push("误差列不存在");
  return { status: errors.length ? "FAIL" : "PASS", errors, rows: rows?.length || 0, type: plan?.type || null };
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
    const padding = Math.abs(min || 1) * 0.1;
    min -= padding;
    max += padding;
  }
  const padding = (max - min) * 0.08;
  if (includeZero) {
    return [min === 0 ? 0 : min - padding, max === 0 ? 0 : max + padding];
  }
  return [min - padding, max + padding];
}

function ticks(min, max, count = 5) {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, index) => min + step * index);
}

function fmt(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (absolute >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (absolute > 0 && absolute < 0.01) return value.toExponential(1);
  return Number(value.toFixed(2)).toString();
}

export function quantile(values, probability) {
  const sorted = values.filter(Number.isFinite).slice().sort((left, right) => left - right);
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function boxplotStats(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((left, right) => left - right);
  if (!sorted.length) return null;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inside = sorted.filter((value) => value >= lowerFence && value <= upperFence);
  return {
    min: inside[0] ?? sorted[0],
    q1,
    median,
    q3,
    max: inside.at(-1) ?? sorted.at(-1),
    outliers: sorted.filter((value) => value < lowerFence || value > upperFence),
    count: sorted.length
  };
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

function heatColor(value) {
  const t = Math.max(-1, Math.min(1, value));
  if (t < 0) {
    const ratio = t + 1;
    return `rgb(${Math.round(70 + 185 * ratio)},${Math.round(120 + 135 * ratio)},${Math.round(185 + 70 * ratio)})`;
  }
  return `rgb(${Math.round(255 - 75 * t)},${Math.round(255 - 165 * t)},${Math.round(255 - 160 * t)})`;
}

function renderHeatmap(plan, rows, theme) {
  const names = plan.data.columns.filter((item) => item.type === "number").map((item) => item.name).slice(0, 10);
  const size = Math.min(150, 680 / names.length);
  const matrixSize = size * names.length;
  const left = 800 - matrixSize / 2;
  const top = Math.max(230, 475 - matrixSize / 2);
  const cells = [];
  for (let rowIndex = 0; rowIndex < names.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < names.length; columnIndex += 1) {
      const value = correlation(rows, names[rowIndex], names[columnIndex]);
      cells.push(`<g><rect x="${left + columnIndex * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${heatColor(value)}" stroke="#ffffff" stroke-width="2"/><text x="${left + (columnIndex + 0.5) * size}" y="${top + (rowIndex + 0.56) * size}" text-anchor="middle" font-size="22" font-weight="700" fill="${Math.abs(value) > 0.55 ? "#ffffff" : theme.ink}">${value.toFixed(2)}</text></g>`);
    }
  }
  const labels = names.map((name, index) => `<text x="${left - 18}" y="${top + (index + 0.58) * size}" text-anchor="end" font-size="24" fill="${theme.ink}">${esc(name)}</text><text transform="translate(${left + (index + 0.58) * size},${top - 18}) rotate(-35)" text-anchor="end" font-size="23" fill="${theme.ink}">${esc(name)}</text>`).join("");
  return `<g id="plot">${labels}${cells.join("")}</g><text x="800" y="${top + matrixSize + 72}" text-anchor="middle" font-size="22" fill="${theme.muted}">Pearson 相关系数（−1 至 1）</text>`;
}

function renderBoxplot(plan, rows, theme) {
  const frame = { left: 150, top: 210, width: 1310, height: 620 };
  const xName = plan.encoding.x;
  const yName = plan.encoding.y[0];
  const categories = [...new Set(rows.map((row) => String(row[xName] ?? "")).filter(Boolean))];
  const summaries = categories.map((category) => ({
    category,
    stats: boxplotStats(rows.filter((row) => String(row[xName] ?? "") === category).map((row) => number(row[yName])).filter((value) => value !== null))
  })).filter((item) => item.stats);
  const all = summaries.flatMap((item) => [
    item.stats.min,
    item.stats.q1,
    item.stats.median,
    item.stats.q3,
    item.stats.max,
    ...item.stats.outliers
  ]);
  const [yMin, yMax] = extent(all);
  const yScale = (value) => frame.top + frame.height - (value - yMin) / (yMax - yMin) * frame.height;
  const grid = ticks(yMin, yMax, 5).map((value) => {
    const y = yScale(value);
    return `<g class="grid-line"><line x1="${frame.left}" y1="${y}" x2="${frame.left + frame.width}" y2="${y}" stroke="${theme.grid}" stroke-width="2"/><text x="${frame.left - 22}" y="${y + 8}" text-anchor="end" font-size="22" fill="${theme.muted}">${fmt(value)}</text></g>`;
  }).join("");
  const band = frame.width / Math.max(1, summaries.length);
  const boxWidth = Math.min(120, band * 0.5);
  const marks = summaries.map((item, index) => {
    const cx = frame.left + (index + 0.5) * band;
    const color = index === 0 && plan.options.accent ? plan.options.accent : theme.palette[index % theme.palette.length];
    const { min, q1, median, q3, max, outliers } = item.stats;
    return `<g data-series="${index}">
      <line x1="${cx}" y1="${yScale(max)}" x2="${cx}" y2="${yScale(min)}" stroke="${color}" stroke-width="4"/>
      <line x1="${cx - boxWidth * 0.28}" y1="${yScale(max)}" x2="${cx + boxWidth * 0.28}" y2="${yScale(max)}" stroke="${color}" stroke-width="4"/>
      <line x1="${cx - boxWidth * 0.28}" y1="${yScale(min)}" x2="${cx + boxWidth * 0.28}" y2="${yScale(min)}" stroke="${color}" stroke-width="4"/>
      <rect x="${cx - boxWidth / 2}" y="${yScale(q3)}" width="${boxWidth}" height="${Math.max(2, yScale(q1) - yScale(q3))}" rx="7" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="4"/>
      <line x1="${cx - boxWidth / 2}" y1="${yScale(median)}" x2="${cx + boxWidth / 2}" y2="${yScale(median)}" stroke="${color}" stroke-width="5"/>
      ${outliers.map((value) => `<circle cx="${cx}" cy="${yScale(value)}" r="6" fill="${theme.background}" stroke="${color}" stroke-width="3"/>`).join("")}
      <text x="${cx}" y="${frame.top + frame.height + 44}" text-anchor="middle" font-size="22" fill="${theme.muted}">${esc(item.category)}</text>
    </g>`;
  }).join("");
  return `<g id="plot">${plan.options.show_grid ? grid : ""}<line x1="${frame.left}" y1="${frame.top + frame.height}" x2="${frame.left + frame.width}" y2="${frame.top + frame.height}" stroke="${theme.axis}" stroke-width="3"/><line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.top + frame.height}" stroke="${theme.axis}" stroke-width="3"/>${marks}</g><text x="${frame.left + frame.width / 2}" y="930" text-anchor="middle" font-size="25" font-weight="700" fill="${theme.ink}">${esc(plan.encoding.x_title)}</text><text transform="translate(52,${frame.top + frame.height / 2}) rotate(-90)" text-anchor="middle" font-size="25" font-weight="700" fill="${theme.ink}">${esc(plan.encoding.y_title)}</text>`;
}

function renderRadar(plan, rows, theme) {
  const labels = rows.map((row) => String(row[plan.encoding.x] ?? "")).filter(Boolean);
  const series = plan.encoding.y.map((name) => ({
    name,
    values: rows.map((row) => number(row[name]) ?? 0)
  }));
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values)) * 1.08;
  const cx = 800;
  const cy = 520;
  const radius = 300;
  const count = Math.max(3, labels.length);
  const point = (index, value = maxValue) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    const r = radius * Math.max(0, value) / maxValue;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };
  const rings = [0.2, 0.4, 0.6, 0.8, 1].map((ratio) => `<polygon points="${labels.map((_, index) => {
    const p = point(index, maxValue * ratio);
    return `${p.x},${p.y}`;
  }).join(" ")}" fill="none" stroke="${theme.grid}" stroke-width="${ratio === 1 ? 3 : 2}"/>`).join("");
  const axes = labels.map((label, index) => {
    const edge = point(index);
    const labelPoint = point(index, maxValue * 1.14);
    const anchor = Math.abs(labelPoint.x - cx) < 20 ? "middle" : (labelPoint.x < cx ? "end" : "start");
    return `<line x1="${cx}" y1="${cy}" x2="${edge.x}" y2="${edge.y}" stroke="${theme.grid}" stroke-width="2"/><text x="${labelPoint.x}" y="${labelPoint.y + 7}" text-anchor="${anchor}" font-size="22" font-weight="700" fill="${theme.ink}">${esc(label)}</text>`;
  }).join("");
  const polygons = series.map((item, seriesIndex) => {
    const color = seriesIndex === 0 && plan.options.accent ? plan.options.accent : theme.palette[seriesIndex % theme.palette.length];
    const points = item.values.map((value, index) => point(index, value));
    return `<g data-series="${seriesIndex}"><polygon points="${points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${color}" stroke="#fff" stroke-width="2"/>`).join("")}</g>`;
  }).join("");
  const legend = plan.options.show_legend && series.length > 1
    ? `<g id="legend">${series.map((item, index) => `<g transform="translate(${1135},${245 + index * 42})"><rect x="0" y="-15" width="28" height="9" rx="4" fill="${theme.palette[index % theme.palette.length]}"/><text x="42" y="-5" font-size="22" fill="${theme.ink}">${esc(item.name)}</text></g>`).join("")}</g>`
    : "";
  return `<g id="plot">${rings}${axes}${polygons}</g>${legend}<text x="800" y="920" text-anchor="middle" font-size="22" fill="${theme.muted}">量表上限 ${fmt(maxValue)}</text>`;
}

function renderCartesian(plan, rows, theme) {
  const frame = { left: 150, top: 205, width: 1310, height: 625 };
  const xName = plan.encoding.x;
  const yNames = plan.encoding.y;
  const xColumn = plan.data.columns.find((item) => item.name === xName);
  const seriesColumn = plan.encoding.series;
  const series = [];
  if (seriesColumn && yNames.length) {
    const groups = [...new Set(rows.map((row) => String(row[seriesColumn] ?? "")))].slice(0, 8);
    for (const group of groups) {
      series.push({ name: group, key: yNames[0], rows: rows.filter((row) => String(row[seriesColumn] ?? "") === group) });
    }
  } else {
    yNames.forEach((name) => series.push({ name, key: name, rows }));
  }
  const yValues = series.flatMap((item) => item.rows.flatMap((row) => {
    const value = number(row[item.key]);
    if (value === null) return [];
    if (plan.type !== "errorbar") return [value];
    const error = Math.abs(number(row[plan.encoding.error]) ?? 0);
    return [value - error, value + error];
  }));
  const [yMin, yMax] = extent(yValues, plan.options.y_zero);
  const yScale = (value) => frame.top + frame.height - (value - yMin) / (yMax - yMin) * frame.height;
  const categorical = xColumn?.type !== "number";
  const categories = categorical ? [...new Set(rows.map((row) => String(row[xName] ?? "")))] : [];
  const xValues = categorical ? [] : rows.map((row) => number(row[xName])).filter((value) => value !== null);
  const [xMin, xMax] = categorical ? [0, Math.max(1, categories.length - 1)] : extent(xValues);
  const xScale = (value) => {
    if (categorical) {
      const index = categories.indexOf(String(value));
      return frame.left + (index + 0.5) / Math.max(1, categories.length) * frame.width;
    }
    return frame.left + (number(value) - xMin) / (xMax - xMin) * frame.width;
  };
  const grid = ticks(yMin, yMax, 5).map((value) => {
    const y = yScale(value);
    return `<g class="grid-line"><line x1="${frame.left}" y1="${y}" x2="${frame.left + frame.width}" y2="${y}" stroke="${theme.grid}" stroke-width="2"/><text x="${frame.left - 22}" y="${y + 8}" text-anchor="end" font-size="22" fill="${theme.muted}">${fmt(value)}</text></g>`;
  }).join("");
  const numericTickValues = [...new Set(xValues)].sort((left, right) => left - right);
  const xTicks = categorical
    ? categories.map((value, index) => {
      const step = Math.ceil(categories.length / 12);
      if (index % step) return "";
      return `<text x="${xScale(value)}" y="${frame.top + frame.height + 42}" text-anchor="middle" font-size="21" fill="${theme.muted}">${esc(value.length > 10 ? `${value.slice(0, 9)}…` : value)}</text>`;
    }).join("")
    : (numericTickValues.length <= 12 ? numericTickValues : ticks(xMin, xMax, 6))
      .map((value) => `<text x="${xScale(value)}" y="${frame.top + frame.height + 42}" text-anchor="middle" font-size="21" fill="${theme.muted}">${fmt(value)}</text>`)
      .join("");
  const marks = [];
  if (plan.type === "bar") {
    const band = frame.width / Math.max(1, categories.length);
    const barWidth = Math.min(72, band * 0.72 / Math.max(1, series.length));
    series.forEach((item, seriesIndex) => {
      const color = seriesIndex === 0 && plan.options.accent ? plan.options.accent : theme.palette[seriesIndex % theme.palette.length];
      categories.forEach((category, categoryIndex) => {
        const row = item.rows.find((entry) => String(entry[xName] ?? "") === category);
        const value = number(row?.[item.key]);
        if (value === null) return;
        const x = frame.left + categoryIndex * band + band / 2 - (series.length * barWidth) / 2 + seriesIndex * barWidth;
        const y = yScale(Math.max(0, value));
        const zero = yScale(0);
        marks.push(`<rect data-series="${seriesIndex}" x="${x}" y="${Math.min(y, zero)}" width="${Math.max(3, barWidth - 4)}" height="${Math.max(1, Math.abs(zero - y))}" rx="5" fill="${color}" opacity="0.92"/>`);
      });
    });
  } else {
    series.forEach((item, seriesIndex) => {
      const color = seriesIndex === 0 && plan.options.accent ? plan.options.accent : theme.palette[seriesIndex % theme.palette.length];
      const points = item.rows.map((row) => {
        const xValue = row[xName];
        const yValue = number(row[item.key]);
        if (yValue === null || (!categorical && number(xValue) === null)) return null;
        return { x: xScale(xValue), y: yScale(yValue), value: yValue, row };
      }).filter(Boolean);
      if (["line", "errorbar"].includes(plan.type) && points.length > 1) {
        marks.push(`<path data-series="${seriesIndex}" d="M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`);
      }
      if (plan.type === "errorbar") {
        marks.push(points.map((point) => {
          const error = Math.abs(number(point.row[plan.encoding.error]) ?? 0);
          const upper = yScale(point.value + error);
          const lower = yScale(point.value - error);
          return `<g data-series="${seriesIndex}"><line x1="${point.x}" y1="${upper}" x2="${point.x}" y2="${lower}" stroke="${color}" stroke-width="3"/><line x1="${point.x - 10}" y1="${upper}" x2="${point.x + 10}" y2="${upper}" stroke="${color}" stroke-width="3"/><line x1="${point.x - 10}" y1="${lower}" x2="${point.x + 10}" y2="${lower}" stroke="${color}" stroke-width="3"/><circle cx="${point.x}" cy="${point.y}" r="6" fill="${color}" stroke="#ffffff" stroke-width="2"/></g>`;
        }).join(""));
      } else {
        marks.push(points.map((point) => `<circle data-series="${seriesIndex}" cx="${point.x}" cy="${point.y}" r="${plan.type === "scatter" ? 7 : 5}" fill="${color}" stroke="#ffffff" stroke-width="2"/>`).join(""));
      }
    });
  }
  const legend = plan.options.show_legend && series.length > 1
    ? `<g id="legend">${series.map((item, index) => `<g transform="translate(${1040 + (index % 2) * 210},${135 + Math.floor(index / 2) * 34})"><rect x="0" y="-15" width="26" height="8" rx="4" fill="${theme.palette[index % theme.palette.length]}"/><text x="38" y="-5" font-size="21" fill="${theme.ink}">${esc(item.name)}</text></g>`).join("")}</g>`
    : "";
  return `<g id="plot">${plan.options.show_grid ? grid : ""}<line x1="${frame.left}" y1="${frame.top + frame.height}" x2="${frame.left + frame.width}" y2="${frame.top + frame.height}" stroke="${theme.axis}" stroke-width="3"/><line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.top + frame.height}" stroke="${theme.axis}" stroke-width="3"/>${xTicks}${marks.join("")}</g>${legend}<text x="${frame.left + frame.width / 2}" y="930" text-anchor="middle" font-size="25" font-weight="700" fill="${theme.ink}">${esc(plan.encoding.x_title)}</text><text transform="translate(52,${frame.top + frame.height / 2}) rotate(-90)" text-anchor="middle" font-size="25" font-weight="700" fill="${theme.ink}">${esc(plan.encoding.y_title)}</text>`;
}

export function renderPaperChartSvg(plan, rows) {
  const validation = validatePaperChartPlan(plan, rows);
  if (validation.status !== "PASS") throw new Error(`图表规划无效：${validation.errors.join("；")}`);
  const theme = THEMES[plan.theme] || THEMES["academic-blue"];
  const plot = plan.type === "heatmap"
    ? renderHeatmap(plan, rows, theme)
    : plan.type === "boxplot"
      ? renderBoxplot(plan, rows, theme)
      : plan.type === "radar"
        ? renderRadar(plan, rows, theme)
        : renderCartesian(plan, rows, theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="chart-title chart-subtitle"><rect width="1600" height="1000" fill="${theme.background}"/><rect x="55" y="45" width="8" height="92" rx="4" fill="${plan.options.accent || theme.palette[0]}"/><text id="chart-title" x="90" y="92" font-family="Microsoft YaHei,Arial,sans-serif" font-size="48" font-weight="800" fill="${theme.ink}">${esc(plan.title)}</text><text id="chart-subtitle" x="92" y="132" font-family="Microsoft YaHei,Arial,sans-serif" font-size="24" fill="${theme.muted}">${esc(plan.subtitle)}</text><g font-family="Microsoft YaHei,Arial,sans-serif">${plot}</g>${plan.options.note ? `<text x="1540" y="970" text-anchor="end" font-family="Microsoft YaHei,Arial,sans-serif" font-size="19" fill="${theme.muted}">${esc(plan.options.note)}</text>` : ""}</svg>\n`;
}

function editorScript(plan) {
  return `<script>
const state=${JSON.stringify(plan)};
const svg=document.querySelector("svg");
const titleInput=document.querySelector("#edit-title");
const subtitleInput=document.querySelector("#edit-subtitle");
const accentInput=document.querySelector("#edit-accent");
const gridInput=document.querySelector("#edit-grid");
const saved=JSON.parse(localStorage.getItem("paper-chart-edit")||"null");
if(saved){Object.assign(state,saved);titleInput.value=saved.title||state.title;subtitleInput.value=saved.subtitle||state.subtitle;accentInput.value=saved.options?.accent||accentInput.value;gridInput.checked=saved.options?.show_grid!==false;}
function apply(){
 state.title=titleInput.value.trim()||state.title;
 state.subtitle=subtitleInput.value.trim();
 state.options.accent=accentInput.value;
 state.options.show_grid=gridInput.checked;
 document.querySelector("#chart-title").textContent=state.title;
 document.querySelector("#chart-subtitle").textContent=state.subtitle;
 document.querySelectorAll('[data-series="0"]').forEach(el=>{if(el.tagName==="path")el.setAttribute("stroke",state.options.accent);else el.setAttribute("fill",state.options.accent);});
 document.querySelectorAll(".grid-line").forEach(el=>el.style.display=state.options.show_grid?"":"none");
 localStorage.setItem("paper-chart-edit",JSON.stringify(state));
}
document.querySelectorAll("input").forEach(input=>input.addEventListener("input",apply));
document.querySelector("#reset-chart").addEventListener("click",()=>{localStorage.removeItem("paper-chart-edit");location.reload();});
function download(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
document.querySelector("#export-json").addEventListener("click",()=>download("chart-plan-edited.json",new Blob([JSON.stringify(state,null,2)],{type:"application/json"})));
document.querySelector("#export-svg").addEventListener("click",()=>download("chart.svg",new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml"})));
document.querySelector("#export-png").addEventListener("click",()=>{const image=new Image();const source=new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml"});image.onload=()=>{const canvas=document.createElement("canvas");canvas.width=3200;canvas.height=2000;canvas.getContext("2d").drawImage(image,0,0,3200,2000);canvas.toBlob(blob=>download("chart.png",blob),"image/png");URL.revokeObjectURL(image.src);};image.src=URL.createObjectURL(source);});
apply();
</script>`;
}

export function renderPaperChartHtml(plan, rows, { edit = false } = {}) {
  const svg = renderPaperChartSvg(plan, rows);
  const theme = THEMES[plan.theme] || THEMES["academic-blue"];
  const editor = edit ? `<aside><h2>论文图表编辑</h2><label>标题<input id="edit-title" value="${esc(plan.title)}"></label><label>副标题<input id="edit-subtitle" value="${esc(plan.subtitle)}"></label><label>主色<input id="edit-accent" type="color" value="${esc(plan.options.accent || theme.palette[0])}"></label><label class="check"><input id="edit-grid" type="checkbox" ${plan.options.show_grid ? "checked" : ""}>显示网格线</label><div class="buttons"><button id="export-svg">导出 SVG</button><button id="export-png">导出 2× PNG</button><button id="export-json">导出 JSON</button><button id="reset-chart">重置</button></div></aside>` : "";
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(plan.title)}</title><style>*{box-sizing:border-box}body{margin:0;background:#20242b;font-family:"Microsoft YaHei",Arial,sans-serif;display:grid;grid-template-columns:${edit ? "1fr 330px" : "1fr"};min-height:100vh}.canvas{display:grid;place-items:center;min-width:0}.canvas svg{display:block;width:100%;height:auto;max-height:100vh}aside{background:#fff;padding:24px;border-left:1px solid #d7dee8;color:#162033}aside h2{font-size:22px;margin:0 0 22px}label{display:grid;gap:7px;margin:0 0 18px;font-size:14px;font-weight:700}input{width:100%;padding:10px;border:1px solid #acb8c8;border-radius:8px;font:inherit}.check{display:flex;align-items:center;gap:9px}.check input{width:auto}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px}button{border:0;border-radius:8px;padding:11px;background:#2457a7;color:#fff;font-weight:700;cursor:pointer}button:last-child{background:#64748b}</style></head><body><main class="canvas">${svg}</main>${editor}${edit ? editorScript(plan) : ""}</body></html>\n`;
}

export function resolveModulePath(packageName, roots = []) {
  for (const root of roots) {
    try {
      const resolver = createRequire(path.join(path.resolve(root), "__paper_chart_resolver.cjs"));
      return resolver.resolve(packageName);
    } catch {
      // Continue through explicitly supplied roots.
    }
  }
  return null;
}
