import {
  advancedBrowserScript,
  advancedEditorCss,
  advancedEditorMarkup,
  editorOverlayMarkup
} from "./editor-runtime.mjs";

const THEMES = {
  "academic-blue": {
    background: "#f7f9fc", surface: "#ffffff", ink: "#162033", muted: "#5d6a7d",
    accent: "#2457a7", accentSoft: "#eaf1fb", border: "#9aabc2", groupFill: "#f2f6fb",
    flow: "#334155", pass: "#25845f", reject: "#c4513a", feedback: "#286bb5"
  },
  "academic-green": {
    background: "#f7faf8", surface: "#ffffff", ink: "#17312a", muted: "#60746c",
    accent: "#26735b", accentSoft: "#e6f2ed", border: "#9ab8ad", groupFill: "#eff6f3",
    flow: "#2f4a41", pass: "#26735b", reject: "#b94b46", feedback: "#2f6fa3"
  },
  "minimal-gray": {
    background: "#fafafa", surface: "#ffffff", ink: "#20242b", muted: "#68707c",
    accent: "#374151", accentSoft: "#eef0f2", border: "#a7adb5", groupFill: "#f4f5f6",
    flow: "#4b5563", pass: "#52806c", reject: "#a84949", feedback: "#2563a6"
  },
  monochrome: {
    background: "#ffffff", surface: "#ffffff", ink: "#111827", muted: "#4b5563",
    accent: "#111827", accentSoft: "#f3f4f6", border: "#6b7280", groupFill: "#f8fafc",
    flow: "#111827", pass: "#111827", reject: "#111827", feedback: "#111827"
  }
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[char]);
}

function lines(value, max = 11, maxLines = 3) {
  const source = String(value ?? "").trim();
  if (!source) return [];
  const explicit = source.split(/\n|<br\s*\/?>/i).map((item) => item.trim()).filter(Boolean);
  const result = [];
  for (const part of explicit) {
    const chars = Array.from(part);
    for (let index = 0; index < chars.length; index += max) {
      result.push(chars.slice(index, index + max).join(""));
    }
  }
  return result.slice(0, maxLines);
}

function boundary(node, toward) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const sx = dx ? node.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const sy = dy ? node.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(sx, sy);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function anchorPoint(node, side, toward) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  if (side === "top") return { x: cx, y: node.y };
  if (side === "right") return { x: node.x + node.width, y: cy };
  if (side === "bottom") return { x: cx, y: node.y + node.height };
  if (side === "left") return { x: node.x, y: cy };
  return boundary(node, toward);
}

function edgeGeometry(edge, nodesById) {
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  const mids = Array.isArray(edge.route) ? edge.route.map(([x, y]) => ({ x, y })) : [];
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const start = anchorPoint(from, edge.start_anchor || "auto", mids[0] || toCenter);
  const end = anchorPoint(to, edge.end_anchor || "auto", mids.at(-1) || fromCenter);
  const points = [start, ...mids, end];
  const d = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const labelPoint = edge.label_position
    ? { x: edge.label_position[0], y: edge.label_position[1] }
    : points[Math.floor((points.length - 1) / 2)];
  return { d, labelPoint };
}

function renderText(textLines, x, y, className, lineHeight, attrs = "") {
  return `<text class="${className}" x="${x}" y="${y}" ${attrs}>${textLines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${esc(line)}</tspan>`).join("")}</text>`;
}

function nodeMarkup(node) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const titleWrap = node.title_wrap || 10;
  const detailWrap = node.detail_wrap || 14;
  const titleLines = lines(node.label, titleWrap);
  const detailLines = lines(node.detail, detailWrap, node.detail_max_lines || 3);
  const titleHeight = titleLines.length * 38;
  const detailHeight = detailLines.length * 31;
  const gap = detailLines.length ? 13 : 0;
  const total = titleHeight + gap + detailHeight;
  const titleY = cy - total / 2 + 29;
  const detailY = titleY + titleHeight + gap - 2;
  let shape;
  if (node.shape === "decision") {
    const points = `${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}`;
    shape = `<polygon class="node-shape decision" points="${points}"></polygon>`;
  } else if (node.shape === "pill") {
    shape = `<rect class="node-shape pill" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.height / 2}"></rect>`;
  } else {
    shape = `<rect class="node-shape" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.radius || 14}"></rect>`;
  }
  const shapeStyle = [
    node.fill ? `fill:${esc(node.fill)}` : "",
    node.stroke ? `stroke:${esc(node.stroke)}` : "",
    Number.isFinite(node.border_width) ? `stroke-width:${node.border_width}` : ""
  ].filter(Boolean).join(";");
  const titleStyle = node.text_color ? ` style="fill:${esc(node.text_color)}"` : "";
  const detailStyle = (node.detail_color || node.text_color) ? ` style="fill:${esc(node.detail_color || node.text_color)}"` : "";
  const tagStyle = (node.tag_color || node.text_color) ? ` style="fill:${esc(node.tag_color || node.text_color)}"` : "";
  if (shapeStyle) shape = shape.replace("></", ` style="${shapeStyle}"></`);
  return `<g class="visual-node node-${esc(node.shape || "process")}${node.math ? " node-math" : ""}" data-node-id="${esc(node.id)}" data-group="${esc(node.group)}" data-x="${node.x}" data-y="${node.y}" data-original-x="${node.x}" data-original-y="${node.y}" data-width="${node.width}" data-height="${node.height}" data-title-wrap="${titleWrap}" data-detail-wrap="${detailWrap}"${node.formula_latex ? ` data-formula-latex="${esc(node.formula_latex)}"` : ""} tabindex="0">
    <desc>${esc([node.label, node.detail].filter(Boolean).join("；"))}</desc>${shape}
    <text class="node-tag" x="${node.x + node.width - 18}" y="${node.y + 25}" text-anchor="end"${tagStyle}>${esc(node.tag || "")}</text>
    ${renderText(titleLines, cx, titleY, "node-title", 38, `text-anchor="middle" data-node-title="${esc(node.label)}"${titleStyle}`)}
    ${renderText(detailLines, cx, detailY, "node-detail", 31, `text-anchor="middle" data-node-detail="${esc(node.detail || "")}"${detailStyle}`)}
  </g>`;
}

function groupMarkup(group) {
  const rectStyle = [
    group.fill ? `fill:${esc(group.fill)}` : "",
    group.stroke ? `stroke:${esc(group.stroke)}` : "",
    Number.isFinite(group.border_width) ? `stroke-width:${group.border_width}` : ""
  ].filter(Boolean).join(";");
  const textStyle = group.text_color ? ` style="fill:${esc(group.text_color)}"` : "";
  return `<g class="visual-group" data-group-id="${esc(group.id)}" data-x="${group.x}" data-y="${group.y}" data-width="${group.width}" data-height="${group.height}">
    <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="${group.radius || 18}"${rectStyle ? ` style="${rectStyle}"` : ""}></rect>
    <text class="group-label" x="${group.x + 22}" y="${group.y + 37}"${textStyle}><tspan class="group-index">${esc(group.index || group.id)}</tspan><tspan class="group-name" dx="13">${esc(group.label)}</tspan></text>
  </g>`;
}

function edgeMarkup(edge, geometry) {
  const kind = edge.kind || "flow";
  const edgeId = edge.id || `${edge.from}->${edge.to}`;
  const labelWidth = Math.max(84, String(edge.label || "").length * 30);
  const lineStyle = [
    edge.color ? `stroke:${esc(edge.color)}` : "",
    Number.isFinite(edge.width) ? `stroke-width:${edge.width}` : "",
    edge.dash === "dashed" ? "stroke-dasharray:12 8" : "",
    edge.dash === "dotted" ? "stroke-dasharray:3 8" : ""
  ].filter(Boolean).join(";");
  const startArrow = edge.start_arrow || "none";
  const endArrow = edge.end_arrow || "triangle";
  const label = edge.label ? `<g class="edge-label-wrap"><rect x="${geometry.labelPoint.x - labelWidth / 2}" y="${geometry.labelPoint.y - 23}" width="${labelWidth}" height="42" rx="8"></rect><text class="edge-label" x="${geometry.labelPoint.x}" y="${geometry.labelPoint.y + 8}" text-anchor="middle" data-edge-label-for="${esc(edgeId)}">${esc(edge.label)}</text></g>` : "";
  return `<g class="visual-edge edge-${esc(kind)}" data-edge-wrapper="${esc(edgeId)}">
    <path d="${geometry.d}" data-edge-id="${esc(edgeId)}" data-edge-from="${esc(edge.from)}" data-edge-to="${esc(edge.to)}" data-edge-kind="${esc(kind)}" data-edge-route="${esc(JSON.stringify(edge.route || []))}" data-start-anchor="${esc(edge.start_anchor || "auto")}" data-end-anchor="${esc(edge.end_anchor || "auto")}"${edge.label ? ` data-edge-label="${esc(edge.label)}"` : ""}${startArrow !== "none" ? ` marker-start="url(#arrow-${esc(startArrow)})"` : ""}${endArrow !== "none" ? ` marker-end="url(#arrow-${esc(endArrow)})"` : ""}${lineStyle ? ` style="${lineStyle}"` : ""}></path>
    ${label}
  </g>`;
}

function styleText(theme) {
  return `
    :root{--bg:${theme.background};--surface:${theme.surface};--ink:${theme.ink};--muted:${theme.muted};--accent:${theme.accent};--accent-soft:${theme.accentSoft};--border:${theme.border};--group-fill:${theme.groupFill};--flow:${theme.flow};--pass:${theme.pass};--reject:${theme.reject};--feedback:${theme.feedback}}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);font-family:"Noto Sans CJK SC","Microsoft YaHei","PingFang SC",Arial,sans-serif;color:var(--ink)}
    .slide{width:100vw;height:100vh;overflow:hidden}.paper-visual{width:100vw;height:100vh;display:block;background:var(--bg)}
    .visual-title{font-family:"Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;font-size:46px;font-weight:700;fill:var(--ink);letter-spacing:.5px}.visual-subtitle{font-size:24px;fill:var(--muted)}
    .title-rule{stroke:var(--accent);stroke-width:6}
    .visual-group rect{fill:var(--group-fill);stroke:var(--border);stroke-width:1.5}.visual-group text{font-size:27px;font-weight:700;fill:var(--ink)}.group-index{fill:var(--accent);font-size:22px;letter-spacing:1px}
    .node-shape{fill:var(--surface);stroke:var(--border);stroke-width:2}.visual-node:focus .node-shape,.visual-node:hover .node-shape{stroke:var(--accent);stroke-width:3}.node-title{font-size:32px;font-weight:700;fill:var(--ink)}.node-detail{font-size:28px;fill:var(--muted)}.node-math .node-detail{font-family:"Cambria Math","STIX Two Math","Times New Roman",serif;font-size:24px;font-style:italic;letter-spacing:.2px}.node-tag{font-size:20px;font-weight:700;fill:var(--accent)}
    .node-decision .node-shape{fill:var(--accent-soft);stroke:var(--accent);stroke-width:2.5}.node-pill .node-shape{fill:var(--accent);stroke:var(--accent)}.node-pill .node-title,.node-pill .node-detail{fill:#fff}
    .visual-edge path{fill:none;stroke:var(--flow);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.edge-pass path{stroke:var(--pass);stroke-width:3.5}.edge-reject path{stroke:var(--reject);stroke-width:3.5}.edge-feedback path{stroke:var(--feedback);stroke-width:3.5;stroke-dasharray:11 8}.edge-label-wrap rect{fill:var(--bg);stroke:none}.edge-label{font-size:28px;font-weight:700;fill:var(--ink)}
    .author-tools{display:none;position:fixed;right:16px;top:16px;bottom:16px;z-index:5;width:300px;overflow:auto;padding:16px;border:1px solid #cbd5e1;border-radius:14px;background:#fffffff2;color:#334155;font:14px/1.45 "Microsoft YaHei",sans-serif;box-shadow:0 10px 30px #0f172a2b;backdrop-filter:blur(10px)}
    .is-authoring .author-tools{display:block}.is-authoring .slide{position:fixed;left:0;top:0;width:calc(100vw - 332px);height:100vh}.is-authoring .paper-visual{width:100%;height:100%}.is-authoring .visual-node{cursor:grab}.is-authoring .visual-node:active{cursor:grabbing}.is-authoring .visual-node.editor-selected .node-shape{stroke:var(--accent);stroke-width:4}
    .author-tools h2{margin:0 0 4px;font-size:18px;color:#172033}.author-tools p{margin:0 0 12px;color:#64748b}.editor-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px}.editor-actions button,.editor-export button,.author-tools>[data-action=close]{border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#24324a;padding:8px 6px;font:600 12px/1.2 sans-serif;cursor:pointer}.editor-actions button:hover,.editor-export button:hover,.author-tools>[data-action=close]:hover{border-color:var(--accent);color:var(--accent)}.editor-fields{display:grid;gap:9px}.editor-fields label{display:grid;gap:4px;font-weight:700;color:#334155}.editor-fields input,.editor-fields textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 9px;background:#fff;color:#172033;font:14px/1.4 sans-serif}.editor-fields textarea{min-height:66px;resize:vertical}.editor-fields input:disabled,.editor-fields textarea:disabled{background:#f1f5f9;color:#94a3b8}.editor-divider{height:1px;margin:14px 0;background:#e2e8f0}.editor-export{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.editor-status{min-height:20px;margin-top:10px!important;font-size:12px}.editor-kbd{display:inline-block;border:1px solid #cbd5e1;border-bottom-width:2px;border-radius:5px;padding:0 5px;background:#f8fafc;font:12px/1.6 monospace;color:#334155}
    ${advancedEditorCss()}
    @media print{html,body{width:100%;height:100%;print-color-adjust:exact;-webkit-print-color-adjust:exact}.author-tools,.editor-overlay{display:none!important}}
  `;
}

function svgContent(plan, { includeStyle = true, includeEditorOverlay = false } = {}) {
  const width = plan.canvas?.width || 1920;
  const height = plan.canvas?.height || 1080;
  const theme = { ...THEMES["academic-blue"], ...(THEMES[plan.theme] || {}), ...(plan.colors || {}) };
  const nodesById = new Map(plan.nodes.map((node) => [node.id, node]));
  const groups = plan.groups.map(groupMarkup).join("\n");
  const edges = plan.edges.map((edge) => edgeMarkup(edge, edgeGeometry(edge, nodesById))).join("\n");
  const nodes = plan.nodes.map(nodeMarkup).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" class="paper-visual" data-visual-type="${esc(plan.type)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="visual-title visual-subtitle">
  ${includeStyle ? `<style>${styleText(theme)}</style>` : ""}
  <defs>
    ${["flow", "pass", "reject", "feedback"].map((kind) => `<marker id="arrow-${kind}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="11" markerHeight="11" orient="auto"><path d="M1,1 L11,6 L1,11 Z" style="fill:var(--${kind})"></path></marker>`).join("\n")}
    <marker id="arrow-triangle" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M1,1 L11,6 L1,11 Z" fill="context-stroke"></path></marker>
    <marker id="arrow-dot" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="9" markerHeight="9" orient="auto"><circle cx="6" cy="6" r="4.5" fill="context-stroke"></circle></marker>
    <marker id="arrow-diamond" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M1,6 L6,1 L11,6 L6,11 Z" fill="context-stroke"></path></marker>
  </defs>
  <rect width="${width}" height="${height}" fill="var(--bg)"></rect>
  <line class="title-rule" x1="72" y1="66" x2="72" y2="148"></line>
  <text id="visual-title" class="visual-title" x="102" y="103">${esc(plan.title)}</text>
  <text id="visual-subtitle" class="visual-subtitle" x="104" y="139">${esc(plan.subtitle || "")}</text>
  <g class="groups-layer">${groups}</g>
  <g class="edges-layer">${edges}</g>
  <g class="nodes-layer">${nodes}</g>
  ${includeEditorOverlay ? editorOverlayMarkup() : ""}
  </svg>`;
}

function editorMarkup() {
  return `<aside class="author-tools" aria-label="论文图编辑器">
    <h2>论文图编辑器</h2>
    <p>点击节点后拖动；双击节点可定位到标题输入框。</p>
    <div class="editor-actions">
      <button type="button" data-action="undo">撤销</button>
      <button type="button" data-action="redo">重做</button>
      <button type="button" data-action="reset">重置</button>
    </div>
    <div class="editor-fields">
      <label>图标题<input data-editor-field="title" type="text"></label>
      <label>副标题<input data-editor-field="subtitle" type="text"></label>
    </div>
    <div class="editor-divider"></div>
    <p>当前节点：<strong data-editor-field="selected-id">尚未选择</strong></p>
    <div class="editor-fields">
      <label>节点标题<input data-editor-field="node-label" type="text" disabled></label>
      <label>节点说明<textarea data-editor-field="node-detail" disabled></textarea></label>
      <label>节点标签<input data-editor-field="node-tag" type="text" disabled></label>
    </div>
    <div class="editor-divider"></div>
    <div class="editor-export">
      <button type="button" data-action="export-svg">导出 SVG</button>
      <button type="button" data-action="export-png">导出 PNG</button>
      <button type="button" data-action="export-plan">导出 JSON</button>
    </div>
    <p class="editor-status">修改会自动保存到此浏览器</p>
    <p>按 <span class="editor-kbd">E</span> 显示/隐藏面板，<span class="editor-kbd">Ctrl+Z</span> 撤销。</p>
    <button type="button" data-action="close">隐藏编辑面板</button>
  </aside>`;
}

function browserScript(plan) {
  const sourcePlan = JSON.stringify(plan).replace(/</g, "\\u003c");
  const edgeData = JSON.stringify(plan.edges || []).replace(/</g, "\\u003c");
  const storageKey = JSON.stringify(`paper-visual:${plan.type}:${plan.title}`);
  return `<script>
  (() => {
    const svg = document.querySelector('.paper-visual');
    const sourcePlan = ${sourcePlan};
    const edges = ${edgeData};
    const storageKey = ${storageKey};
    const clone = value => JSON.parse(JSON.stringify(value));
    const initialState = {
      title: sourcePlan.title || '',
      subtitle: sourcePlan.subtitle || '',
      nodes: Object.fromEntries(sourcePlan.nodes.map(node => [node.id, {
        x: node.x, y: node.y, label: node.label || '', detail: node.detail || '', tag: node.tag || ''
      }]))
    };
    let state = clone(initialState);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && saved.nodes) state = { ...state, ...saved, nodes: { ...state.nodes, ...saved.nodes } };
    } catch (_) {}
    let history = [clone(state)];
    let historyIndex = 0;
    let selectedId = '';
    let drag = null;
    const field = name => document.querySelector('[data-editor-field="' + name + '"]');
    const status = message => {
      const element = document.querySelector('.editor-status');
      if (element) element.textContent = message;
    };
    const nodeElement = id => Array.from(svg.querySelectorAll('[data-node-id]')).find(item => item.dataset.nodeId === id);
    const point = element => ({ x: +element.dataset.x, y: +element.dataset.y, width: +element.dataset.width, height: +element.dataset.height });
    const center = node => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
    const boundary = (node, toward) => {
      const c = center(node), dx = toward.x - c.x, dy = toward.y - c.y;
      const sx = dx ? node.width / 2 / Math.abs(dx) : 1e9;
      const sy = dy ? node.height / 2 / Math.abs(dy) : 1e9;
      const scale = Math.min(sx, sy);
      return { x: c.x + dx * scale, y: c.y + dy * scale };
    };
    const wrap = (value, max) => {
      const parts = String(value || '').trim().split(/\\n|<br\\s*\\/?>/i).map(item => item.trim()).filter(Boolean);
      const result = [];
      for (const part of parts) {
        const chars = Array.from(part);
        for (let index = 0; index < chars.length; index += max) result.push(chars.slice(index, index + max).join(''));
      }
      return result.slice(0, 3);
    };
    const tspans = (element, textLines, x, y, lineHeight) => {
      element.replaceChildren();
      element.setAttribute('x', x);
      element.setAttribute('y', y);
      textLines.forEach((text, index) => {
        const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        span.setAttribute('x', x);
        span.setAttribute('dy', index ? lineHeight : 0);
        span.textContent = text;
        element.append(span);
      });
    };
    function renderNodeText(element, nodeState) {
      const x = +element.dataset.originalX;
      const y = +element.dataset.originalY;
      const width = +element.dataset.width;
      const height = +element.dataset.height;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const titleLines = wrap(nodeState.label, +element.dataset.titleWrap || 10);
      const detailLines = wrap(nodeState.detail, +element.dataset.detailWrap || 14);
      const titleHeight = titleLines.length * 38;
      const detailHeight = detailLines.length * 31;
      const gap = detailLines.length ? 13 : 0;
      const total = titleHeight + gap + detailHeight;
      const titleY = cy - total / 2 + 29;
      const detailY = titleY + titleHeight + gap - 2;
      tspans(element.querySelector('.node-title'), titleLines, cx, titleY, 38);
      tspans(element.querySelector('.node-detail'), detailLines, cx, detailY, 31);
      element.querySelector('.node-tag').textContent = nodeState.tag || '';
      element.querySelector('desc').textContent = [nodeState.label, nodeState.detail].filter(Boolean).join('；');
    }
    function updateEdges() {
      const paths = Array.from(svg.querySelectorAll('[data-edge-from][data-edge-to]'));
      for (const edge of edges) {
        const fromElement = nodeElement(edge.from);
        const toElement = nodeElement(edge.to);
        const path = paths.find(item => item.dataset.edgeFrom === edge.from && item.dataset.edgeTo === edge.to);
        if (!fromElement || !toElement || !path) continue;
        const from = point(fromElement), to = point(toElement);
        const mids = (edge.route || []).map(value => ({ x: value[0], y: value[1] }));
        const start = boundary(from, mids[0] || center(to));
        const end = boundary(to, mids[mids.length - 1] || center(from));
        path.setAttribute('d', [start, ...mids, end].map((value, index) => (index ? 'L' : 'M') + value.x.toFixed(1) + ',' + value.y.toFixed(1)).join(' '));
      }
    }
    function refreshFields() {
      if (!field('title')) return;
      if (document.activeElement !== field('title')) field('title').value = state.title;
      if (document.activeElement !== field('subtitle')) field('subtitle').value = state.subtitle;
      const nodeState = state.nodes[selectedId];
      for (const name of ['node-label', 'node-detail', 'node-tag']) field(name).disabled = !nodeState;
      field('selected-id').textContent = nodeState ? selectedId : '尚未选择';
      if (nodeState) {
        if (document.activeElement !== field('node-label')) field('node-label').value = nodeState.label;
        if (document.activeElement !== field('node-detail')) field('node-detail').value = nodeState.detail;
        if (document.activeElement !== field('node-tag')) field('node-tag').value = nodeState.tag;
      } else {
        field('node-label').value = '';
        field('node-detail').value = '';
        field('node-tag').value = '';
      }
    }
    function applyState() {
      document.querySelector('#visual-title').textContent = state.title;
      document.querySelector('#visual-subtitle').textContent = state.subtitle;
      for (const [id, nodeState] of Object.entries(state.nodes)) {
        const element = nodeElement(id);
        if (!element) continue;
        element.dataset.x = nodeState.x;
        element.dataset.y = nodeState.y;
        const dx = nodeState.x - +element.dataset.originalX;
        const dy = nodeState.y - +element.dataset.originalY;
        element.setAttribute('transform', 'translate(' + dx + ' ' + dy + ')');
        renderNodeText(element, nodeState);
      }
      updateEdges();
      refreshFields();
    }
    function persist() {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
    }
    function commit(message = '已保存到浏览器') {
      const snapshot = JSON.stringify(state);
      if (JSON.stringify(history[historyIndex]) !== snapshot) {
        history = history.slice(0, historyIndex + 1);
        history.push(clone(state));
        historyIndex = history.length - 1;
      }
      persist();
      status(message);
    }
    function selectNode(id) {
      selectedId = id && state.nodes[id] ? id : '';
      svg.querySelectorAll('[data-node-id]').forEach(element => element.classList.toggle('editor-selected', element.dataset.nodeId === selectedId));
      refreshFields();
      status(selectedId ? '已选择节点：' + selectedId : '请选择一个节点');
    }
    function undo() {
      if (historyIndex <= 0) return status('没有更早的修改');
      state = clone(history[--historyIndex]);
      applyState();
      persist();
      status('已撤销');
    }
    function redo() {
      if (historyIndex >= history.length - 1) return status('没有可重做的修改');
      state = clone(history[++historyIndex]);
      applyState();
      persist();
      status('已重做');
    }
    function reset() {
      if (!window.confirm('恢复为最初生成的版本？浏览器内的编辑记录将被清除。')) return;
      state = clone(initialState);
      history = [clone(state)];
      historyIndex = 0;
      try { localStorage.removeItem(storageKey); } catch (_) {}
      applyState();
      status('已恢复初始版本');
    }
    function setEditMode(enabled) {
      document.body.classList.toggle('is-authoring', Boolean(enabled));
      if (enabled) status('编辑模式已开启：点击节点后可拖动或改字');
    }
    function download(name, blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    function serializedSvg() {
      const exported = svg.cloneNode(true);
      exported.querySelectorAll('.editor-selected').forEach(element => element.classList.remove('editor-selected'));
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = document.querySelector('head style').textContent;
      exported.prepend(style);
      exported.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      return '<?xml version="1.0" encoding="UTF-8"?>\\n' + new XMLSerializer().serializeToString(exported);
    }
    function exportSvg() {
      download('diagram-edited.svg', new Blob([serializedSvg()], { type: 'image/svg+xml;charset=utf-8' }));
      status('已导出 SVG');
    }
    function exportPng() {
      const blob = new Blob([serializedSvg()], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const viewBox = svg.viewBox.baseVal;
        const canvas = document.createElement('canvas');
        canvas.width = viewBox.width * 2;
        canvas.height = viewBox.height * 2;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(output => {
          if (output) download('diagram-edited@2x.png', output);
          URL.revokeObjectURL(url);
          status(output ? '已导出 2× PNG' : 'PNG 导出失败');
        }, 'image/png');
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        status('PNG 导出失败');
      };
      image.src = url;
    }
    function exportPlan() {
      const output = clone(sourcePlan);
      output.title = state.title;
      output.subtitle = state.subtitle;
      output.nodes = output.nodes.map(node => ({ ...node, ...state.nodes[node.id] }));
      download('visual-plan-edited.json', new Blob([JSON.stringify(output, null, 2) + '\\n'], { type: 'application/json;charset=utf-8' }));
      status('已导出可继续生成的 JSON');
    }
    svg.addEventListener('pointerdown', event => {
      if (!document.body.classList.contains('is-authoring')) return;
      const element = event.target.closest('[data-node-id]');
      if (!element) return;
      selectNode(element.dataset.nodeId);
      const nodeState = state.nodes[element.dataset.nodeId];
      drag = {
        element, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
        x: nodeState.x, y: nodeState.y, before: JSON.stringify(state)
      };
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    svg.addEventListener('pointermove', event => {
      if (!drag) return;
      const box = svg.getBoundingClientRect();
      const scaleX = svg.viewBox.baseVal.width / box.width;
      const scaleY = svg.viewBox.baseVal.height / box.height;
      const nodeState = state.nodes[drag.element.dataset.nodeId];
      nodeState.x = Math.round((drag.x + (event.clientX - drag.clientX) * scaleX) * 10) / 10;
      nodeState.y = Math.round((drag.y + (event.clientY - drag.clientY) * scaleY) * 10) / 10;
      applyState();
    });
    const finishDrag = () => {
      if (!drag) return;
      const changed = drag.before !== JSON.stringify(state);
      drag = null;
      if (changed) commit('节点位置已保存');
    };
    svg.addEventListener('pointerup', finishDrag);
    svg.addEventListener('pointercancel', finishDrag);
    svg.addEventListener('dblclick', event => {
      if (!document.body.classList.contains('is-authoring')) return;
      const element = event.target.closest('[data-node-id]');
      if (!element) return;
      selectNode(element.dataset.nodeId);
      field('node-label').focus();
      field('node-label').select();
    });
    const stateFieldMap = {
      title: 'title', subtitle: 'subtitle', 'node-label': 'label',
      'node-detail': 'detail', 'node-tag': 'tag'
    };
    for (const name of Object.keys(stateFieldMap)) {
      const input = field(name);
      input.addEventListener('input', () => {
        if (name === 'title' || name === 'subtitle') state[stateFieldMap[name]] = input.value;
        else if (state.nodes[selectedId]) state.nodes[selectedId][stateFieldMap[name]] = input.value;
        applyState();
        persist();
      });
      input.addEventListener('change', () => commit('文字修改已保存'));
    }
    document.querySelector('[data-action="close"]').addEventListener('click', () => setEditMode(false));
    document.querySelector('[data-action="undo"]').addEventListener('click', undo);
    document.querySelector('[data-action="redo"]').addEventListener('click', redo);
    document.querySelector('[data-action="reset"]').addEventListener('click', reset);
    document.querySelector('[data-action="export-svg"]').addEventListener('click', exportSvg);
    document.querySelector('[data-action="export-png"]').addEventListener('click', exportPng);
    document.querySelector('[data-action="export-plan"]').addEventListener('click', exportPlan);
    window.addEventListener('keydown', event => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
      if (!typing && event.key.toLowerCase() === 'e') setEditMode(!document.body.classList.contains('is-authoring'));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    });
    window.PaperVisual = {
      update: updateEdges, setEditMode, selectNode, undo, redo, reset,
      exportSvg, exportPng, exportPlan, getState: () => clone(state)
    };
    applyState();
    if (new URLSearchParams(location.search).get('edit') === '1') setEditMode(true);
  })();
  </script>`;
}

export function validateVisualPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object") return { status: "FAIL", errors: ["plan 必须是对象"] };
  if (plan.mode !== "paper-visual") errors.push("mode 必须为 paper-visual");
  if (!plan.title) errors.push("缺少 title");
  if (!plan.type) errors.push("缺少 type");
  for (const key of ["groups", "nodes", "edges"]) {
    if (!Array.isArray(plan[key])) errors.push(`${key} 必须是数组`);
  }
  if (errors.length) return { status: "FAIL", errors };
  const nodeIds = new Set();
  for (const node of plan.nodes) {
    if (!node.id || nodeIds.has(node.id)) errors.push(`节点 id 缺失或重复：${node.id || "(空)"}`);
    nodeIds.add(node.id);
    for (const key of ["x", "y", "width", "height"]) {
      if (!Number.isFinite(node[key])) errors.push(`节点 ${node.id} 的 ${key} 无效`);
    }
  }
  const edgeIds = new Set();
  for (const edge of plan.edges) {
    if (edge.id && edgeIds.has(edge.id)) errors.push(`边 id 重复：${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`边 ${edge.id || ""} 引用了未知节点：${edge.from}->${edge.to}`);
    }
  }
  return {
    status: errors.length ? "FAIL" : "PASS",
    errors,
    nodes: plan.nodes.length,
    groups: plan.groups.length,
    edges: plan.edges.length
  };
}

export function renderSvg(plan) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgContent(plan)}\n`;
}

export function renderHtml(plan, { edit = false } = {}) {
  const theme = { ...THEMES["academic-blue"], ...(THEMES[plan.theme] || {}), ...(plan.colors || {}) };
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(plan.title)}${edit ? "｜编辑" : ""}</title><style>${styleText(theme)}body{display:grid;place-items:center}.paper-visual{width:100vw;height:100vh}</style></head><body${edit ? ' class="is-authoring"' : ""}>${advancedEditorMarkup()}<section class="slide">${svgContent(plan, { includeStyle: false, includeEditorOverlay: true })}</section>${advancedBrowserScript(plan)}</body></html>\n`;
}
