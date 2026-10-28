// Marketing studio (after assembl's Creative Studio): a four-scene reel for any car, drawn on a canvas in portrait, square or landscape with
// camera moves and captions, recorded to WebM with MediaRecorder where the browser supports it; campaign stills in three visual directions;
// pre-flight checks before anything posts; the brand-guideline board; co-op rebates and hours. Everything is drawn locally from the car record.
import { CFG, D, $, $$, esc, fmt, money, dollars, pct, chip, json, loadImg, sim, download, clamp, ease } from "./core.js";

const SIZES = { portrait: [720, 1280], square: [720, 720], landscape: [1280, 720] };
const SCENE = 2.6, N = 4, TOTAL = SCENE * N;
const SHORT = ["Approved imagery", "Brand mark", "Disclaimer", "Offer terms", "Evidence pack"];

function lum(hex) { const c = hex.replace("#", ""), v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((x) => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

function wrap(ctx, text, maxW) { const words = String(text).split(/\s+/), out = []; let line = ""; for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
// fit: the whole car inside the box on its own backdrop colour (renders and studio photos sit on a plain backdrop), with a little push
function fit(ctx, im, x, y, w, h, zoom = 1, bg) { if (!im) return; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = bg || backdrop(im); ctx.fillRect(x, y, w, h);
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight) * zoom, dw = im.naturalWidth * s, dh = im.naturalHeight * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore(); }
function feathered(im) { if (im._f) return im._f; const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
  x.globalCompositeOperation = "destination-in"; x.translate(w / 2, h * .52); x.scale(1, h / w * 1.08); const g = x.createRadialGradient(0, 0, w * .26, 0, 0, w * .5); g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(-w, -w, w * 2, w * 2); im._f = c; return c; }
function backdrop(im) { if (im._bg) return im._bg; try { const c = document.createElement("canvas"); c.width = c.height = 2; const x = c.getContext("2d"); x.drawImage(im, 0, 0, 30, 30, 0, 0, 2, 2); const d = x.getImageData(0, 0, 1, 1).data; im._bg = `rgb(${d[0]},${d[1]},${d[2]})`; } catch (e) { im._bg = "#EEE"; } return im._bg; }
function cover(ctx, im, x, y, w, h, zoom = 1, fx = .5, fy = .5) { if (!im) return; const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom, sw = w / s, sh = h / s;
  const sx = clamp(fx * im.naturalWidth - sw / 2, 0, im.naturalWidth - sw), sy = clamp(fy * im.naturalHeight - sh / 2, 0, im.naturalHeight - sh); ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ---------------------------------------------------------------- one frame of the reel
export function paintReel(cv, car, im, t, format, T) {
  const [W, H] = SIZES[format]; if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
  const ctx = cv.getContext("2d"), u = Math.min(W, H) / 100, port = format === "portrait", land = format === "landscape", pad = u * 7;
  const i = Math.min(N - 1, Math.floor(t / SCENE)), local = t - i * SCENE, k = clamp(local / SCENE), rev = ease(clamp(local / .7)), F = T.font;
  ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1;
  const imgBox = port ? [0, 0, W, H * .62] : land ? [W * .42, 0, W * .58, H] : [0, 0, W, H * .6];
  // the car: one continuous camera move across the whole reel, so the cut between scenes never jumps
  const zoom = 1.04 + (t / TOTAL) * .16, fx = .5 + (t / TOTAL - .5) * .06;
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
  if (i < 3) { const ar = imgBox[2] / imgBox[3], iar = im ? im.naturalWidth / im.naturalHeight : 1.33; if (Math.abs(ar - iar) / iar < .2) cover(ctx, im, ...imgBox, zoom, fx, .55); else fit(ctx, im, ...imgBox, ar < iar ? 1 + (t / TOTAL) * .06 : zoom); }
  const txt = (s, x, y, size, weight = 500, colour = T.ink, family = F, align = "left", ls = -.02) => { ctx.font = `${weight} ${size}px ${family}`; ctx.fillStyle = colour; ctx.textAlign = align; try { ctx.letterSpacing = (ls * size) + "px"; } catch (e) { } ctx.fillText(s, x, y); try { ctx.letterSpacing = "0px"; } catch (e) { } };
  const mono = `"IBM Plex Mono", ui-monospace, monospace`;
  const panel = port ? [0, H * .62, W, H * .38] : land ? [0, 0, W * .42, H] : [0, H * .6, W, H * .4];
  if (i === 0) { // the hook: the car, then its name
    ctx.fillStyle = T.paper; ctx.fillRect(...panel);
    ctx.save(); ctx.globalAlpha = rev; ctx.translate(0, (1 - rev) * u * 4);
    txt(T.kicker, panel[0] + pad, panel[1] + pad + u * 3, u * 3.4, 500, T.rose, mono, "left", 0);
    ctx.font = `500 ${u * (land ? 6.4 : 7)}px ${F}`; const lines = wrap(ctx, car.title, panel[2] - pad * 2).slice(0, 3);
    lines.forEach((l, n) => txt(l, panel[0] + pad, panel[1] + pad + u * 13 + n * u * (land ? 7.4 : 8), u * (land ? 6.4 : 7), 500, T.deep, F, "left", -.035));
    ctx.restore();
  } else if (i === 1) { // the price
    ctx.fillStyle = T.deep; ctx.fillRect(...panel);
    ctx.save(); ctx.globalAlpha = rev; ctx.translate(0, (1 - rev) * u * 4);
    txt("Cash price", panel[0] + pad, panel[1] + pad + u * 3, u * 3.4, 500, T.onDeep2, mono, "left", 0);
    txt(dollars(car.priceNzd), panel[0] + pad, panel[1] + pad + u * (land ? 20 : 19), u * (land ? 15 : 17), 500, T.onDeep, F, "left", -.05);
    txt([car.priceNote, `${fmt(car.odometerKm)} km`].filter(Boolean).join(" · "), panel[0] + pad, panel[1] + pad + u * (land ? 28 : 27.5), u * 3.6, 500, T.onDeep2, F, "left", 0);
    ctx.restore();
  } else if (i === 2) { // the facts, one at a time
    ctx.fillStyle = T.paper; ctx.fillRect(...panel);
    const facts = [`${car.year}`, `${fmt(car.odometerKm)} km`, car.fuelLabel, car.seats ? `${car.seats} seats` : null, car.economy ? `${fmt(car.economy.value, 1)} L/100 km est.` : null, car.transmission].filter(Boolean).slice(0, 5);
    let x = panel[0] + pad, y = panel[1] + pad + u * 2; const h = u * 8.4, gap = u * 2;
    txt("The facts", x, y + u * 1, u * 3.4, 500, T.rose, mono, "left", 0); y += u * 5;
    facts.forEach((f, n) => { const a = ease(clamp((local - n * .22) / .45)); if (a <= 0) return; ctx.font = `500 ${u * 3.9}px ${F}`; const w = ctx.measureText(f).width + u * 6;
      if (x + w > panel[0] + panel[2] - pad) { x = panel[0] + pad; y += h + gap; }
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * u * 3); ctx.fillStyle = T.chalk; rr(ctx, x, y, w, h, T.round ? h / 2 : 2); ctx.fill(); txt(f, x + u * 3, y + h * .64, u * 3.9, 500, T.deep, F, "left", -.01); ctx.restore(); x += w + gap; });
  } else { // the call to action
    ctx.fillStyle = T.deep; ctx.fillRect(0, 0, W, H);
    if (im) { ctx.save(); ctx.globalAlpha = .9; const s = land ? [W * .5, H * .12, W * .46, H * .76] : port ? [W * .08, H * .1, W * .84, H * .4] : [W * .3, H * .08, W * .62, H * .48]; ctx.beginPath(); rr(ctx, ...s, T.round ? u * 3 : 2); ctx.clip(); fit(ctx, im, ...s, 1.12 + k * .05); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = rev; ctx.translate(0, (1 - rev) * u * 4);
    const x = pad, y0 = land ? H * .34 : port ? H * .6 : H * .66;
    ctx.font = `500 ${u * (land ? 7.2 : 8)}px ${F}`; wrap(ctx, T.cta, land ? W * .42 : W - pad * 2).slice(0, 2).forEach((l, n) => txt(l, x, y0 + n * u * (land ? 8.2 : 9), u * (land ? 7.2 : 8), 500, T.onDeep, F, "left", -.04));
    txt(T.dealer, x, y0 + u * (land ? 22 : 24), u * 3.8, 500, T.onDeep2, F, "left", 0);
    if (car.region) txt(car.region, x, y0 + u * (land ? 27 : 29.5), u * 3.4, 500, T.onDeep2, mono, "left", 0);
    ctx.restore();
  }
  // every frame: scene progress and the truth label
  const dark = i === 3 || (i === 1 && !port && !land) ;
  const barY = u * 3.4, bw = (W - pad * 2 - u * 1.2 * (N - 1)) / N;
  for (let n = 0; n < N; n++) { const x = pad + n * (bw + u * 1.2); ctx.fillStyle = i === 3 ? "rgba(255,255,255,.25)" : "rgba(36,11,33,.16)"; ctx.fillRect(x, barY, bw, Math.max(2, u * .5)); ctx.fillStyle = i === 3 ? T.onDeep : T.deep; ctx.fillRect(x, barY, bw * (n < i ? 1 : n > i ? 0 : k), Math.max(2, u * .5)); }
  const lbl = `${T.truth} · ${T.brandLine}`; ctx.font = `500 ${u * 2.6}px ${mono}`; const lw = ctx.measureText(lbl).width + u * 4;
  const ly = H - u * 6.2, lx = W - pad - lw; ctx.fillStyle = (i === 3 || (i === 1 && (land || port) && false)) ? "rgba(255,255,255,.12)" : "rgba(255,253,251,.9)"; rr(ctx, lx, ly - u * 3.4, lw, u * 5, T.round ? u * 2.5 : 2); ctx.fill();
  txt(lbl, lx + u * 2, ly, u * 2.6, 500, i === 3 ? T.onDeep : T.deep, mono, "left", 0);
  void dark;
}

export async function initMarket() {
  const stock = await json(CFG.stockUrl).catch(() => ({ cars: [] }));
  const cars = (stock.cars || []).filter((c) => c.img && c.img.card), pick = CFG.market.featured.map((id) => cars.find((c) => c.id === id)).filter(Boolean);
  const list = pick.length ? pick : cars.slice(0, 10);
  const T = CFG.market.tokens, cv = $("#reel"), screen = $("#screen");
  let car = list[0], im = null, format = matchMedia("(max-width: 760px)").matches ? "portrait" : "portrait", playing = false, t0 = 0, raf = 0, rec = null;
  await document.fonts.load(`500 40px "Instrument Sans"`).catch(() => {}); await document.fonts.load(`500 20px "IBM Plex Mono"`).catch(() => {});
  $("#picker").innerHTML = list.map((c, i) => `<button type="button" aria-pressed="${i === 0}" data-i="${i}"><img src="${esc(c.img.sq || c.img.card)}" alt="" decoding="async"><span>${esc(c.year + " " + c.make + " " + c.model)}</span><span style="color:var(--rose);font-family:var(--mono);font-size:11px">${dollars(c.priceNzd)}</span></button>`).join("");
  $("#picker").onclick = async (e) => { const b = e.target.closest("[data-i]"); if (!b || rec) return; $$("#picker button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); car = list[+b.dataset.i]; await loadCar(); stills(); preflight(); };
  $$("#fmt button").forEach((b) => b.onclick = () => { if (rec) return; format = b.dataset.f; $$("#fmt button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); screen.className = "screen " + format; still(); });
  async function loadCar() { try { im = await loadImg(car.img.card); } catch (e) { im = null; } still(); }
  const still = () => { if (!playing) paintReel(cv, car, im, SCENE + 1.6, format, T); };
  const play = $("#reelPlay");
  play.onclick = () => { playing = !playing; play.textContent = playing ? "Pause preview" : "Play preview"; if (playing) { t0 = performance.now(); loop(); } else { cancelAnimationFrame(raf); still(); } };
  function loop() { if (!playing) return; const t = ((performance.now() - t0) / 1000) % TOTAL; paintReel(cv, car, im, t, format, T); raf = requestAnimationFrame(loop); }
  await loadCar();

  // ---------------------------------------------------------------- record the reel (MediaRecorder, WebM first)
  const recBtn = $("#reelRec"), prog = $("#reelProg"), out = $("#reelOut"), st = $("#reelStatus");
  recBtn.onclick = async () => {
    if (rec) return;
    if (typeof MediaRecorder === "undefined" || !cv.captureStream) { st.textContent = "This browser can't record canvas video. The preview still plays; try current Chrome, Edge or Firefox to download."; return; }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) { st.textContent = "No video encoder is available in this browser."; return; }
    playing = false; play.textContent = "Play preview"; cancelAnimationFrame(raf); play.disabled = true; recBtn.disabled = true; prog.hidden = false; st.textContent = "Recording in this tab, about ten seconds. Keep the tab open.";
    const stream = cv.captureStream(30), r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4e6 }), chunks = [];
    rec = r; r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res, rej) => { r.onstop = res; r.onerror = () => rej(new Error("The browser stopped the recording.")); });
    r.start(500); const s0 = performance.now();
    await new Promise((res) => { const step = () => { const t = (performance.now() - s0) / 1000; paintReel(cv, car, im, Math.min(t, TOTAL - .01), format, T); prog.firstElementChild.style.width = (clamp(t / TOTAL) * 100).toFixed(1) + "%"; if (t < TOTAL) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
    r.stop();
    try { await done; const blob = new Blob(chunks, { type: r.mimeType || mime }), ext = (r.mimeType || mime).includes("mp4") ? "mp4" : "webm";
      if (!blob.size) throw new Error("No frames were captured.");
      const url = URL.createObjectURL(blob), name = `${CFG.market.filePrefix}-${car.id}-${format}.${ext}`;
      out.hidden = false; out.innerHTML = `<video src="${url}" muted playsinline loop autoplay aria-label="The recorded reel"></video><div style="display:grid;gap:4px;flex:1;min-width:150px"><b style="color:var(--deep);font-weight:500">Your reel is ready</b><span class="fine">${esc(format)} · ${TOTAL.toFixed(0)} s · ${ext.toUpperCase()} · ${fmt(blob.size / 1024)} KB</span></div><a class="btn sm" id="reelDl" href="${url}" download="${esc(name)}">Download</a><button class="btn ghost sm" type="button" id="vttDl">Captions</button>`;
      $("#vttDl").onclick = () => download(new Blob([vtt()], { type: "text/vtt" }), name.replace(/\.\w+$/, ".vtt"));
      st.textContent = "";
    } catch (e) { st.textContent = e.message; }
    finally { stream.getTracks().forEach((x) => x.stop()); rec = null; play.disabled = false; recBtn.disabled = false; prog.hidden = true; still(); }
  };
  function vtt() { const c = car, f = (s) => `00:00:${String(Math.floor(s)).padStart(2, "0")}.${String(Math.round((s % 1) * 1000)).padStart(3, "0")}`;
    const lines = [c.title, `${dollars(c.priceNzd)}${c.priceNote ? ", " + c.priceNote : ""}, ${fmt(c.odometerKm)} km`, [c.fuelLabel, c.seats ? c.seats + " seats" : ""].filter(Boolean).join(", "), `${T.cta} ${T.dealer}. ${T.truth}.`];
    return "WEBVTT\n\n" + lines.map((l, i) => `${f(i * SCENE)} --> ${f((i + 1) * SCENE)}\n${l.replace(/-->/g, "→")}\n`).join("\n"); }

  // ---------------------------------------------------------------- pre-flight: what has to be true before it posts
  let reviewer = "";
  function preflight() {
    const c1 = contrast(T.deep, T.paper), headline = car.title.length <= 110, basis = !!car.priceNote && !/not stated/i.test(car.priceNote);
    const rows = [[c1 >= 4.5, `Text contrast ${fmt(c1, 1)}:1`, "4.5:1 or more"], [headline, "Headline length", `${car.title.length} of 110`], [basis, "Price says what it includes", car.priceNote || "not stated"],
      [true, "Truth label on every frame", T.truth], [!!reviewer, "Named reviewer", ""]];
    $("#preflight").innerHTML = rows.map(([ok, l, v], n) => `<li class="${ok ? "" : "x"}"><i></i><span>${esc(l)}</span>${n === 4 ? `<input id="rvw" placeholder="Their name" value="${esc(reviewer)}" aria-label="Reviewer's name">` : `<small>${esc(v)}</small>`}</li>`).join("");
    $("#rvw").onchange = (e) => { reviewer = e.target.value.trim(); preflight(); };
  }
  preflight();

  // ---------------------------------------------------------------- campaign stills: three directions in the brand's tokens
  const DIRS = [["Editorial", "editorial"], ["Statement", "statement"], ["Blueprint", "blueprint"]];
  $("#stills").innerHTML = `<div style="grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:6px"><h3>Campaign stills, three ways.</h3><span class="fine">4:5 for social feeds · drawn in the brand's own colours</span></div>` +
    DIRS.map(([n, k]) => `<div class="still"><canvas width="540" height="675" data-d="${k}" aria-label="${n} campaign still"></canvas><div class="row"><span class="label">${n}</span><button class="btn ghost sm" type="button" data-dl="${k}">Download PNG</button></div></div>`).join("");
  function paintStill(c, kind, scale = 1) {
    const W = 1080 * scale, H = 1350 * scale; c.width = W; c.height = H; const x = c.getContext("2d"), u = W / 100, F = T.font, mono = `"IBM Plex Mono", monospace`;
    const t = (s, X, Y, size, colour, fam = F, w = 500, al = "left") => { x.font = `${w} ${size}px ${fam}`; x.fillStyle = colour; x.textAlign = al; x.fillText(s, X, Y); };
    if (kind === "editorial") { x.fillStyle = T.paper; x.fillRect(0, 0, W, H); fit(x, im, 0, 0, W, H * .6, 1.25); t(T.dealer, u * 7, H * .66, u * 2.6, T.rose, mono);
      x.font = `500 ${u * 7.6}px ${F}`; wrap(x, car.title, W - u * 14).slice(0, 2).forEach((l, n) => t(l, u * 7, H * .66 + u * 10 + n * u * 8.6, u * 7.6, T.deep));
      t(dollars(car.priceNzd), u * 7, H * .9, u * 6.4, T.deep); t(`${fmt(car.odometerKm)} km · ${car.fuelLabel}`, u * 7, H * .9 + u * 5, u * 2.8, T.rose, F, 400); }
    else if (kind === "statement") { x.fillStyle = T.deep; x.fillRect(0, 0, W, H); t("Yours from", u * 7, u * 16, u * 4, T.onDeep2); t(dollars(car.priceNzd), u * 7, u * 34, u * 17, T.onDeep);
      x.save(); x.beginPath(); rr(x, u * 7, H * .42, W - u * 14, H * .4, T.round ? u * 3 : 2); x.clip(); fit(x, im, u * 7, H * .42, W - u * 14, H * .4, 1.12); x.restore(); t(car.title, u * 7, H * .9, u * 3.6, T.onDeep); }
    else { x.fillStyle = T.chalk; x.fillRect(0, 0, W, H); x.strokeStyle = "rgba(36,11,33,.07)"; x.lineWidth = 1; for (let g = 0; g < W; g += u * 5) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, H); x.stroke(); } for (let g = 0; g < H; g += u * 5) { x.beginPath(); x.moveTo(0, g); x.lineTo(W, g); x.stroke(); }
      if (im) { const f = feathered(im), iw = W * .9, ih = iw * im.naturalHeight / im.naturalWidth; x.drawImage(f, W * .05, H * .22, iw, ih); }
      t(car.title, u * 7, u * 12, u * 4.6, T.deep); t(`${T.dealer}`, u * 7, u * 17, u * 2.6, T.rose, mono);
      const callouts = [[`${fmt(car.odometerKm)} km`, .22, .78], [car.fuelLabel, .58, .82], [car.seats ? `${car.seats} seats` : `${car.year}`, .8, .7]];
      callouts.forEach(([s, cx, cy]) => { x.strokeStyle = T.deep; x.lineWidth = u * .18; x.beginPath(); x.moveTo(W * cx, H * .62); x.lineTo(W * cx, H * cy); x.stroke(); x.beginPath(); x.arc(W * cx, H * .62, u * .7, 0, 7); x.fillStyle = T.deep; x.fill(); t(s, W * cx, H * cy + u * 3.6, u * 2.8, T.deep, mono, 500, "center"); });
      t(dollars(car.priceNzd), W - u * 7, H - u * 7, u * 6, T.deep, F, 500, "right"); }
    x.textAlign = "left"; const lbl = `${T.truth} · ${T.brandLine}`; x.font = `500 ${u * 1.9}px ${mono}`; const lw = x.measureText(lbl).width + u * 3;
    x.fillStyle = kind === "statement" ? "rgba(255,255,255,.12)" : "rgba(255,253,251,.92)"; rr(x, u * 7, u * 3, lw, u * 4, T.round ? u * 2 : 2); x.fill(); t(lbl, u * 8.5, u * 5.7, u * 1.9, kind === "statement" ? T.onDeep : T.deep, mono);
  }
  function stills() { $$("#stills canvas").forEach((c) => paintStill(c, c.dataset.d, .5)); }
  $("#stills").onclick = (e) => { const b = e.target.closest("[data-dl]"); if (!b) return; const c = document.createElement("canvas"); paintStill(c, b.dataset.dl, 1); c.toBlob((bl) => download(bl, `${CFG.market.filePrefix}-${car.id}-${b.dataset.dl}.png`), "image/png"); };
  stills();

  // ---------------------------------------------------------------- the brand-guideline board and co-op
  const camps = D.CAMPAIGNS, mq = Object.fromEntries(D.MARQUES.map((m) => [m.k, m.n]));
  $("#ci").innerHTML = `<span class="h h0">Campaign</span>${SHORT.map((s) => `<span class="h">${s}</span>`).join("")}` + camps.map((c) => `<span class="nm">${esc(c.n)}<small>${esc(c.ch)}</small></span>${c.checks.map((ok, k) => `<i class="${ok ? "" : "x"}" title="${esc(D.CI_CHECKS[k])}: ${ok ? "passes" : "needs a fix"}" role="img" aria-label="${esc(SHORT[k])}: ${ok ? "passes" : "needs a fix"}"></i>`).join("")}`).join("");
  $("#ciEv").innerHTML = `<ul>${D.CI_CHECKS.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p>Example campaigns with placeholder imagery only; no distributor's real assets are reproduced. Checks run on each ad before it is booked, and the evidence pack is what a co-op claim needs.</p>`;
  function coop() { const M = D.mktEngine(sim.S, sim.F), top = Math.max(...M.tasks.map((t) => t.h));
    $("#coop").innerHTML = `<div class="kpis"><div class="kpi"><b>${money(M.gain)}</b><span>more co-op claimed a year</span>${chip("prop", "Proposed · Estimate")}</div><div class="kpi"><b>${fmt(M.saved)}<small>h</small></b><span>a month off the marketing team, of ${fmt(M.hours)}</span>${chip("est")}</div></div>
      <div class="bars"><div class="b"><span>Claimed now</span><span class="t"><i style="width:${(M.claimed / M.claimable * 100).toFixed(1)}%"></i></span><b>${money(M.claimed)}</b></div><div class="b"><span>With agents</span><span class="t"><i class="l" style="width:${(M.claimedAuto / M.claimable * 100).toFixed(1)}%"></i></span><b>${money(M.claimedAuto)}</b></div><div class="b"><span>Claimable</span><span class="t"><i style="width:100%;opacity:.25"></i></span><b>${money(M.claimable)}</b></div></div>`;
    $("#coopEv").innerHTML = `<table><thead><tr><th>Task</th><th class="n">Hours a month</th><th class="n">Agents could take</th></tr></thead><tbody>${M.tasks.map((t) => `<tr><td>${esc(t.n)}</td><td class="n">${fmt(t.h)}</td><td class="n">${pct(t.a)}</td></tr>`).join("")}</tbody></table>
      <p>Co-op accrues at about $${D.MKT0.coopPerUnit} a new car, matched ${pct(D.MKT0.coopMatch)} on eligible spend (55% of spend assumed eligible). Today about ${pct(D.MKT0.claimNow)} of claimable is claimed; with evidence packs built as each ad runs, about ${pct(D.MKT0.claimAuto)}. Hours valued at $${D.MKT0.hourRate} an hour. All estimates.</p>`; }
  coop(); sim.onData(coop);
}
