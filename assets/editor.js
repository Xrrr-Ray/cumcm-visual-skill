(function () {
  "use strict";
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }

  ready(function () {
    const deck = document.querySelector(".deck");
    if (!deck) return;
    if (new URLSearchParams(location.search).get("export") === "1") document.body.dataset.exporting = "true";
    const storageKey = `html-ppt-edit:${location.pathname}:${document.title}`;
    const initialHtml = deck.innerHTML;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { deck.innerHTML = JSON.parse(saved).html; } catch (error) { console.warn("HTML-PPT 保存内容无法恢复", error); }
    }

    let saveTimer = null;
    function sanitizeClone() {
      const clone = deck.cloneNode(true);
      clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
      clone.querySelectorAll(".flowchart-svg,.flow-edge-label").forEach((el) => el.remove());
      clone.querySelectorAll("[data-flowchart-ready]").forEach((el) => el.removeAttribute("data-flowchart-ready"));
      return clone.innerHTML;
    }
    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => localStorage.setItem(storageKey, JSON.stringify({ savedAt: new Date().toISOString(), html: sanitizeClone() })), 120);
    }
    function activeSlide() { return deck.querySelector(".slide.is-active") || deck.querySelector(".slide"); }
    function reloadAfterMutation() { localStorage.setItem(storageKey, JSON.stringify({ savedAt: new Date().toISOString(), html: sanitizeClone() })); location.reload(); }
    function setEditing(enabled) {
      document.body.classList.toggle("is-editing", enabled);
      deck.querySelectorAll("[data-editable]").forEach((el) => el.setAttribute("contenteditable", enabled ? "true" : "false"));
      toolbar.querySelector('[data-action="edit"]').textContent = enabled ? "演示" : "编辑";
      window.HtmlPptFlowcharts?.refreshAll();
    }

    const toolbar = document.createElement("div");
    toolbar.className = "html-ppt-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.innerHTML = `<button data-action="edit">编辑</button><button class="edit-only" data-action="up">上移</button><button class="edit-only" data-action="down">下移</button><button class="edit-only" data-action="duplicate">复制页</button><button class="edit-only" data-action="delete">删除页</button><button class="edit-only" data-action="reset">恢复</button><button data-action="check">检查</button><button data-action="print">PDF</button>`;
    document.body.appendChild(toolbar);
    setEditing(false);

    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const slide = activeSlide();
      if (action === "edit") setEditing(!document.body.classList.contains("is-editing"));
      if (action === "duplicate" && slide) { slide.after(slide.cloneNode(true)); reloadAfterMutation(); }
      if (action === "delete" && slide && deck.querySelectorAll(".slide").length > 1) { slide.remove(); reloadAfterMutation(); }
      if (action === "up" && slide?.previousElementSibling) { slide.previousElementSibling.before(slide); reloadAfterMutation(); }
      if (action === "down" && slide?.nextElementSibling) { slide.nextElementSibling.after(slide); reloadAfterMutation(); }
      if (action === "reset") { localStorage.removeItem(storageKey); deck.innerHTML = initialHtml; location.reload(); }
      if (action === "check") {
        const report = window.HtmlPptInspector?.run() || { status: "BLOCKED", reason: "检查器尚未加载" };
        const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: "application/json" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "validation-report.json"; link.click(); URL.revokeObjectURL(link.href);
      }
      if (action === "print") window.print();
    });

    deck.addEventListener("input", save);
    document.addEventListener("htmlppt:changed", save);
    document.addEventListener("keydown", (event) => { if (event.key.toLowerCase() === "e" && !event.ctrlKey && !event.metaKey) setEditing(!document.body.classList.contains("is-editing")); });

    let drag = null;
    deck.addEventListener("pointerdown", (event) => {
      const target = event.target.closest("[data-draggable]");
      if (!target || target.classList.contains("flow-node") || !document.body.classList.contains("is-editing")) return;
      const current = target.dataset.translate ? target.dataset.translate.split(",").map(Number) : [0, 0];
      drag = { target, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: current[0], originY: current[1] };
      target.setPointerCapture(event.pointerId);
    });
    deck.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const x = drag.originX + event.clientX - drag.startX;
      const y = drag.originY + event.clientY - drag.startY;
      drag.target.dataset.translate = `${x},${y}`;
      drag.target.style.translate = `${x}px ${y}px`;
    });
    deck.addEventListener("pointerup", (event) => { if (drag?.pointerId === event.pointerId) { drag.target.releasePointerCapture(event.pointerId); drag = null; save(); } });

    deck.addEventListener("click", (event) => {
      const target = event.target.closest("[data-replaceable-image]");
      if (!target || !document.body.classList.contains("is-editing")) return;
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
      input.addEventListener("change", () => {
        const file = input.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = () => { target.style.backgroundImage = `url(${reader.result})`; target.style.backgroundSize = "cover"; target.firstElementChild?.remove(); save(); }; reader.readAsDataURL(file);
      });
      input.click();
    });

    window.addEventListener("beforeprint", () => { document.body.dataset.exporting = "true"; setEditing(false); });
    window.addEventListener("afterprint", () => { delete document.body.dataset.exporting; });
    window.HtmlPptEditor = { save, setEditing, storageKey };
  });
})();
