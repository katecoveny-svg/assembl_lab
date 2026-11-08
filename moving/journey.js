/* assembl lab · Moving house: the journey. One fictional Example tenant (Sam) moves from a flat on Calgary Street, Sandringham, to
   a rental across Tāmaki Makaurau Auckland. This file holds the whole journey as data (stages, beats, who does what and with what
   authority, what goes on the map), plays it, and draws the panel and the text version. It needs no WebGL: /moving/scene.js listens
   for "moving:state" and draws the city as a point cloud; without it the page is the still and this text.
   Truth rules: every outbound message or form is a draft until Sam says yes, and nothing is ever sent, lodged, booked or connected
   in this sim. Businesses are generic ("· Example"). Rents are Tenancy Services' published medians; the power figures come from the
   lab's feeds (/feeds.js) or the snapshot built in here; everything else is Simulated. */
(function () {
  "use strict";
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const money = (v) => "$" + Math.round(v).toLocaleString("en-NZ");

  // ---------------------------------------------------------------------------------------------- published figures (baked)
  // From assets/models/moving/moving-points.json (tools/pointcloud/bake-moving.mjs): Tenancy Services rental bond data, the newest
  // quarter's median weekly rent for new bonds, all dwellings and bedroom counts, by Stats NZ SA2 (2019) area. The header is read on
  // load and replaces these if it differs.
  const RENT = {
    quarter: "April to June 2026",
    source: { name: "Tenancy Services (MBIE), rental bond data", url: "https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/" },
    old: { area: "Sandringham East", median: 570, bonds: 15 },
    b: { area: "Ellerslie Central", median: 650, bonds: 33 },
    a: { area: "Royal Oak East (Auckland)", median: 600, bonds: 39 },
  };
  // Power: the snapshot the energy twin carries, replaced by the lab's feeds when they answer ("assembl:live")
  const POWER = {
    wholesale: { cents: 11.39, period: "22 October 2026 (interim)", node: "Ōtāhuhu", truth: "Snapshot", source: { name: "Electricity Authority EMI", url: "https://www.emi.ea.govt.nz/Wholesale/Datasets/DispatchAndPricing/FinalEnergyPrices" } },
    retail: { cents: 41.3, location: "Auckland Central", period: "survey of 15 August 2026", truth: "Snapshot", source: { name: "MBIE, Quarterly Survey of Domestic Electricity Prices", url: "https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/energy-prices/electricity-cost-and-price-monitoring" } },
  };
  // the Example household's use: two people in a two-bedroom rental, early summer (Simulated)
  const USE = { kwhPerDay: 17, days: 30 };

  const STREET = {
    old: { name: "Calgary Street", suburb: "Sandringham" },
    b: { name: "Lonsdale Street", suburb: "Ellerslie", rent: 650, km: 6.3, ride: "9 minutes by bike to work" },
    a: { name: "Haydn Avenue", suburb: "Royal Oak", rent: 600, km: 3.7, ride: "14 minutes by bike to work" },
  };

  // ---------------------------------------------------------------------------------------------- the agents
  const AGENTS = {
    intent: { name: "Intent", auth: ["observe", "recommend"], does: "Works out what Sam needs, one small question at a time." },
    search: { name: "Search", auth: ["observe", "recommend"], does: "Builds and ranks the shortlist from Sam's answers." },
    application: { name: "Application", auth: ["draft", "act with approval"], does: "Drafts viewing requests and applications; shares documents only with consent." },
    tenancy: { name: "Tenancy", auth: ["observe", "draft"], does: "Reads the agreement, drafts the bond form, keeps the condition record. No tenancy advice." },
    utilities: { name: "Utilities", auth: ["draft", "act with approval"], does: "Lines up power and internet from the move-in date and closes the old ones." },
    moving: { name: "Moving", auth: ["draft", "act with approval"], does: "Plans the move, asks movers for quotes, drafts the change-of-address list." },
    resolution: { name: "Resolution", auth: ["recommend", "draft"], does: "Steps in when something goes wrong and finds the next option." },
  };

  // ---------------------------------------------------------------------------------------------- the journey
  // beat kinds: say (an agent), ask (agent asks, Sam answers), draft (an outbound message or form: draft, then Sam's yes), consent,
  // wait (a productive wait), problem, list, proof. `reuse` names what Sam didn't have to give again. `map` changes the picture.
  function build(wrong) {
    const D = wrong ? "a" : "b", d = STREET[D], rent = d.rent, bond = rent * 4;
    const pm = "Property manager · Example", movers = "Movers · Example", power = "Power retailer · Example", isp = "Internet provider · Example";
    const S = [];
    S.push({ id: "search", n: 1, title: "Searching", line: "A shortlist built from what Sam needs, asking the smallest useful question each time.", agents: ["intent", "search"],
      map: { cam: "old", rings: ["old"], streets: ["old"], scan: "old" },
      callouts: [{ at: "old", title: "Leaving Calgary Street, Sandringham", text: `Area median ${money(RENT.old.median)} a week`, chip: "Latest published" }],
      beats: [
        { k: "say", agent: "intent", text: "Sam wants to move by the end of November. Before searching, it asks only what changes the shortlist." },
        { k: "ask", agent: "intent", q: "When do you need to be in by?", a: "The end of November.", effect: "640 listings free from 28 November" },
        { k: "ask", agent: "intent", q: "Where do you need to get to most days?", a: "Work in Penrose. I bike or take the train.", effect: "212 within a 25-minute ride or train" },
        { k: "ask", agent: "intent", q: "How many bedrooms, at the least?", a: "Two.", effect: "61 with two bedrooms or more" },
        { k: "ask", agent: "intent", q: "What's the most you'd pay a week?", a: "$680.", effect: "18 at $680 a week or less" },
        { k: "ask", agent: "intent", q: "Anything you can't do without?", a: "Somewhere dry for a bike.", effect: "3 on the shortlist" },
        { k: "list", agent: "search", title: "The shortlist", auth: "recommend", map: { cam: "city", rings: ["old", "b", "a", "c"] }, items: [
          `1 · Lonsdale Street, Ellerslie · 2 bedrooms · $650 a week · 9 minutes by bike. Area median ${money(RENT.b.median)}.`,
          `2 · Haydn Avenue, Royal Oak · 2 bedrooms · $600 a week · 14 minutes by bike. Area median ${money(RENT.a.median)}.`,
          "3 · A block in Mount Albert · 2 bedrooms · $620 a week · 24 minutes by train.",
        ], note: `Asking rents and travel times are Simulated. Area medians: ${RENT.source.name}, ${RENT.quarter}.` },
      ] });
    S[0].callouts.push({ at: "ring.b", title: "Shortlist 1 · Lonsdale Street, Ellerslie", text: "A block, not an address", chip: "Simulated" }, { at: "ring.a", title: "Shortlist 2 · Haydn Avenue, Royal Oak", text: "A block, not an address", chip: "Simulated" });

    S.push({ id: "viewing", n: 2, title: "Viewing booked", line: "A viewing request, drafted from what Sam has already said.", agents: ["search", "application"],
      map: { cam: "dest", dest: "b", rings: ["old", "b"], streets: ["old", "b"], beacons: ["pm"] },
      callouts: [{ at: "street.b", title: "Lonsdale Street, Ellerslie", text: "Viewing Thursday 12 November, 5.30 pm", chip: "Simulated" }, { at: "place.pm", title: "Property manager · Example", text: "A generic location, not a real business", chip: "Illustrative" }],
      beats: [
        { k: "say", agent: "search", auth: "recommend", text: "Shortlist 1 has viewings on Thursday and Saturday. Thursday at 5.30 pm fits after work." },
        { k: "draft", agent: "application", to: pm, title: "Viewing request · Lonsdale Street", lines: ["Thursday 12 November, 5.30 pm", "Sam's name and phone, from the profile", "One question: is there covered storage for a bike?"], approve: true, reuse: ["contact details"] },
        { k: "say", agent: "application", text: "Once the property manager replies, the viewing goes in Sam's calendar with a reminder at 4.45 pm." },
      ] });

    const appBeats = [
      { k: "consent", agent: "application", to: pm, title: "Share documents for this application", lines: ["Photo ID, two recent payslips and a reference contact from the current landlord", "Shared with this property manager only, for this application", "Deleted from the share after 30 days"], approve: true, reuse: ["ID", "proof of income", "reference contact"] },
      { k: "draft", agent: "application", to: pm, title: "Tenancy application · Lonsdale Street", lines: ["Move-in from Saturday 28 November", "Two people, no pets, one bike", "Filled from Sam's earlier answers"], approve: true, reuse: ["move-in date", "household details", "contact details"] },
      { k: "wait", who: pm, text: "Assessing the application. About two days.", during: "moving", items: ["A room-by-room list becomes an estimate: 28 boxes and 14 large items", "Quote requests drafted for three Movers · Example", "A move-day timeline: load at 8 am, unload by 12.30 pm"], map: { scan: "pm" } },
    ];
    if (wrong) appBeats.push(
      { k: "problem", text: "Declined. The property manager chose another applicant.", map: { rings: ["old", "a", "c"], streets: ["old"], dest: "a", beacons: ["pm"] } },
      { k: "say", agent: "resolution", auth: "recommend", text: "Next on the shortlist: Haydn Avenue, Royal Oak, $600 a week. A viewing on Wednesday at 6 pm is free.", map: { cam: "dest", dest: "a", rings: ["old", "a"], streets: ["old", "a"] } },
      { k: "draft", agent: "application", to: "A different Property manager · Example", title: "Viewing request · Haydn Avenue", lines: ["Wednesday 18 November, 6 pm", "Same contact details, nothing typed again"], approve: true, reuse: ["contact details"] },
      { k: "consent", agent: "application", to: "A different Property manager · Example", title: "Share the same documents with a new recipient", lines: ["The pack Sam already put together, unchanged", "A new recipient needs a new yes", "Deleted from the share after 30 days"], approve: true, reuse: ["ID", "proof of income", "reference contact", "household details", "move-in date"] },
      { k: "wait", who: "A different Property manager · Example", text: "Assessing. About two days.", during: "moving", items: ["The moving plan already fits: only the unload address changes", "The quote requests are redrafted for Royal Oak, still unsent"] },
    );
    appBeats.push({ k: "say", agent: "application", text: `Approved. The property manager offers a tenancy on ${d.name} from Saturday 28 November.`, map: { cam: "city" } });
    S.push({ id: "application", n: 3, title: "Application", line: "Documents shared once, with consent. While it's assessed, the moving plan gets made.", agents: wrong ? ["application", "moving", "resolution"] : ["application", "moving"],
      map: { cam: "city", dest: "b", rings: ["old", "b"], streets: ["old", "b"], beacons: ["pm"] },
      callouts: [{ at: "place.pm", title: "Assessing the application", text: "Meanwhile the Moving agent drafts the plan", chip: "Simulated" }, { at: "ring.old", title: "Moving plan, drafted while Sam waits", text: "28 boxes, 14 large items, 3 quote requests", chip: "Simulated" }]
        .concat(wrong ? [{ at: "ring.a", title: "Declined, so shortlist 2", text: "Haydn Avenue, Royal Oak", chip: "Simulated" }] : []),
      beats: appBeats });

    S.push({ id: "tenancy", n: 4, title: "Tenancy agreed, bond to approve", line: "The agreement read and summarised. The bond form goes to the bond-holding step as an approval.", agents: ["tenancy", "application"],
      map: { cam: "dest", dest: D, rings: ["old", D], streets: ["old", D], beacons: ["pm"], house: { frame: 1, keys: 0.5, bond: 0.5 } },
      callouts: [{ at: "house.bond", title: `Bond ${money(bond)}, four weeks' rent here`, text: "Approval requested. Not lodged.", chip: "Simulated" }, { at: "house.roof", title: "Example house, drawn", text: `Over ${d.name}, not any real house`, chip: "Illustrative" }],
      beats: [
        { k: "say", agent: "tenancy", auth: "observe", text: "Reads the agreement and lists what to check: the start date, the rent, the bond and who pays for what. It doesn't give tenancy advice: the rules are at Tenancy Services.", link: { href: "https://www.tenancy.govt.nz/", text: "Tenancy Services" } },
        { k: "draft", agent: "tenancy", to: pm, title: `Tenancy agreement · ${d.name}`, lines: [`From Saturday 28 November, ${money(rent)} a week`, "Keys at 12 pm on the day", "Three questions Sam asked are answered in writing"], approve: true, approved: "Agreed by Sam", reuse: ["contact details", "move-in date"] },
        { k: "draft", agent: "tenancy", to: "Bond-holding step · Tenancy Services", title: "Bond lodgement form", lines: [`${money(bond)}, four weeks' rent in this example`, "Goes to Tenancy Services once Sam and the property manager have both approved"], approve: true, approved: "Approval given by Sam", state: "Waiting on the property manager's approval. Not lodged in this sim.", reuse: ["contact details", "new address"], map: { house: { frame: 1, keys: 0.5, bond: 0.6 } } },
      ] });

    S.push({ id: "moving", n: 5, title: "Moving day booked", line: "Three quotes, one recommendation, one yes.", agents: ["moving"],
      map: { cam: "arc", dest: D, rings: ["old", D], streets: ["old", D], beacons: ["movers"], arc: 1, house: { frame: 1, keys: 0.5, bond: 0.6 } },
      callouts: [{ at: "arc", title: "Saturday 28 November, 8 am", text: `${STREET.old.name} to ${d.name}, ${d.km} km`, chip: "Simulated" }, { at: "place.movers", title: "Movers · Example", text: "Booking request ready, not booked", chip: "Illustrative" }],
      beats: [
        { k: "say", agent: "moving", auth: "recommend", text: "Three quotes back: $590 on Sunday only, $640 on Saturday at 8 am, $720 on Saturday at 1 pm. It recommends $640: it meets the 12 pm key handover." },
        { k: "draft", agent: "moving", to: movers, title: "Booking request · Saturday 28 November", lines: [`8 am at ${STREET.old.name}, then ${d.name}`, "Two movers and a truck, about four hours, $640", "The inventory from the moving plan"], approve: true, state: "Booking request ready. Nothing is booked in this sim.", reuse: ["old address", "new address", "move-in date", "inventory"] },
      ] });

    const utilBeats = [
      { k: "draft", agent: "utilities", to: power, title: "Power at the new place", lines: [`Connect ${d.name} from Saturday 28 November`, `Final meter read at ${STREET.old.name} on Monday 30 November, the day the old tenancy ends`], approve: true, reuse: ["new address", "move-in date", "contact details"], map: { house: { frame: 1, keys: 0.5, bond: 0.6, power: 1 } } },
      { k: "draft", agent: "utilities", to: isp, title: "Internet at the new place", lines: ["Move the plan to the new address from 28 November", "End the old line on Monday 30 November"], approve: true, reuse: ["new address", "move-in date", "contact details"] },
    ];
    if (wrong) utilBeats.push(
      { k: "problem", text: "Clash: the internet provider's earliest technician visit is Thursday 3 December, five days after move-in." },
      { k: "say", agent: "resolution", auth: "recommend", text: "Re-plan: the listing shows a fibre box already installed, so ask for a remote connection with no visit. The provider says it can switch on from 28 November." },
      { k: "draft", agent: "utilities", to: isp, title: "Change: remote connection, no visit", lines: ["Switch on from Saturday 28 November", "Cancel the 3 December visit"], approve: true, reuse: ["new address", "move-in date"] },
    );
    utilBeats.push({ k: "say", agent: "utilities", text: "Both requests are ready to go: power and internet on from move-in day, the old ones closed the day the old tenancy ends.", map: { cam: "dest", house: { frame: 1, keys: 0.5, bond: 0.6, power: 1, internet: 1 } } });
    S.push({ id: "utilities", n: 6, title: "Power and internet from day one", line: "Connected at the new place from the move-in date, closed at the old one.", agents: wrong ? ["utilities", "resolution"] : ["utilities"],
      map: { cam: "arc", dest: D, rings: ["old", D], streets: ["old", D], beacons: ["power", "internet"], arc: 1, house: { frame: 1, keys: 0.5, bond: 0.6 } },
      callouts: [{ at: "place.power", title: "Power retailer · Example", text: "On from 28 November, once Sam says yes", chip: "Illustrative" }, { at: "place.internet", title: "Internet provider · Example", text: wrong ? "Re-planned: remote switch-on, no visit" : "On from 28 November, once Sam says yes", chip: "Illustrative" }, { at: "house.power", title: "Move-in readiness", text: "Power and internet requested from day one", chip: "Simulated" }],
      beats: utilBeats });

    S.push({ id: "address", n: 7, title: "Change of address", line: "The new address, given once and used everywhere.", agents: ["moving"],
      map: { cam: "city", dest: D, rings: ["old", D], streets: ["old", D], arc: 1, house: { frame: 1, keys: 0.5, bond: 0.6, power: 1, internet: 1 } },
      callouts: [{ at: "ring.old", title: "Nine updates drafted", text: "From 28 November, all waiting on Sam's yes", chip: "Simulated" }, { at: `ring.${D}`, title: `${d.name}, ${d.suburb}`, text: "Given once, used in every update", chip: "Simulated" }],
      beats: [
        { k: "list", agent: "moving", title: "Change-of-address checklist", auth: "draft", items: ["Bank · Example", "Employer", "Inland Revenue (myIR)", "Electoral Commission (enrolment)", "NZTA (driver licence)", "Doctor's practice · Example", "Contents insurer · Example", "Mail redirection · Example", "A note to friends and whānau"], approve: true, approved: "Approved by Sam: nine updates ready for 28 November", state: "Nothing is sent in this sim.", reuse: ["new address", "new address", "new address", "new address", "new address", "new address", "new address", "new address", "new address"] },
      ] });

    S.push({ id: "settle", n: 8, title: "Settling in", line: "Keys, a condition record and the old bond, with nothing left hanging.", agents: ["tenancy", "resolution", "utilities"],
      map: { cam: "dest", dest: D, rings: ["old", D], streets: ["old", D], arc: 1, house: { frame: 1, keys: 1, bond: 0.6, power: 1, internet: 1 } },
      callouts: [{ at: "house.keys", title: "Keys at 12 pm, Saturday", text: "Room photos saved with the agreement", chip: "Simulated" }, { at: "house.internet", title: "Power and internet on from day one", text: "Requested and approved, not connected by this sim", chip: "Simulated" }],
      beats: [
        { k: "draft", agent: "tenancy", to: pm, title: "Condition record · move-in day", lines: ["Photos of each room, dated", "Two marks noted on the hallway wall"], approve: true, reuse: ["new address"] },
        { k: "draft", agent: "resolution", to: "Bond-holding step · Tenancy Services", title: "Old flat: bond refund request", lines: ["After the final inspection at Calgary Street", "Needs Sam's and the old landlord's approval"], approve: true, approved: "Approval given by Sam", state: "Waiting on the old landlord. Not lodged in this sim.", reuse: ["contact details", "old address"] },
        { k: "say", agent: "utilities", text: "On day 7 it asks for one meter photo, to check the first-bill estimate against real use." },
      ] });

    S.push({ id: "proof", n: 9, title: "Proof", line: "What Sam didn't have to repeat, what Sam said yes to, and what the move costs to run.", agents: [],
      map: { cam: "overview", dest: D, rings: ["old", D], streets: ["old", D], beacons: ["pm", "movers", "power", "internet"], arc: 1, house: { frame: 1, keys: 1, bond: 0.6, power: 1, internet: 1 } },
      callouts: [{ at: "arc", title: "One move, told once", text: `${STREET.old.name} to ${d.name}, ${d.km} km`, chip: "Simulated" }, { at: `ring.${D}`, title: "Estimated first power bill", text: "", chip: "Estimate", bill: true },
        { at: "ring.old", title: "Leaving Calgary Street", text: `Area median ${money(RENT.old.median)} a week`, chip: "Latest published" },
        { at: "place.pm", title: "Property manager · Example", text: "", chip: "Illustrative", compact: true }, { at: "place.movers", title: "Movers · Example", text: "", chip: "Illustrative", compact: true },
        { at: "place.power", title: "Power retailer · Example", text: "", chip: "Illustrative", compact: true }, { at: "place.internet", title: "Internet provider · Example", text: "", chip: "Illustrative", compact: true }],
      beats: [{ k: "proof" }] });
    return { stages: S, dest: D, wrong };
  }

  // ---------------------------------------------------------------------------------------------- the proof figures
  function proof(J) {
    let approvals = 0; const reused = [];
    for (const s of J.stages) for (const b of s.beats) { if (b.approve) approvals++; if (b.reuse) reused.push(...b.reuse); }
    const counts = {}; reused.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
    // overlap avoided (Simulated): as it usually goes in this sim, the old internet runs on to the end of a 14-day notice period
    // given on moving day, and the old power until it's remembered three days after the old tenancy ends; planned, both end on 30 Nov
    const overlap = { internet: 14 - 2, power: 3 };
    const kwh = USE.kwhPerDay * USE.days, bill = (kwh * POWER.retail.cents) / 100, wholesale = (kwh * POWER.wholesale.cents * 1.15) / 100;
    return { approvals, repeats: reused.length, counts, overlap, overlapDays: overlap.internet + overlap.power, kwh, bill, wholesale };
  }

  // ---------------------------------------------------------------------------------------------- state and playback
  const S = { wrong: false, stage: 0, beat: 0, playing: !reduce, J: build(false) };
  window.MovingJourney = { get state() { return S; }, AGENTS, RENT, POWER, USE, STREET, proof: () => proof(S.J), go, setWrong, mapState };

  // the map state at a beat: the stage's map with each revealed beat's changes merged in
  function mapState(stageIdx = S.stage, beat = S.beat) {
    const st = S.J.stages[stageIdx], m = JSON.parse(JSON.stringify(st.map));
    for (let i = 0; i <= Math.min(beat, st.beats.length - 1); i++) { const bm = st.beats[i].map; if (bm) for (const k in bm) m[k] = typeof bm[k] === "object" && !Array.isArray(bm[k]) ? { ...(m[k] || {}), ...bm[k] } : bm[k]; }
    m.dest = m.dest || S.J.dest; m.house = m.house || null; m.callouts = st.callouts; m.stage = st.id; m.n = st.n;
    return m;
  }
  function emit() { try { window.dispatchEvent(new CustomEvent("moving:state", { detail: { map: mapState(), stage: S.J.stages[S.stage], beat: S.beat, wrong: S.wrong } })); } catch (e) { console.warn("moving:state listener", e); } }

  let timer = null;
  function schedule() {
    clearTimeout(timer); if (!S.playing) return;
    const st = S.J.stages[S.stage], b = st.beats[S.beat], last = S.beat >= st.beats.length - 1;
    const ms = last ? (st.id === "proof" ? 9000 : 3600) : b && b.k === "wait" ? 4200 : b && (b.k === "draft" || b.k === "consent" || b.k === "list") ? 3000 : 2200;
    timer = setTimeout(() => { if (!last) { S.beat++; render(); emit(); schedule(); } else { go(S.stage === S.J.stages.length - 1 ? 0 : S.stage + 1); } }, ms);
  }
  // jump to a stage. Played: its beats come in one by one. Stepped by hand (or reduced motion): the stage arrives whole.
  function go(i, { whole = !S.playing, beat } = {}) {
    S.stage = Math.max(0, Math.min(S.J.stages.length - 1, i)); S.beat = beat != null ? Math.min(beat, S.J.stages[S.stage].beats.length - 1) : whole ? S.J.stages[S.stage].beats.length - 1 : 0;
    render(); emit(); schedule();
  }
  function setWrong(v) { S.wrong = !!v; S.J = build(S.wrong); render(); renderText(); emit(); schedule(); }

  // ---------------------------------------------------------------------------------------------- drawing the panel
  const authTag = (a) => `<span class="mv-auth">${esc(a)}</span>`;
  const agentTag = (id, auth) => { const a = AGENTS[id]; return a ? `<span class="mv-agent">${esc(a.name)} agent</span>${(auth ? [auth] : a.auth).map(authTag).join("")}` : ""; };
  function beatHTML(b, live) {
    const fresh = live ? " mv-fresh" : "";
    switch (b.k) {
      case "say": return `<li class="mv-beat mv-say${fresh}"><p class="mv-who">${agentTag(b.agent, b.auth)}</p><p>${esc(b.text)}${b.link ? ` <a href="${b.link.href}" target="_blank" rel="noopener">${esc(b.link.text)}</a>.` : ""}</p></li>`;
      case "ask": return `<li class="mv-beat mv-ask${fresh}"><p class="mv-who">${agentTag(b.agent, "observe")}</p><p class="mv-q">${esc(b.q)}</p><p class="mv-a"><span class="mv-sam">Sam</span> ${esc(b.a)}</p><p class="mv-effect">${esc(b.effect)} <span class="truth" data-k="sim">Simulated</span></p></li>`;
      case "draft": case "consent": {
        const head = b.k === "consent" ? "Consent to share" : "Draft";
        return `<li class="mv-beat mv-draft${fresh}" data-kind="${b.k}"><p class="mv-who">${agentTag(b.agent, b.k === "consent" ? "act with approval" : "draft")}</p>
          <div class="mv-card"><p class="mv-card-k"><span>${head}</span><span>To ${esc(b.to)}</span></p><p class="mv-card-t">${esc(b.title)}</p><ul>${b.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
          <p class="mv-status" data-status="approved"><span class="mv-yes">${esc(b.approved || (b.k === "consent" ? "Consent given by Sam" : "Approved by Sam"))}</span><span class="mv-not">${esc(b.state || (b.k === "consent" ? "Nothing is shared in this sim." : "Ready to send. Nothing is sent in this sim."))}</span></p></div></li>`; }
      case "wait": return `<li class="mv-beat mv-wait${fresh}"><p class="mv-who"><span class="mv-agent">${esc(b.who)}</span><span class="mv-auth">waiting</span></p><p class="mv-wait-t"><span class="mv-spin" aria-hidden="true"></span>${esc(b.text)} <span class="truth" data-k="sim">Simulated</span></p>
          <p class="mv-who mv-meanwhile">Meanwhile · ${agentTag(b.during, "draft")}</p><ul class="mv-ticks">${b.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></li>`;
      case "problem": return `<li class="mv-beat mv-problem${fresh}"><p class="mv-who"><span class="mv-agent">Made to go wrong</span></p><p>${esc(b.text)} <span class="truth" data-k="sim">Simulated</span></p></li>`;
      case "list": return `<li class="mv-beat mv-list${fresh}"><p class="mv-who">${agentTag(b.agent, b.auth)}</p><div class="mv-card"><p class="mv-card-k"><span>${b.approve ? "Drafts" : "Recommendation"}</span></p><p class="mv-card-t">${esc(b.title)}</p><ul>${b.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${b.note ? `<p class="mv-note">${esc(b.note)}</p>` : ""}
          ${b.approve ? `<p class="mv-status" data-status="approved"><span class="mv-yes">${esc(b.approved)}</span><span class="mv-not">${esc(b.state)}</span></p>` : ""}</div></li>`;
      case "proof": return `<li class="mv-beat mv-proofs${fresh}">${proofHTML()}</li>`;
    }
    return "";
  }
  function proofHTML() {
    const p = proof(S.J), top = Object.entries(p.counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} (${v})`).join(", ");
    const w = POWER.wholesale, r = POWER.retail;
    return `<div class="mv-tiles">
      <div class="mv-tile"><p class="mv-big">${p.repeats}</p><p>things Sam didn't have to give again: ${esc(top)}</p><span class="truth" data-k="sim">Simulated</span></div>
      <div class="mv-tile"><p class="mv-big">${p.approvals}</p><p>approvals Sam gave. Every message and form waited for a yes, and none was sent by this sim.</p><span class="truth" data-k="sim">Simulated</span></div>
      <div class="mv-tile"><p class="mv-big">${p.overlapDays} days</p><p>of paying for old services avoided: internet ${p.overlap.internet}, power ${p.overlap.power}, against the sim's "as it usually goes".</p><span class="truth" data-k="sim">Simulated</span></div>
      <div class="mv-tile mv-tile-bill"><p class="mv-big">about ${money(p.bill)}</p><p>first power bill, ${USE.days} days at ${USE.kwhPerDay} kWh a day (use Simulated) at ${r.cents.toFixed(1)}c/kWh, MBIE's published ${esc(r.location)} price (${esc(r.period)}). Wholesale energy is about ${money(p.wholesale)} of it, at ${w.cents.toFixed(2)}c/kWh (${esc(w.node)}, ${esc(w.period)}) plus GST.</p>
        <span class="truth" data-k="ill">Estimate</span> <span class="truth" data-k="live" data-feed="power">${esc(truthWord(w.truth))}</span></div>
    </div>`;
  }
  const truthWord = (t) => (t === "Live" ? "Live" : t === "Latest published" ? "Latest published" : "Snapshot · built into this page");

  const panel = () => $("#mv-stage-card"), dots = () => $("#mv-dots");
  function render() {
    const st = S.J.stages[S.stage], card = panel(); if (!card) return;
    card.innerHTML = `<p class="mv-stage-k"><span>Stage ${st.n} of ${S.J.stages.length}</span>${st.agents.length ? `<span class="mv-stage-agents">${st.agents.map((a) => esc(AGENTS[a].name)).join(" · ")}</span>` : ""}</p>
      <h2 class="mv-stage-t">${esc(st.title)}</h2><p class="mv-stage-line">${esc(st.line)}</p>
      <ol class="mv-beats">${st.beats.slice(0, S.beat + 1).map((b, i) => beatHTML(b, i === S.beat && S.playing && !reduce)).join("")}</ol>`;
    const list = card.querySelector(".mv-beats"); if (list && S.playing) card.scrollTop = card.scrollHeight;
    dots()?.querySelectorAll("button").forEach((b, i) => { b.setAttribute("aria-current", i === S.stage ? "step" : "false"); });
    $("#mv-prev") && ($("#mv-prev").disabled = S.stage === 0);
    $("#mv-next") && ($("#mv-next").disabled = S.stage === S.J.stages.length - 1);
    root.dataset.stage = st.id;
  }
  // the text version of the whole journey (the page's own record, and the journey without WebGL)
  function renderText() {
    const ol = $("#mv-text"); if (!ol) return;
    ol.innerHTML = S.J.stages.map((st) => `<li id="text-${st.id}"><h3>${st.n} · ${esc(st.title)}</h3><p>${esc(st.line)}</p><ul>${st.beats.filter((b) => b.k !== "proof").map((b) => `<li>${esc(textOf(b))}</li>`).join("")}${st.id === "proof" ? proofText() : ""}</ul></li>`).join("");
    const m = $("#mv-mode-note"); if (m) m.textContent = S.wrong ? "Showing the version where things go wrong: the first application is declined, and the internet date clashes." : "Showing the version where things go to plan. Switch on “Make it go wrong” to see a declined application and a date clash.";
  }
  const trim = (xs) => xs.map((x) => x.replace(/\.$/, "")).join("; ");
  function textOf(b) {
    const A = (id) => (AGENTS[id] ? AGENTS[id].name + " agent" : "");
    switch (b.k) {
      case "say": return `${A(b.agent)}: ${b.text}`;
      case "ask": return `${A(b.agent)} asks "${b.q}" Sam: "${b.a}" (${b.effect}, Simulated)`;
      case "draft": case "consent": return `${A(b.agent)} drafts "${b.title}" for ${b.to}: ${trim(b.lines)}. ${b.approved || (b.k === "consent" ? "Consent given by Sam" : "Approved by Sam")}. ${b.state || (b.k === "consent" ? "Nothing is shared in this sim." : "Ready to send; nothing is sent in this sim.")}`;
      case "wait": return `${b.who}: ${b.text} Meanwhile the ${A(b.during)}: ${trim(b.items)}.`;
      case "problem": return `Made to go wrong: ${b.text}`;
      case "list": return `${A(b.agent)}, ${b.title}: ${trim(b.items)}.${b.approve ? " " + b.approved + ". " + b.state : ""}`;
    }
    return "";
  }
  function proofText() { const p = proof(S.J); return `<li>${p.repeats} things Sam didn't have to give again (Simulated).</li><li>${p.approvals} approvals Sam gave; nothing was sent, lodged, booked or connected by this sim.</li><li>${p.overlapDays} days of paying for old services avoided (Simulated).</li><li>Estimated first power bill about ${money(p.bill)} (Estimate, from MBIE's published Auckland price and the wholesale price).</li>`; }

  // ---------------------------------------------------------------------------------------------- feeds
  function applyFeeds(j) {
    const f = j && j.feeds; if (!f) return;
    const p = f.power && !f.power.error && f.power.values, t = f.tariffs && !f.tariffs.error && f.tariffs.values;
    if (p && p.avgCentsPerKWh) Object.assign(POWER.wholesale, { cents: p.avgCentsPerKWh, period: f.power.period || p.date, node: String(p.node || "").replace(/\s*\(.*\)/, ""), truth: f.power.truth || "Latest published", source: f.power.source || POWER.wholesale.source });
    if (t && t.totalCents) Object.assign(POWER.retail, { cents: t.totalCents, location: t.location, period: f.tariffs.period, truth: f.tariffs.truth || "Latest published", source: f.tariffs.source || POWER.retail.source });
    drawFigures(); if (S.J.stages[S.stage].id === "proof") render(); renderText(); emit();
  }
  function drawFigures() {
    const w = POWER.wholesale, r = POWER.retail, p = proof(S.J);
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set("fig-wholesale", `${w.cents.toFixed(2)}c/kWh <span class="truth" data-k="live">${esc(truthWord(w.truth))}</span>`);
    set("fig-wholesale-src", `<a href="${w.source.url}" target="_blank" rel="noopener">${esc(w.source.name)}</a> · ${esc(w.node)} · ${esc(w.period)}`);
    set("fig-retail", `${r.cents.toFixed(1)}c/kWh <span class="truth" data-k="live">${esc(r.truth === "Snapshot" ? "Latest published · copied into this page" : truthWord(r.truth))}</span>`);
    set("fig-retail-src", `<a href="${r.source.url}" target="_blank" rel="noopener">${esc(r.source.name)}</a> · ${esc(r.location)} · ${esc(r.period)}`);
    set("fig-bill", `about ${money(p.bill)} <span class="truth" data-k="ill">Estimate</span>`);
    set("fig-bill-how", `${USE.days} days × ${USE.kwhPerDay} kWh a day (Simulated use) × ${r.cents.toFixed(1)}c/kWh. Of that, wholesale energy is about ${money(p.wholesale)} (${w.cents.toFixed(2)}c/kWh plus GST); the rest is lines, metering, retail and GST.`);
  }
  addEventListener("assembl:live", (e) => { try { applyFeeds(e.detail); } catch (err) { console.warn("moving feeds", err); } });

  // the baked header: the published rents, to keep the page and the data in step
  fetch("/assets/models/moving/moving-points.json").then((r) => (r.ok ? r.json() : null)).then((h) => {
    if (!h || !h.rents) return; window.MovingHeader = h;
    RENT.quarter = h.rents.quarter; for (const k of ["old", "b", "a"]) { const a = h.rents.areas[k]; if (a) Object.assign(RENT[k], { area: a.area, median: a.medianWeekly, bonds: a.newBonds }); }
    try { window.dispatchEvent(new CustomEvent("moving:header", { detail: h })); } catch (e) { /* the scene's own listener threw */ }
  }).catch(() => {});

  // ---------------------------------------------------------------------------------------------- controls
  function wire() {
    const d = dots(); if (d) { d.innerHTML = S.J.stages.map((s, i) => `<li><button type="button" aria-label="Stage ${s.n}: ${esc(s.title)}"><span>${s.n}</span></button></li>`).join(""); d.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => go(i, { whole: true }))); }
    $("#mv-prev")?.addEventListener("click", () => go(S.stage - 1, { whole: true }));
    $("#mv-next")?.addEventListener("click", () => go(S.stage + 1, { whole: true }));
    const play = $("#mv-play");
    const setPlay = (v) => { S.playing = v; play.setAttribute("aria-pressed", String(!v)); play.setAttribute("aria-label", v ? "Pause motion" : "Play motion"); play.dataset.state = v ? "playing" : "paused"; root.classList.toggle("mv-paused", !v); try { window.dispatchEvent(new CustomEvent("moving:motion", { detail: { playing: v } })); } catch (e) { /* ignore */ } schedule(); };
    play?.addEventListener("click", () => { const v = !S.playing; if (v && S.beat >= S.J.stages[S.stage].beats.length - 1 && S.stage === S.J.stages.length - 1) S.stage = 0; setPlay(v); if (v) { render(); emit(); } });
    if (play) setPlay(S.playing);
    const wrong = $("#mv-wrong");
    wrong?.addEventListener("click", () => { const v = wrong.getAttribute("aria-checked") !== "true"; wrong.setAttribute("aria-checked", String(v)); setWrong(v); go(Math.min(S.stage, 2), { whole: !S.playing }); });
    addEventListener("keydown", (e) => { if (e.target.closest("input,textarea,select,[contenteditable]")) return; if (e.key === "ArrowRight" && e.target.closest("#sim")) go(S.stage + 1, { whole: true }); if (e.key === "ArrowLeft" && e.target.closest("#sim")) go(S.stage - 1, { whole: true }); });
  }
  function init() {
    // reduced motion: the whole journey as one still, at its last stage (every part of the map lit, every callout shown); stepping
    // through the stages still works, each arriving whole
    if (reduce) { S.stage = S.J.stages.length - 1; S.beat = 0; }
    // ?still: the frame tools/… renders as the page's first paint and no-WebGL picture (the whole journey, no panel, no callouts)
    if (/[?&]still\b/.test(location.search)) { root.classList.add("mv-stillmode"); S.playing = false; S.stage = S.J.stages.length - 1; S.beat = 0; }
    wire(); render(); renderText(); drawFigures(); emit(); schedule();
    if (window.__assemblLive) applyFeeds(window.__assemblLive);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
