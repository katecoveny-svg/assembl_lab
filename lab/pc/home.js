// assembl lab · the home's point-cloud journey. One cloud, on a sticky stage behind the opening chapters: it assembles as Tāmaki
// Makaurau Auckland in the hero (open map data at true scale, heights exaggerated; lab/pc/auckland.js), with callouts on real public
// landmarks and the twins pinned on real sites of their kind as examples. It loosens into a calm field behind the doors and
// re-forms as the Plan Studio demo hall in the architecture chapter, where callouts (real DOM text) are tied to real parts of the
// building by leader lines. Without WebGL, or with the script blocked, the page is the complete site-v2 story with a still of the
// same map and the callouts as lists.
import * as THREE from "three";
import { createEngine } from "./engine.js";
import { fieldForm, hallForm } from "./forms.js";
import { aucklandForm } from "./auckland.js";

const run = document.querySelector(".pc-run"), canvas = document.getElementById("pc-canvas"), svg = document.querySelector(".pc-leaders"), root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TILT = 0.66, HERO_SWAY = 0.3;                  // the map seen from about 40° up; a slow sway, small so the map keeps its place
let engine;
try { engine = createEngine(canvas, { reduceMotion: reduce }); } catch (e) { console.warn("Point cloud unavailable:", e.message); }
if (engine && run) start();

async function start() {
  root.classList.add("pc-on");                        // the canvas stays transparent (opacity 0) until its first frame: the still shows
  engine.resize();                                    // the camera must know the stage's real shape before anything is placed
  const phone = innerWidth < 760;
  let world;
  try { world = await aucklandForm(engine.N); } catch (e) { console.warn("Auckland points:", e.message); root.classList.remove("pc-on"); engine.dispose(); return; }
  const forms = { world, field: fieldForm(Math.min(engine.N, 160000)) };
  // where on screen a chapter wants the cloud
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const worldAt = (sx, sy) => { const w = canvas.clientWidth, h = canvas.clientHeight; engine.camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), engine.camera); ray.ray.intersectPlane(plane, hit); return [hit.x, hit.y, 0]; };
  const slotX = (el, fallback) => { if (!el) return fallback; const r = el.getBoundingClientRect(); return r.width ? r.left + r.width / 2 : fallback; };
  // fit the map into the still's own box (the box the still fills), so the still and the live cloud sit in the same place
  const sample = []; for (let i = 0; i < world.n; i += Math.max(1, Math.floor(world.n / 5000))) sample.push([world.pos[i * 3], world.pos[i * 3 + 1], world.pos[i * 3 + 2]]);
  function fitMap(r) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let offset = worldAt(cx, cy), scale = Math.abs(worldAt(r.right, cy)[0] - worldAt(r.left, cy)[0]) / 2.1;
    const box = () => { const xs = [], ys = []; for (const p of sample) { const q = engine.project(p, { offset, scale, tilt: TILT }); xs.push(q.x); ys.push(q.y); } xs.sort((a, b) => a - b); ys.sort((a, b) => a - b); const at = (v, t) => v[Math.floor(t * (v.length - 1))]; return { x0: at(xs, 0.002), x1: at(xs, 0.998), y0: at(ys, 0.002), y1: at(ys, 0.998) }; };   // as the still is framed (stills.cjs, hero-auckland)
    for (let pass = 0; pass < 4; pass++) {
      let b = box(); scale *= Math.min((r.width * 0.94) / (b.x1 - b.x0), (r.height * 0.94) / (b.y1 - b.y0)); b = box();
      const a = worldAt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2), t = worldAt(cx, cy); offset = [offset[0] + t[0] - a[0], offset[1] + t[1] - a[1], 0];
    }
    return { offset, scale, tilt: TILT };
  }
  const heroBox = () => { const r = document.getElementById("hero-world")?.getBoundingClientRect(); return r && r.width > 40 ? r : { left: innerWidth * 0.45, right: innerWidth, top: 80, bottom: innerHeight, width: innerWidth * 0.55, height: innerHeight - 80 }; };
  const CH = {
    hero: { el: document.getElementById("hero-title")?.closest("section"), form: () => forms.world, place: () => fitMap(heroBox()), sway: HERO_SWAY,
      lift: () => { const r = heroBox(); return [(r.left + r.width / 2) / innerWidth, 1 - (r.top + r.height / 2) / innerHeight]; } },
    jump: { el: document.getElementById("jump"), form: () => forms.field, place: () => ({ offset: [0, phone ? -0.3 : -0.42, 0.2], scale: 1 }), lift: () => [0.5, 0.25] },
    arch: { el: document.getElementById("architecture"), form: () => forms.hall, place: () => { const x = slotX(document.querySelector(".arch-slot"), innerWidth * 0.33), p = worldAt(x, innerHeight * (phone ? 0.34 : 0.55)); return { offset: [p[0], p[1] - 0.16, 0], scale: phone ? 0.6 : 0.86 }; }, lift: () => [phone ? 0.5 : 0.32, 0.55] },
  };
  let active = null, labelsOn = false, labelT, scanT, scanAt = 0, layout = null;
  function go(id, first = false) {
    if (id === active || !CH[id]) return; const c = CH[id], f = c.form(); if (!f) return; active = id;
    engine.resize(); const pl = c.place(); engine.setLift(...c.lift()); engine.setSway(c.sway ?? 1);
    if (first) engine.assembleFrom(f, { ...pl, ms: 3200 }); else engine.setForm(f, { ...pl, ms: 2400 });
    document.querySelectorAll(".arch-callout").forEach((el) => el.classList.toggle("on", id === "arch"));
    labelsOn = false; layout = null; clearTimeout(labelT); clearTimeout(scanT); hideLabels();
    if (id === "hero") {
      const wait = reduce ? 0 : first ? 3300 : 2500;
      labelT = setTimeout(() => { labelsOn = true; layoutLabels(); }, wait);
      // after it assembles, a reading scan passes over the map from the near shore to the far one
      scanT = setTimeout(() => { const [y0, y1] = scanRange(pl); engine.scan(3400, y0, y1); scanAt = performance.now(); }, reduce ? 0 : wait - 300);
    }
    if (id === "arch") { typeCallouts(); setTimeout(() => engine.scan(2800, -0.02, 0.62), reduce ? 0 : 2200); }
  }
  // the map's height range on screen as the scan sees it (world y after the tilt)
  function scanRange(pl) { const ct = Math.cos(pl.tilt), st = Math.sin(pl.tilt); let a = Infinity, b = -Infinity; for (const p of sample) { const y = pl.offset[1] + pl.scale * (ct * p[1] - st * p[2]); if (y < a) a = y; if (y > b) b = y; } return [a - 0.03, b + 0.03]; }

  let shown = false;
  // which chapter holds the middle of the screen
  function pick() {
    let best = null, bestD = Infinity; const mid = innerHeight * 0.5;
    for (const [id, c] of Object.entries(CH)) { if (!c.el) continue; const r = c.el.getBoundingClientRect(); const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bestD) { bestD = d; best = id; } }
    if (best && (best !== "arch" || forms.hall)) go(best);
  }
  addEventListener("scroll", () => requestAnimationFrame(pick), { passive: true });
  // on resize the map is placed again at once; its labels step aside and come back placed for the new screen
  let relayT;
  addEventListener("resize", () => { const c = active && CH[active]; if (c) { engine.resize(); engine.setForm(c.form(), { ...c.place(), immediate: true }); if (active === "hero" && labelsOn) { layout = null; hideLabels(); clearTimeout(relayT); relayT = setTimeout(layoutLabels, 350); } } });
  // only draw while the opening run is on screen, and never in a hidden tab
  const pauseBtn = document.querySelector(".pc-pause");
  new IntersectionObserver(([e]) => { if (e.isIntersecting) engine.start(); else engine.stop(); pauseBtn?.classList.toggle("off-run", !e.isIntersecting); }, { rootMargin: "120px" }).observe(run);
  // leader lines: from each callout to its anchor, drawn on the sticky stage (stage coordinates = the viewport)
  const callouts = [...document.querySelectorAll(".arch-callout")];
  engine.onFrame = (now) => {
    // the canvas fades in only once it has drawn a frame (no black or empty box in between). The still, framed exactly as the live
    // map, stays while the points fly in and land on it, then steps aside: no seam between the picture and the cloud
    if (!shown) { shown = true; requestAnimationFrame(() => root.classList.add("pc-live")); setTimeout(() => root.classList.add("pc-ready"), reduce ? 0 : 2900); }
    if (active === "hero") return drawHero(now);
    if (active !== "arch" || !forms.hall || engine.morphing()) { svg.replaceChildren(); return; }
    const parts = [];
    for (const el of callouts) {
      const a = forms.hall.anchors[el.dataset.anchor]; if (!a) continue; const p = engine.project(a), r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      parts.push(leader(p, r, !el.classList.contains("typed")));
    }
    svg.innerHTML = parts.join("");
  };
  // a leader line from an anchor to a box: straight in when the anchor sits under or beside it, otherwise up a riser and across
  function leader(p, r, fresh) {
    const bx = p.x < r.left ? r.left : p.x > r.right ? r.right : p.x, by = (r.top + r.bottom) / 2, elbow = Math.abs(p.y - by) > 6 && (p.x < r.left || p.x > r.right);
    const d = elbow ? `M${p.x},${p.y} L${p.x},${by} L${bx},${by}` : `M${p.x},${p.y} L${bx},${p.y < r.top ? r.top : p.y > r.bottom ? r.bottom : by}`;
    return `<path d="${d}" class="${fresh ? "new" : ""}"/><circle cx="${p.x}" cy="${p.y}" r="2.5"/><circle cx="${p.x}" cy="${p.y}" r="6" class="ring"/>`;
  }

  // ---------------------------------------------------------------------------------------------- the hero's labels
  // landmarks (name and one fact) and twin pins (the twin and its truth line). Each label is placed once, beside its anchor where
  // it covers no other label, no other anchor and none of the hero's words or buttons, then follows its anchor as the map sways.
  const labels = [...document.querySelectorAll(".hero-callout, .hero-pin")].map((el) => ({ el, pin: el.classList.contains("hero-pin"), key: el.dataset.anchor || el.dataset.site }));
  const anchorOf = (l) => (l.pin ? forms.world.sites?.[l.key] : forms.world.anchors[l.key]);

  function hideLabels() { labels.forEach((l) => l.el.classList.remove("on")); }
  function layoutLabels() {
    const W = innerWidth, H = innerHeight, wide = W >= 1100, compact = W < 1280;
    const avoid = [...document.querySelectorAll(".hero .v2-eyebrow, .hero h1, .hero .lede, .hero .actions, .hero .truth-note, .hero .hero-tags, .v2-nav, .pc-pause, .hero-credit, .askb")]
      .map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.bottom > 0 && r.top < H);
    // who claims space first, when the screen is crowded: the tallest landmarks, then the twins with cards here, then the rest
    const RANK = ["skytower", "bridge", "rangitoto", "maungawhau", "ed", "cars", "waitemata", "store", "cafe", "retail", "stay", "office"], rank = (l) => { const i = RANK.indexOf(l.key); return i < 0 ? 99 : i; };
    const items = labels.filter((l) => anchorOf(l) && (!l.pin || wide)).sort((a, b) => rank(a) - rank(b));
    labels.forEach((l) => l.el.classList.toggle("compact", !l.pin && (compact || l.key === "waitemata")));   // the harbour: its name on the water, as on a chart
    const pts = new Map(items.map((l) => [l, engine.project(anchorOf(l))]));
    const placed = [], lines = []; layout = new Map();
    const hits = (r, a, pad = 8) => !(r.right + pad < a.left || r.left - pad > a.right || r.bottom + pad < a.top || r.top - pad > a.bottom);
    // how much of the map a box would hide: the map's points counted on a 24 px grid, so labels prefer the sea, the sky and the margins
    const CELL = 24, cols = Math.ceil(W / CELL), dens = new Float32Array(cols * Math.ceil(H / CELL));
    // (the sea's faint sheet is open water: fine to cover)
    for (const s of sample) { if (s[1] < 0.0004) continue; const q = engine.project(s); if (q.x >= 0 && q.y >= 0 && q.x < W && q.y < H) dens[Math.floor(q.y / CELL) * cols + Math.floor(q.x / CELL)]++; }
    const cover = (r) => { let c = 0; for (let y = Math.max(0, Math.floor(r.top / CELL)); y <= Math.min(H / CELL - 1, Math.floor(r.bottom / CELL)); y++) for (let x = Math.max(0, Math.floor(r.left / CELL)); x <= Math.min(cols - 1, Math.floor(r.right / CELL)); x++) c += dens[y * cols + x]; return c; };
    const crosses = (p, r, a) => { for (let k = 0; k <= 12; k++) { const t = k / 12, x = p.x + ((r.left + r.right) / 2 - p.x) * t, y = p.y + ((r.top + r.bottom) / 2 - p.y) * t; if (x > a.left && x < a.right && y > a.top && y < a.bottom) return true; } return false; };
    for (const l of items) {
      const p = pts.get(l); if (p.x < 12 || p.x > W - 12 || p.y < 90 || p.y > H - 12) continue;
      if (avoid.some((a) => hits({ left: p.x, right: p.x, top: p.y, bottom: p.y }, a, 4))) continue;   // an anchor under the words: no label
      const w = l.el.offsetWidth, h = l.el.offsetHeight; let best = null;
      for (const dx of [-w - 170, -w - 90, -w - 30, -w * 0.82, -w / 2, -w * 0.18, 30, 90, 170])
        for (const dy of [-h - 320, -h - 260, -h - 200, -h - 150, -h - 104, -h - 64, -h - 30, -h / 2, 30, 70, 120, 180, 240]) {
          const r = { left: p.x + dx, top: p.y + dy, right: p.x + dx + w, bottom: p.y + dy + h };
          if (r.left < 10 || r.top < 84 || r.right > W - 10 || r.bottom > H - 10) continue;
          if (avoid.some((a) => hits(r, a)) || placed.some((a) => hits(r, a))) continue;
          if (items.some((o) => hits(r, { left: pts.get(o).x, right: pts.get(o).x, top: pts.get(o).y, bottom: pts.get(o).y }, o === l ? 14 : 10))) continue;   // never over an anchor, its own included
          if (placed.some((a) => crosses(p, r, a)) || lines.some(([lp, lr]) => crosses(lp, lr, r))) continue;   // no line under a label
          const gx = Math.max(r.left - p.x, 0, p.x - r.right), gy = Math.max(r.top - p.y, 0, p.y - r.bottom), dist = Math.hypot(gx, gy); if (dist > (l.pin ? 110 : 230)) continue; const score = cover(r) + dist * 3.2;   // a twin's label stays close to its site
          if (!best || score < best[0]) best = [score, dx, dy, r];
        }
      if (best) { placed.push(best[3]); lines.push([p, best[3]]); layout.set(l, [best[1], best[2]]); }
    }
  }
  function drawHero(now) {
    const show = labelsOn && layout && !engine.morphing() && scrollY < innerHeight * 0.55; const parts = [];
    for (const l of labels) {
      const off = show && layout.get(l); l.el.classList.toggle("on", !!off); if (!off) continue;
      const p = engine.project(anchorOf(l)), x = Math.round(p.x + off[0]), y = Math.round(p.y + off[1]);
      l.el.style.transform = `translate(${x}px, ${y}px)`;
      parts.push(leader(p, { left: x, top: y, right: x + l.el.offsetWidth, bottom: y + l.el.offsetHeight }, false));
      // a twin's site: a slow reading pulse on its building (a still ring with reduced motion)
      if (l.pin) { const k = reduce ? 0.5 : ((now - scanAt) / 2600 + labels.indexOf(l) * 0.17) % 1; parts.push(`<circle cx="${p.x}" cy="${p.y}" r="${(6 + 16 * k).toFixed(1)}" class="pulse" style="opacity:${(0.75 * (1 - k)).toFixed(2)}"/>`); }
    }
    svg.innerHTML = parts.join("");
  }

  // callout copy types in once, with a rose caret (shown whole with reduced motion)
  let typed = false;
  function typeCallouts() {
    if (typed) return; typed = true;
    for (const [i, el] of callouts.entries()) {
      const t = el.querySelector(".typing"); if (!t) continue; const full = t.textContent;
      if (reduce) { el.classList.add("typed"); continue; }
      t.textContent = ""; t.classList.add("caret"); let k = 0;
      setTimeout(function tick() { k += 2; t.textContent = full.slice(0, k); if (k < full.length) setTimeout(tick, 18); else { t.classList.remove("caret"); el.classList.add("typed"); } }, 2400 + i * 500);
    }
  }
  // go: the first chapter assembles from a scatter
  engine.start(); go("hero", true);
  // the hall is built from the studio's own model code, after the first paint
  hallForm(engine.N).then((h) => { forms.hall = h; pick(); }).catch((e) => console.warn("Hall form:", e.message));
  // Pause motion (icon only)
  const pause = document.querySelector(".pc-pause");
  pause?.removeAttribute("hidden");
  pause?.addEventListener("click", () => { const p = !engine.paused; engine.pause(p); pause.setAttribute("aria-pressed", String(p)); pause.setAttribute("aria-label", p ? "Play motion" : "Pause motion"); });
}
