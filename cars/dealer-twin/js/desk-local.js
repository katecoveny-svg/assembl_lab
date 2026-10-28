// An in-page MCP endpoint with the same tool shapes as the lab's (search_cars, get_car, car_check, running_cost, hold_car, book_test_drive),
// answering over the dealer's own stock file. JSON-RPC in, JSON-RPC out, so the desk and its inspector treat it exactly like the remote one.
// Everything it returns is Simulated: nothing is held, booked, sent or stored.
import { fmt, dollars } from "./core.js";

const DAY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const hy = (f) => f === "hybrid" || f === "plug-in hybrid";
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const ref = (p) => p + "-" + Math.random().toString(36).slice(2, 9).toUpperCase();
const nz = (d) => d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "Pacific/Auckland" });
const monthsTo = (iso) => iso ? Math.round((new Date(iso + "T00:00:00+13:00") - Date.now()) / (30.44 * 864e5) * 10) / 10 : null;

export function createLocalEndpoint(stock, register, dealerName, stockNote, listingTruth) {
  const cars = stock.cars, byId = Object.fromEntries(cars.map((c) => [c.id, c]));
  const NOTE = stockNote || `Simulated: sample listings for a private demo. Nothing is held, booked, sent or stored.`, LISTING_TRUTH = listingTruth || "Simulated";
  function slots(c, dayWanted) { const out = [], now = new Date();
    for (let k = 1; k <= 7; k++) { const d = new Date(now.getTime() + k * 864e5), dn = DAY[d.getDay()]; if (dn === "sunday") continue; if (dayWanted && dayWanted !== dn && dayWanted !== d.toISOString().slice(0, 10)) continue;
      [9, 12, 14].forEach((h, i) => { if (hash(c.id + k + i) % 3 === 0) return; const ds = d.toISOString().slice(0, 10); out.push({ start: `${ds}T${String(h).padStart(2, "0")}:00:00+13:00`, label: `${nz(d)}, ${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`, day: dn[0].toUpperCase() + dn.slice(1), date: ds }); }); }
    return out.slice(0, 3); }
  function notice(c) { const f = (c.cin && c.cin.fields) || [], m = {}, truth = {}, labels = {};
    f.forEach((x) => { if (x.status === "na" || x.status === "n/a") return; m[x.key] = x.status === "missing" ? null : x.value ?? null; labels[x.key] = x.label; truth[x.key] = x.status === "missing" ? "Missing" : x.status === "derived" || x.status === "partial" ? "Estimate" : (x.truth || "Simulated"); });
    return { m, truth, labels, present: f.filter((x) => x.status === "shown" || x.status === "derived").length, total: f.filter((x) => x.status !== "na" && x.status !== "n/a").length, missing: f.filter((x) => x.status === "missing").map((x) => ({ key: x.key, label: x.label })) }; }
  const regOf = (c) => register[`${c.make}|${c.model}|${c.year}`] || null;

  const TOOLS = {
    search_cars(a) {
      const excl = {}, ex = (r) => { excl[r] = (excl[r] || 0) + 1; }, out = [];
      for (const c of cars) {
        if (a.body && c.body !== a.body) { ex("different body type"); continue; }
        if (a.fuel && !(a.fuel === "hybrid" ? hy(c.fuel) : c.fuel === a.fuel)) { ex("different fuel"); continue; }
        if (a.query) { const t = `${c.make} ${c.model} ${c.variant || ""}`.toLowerCase(); if (!a.query.toLowerCase().split(/\s+/).every((w) => t.includes(w))) { ex("doesn't match the make or model"); continue; } }
        if (a.seats_min && (c.seats || 5) < a.seats_min) { ex("too few seats"); continue; }
        if (a.budget_max && c.priceNzd > a.budget_max * 1.15) { ex("over budget"); continue; }
        if (a.max_km && c.odometerKm > a.max_km * 1.2) { ex("too many km"); continue; }
        if (a.min_year && c.year < a.min_year - 1) { ex("too old"); continue; }
        const miss = [];
        if (a.budget_max && c.priceNzd > a.budget_max) miss.push(`${dollars(c.priceNzd - a.budget_max)} over your budget`);
        if (a.max_km && c.odometerKm > a.max_km) miss.push(`${fmt(c.odometerKm - a.max_km)} km over`);
        if (a.min_year && c.year < a.min_year) miss.push("one year older than you asked");
        const why = [a.budget_max && c.priceNzd <= a.budget_max ? `${dollars(c.priceNzd)}, ${dollars(a.budget_max - c.priceNzd)} under your ${dollars(a.budget_max)}` : `${dollars(c.priceNzd)}`, `${c.bodyLabel}, ${fmt(c.odometerKm)} km`];
        if (a.test_drive_day) { const s = slots(c, a.test_drive_day); if (!s.length) miss.push(`no free time on ${a.test_drive_day}`); else why.push(`free to drive ${s[0].label}`); }
        out.push({ c, miss, why });
      }
      out.sort((x, y) => x.miss.length - y.miss.length || (a.budget_max ? Math.abs(a.budget_max * .85 - x.c.priceNzd) - Math.abs(a.budget_max * .85 - y.c.priceNzd) : x.c.priceNzd - y.c.priceNzd));
      const exact = out.filter((x) => !x.miss.length), pick = exact.slice(0, a.limit || 5); if (pick.length < 3) pick.push(...out.filter((x) => x.miss.length === 1).slice(0, 3 - pick.length));
      const results = pick.map((x, i) => ({ rank: i + 1, id: x.c.id, title: x.c.title, year: x.c.year, priceNzd: x.c.priceNzd, odometerKm: x.c.odometerKm, fuel: x.c.fuel, body: x.c.body, seats: x.c.seats, region: x.c.region, site: x.c.branch,
        hold: "available", match: x.miss.length ? "close" : "exact", why: [...x.why, ...x.miss], image: { url: x.c.img.sq || x.c.img.card, alt: x.c.img.alt } }));
      const sc = { truth: LISTING_TRUTH, note: NOTE, dealer: dealerName, interpreted: Object.entries(a).filter(([k]) => k !== "limit").map(([k, v]) => `${k}: ${v}`), total: cars.length, matched: exact.length, closeMatches: results.filter((r) => r.match === "close").length, excluded: excl, results };
      return { sc, text: `${exact.length} of ${cars.length} sample cars match. Simulated.` };
    },
    get_car(a) {
      const c = byId[a.car_id]; if (!c) throw new Error(`No car ${a.car_id}`);
      const n = notice(c), wof = c.wofExpiry, lic = c.licenceExpiry;
      const sc = { truth: LISTING_TRUTH, note: NOTE, car: { id: c.id, title: c.title, make: c.make, model: c.model, variant: c.variant, year: c.year, body: c.body, colour: c.colour, transmission: c.transmission, fuel: c.fuel, priceNzd: c.priceNzd, odometerKm: c.odometerKm, region: c.region, site: c.branch, hold: "available", highlights: c.highlights },
        notice: n.m, noticeTruth: n.truth, noticeLabels: n.labels,
        checks: { cinFields: { present: n.present, total: n.total, truth: "Simulated" }, wof: { expiry: wof, monthsLeft: monthsTo(wof), ok: wof ? monthsTo(wof) > 1 : null }, licence: { expiry: lic, monthsLeft: monthsTo(lic), ok: lic ? monthsTo(lic) > 1 : null },
          moneyOwing: { stated: n.m.security_interest ?? null, ok: /^no$/i.test(String(n.m.security_interest || "")), note: "As stated on the notice. Stated is not searched: run a PPSR search before paying." } },
        images: [{ url: c.img.card, alt: c.img.alt, label: c.img.label || (c.img.kind === "photo" ? "Licensed sample photo of the model, studio version" : "Render · body style, not this car") }],
        testDriveSlots: slots(c, a.test_drive_day) };
      return { sc, text: `${c.title} · ${dollars(c.priceNzd)} · ${fmt(c.odometerKm)} km · ${c.branch}. Sample listing (Simulated). Notice: ${n.present}/${n.total} fields.` };
    },
    car_check(a) {
      const c = byId[a.car_id]; if (!c) throw new Error(`No car ${a.car_id}`);
      const n = notice(c), g = regOf(c), flags = [];
      n.missing.forEach((m) => flags.push({ level: "ask", title: `${m.label} not shown`, why: "Every dealer notice must show it. Ask before paying.", truth: "Simulated" }));
      if (/not stated/.test(c.priceNote || "")) flags.push({ level: "ask", title: "Price basis not stated", why: "Ask whether the price includes on-road costs.", truth: "Simulated" });
      const sc = { lookedUp: false, statement: "Checked against the dealer's own notice fields in this page, plus a stored snapshot of NZTA's open register for the model. No plate or owner was looked up.", car: { name: c.title, id: c.id, truth: "Simulated" },
        notice: { required: true, present: n.present, total: n.total, missing: n.missing }, redFlags: flags,
        checks: [{ id: "ppsr", title: "Money owing (PPSR search)", how: "Search the plate or VIN on the Personal Property Securities Register on the day you pay." }, { id: "wof", title: "WOF and licence status", how: "NZTA's free check shows the WOF and licence expiry for a plate." }],
        register: g ? { ...g, status: "snapshot", truth: "Source" } : { status: "not in snapshot", found: false },
        summary: `${flags.length ? `${flags.length} question${flags.length === 1 ? "" : "s"} to ask` : "Nothing to query on the notice"} and 2 checks to run before paying.` };
      return { sc, text: sc.summary };
    },
    running_cost(a) {
      const c = byId[a.car_id]; if (!c) throw new Error(`No car ${a.car_id}`);
      const F = window.DEALER.FUEL, g = regOf(c), km = a.km_per_week || 200, ev = c.fuel === "electric";
      const econ = ev ? { value: 17, unit: "kWh/100km", truth: "Estimate" } : g && g.ratedEconomy ? { value: g.ratedEconomy.lPer100km * 1.15, unit: "L/100km", truth: "Estimate", basis: "Rated register figure plus 15% for real-world use" } : { value: { hatch: 6.2, suv: 8.4, wagon: 8, ute: 9.5, van: 10 }[c.body] || 8, unit: "L/100km", truth: "Estimate" };
      const energy = ev ? km * econ.value / 100 * F.kwh : km * econ.value / 100 * (c.fuel === "diesel" ? F.diesel : F.petrol);
      const lines = [{ key: "energy", label: ev ? "Charging at home" : c.fuel === "diesel" ? "Diesel" : "Petrol", weekly: +energy.toFixed(2), truth: "Latest published", period: F.date }];
      if (ev || c.fuel === "diesel") lines.push({ key: "ruc", label: "Road user charges", weekly: +(km / 1000 * (ev ? 76 : 76)).toFixed(2), truth: "Estimate" });
      lines.push({ key: "wof_licence", label: "WOF and licence", weekly: 3.56, truth: "Estimate" }, { key: "maintenance", label: "Servicing, tyres, brakes", weekly: c.year < 2018 ? 15.4 : 12.3, truth: "Estimate" });
      const total = lines.reduce((s, l) => s + l.weekly, 0);
      const sc = { car: { id: c.id, title: c.title, truth: "Simulated" }, economy: econ, fuel: c.fuel, kmPerWeek: km, lines, totalWeekly: +total.toFixed(2), totalAnnual: Math.round(total * 52), notIncluded: ["insurance", "finance", "depreciation", "parking and tolls"] };
      return { sc, text: `About ${dollars(total)} a week at ${km} km a week. Estimate.` };
    },
    hold_car(a) {
      const c = byId[a.car_id]; if (!c) throw new Error(`No car ${a.car_id}`);
      const until = a.hold_until || new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
      const sc = { simulated: true, status: "requested: a person at the dealer must approve the hold", authority: "act with approval", car: { id: c.id, title: c.title, priceNzd: c.priceNzd }, holdUntil: until, site: `${dealerName} ${c.branch}`,
        sideEffects: "None. Nothing is held, sent or stored, and no deposit is taken.", nextStep: `Until a person at ${c.branch} approves, the car isn't held and anyone could buy it.`, note: NOTE };
      return { sc, text: `Requested (Simulated): hold ${c.title} until ${until}.`, meta: { "assembl/requestRef": ref("HOLD") } };
    },
    book_test_drive(a) {
      const c = byId[a.car_id]; if (!c) throw new Error(`No car ${a.car_id}`);
      const s = slots(c).find((x) => x.start === a.slot) || slots(c)[0];
      const sc = { simulated: true, status: "requested: waiting for a person at the dealer to confirm", authority: "act with approval", car: { id: c.id, title: c.title }, slot: s, site: `${dealerName} ${c.branch}`,
        sideEffects: "None. This is a demo: nothing was sent to anyone and nothing was stored.", nextStep: `A person at ${c.branch} would confirm or offer another time. Until then it isn't booked.`, note: NOTE };
      return { sc, text: `Requested (Simulated): a test drive of ${c.title} at ${s.label}.`, meta: { "assembl/requestRef": ref("TD") } };
    },
  };
  let id = 0;
  return async function call(body) {
    const req = typeof body === "string" ? JSON.parse(body) : body, p = req.params || {};
    try { const r = TOOLS[p.name](p.arguments || {}); return { jsonrpc: "2.0", id: req.id ?? ++id, result: { content: [{ type: "text", text: r.text }], structuredContent: r.sc, isError: false, ...(r.meta ? { _meta: r.meta } : {}) } }; }
    catch (e) { return { jsonrpc: "2.0", id: req.id ?? ++id, error: { code: -32602, message: e.message } }; }
  };
}
