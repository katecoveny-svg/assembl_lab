// The stock: a wall of cars and one in the spotlight. Tap a car and it takes the stage: in 3D where the car is a render (drag to turn,
// swatches repaint it), as its photo where it is a photo (a photo's paint is never changed). Price, badges and truth label on every
// card; the spotlight shows the notice and how a buyer's assistant reads the same car. A multi-brand dealer filters by brand, the demo by body.
import { CFG, $, $$, esc, fmt, json, ambient, narrowMQ } from "./core.js";

const PAINT = { white: "#EEEDEA", ivory: "#E9E2CF", silver: "#B9BCC0", grey: "#6F7277", gray: "#6F7277", black: "#1D1D20", red: "#A3222C", blue: "#2D4173", green: "#3C5A45", orange: "#C2622A", yellow: "#D9B44A", brown: "#5E4436", bronze: "#7A5A3E" };
const SWATCHES = [["Pearl white", "#EEEDEA"], ["Silver", "#B9BCC0"], ["Graphite", "#4A4D52"], ["Deep red", "#8E1F2B"], ["Navy", "#26365E"], ["Black", "#19191B"]];
const paintOf = (c) => (c.render && c.render.paint) || Object.entries(PAINT).find(([k]) => (c.colour || "").toLowerCase().includes(k))?.[1] || "#8D9094";
const BODY = { hatch: "Hatch", sedan: "Sedan", suv: "SUV", ute: "Ute", van: "Van", wagon: "Wagon" };

export async function initStock() {
  const data = await json(CFG.stockUrl), cars = data.cars, wall = $("#wall2"), info = $("#spotInfo"), st = $("#spotStage"), poster = $("#spotPoster"), cv = $("#spotCv"), truth = $("#spotTruth");
  const S = CFG.stock || {}, byBrand = S.filter === "brand", cut = Object.fromEntries(((CFG.hero || {}).cars || []).filter((h) => !h.flat).map((h) => [h.id, h.src]));
  // filters: by brand (the dealer's own brands, then anything else in the used stock), the demo by body style
  const brands = data.brands || [], groups = byBrand
    ? [["All", () => true], ...brands.map((b) => [b, (c) => c.make === b]), ["Other used", (c) => !brands.includes(c.make)]]
    : [["All", () => true], ["SUV", (c) => c.body === "suv"], ["Hatch", (c) => c.body === "hatch"], ["Ute", (c) => c.body === "ute"], ["Van", (c) => c.body === "van"], ["Electric", (c) => c.fuel === "electric"], ["Hybrid", (c) => /hybrid/.test(c.fuel)]];
  const bar = document.createElement("div"); bar.className = "wall-f wrap"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", byBrand ? "Filter by brand" : "Filter by body");
  bar.innerHTML = groups.map(([g, f], i) => { const n = cars.filter(f).length; return n || byBrand ? `<button type="button" data-g="${i}" aria-pressed="${i ? "false" : "true"}"${n ? "" : " disabled"}>${esc(g)} <i>${n}</i></button>` : ""; }).join("");
  wall.before(bar);
  let filt = 0, sel = null, three = null, threeP = null;
  const card = (c, i) => {
    const b = [c.fuelLabel && /electric|hybrid/i.test(c.fuelLabel) ? c.fuelLabel.replace("Petrol hybrid", "Hybrid") : "", /demo/i.test(c.condition || "") ? "Demo" : /new/i.test(c.condition || "") ? "New" : ""].filter(Boolean);
    return `<button class="wc${c.img.kind === "photo" ? " photo" : ""}" type="button" role="listitem" data-id="${esc(c.id)}" aria-pressed="false" data-rv style="--i:${i % 8}">
      <img src="${esc(c.img.card)}" alt="${esc(c.img.alt)}" loading="lazy" decoding="async">
      <span class="bd">${b.map((x) => `<span>${esc(x)}</span>`).join("")}<span class="t">${esc(c.img.kind === "photo" ? (S.photoBadge || "Photo") : "Render")}</span></span>
      <span class="turn">Open</span>
      <span class="ov"><b>$${fmt(c.priceNzd)}</b><span>${esc(c.year)} ${esc(c.make)} ${esc(c.model)}${c.odometerKm == null ? "" : ` · ${fmt(c.odometerKm)} km`}</span></span></button>`;
  };
  function draw() {
    const list = cars.filter(groups[filt][1]);
    wall.innerHTML = list.slice(0, byBrand ? 21 : 21).map(card).join("");
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
    const photo = c.img.kind === "photo", n = notice(c);
    st.classList.toggle("photo", photo); st.classList.toggle("cut", photo && !!cut[c.id]);
    st.classList.toggle("room", !!c.img.room); st.classList.remove("live"); poster.src = c.img.room || (photo ? (cut[c.id] || c.img.card) : c.img.card); poster.alt = c.img.alt;
    truth.textContent = c.img.room ? (S.roomTag || S.photoTag || "Photo") : photo ? (S.photoTag || "Photo") : (S.renderTag || "Render · Simulated car");
    info.innerHTML = `<div class="who"><span class="label">${esc(c.region || c.branch || "")}</span><span class="chip">${esc(c.truthLabel)}</span></div>
      <h3>${esc(c.year)} ${esc(c.make)} ${esc(c.model)}${c.variant ? ` <span>${esc(c.variant)}</span>` : ""}</h3>
      <div class="pr">$${fmt(c.priceNzd)}<small>${esc(c.priceNote || "")}</small></div>
      <div class="facts">${[c.odometerKm == null ? "km not listed" : `${fmt(c.odometerKm)} km`, c.fuelLabel, BODY[c.body] || c.bodyLabel, c.transmission, c.colour].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("")}</div>
      ${ring(n)}
      <div class="spot-act"><button class="btn" type="button" id="spotAi" aria-expanded="false">How an assistant sees it</button><a class="btn ghost" href="#check" id="spotCheck">Check the model</a></div>
      <pre class="spot-json" id="spotJson" hidden></pre>${credit(c)}`;
    $("#spotAi").onclick = (e) => { const p = $("#spotJson"), on = p.hidden; p.hidden = !on; e.currentTarget.setAttribute("aria-expanded", String(on)); if (on) p.textContent = JSON.stringify(schema(c), null, 2); };
    $("#spotCheck").onclick = () => window.dispatchEvent(new CustomEvent("check:model", { detail: { make: c.make, model: c.model, year: c.year } }));
    $$(".sw button", info).forEach((b) => (b.onclick = () => { $$(".sw button", info).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); three && three.setPaint(b.dataset.paint); }));
    if (user) $("#spot").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }
  // 3D: loaded the first time a render takes the stage (and only where WebGL works); the poster stays until it has drawn
  function go3d(c) {
    const kind = (c.render && c.render.kind) || c.body;
    if (three) { three.setCar(kind, paintOf(c)); st.classList.add("live"); return; }
    if (!threeP) threeP = import("./spot3d.js").then((m) => m.mountSpot(cv, { kind, paint: paintOf(c), paused: ambient.paused })).then((s) => { three = s; ambient.on((p) => s.pause(p)); return s; }).catch((e) => { console.warn("spot3d", e); return null; });
    threeP.then((s) => { if (s && sel && sel.img.kind !== "photo") { s.setCar((sel.render && sel.render.kind) || sel.body, paintOf(sel)); requestAnimationFrame(() => st.classList.add("live")); } });
  }
  wall.addEventListener("click", (e) => { const b = e.target.closest(".wc"); if (b) pick(cars.find((c) => c.id === b.dataset.id), true); });
  bar.addEventListener("click", (e) => { const b = e.target.closest("button[data-g]"); if (!b) return; filt = +b.dataset.g; $$("button", bar).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(); });
  // the hero's brand names open the wall filtered to that brand
  const brand = (name) => { const i = groups.findIndex(([g]) => g === name); const b = bar.querySelector(`[data-g="${i}"]`); if (b && !b.disabled) b.click(); };
  addEventListener("stock:brand", (e) => brand(e.detail));
  const pickId = (id) => { const c = cars.find((x) => x.id === id); if (!c) return; if (!cars.filter(groups[filt][1]).includes(c)) { filt = 0; $$("button", bar).forEach((x, i) => x.setAttribute("aria-pressed", String(i === 0))); draw(); } pick(c, false); };
  addEventListener("stock:pick", (e) => pickId(e.detail));
  const lead = $("#lead3"), leadIds = CFG.lead3 && CFG.lead3.length ? CFG.lead3 : cars.slice(0, 3).map((c) => c.id);
  if (lead) { lead.innerHTML = leadIds.map((id) => cars.find((c) => c.id === id)).filter(Boolean).map((c, i) => `<button class="lc" type="button" data-id="${esc(c.id)}" data-rv style="--i:${i}">
      <img src="${esc(c.img.room || c.img.card)}" alt="${esc(c.img.alt)}" loading="lazy" decoding="async"><span class="ov"><b>$${fmt(c.priceNzd)}</b><span>${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</span></span></button>`).join("");
    lead.addEventListener("click", (e) => { const b = e.target.closest(".lc"); if (b) pick(cars.find((c) => c.id === b.dataset.id), true); }); }
  draw(); if (window.__stockBrand) brand(window.__stockBrand); if (window.__stockPick) pickId(window.__stockPick);
}
