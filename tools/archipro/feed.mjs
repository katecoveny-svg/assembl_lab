// Writes concepts/archipro/feed.json from the sample catalogue, so the file an agent reads matches the page exactly.
// node tools/archipro/feed.mjs
import { writeFileSync } from "node:fs";
import { PRODUCTS } from "../../concepts/archipro/data.js";
import { FEED, record } from "../../concepts/archipro/records.js";
const out = {
  feed: FEED,
  notice: "Independent assembl concept. Not commissioned by, affiliated with or endorsed by ArchiPro. Every supplier and product here is invented sample data; specs are illustrative, not maker data.",
  tools: [
    { name: "search_products", input: { category: "cladding | roof | joinery | decking | floor | bench", exposure_zone: "B | C | D | E (NZS 3604)", upkeep: "Low | Medium | High", thermally_broken: "boolean", max_lead_weeks: "number", text: "free text" }, returns: "records, ranked, with the reasons each was kept or excluded" },
    { name: "get_product", input: { id: "archipro:<id>" }, returns: "one record" },
    { name: "enquire", input: { id: "archipro:<id>", message: "text" }, returns: "a draft enquiry; sent only after the person confirms" },
  ],
  records: PRODUCTS.map(record),
};
writeFileSync(new URL("../../concepts/archipro/feed.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("feed.json:", out.records.length, "records");
