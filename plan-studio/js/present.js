// assembl Plan Studio · the client presentation: a 16:9 deck from the model, ready to print to PDF. Honest by construction:
// renders say they are visualisations of a model revision, the materials board says which values the maker publishes and that
// screen colours are approximate, and the code page is a pre-check summary, not a compliance statement.
import { polyArea } from "./model.js";
import { MATERIALS } from "./materials.js";
import { summarise, DISCLAIMER } from "./code.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buildDeck(P, results, sheets, shots = []) {
  const rev = P.revisions?.length ? P.revisions[P.revisions.length - 1] : null, s = summarise(results);
  const area = P.rooms.reduce((a, r) => a + polyArea(r.poly), 0) / 1e6, people = P.rooms.reduce((a, r) => a + (r.occupants || 0), 0);
  const used = [...new Set([...P.walls.map((w) => w.mat), P.roof?.mat, P.slab?.mat, ...P.openings.map((o) => o.mat)])].filter((id) => MATERIALS[id]);
  const plan = sheets.find((x) => x.id === "A101")?.svg || "", elev = sheets.find((x) => x.id === "A201")?.svg || "";
  const crop = (svg) => svg.replace(/viewBox="0 0 420 297"/, 'viewBox="10 10 300 277"').replace(/width="420mm" height="297mm"/, 'width="100%" height="100%"');
  const page = (body, cls = "") => `<section class="pg ${cls}">${body}<footer><span>assembl Plan Studio</span><span>${esc(P.meta.name)} · ${esc(P.meta.number)}${rev ? " rev " + esc(rev.rev) : " draft"}</span></footer></section>`;
  const img = (i, cap) => (shots[i] ? `<figure><img src="${shots[i]}" alt="${esc(cap)}"><figcaption>${esc(cap)} · visualisation of the model, not a photograph</figcaption></figure>` : "");
  const flagged = results.filter((r) => r.status === "fail" || r.status === "info").slice(0, 9);
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><title>${esc(P.meta.name)} · client presentation</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
@page { size: 1920px 1080px; margin: 0 } * { box-sizing: border-box } body { margin: 0; background: #1a0818; font-family: 'Instrument Sans', sans-serif; color: #492B3E }
.pg { width: 1920px; height: 1080px; position: relative; background: #FFFDFB; padding: 90px 110px; page-break-after: always; overflow: hidden; margin: 0 auto 24px }
.pg.dark { background: #240B21; color: #FFFDFB } .pg footer { position: absolute; left: 110px; right: 110px; bottom: 40px; display: flex; justify-content: space-between; font: 500 16px 'IBM Plex Mono', monospace; color: #916A70 }
h1 { font-size: 104px; line-height: 1; letter-spacing: -.02em; margin: 0 0 24px; font-weight: 600 } h2 { font-size: 56px; margin: 0 0 30px; font-weight: 600; letter-spacing: -.01em } .kick { font: 500 20px 'IBM Plex Mono', monospace; letter-spacing: .08em; text-transform: uppercase; color: #C7B4F0 }
.lede { font-size: 30px; max-width: 1100px; color: rgba(255,253,251,.82) } .hero { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .55 } .over { position: relative }
figure { margin: 0 } figure img { width: 100%; border-radius: 18px; display: block } figcaption { font: 500 15px 'IBM Plex Mono', monospace; color: #916A70; margin-top: 10px }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 40px } .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 50px } .facts div { border-top: 2px solid #C7B4F0; padding-top: 14px } .facts b { display: block; font-size: 54px; font-weight: 600 } .facts span { font-size: 20px; color: rgba(255,253,251,.75) }
.sheetbox { height: 780px; border: 1px solid #eadfe3; border-radius: 16px; overflow: hidden; background: #fff } .sheetbox svg { width: 100%; height: 100% }
.mats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px } .mat { border: 1px solid #eadfe3; border-radius: 16px; overflow: hidden } .sw { height: 150px } .mat div.t { padding: 16px 18px; font-size: 18px } .mat b { display: block; font-size: 22px } .mono { font-family: 'IBM Plex Mono', monospace; font-size: 15px; color: #654A4E }
.tally span { display: inline-block; font: 500 20px 'IBM Plex Mono', monospace; color: #fff; border-radius: 999px; padding: 8px 18px; margin-right: 10px } .f{background:#B0213A}.i{background:#8a6d1f}.p{background:#2f6b46}.o{background:#6d5d63}
.list { margin-top: 30px; display: grid; gap: 14px; font-size: 22px } .list div { display: grid; grid-template-columns: 70px 1fr; gap: 14px } .list .c { font-family: 'IBM Plex Mono', monospace; font-weight: 600 }
.note { font-size: 18px; color: #654A4E; max-width: 1500px; margin-top: 30px } ol.next { font-size: 30px; line-height: 1.6 }
@media screen { body { padding: 24px 0 } }
</style></head><body>
${page(`${shots[0] ? `<img class="hero" src="${shots[0]}" alt="">` : ""}<div class="over"><p class="kick">Client presentation</p><h1>${esc(P.meta.name)}</h1><p class="lede">${esc(P.meta.address)}<br>Prepared for ${esc(P.meta.owner)} by ${esc(P.meta.designer)}</p></div>`, "dark")}
${page(`<p class="kick">The building</p><h2>${esc(P.meta.name)} at a glance</h2><div class="facts"><div><b>${area.toFixed(0)} m²</b><span>floor area</span></div><div><b>${P.rooms.length}</b><span>spaces</span></div><div><b>${people || "–"}</b><span>people as designed</span></div><div><b>${((P.roof?.ridgeH || 0) / 1000).toFixed(1)} m</b><span>to the ridge</span></div></div><div class="two" style="margin-top:60px">${img(1, "Aerial, golden hour")}${img(2, "Inside the main room")}</div>`, "dark")}
${page(`<p class="kick" style="color:#916A70">Arriving</p><h2>The approach</h2><div class="two">${img(0, "From the street, day")}${img(3, "From the street, dusk")}</div>`)}
${page(`<p class="kick" style="color:#916A70">Plan</p><h2>Ground floor</h2><div class="sheetbox">${crop(plan)}</div>`)}
${page(`<p class="kick" style="color:#916A70">Elevations</p><h2>Four sides</h2><div class="sheetbox">${crop(elev)}</div>`)}
${page(`<p class="kick" style="color:#916A70">Materials</p><h2>What it is made of</h2><div class="mats">${used.slice(0, 6).map((id) => { const m = MATERIALS[id]; return `<div class="mat"><div class="sw" style="background:${m.hex}"></div><div class="t"><b>${esc(m.name)}</b>${esc(m.maker)}${m.data ? `<div class="mono">${Object.entries(m.data).map(([k, v]) => `${esc(k)} ${esc(v)}`).join(" · ")}</div>` : ""}${m.approx ? `<div class="mono">Screen colour approximate: choose from the physical swatch</div>` : ""}</div></div>`; }).join("")}</div><p class="note">Published values are the maker's figures as read in November 2026; where the maker's documents differ, the range is shown. Products link to the maker and to miproducts for the specification.</p>`)}
${page(`<p class="kick" style="color:#916A70">Building Code pre-check</p><h2>Where the design stands today</h2><div class="tally"><span class="f">${s.fail} to resolve</span><span class="i">${s.info} need information</span><span class="p">${s.pass} pass</span><span class="o">${s.out} out of scope</span></div><div class="list">${flagged.map((r) => `<div><span class="c">${esc(r.clause)}</span><span><b>${esc(r.title)}</b> · ${esc(r.measured)} (limit ${esc(r.limit)})</span></div>`).join("")}</div><p class="note">${esc(DISCLAIMER)}</p>`)}
${page(`<p class="kick">What happens next</p><h2>Next steps</h2><ol class="next"><li>Confirm the design occupant load and resolve the flagged items</li><li>Engineer and fire engineer review (structure, means of escape)</li><li>Choose materials from physical samples</li><li>Issue the working drawings for building consent</li></ol>`, "dark")}
<script>onload = () => setTimeout(() => print(), 600)<\/script></body></html>`;
}
