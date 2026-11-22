// signals: "early signals" for Found work. Public records that can come months or years before an architect is hired (land bought for a
// school, money announced for a hospital wing, a new school established), ranked against what the practice said to look for.
// Read-only: nothing is contacted, registered for or submitted. Every signal names its source, its date and its link, and says why in our
// own words (architecture/js/signals-rank.js). Horizons are estimates and say so.
//
// GET /api/live/?feeds=signals&keywords=&regions=&sectors=&cultural=1&sources=     (the same lens as feeds=hunt; min and max are ignored)
//   sources  beehive | gazette (default: both)
//   → feeds.signals = { id:"signals", value:<number of signals>, values:{ signals:[...], sources:[{ id, name, ok, read, found, error?, blocked?, needsKey? }],
//       dropped:[{ title, source, why }] (a few examples), droppedCount, considered, needsLens, lens, notWired:[{ id, name, url, status, reason }] }, source, licence, note }
//   signal = { id, kind:"signal", title, source (name shown), sourceId, sourceUrl, day, region, regions, places, why, horizon, horizonBasis:"estimate",
//       stage, buyer, buyerBasis:"stated"|"likely", evidence:[{ label, url }], cultural:{ on, why }, sectors, fit, reasons, matched, links:[{ id, title, why }], amountText? }
//
// Sources and terms: docs/architecture/pipeline-signals-sources.md (read 22 Nov 2026).
import { envelope, nzToday } from "./util.js";
import { SOURCE_BEEHIVE } from "./signals-beehive.js";
import { SOURCE_GAZETTE } from "./signals-gazette.js";
import { parseLens, lensIsEmpty, rankSignals } from "../../architecture/js/signals-rank.js";

export const SIGNAL_SOURCES = { beehive: SOURCE_BEEHIVE, gazette: SOURCE_GAZETTE };

/** Looked at and not read by the lab, with the reason. Shown so a person knows where else to look by hand. */
export const NOT_WIRED = [
  { id: "epb", name: "MBIE Earthquake-prone Building Register", url: "https://epbr.building.govt.nz", status: "not allowed", reason: "Its robots.txt disallows all automated reading, and no open dataset is published." },
  { id: "oio", name: "Overseas Investment Office decisions", url: "https://www.linz.govt.nz/our-work/overseas-investment-regulation/decisions", status: "not allowed", reason: "No feed or download, and the list names private individuals." },
  { id: "treaty", name: "Te Tari Whakatau: recent Treaty settlement milestones", url: "https://whakatau.govt.nz/te-tira-kurapounamu-treaty-settlements/recent-treaty-settlement-milestones", status: "link only", reason: "CC BY 4.0, but a web page with no feed. Settlement news also comes through the Beehive Treaty feed." },
  { id: "tpk", name: "Te Puni Kōkiri news", url: "https://www.tpk.govt.nz/en/mo-te-puni-kokiri/our-stories-and-media", status: "link only", reason: "No feed found. Funding announcements also come through the Beehive Māori Development feed." },
  { id: "moe", name: "Ministry of Education school property and growth plans", url: "https://www.education.govt.nz/new-zealands-network-of-schools/about/national-education-growth-plan/updates/", status: "link only", reason: "PDF plans, and the site licence is CC BY-NC (no commercial reuse)." },
  { id: "healthnz", name: "Health New Zealand infrastructure projects", url: "https://www.tewhatuora.govt.nz/our-health-system/infrastructure-and-investment", status: "link only", reason: "Web pages and PDFs, and its copyright terms do not allow changed or sold copies." },
  { id: "kaingaora", name: "Kāinga Ora", url: "https://kaingaora.govt.nz", status: "not allowed", reason: "Behind bot protection: not worked around." },
  { id: "auckland", name: "Auckland Council open data", url: "https://data-aucklandcouncil.opendata.arcgis.com/", status: "link only", reason: "No lodged resource consent or capital project dataset was found; the designations layer has no dates." },
  { id: "audo", name: "Auckland Urban Development Office (formerly Eke Panuku)", url: "https://www.audo.co.nz/news/", status: "link only", reason: "News pages with no feed or stated licence." },
  { id: "datagovt", name: "data.govt.nz catalogue", url: "https://catalogue.data.govt.nz", status: "link only", reason: "Answered our test clients with a bot-protection page; no planned-buildings dataset was found." },
  { id: "tewaihanga", name: "Te Waihanga infrastructure pipeline", url: "https://tewaihanga.govt.nz/the-pipeline", status: "unclear", reason: "Its terms name no open licence and bar copying for commercial purposes. A question for the Commission." },
  { id: "grants", name: "Lottery Grants Board and Foundation North grants", url: "https://www.foundationnorth.org.nz/funding/grants-approved", status: "link only", reason: "Web tables with no feed or licence; the Lottery pages are behind a bot check." },
];

const plain = (src, e) => (e?.needsKey ? `${src.short} is not switched on: it ${e.message}` : e?.blocked ? `${src.short} was not read: ${e.message}` : `${src.short} did not answer just now. Its signals are left out for now; try again in a few minutes.`);

/** The signals feed. params as for hunt (params.hunt holds the lens from the query); params.env may hold DIGITALNZ_API_KEY. registry is for tests. */
export async function fetchSignals(params = {}, registry = SIGNAL_SOURCES) {
  const lens = parseLens(params.hunt ?? params);
  const on = (lens.sources.length ? lens.sources : Object.keys(registry)).filter((id) => Object.hasOwn(registry, id));
  const credits = on.map((id) => registry[id].licence);
  const base = { id: "signals", label: "Early signals", unit: "signals", cadence: "hourly",
    source: { name: on.map((id) => registry[id].short).join(" and ") || "None", url: registry[on[0]]?.url ?? "" } };
  const licence = { name: credits.map((l) => l.name).join("; "), url: credits[0]?.url ?? "", attribution: credits.map((l) => l.attribution).join(" ") };
  if (lensIsEmpty(lens)) {
    return { ...envelope({ ...base, value: 0, values: { signals: [], sources: [], dropped: [], droppedCount: 0, considered: 0, needsLens: true, lens, notWired: NOT_WIRED }, asOf: nzToday().ymd, live: true,
      note: "Nothing is looked up until the practice says what to look for: add a few keywords or pick a sector." }), licence };
  }
  if (!on.length) throw new Error("No signal source is switched on.");
  const now = new Date();
  const settled = await Promise.allSettled(on.map((id) => registry[id].read(lens, params.env)));
  const sources = [], records = []; let stale = false;
  settled.forEach((s, i) => {
    const src = registry[on[i]];
    if (s.status === "fulfilled") {
      records.push(...s.value.records); stale ||= !!s.value.stale;
      sources.push({ id: src.id, name: src.name, url: src.url, ok: true, read: s.value.records.length, feedsRead: s.value.read, fetchedAt: s.value.fetchedAt,
        ...(s.value.failed?.length ? { partial: true, failed: s.value.failed.slice(0, 13) } : {}), ...(s.value.stale ? { stale: true } : {}) });
    } else {
      const e = s.reason;
      sources.push({ id: src.id, name: src.name, url: src.url, ok: false, read: 0, found: 0, error: plain(src, e), ...(e?.blocked ? { blocked: true } : {}), ...(e?.needsKey ? { needsKey: true } : {}) });
    }
  });
  const ranked = rankSignals(records, lens, now);
  for (const s of sources) if (s.ok) s.found = ranked.signals.filter((x) => x.sourceId === s.id).length;
  const working = sources.filter((s) => s.ok);
  // A source that is switched off for want of a key is not a failure of this answer; one that should have answered and did not is.
  const failedOnes = sources.filter((s) => !s.ok && !s.needsKey);
  if (!working.length && failedOnes.length) throw new Error(failedOnes.map((s) => s.error).join(" ") + " No early signals could be read.");
  const out = envelope({ ...base, value: ranked.signals.length, unit: ranked.signals.length === 1 ? "signal" : "signals",
    values: { signals: ranked.signals, sources, dropped: ranked.dropped, droppedCount: ranked.droppedCount, considered: ranked.considered, needsLens: false, lens, notWired: NOT_WIRED },
    asOf: nzToday(now).ymd, live: true,
    note: working.length
      ? `Early signals from ${working.map((s) => s.name).join(" and ")}: public records that may come before a design team is appointed. Each says why in our own words, and horizons are estimates. Read the source before acting. Nothing has been contacted.`
      : "No signal source could be read in this answer (see sources). Nothing has been contacted." });
  out.licence = licence;
  if (failedOnes.length || sources.some((s) => s.partial)) { out.truth = "Partial"; out.truthLabel = "Partial: a source did not answer"; }
  if (stale) out.stale = true;
  return out;
}
