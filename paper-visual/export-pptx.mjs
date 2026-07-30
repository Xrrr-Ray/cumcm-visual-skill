import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const THEMES = {
  "academic-blue": {
    background: "#f7f9fc",
    surface: "#ffffff",
    ink: "#162033",
    muted: "#5d6a7d",
    accent: "#2457a7",
    accentSoft: "#eaf1fb",
    border: "#9aabc2",
    groupFill: "#f2f6fb",
    flow: "#334155",
    pass: "#25845f",
    reject: "#c4513a",
    feedback: "#286bb5"
  },
  "academic-green": {
    background: "#f7faf8",
    surface: "#ffffff",
    ink: "#17312a",
    muted: "#60746c",
    accent: "#26735b",
    accentSoft: "#e6f2ed",
    border: "#9ab8ad",
    groupFill: "#eff6f3",
    flow: "#2f4a41",
    pass: "#26735b",
    reject: "#b94b46",
    feedback: "#2f6fa3"
  },
  "minimal-gray": {
    background: "#fafafa",
    surface: "#ffffff",
    ink: "#20242b",
    muted: "#68707c",
    accent: "#374151",
    accentSoft: "#eef0f2",
    border: "#a7adb5",
    groupFill: "#f4f5f6",
    flow: "#4b5563",
    pass: "#52806c",
    reject: "#a84949",
    feedback: "#2563a6"
  },
  monochrome: {
    background: "#ffffff",
    surface: "#ffffff",
    ink: "#111827",
    muted: "#4b5563",
    accent: "#111827",
    accentSoft: "#f3f4f6",
    border: "#6b7280",
    groupFill: "#f8fafc",
    flow: "#111827",
    pass: "#111827",
    reject: "#111827",
    feedback: "#111827"
  }
};

function ensureHex(value, fallback) {
  const color = String(value || fallback || "#000000").trim();
  return color.startsWith("#") ? color : fallback;
}

function wrapLines(value, max = 11, maxLines = 3) {
  const source = String(value ?? "").trim();
  if (!source) return [];
  const result = [];
  for (const part of source.split(/\n|<br\s*\/?>/i).map((item) => item.trim()).filter(Boolean)) {
    const chars = Array.from(part);
    for (let index = 0; index < chars.length; index += max) {
      result.push(chars.slice(index, index + max).join(""));
    }
  }
  return result.slice(0, maxLines);
}

function center(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function boundary(node, toward) {
  const origin = center(node);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  if (!dx && !dy) return origin;
  const sx = dx ? node.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const sy = dy ? node.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(sx, sy);
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function anchorPoint(node, side, toward) {
  const origin = center(node);
  if (side === "top") return { x: origin.x, y: node.y };
  if (side === "right") return { x: node.x + node.width, y: origin.y };
  if (side === "bottom") return { x: origin.x, y: node.y + node.height };
  if (side === "left") return { x: node.x, y: origin.y };
  return boundary(node, toward);
}

function edgePoints(edge, nodesById) {
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  const route = Array.isArray(edge.route)
    ? edge.route.map(([x, y]) => ({ x: Number(x), y: Number(y) }))
    : [];
  const start = anchorPoint(from, edge.start_anchor || "auto", route[0] || center(to));
  const end = anchorPoint(to, edge.end_anchor || "auto", route.at(-1) || center(from));
  return [start, ...route, end];
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

function pptxSignature(buffer) {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function lineEnd(value) {
  if (!value || value === "none") return { type: "none" };
  if (value === "dot") return { type: "oval", width: "med", length: "med" };
  if (value === "diamond") return { type: "diamond", width: "med", length: "med" };
  return { type: "triangle", width: "med", length: "med" };
}

function lineStyle(edge, theme, scale) {
  const kind = edge.kind || "flow";
  const fallback = theme[kind] || theme.flow;
  const style = edge.dash === "dotted"
    ? "dotted"
    : (edge.dash === "dashed" || kind === "feedback" ? "dashed" : "solid");
  const defaultWidth = ["pass", "reject", "feedback"].includes(kind) ? 3.5 : 3;
  return {
    style,
    fill: ensureHex(edge.color, fallback),
    width: Math.max(1.25, Number(edge.width || defaultWidth) * scale)
  };
}

function paragraph(run, {
  fontSize,
  color,
  bold = false,
  typeface = "Microsoft YaHei",
  spaceBefore = 0,
  spaceAfter = 0
}) {
  return {
    runs: [{
      run,
      textStyle: {
        fontSize: `${fontSize}px`,
        color,
        bold,
        typeface
      }
    }],
    spaceBefore: Math.round(spaceBefore),
    spaceAfter: Math.round(spaceAfter)
  };
}

function addTextbox(slide, {
  name,
  position,
  text,
  fontSize,
  color,
  bold = false,
  alignment = "left",
  verticalAlignment = "middle",
  typeface = "Microsoft YaHei",
  fill = "none",
  lineFill = "none",
  insets = { top: 0, right: 0, bottom: 0, left: 0 }
}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill,
    line: { style: "solid", fill: lineFill, width: 0 }
  });
  shape.text = String(text ?? "");
  shape.text.style = {
    fontSize,
    color,
    bold,
    alignment,
    verticalAlignment,
    typeface,
    autoFit: "shrinkText",
    wrap: "square",
    insets
  };
  return shape;
}

function validatePlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object") errors.push("plan 必须是对象");
  if (plan?.mode !== "paper-visual") errors.push("mode 必须为 paper-visual");
  if (!plan?.title) errors.push("缺少 title");
  for (const key of ["groups", "nodes", "edges"]) {
    if (!Array.isArray(plan?.[key])) errors.push(`${key} 必须是数组`);
  }
  if (errors.length) throw new Error(`规划校验失败：${errors.join("；")}`);
  const ids = new Set(plan.nodes.map((node) => node.id));
  for (const node of plan.nodes) {
    if (!node.id) errors.push("节点缺少 id");
    for (const key of ["x", "y", "width", "height"]) {
      if (!Number.isFinite(node[key])) errors.push(`节点 ${node.id} 的 ${key} 无效`);
    }
  }
  for (const edge of plan.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      errors.push(`边 ${edge.id || ""} 引用了未知节点：${edge.from}->${edge.to}`);
    }
  }
  if (errors.length) throw new Error(`规划校验失败：${errors.join("；")}`);
}

export async function loadArtifactTool({ nodeModules = [] } = {}) {
  try {
    return { api: await import("@oai/artifact-tool"), resolvedFrom: "package-resolution" };
  } catch (firstError) {
    const candidates = (Array.isArray(nodeModules) ? nodeModules : [nodeModules]).filter(Boolean);
    for (const candidate of candidates) {
      try {
        const base = path.resolve(candidate);
        const resolver = createRequire(path.join(base, "__html_ppt_artifact_resolver.cjs"));
        const entry = resolver.resolve("@oai/artifact-tool");
        return { api: await import(pathToFileURL(entry).href), resolvedFrom: entry };
      } catch {
        // Try the next explicitly supplied module directory.
      }
    }
    throw new Error(
      `未找到 @oai/artifact-tool。请使用 --node-modules 指向包含该包的 node_modules。原始错误：${firstError.message}`
    );
  }
}

export function buildPaperVisualPresentation(plan, artifactTool) {
  validatePlan(plan);
  const { Presentation } = artifactTool;
  const sourceWidth = Number(plan.canvas?.width || 1920);
  const sourceHeight = Number(plan.canvas?.height || 1080);
  const slideWidth = 1280;
  const slideHeight = 720;
  const scaleX = slideWidth / sourceWidth;
  const scaleY = slideHeight / sourceHeight;
  const scale = Math.min(scaleX, scaleY);
  const px = (value) => Number(value || 0) * scaleX;
  const py = (value) => Number(value || 0) * scaleY;
  const position = (item) => ({
    left: px(item.x),
    top: py(item.y),
    width: px(item.width),
    height: py(item.height)
  });
  const theme = {
    ...THEMES["academic-blue"],
    ...(THEMES[plan.theme] || {}),
    ...(plan.colors || {})
  };
  const presentation = Presentation.create({
    slideSize: { width: slideWidth, height: slideHeight }
  });
  const slide = presentation.slides.add();
  slide.background.fill = ensureHex(theme.background, "#ffffff");

  slide.shapes.add({
    geometry: "rect",
    name: "title-rule",
    position: { left: px(72), top: py(66), width: Math.max(3, px(6)), height: py(82) },
    fill: ensureHex(theme.accent, "#2457a7"),
    line: { style: "solid", fill: "none", width: 0 }
  });
  addTextbox(slide, {
    name: "visual-title",
    position: { left: px(102), top: py(62), width: px(1710), height: py(54) },
    text: plan.title,
    fontSize: 46 * scale,
    color: ensureHex(theme.ink, "#162033"),
    bold: true,
    typeface: "Microsoft YaHei"
  });
  addTextbox(slide, {
    name: "visual-subtitle",
    position: { left: px(104), top: py(112), width: px(1708), height: py(42) },
    text: plan.subtitle || "",
    fontSize: 24 * scale,
    color: ensureHex(theme.muted, "#5d6a7d")
  });

  for (const group of plan.groups) {
    const groupShape = slide.shapes.add({
      geometry: "roundRect",
      name: `group-${group.id}`,
      position: position(group),
      fill: ensureHex(group.fill, theme.groupFill),
      line: {
        style: "solid",
        fill: ensureHex(group.stroke, theme.border),
        width: Math.max(1, Number(group.border_width || 1.5) * scale)
      },
      borderRadius: Math.max(5, Number(group.radius || 18) * scale)
    });
    groupShape.text = [{
      runs: [
        {
          run: String(group.index || group.id),
          textStyle: {
            fontSize: `${22 * scale}px`,
            color: ensureHex(group.index_color, theme.accent),
            bold: true,
            typeface: "Microsoft YaHei"
          }
        },
        {
          run: `  ${group.label || ""}`,
          textStyle: {
            fontSize: `${27 * scale}px`,
            color: ensureHex(group.text_color, theme.ink),
            bold: true,
            typeface: "Microsoft YaHei"
          }
        }
      ]
    }];
    groupShape.text.style = {
      alignment: "left",
      verticalAlignment: "top",
      autoFit: "shrinkText",
      wrap: "none",
      insets: {
        top: py(15),
        right: px(18),
        bottom: py(10),
        left: px(22)
      }
    };
  }

  const nodeShapes = new Map();
  const tagShapes = [];
  for (const node of plan.nodes) {
    const kind = node.shape || "process";
    const fill = ensureHex(
      node.fill,
      kind === "pill" ? theme.accent : (kind === "decision" ? theme.accentSoft : theme.surface)
    );
    const stroke = ensureHex(
      node.stroke,
      kind === "pill" || kind === "decision" ? theme.accent : theme.border
    );
    const shapeConfig = {
      geometry: kind === "decision" ? "diamond" : "roundRect",
      name: `node-${node.id}`,
      position: position(node),
      fill,
      line: {
        style: "solid",
        fill: stroke,
        width: Math.max(1.25, Number(node.border_width || (kind === "decision" ? 2.5 : 2)) * scale)
      }
    };
    if (kind !== "decision") {
      shapeConfig.borderRadius = kind === "pill"
        ? Math.max(8, py(node.height) / 2)
        : Math.max(5, Number(node.radius || 14) * scale);
    }
    const shape = slide.shapes.add(shapeConfig);
    const textColor = ensureHex(node.text_color, kind === "pill" ? "#ffffff" : theme.ink);
    const detailColor = ensureHex(node.detail_color || node.text_color, kind === "pill" ? "#ffffff" : theme.muted);
    const titleLines = wrapLines(node.label, node.title_wrap || 10);
    const detailLines = wrapLines(node.detail, node.detail_wrap || 14, node.detail_max_lines || 3);
    shape.text = [
      ...titleLines.map((line, index) => paragraph(line, {
        fontSize: 32 * scale,
        color: textColor,
        bold: true,
        spaceAfter: index === titleLines.length - 1 && detailLines.length ? 5 * scale : 0
      })),
      ...detailLines.map((line) => paragraph(line, {
        fontSize: (node.math ? 24 : 28) * scale,
        color: detailColor,
        typeface: node.math ? "Cambria Math" : "Microsoft YaHei"
      }))
    ];
    shape.text.style = {
      alignment: "center",
      verticalAlignment: "middle",
      autoFit: kind === "decision" ? "none" : "shrinkText",
      wrap: "square",
      lineSpacing: 0.96,
      insets: {
        top: py(kind === "decision" ? 6 : 13),
        right: px(kind === "decision" ? 20 : 18),
        bottom: py(kind === "decision" ? 6 : 13),
        left: px(kind === "decision" ? 20 : 18)
      }
    };
    nodeShapes.set(node.id, shape);
    if (node.tag) {
      tagShapes.push(addTextbox(slide, {
        name: `node-${node.id}-tag`,
        position: {
          left: px(node.x + node.width - 125),
          top: py(node.y + 8),
          width: px(105),
          height: py(30)
        },
        text: node.tag,
        fontSize: 20 * scale,
        color: ensureHex(node.tag_color || node.text_color, kind === "pill" ? "#ffffff" : theme.accent),
        bold: true,
        alignment: "right"
      }));
    }
  }

  const nodesById = new Map(plan.nodes.map((node) => [node.id, node]));
  const edgeRecords = [];
  const allConnectors = [];
  const edgeLabelShapes = [];
  for (const edge of plan.edges) {
    const routePoints = edgePoints(edge, nodesById);
    const waypoints = routePoints.slice(1, -1).map((point, index) => slide.shapes.add({
      geometry: "ellipse",
      name: `edge-${edge.id || `${edge.from}-${edge.to}`}-waypoint-${index + 1}`,
      position: {
        left: px(point.x) - 1,
        top: py(point.y) - 1,
        width: 2,
        height: 2
      },
      fill: "none",
      line: { style: "solid", fill: "none", width: 0 }
    }));
    const endpoints = [nodeShapes.get(edge.from), ...waypoints, nodeShapes.get(edge.to)];
    const connectors = [];
    for (let index = 0; index < endpoints.length - 1; index += 1) {
      const options = {
        kind: "straight",
        line: lineStyle(edge, theme, scale),
        cap: "round",
        join: "round"
      };
      if (index === 0 && edge.start_anchor && edge.start_anchor !== "auto") {
        options.fromSide = edge.start_anchor;
      }
      if (index === endpoints.length - 2 && edge.end_anchor && edge.end_anchor !== "auto") {
        options.toSide = edge.end_anchor;
      }
      if (index === 0 && edge.start_arrow && edge.start_arrow !== "none") {
        options.head = lineEnd(edge.start_arrow);
      }
      const endArrow = edge.end_arrow || "triangle";
      if (index === endpoints.length - 2 && endArrow !== "none") {
        options.tail = lineEnd(endArrow);
      }
      const connector = slide.shapes.connect(endpoints[index], endpoints[index + 1], options);
      connectors.push(connector);
      allConnectors.push(connector);
    }
    if (edge.label) {
      const labelPoint = edge.label_position
        ? { x: edge.label_position[0], y: edge.label_position[1] }
        : routePoints[Math.floor((routePoints.length - 1) / 2)];
      const labelWidth = Math.max(84, Array.from(String(edge.label)).length * 30);
      edgeLabelShapes.push(addTextbox(slide, {
        name: `edge-${edge.id || `${edge.from}-${edge.to}`}-label`,
        position: {
          left: px(labelPoint.x - labelWidth / 2),
          top: py(labelPoint.y - 23),
          width: px(labelWidth),
          height: py(42)
        },
        text: edge.label,
        fontSize: 28 * scale,
        color: ensureHex(edge.label_color, theme.ink),
        bold: true,
        alignment: "center",
        fill: ensureHex(theme.background, "#ffffff")
      }));
    }
    edgeRecords.push({
      id: edge.id || `${edge.from}->${edge.to}`,
      segments: connectors.length,
      waypoints: waypoints.length
    });
  }
  for (const connector of allConnectors) connector.bringToFront();
  for (const shape of nodeShapes.values()) shape.bringToFront();
  for (const shape of tagShapes) shape.bringToFront();
  for (const shape of edgeLabelShapes) shape.bringToFront();

  return {
    presentation,
    slide,
    metadata: {
      slideSize: { width: slideWidth, height: slideHeight },
      sourceCanvas: { width: sourceWidth, height: sourceHeight },
      scale: { x: scaleX, y: scaleY },
      groups: plan.groups.length,
      nodes: plan.nodes.length,
      edges: plan.edges.length,
      edgeRecords
    }
  };
}

export async function exportPaperVisualPptx(plan, {
  outputDir,
  nodeModules = [],
  refuseOverwrite = true
} = {}) {
  if (!outputDir) throw new Error("缺少 outputDir");
  const resolvedOutput = path.resolve(outputDir);
  try {
    const entries = await fs.readdir(resolvedOutput);
    if (refuseOverwrite && entries.length) {
      throw new Error(`导出目录非空，拒绝覆盖：${resolvedOutput}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.mkdir(resolvedOutput, { recursive: true });
  const startedAt = new Date();
  const { api, resolvedFrom } = await loadArtifactTool({ nodeModules });
  const built = buildPaperVisualPresentation(plan, api);
  const {
    PresentationFile,
    FileBlob
  } = api;
  const pptxPath = path.join(resolvedOutput, "diagram.pptx");
  const previewPath = path.join(resolvedOutput, "diagram-preview.png");
  const reimportPath = path.join(resolvedOutput, "diagram-reimport.png");
  const layoutPath = path.join(resolvedOutput, "diagram-layout.json");
  const reportPath = path.join(resolvedOutput, "pptx-export-report.json");

  const previewBlob = await built.presentation.export({
    slide: built.slide,
    format: "png",
    scale: 1
  });
  const previewBuffer = Buffer.from(await previewBlob.arrayBuffer());
  await fs.writeFile(previewPath, previewBuffer);
  const layoutBlob = await built.slide.export({ format: "layout" });
  await fs.writeFile(layoutPath, await layoutBlob.text(), "utf8");
  const pptx = await PresentationFile.exportPptx(built.presentation);
  await pptx.save(pptxPath);

  const pptxBuffer = await fs.readFile(pptxPath);
  const imported = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  const importedSlide = imported.slides.items[0];
  const reimportBlob = await imported.export({
    slide: importedSlide,
    format: "png",
    scale: 1
  });
  const reimportBuffer = Buffer.from(await reimportBlob.arrayBuffer());
  await fs.writeFile(reimportPath, reimportBuffer);
  const snapshot = await imported.inspect({
    kind: "slide,textbox,shape",
    maxChars: 200000
  });
  const previewInfo = parsePng(previewBuffer);
  const reimportInfo = parsePng(reimportBuffer);
  const searchableSnapshot = snapshot.ndjson
    .replace(/\\[nrt]/g, "")
    .replace(/\s/g, "");
  const missingLabels = plan.nodes
    .map((node) => String(node.label || "").trim())
    .filter((label) => label && !searchableSnapshot.includes(label.replace(/\s/g, "")));
  const checks = [
    { id: "pptx_zip_signature", pass: pptxSignature(pptxBuffer), bytes: pptxBuffer.length },
    {
      id: "preview_png",
      pass: previewInfo.signature && previewInfo.width === 1280 && previewInfo.height === 720,
      ...previewInfo
    },
    {
      id: "reimport_png",
      pass: reimportInfo.signature && reimportInfo.width === 1280 && reimportInfo.height === 720,
      ...reimportInfo
    },
    {
      id: "reimport_title",
      pass: searchableSnapshot.includes(String(plan.title).replace(/\s/g, ""))
    },
    { id: "reimport_node_labels", pass: missingLabels.length === 0, missing: missingLabels },
    { id: "single_slide", pass: imported.slides.items.length === 1, actual: imported.slides.items.length }
  ];
  const report = {
    schema_version: 1,
    status: checks.every((check) => check.pass) ? "PASS" : "FAIL",
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    artifact_tool: resolvedFrom,
    plan: {
      title: plan.title,
      type: plan.type,
      theme: plan.theme || "academic-blue"
    },
    metadata: built.metadata,
    outputs: {
      pptx: pptxPath,
      preview: previewPath,
      reimport_preview: reimportPath,
      layout: layoutPath
    },
    checks
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { ...report, report: reportPath };
}
