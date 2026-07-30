(function () {
  "use strict";
  let chartCounter = 0;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function boundaryPoint(rect, toward, rootRect) {
    const center = { x: rect.left - rootRect.left + rect.width / 2, y: rect.top - rootRect.top + rect.height / 2 };
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    if (!dx && !dy) return center;
    const sx = dx ? rect.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
    const sy = dy ? rect.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
    const scale = Math.min(sx, sy);
    return { x: center.x + dx * scale, y: center.y + dy * scale };
  }

  function applyLayout(chart, nodes) {
    const layout = chart.dataset.layout || "horizontal";
    nodes.forEach((node, index) => {
      if (node.style.getPropertyValue("--x") && node.style.getPropertyValue("--y")) return;
      if (layout === "vertical") {
        node.style.setProperty("--x", "50");
        node.style.setProperty("--y", String(10 + 80 * index / Math.max(1, nodes.length - 1)));
      } else if (layout === "layered") {
        const columns = Math.ceil(Math.sqrt(nodes.length));
        const row = Math.floor(index / columns);
        const column = index % columns;
        node.style.setProperty("--x", String(15 + 70 * column / Math.max(1, columns - 1)));
        node.style.setProperty("--y", String(22 + 56 * row / Math.max(1, Math.ceil(nodes.length / columns) - 1)));
      } else {
        node.style.setProperty("--x", String(10 + 80 * index / Math.max(1, nodes.length - 1)));
        node.style.setProperty("--y", "50");
      }
    });
  }

  function initChart(chart) {
    if (chart.dataset.flowchartReady === "true") return;
    chart.dataset.flowchartReady = "true";
    chartCounter += 1;
    const markerId = `flow-arrow-${chartCounter}`;
    const nodes = [...chart.querySelectorAll(".flow-node[data-node-id]")];
    const edgeData = [...chart.querySelectorAll("[data-edge]")].map((edge) => ({ from: edge.dataset.from, to: edge.dataset.to, label: edge.dataset.label || "", source: edge }));
    edgeData.forEach((edge) => { edge.source.hidden = true; });
    applyLayout(chart, nodes);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("flowchart-svg");
    svg.innerHTML = `<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="var(--text-2)"></path></marker></defs>`;
    chart.prepend(svg);
    const paths = edgeData.map((edge) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("flow-edge");
      path.style.markerEnd = `url(#${markerId})`;
      svg.appendChild(path);
      let label = null;
      if (edge.label) {
        label = document.createElement("div");
        label.className = "flow-edge-label";
        label.textContent = edge.label;
        chart.appendChild(label);
      }
      return { ...edge, path, label };
    });

    function update() {
      const rootRect = chart.getBoundingClientRect();
      for (const edge of paths) {
        const fromNode = chart.querySelector(`[data-node-id="${CSS.escape(edge.from)}"]`);
        const toNode = chart.querySelector(`[data-node-id="${CSS.escape(edge.to)}"]`);
        if (!fromNode || !toNode) continue;
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const fromCenter = { x: fromRect.left - rootRect.left + fromRect.width / 2, y: fromRect.top - rootRect.top + fromRect.height / 2 };
        const toCenter = { x: toRect.left - rootRect.left + toRect.width / 2, y: toRect.top - rootRect.top + toRect.height / 2 };
        const start = boundaryPoint(fromRect, toCenter, rootRect);
        const end = boundaryPoint(toRect, fromCenter, rootRect);
        edge.path.setAttribute("d", `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
        if (edge.label) {
          edge.label.style.left = `${(start.x + end.x) / 2}px`;
          edge.label.style.top = `${(start.y + end.y) / 2}px`;
        }
      }
    }

    nodes.forEach((node) => {
      node.addEventListener("pointerdown", (event) => {
        if (!document.body.classList.contains("is-editing")) return;
        event.preventDefault();
        node.setPointerCapture(event.pointerId);
        node.classList.add("is-dragging");
      });
      node.addEventListener("pointermove", (event) => {
        if (!node.classList.contains("is-dragging")) return;
        const rect = chart.getBoundingClientRect();
        const x = Math.max(7, Math.min(93, (event.clientX - rect.left) / rect.width * 100));
        const y = Math.max(10, Math.min(90, (event.clientY - rect.top) / rect.height * 100));
        node.style.setProperty("--x", x.toFixed(2));
        node.style.setProperty("--y", y.toFixed(2));
        update();
      });
      node.addEventListener("pointerup", (event) => {
        if (!node.classList.contains("is-dragging")) return;
        node.classList.remove("is-dragging");
        node.releasePointerCapture(event.pointerId);
        document.dispatchEvent(new CustomEvent("htmlppt:changed"));
      });
      node.addEventListener("pointercancel", () => node.classList.remove("is-dragging"));
    });
    new ResizeObserver(update).observe(chart);
    requestAnimationFrame(update);
    chart.__flowchartUpdate = update;
  }

  function initAll() {
    document.querySelectorAll(".deck > .slide [data-flowchart]").forEach(initChart);
  }

  function refreshAll() {
    document.querySelectorAll(".deck > .slide [data-flowchart]").forEach((chart) => chart.__flowchartUpdate?.());
  }

  ready(initAll);
  window.addEventListener("beforeprint", refreshAll);
  const printMedia = window.matchMedia?.("print");
  printMedia?.addEventListener?.("change", (event) => { if (event.matches) refreshAll(); });
  window.HtmlPptFlowcharts = { initAll, refreshAll };
})();
