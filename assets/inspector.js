(function () {
  "use strict";
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  function overlap(a, b) { return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); }

  function run() {
    const slides = [...document.querySelectorAll(".deck > .slide")];
    const reports = slides.map((slide, index) => {
      const issues = [];
      const slideRect = slide.getBoundingClientRect();
      const editable = [...slide.querySelectorAll("[data-editable]")].filter((el) => getComputedStyle(el).display !== "none");
      for (const el of editable) {
        const style = getComputedStyle(el);
        const size = Number.parseFloat(style.fontSize);
        if (size < 18 && !el.closest(".cover-meta,.slide-kicker")) issues.push({ code: "FONT_TOO_SMALL", severity: "error", detail: `${size}px：${(el.textContent || "").trim().slice(0, 40)}` });
        if (el.scrollWidth > el.clientWidth + 10 || el.scrollHeight > el.clientHeight + 10) issues.push({ code: "TEXT_OVERFLOW", severity: "error", detail: (el.textContent || "").trim().slice(0, 60) });
      }
      const boxes = [...slide.querySelectorAll(":scope > [data-layout-box],:scope > [data-draggable]")].filter((el) => {
        const style = getComputedStyle(el); const rect = el.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
      boxes.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.left < slideRect.left - 2 || rect.top < slideRect.top - 2 || rect.right > slideRect.right + 2 || rect.bottom > slideRect.bottom + 2) issues.push({ code: "OUT_OF_BOUNDS", severity: "error", detail: el.className || el.tagName });
      });
      slide.querySelectorAll("[data-flowchart]").forEach((chart) => {
        const chartRect = chart.getBoundingClientRect();
        chart.querySelectorAll(".flow-node").forEach((node) => {
          const rect = node.getBoundingClientRect();
          if (rect.left < chartRect.left - 2 || rect.top < chartRect.top - 2 || rect.right > chartRect.right + 2 || rect.bottom > chartRect.bottom + 2) issues.push({ code: "FLOW_NODE_OUT_OF_BOUNDS", severity: "error", detail: (node.textContent || "").trim().slice(0, 50) });
        });
      });
      for (let a = 0; a < boxes.length; a += 1) for (let b = a + 1; b < boxes.length; b += 1) {
        const area = overlap(boxes[a].getBoundingClientRect(), boxes[b].getBoundingClientRect());
        if (area > 64) issues.push({ code: "ELEMENT_OVERLAP", severity: "error", detail: `${boxes[a].className} / ${boxes[b].className}` });
      }
      const visibleText = editable.map((el) => el.textContent || "").join("").replace(/\s+/g, "");
      if (visibleText.length > 220) issues.push({ code: "CONTENT_DENSE", severity: "warning", detail: `${visibleText.length} 字` });
      return { index: index + 1, title: slide.dataset.title || "", type: slide.dataset.slideType || "unknown", issues, pass: !issues.some((issue) => issue.severity === "error") };
    });
    for (let index = 2; index < reports.length; index += 1) {
      if (reports[index].type === reports[index - 1].type && reports[index].type === reports[index - 2].type) reports[index].issues.push({ code: "REPEATED_TEMPLATE", severity: "warning", detail: `连续三页使用 ${reports[index].type}` });
    }
    const report = { checkedAt: new Date().toISOString(), pageCount: reports.length, passedPages: reports.filter((page) => page.pass).length, failedPages: reports.filter((page) => !page.pass).length, pages: reports };
    report.status = report.failedPages === 0 ? "PASS" : "FAIL";
    window.__htmlPptValidation = report;
    let reportNode = document.getElementById("html-ppt-validation");
    if (!reportNode) {
      reportNode = document.createElement("script");
      reportNode.type = "application/json";
      reportNode.id = "html-ppt-validation";
      document.body.appendChild(reportNode);
    }
    reportNode.textContent = JSON.stringify(report);
    document.documentElement.dataset.validationStatus = report.status;
    document.dispatchEvent(new CustomEvent("htmlppt:validation", { detail: report }));
    return report;
  }

  ready(() => setTimeout(run, 850));
  window.HtmlPptInspector = { run };
})();
