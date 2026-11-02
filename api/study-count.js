// assembl lab · anonymous aggregate counts for the study machines (Tier 1 item 9).
//
// What it records: one line per event, {type:"study.count", day, m, k, v} where m is the machine id (data.js key),
// k is the kind (view, hint, pass, retrieval, complete) and v the year group if the student chose one on the hub
// (y9, y10, l1, l2, l3). Nothing else: no IP, no user agent, no cookie, no id of any kind. The browser sends it with
// navigator.sendBeacon, so it never blocks a page.
//
// Where it goes: the function writes the line to stdout, so it lands in the deployment's runtime logs. Vercel keeps
// those for a limited time on the Hobby plan, so the counts are read out with a log drain or `vercel logs` into a
// spreadsheet (one grep for "study.count"). This was chosen over a KV store or Blob on purpose: no new service, no
// token, no store that could ever be joined to a person, and the evidence pack needs totals per machine per day,
// not a database. If totals ever need to be live on a page, point a log drain at a sheet, or swap the console.log for
// a Blob append; the client contract stays the same.
//
// Rejects anything that is not a known machine id and kind, so the logs cannot be used to store free text.
const KINDS = new Set(["view", "hint", "pass", "retrieval", "complete"]);
const YEARS = new Set(["y9", "y10", "l1", "l2", "l3"]);
const ID = /^[a-z][a-z0-9-]{1,30}$/;

export function cleanEvent(body) {
  let b = body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { return null; } }
  if (!b || typeof b !== "object") return null;
  const m = String(b.m || ""), k = String(b.k || ""), v = String(b.v || "");
  if (!ID.test(m) || !KINDS.has(k)) return null;
  return { m, k, ...(YEARS.has(v) ? { v } : {}) };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ type: "assembl.study-count", records: "anonymous per-machine counts: view, hint, pass, retrieval, complete", personal_data: "none", storage: "runtime logs only" });
  if (req.method !== "POST") return res.status(405).end();
  const e = cleanEvent(req.body);
  if (!e) return res.status(400).end();
  console.log(JSON.stringify({ type: "study.count", day: new Date().toISOString().slice(0, 10), ...e }));
  return res.status(204).end();
}
