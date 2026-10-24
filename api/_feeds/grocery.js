// grocery: headline figures from the Commerce Commission's Annual Grocery Report. The report is an annual PDF with no
// data feed, so this is a snapshot: ./snapshots/grocery.json holds each figure with its source URL and the date it was
// copied, and the envelope is labelled "Latest published · annual". Nothing is fetched. Update the JSON after the next
// report (expected mid-2027) and the chip follows.
import { createRequire } from "node:module";
import { envelope } from "./util.js";
const SNAP = createRequire(import.meta.url)("./snapshots/grocery.json");

export function buildGrocery(snap = SNAP) {
  const f = snap.figures;
  const e = envelope({
    id: "grocery", label: "NZ grocery market structure (Commerce Commission Annual Grocery Report)",
    value: f.regulatedShareNationalPct.value, unit: "% of grocery retail held by the three regulated retailers",
    asOf: snap.report.published, period: `${snap.report.title.replace(/ \(.*\)$/, "")}, published ${snap.report.published}`,
    values: {
      regulatedSharePct: f.regulatedShareNationalPct.value, regulatedShareAucklandPct: f.regulatedShareAucklandPct.value,
      bannerSharePct: f.bannerSharePct.value, stores: f.stores.value, onlineSharePct: f.onlineSharePct.value, onlineSharePrevPct: f.onlineSharePct.previous,
      onlineShareWoolworthsPct: f.onlineShareWoolworthsPct.value, rebatesBillion: f.rebatesBillion.value,
      marketSizeBillion: f.marketSizeBillion.value, marketSizePeriod: f.marketSizeBillion.unit, marketSizeSource: f.marketSizeBillion.source,
      excessProfitMillionPerYear: f.excessProfitMillionPerYear.value, excessProfitSource: f.excessProfitMillionPerYear.source,
      dataPeriod: snap.report.dataPeriod, published: snap.report.published, retrieved: snap.retrieved, snapshot: true,
      figures: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, { value: v.value, unit: v.unit, label: v.label, truth: v.truth, source: v.source || { name: snap.report.publisher + ", " + snap.report.title, url: snap.report.url }, note: v.note || null }])),
    },
    cadence: "annual", live: false,
    source: { name: `${snap.report.publisher}, ${snap.report.title}, ${snap.report.published.slice(0, 4)}`, url: snap.report.url },
    note: `Annual report; figures copied on ${snap.retrieved}, not fetched. Market size is MBIE's older figure and the excess-profit estimate is from the 2022 market study; both are marked separately.`,
  });
  e.truthLabel = `Latest published · annual · ${snap.report.title.match(/^\d{4}/)[0]} report, ${snap.report.published.slice(0, 4)}`;
  return e;
}
export async function fetchGrocery() { return buildGrocery(); }
