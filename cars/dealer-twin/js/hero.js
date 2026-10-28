// The hero film: an authored sequence of stills (the maquette renders, car renders, the 3D twin) with camera moves, crossfades and captions,
// drawn on a canvas. Layered motion: the film drifts slower than the page on scroll and leans toward the pointer. One pause control stops it
// (and every other ambient loop); with reduced motion it starts paused on a still and the scene buttons step through it.
import { CFG, $, esc, ambient, onFrame, reducedMQ, narrowMQ, loadImg, sim, pauseBtn, clamp, ease } from "./core.js";

export function initHero() {
  const scenes = CFG.film, cv = $("#filmCanvas"), ctx = cv.getContext("2d"), hero = $("#intro"), film = $("#film"), copy = $("#heroCopy");
  const DUR = 5.2, FADE = 1.1, imgs = new Array(scenes.length).fill(null), bgOf = new Array(scenes.length).fill(null);
  let t = 0, cur = 0, W = 0, H = 0, dirty = true, visible = true, px = 0, py = 0, tx = 0, ty = 0, lastCap = -1;
  // the room powers on first (the Blender loop, dark to lit), then the film takes over; skipped with reduced motion or a paused page
  const po = (CFG.hero || {}).poweron;
  if (po && !reducedMQ.matches && !ambient.paused) {
    const v = document.createElement("video"); v.className = "poweron"; v.muted = true; v.playsInline = true; v.preload = "none"; v.setAttribute("aria-hidden", "true");
    po.sources.forEach(([s, ty]) => { const e = document.createElement("source"); e.src = s; e.type = ty; v.appendChild(e); });
    const tag = document.createElement("span"); tag.className = "chip solid poweron-tag"; tag.textContent = po.label; film.append(v, tag);
    const done = () => { v.classList.remove("on"); tag.remove(); setTimeout(() => v.remove(), 1600); };
    new IntersectionObserver((es, io) => { if (!es[0].isIntersecting) return; io.disconnect(); v.preload = "auto"; v.play().then(() => v.classList.add("on")).catch(done); }, { threshold: .35 }).observe(hero);
    v.addEventListener("ended", done, { once: true }); v.addEventListener("error", done, { once: true });
  }
  const segs = $("#segs");
  segs.innerHTML = scenes.map((s, i) => `<button type="button" aria-label="Scene ${i + 1}: ${esc(s.line)}"><i><b></b></i></button>`).join("");
  const bars = [...segs.querySelectorAll("b")];
  segs.querySelectorAll("button").forEach((b, i) => b.onclick = () => { t = i * DUR + (ambient.paused ? DUR * .6 : 0.01); dirty = true; });

  const srcOf = (s) => s.src;
  async function want(i) { if (imgs[i] && imgs[i]._src === srcOf(scenes[i])) return imgs[i]; const src = srcOf(scenes[i]);
    try { const im = await loadImg(src); bgOf[i] = scenes[i].bg || cornerColour(im); const out = scenes[i].mode === "car" ? feather(im) : im; out._src = src; imgs[i] = out; dirty = true; } catch (e) { /* the next scene still plays */ } return imgs[i]; }
  // a car render fades into its own backdrop through an elliptical mask, so no frame edge shows
  function feather(im) { const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "destination-in"; x.save(); x.translate(w / 2, h * .52); x.scale(1, h / w * 1.08); const g = x.createRadialGradient(0, 0, w * .26, 0, 0, w * .5); g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(-w, -w, w * 2, w * 2); x.restore();
    c.naturalWidth = w; c.naturalHeight = h; return c; }
  function cornerColour(im) { try { const c = document.createElement("canvas"); c.width = c.height = 4; const x = c.getContext("2d"); x.drawImage(im, 0, 0, 40, 40, 0, 0, 4, 4); const d = x.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; } catch (e) { return "#EEE8E6"; } }

  function resize() { const r = cv.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 1.5); W = Math.max(2, Math.round(r.width * k)); H = Math.max(2, Math.round(r.height * k)); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; dirty = true; scenes.forEach((_, i) => { if (imgs[i]) want(i); }); } }
  addEventListener("resize", resize); resize();

  // camera: [cx, cy, zoom] in image space; cover mode crops the still, "car" mode composes a render on its own backdrop beside the headline
  function draw(i, local, alpha) {
    const s = scenes[i], im = imgs[i]; if (!im || alpha <= 0) return;
    const k = ease(clamp(local / (DUR + FADE))), from = s.from, to = s.to, port = W < H;
    const cam = [from[0] + (to[0] - from[0]) * k + tx * .012, from[1] + (to[1] - from[1]) * k + ty * .01, from[2] + (to[2] - from[2]) * k];
    ctx.globalAlpha = alpha;
    if (s.mode === "car") {
      ctx.fillStyle = bgOf[i] || "#EEE8E6"; ctx.fillRect(0, 0, W, H);
      const box = port ? [W * .04, H * .47, W * .92, H * .27] : [W * .53, H * .2, W * .5, H * .64], sc = Math.min(box[2] / im.naturalWidth, box[3] / im.naturalHeight) * cam[2];
      const w = im.naturalWidth * sc, h = im.naturalHeight * sc, x = box[0] + (box[2] - w) / 2 + (cam[0] - .5) * w * .2, y = box[1] + (box[3] - h) / 2 + (cam[1] - .5) * h * .2;
      ctx.drawImage(im, x, y, w, h);
    } else {
      const iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(W / iw, H / ih) * cam[2], sw = W / sc, sh = H / sc;
      const sx = clamp(cam[0] * iw - sw / 2, 0, iw - sw), sy = clamp(cam[1] * ih - sh / 2, 0, ih - sh);
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }
  function render() {
    const n = scenes.length, total = n * DUR; t = ((t % total) + total) % total; const i = Math.floor(t / DUR), local = t - i * DUR, prev = (i - 1 + n) % n;
    if (!imgs[i]) { want(i); if (imgs[prev]) { ctx.clearRect(0, 0, W, H); draw(prev, Math.min(local + DUR, DUR + FADE), 1); } return; }
    ctx.clearRect(0, 0, W, H);
    // crossfade: the previous scene keeps moving under the new one for FADE seconds
    if (local < FADE && imgs[prev]) { draw(prev, local + DUR, 1); draw(i, local, ease(local / FADE)); } else draw(i, local, 1);
    want((i + 1) % n);
    bars.forEach((b, k) => { b.style.width = (k < i ? 100 : k > i ? 0 : (local / DUR) * 100) + "%"; });
    if (i !== lastCap) { lastCap = i; caption(i); }
  }
  const capT = $("#capT"), capN = $("#capN");
  function caption(i) { const s = scenes[i]; capT.classList.add("out"); setTimeout(() => { capT.innerHTML = `<small>${esc(s.label)}</small>${esc(s.line)}`; capN.textContent = `${String(i + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`; capT.classList.remove("out"); }, reducedMQ.matches ? 0 : 220); }

  // pause: one control for every ambient loop on the page
  const pb = $("#filmPause"); pauseBtn(pb, ambient.paused, "motion");
  pb.onclick = () => ambient.set(!ambient.paused);
  ambient.on((p) => { pauseBtn(pb, p, "motion"); dirty = true; });
  if (reducedMQ.matches) t = DUR * .6; // a settled frame of the first scene

  // layered motion: pointer lean and scroll drift (scroll drift is off with reduced motion; it answers the visitor's own scrolling)
  hero.addEventListener("pointermove", (e) => { const r = hero.getBoundingClientRect(); px = (e.clientX - r.left) / r.width * 2 - 1; py = (e.clientY - r.top) / r.height * 2 - 1; });
  hero.addEventListener("pointerleave", () => { px = py = 0; });
  let sy = -1;
  function scrolled() { const y = scrollY - hero.offsetTop; if (y === sy) return; sy = y; if (reducedMQ.matches) return; const h = hero.offsetHeight; if (y > h || y < -innerHeight) return;
    film.style.transform = `translate3d(0,${(y * .32).toFixed(1)}px,0) scale(${(1 + Math.max(0, y) / h * .06).toFixed(4)})`;
    const k = Math.max(0, y); copy.style.transform = `translate3d(0,${(-k * .12).toFixed(1)}px,0)`; copy.style.opacity = String(clamp(1 - k / (h * .7), 0, 1)); }
  addEventListener("scroll", scrolled, { passive: true });
  try { new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }).observe(hero); } catch (e) { }

  want(0).then(() => { render(); });
  onFrame((dt) => {
    if (!visible) return;
    const lean = !ambient.paused && !narrowMQ.matches; tx += ((lean ? px : 0) - tx) * Math.min(1, dt * 3); ty += ((lean ? py : 0) - ty) * Math.min(1, dt * 3);
    if (!ambient.paused) { t += dt; render(); } else if (dirty) { dirty = false; render(); }
  });

  // live numbers from the simulated day
  const hH = $("#hHoist"), hP = $("#hPeople"), hL = $("#hLeads"), hC = $("#hClock");
  const live = (L) => { hH.innerHTML = `${L.s.inShop}<small>/${sim.S.bays}</small>`; hP.textContent = L.people; hL.textContent = L.leadsT; hC.textContent = `${sim.dayName()} ${sim.clock()}`; };
  sim.on(live); live(sim.live());

  // the bar gets a hairline once the page has moved
  const bar = $("#bar"); addEventListener("scroll", () => bar.classList.toggle("scrolled", scrollY > 8), { passive: true });
}
