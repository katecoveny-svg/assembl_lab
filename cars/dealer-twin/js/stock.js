// The stock: a wall of cars and one in the spotlight. Tap a car and it takes the stage. A dealer with photos shows its photos (a photo's
// paint is never changed). The demo dealer is fictional and has no photos, so each listing shows a drawing of its body style, labelled
// as such. In the spotlight, "View in 3D" (and only that button) loads a GENERIC Blender-built model of the listing's real body style
// (an Aqua is a hatch, a Hilux a ute) in the listing's colour, labelled "not the actual vehicle". The listing's facts are data.
// Price, badges and truth label on every card; the spotlight shows the notice and how a buyer's assistant reads the same car.
import { CFG, $, $$, esc, fmt, json, ambient } from "./core.js";

const BODY = { hatch: "Hatch", sedan: "Sedan", suv: "SUV", ute: "Ute", van: "Van", wagon: "Wagon" };
const WORD = { hatch: "hatch", sedan: "sedan", wagon: "wagon", suv: "SUV", ute: "ute", van: "van" };
const isDrawing = (c) => c.img && c.img.kind === "drawing";

export async function initStock() {
  const data = await json(CFG.stockUrl), cars = data.cars, wall = $("#wall2"), info = $("#spotInfo"), st = $("#spotStage"), poster = $("#spotPoster"), truth = $("#spotTruth");
  const S = CFG.stock || {}, byBrand = S.filter === "brand", cut = Object.fromEntries(((CFG.hero || {}).cars || []).filter((h) => !h.flat).map((h) => [h.id, h.src]));
  // filters: by brand (the dealer's own brands, then anything else in the used stock), the demo by body style
  const brands = data.brands || [], groups = byBrand
    ? [["All", () => true], ...brands.map((b) => [b, (c) => c.make === b]), ["Other used", (c) => !brands.includes(c.make)]]
    : [["All", () => true], ["SUV", (c) => c.body === "suv"], ["Hatch", (c) => c.body === "hatch"], ["Ute", (c) => c.body === "ute"], ["Van", (c) => c.body === "van"], ["Electric", (c) => c.fuel === "electric"], ["Hybrid", (c) => /hybrid/.test(c.fuel)]];
  const bar = document.createElement("div"); bar.className = "wall-f wrap"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", byBrand ? "Filter by brand" : "Filter by body");
  bar.innerHTML = groups.map(([g, f], i) => { const n = cars.filter(f).length; return n || byBrand ? `<button type="button" data-g="${i}" aria-pressed="${i ? "false" : "true"}"${n ? "" : " disabled"}>${esc(g)} <i>${n}</i></button>` : ""; }).join("");
  wall.before(bar);
  let filt = 0, sel = null, all = false;
  const drawn = cars.some(isDrawing), more = document.createElement("button");
  more.type = "button"; more.className = "btn ghost wall-more"; more.hidden = true; wall.after(more);
  more.addEventListener("click", () => { all = true; draw(); const b = wall.children[24] || wall.children[21]; b && b.focus({ preventScroll: true }); });
  const card = (c, i) => {
    const b = [c.fuelLabel && /electric|hybrid/i.test(c.fuelLabel) ? c.fuelLabel.replace("Petrol hybrid", "Hybrid") : "", /demo/i.test(c.condition || "") ? "Demo" : /new/i.test(c.condition || "") ? "New" : ""].filter(Boolean);
    if (isDrawing(c)) return drawCard(c, b, "wc");
    return `<button class="wc${c.img.kind === "photo" ? " photo" : ""}" type="button" role="listitem" data-id="${esc(c.id)}" aria-pressed="false">
      <img src="${esc(c.img.card)}" alt="${esc(c.img.alt)}" loading="lazy" decoding="async">
      <span class="bd">${b.map((x) => `<span>${esc(x)}</span>`).join("")}<span class="t">${esc(c.img.kind === "photo" ? (S.photoBadge || "Photo") : "Render")}</span></span>
      <span class="turn">Open</span>
      <span class="ov"><b>$${fmt(c.priceNzd)}</b><span>${esc(c.year)} ${esc(c.make)} ${esc(c.model)}${c.odometerKm == null ? "" : ` · ${fmt(c.odometerKm)} km`}</span></span></button>`;
  };
  // "Generic hatchback · drawing, not this car": the body part drops on a narrow card, the honesty part never does
  const lbl = (c) => { const t = c.img.label || S.drawingTag || "Drawing, not this car", i = t.indexOf(" · "); return i < 0 ? esc(t) : `<span class="lg">${esc(t.slice(0, i + 3))}</span>${esc(t.slice(i + 3))}`; };
  // a drawing card: the body-style drawing on chalk, then the listing as data. No price over a picture, no "render" claim.
  function drawCard(c, b, cls, big) {
    const meta = [c.year, c.odometerKm == null ? "km not listed" : `${fmt(c.odometerKm)} km`, c.transmission].filter(Boolean).map(esc).join(" · ");
    return `<button class="${cls} dr${big ? " big" : ""}" type="button"${cls === "wc" ? ' role="listitem"' : ""} data-id="${esc(c.id)}"${cls === "wc" ? ' aria-pressed="false"' : ""}>
      <span class="dr-fig"><img src="${esc(c.img.card)}" alt="" loading="lazy" decoding="async" width="1200" height="900"><span class="dr-lb">${lbl(c)}</span></span>
      <span class="dr-d"><span class="dr-top"><span class="dr-mk">${esc(c.make)}</span><span class="bd">${b.map((x) => `<span>${esc(x)}</span>`).join("")}</span></span>
        <b class="dr-nm">${esc(c.model)}${c.variant ? ` <small>${esc(c.variant)}</small>` : ""}</b>
        <span class="dr-meta">${meta}</span>
        <span class="dr-pr">$${fmt(c.priceNzd)}${c.priceNote ? `<small>${esc(c.priceNote)}</small>` : ""}</span></span></button>`;
  }
  function draw() {
    const list = cars.filter(groups[filt][1]);
    const cap = drawn ? 24 : 21, open = all || list.length <= cap;
    wall.innerHTML = list.slice(0, open ? list.length : cap).map(card).join("");
    more.hidden = open; more.textContent = `Show all ${list.length} cars`;
    if (sel && !list.includes(sel)) { sel = null; $("#spot").hidden = true; }
    mark();
  }
  const mark = () => $$(".wc", wall).forEach((b) => b.setAttribute("aria-pressed", String(sel && b.dataset.id === sel.id)));
  // the notice: how many of the Consumer Information Notice's applicable fields this listing carries
  const notice = (c) => { if (c.notice) return c.notice; const f = (c.cin && c.cin.fields) || []; const app = f.filter((x) => x.status !== "n/a" && x.status !== "na"); return app.length ? [app.filter((x) => x.status === "shown" || x.status === "derived").length, app.length] : null; };
  const ring = (n) => { if (!n) return ""; const [a, b] = n, p = a / b, r = 26, L = 2 * Math.PI * r;
    return `<div class="nring" title="Consumer Information Notice fields on the listing"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="bg"/><circle cx="32" cy="32" r="${r}" class="fg" stroke-dasharray="${(L * p).toFixed(1)} ${L.toFixed(1)}"/></svg><span><b>${a}/${b}</b> notice fields</span></div>`; };
  const schema = (c) => ({ "@context": "https://schema.org", "@type": "Car", name: c.title, brand: { "@type": "Brand", name: c.make }, model: c.model, vehicleModelDate: String(c.year), bodyType: c.bodyLabel,
    fuelType: c.fuelLabel, vehicleTransmission: c.transmission || undefined, color: c.colour || undefined, mileageFromOdometer: { "@type": "QuantitativeValue", value: c.odometerKm, unitCode: "KMT" },
    offers: { "@type": "Offer", price: c.priceNzd, priceCurrency: "NZD", availability: "https://schema.org/InStock", seller: { "@type": "AutoDealer", name: CFG.dealer.name } }, additionalProperty: [{ "@type": "PropertyValue", name: "truth", value: c.truthLabel }] });
  const credit = (c) => c.credit ? `<p class="note">Photo: <a href="${c.credit.page}" target="_blank" rel="noopener">${esc(c.credit.author)}</a> via Wikimedia Commons, <a href="${c.credit.licenceUrl}" target="_blank" rel="noopener">${esc(c.credit.licence)}</a>. ${esc(c.credit.change)} A sample photo of the model, not this listing's car.</p>` : "";
  function pick(c, user) {
    if (!c) return; sel = c; mark(); $("#spot").hidden = false;
    const photo = c.img.kind === "photo", n = notice(c), dr = isDrawing(c), has3d = !!(dr && c.model3d);
    $("#spot").classList.toggle("light", dr); st.classList.toggle("drawing", dr);
    st.classList.toggle("photo", photo); st.classList.toggle("cut", photo && !!cut[c.id]);
    st.classList.toggle("room", !!c.img.room); st.classList.remove("live"); poster.src = c.img.room || (photo ? (cut[c.id] || c.img.card) : c.img.card); poster.alt = c.img.alt;
    truth.textContent = c.img.room ? (S.roomTag || S.photoTag || "Photo") : photo ? (S.photoTag || "Photo") : dr ? (c.img.label || S.drawingTag || "Drawing · not this car") : (S.renderTag || "Render · Simulated car");
    show3d(false);                                        // every listing opens on its drawing; 3D only on request
    info.innerHTML = `<div class="who"><span class="label">${esc(c.region || c.branch || "")}</span><span class="chip">${esc(c.truthLabel)}</span></div>
      <h3>${esc(c.year)} ${esc(c.make)} ${esc(c.model)}${c.variant ? ` <span>${esc(c.variant)}</span>` : ""}</h3>
      <div class="pr">$${fmt(c.priceNzd)}<small>${esc(c.priceNote || "")}</small></div>
      <div class="facts">${[c.odometerKm == null ? "km not listed" : `${fmt(c.odometerKm)} km`, c.fuelLabel, BODY[c.body] || c.bodyLabel, c.transmission, c.colour].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("")}</div>
      ${ring(n)}
      <div class="spot-act"><button class="btn" type="button" id="spotAi" aria-expanded="false">See what an assistant reads</button><a class="btn ghost" href="#desk" id="spotCheck">Ask about it at the agent desk</a></div>
      <pre class="spot-json" id="spotJson" hidden></pre>${credit(c)}${dr ? `<p class="note">Harbour Lane is a fictional dealer, so these cars have no photos. The drawing shows the body style and its typical size, at the same scale for every car on the yard.${has3d ? ` "View in 3D" opens a generic ${esc(WORD[c.body] || c.body)} model built in Blender at real-world size, in the listing's colour: not the actual vehicle, with no badges or any real model's design.` : ""} A real dealer's own photos go here.</p>` : ""}`;
    $("#spotAi").onclick = (e) => { const p = $("#spotJson"), on = p.hidden; p.hidden = !on; e.currentTarget.setAttribute("aria-expanded", String(on)); if (on) p.textContent = JSON.stringify(schema(c), null, 2); };
    $("#spotCheck").onclick = (e) => { const d = $("#desk"), o = $("#deskOpen"); if (d && o) { e.preventDefault(); if (d.hidden) o.click(); else d.scrollIntoView({ behavior: "smooth", block: "start" }); } };
    ctl.hidden = !has3d;
    if (has3d) { const b = $("#spotView3d"); b.disabled = !can3d.ok || !!failed[c.model3d.body]; note.textContent = !can3d.ok ? can3d.why : failed[c.model3d.body] ? FAILED : ""; note.hidden = !note.textContent; }
    if (user) $("#spot").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }
  // Optional 3D: nothing is fetched until "View in 3D" is pressed, and then only that listing's body GLB (each body once). Not offered
  // without WebGL or with data saver on; a failed load or a wrong contract keeps the drawing, disables the button and says why.
  // "Back to drawing" and "Reset view" keep the selection. Reduced motion: the model is shown but never auto-turns.
  const net = navigator.connection || {}, gl = (() => { try { const k = document.createElement("canvas"); return !!(k.getContext("webgl2") || k.getContext("webgl")); } catch (e) { return false; } })();
  const can3d = !gl ? { ok: false, why: "3D view needs WebGL, which is off in this browser. The drawing stays." }
    : net.saveData ? { ok: false, why: "3D view is off while data saver is on (the model is about 1 MB). The drawing stays." } : { ok: true };
  const FAILED = "The 3D model didn't load, so the drawing stays.", failed = {};
  let stage = null, stageP = null, on3d = false, token = 0;
  const ctl = document.createElement("div"); ctl.className = "spot-ctl"; ctl.hidden = true;
  ctl.innerHTML = `<button type="button" class="chip" id="spotView3d" aria-pressed="false">View in 3D</button><button type="button" class="chip" id="spotReset" hidden>Reset view</button><p class="spot-3dnote" id="spotModelNote" role="status" hidden></p>`;
  st.append(ctl);
  const cv = $("#spotCv"), note = $("#spotModelNote"), btn3 = $("#spotView3d"), reset = $("#spotReset");
  function show3d(on) {
    on3d = on; token++;
    btn3.textContent = on ? "Back to drawing" : "View in 3D"; btn3.setAttribute("aria-pressed", String(on)); btn3.removeAttribute("aria-busy");
    reset.hidden = !on; st.classList.toggle("m3d", on);
    if (!on) { st.classList.remove("live"); if (stage) stage.pause(true); }
    if (sel) truth.textContent = on ? `Generic ${WORD[sel.body] || sel.body} model · not the actual vehicle` : (sel.img.label || S.drawingTag || "Drawing · not this car");
  }
  function go3d(c) {
    show3d(true); const my = token, id = c.id;
    btn3.setAttribute("aria-busy", "true"); note.textContent = "Loading the generic model…"; note.hidden = false;
    if (!stageP) stageP = import("./vehicle-stage.js").then((m) => m.mountVehicle(cv, { paused: ambient.paused })).then((s) => { stage = s; window.__vehicleStage = s; ambient.on((p) => s.pause(p || !on3d)); return s; });
    stageP.then((s) => s.setCar(c.model3d.body, c.model3d.paint)).then((r) => {
      if (my !== token || !sel || sel.id !== id) return;
      btn3.removeAttribute("aria-busy"); note.hidden = true; note.textContent = "";
      if (r) { stage.pause(ambient.paused); stage.fit(); st.classList.add("live"); }
    }).catch((e) => {
      console.warn("vehicle 3D", e); failed[c.model3d.body] = true;
      if (sel && sel.id === id) { show3d(false); btn3.disabled = true; note.textContent = FAILED; note.hidden = false; }
    });
  }
  btn3.onclick = () => { if (!sel || !sel.model3d || btn3.disabled) return; if (on3d) show3d(false); else go3d(sel); };
  reset.onclick = () => { stage && stage.resetView(); };
  wall.addEventListener("click", (e) => { const b = e.target.closest(".wc"); if (b) pick(cars.find((c) => c.id === b.dataset.id), true); });
  bar.addEventListener("click", (e) => { const b = e.target.closest("button[data-g]"); if (!b) return; filt = +b.dataset.g; $$("button", bar).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(); });
  // the hero's brand names open the wall filtered to that brand
  const brand = (name) => { const i = groups.findIndex(([g]) => g === name); const b = bar.querySelector(`[data-g="${i}"]`); if (b && !b.disabled) b.click(); };
  addEventListener("stock:brand", (e) => brand(e.detail));
  const pickId = (id) => { const c = cars.find((x) => x.id === id); if (!c) return; if (!cars.filter(groups[filt][1]).includes(c)) { filt = 0; $$("button", bar).forEach((x, i) => x.setAttribute("aria-pressed", String(i === 0))); draw(); } pick(c, false); };
  addEventListener("stock:pick", (e) => pickId(e.detail));
  const lead = $("#lead3"), leadIds = CFG.lead3 && CFG.lead3.length ? CFG.lead3 : cars.slice(0, 3).map((c) => c.id);
  if (lead) { lead.innerHTML = leadIds.map((id) => cars.find((c) => c.id === id)).filter(Boolean).map((c, i) => isDrawing(c) ? drawCard(c, [], "lc", !i) : `<button class="lc${i ? "" : " big"}" type="button" data-id="${esc(c.id)}">
      <img src="${esc(c.img.room || c.img.card)}" alt="${esc(c.img.alt)}" decoding="async"${i ? ' loading="lazy"' : ""}><span class="lc-k eyebrow">${esc(c.branch || c.region || "")}</span><span class="lc-open">Open the listing</span>
      <span class="ov"><span class="lc-make">${esc(c.make)}</span><b>${esc(c.model)}</b><span class="lc-meta">${esc(c.year)}${c.odometerKm ? ` · ${fmt(c.odometerKm)} km` : ""}</span><span class="lc-price">$${fmt(c.priceNzd)}</span></span></button>`).join("");
    lead.classList.toggle("dr3", !!lead.querySelector(".lc.dr"));
    lead.addEventListener("click", (e) => { const b = e.target.closest(".lc"); if (b) pick(cars.find((c) => c.id === b.dataset.id), true); }); }
  draw(); if (window.__stockBrand) brand(window.__stockBrand); if (window.__stockPick) pickId(window.__stockPick);
}
