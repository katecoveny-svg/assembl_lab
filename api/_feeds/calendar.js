// Today's demand calendar: public holidays (Nager.Date, key-less, incl. regional anniversary days) and
// state school terms (Ministry of Education, education.govt.nz "School terms and holidays", 2026–2028, kept here as a table
// because the Ministry publishes no machine-readable feed). Schools choose their own first and last days within a window.
import { getJSON, envelope, memo, nzToday } from "./util.js";
import { placeOf } from "./places.js";

// [term, start (earliest), start (latest), end (earliest), end (latest)] — when a range is given, schools pick within it
export const TERMS = {
  2026: [[1, "2026-01-26", "2026-02-09", "2026-04-02", "2026-04-02"], [2, "2026-04-20", "2026-04-20", "2026-07-03", "2026-07-03"],
    [3, "2026-07-20", "2026-07-20", "2026-09-25", "2026-09-25"], [4, "2026-10-12", "2026-10-12", "2026-12-01", "2026-12-18"]],
  2027: [[1, "2027-01-28", "2027-02-03", "2027-04-09", "2027-04-09"], [2, "2027-04-27", "2027-04-27", "2027-07-02", "2027-07-02"],
    [3, "2027-07-19", "2027-07-19", "2027-09-24", "2027-09-24"], [4, "2027-10-11", "2027-10-11", "2027-12-01", "2027-12-17"]],
  2028: [[1, "2028-01-31", "2028-02-08", "2028-04-13", "2028-04-13"], [2, "2028-05-01", "2028-05-01", "2028-07-07", "2028-07-07"],
    [3, "2028-07-24", "2028-07-24", "2028-09-29", "2028-09-29"], [4, "2028-10-16", "2028-10-16", "2028-12-01", "2028-12-15"]],
};
// Note: the Ministry sets only a latest finish for Term 4; "2026-12-01" is our marker for "some schools may have finished".

export function schoolStatus(ymd) {
  const y = +ymd.slice(0, 4); const all = [...(TERMS[y - 1] || []), ...(TERMS[y] || []), ...(TERMS[y + 1] || [])];
  if (!TERMS[y]) return { known: false };
  for (const [term, s0, s1, e0, e1] of TERMS[y]) {
    if (ymd >= s1 && ymd <= e0) return { known: true, inTerm: true, term, label: `Term ${term}`, endsBy: e1 };
    if (ymd >= s0 && ymd < s1) return { known: true, inTerm: "some", term, label: `Term ${term} starting (schools choose a day by ${s1})` };
    if (ymd > e0 && ymd <= e1) return { known: true, inTerm: "some", term, label: `End of Term ${term} (schools finish by ${e1})` };
  }
  const next = all.find(([, s0]) => s0 > ymd);
  const prev = [...all].reverse().find(([, , , , e1]) => e1 < ymd);
  const summer = prev && prev[0] === 4;
  return { known: true, inTerm: false, label: summer ? "Summer school holidays" : `School holidays after Term ${prev ? prev[0] : "?"}`, backOn: next ? next[1] : null };
}

export function buildCalendar(holidays, place, now = new Date()) {
  const t = nzToday(now); const p = placeOf(place);
  const applies = (h) => h.global || (h.counties || []).includes(p.region);
  const mine = holidays.filter(applies).sort((a, b) => a.date.localeCompare(b.date));
  const today = mine.find((h) => h.date === t.ymd);
  const next = mine.find((h) => h.date > t.ymd);
  const days = (d) => Math.round((Date.parse(d) - Date.parse(t.ymd)) / 864e5);
  const school = schoolStatus(t.ymd);
  const weekend = t.weekday === "Sat" || t.weekday === "Sun";
  return envelope({
    id: "calendar", label: `Holidays today, ${p.name}`, value: today ? today.localName : null, unit: "", asOf: t.ymd, period: "today",
    values: { date: t.ymd, weekday: t.weekday, weekend, publicHoliday: today ? { name: today.localName, regional: !today.global } : null,
      nextPublicHoliday: next ? { date: next.date, name: next.localName, regional: !next.global, daysAway: days(next.date) } : null, school, region: p.region },
    cadence: "daily", live: true,
    source: { name: "Nager.Date public holidays; Ministry of Education term dates", url: "https://www.education.govt.nz/school-terms-and-holidays-dates" },
    note: "Regional anniversary days are matched to the place's region; school dates are state and state-integrated schools.",
  });
}
export function fetchCalendar({ place }) {
  const t = nzToday();
  return memo("calendar:" + place + t.ymd, 3600e3, async () => {
    const years = t.month === 12 ? [t.year, t.year + 1] : [t.year];
    const lists = await Promise.all(years.map((y) => memo("nager:" + y, 24 * 3600e3, () => getJSON(`https://date.nager.at/api/v3/PublicHolidays/${y}/NZ`))));
    return buildCalendar(lists.flat(), place);
  });
}
