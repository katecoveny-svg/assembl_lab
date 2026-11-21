// Live smoke check (NOT part of the offline suite): calls functions/api/live.js in Node with the real network and prints,
// per feed, whether it answered and how long it took.   Run:  node tests/live/smoke.mjs [feed,feed,...]
// A host the shell's proxy refuses shows as an error here: that is "connected-unverified", not a bug in the feed.
// Prints no addresses, owners, titles or legal descriptions: for the site feed only each fact's status and a short value.
import { onRequest } from "../../functions/api/live.js";
import { FEEDS } from "../../api/_feeds/index.js";

const want = process.argv[2] ? process.argv[2].split(",") : Object.keys(FEEDS);
const POINT = "lat=-36.80&lon=175.08"; // a rural-residential point on Waiheke Island: coordinates only
const t0 = Date.now();
async function one(id) {
  const start = Date.now();
  const res = await onRequest({ request: new Request(`https://lab.assembl.co.nz/api/live/?feeds=${id}&place=auckland&${POINT}`), env: {} });
  const j = await res.json(); const ms = Date.now() - start;
  const f = j.feeds?.[id];
  return { id, http: res.status, ms, f, cache: res.headers.get("cache-control") };
}
const rows = await Promise.all(want.map(one));
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const f = r.f || {};
  const state = f.error ? `ERROR  ${f.error.slice(0, 110)}` : `answered  truth=${f.truth}  status=${f.status}  value=${JSON.stringify(f.value)?.slice(0, 40)}`;
  console.log(`${r.id.padEnd(12)} ${String(r.ms).padStart(5)} ms  http ${r.http}  ${state}`);
  if (r.id === "site" && f.facts) for (const [k, v] of Object.entries(f.facts)) console.log(`   site.${k.padEnd(18)} ${v.status.padEnd(12)} ${v.status === "live" ? "truth=" + v.truth + "  asOf=" + v.asOf + "  value=" + (k === "parcel" ? "(area only) " + v.value : JSON.stringify(v.value)?.slice(0, 50)) : (v.reason || "").slice(0, 100)}`);
}
console.log(`\nall feeds in parallel: ${Date.now() - t0} ms`);
