// A multi-franchise NZ dealer group, simulated. The group itself (sites, marques, campaigns) comes from window.DEALER_DATA. Public benchmarks only (Deloitte NZ Dealership Benchmarks 2026,
// published lead-response research); job mix, labour rate, marque mix and lead outcomes are labelled estimates.
// DEALER.fromData(tables) takes real aggregate tables (see contract/dealer-data.schema.json) and returns the same
// shape as DEALER.group(S), switching each figure to "your data" only where the data supports it.
const DEALER = (() => {
  const DD = (typeof window !== "undefined" && window.DEALER_DATA) || globalThis.DEALER_DATA;
  // ------------------------------------------------------------------ marques and sites: from DEALER_DATA (each variant names its own sources)
  const SITES = DD.sites;
  // share = estimated share of the group's new sales; price = estimated average transaction; body = typical body styles on the floor.
  // tint = a paint colour used to tell marques apart in the 3D scene (chosen for this model, not a manufacturer colour).
  // Building outlines, when a variant supplies them, carry their own source and date.
  const OSM_DATE = DD.osmDate || "";
  const FOOTPRINTS = DD.footprints || {};
  const MARQUES = DD.marques.map(m => ({ ...m }));
  { const t = MARQUES.reduce((a, m) => a + m.share, 0); MARQUES.forEach(m => m.share /= t); }
  const RANK = { v: 0, n: 1, p: 2, a: 3, u: 4 };
  MARQUES.forEach(m => { m.sites = SITES.filter(s => s.m.includes(m.n)).map(s => ({ n: s.n, v: s.v }));
    m.v = m.sites.reduce((b, s) => RANK[s.v] < RANK[b] ? s.v : b, "u"); });
  const MI = Object.fromEntries(MARQUES.map((m, i) => [m.k, i]));
  // ------------------------------------------------------------------ marketing channels (spend and lead shares are estimates)
  const CHANNELS = [
    { k: "trademe", n: "Trade Me Motors", spend: .30, leads: .30, q: 1.1 },
    { k: "autotrader", n: "AutoTrader NZ", spend: .09, leads: .09, q: 1.0 },
    { k: "search", n: "Google search", spend: .17, leads: .14, q: 1.0 },
    { k: "social", n: "Social media", spend: .10, leads: .12, q: 0.7 },
    { k: "website", n: "Own website", spend: .06, leads: .17, q: 1.0 },
    { k: "oem", n: "Distributor leads", spend: .08, leads: .14, q: 1.2 },
    { k: "radio", n: "Radio, print, outdoor", spend: .20, leads: .04, q: 0.8 }];
  const CH_SYN = [["trademe", /trade\s*me|trademe/], ["autotrader", /auto\s*trader/], ["search", /google|search|sem|ppc|adwords/], ["social", /social|facebook|meta|instagram|tiktok/],
    ["website", /web|seo|organic|direct|site/], ["oem", /oem|distributor|manufacturer|brand|factory|nz\s*distributor/], ["radio", /radio|print|outdoor|tv|billboard|newspaper|press/],
    ["walkin", /walk|phone|repeat|referral|returning|fleet|existing/]];
  const chKey = s => { const t = String(s || "").toLowerCase().trim(); if (!t) return ""; for (const [k, re] of CH_SYN) if (re.test(t)) return k; return t.replace(/[^a-z0-9]+/g, "_"); };
  const chName = k => (CHANNELS.find(c => c.k === k) || { n: k === "walkin" ? "Walk-in, phone, repeat" : k.replace(/_/g, " ") }).n;
  const marqueKey = s => { const t = String(s || "").toLowerCase().replace(/trucks?|professional|motors?|new zealand|nz/g, "").trim(); const m = MARQUES.find(m => t === m.k || t.startsWith(m.k) || t === m.n.toLowerCase()); return m ? m.k : (t ? "other" : ""); };

  // ------------------------------------------------------------------ public benchmarks (Deloitte NZ Dealership Benchmarks 2026, top 30% of 200+ NZ dealers)
  const BENCH = { src: "Deloitte NZ Dealership Benchmarks 2026", netPct: [2.8, 3.0], newGpu: [3750, 4250], usedGpu: [3500, 4000], daysSupply: [50, 60], usedNew: 0.89,
    finPenNew: [.28, .30], finPenUsed: [.26, .28], finPerContract: [2500, 2900], fiPerRetail: 621, finPerUnitNew: 811, finPerUnitUsed: 658, insPerUnitNew: 40, insPerUnitUsed: 140,
    partsGp: [.24, .28], partsDays: [23, 25], partsTurns: [14, 15], serviceGp: [.60, .62], labourPerTech: 14466, absorption: [.55, .57], overheads: .408, perfIndex: [.95, 1],
    advNew: 299, advUsed: 165, orient: { new: .35, used: .21, parts: .17, service: .27 }, fiShare: .08,
    // department selling expenses as a share of department gross (100% minus Deloitte selling gross %)
    sellExp: { new: 1 - .516, used: 1 - .683, parts: 1 - .629, service: 1 - .527 }, fiCost: .29 };

  // ------------------------------------------------------------------ the service centre, minute by minute
  const JOBS = [ // share of repair orders, hours sold, does the customer wait on site?
    { k: "express", n: "Express service / WOF", share: 0.32, hrs: 0.8, waiter: 0.7 },
    { k: "service", n: "Scheduled service", share: 0.53, hrs: 2.4, waiter: 0.1 },
    { k: "repair", n: "Repair / diagnosis", share: 0.15, hrs: 5.0, waiter: 0 }];
  const BASE = { ros: 66, bays: 19, techs: 17, prod: 0.97, rate: 175, hc: 0.6,
    stock: 480, price: 45000, apr: 0.0605, days: 55,
    leads: 40, bdc: 0, showroomMins: 95,
    groupTechs: 64, usedRatio: 0.89, usedGpu: 3750, newGpu: 4000, usedPrice: 32000, reconDays: 6.5, appraiseToBuy: 0.62,
    fiPenNew: .29, fiPenUsed: .27, fiPpd: 1.4, partsFill: .88, partsObsolete: .06, partsRatio: 1.45, mktSpend: 118000, site: "" };
  Object.assign(BASE, DD.base || {});
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }
  const pickW = (x, w) => { let t = w.reduce((a, b) => a + b, 0) * x; for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; } return w.length - 1; };
  const OPEN = 7.5 * 60, CLOSE = 17.5 * 60;
  const mixW = S => MARQUES.map(m => (S.mix && S.mix[m.k] != null ? S.mix[m.k] : m.share));
  function newDay(S, seed = 3) {
    const R = rng(seed), jobs = [], W = mixW(S);
    const n = Math.round(S.ros);
    for (let i = 0; i < n; i++) { let x = R(), j = JOBS[0]; for (const J of JOBS) { if (x < J.share) { j = J; break; } x -= J.share; }
      const waiter = R() < j.waiter;
      // drop-offs mostly before 9:30; waiting customers are booked through the day
      const arr = waiter ? OPEN + R() * (CLOSE - OPEN - 120) : OPEN + Math.pow(R(), 2.2) * 240;
      jobs.push({ id: i, k: j.k, hrs: j.hrs * (0.7 + R() * 0.6), waiter, arr, state: "booked", left: 0, bay: -1, start: null, end: null, brand: pickW(R(), W), body: R() }); }
    jobs.sort((a, b) => a.arr - b.arr);
    return { t: OPEN - 10, jobs, techFree: S.techs, R };
  }
  function step(S, d) {
    const t = d.t;
    for (const j of d.jobs) if (j.state === "booked" && j.arr <= t) j.state = "queue";
    if (t >= OPEN && t < CLOSE) {
      const busy = d.jobs.filter(j => j.state === "work").length, freeBays = S.bays - busy, freeTechs = S.techs - busy;
      let n = Math.min(freeBays, freeTechs);
      if (n > 0) { const q = d.jobs.filter(j => j.state === "queue").sort((a, b) => (b.waiter - a.waiter) || a.arr - b.arr);
        const used = new Set(d.jobs.filter(j => j.state === "work").map(j => j.bay));
        for (const j of q) { if (n <= 0) break; let b = 0; while (used.has(b)) b++; used.add(b); j.bay = b; j.state = "work"; j.left = j.hrs * 60 / S.prod; j.start = t; n--; } }
      for (const j of d.jobs) if (j.state === "work") { j.left -= 1; if (j.left <= 0) { j.state = "done"; j.end = t; j.bay = -1; } }
    }
    d.t++;
  }
  function dayStats(S, d) {
    const done = d.jobs.filter(j => j.state === "done"), hrs = done.reduce((a, j) => a + j.hrs, 0);
    const waiters = d.jobs.filter(j => j.waiter && j.start != null), wait = waiters.length ? waiters.reduce((a, j) => a + (j.start - j.arr), 0) / waiters.length : 0;
    const waitDone = d.jobs.filter(j => j.waiter && j.end != null), visit = waitDone.length ? waitDone.reduce((a, j) => a + (j.end - j.arr), 0) / waitDone.length : 0;
    const left = d.jobs.filter(j => j.state !== "done").length;
    const util = hrs / S.prod / (S.bays * (CLOSE - OPEN) / 60);
    const labour = hrs * S.rate * hcLift(S);
    return { ros: d.jobs.length, done: done.length, hrs, wait, visit, left, util, labour, inShop: d.jobs.filter(j => j.state === "work").length, queue: d.jobs.filter(j => j.state === "queue").length };
  }
  function fullDay(S, seed) { const d = newDay(S, seed); while (d.t < CLOSE + 1) step(S, d); return dayStats(S, d); }
  // ------------------------------------------------------------------ stock and floor plan
  function stock(S) {
    const perDay = S.stock * S.price * S.apr / 365, aged = Math.exp(-90 / S.days);
    const perUnit = S.price * S.apr / 365 * S.days;
    return { perDay, perMonth: perDay * 30.4, perYear: perDay * 365, aged, agedUnits: Math.round(S.stock * aged), perUnit };
  }
  // ------------------------------------------------------------------ leads: how fast someone answers decides how many become appointments
  // (estimate after published US response-time studies; appointment to sale 40%)
  const LEADHOUR = (() => { const raw = [0.4, 0.2, 0.1, 0.1, 0.1, 0.2, 0.6, 1.6, 3.4, 5.0, 6.0, 6.4, 6.6, 6.4, 6.2, 6.2, 6.0, 6.0, 6.8, 7.6, 8.4, 7.4, 4.8, 1.8]; const s = raw.reduce((a, b) => a + b); return raw.map(x => x / s); })();
  const apptRate = m => m <= 5 ? 0.26 : m <= 30 ? 0.22 : m <= 240 ? 0.18 : 0.14;
  const respMins = (S, h) => { const bdcOn = S.bdc > 0 && h >= 7 && h < 22; if (bdcOn) return 3; return h >= 8.5 && h < 17.5 ? S.showroomMins : (h < 8.5 ? (8.5 - h) * 60 + 30 : (24 - h + 8.5) * 60); };
  function leads(S, hourShare = LEADHOUR) {
    // showroom: answered during 8:30–17:30 with a typical delay; after hours, waits until the next morning
    // remote team (S.bdc people, 7am–10pm, 7 days): answered in about 3 minutes while staffed, if capacity allows (12 leads/hour each)
    let appts = 0, fast = 0, mins = 0;
    hourShare.forEach((share, h) => {
      const n = S.leads * share;
      const bdcOn = S.bdc > 0 && h >= 7 && h < 22, cap = S.bdc * 12;
      if (bdcOn) { const served = Math.min(n, cap); appts += served * apptRate(3); fast += served; const rest = n - served; appts += rest * apptRate(45); mins += served * 3 + rest * 45; }
      else { const m = respMins(S, h); appts += n * apptRate(m); if (m <= 5) fast += n; mins += n * m; }
    });
    const sales = appts * 0.4;
    return { appts, sales, fastShare: fast / S.leads, avgMins: mins / S.leads, apptShare: appts / S.leads, grossMonth: sales * 30.4 * 4000,
      afterHours: hourShare.reduce((a, s, h) => a + (h < 8.5 || h >= 17.5 ? s : 0), 0) };
  }

  // ------------------------------------------------------------------ technician health checks (photo/video inspection sent to the customer)
  // Modelled on how video health-check tools work: a technician inspects on the hoist, films the items,
  // marks each Urgent / Recommended / Ok / Not checked, the customer gets a link, views it, and accepts items; accepted work goes on the repair order.
  // Item prices, acceptance and timing are estimates. No customer names, regos or VINs anywhere.
  const HC_ITEMS = [["Trim & seat belts", 0, 0], ["Window and door lock operation", 0, 0], ["Gauges, warning lights and horn", 0, 0], ["Air conditioning", .06, 189],
    ["Key operation", .02, 95], ["Battery condition", .08, 289], ["Engine oil", .03, 129], ["Fluid levels and condition", .10, 89], ["Wiper blades", .22, 59],
    ["Front brake pads", .12, 389], ["Rear brake pads", .08, 349], ["Tyres: tread depth", .14, 398], ["Suspension and steering", .05, 460], ["Lights and lenses", .07, 79],
    ["Cabin air filter", .18, 79], ["Exhaust", .03, 240]];
  const hash = n => { let x = (n + 1) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  function healthCheck(job, S) {
    if (hash(job.id * 3 + 1) >= (S.hc == null ? .6 : S.hc) || job.start == null) return null;
    const R = rng(job.id * 977 + 13), items = HC_ITEMS.map(([n, p, price]) => { let st = "ok"; const x = R();
      if (price && x < p) st = R() < .22 ? "urgent" : "recommended"; else if (R() < .04) st = "not_checked"; return { n, st, price: price ? Math.round(price * (0.8 + R() * 0.4)) : 0 }; });
    const tIns = job.start + 12 + R() * 14, tSent = tIns + 6 + R() * 10, media = R() < .93 ? 1 + Math.floor(R() * 4) + (R() < .45 ? 1 : 0) : 0, video = media > 0 && R() < .62;
    const viewed = R() < .82, tView = viewed ? tSent + 4 + Math.pow(R(), 2) * 85 : null, decides = viewed && R() < .9, tDec = decides ? tView + 2 + R() * 32 : null;
    let quoted = 0, approved = 0, rec = 0, acc = 0;
    items.forEach(it => { if (it.st === "urgent" || it.st === "recommended") { rec++; quoted += it.price; it.accepted = decides && R() < (it.st === "urgent" ? .74 : .42); if (it.accepted) { acc++; approved += it.price; } else it.deferred = decides; } });
    const outcome = !rec ? "all_ok" : !viewed ? "not_viewed" : !decides ? "viewed" : acc ? (acc === rec ? "approved" : "part") : "declined";
    return { id: job.id, items, media, video, tIns, tSent, tView, tDec, quoted, approved, rec, acc, outcome, ref: String(100000 + Math.floor(hash(job.id + 77) * 899999)) };
  }
  function hcStage(h, t) { if (!h) return null; if (t < h.tIns) return "hoist"; if (t < h.tSent) return "filming"; if (!h.rec && t >= h.tSent) return "all_ok";
    if (h.tView == null || t < h.tView) return "sent"; if (h.tDec == null || t < h.tDec) return "viewed"; return h.acc ? "authorised" : "declined"; }
  // a synthetic month of inspections, so the KPIs come from the same engine the workshop runs
  function hcStats(S, n = 600) { const hs = []; for (let i = 0; i < n; i++) { const h = healthCheck({ id: i, start: 600 }, S); if (h) hs.push(h); }
    const k = hs.length || 1, sum = f => hs.reduce((a, h) => a + f(h), 0), withRec = hs.filter(h => h.rec), decided = hs.filter(h => h.tDec != null), mins = decided.map(h => h.tDec - h.tSent).sort((a, b) => a - b);
    return { share: hs.length / n, media: sum(h => h.media > 0 ? 1 : 0) / k, video: sum(h => h.video ? 1 : 0) / k, view: sum(h => h.tView != null ? 1 : 0) / k, recPer: sum(h => h.rec) / k, accRate: sum(h => h.acc) / Math.max(1, sum(h => h.rec)),
      identPer: sum(h => h.quoted) / k, apprPer: sum(h => h.approved) / k, minsToAuth: mins.length ? mins[Math.floor(mins.length / 2)] : 0, deferredPer: sum(h => h.items.filter(i => i.deferred).length) / k, withRec: withRec.length / k }; }
  const hcLift = S => 1 + (S.hc == null ? .6 : S.hc) * 0.17; // approved extra work, labour share: estimate
  const HC_LABOUR = 0.45, HC_FOLLOW = 0.7, HC_CALL_MIN = 6;

  // ------------------------------------------------------------------ the whole group, a month at a time
  // Every primitive carries where it came from: sim (this model), est (an assumption), bench (Deloitte), data (an uploaded file).
  const SIM = { t: "sim" }, EST = { t: "est" }, BEN = { t: "bench" };
  function simPrims(S) {
    const T = 30.4, wd = 21.7, P = {}, V = {};
    const put = (k, v, p) => { V[k] = v; P[k] = p; };
    const L = leads(S), day = fullDay(S, 7), others = Math.max(0, S.groupTechs - S.techs);
    const newUnits = S.stock / S.days * T, usedUnits = newUnits * S.usedRatio;
    put("newUnits", newUnits, SIM); put("newGpu", S.newGpu, BEN); put("newStock", S.stock, EST); put("newAge", S.days * 0.62, SIM); put("newCost", S.price * 0.9, EST);
    put("usedUnits", usedUnits, SIM); put("usedGpu", S.usedGpu, BEN); put("usedStock", usedUnits / T * 55, SIM); put("usedDaysToSale", 44, EST);
    put("reconDays", S.reconDays, EST); put("appraisals", usedUnits / S.appraiseToBuy * 1.25, SIM);
    put("fiPenNew", S.fiPenNew, BEN); put("fiPenUsed", S.fiPenUsed, BEN); put("fiPpd", S.fiPpd, EST);
    put("fiPerUnit", (BENCH.finPerUnitNew + BENCH.insPerUnitNew) * 0.53 + (BENCH.finPerUnitUsed + BENCH.insPerUnitUsed) * 0.47, BEN);
    const penLab = day.labour * wd, otherLab = others * BENCH.labourPerTech;
    put("labour", penLab + otherLab, SIM); put("ros", day.ros * wd * S.groupTechs / S.techs, SIM);
    put("hoursSold", day.hrs * wd * S.groupTechs / S.techs, SIM); put("hoursWorked", day.hrs * wd * S.groupTechs / S.techs / S.prod, SIM); put("techs", S.groupTechs, EST);
    put("serviceGp", .61, BEN); put("partsGp", .26, BEN);
    put("partsSales", (penLab + otherLab) * S.partsRatio, SIM); put("partsFill", S.partsFill, EST); put("partsObsolete", S.partsObsolete, EST);
    put("partsValue", (penLab + otherLab) * S.partsRatio * 12 * (1 - .26) / 14.5, SIM);
    put("leads", S.leads * T, SIM); put("respMins", L.avgMins, SIM); put("fast5", L.fastShare, SIM); put("apptRate", L.apptShare, SIM);
    put("afterHours", L.afterHours, EST); put("leadSold", L.sales / S.leads, EST); put("leadHour", LEADHOUR.slice(), EST);
    const online = L.sales * T, qsum = CHANNELS.reduce((a, c) => a + c.leads * c.q, 0);
    put("spend", Object.fromEntries(CHANNELS.map(c => [c.k, S.mktSpend * c.spend])), EST);
    put("leadsBy", Object.fromEntries(CHANNELS.map(c => [c.k, S.leads * T * c.leads])), EST);
    put("salesBy", Object.fromEntries([...CHANNELS.map(c => [c.k, online * c.leads * c.q / qsum]), ["walkin", Math.max(0, newUnits + usedUnits - online)]]), SIM);
    put("grossBy", null, SIM);
    put("nps", Math.round(44 + S.hc * 10 + (S.bdc ? 3 : 0) - Math.max(0, day.visit - 60) * 0.12), EST);
    put("csi", Math.min(97, 84 + S.hc * 5 + (S.bdc ? 1 : 0) - Math.max(0, day.visit - 60) * 0.05), EST);
    put("wait", day.visit, SIM);
    const W = mixW(S), tw = W.reduce((a, b) => a + b, 0);
    put("stockBy", Object.fromEntries(MARQUES.map((m, i) => [m.k, { new: S.stock * W[i] / tw, used: usedUnits / T * 55 * (0.5 * W[i] / tw + 0.5 / MARQUES.length) }])), EST);
    put("salesByMarque", Object.fromEntries(MARQUES.map((m, i) => [m.k, { new: newUnits * W[i] / tw, used: usedUnits * (0.5 * W[i] / tw + 0.5 / MARQUES.length) }])), EST);
    put("serviceByMarque", Object.fromEntries(MARQUES.map((m, i) => [m.k, V.ros * (0.7 * W[i] / tw + 0.3 / MARQUES.length)])), EST);
    put("bySite", null, SIM);
    // health checks (simulated until the health-check tool's feed is connected)
    const H = hcStats(S), insp = V.ros * H.share;
    put("hcShare", H.share, SIM); put("hcInsp", insp, SIM); put("hcMedia", H.media, EST); put("hcView", H.view, EST); put("hcRecPer", H.recPer, EST);
    put("hcAcc", H.accRate, EST); put("hcIdent", insp * H.identPer, SIM); put("hcAppr", insp * H.apprPer, SIM); put("hcPerRo", insp * H.apprPer / Math.max(1, V.ros), SIM);
    put("hcMins", H.minsToAuth, EST); put("hcDeferred", insp * H.deferredPer, SIM); put("hcFollow", HC_FOLLOW, EST); put("hcCallsSaved", insp * HC_CALL_MIN / 60, EST);
    // showroom footfall and the funnel (simulated until door counters are fitted)
    const deals = newUnits + usedUnits, groups = deals / FUNNEL.close;
    put("ffGroups", groups, SIM); put("ffPeople", groups * FUNNEL.party, EST); put("ffLogged", groups * FUNNEL.logged, EST); put("ffTd", groups * FUNNEL.td, EST); put("ffDeals", deals, SIM);
    return { V, P };
  }
  const FUNNEL = { close: 0.32, party: 1.7, logged: 0.62, td: 0.46 }; // estimates: visits that buy, people per group, groups logged by salespeople, groups that test drive
  // combine provenance of inputs into the provenance of a derived figure
  function mergeProv(...ps) {
    const ds = ps.filter(p => p && (p.t === "data" || p.t === "mix"));
    if (ds.length) { const files = [...new Set(ds.flatMap(p => p.files || [p.file]))].filter(Boolean), ranges = [...new Set(ds.map(p => p.range).filter(Boolean))];
      const all = ps.every(p => p && p.t === "data"); return { t: all ? "data" : "mix", files, file: files.join(", "), range: ranges.join("; ") }; }
    if (ps.some(p => p && p.t === "sim")) return SIM;
    if (ps.some(p => p && p.t === "est")) return EST;
    return BEN;
  }
  function compose({ V, P }) {
    const F = {}, PR = {}, f = (k, v, ...from) => { F[k] = v; PR[k] = mergeProv(...from.map(x => P[x] || (typeof x === "object" ? x : BEN))); };
    for (const k in V) { F[k] = V[k]; PR[k] = P[k]; }
    const T = 30.4;
    f("newGross", V.newUnits * V.newGpu, "newUnits", "newGpu");
    f("usedGross", V.usedUnits * V.usedGpu, "usedUnits", "usedGpu");
    f("daysSupply", V.newStock / Math.max(0.1, V.newUnits / T), "newStock", "newUnits");
    f("usedDaysSupply", V.usedStock / Math.max(0.1, V.usedUnits / T), "usedStock", "usedUnits");
    f("lookToBook", V.usedUnits / Math.max(1, V.appraisals), "usedUnits", "appraisals");
    const retail = V.newUnits + V.usedUnits; f("retail", retail, "newUnits", "usedUnits");
    f("fiPen", (V.fiPenNew * V.newUnits + V.fiPenUsed * V.usedUnits) / Math.max(1, retail), "fiPenNew", "fiPenUsed", "newUnits");
    f("fiGross", V.fiPerUnit * retail, "fiPerUnit", "newUnits", "usedUnits");
    f("serviceGross", V.labour * V.serviceGp, "labour", "serviceGp");
    f("perTech", V.labour / Math.max(1, V.techs), "labour", "techs");
    f("eff", V.hoursSold / Math.max(1, V.hoursWorked), "hoursSold", "hoursWorked");
    f("partsGross", V.partsSales * V.partsGp, "partsSales", "partsGp");
    f("partsTurn", V.partsSales * 12 * (1 - V.partsGp) / Math.max(1, V.partsValue), "partsSales", "partsGp", "partsValue");
    // marketing: cost per lead, per sale, return on spend by channel
    const keys = [...new Set([...Object.keys(V.spend), ...Object.keys(V.leadsBy), ...Object.keys(V.salesBy)])];
    const gpu = (V.newGpu * V.newUnits + V.usedGpu * V.usedUnits) / Math.max(1, retail) + V.fiPerUnit;
    const byCh = keys.map(k => { const spend = V.spend[k] || 0, leads = V.leadsBy[k] || 0, sales = V.salesBy[k] || 0, gross = V.grossBy && V.grossBy[k] != null ? V.grossBy[k] : sales * gpu;
      return { k, n: chName(k), spend, leads, sales, gross, cpl: leads ? spend / leads : null, cps: sales ? spend / sales : null, roi: spend ? gross / spend : null }; })
      .sort((a, b) => b.spend - a.spend || b.leads - a.leads);
    const spendT = byCh.reduce((a, c) => a + c.spend, 0), leadsT = byCh.reduce((a, c) => a + c.leads, 0), paidSales = byCh.filter(c => c.spend > 0).reduce((a, c) => a + c.sales, 0);
    const paidGross = byCh.filter(c => c.spend > 0).reduce((a, c) => a + c.gross, 0);
    f("byCh", byCh, "spend", "leadsBy", "salesBy"); f("spendT", spendT, "spend"); f("cpl", spendT / Math.max(1, leadsT), "spend", "leadsBy");
    f("cps", spendT / Math.max(1, retail), "spend", "newUnits", "usedUnits"); f("roi", paidGross / Math.max(1, spendT), "spend", "salesBy");
    f("paidSales", paidSales, "salesBy");
    // the group P&L (Deloitte structure): department gross, selling expenses, fixed overheads, absorption
    const g = { new: F.newGross, used: F.usedGross, fi: F.fiGross, service: F.serviceGross, parts: F.partsGross };
    const vehGross = g.new + g.used + g.service + g.parts;
    const sellExp = g.new * BENCH.sellExp.new + g.used * BENCH.sellExp.used + g.parts * BENCH.sellExp.parts + g.service * BENCH.sellExp.service + g.fi * BENCH.fiCost;
    const fixed = vehGross * BENCH.overheads, expenses = sellExp + fixed;
    const sales = V.newUnits * (V.newCost / 0.9) + V.usedUnits * BASE.usedPrice + V.labour + V.partsSales;
    const net = vehGross + g.fi - expenses;
    f("pl", { gross: g, total: vehGross + g.fi, sellExp, fixed, expenses, absorption: (g.service + g.parts) / expenses, net, sales, netPct: net / sales },
      "newGross", PR.newGross, PR.usedGross, PR.fiGross, PR.serviceGross, PR.partsGross);
    PR.absorption = mergeProv(PR.serviceGross, PR.partsGross); PR.net = PR.pl;
    return { F, P: PR };
  }
  function group(S) { return compose(simPrims(S)); }

  // ------------------------------------------------------------------ the data contract: six aggregate tables, no personal information
  const CONTRACT = {
    vehicles: { n: "Vehicles in stock", fields: [
      { k: "vehicle_id", t: "string", req: 1, syn: ["stock_no", "stock_number", "stockno", "stock_id", "stock", "unit_id", "id"] },
      { k: "marque", t: "string", req: 1, syn: ["make", "brand", "franchise", "manufacturer"] },
      { k: "model", t: "string", req: 0, syn: ["model_name", "variant", "description"] },
      { k: "condition", t: "condition", req: 1, syn: ["new_used", "n_u", "nu", "stock_type", "vehicle_type", "type", "category"] },
      { k: "days_in_stock", t: "number", req: 1, syn: ["age", "days", "stock_days", "ageing", "aging", "age_days", "days_in_inventory"] },
      { k: "cost", t: "number", req: 1, syn: ["cost_price", "book_value", "total_cost", "stock_value", "landed_cost"] },
      { k: "list_price", t: "number", req: 0, syn: ["price", "retail_price", "advertised_price", "sticker", "rrp", "asking_price"] },
      { k: "site", t: "string", req: 0, syn: ["branch", "location", "dealership", "rooftop", "yard"] },
      { k: "stage", t: "string", req: 0, syn: ["status", "recon_status", "used_stage"] },
      { k: "as_at", t: "date", req: 0, syn: ["as_at_date", "snapshot_date", "report_date"] }] },
    deals: { n: "Deals", fields: [
      { k: "deal_date", t: "date", req: 1, syn: ["date", "sale_date", "delivery_date", "invoice_date", "contract_date", "sold_date"] },
      { k: "marque", t: "string", req: 1, syn: ["make", "brand", "franchise", "manufacturer"] },
      { k: "condition", t: "condition", req: 1, syn: ["new_used", "n_u", "nu", "type", "sale_type", "vehicle_type"] },
      { k: "front_gross", t: "number", req: 1, syn: ["front_end_gross", "vehicle_gross", "gross", "front", "front_end", "gross_profit"] },
      { k: "back_gross", t: "number", req: 0, syn: ["back_end_gross", "fi_income", "f_i_income", "f_i_gross", "back_end", "finance_income", "fi_gross"] },
      { k: "fi_products", t: "int", req: 0, syn: ["products", "f_i_products", "products_sold", "fi_count", "aftermarket_products"] },
      { k: "financed", t: "bool", req: 0, syn: ["finance", "finance_deal", "is_financed", "hp"] },
      { k: "lead_source", t: "string", req: 0, syn: ["source", "enquiry_source", "lead_type", "channel", "marketing_source"] },
      { k: "days_in_stock", t: "number", req: 0, syn: ["age_at_sale", "days_to_sale", "stock_days"] },
      { k: "site", t: "string", req: 0, syn: ["branch", "location", "dealership", "rooftop"] }] },
    repair_orders: { n: "Repair orders", fields: [
      { k: "ro_date", t: "date", req: 1, syn: ["date", "open_date", "closed_date", "invoice_date", "ro_closed", "job_date"] },
      { k: "site", t: "string", req: 0, syn: ["branch", "location", "service_centre", "workshop"] },
      { k: "type", t: "string", req: 0, syn: ["ro_type", "job_type", "labour_type", "pay_type", "work_type"] },
      { k: "hours_sold", t: "number", req: 1, syn: ["sold_hours", "billed_hours", "flagged_hours", "hours_billed", "labour_hours"] },
      { k: "hours_worked", t: "number", req: 0, syn: ["clocked_hours", "actual_hours", "worked_hours", "hours_clocked"] },
      { k: "labour_sales", t: "number", req: 1, syn: ["labour", "labour_amount", "labour_value", "labour_revenue", "labor_sales"] },
      { k: "parts_sales", t: "number", req: 0, syn: ["parts", "parts_amount", "parts_value", "parts_revenue"] },
      { k: "bay", t: "string", req: 0, syn: ["hoist", "bay_no", "bay_number", "lift"] },
      { k: "marque", t: "string", req: 0, syn: ["make", "brand", "franchise"] }] },
    parts: { n: "Parts stock", fields: [
      { k: "part_id", t: "string", req: 0, syn: ["sku", "part_number", "part_no", "item", "item_code", "bin"] },
      { k: "on_hand", t: "number", req: 0, syn: ["qty", "quantity", "soh", "stock_on_hand", "qty_on_hand"] },
      { k: "stock_value", t: "number", req: 1, syn: ["value", "cost_value", "total_cost", "extended_cost", "inventory_value"] },
      { k: "last_sale_date", t: "date", req: 0, syn: ["last_sold", "last_issue", "last_movement", "last_sale", "date_last_sold"] },
      { k: "lines_requested", t: "number", req: 0, syn: ["requests", "lines_ordered", "demand_lines"] },
      { k: "lines_filled", t: "number", req: 0, syn: ["filled", "first_pick_fills", "lines_supplied_from_stock"] },
      { k: "cost_of_sales_12m", t: "number", req: 0, syn: ["cos_12m", "cost_of_sales", "annual_cost_of_sales", "usage_value_12m"] },
      { k: "site", t: "string", req: 0, syn: ["branch", "location", "warehouse"] }] },
    leads: { n: "Leads", fields: [
      { k: "lead_date", t: "datetime", req: 1, syn: ["date", "created", "received", "enquiry_date", "created_at", "timestamp", "lead_created"] },
      { k: "source", t: "string", req: 1, syn: ["lead_source", "enquiry_source", "origin", "provider", "marketing_source"] },
      { k: "channel", t: "string", req: 0, syn: ["medium", "method", "contact_method", "enquiry_type", "lead_type"] },
      { k: "first_response_minutes", t: "number", req: 0, syn: ["response_mins", "response_time", "first_response", "minutes_to_respond", "response_minutes", "time_to_first_response"] },
      { k: "appointment", t: "bool", req: 0, syn: ["appt", "appointment_set", "booked", "appointment_made", "test_drive"] },
      { k: "sold", t: "bool", req: 0, syn: ["won", "converted", "purchased", "closed_won", "sale"] },
      { k: "marque", t: "string", req: 0, syn: ["make", "brand", "franchise"] }] },
    marketing_spend: { n: "Marketing spend", fields: [
      { k: "month", t: "month", req: 1, syn: ["period", "date", "month_start", "yyyy_mm"] },
      { k: "channel", t: "string", req: 1, syn: ["source", "media", "medium", "platform", "lead_source"] },
      { k: "amount", t: "number", req: 1, syn: ["spend", "cost", "value", "total", "amount_nzd", "net_spend"] }] },
    footfall: { n: "Showroom footfall", fields: [
      { k: "date", t: "datetime", req: 1, syn: ["count_date", "day", "period_start", "timestamp", "interval_start"] },
      { k: "site", t: "string", req: 0, syn: ["branch", "location", "store", "showroom", "rooftop"] },
      { k: "entries", t: "number", req: 1, syn: ["ins", "in", "people_in", "visitors", "footfall", "traffic", "in_count", "enters", "count_in"] },
      { k: "groups", t: "number", req: 0, syn: ["parties", "visiting_groups", "groups_in"] },
      { k: "logged_walkins", t: "number", req: 0, syn: ["walk_ins", "walkins", "crm_walkins", "ups", "floor_ups"] },
      { k: "test_drives", t: "number", req: 0, syn: ["testdrives", "demo_drives", "td"] },
      { k: "source", t: "string", req: 0, syn: ["counter", "device", "method", "system"] }] },
    healthChecks: { n: "Health checks (per item)", fields: [
      { k: "jobId", t: "string", req: 1, syn: ["jobid", "job_id", "job_hash", "inspection_id", "inspectionid", "check_id", "ro_hash"] },
      { k: "site", t: "string", req: 0, syn: ["branch", "location", "workshop", "service_centre"] },
      { k: "inspectedAt", t: "datetime", req: 0, syn: ["inspectedat", "inspected_at", "created", "inspection_date", "date"] },
      { k: "item", t: "string", req: 1, syn: ["item_name", "check_item", "operation", "line", "description"] },
      { k: "itemStatus", t: "status", req: 1, syn: ["itemstatus", "item_status", "status", "rag", "result", "condition"] },
      { k: "mediaCount", t: "int", req: 0, syn: ["mediacount", "media_count", "photos", "videos", "media", "attachments"] },
      { k: "quoted", t: "number", req: 0, syn: ["quote", "quoted_amount", "price", "amount", "value", "total_incl"] },
      { k: "accepted", t: "bool", req: 0, syn: ["approved", "authorised", "authorized", "customer_accepted", "selected"] },
      { k: "sentAt", t: "datetime", req: 0, syn: ["sentat", "sent_at", "sent", "report_sent"] },
      { k: "viewedAt", t: "datetime", req: 0, syn: ["viewedat", "viewed_at", "viewed", "opened_at", "first_viewed"] },
      { k: "authorisedAt", t: "datetime", req: 0, syn: ["authorisedat", "authorised_at", "authorizedat", "authorized_at", "decided_at", "decision_at"] },
      { k: "deferred", t: "bool", req: 0, syn: ["deferred_work", "declined", "follow_up"] }] } };
  const PII = /(^|_)(customer|client|first|last|sur|full|given|family)?_?name$|^name$|phone|mobile|cell|e_?mail|address|street|suburb|postcode|rego|plate|registration_no|^vin$|chassis|licen[cs]e|birth|^dob$|salesperson|advisor_name/;
  const norm = h => String(h).toLowerCase().replace(/&/g, "_").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // ---- CSV: delimiter sniffing, quotes, CRLF
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, "");
    const first = text.split(/\r?\n/, 1)[0] || "", cand = [",", ";", "\t", "|"];
    const delim = cand.map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true; else if (c === delim) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some(x => x.trim() !== "")) rows.push(row); row = []; }
      else cell += c; }
    if (cell !== "" || row.length) { row.push(cell); if (row.some(x => x.trim() !== "")) rows.push(row); }
    const headers = (rows.shift() || []).map(h => h.trim());
    return { headers, rows, delim };
  }
  function scoreField(h, f) { const n = norm(h); if (n === f.k) return 3; if (f.syn.includes(n)) return 2; if (f.syn.some(s => n.includes(s) && s.length > 3) || n.includes(f.k)) return 1; return 0; }
  function autoMap(headers, table) {
    const map = {}, used = new Set();
    for (const f of CONTRACT[table].fields) { let best = null, bs = 0;
      headers.forEach((h, i) => { if (used.has(i)) return; const s = scoreField(h, f); if (s > bs) { bs = s; best = i; } });
      if (best != null) { map[f.k] = best; used.add(best); } }
    return map;
  }
  function detectTable(headers) {
    const scores = Object.keys(CONTRACT).map(t => { const m = autoMap(headers, t), fs = CONTRACT[t].fields;
      const req = fs.filter(f => f.req), hit = req.filter(f => m[f.k] != null).length, opt = fs.filter(f => !f.req && m[f.k] != null).length;
      return { t, score: hit / req.length + opt * 0.05, complete: hit === req.length, map: m }; }).sort((a, b) => b.score - a.score);
    return scores[0];
  }
  // ---- values: NZ date order (dd/mm/yyyy) unless ISO; $, commas and (negatives)
  function parseDate(s, withTime) {
    s = String(s || "").trim(); if (!s) return null; let m, d;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/))) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)));
    else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?)?/i))) { let y = +m[3]; if (y < 100) y += 2000; let h = +(m[4] || 0); if (m[6]) { h = h % 12 + (m[6].toLowerCase() === "pm" ? 12 : 0); }
      d = new Date(Date.UTC(y, +m[2] - 1, +m[1], h, +(m[5] || 0))); if (d.getUTCMonth() !== +m[2] - 1) return null; }
    else if ((m = s.match(/^(\d{4})[-\/](\d{1,2})$/))) d = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
    else return null;
    return isNaN(d) ? null : d;
  }
  const parseNum = s => { s = String(s ?? "").trim(); if (s === "") return null; let neg = /^\(.*\)$/.test(s) || /^-/.test(s); s = s.replace(/[()$,\s]|NZD|-/gi, ""); if (s === "" || isNaN(+s)) return NaN; return neg ? -+s : +s; };
  const parseBool = s => { s = String(s ?? "").trim().toLowerCase(); if (s === "") return null; if (/^(y|yes|true|1|x|booked|won|sold)$/.test(s)) return true; if (/^(n|no|false|0|lost|-)$/.test(s)) return false; return undefined; };
  const parseStatus = s => { s = String(s ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"); if (!s) return null; if (/^(urgent|red|r|fail|immediate)/.test(s)) return "urgent";
    if (/^(recommended|amber|a|yellow|advisory|future|attention)/.test(s)) return "recommended"; if (/^(ok|green|g|pass|good)/.test(s)) return "ok"; if (/^(not_checked|nc|n_a|na|blue|unchecked)/.test(s)) return "not_checked"; return undefined; };
  const parseCond = s => { s = String(s ?? "").trim().toLowerCase(); if (/^(n|new)$/.test(s) || s.startsWith("new")) return "new"; if (/^(u|used|pre-?owned|second.?hand|trade)/.test(s)) return "used"; if (/^(d|demo|demonstrator)/.test(s)) return "demo"; return null; };
  const ymd = d => d.toISOString().slice(0, 10);
  function validate(parsed, map, table) {
    const fs = CONTRACT[table].fields, out = [], errs = {}, warn = [], ex = {}; let minD = null, maxD = null;
    const mappedCols = new Set(Object.values(map));
    const pii = parsed.headers.map((h, i) => ({ h, i })).filter(x => !mappedCols.has(x.i) && PII.test(norm(x.h))).map(x => x.h);
    const ignored = parsed.headers.filter((h, i) => !mappedCols.has(i) && !pii.includes(h));
    const missing = fs.filter(f => f.req && map[f.k] == null).map(f => f.k);
    if (missing.length) return { ok: false, table, rows: [], read: parsed.rows.length, accepted: 0, rejected: parsed.rows.length, missing, pii, ignored, reasons: [], warnings: [] };
    parsed.rows.forEach((r, ri) => { const o = {}; let bad = null;
      for (const f of fs) { if (map[f.k] == null) continue; const raw = r[map[f.k]]; let v;
        if (f.t === "number" || f.t === "int") { v = parseNum(raw); if (Number.isNaN(v)) { bad = bad || [f.k, raw]; v = null; } else if (v != null && f.t === "int") v = Math.round(v); }
        else if (f.t === "date" || f.t === "datetime" || f.t === "month") { v = parseDate(raw, f.t === "datetime"); if (!v && String(raw || "").trim()) { bad = bad || [f.k, raw]; } if (v) { if (!minD || v < minD) minD = v; if (!maxD || v > maxD) maxD = v; } }
        else if (f.t === "bool") { v = parseBool(raw); if (v === undefined) { bad = bad || [f.k, raw]; v = null; } }
        else if (f.t === "condition") { v = parseCond(raw); if (!v && String(raw || "").trim()) bad = bad || [f.k, raw]; }
        else if (f.t === "status") { v = parseStatus(raw); if (v === undefined) { bad = bad || [f.k, raw]; v = null; } }
        else v = String(raw ?? "").trim() || null;
        if (f.req && (v == null || v === "") && !bad) bad = [f.k, raw == null ? "" : raw];
        o[f.k] = v; }
      if (o.marque !== undefined && o.marque) o.mk = marqueKey(o.marque);
      if (bad) { const key = bad[0]; errs[key] = (errs[key] || 0) + 1; if (!ex[key]) ex[key] = `row ${ri + 2}: ${key} "${String(bad[1]).slice(0, 24)}" is ${bad[1] === "" ? "empty" : "not a valid " + (fs.find(f => f.k === key).t)}`; return; }
      out.push(o); });
    if (table === "vehicles") { const ids = new Set(); let dup = 0; out.forEach(o => { if (ids.has(o.vehicle_id)) dup++; ids.add(o.vehicle_id); }); if (dup) warn.push(`${dup} repeated vehicle_id values`);
      const neg = out.filter(o => o.days_in_stock < 0).length; if (neg) warn.push(`${neg} rows with negative days in stock`); }
    if (table === "deals") { const big = out.filter(o => Math.abs(o.front_gross) > 60000).length; if (big) warn.push(`${big} deals with front gross over $60,000: check the column`); }
    const unknown = out.filter(o => o.mk === "other").length; if (unknown) warn.push(`${unknown} rows with a marque not on ${DD.brandList || "the group's brand list"} (counted as Other)`);
    return { ok: out.length > 0, table, rows: out, read: parsed.rows.length, accepted: out.length, rejected: parsed.rows.length - out.length, missing: [], pii, ignored,
      reasons: Object.entries(errs).map(([k, n]) => ({ k, n, ex: ex[k] })), warnings: warn, range: minD ? [ymd(minD), ymd(maxD)] : null };
  }

  // ---- real aggregates in, the same shape out
  const span = (rows, k) => { const ds = rows.map(r => r[k]).filter(Boolean).map(d => +d); if (!ds.length) return 1; return Math.max(1, (Math.max(...ds) - Math.min(...ds)) / 864e5 + 1) / 30.4; };
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  function fromData(tables, S = BASE) {
    const base = simPrims(S), V = { ...base.V }, P = { ...base.P };
    const prov = (tb) => ({ t: "data", file: tb.file, files: [tb.file], range: tb.range ? (tb.range[0] === tb.range[1] ? tb.range[0] : tb.range[0] + " to " + tb.range[1]) : "" });
    const set = (k, v, p) => { if (v == null || Number.isNaN(v)) return; V[k] = v; P[k] = p; };
    const tb = tables || {};
    if (tb.deals && tb.deals.rows.length) { const R = tb.deals.rows, p = prov(tb.deals), mo = span(R, "deal_date");
      const nw = R.filter(r => r.condition !== "used"), us = R.filter(r => r.condition === "used");
      set("newUnits", nw.length / mo, p); set("usedUnits", us.length / mo, p);
      if (nw.length) set("newGpu", mean(nw.map(r => r.front_gross)), p); if (us.length) set("usedGpu", mean(us.map(r => r.front_gross)), p);
      const bg = R.filter(r => r.back_gross != null); if (bg.length) set("fiPerUnit", mean(bg.map(r => r.back_gross)), p);
      const fin = r => r.financed != null ? r.financed : (r.fi_products != null ? r.fi_products > 0 : null);
      const fn = nw.filter(r => fin(r) != null), fu = us.filter(r => fin(r) != null);
      if (fn.length) set("fiPenNew", fn.filter(fin).length / fn.length, p); if (fu.length) set("fiPenUsed", fu.filter(fin).length / fu.length, p);
      const pp = R.filter(r => r.fi_products != null); if (pp.length) set("fiPpd", mean(pp.map(r => r.fi_products)), p);
      const ds = us.filter(r => r.days_in_stock != null); if (ds.length) set("usedDaysToSale", mean(ds.map(r => r.days_in_stock)), p);
      const sm = {}; R.forEach(r => { const k = r.mk || "other"; sm[k] = sm[k] || { new: 0, used: 0 }; sm[k][r.condition === "used" ? "used" : "new"] += 1 / mo; }); set("salesByMarque", sm, p);
      if (R.some(r => r.lead_source)) { const sb = {}, gb = {}; R.forEach(r => { const k = chKey(r.lead_source) || "walkin"; sb[k] = (sb[k] || 0) + 1 / mo; gb[k] = (gb[k] || 0) + ((r.front_gross || 0) + (r.back_gross || 0)) / mo; });
        set("salesBy", sb, p); set("grossBy", gb, p); } }
    if (tb.vehicles && tb.vehicles.rows.length) { const R = tb.vehicles.rows, p = prov(tb.vehicles);
      const nw = R.filter(r => r.condition !== "used"), us = R.filter(r => r.condition === "used");
      set("newStock", nw.length, p); set("usedStock", us.length, p);
      if (nw.length) { set("newAge", mean(nw.map(r => r.days_in_stock)), p); set("newCost", mean(nw.map(r => r.cost)), p); }
      const sb = {}; R.forEach(r => { const k = r.mk || "other"; sb[k] = sb[k] || { new: 0, used: 0 }; sb[k][r.condition === "used" ? "used" : "new"]++; }); set("stockBy", sb, p);
      const site = {}; R.forEach(r => { if (!r.site) return; site[r.site] = site[r.site] || {}; const k = r.mk || "other"; site[r.site][k] = (site[r.site][k] || 0) + 1; }); if (Object.keys(site).length) set("bySite", site, p);
      const rc = us.filter(r => r.stage && /recon/i.test(r.stage)); if (rc.length) set("reconCount", rc.length, p); }
    if (tb.repair_orders && tb.repair_orders.rows.length) { const R = tb.repair_orders.rows, p = prov(tb.repair_orders), mo = span(R, "ro_date");
      set("ros", R.length / mo, p); set("labour", R.reduce((a, r) => a + (r.labour_sales || 0), 0) / mo, p); set("hoursSold", R.reduce((a, r) => a + (r.hours_sold || 0), 0) / mo, p);
      const hw = R.filter(r => r.hours_worked != null); if (hw.length) set("hoursWorked", hw.reduce((a, r) => a + r.hours_worked, 0) / mo * R.length / hw.length, p);
      const ps = R.filter(r => r.parts_sales != null); if (ps.length && !(tb.parts && tb.parts.rows.some(r => r.cost_of_sales_12m != null))) {
        // workshop parts are about 31% of a dealer's parts sales (Deloitte NZ 2026 parts mix)
        set("partsSales", ps.reduce((a, r) => a + r.parts_sales, 0) / mo / 0.31, { ...p, t: "mix", note: "÷ Deloitte workshop share 31%" }); }
      if (R.some(r => r.mk)) { const sm = {}; R.forEach(r => { const k = r.mk || "other"; sm[k] = (sm[k] || 0) + 1 / mo; }); set("serviceByMarque", sm, p); } }
    if (tb.parts && tb.parts.rows.length) { const R = tb.parts.rows, p = { ...prov(tb.parts), range: tb.parts.range ? tb.parts.range[1] : "" }, val = R.reduce((a, r) => a + (r.stock_value || 0), 0);
      set("partsValue", val, p);
      const asAt = Math.max(...R.map(r => r.last_sale_date ? +r.last_sale_date : 0)) || Date.now();
      const ls = R.filter(r => r.last_sale_date || r.last_sale_date === null); if (R.some(r => r.last_sale_date)) set("partsObsolete", R.filter(r => !r.last_sale_date || asAt - r.last_sale_date > 365 * 864e5).reduce((a, r) => a + (r.stock_value || 0), 0) / Math.max(1, val), p);
      const rq = R.filter(r => r.lines_requested != null && r.lines_filled != null); if (rq.length) set("partsFill", rq.reduce((a, r) => a + r.lines_filled, 0) / Math.max(1, rq.reduce((a, r) => a + r.lines_requested, 0)), p);
      const cs = R.filter(r => r.cost_of_sales_12m != null); if (cs.length) set("partsSales", cs.reduce((a, r) => a + r.cost_of_sales_12m, 0) / 12 / (1 - V.partsGp), { ...p, t: "mix", note: "÷ benchmark margin" }); }
    if (tb.leads && tb.leads.rows.length) { const R = tb.leads.rows, p = prov(tb.leads), mo = span(R, "lead_date");
      set("leads", R.length / mo, p);
      const rs = R.filter(r => r.first_response_minutes != null).map(r => r.first_response_minutes); if (rs.length) { set("respMins", median(rs), p); set("fast5", rs.filter(x => x <= 5).length / rs.length, p); }
      const ap = R.filter(r => r.appointment != null); if (ap.length) set("apptRate", ap.filter(r => r.appointment).length / ap.length, p);
      const so = R.filter(r => r.sold != null); if (so.length) set("leadSold", so.filter(r => r.sold).length / so.length, p);
      const hrs = new Array(24).fill(0); let timed = 0; R.forEach(r => { const d = r.lead_date; if (d && (d.getUTCHours() || d.getUTCMinutes())) { hrs[d.getUTCHours()]++; timed++; } });
      if (timed > R.length * 0.5) { set("leadHour", hrs.map(x => x / timed), p); set("afterHours", hrs.reduce((a, x, h) => a + (h < 8.5 || h >= 17.5 ? x : 0), 0) / timed, p); }
      const lb = {}; R.forEach(r => { const k = chKey(r.source) || "other"; lb[k] = (lb[k] || 0) + 1 / mo; }); set("leadsBy", lb, p);
      if (!(tb.deals && tb.deals.rows.some(r => r.lead_source)) && so.length) { const sb = {}; R.filter(r => r.sold).forEach(r => { const k = chKey(r.source) || "other"; sb[k] = (sb[k] || 0) + 1 / mo; });
        sb.walkin = Math.max(0, V.newUnits + V.usedUnits - Object.values(sb).reduce((a, b) => a + b, 0)); set("salesBy", sb, p); } }
    if (tb.marketing_spend && tb.marketing_spend.rows.length) { const R = tb.marketing_spend.rows, p = prov(tb.marketing_spend);
      const months = new Set(R.map(r => r.month && ymd(r.month).slice(0, 7))).size || 1, sp = {};
      R.forEach(r => { const k = chKey(r.channel) || "other"; sp[k] = (sp[k] || 0) + (r.amount || 0) / months; }); set("spend", sp, p); }
    if (tb.footfall && tb.footfall.rows.length) { const R = tb.footfall.rows, p = prov(tb.footfall), mo = span(R, "date"), tot = R.reduce((a, r) => a + (r.entries || 0), 0);
      set("ffPeople", tot / mo, p); const g = R.filter(r => r.groups != null); set("ffGroups", g.length ? g.reduce((a, r) => a + r.groups, 0) / mo * R.length / g.length : tot / FUNNEL.party / mo, g.length ? p : { ...p, t: "mix", note: "÷ estimated group size" });
      const lw = R.filter(r => r.logged_walkins != null); if (lw.length) set("ffLogged", lw.reduce((a, r) => a + r.logged_walkins, 0) / mo, p);
      const td = R.filter(r => r.test_drives != null); if (td.length) set("ffTd", td.reduce((a, r) => a + r.test_drives, 0) / mo, p); }
    if (tb.healthChecks && tb.healthChecks.rows.length) { const R = tb.healthChecks.rows, p = prov(tb.healthChecks), mo = span(R, "inspectedAt"), jobs = {};
      R.forEach(r => { const j = jobs[r.jobId] = jobs[r.jobId] || { rec: 0, acc: 0, q: 0, a: 0, media: 0, sent: null, view: null, auth: null, def: 0, seenAcc: false };
        if (r.itemStatus === "urgent" || r.itemStatus === "recommended") { j.rec++; j.q += r.quoted || 0; if (r.accepted) { j.acc++; j.a += r.quoted || 0; } if (r.accepted != null) j.seenAcc = true; if (r.deferred || r.accepted === false) j.def++; }
        j.media = Math.max(j.media, r.mediaCount || 0); j.sent = j.sent || r.sentAt; j.view = j.view || r.viewedAt; j.auth = j.auth || r.authorisedAt; });
      const J = Object.values(jobs), n = J.length, recT = J.reduce((a, j) => a + j.rec, 0);
      set("hcInsp", n / mo, p); if (V.ros) set("hcShare", Math.min(1, n / mo / V.ros), mergeProv(p, P.ros));
      if (R.some(r => r.mediaCount != null)) set("hcMedia", J.filter(j => j.media > 0).length / n, p);
      const sent = J.filter(j => j.sent); if (sent.length) set("hcView", sent.filter(j => j.view).length / sent.length, p);
      set("hcRecPer", recT / n, p); if (J.some(j => j.seenAcc)) set("hcAcc", J.reduce((a, j) => a + j.acc, 0) / Math.max(1, recT), p);
      if (R.some(r => r.quoted != null)) { set("hcIdent", J.reduce((a, j) => a + j.q, 0) / mo, p); set("hcAppr", J.reduce((a, j) => a + j.a, 0) / mo, p); set("hcPerRo", J.reduce((a, j) => a + j.a, 0) / mo / Math.max(1, V.ros), mergeProv(p, P.ros)); }
      const mins = J.filter(j => j.sent && j.auth).map(j => (j.auth - j.sent) / 6e4).filter(x => x >= 0).sort((a, b) => a - b); if (mins.length) set("hcMins", mins[Math.floor(mins.length / 2)], p);
      set("hcDeferred", J.reduce((a, j) => a + j.def, 0) / mo, p); set("hcCallsSaved", n / mo * HC_CALL_MIN / 60, { ...p, t: "mix", note: "× estimated minutes per call" }); }
    const out = compose({ V, P }); out.tables = Object.keys(tb).filter(k => tb[k] && tb[k].rows && tb[k].rows.length); return out;
  }

  // ---- a commercial day: leads, showroom visits, deals, appraisals, recon and parts, in minutes from midnight (for the 3D scene)
  function commerceDay(S, F, seed = 5) {
    const R = rng(seed * 7919 + 11), T = 26, ev = { leads: [], visits: [], deals: [], appraisals: [], recon: [], usedSales: [] };
    const hour = F.leadHour || LEADHOUR, chs = Object.entries(F.leadsBy || {}), chW = chs.map(c => c[1]);
    const nLeads = Math.round((F.leads || S.leads * 30.4) / 30.4), apr = Math.max(0.02, F.apptRate || .18), slow = (F.respMins || 60) / Math.max(1, leads(S).avgMins);
    for (let i = 0; i < nLeads; i++) { const h = pickW(R(), hour), t = h * 60 + R() * 60; let resp = respMins(S, h + R() * 0.99) * (S.bdc > 0 && h >= 7 && h < 22 ? 1 : slow) * (0.6 + R() * 0.8);
      const ch = chs.length ? chs[pickW(R(), chW)][0] : "website"; ev.leads.push({ id: i, t, ch, resp, ans: t + resp, appt: R() < apr * (resp <= 5 ? 1.3 : resp > 240 ? 0.8 : 1) }); }
    ev.leads.sort((a, b) => a.t - b.t);
    const W = mixW(S), deals = Math.round((F.newUnits + F.usedUnits) / T), visits = Math.round(deals / 0.32), desks = 6;
    for (let i = 0; i < visits; i++) { const t = 9 * 60 + R() * (8 * 60), dur = 35 + R() * 55, buy = i < deals;
      const td = buy ? R() < .9 : R() < (FUNNEL.td - FUNNEL.close * .9) / (1 - FUNNEL.close), people = 1 + (R() < .5 ? 1 : 0) + (R() < .2 ? 1 : 0);
      ev.visits.push({ id: i, t, end: t + dur, buy, td, people, logged: buy || R() < (FUNNEL.logged - FUNNEL.close) / (1 - FUNNEL.close), mk: pickW(R(), W), used: R() < F.usedUnits / Math.max(1, F.newUnits + F.usedUnits), body: R() }); }
    ev.visits.sort((a, b) => a.t - b.t);
    ev.visits.forEach((v, i) => { v.desk = i % desks; });
    const offices = [0, 0, 0, 0];
    ev.visits.filter(v => v.buy).sort((a, b) => a.end - b.end).forEach((v, i) => { let o = 0; for (let k = 1; k < 4; k++) if (offices[k] < offices[o]) o = k;
      const fi0 = Math.max(v.end + 5, offices[o]), fi1 = fi0 + 35 + R() * 25; offices[o] = fi1 + 5;
      const prods = R() < (F.fiPen || .28) + .25 ? 1 + Math.round(R() * ((F.fiPpd || 1.4) * 1.4 - 1)) : 0;
      ev.deals.push({ id: i, v, office: o, fi0, fi1, hand0: fi1 + 10, hand1: fi1 + 40, prods, mk: v.mk, used: v.used, body: v.body }); });
    const nApp = Math.round((F.appraisals || F.usedUnits * 2) / T);
    for (let i = 0; i < nApp; i++) { const t = 8.5 * 60 + R() * 9 * 60; ev.appraisals.push({ id: i, t, end: t + 20 + R() * 15, buy: R() < (F.lookToBook || .6) * 1.1, mk: pickW(R(), W), body: R() }); }
    const thru = Math.max(1, Math.round(F.usedUnits / T)), bays = 3;
    for (let i = 0; i < thru; i++) { const bay = i % bays, slot = Math.floor(i / bays), per = (CLOSE - OPEN) / Math.ceil(thru / bays);
      const t0 = OPEN + slot * per + R() * 10, t1 = t0 + per * 0.8; ev.recon.push({ id: i, bay, t0, t1, photo0: t1 + 5, photo1: t1 + 30, mk: pickW(R(), W), body: R() }); }
    for (let i = 0; i < thru; i++) { const t = 9.5 * 60 + R() * 7.5 * 60; ev.usedSales.push({ id: i, t, slot: Math.floor(R() * 40), mk: pickW(R(), W), body: R() }); }
    return ev;
  }

  // ---- sample exports, generated in the page so a demo never touches real data (made-up numbers, no personal information)
  function sampleCSV(table, seed = 42) {
    const R = rng(seed + table.length * 31), S = BASE, W = MARQUES.map(m => m.share), pick = a => a[Math.floor(R() * a.length)];
    const sitesFor = mk => { const s = SITES.filter(x => x.m.includes(MARQUES[mk].n)); return s.length ? pick(s).n : DD.sample.defaultSite; };
    const d0 = Date.UTC(2026, 6, 1), days = 92, dstr = (t) => { const d = new Date(t); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; };
    const rows = [], q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
    const csv = (h, rs) => [h.join(","), ...rs.map(r => r.map(q).join(","))].join("\n");
    if (table === "deals") { // a DMS-style export: its own column names, NZ dates, $ signs
      for (let i = 0; i < 640; i++) { const mk = pickW(R(), W), used = R() < .47, t = d0 + Math.floor(R() * days) * 864e5;
        const fg = Math.round((used ? 3700 : 4000) * (0.4 + R() * 1.2)), fin = R() < (used ? .27 : .29), prods = fin ? 1 + Math.floor(R() * 2.2) : (R() < .25 ? 1 : 0);
        const bg = Math.round(fin ? 1800 + R() * 1600 : prods * (300 + R() * 300));
        const src = pick(["Trade Me", "Trade Me", "Trade Me", "AutoTrader", "Google", "Facebook", "Website", "Website", "Distributor", "Walk-in", "Walk-in", "Walk-in", "Walk-in", "Repeat", "Phone", "Radio"]);
        rows.push([dstr(t), MARQUES[mk].n.toUpperCase(), used ? "U" : "N", "$" + fg.toLocaleString("en-NZ"), bg, prods, fin ? "Y" : "N", src, used ? Math.round(10 + R() * 70) : "", sitesFor(mk)]); }
      rows.push(["31/09/2026", MARQUES[0].n.toUpperCase(), "N", "$3,900", 0, 0, "N", "Walk-in", "", DD.sample.badRowSites[0]]); rows.push(["14/08/2026", "", "U", "$2,100", 0, 0, "N", "Trade Me", 33, DD.sample.badRowSites[1]]);
      return csv(["Sale Date", "Make", "N/U", "Front Gross", "F&I Income", "Products", "Financed", "Source", "Age At Sale", "Branch"], rows); }
    if (table === "vehicles") { let id = 70000;
      for (let i = 0; i < 905; i++) { const mk = pickW(R(), W), used = R() < .45, m = MARQUES[mk], cost = Math.round(m.price * (used ? 0.62 : 0.9) * (0.8 + R() * 0.4) / 10) * 10;
        const age = Math.round(-Math.log(1 - R() * 0.995) * (used ? 40 : 52)), stage = used ? (R() < .1 ? "Recon" : R() < .05 ? "Appraisal" : "Front line") : "";
        rows.push([`S${id++}`, m.n, pick(m.body === undefined ? ["—"] : [m.body[0].toUpperCase() + m.body[0].slice(1)]) + " " + (used ? "(used)" : ""), used ? "Used" : "New", age, cost, Math.round(cost * (used ? 1.18 : 1.11) / 100) * 100 - 1, sitesFor(mk), stage, "", "2026-10-22"]); }
      return csv(["Stock No", "Make", "Model", "Stock Type", "Days In Stock", "Cost", "Advertised Price", "Branch", "Status", "Rego", "As At"], rows); }
    if (table === "repair_orders") {
      for (let i = 0; i < 2900; i++) { const t = d0 + Math.floor(R() * 26) * 864e5, j = JOBS[pickW(R(), JOBS.map(x => x.share))], hrs = +(j.hrs * (0.7 + R() * 0.6)).toFixed(1);
        rows.push([new Date(t).toISOString().slice(0, 10), pick(DD.sample.roSites), j.n, hrs, +(hrs / (0.9 + R() * 0.15)).toFixed(1),
          Math.round(hrs * 175), Math.round(hrs * 175 * (0.5 + R() * 0.7)), "B" + (1 + Math.floor(R() * BASE.bays)), MARQUES[pickW(R(), W)].n]); }
      return csv(["ro_date", "site", "type", "hours_sold", "hours_worked", "labour_sales", "parts_sales", "bay", "marque"], rows); }
    if (table === "parts") {
      for (let i = 0; i < 1200; i++) { const v = Math.round(Math.exp(2 + R() * 5.5)), last = R() < .07 ? Date.UTC(2025, Math.floor(R() * 8), 1 + Math.floor(R() * 27)) : Date.UTC(2026, 9, 22) - Math.floor(R() * 200) * 864e5;
        const req = Math.floor(R() * 30), fill = Math.min(req, Math.round(req * (0.78 + R() * 0.22)));
        rows.push([`P-${(100000 + Math.floor(R() * 899999))}`, 1 + Math.floor(R() * 12), v, new Date(last).toISOString().slice(0, 10), req, fill, Math.round(v * (6 + R() * 18))]); }
      return csv(["Part Number", "SOH", "Stock Value", "Last Sold", "Lines Requested", "Lines Filled", "Cost of Sales 12m"], rows); }
    if (table === "leads") {
      for (let i = 0; i < 3600; i++) { const h = pickW(R(), LEADHOUR), t = d0 + Math.floor(R() * days) * 864e5 + h * 36e5 + Math.floor(R() * 60) * 6e4;
        const src = pick(["Trade Me Motors", "Trade Me Motors", "Trade Me Motors", "AutoTrader", "Google Ads", "Facebook", "Website", "Website", "Distributor portal", "Distributor portal", "Radio"]);
        const resp = Math.round(respMins(S, h) * (0.4 + R() * 1.2)), appt = R() < apptRate(resp), sold = appt && R() < 0.4, d = new Date(t);
        rows.push([`${d.toISOString().slice(0, 10)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`, src, pick(["Web form", "Web form", "Phone", "Chat", "Email"]), resp, appt ? "Yes" : "No", sold ? "Yes" : "No", MARQUES[pickW(R(), W)].n]); }
      return csv(["Created", "Lead Source", "Enquiry Type", "Response Minutes", "Appointment Set", "Sold", "Make"], rows); }
    if (table === "footfall") { // a door-counter export: hourly entries per showroom, staff already filtered by the counter
      const sites = SITES.filter(x => x.fn.includes("Sales")).slice(0, 6).map(x => x.n);
      for (let day = 0; day < 28; day++) { const t0 = d0 + day * 864e5, dow = new Date(t0).getUTCDay(); if (dow === 0) continue;
        sites.forEach(sn => { for (let h = 9; h < 17; h++) { const base = (dow === 6 ? 7 : 4) * Math.sin(Math.PI * (h - 8.5) / 9), e = Math.max(0, Math.round(base * (0.6 + R() * 0.8)));
          const g = Math.round(e / FUNNEL.party), d = new Date(t0 + h * 36e5);
          rows.push([`${d.toISOString().slice(0, 10)} ${String(h).padStart(2, "0")}:00`, sn, e, g, Math.round(g * (0.5 + R() * 0.25)), Math.round(g * (0.35 + R() * 0.2)), "Overhead 3D counter"]); } }); }
      return csv(["Interval Start", "Showroom", "Ins", "Groups", "Walk Ins", "Test Drives", "Device"], rows); }
    if (table === "healthChecks") { // an inspection export, one row per item; job ids are already hashed, no customer details
      for (let j = 0; j < 420; j++) { const t = d0 + Math.floor(R() * 26) * 864e5 + (8 + R() * 8) * 36e5, h = healthCheck({ id: 5000 + j, start: 600 }, { hc: 1 }), id = "J" + Math.floor(hash(j + 9) * 1e9).toString(36).toUpperCase();
        const iso = m => m == null ? "" : new Date(t + (m - h.tIns) * 6e4).toISOString().slice(0, 16).replace("T", " "), site = pick(DD.sample.hcSites);
        h.items.forEach(it => rows.push([id, site, iso(h.tIns), it.n, { urgent: "Urgent", recommended: "Recommended", ok: "Ok", not_checked: "Not Checked" }[it.st], it.st === "urgent" || it.st === "recommended" ? h.media : 0,
          it.price && (it.st === "urgent" || it.st === "recommended") ? it.price : "", it.accepted == null ? "" : it.accepted ? "Yes" : "No", iso(h.tSent), iso(h.tView), iso(h.tDec), it.deferred ? "Yes" : ""])); }
      return csv(["Job Hash", "Site", "Inspected At", "Item", "Status", "Media", "Quoted", "Accepted", "Sent At", "Viewed At", "Authorised At", "Deferred"], rows); }
    if (table === "marketing_spend") {
      ["2026-07", "2026-08", "2026-09"].forEach(m => CHANNELS.forEach(c => rows.push([m, c.n, Math.round(S.mktSpend * c.spend * (0.85 + R() * 0.3))])));
      return csv(["Month", "Channel", "Spend"], rows); }
    return "";
  }
  // ------------------------------------------------------------------ running costs: fuel given with each sale, demonstrators, FBT
  // Fuel: MBIE weekly fuel price monitoring (adjusted retail, 2026 week 36, via Figure.NZ): regular 296.7c/L, diesel 266.9c/L.
  // FBT: IRD, from 1 April 2026: income-year rates 20% of GST-inclusive cost price or 36% of tax book value; single rate 63.93%,
  // alternate (pool 2) 49.25%. A Bill introduced 10 Sep 2026 proposes new rates from 1 April 2027 (hybrid 19.6%, EV 17% cost basis): not law.
  const FUEL = { petrol: 2.967, diesel: 2.669, kwh: 0.30, date: "MBIE weekly fuel price monitoring, 2026 week 36 (via Figure.NZ)" };
  const TANK = { hatch: 40, sedan: 50, suv: 55, ute: 80, van: 75 }; // litres, estimates by body type
  const EVSHARE = DD.evShare || {}; // estimate: share sold as EVs
  const COSTS0 = { tankNew: "full", tankUsed: "fixed", fixedNew: 50, fixedUsed: 30, arrive: .125, demos: 64, demoKm: 14000, demoL100: 7.6,
    privateDays: 0.6, fbtMethod: "cost", fbtRate: "single", proposed: false };
  function costs(S, F, C = COSTS0) {
    const W = MARQUES.map(m => (F.salesByMarque && F.salesByMarque[m.k] ? F.salesByMarque[m.k].new + F.salesByMarque[m.k].used : m.share));
    const tw = W.reduce((a, b) => a + b, 0) || 1;
    let litres = 0, ev = 0, diesel = 0;
    MARQUES.forEach((m, i) => { const w = W[i] / tw, b = m.body, ice = 1 - (EVSHARE[m.k] || 0);
      const tank = b.reduce((a, x) => a + TANK[x], 0) / b.length, dsh = b.filter(x => x === "ute" || x === "van").length / b.length;
      litres += w * ice * tank; ev += w * (1 - ice); diesel += w * ice * dsh; });
    const iceShare = 1 - ev, price = diesel / Math.max(.01, iceShare) * FUEL.diesel + (1 - diesel / Math.max(.01, iceShare)) * FUEL.petrol;
    const fullL = litres / Math.max(.01, iceShare) * (1 - C.arrive), evCharge = 62 * 0.7 * FUEL.kwh; // 62 kWh pack charged to ~80% from ~10%
    const perCar = pol => pol === "full" ? fullL * price : pol === "half" ? fullL * 0.5 * price : pol === "none" ? 0 : null;
    const newPer = perCar(C.tankNew) ?? C.fixedNew, usedPer = perCar(C.tankUsed) ?? C.fixedUsed;
    const evPer = C.tankNew === "none" ? 0 : evCharge;
    const nU = F.newUnits * 12, uU = F.usedUnits * 12;
    const giveNew = nU * (iceShare * newPer + ev * evPer), giveUsed = uU * usedPer;
    const demoFuel = C.demos * C.demoKm * C.demoL100 / 100 * FUEL.petrol;
    const val = F.newCost ? F.newCost * 1.15 : 45000; // GST-inclusive cost price of an average demonstrator
    const pct = C.fbtMethod === "cost" ? 0.20 : 0.36, rate = C.fbtRate === "single" ? 0.6393 : 0.4925;
    // demonstrators are trading stock and are not depreciated, so tax book value equals cost here (our reading; check with an adviser)
    const taxable = C.demos * val * pct * C.privateDays, fbt = taxable * rate;
    const propPct = C.fbtMethod === "cost" ? (0.20 * (1 - ev) + 0.17 * ev) : 0.36, fbtProposed = C.demos * val * propPct * C.privateDays * rate;
    return { litresPerCar: fullL, fuelPrice: price, iceShare, evShare: ev, newPer, usedPer, evPer, giveNew, giveUsed, demoFuel, fbt, fbtProposed, taxable, val, pct, rate,
      total: giveNew + giveUsed + demoFuel + fbt };
  }
  // ------------------------------------------------------------------ marketing engine (PROPOSED): what could be automated, and co-op rebates
  const MKT0 = { coopPerUnit: 150, coopMatch: 0.5, claimNow: 0.62, claimAuto: 0.92, hourRate: 45 };
  function mktEngine(S, F, M = MKT0) {
    const leadsM = F.leads, listings = (F.newUnits + F.usedUnits) * 1.1, marques = MARQUES.length;
    const tasks = [
      { n: "Lead routing and first reply", h: leadsM * 4 / 60, a: .70 },
      { n: "Lead follow-up sequences", h: leadsM * 6 / 60, a: .60 },
      { n: "Stock listings to Trade Me and AutoTrader (photos, copy, price changes)", h: listings * 25 / 60, a: .65 },
      { n: "Campaigns assembled from distributor templates", h: marques * 2 * 3, a: .50 },
      { n: "Co-op claim evidence packs", h: marques * 1.5 * 2, a: .75 },
      { n: "Department and marketing reporting", h: 40, a: .80 },
      { n: "Review replies", h: 15, a: .50 }];
    tasks.forEach(t => { t.saved = t.h * t.a; });
    const hours = tasks.reduce((a, t) => a + t.h, 0), saved = tasks.reduce((a, t) => a + t.saved, 0);
    const accrual = F.newUnits * 12 * M.coopPerUnit, eligible = F.spendT * 12 * 0.55 * M.coopMatch; // estimate: 55% of spend is co-op eligible
    const claimable = Math.min(accrual, eligible), claimed = claimable * M.claimNow, claimedAuto = claimable * M.claimAuto;
    return { tasks, hours, saved, savedValue: saved * M.hourRate * 12, accrual, eligible, claimable, claimed, lost: claimable - claimed, claimedAuto, gain: claimedAuto - claimed };
  }
  const CAMPAIGNS = DD.campaigns || [];
  const CI_CHECKS = ["Approved imagery from the distributor library", "Brand mark placement per the brand guide", "Mandatory offer and finance disclaimer", "Offer dates and terms match the distributor's", "Evidence pack: placement proof and invoice"];

  return { FUEL, TANK, COSTS0, costs, MKT0, mktEngine, CAMPAIGNS, CI_CHECKS,
    JOBS, BASE, OPEN, CLOSE, HC_ITEMS, healthCheck, hcStage, hcStats, hcLift, HC_LABOUR, HC_FOLLOW, HC_CALL_MIN, FUNNEL, FOOTPRINTS, OSM_DATE, newDay, step, dayStats, fullDay, stock, leads, LEADHOUR, apptRate,
    MARQUES, SITES, MI, CHANNELS, BENCH, CONTRACT, group, fromData, compose, simPrims, commerceDay,
    parseCSV, detectTable, autoMap, validate, sampleCSV, chKey, chName, marqueKey, norm };
})();
if (typeof window !== "undefined") window.DEALER = DEALER;
if (typeof module !== "undefined") module.exports = DEALER;
