// signals-beehive: ministerial releases from beehive.govt.nz, one RSS feed per portfolio, for the early signals feed (signals.js).
// Read on 22 Nov 2026: https://www.beehive.govt.nz/feeds lists a feed per portfolio at /taxonomy/term/<id>/feed (RSS 2.0, about 30 items each,
// title, link, a plain-text summary, pubDate). robots.txt allows these paths. Only releases (/release/...) are used, never speeches.
//
// Terms: https://www.beehive.govt.nz/copyright. Crown copyright: "You can reproduce (including through translation) this content free of charge
// without further permission", reproduced accurately and with the source acknowledged; logos and photographs are excluded. That is a reuse
// permission, not a named Creative Commons licence (flagged for Kate in docs/architecture/pipeline-signals-sources.md). The lab keeps only
// the title, date and link of a release and writes its own reason; the summary is read to classify the release and is never shown.
//
// Bot protection: from the sandbox the site answered with an Incapsula challenge page. That is never worked around: an answer that is a
// challenge page is reported as "blocked by the publisher's bot protection" and the source is left out of that answer.
import { getText, memo } from "./util.js";
import { parseBeehiveRss } from "../../architecture/js/signals-rank.js";

export const BEEHIVE = "https://www.beehive.govt.nz";
export const L_BEEHIVE = { name: "Crown copyright, reproduction permitted with acknowledgement (beehive.govt.nz copyright page)", url: "https://www.beehive.govt.nz/copyright",
  attribution: "Ministerial releases from beehive.govt.nz, the official website of the New Zealand Government. Crown copyright, reproduced with acknowledgement." };

/** The portfolio feeds read, with the lens sectors each one serves. Term numbers from https://www.beehive.govt.nz/feeds (22 Nov 2026). */
export const BEEHIVE_FEEDS = [
  { id: "education", term: 6729, label: "Education", sectors: ["education"] },
  { id: "tertiary", term: 6838, label: "Tertiary Education", sectors: ["education"] },
  { id: "health", term: 6724, label: "Health", sectors: ["health"] },
  { id: "housing", term: 6720, label: "Housing", sectors: ["housing"] },
  { id: "building", term: 6770, label: "Building and Construction", sectors: ["housing", "commercial", "heritage", "civic"] },
  { id: "arts", term: 6731, label: "Arts, Culture and Heritage", sectors: ["heritage", "civic"] },
  { id: "maori", term: 6756, label: "Māori Development", sectors: ["kaupapa", "housing"] },
  { id: "treaty", term: 6734, label: "Treaty of Waitangi Negotiations", sectors: ["kaupapa"] },
  { id: "pacific", term: 6725, label: "Pacific Peoples", sectors: ["kaupapa", "civic"] },
  { id: "regional", term: 6788, label: "Regional Development", sectors: ["civic", "kaupapa", "sport", "health", "housing"] },
  { id: "sport", term: 6723, label: "Sport and Recreation", sectors: ["sport"] },
  { id: "courts", term: 6780, label: "Courts", sectors: ["justice"] },
  { id: "police", term: 6749, label: "Police", sectors: ["justice"] },
];
/** per-call timeout (8 s, the lab's rule for every source); tests shorten it */
export const SIGNAL_LIMITS = { ms: 8000 };
export const feedUrl = (f) => `${BEEHIVE}/taxonomy/term/${f.term}/feed`;

/** an answer that is a bot-check page rather than the feed */
export const isChallenge = (text) => /_Incapsula_Resource|Incapsula incident|Pardon Our Interruption|cf-chl|Just a moment\.\.\./i.test(String(text).slice(0, 4000));
export class BlockedError extends Error { constructor(host) { super(`${host} answered with a bot-protection page; not worked around`); this.blocked = true; } }

/** The feeds a lens needs: those serving one of its sectors, or all of them for keywords or the cultural switch. */
export function feedsFor(lens = {}) {
  const want = new Set(lens.sectors ?? []);
  if (lens.cultural) want.add("kaupapa");
  if (!want.size || (lens.keywords ?? []).length) return BEEHIVE_FEEDS;
  return BEEHIVE_FEEDS.filter((f) => f.sectors.some((s) => want.has(s)));
}

/** Read one portfolio feed: at most once an hour per warm instance, 8 s timeout, the last good copy if the site does not answer. */
export async function readBeehiveFeed(f) {
  return memo(`signals:beehive:${f.term}`, 60 * 60e3, async () => {
    const xml = await getText(feedUrl(f), { ms: SIGNAL_LIMITS.ms, headers: { accept: "application/rss+xml, application/xml, text/xml" } });
    if (isChallenge(xml)) throw new BlockedError("www.beehive.govt.nz");
    if (!/<rss\b/i.test(xml)) throw new Error("the Beehive feed did not answer with RSS");
    return { records: parseBeehiveRss(xml, f), fetchedAt: new Date().toISOString() };
  });
}

/**
 * The Beehive source for signals.js: reads the feeds the lens needs in parallel. Partial when some feeds fail; an error when all do.
 * Returns { records, fetchedAt, read, failed:[{ feed, error }], blocked, stale }.
 */
export async function readBeehive(lens = {}, feeds = feedsFor(lens)) {
  const settled = await Promise.allSettled(feeds.map((f) => readBeehiveFeed(f)));
  const records = [], failed = []; let blocked = false, stale = false, fetchedAt = null;
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") { records.push(...s.value.records); stale ||= !!s.value.stale; fetchedAt = fetchedAt && fetchedAt > s.value.fetchedAt ? fetchedAt : s.value.fetchedAt; }
    else { blocked ||= !!s.reason?.blocked; failed.push({ feed: feeds[i].label, error: String(s.reason?.message || s.reason).slice(0, 160) }); }
  });
  if (!records.length && failed.length === feeds.length) {
    const e = new Error(blocked ? "beehive.govt.nz answered with a bot-protection page, so it was not read (not worked around)." : "beehive.govt.nz did not answer just now.");
    e.blocked = blocked; throw e;
  }
  return { records, fetchedAt: fetchedAt ?? new Date().toISOString(), read: feeds.length - failed.length, failed, blocked, stale };
}

export const SOURCE_BEEHIVE = { id: "beehive", name: "Beehive: Government releases by portfolio", short: "Beehive", url: `${BEEHIVE}/feeds`, licence: L_BEEHIVE, cadence: "hourly", read: (lens) => readBeehive(lens) };
