// Exchange rates (Frankfurter, key-less, ECB and other central-bank reference rates) and Global Dairy Trade results.
import { getJSON, envelope, memo, round } from "./util.js";

export function parseFx(j) {
  if (!j || !j.rates || !j.rates.USD) throw new Error("fx: no rates");
  return envelope({
    id: "fx", label: "NZ dollar exchange rates", value: round(j.rates.USD, 4), unit: "USD per NZD", asOf: j.date, period: j.date,
    values: { base: "NZD", date: j.date, rates: Object.fromEntries(Object.entries(j.rates).map(([k, v]) => [k, round(v, 4)])) },
    cadence: "daily", live: true, source: { name: "Frankfurter (European Central Bank reference rates)", url: "https://frankfurter.dev/" },
    note: "Reference rates set once each working day, not live trading rates.",
  });
}
export function fetchFx() {
  return memo("fx", 60 * 60e3, async () => parseFx(await getJSON("https://api.frankfurter.dev/v1/latest?base=NZD&symbols=USD,AUD,CNY,GBP,EUR,JPY")));
}

// GDT: public JSON the GDT results page itself reads; reproduction allowed with acknowledgement of Global Dairy Trade.
const GDT = "https://s3.amazonaws.com/www-production.globaldairytrade.info/results/";
const PRODUCTS = { WMP: "Whole milk powder", SMP: "Skim milk powder", Butter: "Butter", AMF: "Anhydrous milk fat", Ched: "Cheddar", Mozz: "Mozzarella", BMP: "Buttermilk powder", Lac: "Lactose" };
export function parseGdt(summary, indices, groups) {
  const s = summary?.EventSummary; if (!s) throw new Error("gdt: no event summary");
  const when = new Date(s.EventDate.replace(/ \d+:\d+:\d+$/, "") + " UTC");
  const date = isNaN(when) ? s.EventDate : when.toISOString().slice(0, 10);
  const prods = (groups?.ProductGroups?.ProductGroupResult || []).filter((g) => g.ProductSold === "true")
    .map((g) => ({ code: g.ProductGroupCode, name: PRODUCTS[g.ProductGroupCode] || g.ProductGroupName, changePct: +g.PriceIndexPercentageChange, usdPerTonne: +g.AveragePublishedPrice }));
  const trend = (indices?.PriceIndicesTwelveMonths?.Events?.EventDetails || []).map((e) => ({ event: +e.EventNumber, date: e.EventDate.replace(/ \d+:\d+:\d+$/, ""), index: +e.PriceIndex, changePct: +e.PriceIndexPercentageChange }));
  const ev = Math.round(+s.EventNumber);
  return envelope({
    id: "gdt", label: "Global Dairy Trade price index, change at the latest event", value: +s.ChangeInPriceIndex, unit: "%", asOf: date, period: `GDT event ${ev}, ${date}`,
    values: { event: ev, date, changePct: +s.ChangeInPriceIndex, avgUsdPerTonne: +s.AveragePublishedPrice, tonnesSold: +s.QuantitySold, products: prods,
      wmp: prods.find((p) => p.code === "WMP") || null, trend },
    cadence: "fortnightly", live: false, source: { name: "Global Dairy Trade", url: "https://www.globaldairytrade.info/en/product-results/" },
  });
}
export function fetchGdt() {
  return memo("gdt", 3 * 3600e3, async () => {
    const { latestEvent } = await getJSON(GDT + "latest.json");
    if (!/^[0-9a-f-]{36}$/i.test(latestEvent || "")) throw new Error("gdt: bad event id");
    const [s, i, g] = await Promise.all(["event_summary.json", "price_indices_twelve_events.json", "product_groups_summary.json"].map((f) => getJSON(`${GDT}${latestEvent}/${f}`)));
    return parseGdt(s, i, g);
  });
}
