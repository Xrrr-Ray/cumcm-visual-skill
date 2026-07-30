import assert from "node:assert/strict";
import fs from "node:fs";
import { renderHtml, renderSvg, validateVisualPlan } from "../paper-visual/render-paper-visual.mjs";

const plan = JSON.parse(fs.readFileSync(
  new URL("../examples/paper-visual-plans/mindmap.json", import.meta.url),
  "utf8"
));

assert.equal(validateVisualPlan(plan).status, "PASS");

const presentationHtml = renderHtml(plan);
const editorHtml = renderHtml(plan, { edit: true });
const svg = renderSvg(plan);
const customizedPlan = structuredClone(plan);
customizedPlan.nodes[0] = {
  ...customizedPlan.nodes[0],
  fill: "#ffcc00",
  stroke: "#cc3300",
  text_color: "#112233"
};
customizedPlan.groups[0] = {
  ...customizedPlan.groups[0],
  fill: "#eef6ff",
  stroke: "#336699",
  text_color: "#123456"
};
customizedPlan.edges[0] = {
  ...customizedPlan.edges[0],
  color: "#d946ef",
  width: 5,
  dash: "dashed",
  start_arrow: "dot",
  end_arrow: "diamond",
  start_anchor: "right",
  end_anchor: "left"
};
const customizedSvg = renderSvg(customizedPlan);

assert.match(presentationHtml, /<body>/);
assert.doesNotMatch(presentationHtml, /<body class="is-authoring">/);
assert.match(editorHtml, /<body class="is-authoring">/);
assert.match(editorHtml, /论文图高级编辑器/);

for (const action of [
  "undo", "redo", "reset", "add-bend", "clear-bends",
  "export-svg", "export-png", "export-plan", "close"
]) {
  assert.match(editorHtml, new RegExp(`data-action="${action}"`));
}

for (const api of [
  "setEditMode", "selectObject", "undo", "redo", "reset",
  "setSnapEnabled", "testSnapBox", "testSnapRoute", "previewSnapBox",
  "addBend", "clearBends", "exportSvg", "exportPng", "exportPlan", "getState"
]) {
  assert.match(editorHtml, new RegExp(`\\b${api}\\b`));
}

for (const editorField of [
  "node-fill", "node-stroke", "node-text-color",
  "snap-enabled",
  "group-label", "group-fill", "group-stroke", "group-text-color",
  "group-x", "group-y", "group-width", "group-height",
  "edge-from", "edge-to", "edge-start-anchor", "edge-end-anchor",
  "edge-start-arrow", "edge-end-arrow", "edge-dash", "edge-width", "edge-color"
]) {
  assert.match(editorHtml, new RegExp(`data-editor-field="${editorField}"`));
}

assert.match(editorHtml, /localStorage\.setItem/);
assert.match(editorHtml, /data-original-x=/);
assert.match(editorHtml, /data-editor-handle="group-resize"/);
assert.match(editorHtml, /data-editor-overlay="edge-handles"/);
assert.match(editorHtml, /data-editor-overlay="snap-guides"/);
assert.match(editorHtml, /editor-snap-guide/);
assert.match(editorHtml, /data-color-popover/);
assert.match(editorHtml, /data-theme-colors/);
assert.match(editorHtml, /data-standard-colors/);
assert.match(editorHtml, /data-color-more/);
assert.match(editorHtml, /data-color-trigger="node-fill"/);
assert.match(editorHtml, /data-color-trigger="group-fill"/);
assert.match(editorHtml, /data-color-trigger="edge-color"/);
assert.match(editorHtml, /themeColorColumns/);
assert.match(editorHtml, /standardColors/);
assert.match(editorHtml, /applyPaletteColor/);
assert.match(editorHtml, /editor-palette-swatch/);
assert.match(editorHtml, /更多颜色/);
assert.match(editorHtml, /snapBoxPosition/);
assert.match(editorHtml, /snapRoutePoint/);
assert.match(editorHtml, /event\.altKey/);
assert.match(editorHtml, /event\.shiftKey/);
assert.match(editorHtml, /data-edge-endpoint/);
assert.match(editorHtml, /data-route-index/);
assert.match(editorHtml, /translate\('/);
assert.match(editorHtml, /URLSearchParams\(location\.search\)/);
assert.match(editorHtml, /diagram-edited@2x\.png/);
assert.match(svg, /id="arrow-triangle"/);
assert.match(svg, /data-group-id=/);
assert.match(svg, /data-edge-route=/);
assert.match(customizedSvg, /fill:#ffcc00/);
assert.match(customizedSvg, /stroke:#cc3300/);
assert.match(customizedSvg, /fill:#eef6ff/);
assert.match(customizedSvg, /stroke:#d946ef/);
assert.match(customizedSvg, /stroke-width:5/);
assert.match(customizedSvg, /stroke-dasharray:12 8/);
assert.match(customizedSvg, /marker-start="url\(#arrow-dot\)"/);
assert.match(customizedSvg, /marker-end="url\(#arrow-diamond\)"/);
assert.match(customizedSvg, /data-start-anchor="right"/);
assert.match(customizedSvg, /data-end-anchor="left"/);
assert.doesNotMatch(svg, /论文图高级编辑器/);
assert.doesNotMatch(svg, /<aside\b/);
assert.doesNotMatch(svg, /<button\b/);

const scriptMatch = editorHtml.match(/<script>([\s\S]+)<\/script>/);
assert.ok(scriptMatch, "编辑页必须包含运行时脚本");
new Function(scriptMatch[1]);

process.stdout.write(JSON.stringify({
  status: "PASS",
  checks: 87,
  presentationBytes: Buffer.byteLength(presentationHtml),
  editorBytes: Buffer.byteLength(editorHtml),
  svgBytes: Buffer.byteLength(svg)
}, null, 2) + "\n");
