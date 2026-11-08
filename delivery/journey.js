// assembl lab · Supermarket order to doorstep: the journey as data. No drawing here: delivery.js renders it on the point-cloud
// map and in the page, and the text version reads the same copy. Everything is Simulated unless a feed says otherwise: the
// basket's prices are Stats NZ average retail prices (Latest published when the lab's feed answers; the September 2026 snapshot
// otherwise), and live rain slows the van. The households are fictional; the store is an Example, not a model of the site.

// ------------------------------------------------------------------------------------------------ the basket and the swap
// Stats NZ average retail prices, September 2026 (the same snapshot the kitchen machine carries). The feed replaces them.
export const SNAPSHOT = { period: "September 2026", items: { milk2l: 5.05, bread: 2.39, eggs: 8.37, butter: 7.62, cheese: 12.82, bananas: 4.06, apples: 4.2, kiwifruit: 5.89, carrots: 2.31, potatoes: 3.27, tomatoes: 10.19, beefMince: 24.77, broccoli: 6.37 } };
export const BASKET = [
  { key: "milk2l", name: "Milk, 2 L", qty: 2, per: "each" },
  { key: "bread", name: "Bread, white 600 g", qty: 1, per: "each" },
  { key: "eggs", name: "Eggs, dozen", qty: 1, per: "each" },
  { key: "butter", name: "Butter, 500 g", qty: 1, per: "each", out: true },
  { key: "cheese", name: "Cheese, mild cheddar", qty: 1, per: "kg" },
  { key: "bananas", name: "Bananas", qty: 1.2, per: "kg" },
  { key: "apples", name: "Apples", qty: 1.5, per: "kg" },
  { key: "kiwifruit", name: "Kiwifruit", qty: 1, per: "kg" },
  { key: "carrots", name: "Carrots", qty: 1, per: "kg" },
  { key: "potatoes", name: "Potatoes", qty: 2, per: "kg" },
  { key: "tomatoes", name: "Tomatoes", qty: 0.5, per: "kg" },
  { key: "beefMince", name: "Beef mince", qty: 0.5, per: "kg" },
  { key: "broccoli", name: "Broccoli", qty: 0.5, per: "kg" },
];
export const SWAPS = {
  A: { label: "Another 500 g butter", short: "swap A", delta: 0, note: "same size, priced at the same average" },
  B: { label: "Two 250 g butter blocks", short: "swap B", delta: 1.1, note: "$1.10 more (simulated)" },
  none: { label: "No swap", short: "no swap", delta: null, note: "butter left off and not charged" },
};
export function basketTotal(prices, swap) {
  let t = 0; for (const b of BASKET) { if (b.out && swap === "none") continue; t += (prices[b.key] ?? SNAPSHOT.items[b.key]) * b.qty + (b.out && SWAPS[swap]?.delta ? SWAPS[swap].delta : 0); } return t;
}

// ------------------------------------------------------------------------------------------------ the six agents
// authority is what each may do on its own: observe, draft, recommend, or act with approval. None sends anything.
export const AGENTS = {
  intent: { name: "Intent agent", auth: "observe", does: "Reads the order: what's in it, the window and any note for the driver." },
  picking: { name: "Picking agent", auth: "observe", does: "Follows the pick: which aisle, what's found, what's missing." },
  substitution: { name: "Substitution agent", auth: "recommend", does: "Finds swaps for anything out of stock. It suggests; the customer decides." },
  route: { name: "Route agent", auth: "act with approval", does: "Plans the van's drops around the windows. The dispatcher approves the run before it goes." },
  wait: { name: "Wait agent", auth: "draft", does: "Keeps every ETA honest and drafts the message. A person sends it." },
  resolution: { name: "Resolution agent", auth: "recommend", does: "When a drop fails, offers the customer options. Nothing changes without their yes." },
};
export const STAGES = [
  { id: "order", title: "Order placed", agent: "intent" },
  { id: "pick", title: "Picking", agent: "picking" },
  { id: "swap", title: "Out of stock", agent: "substitution" },
  { id: "pack", title: "Packed and loaded", agent: "route" },
  { id: "road", title: "On the road", agent: "route" },
  { id: "windows", title: "Windows kept", agent: "wait" },
  { id: "missed", title: "Nobody home", agent: "resolution" },
  { id: "proof", title: "Proof", agent: null },
];
export const IDS = ["A", "B", "C", "D", "E", "F"];
export const FOCUS = 3;                                 // household D: the Example customer whose order we follow
// the bake's route, for a page that can't reach the header (assets/models/delivery/delivery-points.json, route.legEndsM)
export const FALLBACK = { legEndsM: [3246, 7550, 10367, 14388, 19270, 24213, 27060], households: [["A", 2, "south-west"], ["B", 1.4, "south-east"], ["C", 2.8, "south"], ["D", 3.1, "south-east"], ["E", 2.9, "north-east"], ["F", 1.8, "north"]] };

// ------------------------------------------------------------------------------------------------ clocks
export const clock = (min) => { const m = Math.round(min), h = Math.floor(m / 60) % 24, mm = m % 60, h12 = ((h + 11) % 12) + 1; return `${h12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
export const span = ([a, b]) => { const A = clock(a), B = clock(b); return A.slice(-2) === B.slice(-2) ? `${A.slice(0, -3)}–${B}` : `${A}–${B}`; };

// ------------------------------------------------------------------------------------------------ the plan
// Story time is seconds of playback at 1×. Each beat maps a stretch of story time to the clock of the Example day and to how far
// along the route the van is. Holds are the two decisions: playback waits there for the customer's choice.
const K = 0.42;                                         // story seconds per simulated minute on the road
const DWELL = 4, DEPART = 15 * 60 + 45, SPEED = 26;     // minutes at each door; 3:45 pm; km/h through suburbs, lights included (Simulated)
const DELAY = 12, KNOCK = 5, EVENING = [19 * 60, 20 * 60], EVENING_AT = 19 * 60 + 21;
export const DEFAULTS = { swap: "A", missed: "rebook" };

export function plan({ wrong = true, rain = false, choices = {}, legEndsM = FALLBACK.legEndsM } = {}) {
  const speed = SPEED * (rain ? 0.9 : 1), ch = { ...DEFAULTS, ...choices }, beats = []; let t = 0;
  const add = (b) => { b.t0 = t; b.t1 = t + (b.dur || 0); beats.push(b); t = b.t1; return b; };
  const legKm = legEndsM.map((v, i) => (v - (i ? legEndsM[i - 1] : 0)) / 1000), legMin = legKm.map((k) => (k / speed) * 60);
  // the windows: promised at dispatch from the plan (weather included), each an hour that starts a little before the planned ETA
  const planned = []; { let c = DEPART; for (let i = 0; i < 6; i++) { c += legMin[i]; planned.push(c + 2); c += DWELL; } }
  const windows = planned.map((e) => { const s = Math.floor((e - 8) / 30) * 30; return [s, s + 60]; });

  add({ stage: 0, dur: 6, c0: 10 * 60 + 42, c1: 10 * 60 + 44 });
  add({ stage: 1, dur: 9, c0: 14 * 60 + 5, c1: 14 * 60 + 31, pick: true });
  if (wrong) { add({ stage: 2, dur: 3, c0: 871, c1: 872 }); add({ stage: 2, dur: 0, c0: 872, c1: 872, hold: "swap" }); add({ stage: 2, dur: 4, c0: 872, c1: 876 }); }
  else add({ stage: 2, dur: 5, c0: 871, c1: 873 });
  add({ stage: 3, dur: 7, c0: 880, c1: 930, load: true });
  const routeT0 = t; let c = DEPART, m = 0; const stops = [], drive = (stage, min, dist, extra = {}) => { add({ stage, dur: min * K, c0: c, c1: c + min, m0: m, m1: m + dist, ...extra }); c += min; m += dist; };
  for (let i = 0; i < 7; i++) {
    const stage = i === 0 ? 4 : i <= 2 ? 5 : 6, dist = legKm[i] * 1000;
    if (wrong && i === 2) { drive(stage, legMin[i] * 0.45, dist * 0.45); drive(stage, legMin[i] * 0.1 + DELAY, dist * 0.1, { traffic: true }); drive(stage, legMin[i] * 0.45, dist * 0.45); }
    else drive(stage, legMin[i], dist);
    if (i === 6) break;
    const s = { i, id: IDS[i], arriveT: t, arrive: c, window: windows[i], planned: planned[i] };
    if (wrong && i === FOCUS) {
      add({ stage, dur: KNOCK * K, c0: c, c1: c + KNOCK, m0: m, m1: m, knock: i }); c += KNOCK;
      s.holdBeat = add({ stage, dur: 0, c0: c, c1: c, m0: m, m1: m, hold: "missed" });
      if (ch.missed === "safe") { add({ stage, dur: 2 * K, c0: c, c1: c + 2, m0: m, m1: m, handover: i }); s.doneT = t - K; s.done = c + 1; s.how = "safe"; c += 2; }
      else { add({ stage, dur: 1 * K, c0: c, c1: c + 1, m0: m, m1: m }); s.doneT = null; s.done = EVENING_AT; s.how = "rebook"; s.window = EVENING; s.firstWindow = windows[i]; c += 1; }
      s.missed = true;
    } else { add({ stage, dur: DWELL * K, c0: c, c1: c + DWELL, m0: m, m1: m, handover: i }); s.doneT = t - (DWELL - 2) * K; s.done = c + 2; s.how = "door"; c += DWELL; }
    stops.push(s);
  }
  const back = c, routeT1 = t;
  add({ stage: 7, dur: 6, c0: c, c1: c, m0: m, m1: m });
  const stageT = STAGES.map((_, k) => beats.find((b) => b.stage === k).t0);
  const holds = beats.filter((b) => b.hold).map((b) => ({ key: b.hold, t: b.t0 }));

  // the messages: every one a draft for a person to approve. t is the story time it appears.
  const msgs = []; const msg = (stage, t, to, agent, text, kind = "eta") => msgs.push({ stage, t, to, agent, text, kind });
  const D = stops[FOCUS];
  msg(0, 1.5, "Household D", "intent", `Thanks, your order is in for Tuesday, ${span(D.firstWindow || D.window)}. 13 items. We'll message you if anything changes.`, "order");
  if (wrong) msg(2, beats.find((b) => b.hold === "swap").t0 - 1, "Household D", "substitution", "Butter (500 g) is out of stock today. Would you like A) another 500 g butter at the same price, B) two 250 g blocks for $1.10 more, or no swap? Reply A, B or No.", "swap");
  const etaText = (s, late) => late ? `Running about ${DELAY} minutes behind after traffic. New estimate ${clock(s.arrive + 2)}, still inside your ${span(s.firstWindow || s.window)} window.` : `Your groceries are on the way. Expected about ${clock(s.arrive + 2)}, inside your ${span(s.firstWindow || s.window)} window.`;
  msg(4, routeT0 + 1, "Household A", "wait", etaText(stops[0]));
  msg(4, routeT0 + 1.5, "Household B", "wait", etaText(stops[1]));
  const tr = beats.find((b) => b.traffic), cdT = tr ? tr.t0 + 1 : stops[0].doneT + 1;
  msg(5, cdT, "Household C", "wait", etaText(stops[2], !!tr));
  msg(5, cdT + 0.5, "Household D", "wait", tr ? etaText(D, true) : etaText(D));
  if (wrong) {
    const h = D.holdBeat.t0;
    msg(6, h - 0.6, "Household D", "resolution", `We're at your door with your groceries and no one's home. Reply 1 to rebook for ${span(EVENING)} tonight, or 2 and tell us a safe place to leave them (chilled items in an insulated bag).`, "missed");
    if (ch.missed === "rebook") msg(6, h + 0.3, "Household D", "resolution", `Rebooked for ${span(EVENING)} tonight. Your chilled items stay cold on the van.`, "confirm");
    else msg(6, h + 0.3, "Household D", "resolution", "Left in the safe place you named, chilled items in an insulated bag. A photo is attached for you to check.", "confirm");
    msg(6, h + 0.8, "Household E", "wait", `Expected about ${clock(stops[4].arrive + 2)}, inside your ${span(stops[4].window)} window.`);
    msg(6, h + 1.1, "Household F", "wait", `Expected about ${clock(stops[5].arrive + 2)}, inside your ${span(stops[5].window)} window.`);
  } else {
    msg(6, stops[2].doneT + 1, "Household E", "wait", etaText(stops[4]));
    msg(6, stops[2].doneT + 1.5, "Household F", "wait", etaText(stops[5]));
  }

  // proof (all Simulated): windows kept, swaps accepted, misses recovered, minutes of customer effort saved
  const inWindow = stops.filter((s) => s.done >= s.window[0] && s.done <= s.window[1]).length;
  const effort = [{ what: "An ETA you can trust, so no one waits by the door", min: 6, n: 6 }];
  if (wrong && ch.swap !== "none") effort.push({ what: "A swap settled in one reply, not a refund claim later", min: 9, n: 1 });
  if (wrong) effort.push({ what: "A missed drop rebooked in one reply, not a call to support", min: 14, n: 1 });
  const proof = { inWindow, stops: 6, swaps: wrong ? { offered: 1, accepted: ch.swap === "none" ? 0 : 1 } : null, missed: wrong ? { missed: 1, recovered: 1, how: ch.missed } : null,
    effort, effortMin: effort.reduce((s, e) => s + e.min * e.n, 0), drafts: msgs.length, sent: 0 };

  return { wrong, rain, speed, choices: ch, beats, stops, windows, msgs, stageT, holds, total: t, routeT0, routeT1, back, proof, legEndsM };
}

// the state of the run at story time t
export function stateAt(P, t) {
  t = Math.max(0, Math.min(P.total, t));
  let b = P.beats.find((x) => t >= x.t0 && t < x.t1) || P.beats.filter((x) => x.t0 <= t).at(-1);
  const k = b.t1 > b.t0 ? (t - b.t0) / (b.t1 - b.t0) : 1;
  const c = b.c0 + (b.c1 - b.c0) * k, vanM = b.m0 == null ? 0 : b.m0 + (b.m1 - b.m0) * k;
  const onRoad = t >= P.routeT0;
  const homes = P.stops.map((s) => {
    let st = "packed", line = `Window ${span(s.firstWindow || s.window)}`;
    if (onRoad) { st = "pending"; line = `ETA ${clock(s.arrive + 2)} · ${span(s.firstWindow || s.window)}`; }
    if (t >= s.arriveT) {
      if (s.missed) {
        const hold = s.holdBeat.t0;
        if (t < hold) { st = "door"; line = "At the door. No answer yet"; }
        else if (s.how === "safe" && t >= s.doneT) { st = "delivered"; line = `Safe place ${clock(s.done)} · customer's choice`; }
        else if (s.how === "rebook" && t >= P.stageT[7]) { st = "delivered"; line = `Evening run ${clock(s.done)} · inside ${span(s.window)}`; }
        else if (s.how === "rebook" && t > hold + 0.01) { st = "rebooked"; line = `Nobody home · rebooked ${span(s.window)}`; }
        else { st = "missed"; line = "Nobody home"; }
      } else if (t < s.doneT) { st = "door"; line = "At the door"; }
      else { st = "delivered"; line = `Delivered ${clock(s.done)} · inside ${span(s.window)}`; }
    }
    return { id: s.id, st, line };
  });
  const next = onRoad ? P.stops.find((s) => t < s.arriveT) : null;
  const done = homes.filter((h) => h.st === "delivered").length;
  const traffic = !!b.traffic;
  return { t, beat: b, stage: b.stage, clock: c, vanM, homes, next, done, traffic, pick: b.pick ? k : t >= P.stageT[2] ? 1 : 0, load: b.load ? k : t >= P.stageT[4] ? 1 : 0, back: t >= P.routeT1 };
}

// the stage's copy: a title, what happened (plain words) and any decision waiting
export function stageCopy(P, s, prices) {
  const D = P.stops[FOCUS], ch = P.choices, total = basketTotal(prices, P.wrong ? ch.swap : "A");
  const money = (v) => "$" + v.toFixed(2);
  switch (s) {
    case 0: return { title: "Order placed", what: `The Example customer at household D orders 13 items for delivery on Tuesday, ${span(D.firstWindow || D.window)}. At Stats NZ average prices the basket comes to about ${money(total)}. The Intent agent reads it and flags one risk: butter was running low on the shelf this morning.` };
    case 1: return { title: "Picking", what: P.wrong ? "A picker walks the aisles in pick-path order: produce, bakery, chiller, meat, then dry goods. 12 of 13 found in 26 minutes. Butter, 500 g: the shelf is empty." : "A picker walks the aisles in pick-path order: produce, bakery, chiller, meat, then dry goods. 13 of 13 found in 24 minutes." };
    case 2: return P.wrong
      ? { title: "Out of stock: two swaps", what: "Butter, 500 g is out. The Substitution agent suggests two swaps that keep the order working and drafts the question for the customer. The swap stays a draft until the customer says yes.", decide: "swap" }
      : { title: "Nothing out of stock", what: "Every item was on the shelf, so there is nothing to swap and no question for the customer." };
    case 3: return { title: "Packed and loaded", what: `Six orders packed into chilled, frozen and ambient crates and loaded last drop first. The Route agent plans the run: ${(P.legEndsM.at(-1) / 1000).toFixed(1)} km, six drops in window order, back about ${clock(P.back)}. It goes to the dispatcher, who approves it (simulated).` };
    case 4: return { title: "On the road", what: `The van leaves at ${clock(DEPART)}. The route fans out over real streets to six fictional households. The Wait agent drafts an ETA for the first two.` };
    case 5: return P.wrong
      ? { title: "Windows kept", what: `A and B get their groceries inside their windows. On the way to C, traffic adds about ${DELAY} minutes. The Wait agent redrafts C and D: both still inside their windows.` }
      : { title: "Windows kept", what: "A and B get their groceries inside their windows. No hold-ups on the way to C. The Wait agent drafts C's and D's ETAs." };
    case 6: return P.wrong
      ? { title: "Nobody home", what: `At household D nobody answers. The driver waits ${KNOCK} minutes. The Resolution agent offers the customer two options: rebook for tonight, or leave the order in a safe place.`, decide: "missed" }
      : { title: "Everyone home", what: "Someone answers at every door, D included. The Wait agent keeps E's and F's ETAs current." };
    default: return { title: "Proof", what: "The run, measured. Every figure here is simulated, from this one Example day." };
  }
}
