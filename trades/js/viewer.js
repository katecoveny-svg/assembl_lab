// The plan viewer: pdf.js renders one page to a canvas, an SVG overlay carries the measurements, and a CSS transform does pan
// and zoom (drag, wheel, pinch, buttons). Coordinates handed out are PDF points at viewport scale 1, y down.
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function createViewer({ viewer, stage, canvas, overlay, msg, onTap, onFinish, onCursor, onView }) {
  const st = { doc: null, page: null, W: 0, H: 0, zoom: 1, tx: 0, ty: 0, tool: "pan", items: [], ptrs: new Map(), down: null, pinch: null, raf: 0 };
  const say = (t) => { if (!t) { msg.hidden = true; return; } msg.hidden = false; msg.textContent = t; };

  async function load(src, label) {
    say(`Loading ${label || "the sheet"}…`);
    try {
      if (st.doc) { try { await st.doc.destroy(); } catch (e) { /* ignore */ } }
      st.doc = await pdfjsLib.getDocument(typeof src === "string" ? { url: src } : { data: src }).promise;
      await showPage(1);
      say(null);
      return { pages: st.doc.numPages, W: st.W, H: st.H };
    } catch (e) { say("Couldn't open that PDF: " + String(e && e.message || e).slice(0, 80)); throw e; }
  }
  async function showPage(n) {
    st.page = await st.doc.getPage(n);
    const vp1 = st.page.getViewport({ scale: 1 }); st.W = vp1.width; st.H = vp1.height;
    const k = Math.min(3, Math.max(1.5, (2200 / st.W))) * Math.min(2, window.devicePixelRatio || 1);
    const vp = st.page.getViewport({ scale: k });
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    stage.style.width = st.W + "px"; stage.style.height = st.H + "px";
    overlay.setAttribute("viewBox", `0 0 ${st.W} ${st.H}`);
    await st.page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport: vp }).promise;
    fit();
  }
  function apply() { stage.style.transform = `translate(${st.tx}px,${st.ty}px) scale(${st.zoom})`; if (!st.raf) st.raf = requestAnimationFrame(() => { st.raf = 0; render(); if (onView) onView(st); }); }
  function fit() {
    const r = viewer.getBoundingClientRect(); if (!st.W || !r.width) return;
    st.zoom = Math.min((r.width - 24) / st.W, (r.height - 24) / st.H);
    st.tx = (r.width - st.W * st.zoom) / 2; st.ty = (r.height - st.H * st.zoom) / 2; apply();
  }
  function zoomAt(f, cx, cy) {
    const z = Math.min(12, Math.max(0.1, st.zoom * f)); f = z / st.zoom;
    st.tx = cx - (cx - st.tx) * f; st.ty = cy - (cy - st.ty) * f; st.zoom = z; apply();
  }
  const centre = () => { const r = viewer.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
  const toPage = (clientX, clientY) => { const r = viewer.getBoundingClientRect(); return [(clientX - r.left - st.tx) / st.zoom, (clientY - r.top - st.ty) / st.zoom]; };

  // ---------------------------------------------------------------- overlay
  function render() {
    const z = st.zoom, fs = 11 / z, rad = 4.5 / z, out = [];
    for (const it of st.items) {
      const c = it.colour || "#A9C9F2", cls = `${it.draft ? "m-draft" : ""} ${it.hl ? "m-hl" : ""} ${it.fresh ? "m-new" : ""}`, multi = Array.isArray(it.pts[0]) && Array.isArray(it.pts[0][0]), P = multi ? it.pts.flat() : it.pts;
      if (!P.length) continue;
      let g = `<g class="${cls}" style="--c:${c}">`;
      if (it.kind === "pin") { const [x, y] = P[0]; out.push(g + `<circle class="m-pin-ring" cx="${x}" cy="${y}" r="${rad * 2.6}"/><circle class="m-pin" cx="${x}" cy="${y}" r="${rad * 1.3}"/>${it.label ? `<text class="m-lab" x="${x}" y="${y - rad * 3.6}" text-anchor="middle" font-size="${fs}">${esc(it.label)}</text>` : ""}</g>`); continue; }
      if (multi) { g += it.pts.map((run) => `<polyline class="m-line" points="${run.map((p) => p.join(",")).join(" ")}"/>`).join(""); if (it.label) g += `<text class="m-lab" x="${cen(P)[0]}" y="${cen(P)[1]}" text-anchor="middle" font-size="${fs}">${esc(it.label)}</text>`; out.push(g + "</g>"); continue; }
      if (it.kind === "scale") g += `<path class="m-scale" d="M${P.map((p) => p.join(" ")).join("L")}"/>`;
      else if (it.kind === "area") g += P.length > 2 ? `<polygon class="m-area" points="${P.map((p) => p.join(",")).join(" ")}"/>` : `<polyline class="m-line" points="${P.map((p) => p.join(",")).join(" ")}"/>`;
      else if (it.kind === "length") g += `<polyline class="m-line" points="${P.map((p) => p.join(",")).join(" ")}"/>`;
      if (it.kind === "count" || it.draft || it.kind === "scale") g += P.map((p, i) => `<circle class="m-pt" cx="${p[0]}" cy="${p[1]}" r="${it.kind === "count" ? rad * 1.5 : rad}"/>${it.kind === "count" ? `<text class="m-lab" x="${p[0]}" y="${p[1] - rad * 2.2}" text-anchor="middle" font-size="${fs}">${i + 1}</text>` : ""}`).join("");
      if (it.label) { const a = it.kind === "length" || it.kind === "scale" ? mid(P) : it.kind === "count" ? P[P.length - 1] : cen(P); g += `<text class="m-lab" x="${a[0]}" y="${a[1] + (it.kind === "count" ? -rad * 4.5 : fs * .35)}" text-anchor="middle" font-size="${fs}">${esc(it.label)}</text>`; }
      out.push(g + "</g>");
    }
    overlay.innerHTML = out.join("");
  }
  const cen = (P) => P.reduce((c, p) => [c[0] + p[0] / P.length, c[1] + p[1] / P.length], [0, 0]);
  const mid = (P) => { if (P.length < 2) return P[0]; const a = P[Math.floor((P.length - 1) / 2)], b = P[Math.ceil((P.length - 1) / 2)] || a; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  function setItems(items) { st.items = items; render(); }

  // ---------------------------------------------------------------- pointers: drag pans, tap measures, two fingers pinch
  viewer.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button > 1) return;
    viewer.setPointerCapture(e.pointerId); st.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (st.ptrs.size === 2) { const [a, b] = [...st.ptrs.values()]; st.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; st.down = null; return; }
    st.down = { x: e.clientX, y: e.clientY, tx: st.tx, ty: st.ty, moved: false, t: Date.now() };
  });
  viewer.addEventListener("pointermove", (e) => {
    if (st.ptrs.has(e.pointerId)) st.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (st.pinch && st.ptrs.size === 2) {
      const [a, b] = [...st.ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], r = viewer.getBoundingClientRect();
      st.tx += m[0] - st.pinch.m[0]; st.ty += m[1] - st.pinch.m[1];
      zoomAt(d / (st.pinch.d || d), m[0] - r.left, m[1] - r.top); st.pinch = { d, m }; return;
    }
    if (st.down) {
      const dx = e.clientX - st.down.x, dy = e.clientY - st.down.y;
      if (!st.down.moved && Math.hypot(dx, dy) > 5) { st.down.moved = true; viewer.classList.add("dragging"); }
      if (st.down.moved) { st.tx = st.down.tx + dx; st.ty = st.down.ty + dy; apply(); }
    }
    if (onCursor && e.pointerType !== "touch") onCursor(toPage(e.clientX, e.clientY));
  });
  const up = (e) => {
    st.ptrs.delete(e.pointerId); if (st.ptrs.size < 2) st.pinch = null;
    viewer.classList.remove("dragging");
    if (st.down && !st.down.moved && e.type === "pointerup" && st.tool !== "pan" && st.W) onTap(toPage(e.clientX, e.clientY), e);
    st.down = null;
  };
  viewer.addEventListener("pointerup", up); viewer.addEventListener("pointercancel", up);
  viewer.addEventListener("dblclick", (e) => { e.preventDefault(); if (onFinish) onFinish(); });
  viewer.addEventListener("wheel", (e) => { e.preventDefault(); const r = viewer.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  viewer.addEventListener("keydown", (e) => {
    if (e.key === "+" || e.key === "=") zoomAt(1.25, ...centre()); else if (e.key === "-") zoomAt(0.8, ...centre()); else if (e.key === "0") fit();
    else if (e.key === "Enter" && onFinish) onFinish();
    else if (/^Arrow/.test(e.key)) { const d = 40; st.tx += e.key === "ArrowLeft" ? d : e.key === "ArrowRight" ? -d : 0; st.ty += e.key === "ArrowUp" ? d : e.key === "ArrowDown" ? -d : 0; apply(); } else return;
    e.preventDefault();
  });
  let rt = 0; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fit, 120); });

  // the page's text layer, flattened to { str, x, y, w, h } in page points, y down (x left edge, y the line's middle)
  async function textItems() {
    if (!st.page) return [];
    const tc = await st.page.getTextContent(), vp = st.page.getViewport({ scale: 1 });
    return tc.items.filter((t) => t.str && t.str.trim()).map((t) => { const [, , c, d, e, f] = t.transform, [x, y] = vp.convertToViewportPoint(e, f), h = Math.hypot(c, d) || 8; return { str: t.str, x, y: y - h * 0.35, w: t.width || t.str.length * h * 0.5, h }; });
  }
  return { load, fit, textItems, zoomIn: () => zoomAt(1.25, ...centre()), zoomOut: () => zoomAt(0.8, ...centre()), setItems, setTool: (t) => { st.tool = t; viewer.dataset.tool = t; }, say, state: st,
    focusOn(pts) { if (!pts || !pts.length) return; if (Array.isArray(pts[0][0])) pts = pts.flat(); const r = viewer.getBoundingClientRect(), c = cen(pts); st.tx = r.width / 2 - c[0] * st.zoom; st.ty = r.height / 2 - c[1] * st.zoom; apply(); } };
}
