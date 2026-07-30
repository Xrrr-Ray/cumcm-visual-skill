const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const editable = (value, tag = "p", className = "") => `<${tag} class="${className}" data-editable>${escapeHtml(value)}</${tag}>`;
const facts = (slide) => [slide.keyMessage, ...(slide.content || [])].filter(Boolean);

function notes(slide) {
  return `<aside class="notes">本页核心：${escapeHtml(slide.keyMessage)}。讲解时只使用输入材料中的事实，不扩展未经验证的结论。</aside>`;
}

function header(slide, label) {
  return `<div class="slide-heading"><span class="slide-kicker">${escapeHtml(label)}</span>${editable(slide.title, "h2", "slide-title")}</div>`;
}

function cover(slide, plan) {
  const longClass = slide.title.length > 24 ? " is-long-title" : "";
  return `<section class="slide slide-cover is-active${longClass}" data-title="${escapeHtml(slide.title)}" data-slide-type="cover"><div class="cover-rule"></div><div class="cover-copy" data-layout-box>${editable(slide.title, "h1", "cover-title")}<div class="cover-message" data-editable>${escapeHtml(slide.keyMessage)}</div><div class="cover-meta"><span>${escapeHtml(plan.presentation.audience)}</span><span>${plan.presentation.slideCount} 页</span><span>${escapeHtml(plan.presentation.theme)}</span></div></div><div class="cover-figure" aria-label="研究结构示意"><span>问题</span><i></i><span>方法</span><i></i><span>证据</span><i></i><span>结论</span></div>${notes(slide)}</section>`;
}

function agenda(slide) {
  return `<section class="slide slide-agenda" data-title="${escapeHtml(slide.title)}" data-slide-type="agenda">${header(slide, "AGENDA · 汇报结构")}<div class="agenda-list" data-layout-box>${(slide.content || []).map((item, index) => `<div class="agenda-item"><span>${String(index + 1).padStart(2, "0")}</span>${editable(item, "h3")}</div>`).join("")}</div>${notes(slide)}</section>`;
}

function singleMessage(slide) {
  return `<section class="slide slide-single" data-title="${escapeHtml(slide.title)}" data-slide-type="single-message">${header(slide, "KEY MESSAGE · 核心判断")}<div class="single-statement" data-layout-box data-draggable>${editable(slide.keyMessage, "div", "statement")}</div><div class="evidence-list" data-layout-box>${(slide.content || []).map((item, index) => `<div><span>0${index + 1}</span>${editable(item)}</div>`).join("")}</div>${notes(slide)}</section>`;
}

function threeColumns(slide) {
  const items = facts(slide).slice(0, 3);
  return `<section class="slide slide-columns" data-title="${escapeHtml(slide.title)}" data-slide-type="three-columns">${header(slide, "THREE PILLARS · 三个模块")}<div class="column-intro" data-editable>${escapeHtml(slide.keyMessage)}</div><div class="pillar-grid" data-layout-box>${items.map((item, index) => `<article class="pillar" data-draggable><span>${String(index + 1).padStart(2, "0")}</span>${editable(item, "h3")}</article>`).join("")}</div>${notes(slide)}</section>`;
}

function comparison(slide) {
  const items = facts(slide);
  const mid = Math.max(1, Math.ceil(items.length / 2));
  const side = (values, label, tone) => `<div class="compare-side ${tone}" data-draggable><span class="compare-label">${label}</span>${values.map((item) => editable(item, "p")).join("")}</div>`;
  return `<section class="slide slide-comparison" data-title="${escapeHtml(slide.title)}" data-slide-type="comparison">${header(slide, "COMPARISON · 方法对比")}<div class="comparison-grid" data-layout-box>${side(items.slice(0, mid), "现状 / 基线", "muted")}${side(items.slice(mid), "改进 / 结果", "accent")}</div>${notes(slide)}</section>`;
}

function timeline(slide) {
  const items = facts(slide).slice(0, 6);
  return `<section class="slide slide-timeline" data-title="${escapeHtml(slide.title)}" data-slide-type="timeline">${header(slide, "TIMELINE · 阶段进程")}<div class="timeline" data-layout-box>${items.map((item, index) => `<div class="timeline-item" data-draggable><span class="timeline-dot"></span><strong>${String(index + 1).padStart(2, "0")}</strong>${editable(item)}</div>`).join("")}</div>${notes(slide)}</section>`;
}

function flowchart(slide) {
  const rawItems = facts(slide);
  const expanded = rawItems.length >= 3 ? rawItems : rawItems.flatMap((item) => item.split(/[：:、，；]/).map((part) => part.trim()).filter((part) => part.length >= 4));
  const items = (expanded.length >= 3 ? expanded : rawItems).slice(0, 6);
  const positions = items.map((_, index) => ({ x: 10 + (80 * index) / Math.max(1, items.length - 1), y: index % 2 ? 58 : 38 }));
  return `<section class="slide slide-flowchart" data-title="${escapeHtml(slide.title)}" data-slide-type="flowchart">${header(slide, "FLOW · 方法与路径")}<div class="flowchart" data-flowchart data-layout="horizontal" data-layout-box>${items.map((item, index) => `<div class="flow-node" data-node-id="n${index + 1}" style="--x:${positions[index].x};--y:${positions[index].y}" data-editable>${escapeHtml(item)}</div>`).join("")}${items.slice(1).map((_, index) => `<span data-edge data-from="n${index + 1}" data-to="n${index + 2}" data-label="${index === items.length - 2 ? "输出" : ""}"></span>`).join("")}</div>${notes(slide)}</section>`;
}

function extractMetrics(slide) {
  const values = [];
  for (const item of facts(slide)) {
    const matches = [...item.matchAll(/(?:\d[\d,.]*)(?:%|\s?(?:cm|min|s|天|篇|项|万元|百分点|倍|人|辆|条|场|座|m))?/gi)];
    if (matches.length) values.push({ value: matches[0][0], label: item.replace(matches[0][0], "").replace(/^[，、：:\s]+|[，。；\s]+$/g, "") || item });
  }
  return values.slice(0, 4);
}

function metricOverview(slide) {
  const metrics = extractMetrics(slide);
  const fallback = facts(slide).slice(0, 3).map((item, index) => ({ value: `0${index + 1}`, label: item }));
  const data = metrics.length >= 2 ? metrics : fallback;
  return `<section class="slide slide-metrics" data-title="${escapeHtml(slide.title)}" data-slide-type="metric-overview">${header(slide, "METRICS · 关键指标")}<div class="metric-message" data-editable>${escapeHtml(slide.keyMessage)}</div><div class="metric-grid" data-layout-box>${data.map((item) => `<article class="metric" data-draggable>${editable(item.value, "strong")}<p data-editable>${escapeHtml(item.label)}</p></article>`).join("")}</div>${notes(slide)}</section>`;
}

function dataChart(slide) {
  const values = extractMetrics(slide);
  const chartData = values.length ? values : facts(slide).slice(0, 4).map((item, index) => ({ value: `证据 ${index + 1}`, label: item }));
  return `<section class="slide slide-data" data-title="${escapeHtml(slide.title)}" data-slide-type="data-chart">${header(slide, "DATA · 数据证据")}<div class="data-layout" data-layout-box><div class="data-takeaway" data-draggable>${editable(slide.keyMessage, "div", "statement")}</div><div class="evidence-bars">${chartData.map((item, index) => `<div class="evidence-bar"><span style="--bar:${35 + index * 15}%"></span><strong data-editable>${escapeHtml(item.value)}</strong><p data-editable>${escapeHtml(item.label)}</p></div>`).join("")}</div></div>${notes(slide)}</section>`;
}

function summary(slide) {
  return `<section class="slide slide-summary" data-title="${escapeHtml(slide.title)}" data-slide-type="summary">${header(slide, "SUMMARY · 结论与边界")}<div class="summary-grid" data-layout-box><div class="summary-message" data-draggable>${editable(slide.keyMessage, "div", "statement")}</div><div class="summary-points">${(slide.content || []).slice(0, 3).map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span>${editable(item)}</div>`).join("")}</div></div>${notes(slide)}</section>`;
}

function textImage(slide, reverse = false) {
  const type = reverse ? "image-text" : "text-image";
  return `<section class="slide slide-media ${reverse ? "reverse" : ""}" data-title="${escapeHtml(slide.title)}" data-slide-type="${type}">${header(slide, "EVIDENCE · 图文证据")}<div class="media-grid" data-layout-box><div class="media-copy">${editable(slide.keyMessage, "div", "statement")}${(slide.content || []).map((item) => editable(item)).join("")}</div><figure class="media-placeholder" data-replaceable-image data-draggable><div>请替换为输入材料中的真实图像</div><figcaption data-editable>${escapeHtml(slide.visualSuggestion)}</figcaption></figure></div>${notes(slide)}</section>`;
}

function sectionDivider(slide) {
  return `<section class="slide slide-divider" data-title="${escapeHtml(slide.title)}" data-slide-type="section-divider"><div class="divider-number">${String(slide.index).padStart(2, "0")}</div>${editable(slide.title, "h1", "divider-title")}${editable(slide.keyMessage, "p", "divider-message")}${notes(slide)}</section>`;
}

export function renderSlide(slide, plan) {
  return ({ cover: () => cover(slide, plan), agenda: () => agenda(slide), "section-divider": () => sectionDivider(slide), "single-message": () => singleMessage(slide), "text-image": () => textImage(slide, false), "image-text": () => textImage(slide, true), "three-columns": () => threeColumns(slide), comparison: () => comparison(slide), timeline: () => timeline(slide), flowchart: () => flowchart(slide), "data-chart": () => dataChart(slide), "metric-overview": () => metricOverview(slide), summary: () => summary(slide) }[slide.type] || (() => singleMessage(slide)))();
}

export function renderDeck(plan) {
  const theme = escapeHtml(plan.presentation.theme || "competition-blue");
  const title = escapeHtml(plan.presentation.title);
  return `<!doctype html>
<html lang="zh-CN" data-theme="${theme}" data-theme-base="assets/themes/"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="assets/base.css"><link rel="stylesheet" href="assets/academic-base.css"><link rel="stylesheet" id="theme-link" href="assets/themes/${theme}.css"><link rel="stylesheet" href="assets/flowchart.css"></head>
<body class="academic-deck" data-themes="academic-light,minimal-gray,competition-blue" data-theme-base="assets/themes/"><div class="deck">${plan.slides.map((slide) => renderSlide(slide, plan)).join("\n")}</div>
<div class="deck-header"><span>${title}</span><span>HTML-PPT · ACADEMIC</span></div><div class="deck-footer"><span>${escapeHtml(plan.presentation.audience)}</span><span class="slide-number"></span></div>
<script src="assets/editor.js"></script><script src="assets/runtime.js"></script><script src="assets/flowchart.js"></script><script src="assets/inspector.js"></script></body></html>`;
}
