// Listing studio: the photo as supplied against the studio version (a drag to compare), the gate each listing passes, a wall of cars shot
// the same way, and the 3D walkthrough example (the splat viewer loads only when asked for; the capture is 7.8 MB).
import { CFG, $, esc, fmt, chip, loadCSS } from "./core.js";

export function initStudio() {
  const ST = CFG.studio, before = $("#baBefore"), after = $("#baAfter"), thumbs = $("#baThumbs"), gate = $("#gate");
  thumbs.innerHTML = ST.items.map((it, i) => `<button type="button" aria-pressed="${i === 0}" aria-label="${esc(it.title)}"><img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async"></button>`).join("");
  thumbs.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; const i = [...thumbs.children].indexOf(b); show(i); };
  function show(i) {
    const it = ST.items[i]; [...thumbs.children].forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
    before.src = it.before; before.alt = `${it.title}, as supplied`; after.src = it.after; after.alt = `${it.title}, studio version`;
    const li = (ok, text, val) => `<li class="${ok ? "" : "no"}"><i>${ok ? "✓" : "!"}</i><span>${esc(text)}</span><small>${esc(val || "")}</small></li>`;
    gate.innerHTML = [
      li(true, "Background replaced, car untouched", it.mode === "studio" ? "cut-out" : "normalised"),
      li(true, it.plates ? `Number plate blurred` : "No plate in shot", it.plates ? `×${it.plates}` : ""),
      li(it.deltaAB == null || it.deltaAB <= 2, "Colour unchanged", it.deltaAB != null ? `Δ ${fmt(it.deltaAB, 2)} of 2.0` : "checked"),
      li(it.mode === "studio", it.mode === "studio" ? "Cut-out passed both models" : "Low cut-out confidence: kept normalised only", it.iou != null ? `IoU ${fmt(it.iou, 3)}` : it.score != null ? `score ${fmt(it.score, 2)}` : ""),
      li(true, "Original kept beside it", "always"),
      li(it.notice == null || it.notice[0] === it.notice[1], "Consumer Information Notice", it.notice ? `${it.notice[0]} of ${it.notice[1]}` : ""),
    ].join("");
    $("#gateH").textContent = it.title; $("#readyChip").textContent = it.truth || "Simulated";
    const ok = it.mode === "studio" && (!it.notice || it.notice[0] === it.notice[1]);
    $("#ready").querySelector("b").textContent = ok ? "Ready to list, agent-ready" : "Needs a person before it lists";
    $("#ready").style.background = ok ? "" : "var(--ink)";
  }
  show(0);
  $("#studioEvB").innerHTML = ST.evidence;
  $("#wall").innerHTML = ST.wall.map((w) => `<img src="${esc(w.src)}" alt="${esc(w.alt)}" loading="lazy" decoding="async" width="400" height="300">`).join("");
  $("#wallCap").textContent = ST.wallCap; $("#wallChip").textContent = ST.wallTruth || "Simulated";
  $("#wfStats").innerHTML = ST.stats.map(([v, l, t]) => `<div class="kpi"><b>${v}</b><span>${esc(l)}</span>${chip(t)}</div>`).join("");

  // ---------------------------------------------------------------- 3D walkthrough example
  const goW = $("#walkGo");
  goW.onclick = async () => {
    goW.disabled = true; goW.textContent = "Loading the capture…";
    const host = $("#walkHost"), m = document.createElement("div"); m.className = "mount";
    try {
      loadCSS("assets/walk/viewer.css");
      const mod = await import(new URL("../assets/walk/viewer.js", import.meta.url).href);
      host.innerHTML = ""; host.appendChild(m);
      await (mod.mount || mod.default.mount)(m, { manifest: "assets/walk/mx5-rf-sample.manifest.json", spec: "assets/walk/mazda-mx5-rf-homura-nz-2026.json", theme: "light", autoRotate: false });
    } catch (e) { goW.disabled = false; goW.textContent = "The walkthrough couldn't start here. Try again"; console.warn(e); }
  };
}
