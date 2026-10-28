// Connect your data: the path drawn as a diagram (AutoPlay first, then Motorcentral or the DMS export, through a read-only connector), and a
// working export reader. A CSV is parsed in this tab, matched to one of the twin's tables, checked, stripped of personal columns, and the
// twin's figures switch to Your data where the file supports them.
import { CFG, D, $, $$, esc, fmt, chip, sim, onFrame, ambient, isVisible, narrowMQ } from "./core.js";

export function initConnect() {
  const host = $("#flowHost");
  let paths = [], vis = false, tt = 0;
  function draw() {
    const v = narrowMQ.matches;
    const B = v ? { W: 360, H: 840, n: [
      ["ap", 0, 24, 360, 92, "AutoPlay", "Listings, leads, test drives, deals", "1", true],
      ["dms", 0, 160, 296, 92, CFG.connect.dmsName, "Stock cost, repair orders, parts", "2"],
      ["cx", 0, 300, 360, 92, "Read-only connector", "Aggregate tables, no personal details"],
      ["tw", 0, 440, 360, 92, "assembl twin", "Simulated, then Your data"],
      ["ag", 0, 590, 360, 92, "Agent-ready stock", "Published only on your instruction"],
      ["tm", 0, 732, 360, 92, "Trade Me and your website", "Fed by AutoPlay, exactly as today"]] }
      : { W: 1200, H: 380, n: [
      ["ap", 20, 30, 280, 96, "AutoPlay", "Listings, leads, test drives, deals", "1", true],
      ["dms", 20, 260, 280, 96, CFG.connect.dmsName, "Stock cost, repair orders, parts", "2"],
      ["cx", 372, 142, 262, 96, "Read-only connector", "No personal details"],
      ["tw", 690, 142, 220, 96, "assembl twin", "Simulated, then yours"],
      ["ag", 960, 260, 220, 96, "Agent-ready stock", "On your instruction"],
      ["tm", 960, 30, 220, 96, "Trade Me, your website", "Fed by AutoPlay, as now"]] };
    const N = Object.fromEntries(B.n.map((n) => [n[0], n])), R = (k) => [N[k][1] + N[k][3], N[k][2] + N[k][4] / 2], Lf = (k) => [N[k][1], N[k][2] + N[k][4] / 2], Bt = (k) => [N[k][1] + N[k][3] / 2, N[k][2] + N[k][4]], Tp = (k) => [N[k][1] + N[k][3] / 2, N[k][2]];
    const curve = (a, b, vert) => vert ? `M${a[0]},${a[1]} C${a[0]},${(a[1] + b[1]) / 2} ${b[0]},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}` : `M${a[0]},${a[1]} C${(a[0] + b[0]) / 2},${a[1]} ${(a[0] + b[0]) / 2},${b[1]} ${b[0]},${b[1]}`;
    const solid = v ? [`M336,${N.ap[2] + N.ap[4]} L336,${N.cx[2]}`, curve(Bt("dms"), Tp("cx"), true), curve(Bt("cx"), Tp("tw"), true), curve(Bt("tw"), Tp("ag"), true)]
      : [curve(R("ap"), [Lf("cx")[0], Lf("cx")[1] - 20]), curve(R("dms"), [Lf("cx")[0], Lf("cx")[1] + 20]), curve(R("cx"), Lf("tw")), curve(R("tw"), Lf("ag"))];
    const dashed = v ? `M8,${N.ap[2] + N.ap[4]} L8,${N.tm[2]}` : curve(R("ap"), Lf("tm"));
    host.innerHTML = `<svg class="flow" viewBox="0 0 ${B.W} ${B.H}" role="img" aria-label="AutoPlay first, then Motorcentral or the DMS export, feed a read-only connector into the assembl twin, which publishes agent-ready stock on the dealer's instruction. Trade Me and the dealer's website keep their AutoPlay feed as today.">
      ${solid.map((d) => `<path class="ln" d="${d}"/>`).join("")}<path class="ln dash" d="${dashed}"/>
      ${B.n.map(([k, x, y, w, h, t1, t2, num, lead]) => `<g><rect class="bx${lead ? " lead" : ""}" x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="${CFG.look === "mono" ? 3 : 16}"/>
        <text class="t1${lead ? " lead-t" : ""}" x="${x + 20}" y="${y + 40}">${esc(t1)}</text><text class="t2${lead ? " lead-t2" : ""}" x="${x + 20}" y="${y + 66}">${esc(t2)}</text>${num ? `<text class="n" x="${x + 2}" y="${y - 8}">${num === "1" ? "1 · start here" : "2 · then"}</text>` : ""}</g>`).join("")}
      <g data-pk>${solid.map(() => `<circle class="pkt" r="4"/><circle class="pkt" r="4" opacity=".5"/>`).join("")}</g></svg>`;
    paths = [...host.querySelectorAll("path.ln:not(.dash)")]; place();
  }
  function place() { const pk = host.querySelectorAll(".pkt"); paths.forEach((p, i) => { const L = p.getTotalLength(); [0, .5].forEach((off, j) => { const pt = p.getPointAtLength(((tt * .22 + off + i * .13) % 1) * L), c = pk[i * 2 + j]; if (c) { c.setAttribute("cx", pt.x.toFixed(1)); c.setAttribute("cy", pt.y.toFixed(1)); } }); }); }
  draw(); narrowMQ.addEventListener?.("change", draw);
  isVisible(host, (x) => vis = x);
  onFrame((dt) => { if (!vis || ambient.paused) return; tt += dt; place(); });

  // ---------------------------------------------------------------- the export reader
  const res = $("#cnRes"), drop = $("#drop"), file = $("#file");
  const NAMES = Object.fromEntries(Object.entries(D.CONTRACT).map(([k, v]) => [k, v.n]));
  function read(name, text) {
    const parsed = D.parseCSV(text); if (!parsed.headers.length) { res.innerHTML = `<p>That file has no header row. Export it with column names in the first row.</p>`; return; }
    const det = D.detectTable(parsed.headers), v = D.validate(parsed, det.map, det.t);
    if (!v.ok) { res.innerHTML = `<h3 style="font-size:20px">Not matched yet</h3><p>Closest table: ${esc(NAMES[det.t])}. Missing ${v.missing.map((m) => `<code>${esc(m)}</code>`).join(", ")}. Rename those columns in the export and try again.</p>`; return; }
    sim.setData(det.t, { ...v, file: name });
    const mapped = Object.keys(det.map).length, figs = Object.keys(sim.data);
    res.innerHTML = `<div class="row" style="justify-content:space-between"><h3 style="font-size:22px">${esc(NAMES[det.t])}</h3>${chip("data", "Your data · " + name)}</div>
      <div class="regk"><div><b>${fmt(v.read)}</b><span>rows read</span></div><div><b>${fmt(v.accepted)}</b><span>accepted</span></div><div><b>${fmt(v.rejected)}</b><span>rejected</span></div><div><b>${v.pii.length}</b><span>personal columns dropped</span></div></div>
      <div class="tbl">${Object.keys(det.map).map((k) => `<span class="ok">${esc(k)}</span>`).join("")}${v.ignored.slice(0, 6).map((k) => `<span>${esc(k)} · ignored</span>`).join("")}${v.pii.map((k) => `<span style="background:#5A1F28">${esc(k)} · dropped</span>`).join("")}</div>
      ${v.reasons.length ? `<p class="fine" style="color:var(--on-deep-3)">${v.reasons.map((r) => `${r.n} ${esc(r.ex)}`).join("; ")}</p>` : ""}
      <p style="color:var(--on-deep-2)">${v.range ? `${esc(v.range[0])} to ${esc(v.range[1])}. ` : ""}The twin now reads ${figs.map((f) => esc(NAMES[f])).join(", ").toLowerCase()} from this file; scroll up and the Whole site tile has switched. ${mapped} columns matched.</p>
      <div class="row"><button class="btn ghost sm" type="button" id="cnReset">Back to simulated</button></div>`;
    $("#cnReset").onclick = () => { sim.clearData(); res.innerHTML = `<p style="color:var(--on-deep-3)">Back to simulated. Nothing was kept.</p>`; };
  }
  $$("[data-sample]").forEach((b) => b.onclick = () => read(`sample-${b.dataset.sample}.csv (made up)`, D.sampleCSV(b.dataset.sample)));
  drop.onclick = () => file.click(); drop.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } };
  file.onchange = () => { const f = file.files[0]; if (f) f.text().then((t) => read(f.name, t)); };
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); }; drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) f.text().then((t) => read(f.name, t)); };
}
