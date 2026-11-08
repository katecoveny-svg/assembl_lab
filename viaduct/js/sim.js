// assembl lab · Friday night on the Viaduct: the night itself. A fictional Example restaurant on a fictional Example Friday, simulated
// minute by minute from 5 pm to midnight with fixed seeds, so the same settings always give the same night. Pure: no DOM, no WebGL,
// so the page, the text version and the checks all read the same timeline.
//
// What is modelled (all Simulated): bookings and walk-ins arriving along the waterfront, a waitlist with honest quotes, the kitchen's
// pass (tickets in a queue for a few cooks), a weather turn that closes the deck, a no-show, and the close-out. Six specialist agents act
// only within their authority: observe, draft, recommend, act with approval, act within limits. A guest message only counts as sent when
// a staff limit covers it or a named role approved it; everything else stays a draft.

export const OPEN = 17 * 60, T_END = 420;            // minutes after 5 pm; the night ends at midnight
export const LIMITS = { from: 0, until: 300, text: "Quotes, table-ready texts and booking check-ins, 5 pm to 10 pm, set by the duty manager" };
export const LAST_SEAT = 300, KITCHEN_CLOSE = 330;   // last seating 10 pm, kitchen closes 10:30 pm

export function clock(t, { short = false } = {}) {
  const m = Math.round(OPEN + t), h = Math.floor(m / 60) % 24, mm = m % 60, h12 = h % 12 || 12, ap = h < 12 ? "am" : "pm";
  if (h === 0 && mm === 0) return short ? "12 am" : "midnight";
  return mm === 0 && short ? `${h12} ${ap}` : `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
}
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = (r) => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / Math.sqrt(0.5); };
const round5up = (m) => Math.max(5, Math.ceil(m / 5) * 5);

// ------------------------------------------------------------------------------------------------ the floor
// Plan coordinates in metres from the pavilion's centre: u along the shore, v toward the water (the deck is v > 6). Fictional.
export const TABLES = [
  { id: 1, seats: 2, zone: "inside", u: -10.4, v: 4.4 }, { id: 2, seats: 2, zone: "inside", u: -7.9, v: 4.4 }, { id: 3, seats: 2, zone: "inside", u: -5.4, v: 4.4 },
  { id: 4, seats: 4, zone: "inside", u: -2.2, v: 4.2 }, { id: 5, seats: 4, zone: "inside", u: 1.4, v: 4.2 }, { id: 6, seats: 2, zone: "inside", u: 4.6, v: 4.4 },
  { id: 7, seats: 2, zone: "inside", u: 7.1, v: 4.4 }, { id: 8, seats: 4, zone: "inside", u: 10.1, v: 4.2 },
  { id: 9, seats: 4, zone: "inside", u: -2.2, v: 1.0 }, { id: 10, seats: 4, zone: "inside", u: 1.4, v: 1.0 }, { id: 11, seats: 6, zone: "inside", u: 5.2, v: 1.0, w: 3.2 },
  { id: 12, seats: 8, zone: "inside", u: -8.6, v: 1.2, round: true },
  { id: 13, seats: 2, zone: "deck", u: -10, v: 8.6 }, { id: 14, seats: 2, zone: "deck", u: -6.8, v: 8.6 }, { id: 15, seats: 2, zone: "deck", u: 6.6, v: 8.6 }, { id: 16, seats: 2, zone: "deck", u: 9.8, v: 8.6 },
  { id: 17, seats: 4, zone: "deck", u: -3.4, v: 10.6 }, { id: 18, seats: 4, zone: "deck", u: 0.2, v: 10.6 }, { id: 19, seats: 4, zone: "deck", u: 3.8, v: 10.6 },
  { id: 20, seats: 4, zone: "flex", u: 0.6, v: -2.7, high: true }, { id: 21, seats: 4, zone: "flex", u: 3.6, v: -2.7, high: true }, { id: 22, seats: 4, zone: "flex", u: -2.4, v: -2.7, high: true },
];
export const AGENTS = {
  booking: { name: "Booking", auth: "act within limits", limit: "Confirms bookings of up to 6 against the book; anything larger, and every re-plan of the floor, goes to staff." },
  waitlist: { name: "Waitlist", auth: "act within limits", limit: "Texts quotes and table-ready notices inside the limits staff set (5 pm to 10 pm). Anything else is a draft." },
  wait: { name: "Wait", auth: "recommend", limit: "Works out each quote from the floor, the pass and the book. Never shortens a quote to keep a guest." },
  kitchen: { name: "Kitchen", auth: "recommend", limit: "Reads ticket times on the pass, spots slow tables and suggests a fix. A manager decides." },
  weather: { name: "Weather", auth: "observe", limit: "Watches the forecast and rain radar for the waterfront. Flags; never moves anyone." },
  resolution: { name: "Resolution", auth: "draft", limit: "Drafts comps, apologies and the close-out. Nothing goes out without a manager." },
};
const GUESTS = ["Aroha", "Sam", "Priya", "Tom", "Mere", "Leilani", "Jack", "Ana", "Hemi", "Sofia", "Wiremu", "Grace", "Ravi", "Ella", "Tama", "Mia", "Josh", "Kiri", "Noah", "Lucy", "Ari", "Hana", "Ben", "Zoe", "Manaia", "Isla", "Finn", "Ruby", "Tane", "Olivia", "Lily", "Max", "Nikau", "Amelia", "Leo", "Chloe", "Rangi", "Ivy", "Eli", "Maia"];
export const MENU = [
  { dish: "Market fish, kūmara, brown butter", price: 38, tags: ["GF"] }, { dish: "Lamb shoulder, pumpkin, mint", price: 42, tags: ["GF"] },
  { dish: "Mushroom risotto, parmesan", price: 31, tags: ["V", "GF"] }, { dish: "Pāua fritter, lemon", price: 19, tags: [] }, { dish: "Pavlova, berries", price: 15, tags: ["V", "GF"] },
];
export const DRINKS = ["Sparkling water", "Lime and soda", "Kombucha", "Iced tea", "The full drinks list at the table"];

// expected minutes at the table by party size (the agent's model; the real night varies)
const ED = (n) => 70 + 4 * Math.max(0, n - 2);
const EXP_TICKET = 16, EXP_EAT = (n) => 27 + 3 * Math.sqrt(n), EXP_PAY = 15.5, CLEAR = 6, HOLD = 6;

// ------------------------------------------------------------------------------------------------ the night
export function simulate(opts = {}) {
  const o = { rain: false, group: false, kitchen: false, agents: true, routes: { east: 505, west: 1042, south: 494, toWait: 115 }, ...opts };
  const AG = o.agents;
  const rB = rng(1101), rW = rng(2203), rD = rng(3307), rK = rng(4409), rX = rng(5501), rN = rng(6607);
  const walkMin = (m) => m / 1.25 / 60;
  const tables = TABLES.map((t) => ({ ...t, seg: [], res: [], party: null, phase: "free", until: 0, joined: null }));
  const T = Object.fromEntries(tables.map((t) => [t.id, t]));
  const parties = [], messages = [], events = [], series = [];
  let guestN = 0; const guest = () => GUESTS[guestN++ % GUESTS.length];
  const say = (t, agent, text, status = {}, ref = {}) => { const e = { t: +t.toFixed(2), agent, auth: status.auth || AGENTS[agent].auth, text, status, ...ref }; events.push(e); return e; };
  // a message to a guest: within the staff's limits it goes at once; otherwise a draft waits for a named role
  const msg = (t, p, agent, kind, text, { approvedBy = null, delay = 2, limits = true, hold = false } = {}) => {
    const within = AG && limits && t >= LIMITS.from && t <= LIMITS.until && !approvedBy && !hold;
    const m = { id: messages.length + 1, t: +t.toFixed(2), party: p.id, guest: p.name, agent, kind, text, status: within ? "limits" : hold ? "draft" : "approved", sentAt: null, approvedBy: within || hold ? null : approvedBy || "host", approvedAt: null };
    if (m.status === "limits") m.sentAt = m.t; else if (m.status === "approved") { m.approvedAt = +(t + delay).toFixed(2); m.sentAt = m.approvedAt; }
    messages.push(m); (p.msgs ||= []).push(m.id); return m;
  };

  // ---------------------------------------------------------------- weather
  const RAIN = o.rain ? { start: 155, end: 420, peak: 0.95, flag: 125, label: "a rainstorm" } : { start: 255, end: 306, peak: 0.6, flag: 225, label: "a passing shower" };
  const rainAt = (t) => { if (t < RAIN.start - 12 || t > RAIN.end + 10) return 0; const a = Math.min(1, (t - RAIN.start + 12) / 18), b = Math.min(1, (RAIN.end + 10 - t) / 16); return Math.max(0, RAIN.peak * Math.min(a, b) * (0.82 + 0.18 * Math.sin(t / 3.1))); };
  const deck = { closeAt: AG ? RAIN.start - 12 : RAIN.start + 4, open: (t) => t < deck.closeAt };   // with the agents the deck moves before the rain; without, once it starts
  const flexOpen = (t) => !deck.open(t);

  // ---------------------------------------------------------------- the book (bookings)
  const SLOTS = []; for (let s = 30; s <= 270; s += 15) SLOTS.push(s);
  const slotW = (s) => 0.35 + Math.exp(-Math.pow((s - 140) / 50, 2)) * 1.6;
  const sizeOf = (r) => { const u = r(); return u < 0.46 ? 2 : u < 0.56 ? 3 : u < 0.86 ? 4 : u < 0.93 ? 5 : 6; };
  const reqs = [];
  for (let i = 0; i < 27; i++) {
    let u = rB() * SLOTS.reduce((a, s) => a + slotW(s), 0), slot = SLOTS[0]; for (const s of SLOTS) { u -= slotW(s); if (u <= 0) { slot = s; break; } }
    const created = rB() < 0.64 ? -60 - rB() * 2000 : Math.min(slot - 35, rB() * 150);
    reqs.push({ size: sizeOf(rB), at: slot, created, zonePref: rB() < 0.4 ? "deck" : "inside" });
  }
  reqs.push({ size: 8, at: 150, created: -900, zonePref: "inside", big: true });                  // a birthday eight at 7:30
  reqs.push({ size: 4, at: 270, created: -400, zonePref: "inside", noShow: true, table: 8 });     // the 9:30 pm four who won't come
  reqs.push({ size: 2, at: 255, created: -500, zonePref: "deck", table: 15 });                 // a deck table for two at 9:15
  reqs.push({ size: 4, at: 250, created: -650, zonePref: "deck", table: 18 });
  if (o.rain) reqs.push({ size: 2, at: 180, created: -300, zonePref: "deck", noShow: true, stormNoShow: true });
  reqs.sort((a, b) => a.created - b.created);
  const freeFor = (tb, a, b) => tb.res.every((r) => r.to <= a || r.from >= b);
  const fits = (tb, n, slack = 2) => tb.seats >= n && tb.seats <= n + slack;
  function findTable(n, at, zones, slack = 2) {
    const dur = ED(n) + HOLD, c = tables.filter((tb) => zones.includes(tb.zone) && fits(tb, n, slack) && freeFor(tb, at, at + dur)).sort((a, b) => a.seats - b.seats || a.id - b.id);
    return c[0] || null;
  }
  const bookings = [];
  for (const q of reqs) {
    const p = { id: parties.length + 1, kind: "booking", name: guest(), size: q.size, bookedFor: q.at, created: +q.created.toFixed(1), noShow: !!q.noShow, route: ["east", "south", "west"][Math.floor(rN() * 3)], msgs: [] };
    const zones = q.zonePref === "deck" ? ["deck", "inside"] : ["inside", "deck"];
    let tb = q.table && freeFor(T[q.table], q.at, q.at + ED(q.size) + HOLD) ? T[q.table] : findTable(q.size, q.at, zones), moved = 0;
    if (!tb) for (const d of [15, -15, 30, 45]) { if (q.at + d < 30 || q.at + d > 270) continue; tb = findTable(q.size, q.at + d, zones); if (tb) { moved = d; break; } }
    if (!tb) { p.declined = true; p.state = "declined"; parties.push(p); if (q.created >= 0) say(q.created, "booking", `${clock(q.at)} is full for ${q.size}, and nothing within 45 minutes either. Offered the waitlist on the night.`, { kind: "limits" }, { party: p.id }); continue; }
    p.bookedFor = q.at + moved; p.table = tb.id; tb.res.push({ from: p.bookedFor, to: p.bookedFor + ED(q.size) + HOLD, party: p.id });
    parties.push(p); bookings.push(p);
    if (q.created >= 0) {
      if (q.size > 6) say(q.created, "booking", `Booking request for ${q.size} at ${clock(p.bookedFor)}: drafted for the host (over the agent's limit of 6).`, { kind: "draft" }, { party: p.id });
      else {
        say(q.created, "booking", moved ? `${clock(q.at)} was full for ${q.size}; offered ${clock(p.bookedFor)} and confirmed it, table ${tb.id}.` : `Confirmed ${q.size} at ${clock(p.bookedFor)}, table ${tb.id}${tb.zone === "deck" ? " on the deck" : ""}.`, { kind: "limits" }, { party: p.id });
        msg(q.created, p, "booking", "confirm", `Booked: Example restaurant, Friday ${clock(p.bookedFor)}, ${q.size} people. Reply here if plans change.`);
      }
    }
    p.arrive = p.noShow ? null : p.bookedFor + Math.max(-9, Math.min(16, gauss(rB) * 5.5));
  }

  // ---------------------------------------------------------------- walk-ins (and the big group)
  const lam = (t) => t < 60 ? 0.05 : t < 120 ? 0.1 : t < 210 ? 0.17 : t < 285 ? 0.14 : t < 300 ? 0.06 : 0;
  for (let t = 0; t < 300; t += 0.5) if (rW() < lam(t) * 0.5) {
    const u = rW(), size = u < 0.5 ? 2 : u < 0.64 ? 3 : u < 0.94 ? 4 : 5;
    parties.push({ id: parties.length + 1, kind: "walkin", name: guest(), size, arrive: t + rW() * 0.5, route: rW() < 0.45 ? "east" : rW() < 0.55 ? "south" : "west", msgs: [] });
  }
  if (o.group) parties.push({ id: parties.length + 1, kind: "walkin", name: "Hemi", size: 12, arrive: 155, route: "west", msgs: [], group: true });
  for (const p of parties) if (p.arrive != null) p.walkFrom = p.arrive - walkMin(o.routes[p.route] || 500);

  // ---------------------------------------------------------------- the kitchen: a few cooks, tickets first in first out
  const COOKS = 5, cooks = Array(COOKS).fill(0), tickets = [];
  const cooksAt = (t) => (o.kitchen && t >= 150 && t < 255 ? 3 : COOKS);
  let refired = false;
  function fire(t, p) {
    const n = cooksAt(t); let best = 0; for (let i = 1; i < n; i++) if (cooks[i] < cooks[best]) best = i;
    const start = Math.max(t, cooks[best]), service = 12.5 + 1.25 * p.size + gauss(rK) * 2.2;
    let done = start + service;
    // a dish comes back and is cooked again: once on the night by default, from the first big table after 7:55 pm
    if (!refired && t >= 162 && p.size >= 4 && !o.noRefire) { refired = true; p.refire = true; done += 16; }
    cooks[best] = start + service * 0.62;   // a cook can start the next ticket before this one leaves the pass
    const tk = { party: p.id, table: p.table, fire: t, done, size: p.size }; tickets.push(tk); return tk;
  }
  if (o.kitchen) for (let i = 3; i < COOKS; i++) cooks[i] = Math.max(cooks[i], 0);

  // ---------------------------------------------------------------- the minute loop
  const lobby = [], waitlist = []; let comps = 0, lastComp = -99;
  const seatParty = (t, p, tb, how) => {
    p.seatedAt = t; p.table = tb.id; p.firstTable = tb.id; p.state = "seated"; p.how = how; tb.party = p.id; tb.phase = "seated";
    p.orderAt = t + 5 + rD() * 4; p.eat = 27 + 3 * Math.sqrt(p.size) + gauss(rD) * 5; p.pay = 11 + rD() * 9;
    tb.seg.push({ from: t, state: "seated", party: p.id });
    const r = tb.res.find((x) => x.party === p.id); if (r) r.from = Math.min(r.from, t); else tb.res.push({ from: t, to: t + ED(p.size) + HOLD, party: p.id, walk: true });
  };
  const freeNow = (tb, t) => !tb.party && tb.phase === "free" && (tb.zone !== "deck" || deck.open(t)) && (tb.zone !== "flex" || flexOpen(t));
  // a table is held for a booking from its expected-stay window before the booking until that party sits down (or is released)
  const reservedSoon = (tb, t, n, except) => tb.res.some((r) => r.party !== except && !r.walk && r.from < t + ED(n) + 5 && r.to > t && parties[r.party - 1].seatedAt == null && !parties[r.party - 1].released);
  // when will a table be free, by the agent's model (expected times, not the real ones it cannot know)
  const predictFree = (tb, t) => {
    if (tb.zone === "deck" && !deck.open(t + 5)) return Infinity;
    if (tb.zone === "flex" && !flexOpen(t)) return Infinity;
    if (!tb.party) return t;
    const p = parties[tb.party - 1], tk = p.ticket;
    if (tb.phase === "clearing") return tb.until;
    if (tb.phase === "seated") return p.orderAt + EXP_TICKET + EXP_EAT(p.size) + EXP_PAY + CLEAR + (load(t) > 9 ? 6 : 0);
    if (tb.phase === "waiting" || tb.phase === "late") return Math.max(t + 4, tk.fire + EXP_TICKET + (load(t) > 9 ? (load(t) - 9) * 1.5 : 0)) + EXP_EAT(p.size) + EXP_PAY + CLEAR;
    if (tb.phase === "eating") return Math.max(t + 2, p.mainsAt + EXP_EAT(p.size) + EXP_PAY + CLEAR);
    return t + 10;
  };
  const load = (t) => tickets.filter((k) => k.fire <= t && k.done > t).length;
  // the Wait agent's plan: every party on the list (booked guests waiting first, then the waitlist in order) takes the earliest
  // table that fits and is clear of the book for its expected stay. Its quote is where it lands, rounded up to 5 minutes.
  function plan(t, list) {
    const knowsRain = AG && t >= RAIN.flag + 5;
    const av = tables.map((tb) => {
      let free = predictFree(tb, t);
      if (tb.zone === "flex" && !flexOpen(t)) free = knowsRain ? Math.max(free === Infinity ? t : free, deck.closeAt) : Infinity;
      const busy = tb.res.filter((r) => !r.walk && parties[r.party - 1].seatedAt == null && !parties[r.party - 1].released && !list.includes(parties[r.party - 1])).map((r) => [r.from - 5, r.to]);
      return { tb, free, busy };
    });
    const out = new Map();
    for (const w of list) {
      let best = null; const d = ED(w.size);
      for (const a of av) {
        if (!(a.tb.seats >= w.size && a.tb.seats <= w.size + 3) || !isFinite(a.free)) continue;
        let s = Math.max(a.free, t); a.busy.sort((x, y) => x[0] - y[0]);
        for (const [b0, b1] of a.busy) if (s < b1 && s + d > b0) s = b1;
        if (a.tb.zone === "deck" && knowsRain && s + 20 > deck.closeAt) continue;
        if (!best || s < best.s) best = { a, s };
      }
      if (best) { out.set(w, best.s); best.a.busy.push([best.s, best.s + d + CLEAR]); } else out.set(w, Infinity);
    }
    return out;
  }
  function quote(t, p) {
    if (p.group) return { mid: 75, lo: 65, hi: 90, plan: [9, 10, 11] };
    const list = [...lobby, ...waitlist.filter((w) => !w.group && w !== p), p], at = plan(t, list).get(p), mid = round5up((isFinite(at) ? at : t + 120) - t);
    return { mid, lo: Math.max(5, mid - 5), hi: mid + 10 };
  }
  const wait = { spot: null };
  for (let t = 0; t <= T_END; t += 0.5) {
    // tables move through their phases
    for (const tb of tables) {
      const p = tb.party && parties[tb.party - 1];
      if (!p) { if (tb.phase === "clearing" && t >= tb.until) { tb.phase = "free"; tb.seg.push({ from: t, state: "free" }); } continue; }
      if (tb.phase === "seated" && t >= p.orderAt) { if (t <= KITCHEN_CLOSE) { p.ticket = fire(t, p); tb.phase = "waiting"; tb.seg.push({ from: t, state: "waiting", party: p.id }); } else { p.ticket = { fire: t, done: t + 8 }; tb.phase = "waiting"; } }
      if ((tb.phase === "waiting" || tb.phase === "late") && t >= p.ticket.done) { p.mainsAt = t; tb.phase = "eating"; tb.seg.push({ from: t, state: "eating", party: p.id }); }
      if (tb.phase === "waiting" && t - p.ticket.fire >= 26) { tb.phase = "late"; tb.seg.push({ from: t, state: "late", party: p.id }); }
      if (tb.phase === "eating" && t >= p.mainsAt + p.eat + p.pay) { p.leaveAt = t; p.state = "left"; tb.party = null; tb.phase = "clearing"; tb.until = t + CLEAR; tb.seg.push({ from: t, state: "clearing" }); const r = tb.res.find((x) => x.party === p.id); if (r) r.to = t + CLEAR; }
    }
    // the Kitchen agent: a table waiting well past the usual ticket time
    if (AG) for (const tb of tables) {
      const p = tb.party && parties[tb.party - 1]; if (!p || tb.phase !== "late" || p.flagged) continue;
      if (t - p.ticket.fire >= 30 && t - lastComp >= 8) {
        p.flagged = t; lastComp = t; const usual = Math.round(avgTicket(t) || EXP_TICKET), cost = p.size * 14;
        say(t, "kitchen", `Table ${tb.id} has waited ${Math.round(t - p.ticket.fire)} min for mains; the pass is averaging ${usual} min. Suggest dessert on the house for the ${p.size}, about $${cost}, for a manager to approve.`, { kind: "recommend" }, { table: tb.id, party: p.id, slow: true });
        const ok = t + 2 + rX() * 2; comps++; p.comp = { at: ok, cost };
        say(ok, "resolution", `Dessert for table ${tb.id} on the house, approved by the duty manager. Recorded against the night's comps ($${cost}).`, { kind: "approved", auth: "act with approval", by: "duty manager", at: ok }, { table: tb.id, party: p.id });
      }
    }
    // the weather turns
    if (AG && Math.abs(t - RAIN.flag) < 0.25) {
      say(t, "weather", o.rain ? `Heavy rain on the radar, about 30 minutes west of the waterfront and likely to set in for the night. Flagged to the floor.` : `A band of showers on the radar about 30 minutes away, likely to reach the waterfront around ${clock(RAIN.start)} for most of an hour. Flagged to the floor.`, { kind: "observe" });
      const aff = bookings.filter((b) => T[b.table]?.zone === "deck" && !b.seatedAt && b.bookedFor >= RAIN.start - 25 && b.bookedFor <= RAIN.end + 40);
      say(t + 1.5, "booking", `Re-plan drafted: close the deck from ${clock(deck.closeAt)}, open the three high tables by the bar, and move ${aff.length} deck booking${aff.length === 1 ? "" : "s"} inside.`, { kind: "draft", auth: "act with approval" }, { replan: true });
      say(t + 5, "booking", `Re-plan approved by the duty manager. Tables re-planned; ${aff.length} guest message${aff.length === 1 ? "" : "s"} drafted.`, { kind: "approved", auth: "act with approval", by: "duty manager", at: t + 5 });
      for (const b of aff) {
        const old = T[b.table]; old.res = old.res.filter((r) => r.party !== b.id);
        let nt = findTable(b.size, b.bookedFor, ["inside", "flex"], 3), when = b.bookedFor;
        if (!nt) for (const d of [15, 30, 45]) { nt = findTable(b.size, b.bookedFor + d, ["inside", "flex"], 3); if (nt) { when = b.bookedFor + d; break; } }
        if (nt) { nt.res.push({ from: when, to: when + ED(b.size) + HOLD, party: b.id }); b.table = nt.id; b.movedInside = true;
          msg(t + 6, b, "booking", "replan", when === b.bookedFor ? `Rain's on the way, so your ${clock(b.bookedFor)} table is now inside. Same time, same booking.` : `Rain's on the way and the deck is closing. We can seat you inside at ${clock(when)}; reply if that doesn't suit.`, { approvedBy: "host", delay: 3 });
          if (when !== b.bookedFor && b.arrive != null) b.arrive += when - b.bookedFor; b.bookedFor = when;
        } else { b.table = null; b.lobbyOnArrival = true; msg(t + 6, b, "booking", "replan", `Rain's on the way and the deck is closing. Your booking stands; we'll seat you at the first table inside, and text you if it's going to be a wait.`, { approvedBy: "host", delay: 3 }); }
      }
    }
    // the deck closes: anyone still eating there moves in if a table is free, otherwise finishes under the awning
    if (Math.abs(t - deck.closeAt) < 0.25) {
      const movers = tables.filter((tb) => tb.zone === "deck" && tb.party).map((tb) => parties[tb.party - 1]);
      let moved = 0, stayed = 0;
      for (const p of movers) {
        const to = tables.find((tb) => (tb.zone === "flex" || tb.zone === "inside") && !tb.party && tb.phase === "free" && tb.seats >= p.size && !reservedSoon(tb, t, p.size));
        const from = T[p.table];
        if (to && AG) { to.party = p.id; to.phase = from.phase; to.seg.push({ from: t, state: from.phase, party: p.id }); from.party = null; from.phase = "free"; p.table = to.id; p.movedInside = t; moved++; if (p.ticket) p.ticket.table = to.id; }
        else { p.awning = true; stayed++; }
      }
      for (const tb of tables.filter((x) => x.zone === "deck")) tb.seg.push({ from: t, state: tb.party ? "awning" : "closed", party: tb.party || undefined });
      if (AG) say(t, "booking", `Deck closed for the rain. ${moved} table${moved === 1 ? "" : "s"} moved inside${stayed ? `, ${stayed} finishing under the awning` : ""}; the high tables by the bar are open.`, { kind: "limits" });
    }
    // the no-show: a check-in at ten minutes, the table released at fifteen (with agents; thirty without)
    for (const b of bookings.filter((x) => x.noShow && !x.released)) {
      if (AG && Math.abs(t - (b.bookedFor + 10)) < 0.25) msg(t, b, "booking", "checkin", `Hi ${b.name}, your table for ${b.size} is ready. We'll hold it until ${clock(b.bookedFor + 15)}; reply if you're on your way.`);
      const rel = b.bookedFor + (AG ? 15 : 30);
      if (Math.abs(t - rel) < 0.25) {
        b.released = t; b.state = "noshow";
        const tb = T[b.table]; if (tb) tb.res = tb.res.filter((r) => r.party !== b.id);
        if (AG) { say(t - 0.5, "booking", `No reply from the ${clock(b.bookedFor)} booking for ${b.size}. Recommend releasing table ${b.table} to the waitlist.`, { kind: "recommend", auth: "act with approval" }, { party: b.id, noShow: true });
          say(t, "booking", `Table ${b.table} released to the waitlist, approved by the host.`, { kind: "approved", auth: "act with approval", by: "host", at: t }, { party: b.id, noShow: true, table: b.table }); }
      }
    }
    // arrivals: bookings to their table (or re-planned), walk-ins seated or quoted
    for (const p of parties) {
      if (p.arrive == null || p.arrived || t < p.arrive) continue; p.arrived = true;
      if (p.kind === "booking") {
        let tb = p.table && T[p.table];
        if (tb && !freeNow(tb, t)) { const alt = tables.find((x) => freeNow(x, t) && fits(x, p.size, 3) && !reservedSoon(x, t, p.size, p.id)); if (alt && AG) { tb.res = tb.res.filter((r) => r.party !== p.id); tb = alt; p.reseated = true; } else tb = null; }
        if (tb && freeNow(tb, t)) seatParty(t, p, tb, "booked"); else { lobby.push(p); p.state = "lobby"; p.lobbyAt = t; }
        continue;
      }
      // a walk-in: straight to a table if one is free and not held, otherwise the waitlist
      const tb = t <= LAST_SEAT ? tables.filter((x) => freeNow(x, t) && fits(x, p.size, 2) && !reservedSoon(x, t, p.size)).sort((a, b) => a.seats - b.seats)[0] : null;
      if (tb && !waitlist.some((w) => w.size <= tb.seats)) { seatParty(t, p, tb, "walkin"); continue; }
      if (t > LAST_SEAT - 10) { p.state = "toolate"; p.lostAt = t; continue; }
      if (AG) {
        const q = quote(t, p); p.quote = q; p.quotedAt = t;
        if (t + q.mid > LAST_SEAT + 5) { p.state = "toolate"; p.lostAt = t; say(t, "wait", `Walk-in for ${p.size}: the honest wait would run past last seating at ${clock(LAST_SEAT)}. Told them so, kindly.`, { kind: "recommend" }, { party: p.id }); continue; }
        const pb = p.group ? 0.1 : q.mid <= 15 ? 0 : q.mid <= 30 ? 0.03 : q.mid <= 45 ? 0.1 : q.mid <= 60 ? 0.22 : q.mid <= 90 ? 0.45 : 0.7;
        if (rX() < pb) { p.state = "lost"; p.lostAt = t; p.balked = true; say(t, "wait", `Quoted ${q.mid} min (${q.lo} to ${q.hi}) to a walk-in for ${p.size}. They chose not to wait.`, { kind: "recommend" }, { party: p.id, lost: true }); continue; }
        p.state = "waiting"; p.joinAt = t; waitlist.push(p);
        if (p.group) {
          say(t, "wait", `Walk-in group of 12. No table fits; the soonest honest option is joining tables 9, 10 and 11 at about ${clock(t + q.mid)}. Recommend holding them from ${clock(t + q.mid - 20)}.`, { kind: "recommend" }, { party: p.id, group: true });
          say(t + 3, "booking", `Hold on tables 9, 10 and 11 for the group of 12, approved by the host.`, { kind: "approved", auth: "act with approval", by: "host", at: t + 3 }, { party: p.id, group: true });
          p.groupAt = t + q.mid; let movedB = 0;
          for (const id of [9, 10, 11]) { for (const r of T[id].res.filter((r) => !r.walk && r.to > p.groupAt - 20 && r.from < p.groupAt + ED(12) && parties[r.party - 1].seatedAt == null)) { const b = parties[r.party - 1], nt = findTable(b.size, b.bookedFor, ["inside", "deck", "flex"].filter((z) => z !== "flex" || flexOpen(b.bookedFor)), 3); if (nt && ![9, 10, 11].includes(nt.id)) { T[id].res = T[id].res.filter((x) => x !== r); nt.res.push({ ...r }); b.table = nt.id; movedB++; } }
            T[id].res.push({ from: p.groupAt - 20, to: p.groupAt + ED(12), party: p.id, hold: true }); }
          if (movedB) say(t + 3.5, "booking", `${movedB} later booking${movedB === 1 ? "" : "s"} moved off tables 9 to 11 to make room for the group. Same times.`, { kind: "limits" }, { party: p.id, group: true });
        } else say(t, "wait", `Walk-in for ${p.size}: quoted ${q.mid} min (${q.lo} to ${q.hi}) from the floor, the pass and the book. ${waitlist.length - 1 ? waitlist.length - 1 + " other part" + (waitlist.length - 1 === 1 ? "y" : "ies") + " on the list." : "First on the list."}`, { kind: "recommend" }, { party: p.id, quote: true });
        msg(t + 0.5, p, "waitlist", "quote", `Hi ${p.name}, you're on the list for ${p.size}. Honest wait: about ${q.mid} min (${q.lo} to ${q.hi}). No need to queue: wait nearby, at a bar or along the waterfront, and we'll text when your table is 10 minutes away. Menu and drinks are below.`);
        p.dietAt = t + 3 + rX() * 3; p.drinksAt = t + 7 + rX() * 4; p.diet = p.size >= 3 && rX() < 0.6 ? "1 gluten-free" : rX() < 0.3 ? "1 vegetarian" : "No, all good";
        p.drinks = p.size >= 3 ? "2 sparkling water, 2 lime and soda" : "1 kombucha, 1 iced tea"; wait.spot = true;
      } else {
        // without the agents: a guessed wait at the door and a queue on the promenade
        const ahead = waitlist.length, pb = Math.min(0.85, 0.12 + 0.12 * ahead);
        if (rX() < pb) { p.state = "lost"; p.lostAt = t; p.balked = true; continue; }
        p.state = "waiting"; p.joinAt = t; p.quote = { mid: 20, lo: 15, hi: 25, guess: true }; waitlist.push(p);
      }
    }
    // reneging: a long wait past what they were told
    for (const p of [...waitlist]) {
      const over = t - p.joinAt;
      const pr = AG ? (over > p.quote.hi + 10 ? 0.03 : 0) : over > 40 ? 0.07 : over > 25 ? 0.04 : 0;
      if (!p.group && rX() < pr * 0.5) { waitlist.splice(waitlist.indexOf(p), 1); p.state = "lost"; p.lostAt = t; p.reneged = true; if (AG) say(t, "waitlist", `${p.name}'s party of ${p.size} left the list after ${Math.round(over)} min.`, { kind: "observe", auth: "observe" }, { party: p.id, lost: true }); }
    }
    // the Waitlist agent keeps quotes honest: a "10 minutes away" text, and a delay notice if a quote slips
    if (AG && t % 2 === 0) for (const p of waitlist) {
      if (p.group) { if (!p.near && t >= p.groupAt - 10) { p.near = t; msg(t, p, "waitlist", "near", `Hi ${p.name}, your tables are about 10 minutes away. We'll hold them for 10 minutes.`); } continue; }
      const q = quote(t, p), eta = t + Math.max(0, q.mid - 5);
      if (!p.near && eta - t <= 10) { p.near = t; p.returnAt = t + 4 + rX() * 5; msg(t, p, "waitlist", "near", `Hi ${p.name}, your table is about 10 minutes away. Head back when you're ready; we'll hold it for 10 minutes.`); }
      // a delay notice only once the guest is actually past their quoted range, with a fresh estimate from now
      else if (!p.delayed && t - p.joinAt >= p.quote.hi - 2 && eta - p.joinAt > p.quote.hi + 3) { const more = Math.max(5, Math.ceil((eta - t) / 5) * 5); p.delayed = t; say(t, "wait", `${p.name}'s party has waited ${Math.round(t - p.joinAt)} min against a quote of ${p.quote.lo} to ${p.quote.hi}. Fresh estimate: about ${more} more. Delay notice drafted for the host.`, { kind: "recommend" }, { party: p.id });
        msg(t, p, "waitlist", "delay", `Sorry ${p.name}, your table is taking longer than we said. Our honest estimate now is about ${more} more minutes. Your place is kept, and we'll text when it's close.`, { approvedBy: "host", delay: 1.5 }); }
    }
    // free tables go to the lobby first (booked guests), then the waitlist in order (a party that fits); the group gets its tables
    for (const tb of tables) {
      if (!freeNow(tb, t)) continue;
      const lb = lobby.find((p) => fits(tb, p.size, 3) && (!p.table || p.table === tb.id || !reservedSoon(tb, t, p.size, p.id)));
      if (lb) { lobby.splice(lobby.indexOf(lb), 1); const old = lb.table && T[lb.table]; if (old && old !== tb) old.res = old.res.filter((r) => r.party !== lb.id); seatParty(t, lb, tb, "booked"); lb.lobbyWait = t - lb.lobbyAt; continue; }
      if (t > LAST_SEAT) continue;
      const g = waitlist.find((p) => p.group);
      if (g && [9, 10, 11].includes(tb.id)) { if ([9, 10, 11].every((id) => freeNow(T[id], t)) && t >= g.groupAt - 5) { waitlist.splice(waitlist.indexOf(g), 1); seatParty(t, g, T[9], "waitlist"); [10, 11].forEach((id) => { T[id].party = g.id; T[id].phase = "seated"; T[id].seg.push({ from: t, state: "seated", party: g.id }); }); g.tables = [9, 10, 11]; g.waited = t - g.joinAt; } continue; }
      const w = waitlist.find((p) => !p.group && tb.seats >= p.size && tb.seats <= p.size + 3 && !reservedSoon(tb, t, p.size));
      if (!w) continue;
      waitlist.splice(waitlist.indexOf(w), 1);
      const atDoor = !AG || (w.returnAt != null && t >= w.returnAt);
      if (AG && !w.near) { w.near = t; msg(t, w, "waitlist", "ready", `Hi ${w.name}, your table is ready now. We'll hold it for 10 minutes.`); }
      const seatAt = atDoor ? t : Math.max(t, (w.returnAt ?? t) ) + (w.returnAt != null && t < w.returnAt ? 3 : 3);
      w.calledAt = t; w.waited = seatAt - w.joinAt;
      if (seatAt > t) { tb.party = w.id; tb.phase = "held"; tb.seg.push({ from: t, state: "held", party: w.id }); w.pendingSeat = { at: seatAt, tb: tb.id }; }
      else seatParty(t, w, tb, "waitlist");
    }
    for (const p of parties) if (p.pendingSeat && t >= p.pendingSeat.at) { const tb = T[p.pendingSeat.tb]; tb.party = null; tb.phase = "free"; seatParty(t, p, tb, "waitlist"); p.pendingSeat = null; }
    if (t % 1 === 0) series.push({ t, load: load(t), ticket: avgTicket(t), cooks: cooksAt(t), rain: rainAt(t), deckOpen: deck.open(t), waitlist: waitlist.length, lobby: lobby.length,
      seated: tables.reduce((a, tb) => a + (tb.party && tb.phase !== "held" ? (tb.id === 10 || tb.id === 11) && parties[tb.party - 1].group ? 0 : parties[tb.party - 1].size : 0), 0) });
  }
  function avgTicket(t) { const d = tickets.filter((k) => k.done <= t && k.done > t - 25); return d.length ? d.reduce((a, k) => a + (k.done - k.fire), 0) / d.length : null; }

  // ---------------------------------------------------------------- the close-out
  const slow = parties.filter((p) => p.flagged);
  if (AG) {
    say(330, "kitchen", `Kitchen closed at ${clock(KITCHEN_CLOSE)}. ${tickets.length} tickets tonight; the slowest took ${Math.round(Math.max(...tickets.map((k) => k.done - k.fire)))} min.`, { kind: "observe", auth: "observe" });
    say(372, "resolution", `Close-out drafted for the duty manager: covers, comps ($${slow.reduce((a, p) => a + (p.comp?.cost || 0), 0)}), every message and who approved it.`, { kind: "draft" }, { closeout: true });
    for (const p of slow) msg(375, p, "resolution", "followup", `Kia ora ${p.name}, thanks for your patience on Friday. Your mains took longer than they should have, and we're sorry. We'd love to have you back.`, { hold: true });
    if (slow.length) say(375, "resolution", `Follow-up drafted for ${slow.map((p) => "table " + p.table).join(" and ")}. Left as a draft for the manager on Monday; nothing sent.`, { kind: "draft" }, { closeout: true });
    say(392, "booking", `Tomorrow's book carried over; tonight's no-show noted on the guest's record for the host to review.`, { kind: "limits" }, { closeout: true });
  }
  events.sort((a, b) => a.t - b.t); messages.sort((a, b) => a.t - b.t);

  // ---------------------------------------------------------------- proof (Simulated)
  const served = parties.filter((p) => p.seatedAt != null);
  const walk = parties.filter((p) => p.kind === "walkin" && p.arrive != null);
  const waited = walk.filter((p) => p.joinAt != null && p.waited != null && !p.group);
  const lost = walk.filter((p) => p.state === "lost"), too = walk.filter((p) => p.state === "toolate");
  const ns = bookings.filter((b) => b.noShow), refill = ns.map((b) => { const tb = T[b.table]; const s = tb && tb.seg.find((g) => g.from >= b.released && g.state === "seated" || g.state === "held" && g.from >= b.released); return s ? s.from - b.released : null; });
  const metrics = {
    covers: served.reduce((a, p) => a + p.size, 0), parties: served.length,
    quoted: waited.length ? Math.round(waited.reduce((a, p) => a + p.quote.mid, 0) / waited.length) : 0,
    actual: waited.length ? Math.round(waited.reduce((a, p) => a + p.waited, 0) / waited.length) : 0,
    withinRange: waited.length ? Math.round((100 * waited.filter((p) => p.waited <= p.quote.hi + 0.5).length) / waited.length) : 0, waitedN: waited.length, inRangeN: waited.filter((p) => p.waited <= p.quote.hi + 0.5).length,
    walkins: walk.length - too.length, kept: walk.length - too.length - lost.length, lost: lost.length, tooLate: too.length,
    straightIn: walk.filter((p) => p.how === "walkin").length,
    noShows: ns.length, refilled: refill.filter((x) => x != null).length, refillMin: refill.filter((x) => x != null).map((x) => Math.round(x)),
    approvals: messages.filter((m) => m.status === "approved").length + events.filter((e) => e.status.kind === "approved").length,
    approvedMessages: messages.filter((m) => m.status === "approved").length, withinLimits: messages.filter((m) => m.status === "limits").length, drafts: messages.filter((m) => m.status === "draft").length,
    comps: slow.length, compCost: slow.reduce((a, p) => a + (p.comp?.cost || 0), 0), replans: events.filter((e) => e.replan).length,
  };

  // ---------------------------------------------------------------- chapters (from the night's own events)
  const firstWait = parties.filter((p) => p.joinAt != null).sort((a, b) => a.joinAt - b.joinAt)[0];
  const firstSlow = events.find((e) => e.slow);
  const nsEv = events.find((e) => e.noShow);
  const ch = [
    { id: "book", t: 0, title: "Bookings fill up", line: "The book fills through the early evening. The Booking agent confirms what fits, inside the limits staff set." },
    { id: "walk", t: 60, title: "Walk-ins arrive", line: "Walk-ins come along the promenade from Princes Wharf, Wynyard Quarter and the city. Free tables go straight away." },
    { id: "wait", t: Math.max(90, Math.round((firstWait?.joinAt ?? 130) - 2)), title: "The waitlist", line: "Full. Each walk-in gets an honest quote and waits nearby, not in a queue; their phone keeps them busy." },
    { id: "kitchen", t: Math.round((firstSlow?.t ?? 185) - 6), title: "The kitchen under pressure", line: "Tickets stack up on the pass. The Kitchen agent spots a slow table and suggests a comp for a manager to approve." },
    { id: "rain", t: Math.round(RAIN.flag - 2), title: "The weather turns", line: `${RAIN.label === "a rainstorm" ? "A rainstorm" : "A shower"} is coming. The deck moves inside, tables are re-planned and affected guests get a message.` },
    { id: "noshow", t: Math.round((nsEv?.t ?? 255) - 8), title: "A no-show", line: "A booking doesn't come. After a check-in and fifteen minutes, the table goes to the next party on the waitlist." },
    { id: "close", t: 320, title: "The close-out", line: "Last tables clear. The Resolution agent drafts the night's close-out and leaves the follow-ups as drafts." },
    { id: "proof", t: 410, title: "Proof", line: "The night in numbers. Simulated: one fictional restaurant, one fictional Friday." },
  ].sort((a, b) => a.t - b.t);
  return { opts: o, tables, parties, messages, events, series, metrics, chapters: ch, rain: RAIN, deck: { closeAt: deck.closeAt }, rainAt, tickets, LIMITS };
}

// the state of the floor at a moment: each table's state and party
export function floorAt(night, t) {
  return night.tables.map((tb) => {
    let s = { state: tb.zone === "flex" ? "closed" : "free" };
    for (const g of tb.seg) if (g.from <= t) s = g; else break;
    let state = s.state; if (tb.zone === "flex" && state === "free" && t < night.deck.closeAt) state = "closed";
    if (tb.zone === "deck" && state === "free" && t >= night.deck.closeAt) state = "closed";
    if (state === "free") { const r = tb.res.find((r) => !r.walk && r.from > t && r.from < t + 25 && !night.parties[r.party - 1].released && !(night.parties[r.party - 1].seatedAt <= t)); if (r) state = "booked"; }
    return { id: tb.id, state, party: s.party ? night.parties[s.party - 1] : null };
  });
}
// a moment's summary for the page: clock, chapter, counts, the kitchen, the weather
export function momentAt(night, t) {
  const i = Math.max(0, Math.min(night.series.length - 1, Math.floor(t))), s = night.series[i];
  let chapter = night.chapters[0]; for (const c of night.chapters) if (c.t <= t) chapter = c;
  const waiting = night.parties.filter((p) => p.joinAt != null && p.joinAt <= t && !((p.seatedAt ?? Infinity) <= t || (p.calledAt ?? Infinity) <= t || (p.lostAt ?? Infinity) <= t));
  return { t, clock: clock(t), chapter, ...s, waiting, rain: night.rainAt(t) };
}
