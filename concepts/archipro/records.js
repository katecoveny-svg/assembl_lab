// One product as an agent-readable record: what a licensed ArchiPro feed could hand an assistant. The shape is a
// proposal. Fields follow schema.org Product where one fits; the rest sit under "spec" and "licence".
import { CATS, CLAUSES, ZONES } from "./data.js";

export const FEED = { name: "archipro-feed", version: "0.1-concept", licence: "proposed", updated: "2026-11-18" };

export function record(p) {
  const exterior = p.zones.length > 0;
  return {
    "@type": "Product",
    id: `archipro:${p.id}`,
    name: p.name,
    brand: { name: p.supplier, sample: true },
    category: CATS[p.cat].label,
    description: p.line,
    spec: {
      ...(exterior ? { exposure_zones: p.zones, exposure_note: p.zones.map((z) => ZONES[z]).join("; ") } : { use: "interior" }),
      upkeep: p.upkeep,
      upkeep_note: p.upkeepNote,
      ...(exterior ? { durability: `${p.life}, maker's statement (B2)` } : {}),
      ...(p.tb !== undefined ? { thermally_broken: p.tb } : {}),
      lead_time_weeks: p.lead,
      price_band: p.band,
      ...(p.note ? { note: p.note } : {}),
    },
    code_to_review: p.clauses.map((c) => CLAUSES[c]),
    url: `archipro.co.nz/product/${p.id} (sample path)`,
    enquire: "through ArchiPro",
    licence: { feed: `${FEED.name} ${FEED.version}`, attribution: "Show 'on ArchiPro' and link to the url", cache_days: 7, status: FEED.licence },
    updated: FEED.updated,
  };
}

// a record as highlighted text for the page (keys, strings, numbers)
export function pretty(obj) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const json = JSON.stringify(obj, null, 2).replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (_, inner) => `[${inner.replace(/\s*\n\s*/g, " ")}]`);
  return esc(json)
    .replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="s">"$1"</span>')
    .replace(/(\[|, |\n\s+)"([^"]*)"(?=[,\]\n])/g, '$1<span class="s">"$2"</span>')
    .replace(/: (\d+|true|false)/g, ': <span class="n">$1</span>');
}
