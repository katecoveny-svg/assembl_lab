// Records what LINZ's bucket really answers, so the tests in this folder run with no network.
//   node tests/ground/capture-fixtures.mjs            (uses the real internet; not part of the tests)
// Each "cassette" is every request the ground reader (plan-studio/twins/src/twin/linz/ground.js) made for one public point (URL, byte range, status, bytes as base64),
// with the feed's own answer beside it. The points are public: the shore at Castlepoint, and open water in the Hauraki Gulf for "no cover".
// Expected heights for the headland come from GDAL, an independent reader: see expected-from-gdal.py and fixtures/README.md.
import fs from "node:fs";
import { fetchGround, fetchSurface, unpackHeights, clearKept as clearMemo } from "../../plan-studio/twins/src/twin/linz/ground.js";

const dir = new URL("./fixtures/", import.meta.url);
const b64 = (u8) => Buffer.from(u8).toString("base64");
function recorder() {
  const calls = [];
  const f = async (url, init = {}) => {
    const r = await fetch(url, init), body = new Uint8Array(await r.arrayBuffer());
    calls.push({ url: String(url), range: init.headers?.range ?? null, status: r.status, bytes: body.length, body: b64(body) });
    return new Response(body, { status: r.status });
  };
  return { calls, fetch: f };
}
const POINTS = [
  { name: "castlepoint", what: "the shore at Castlepoint, Wairarapa coast: public coastal land beside the scenic reserve", lat: -40.9, lon: 176.231, radius: 20, feeds: ["ground"] },
  { name: "open-water", what: "the Hauraki Gulf, open water: LINZ has a map sheet but no height", lat: -36.6, lon: 175.0, radius: 20, feeds: ["ground"] },
];
const dry = process.argv.includes("--dry");
for (const p of POINTS) for (const kind of p.feeds) {
  clearMemo();
  const rec = recorder(), answer = await (kind === "ground" ? fetchGround : fetchSurface)({ lat: p.lat, lon: p.lon, radius: p.radius, fetch: rec.fetch });
  const total = rec.calls.reduce((a, c) => a + c.bytes, 0);
  console.log(p.name, kind, answer.status, answer.truthLabel, "| requests", rec.calls.length, "bytes", total, "| largest", Math.max(...rec.calls.map((c) => c.bytes)));
  if (dry) continue;
  if (answer.values?.work) answer.values.work = { ...answer.values.work, decodeMs: 0, totalMs: 0 }; // timings are not part of the record
  fs.writeFileSync(new URL(`${p.name}.${kind}.cassette.json`, dir), JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), what: p.what, point: { lat: p.lat, lon: p.lon, radius: p.radius }, kind, calls: rec.calls, answer }));
  if (answer.status === "live") { const g = unpackHeights(answer.values.heights); fs.writeFileSync(new URL(`${p.name}.${kind}.grid.json`, dir), JSON.stringify({ n: g.n, originE: g.originE, originN: g.originN, sheet: answer.values.nationalModel.sheet, file: answer.values.nationalModel.file })); }
}
