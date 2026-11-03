#!/usr/bin/env python3
"""Build study/m/world-data.json for "The guess the world machine" (study/m/world.html).

Reproducible: every source file is fetched from a pinned Git commit, so running this again gives the same JSON.

    python3 tools/world/build_world_data.py --cache /some/scratch/folder        # download (if missing) + build
    python3 tools/world/build_world_data.py --cache /some/scratch/folder --offline   # build from the cache only

Sources (both CC BY 4.0, credited in the machine and in the JSON's meta):
  * Gapminder Fast Track (open-numbers/ddf--gapminder--fasttrack): life expectancy, GDP per person (PPP),
    population, child mortality, babies per woman, country names and world regions, plus Gapminder's own world totals.
    (These five core series used to live in ddf--gapminder--systema_globalis; Gapminder now publishes them in Fast Track.)
  * Our World in Data CO2 dataset (owid/co2-data): CO2 emissions per person (territorial, fossil fuels and industry).

Only the Python standard library is used. Downloaded files are treated as data: they are parsed as CSV/JSON, never run.
"""
import argparse, csv, json, math, os, sys, urllib.request
from datetime import date

FASTTRACK = ("open-numbers/ddf--gapminder--fasttrack", "b840e5bed1e9f68695af9cb5b037fe2dce576de0")
OWID_CO2 = ("owid/co2-data", "382ee6c662b0ece26e111f263b44c029afad7787")
RAW = "https://raw.githubusercontent.com/{repo}/{ref}/{path}"

GM_FILES = {
    "concepts": "ddf--concepts.csv",
    "geo": "ddf--entities--geo--country.csv",
    "regions": "ddf--entities--geo--world_6region.csv",
}
# indicator id in the JSON -> (Gapminder concept, short label, unit, how to round)
INDICATORS = {
    "lex": ("lex", "Life expectancy", "years", "dp1"),
    "gdp": ("gdp_pcap", "Income per person", "$ per person per year (GDP per capita, PPP, constant 2021 international $)", "sig3"),
    "pop": ("pop", "Population", "thousands of people", "sig3k"),
    "cmu5": ("child_mortality_0_5_year_olds_dying_per_1000_born", "Child mortality", "deaths before age 5 per 1,000 born", "sig3"),
    "tfr": ("children_per_woman_total_fertility", "Babies per woman", "babies per woman (total fertility rate)", "dp2"),
}
for k, (c, *_r) in INDICATORS.items():
    GM_FILES[k] = f"countries_etc_datapoints/ddf--datapoints--{c}--by--country--time.csv"
    GM_FILES[k + "_world"] = f"global_regions_datapoints/ddf--datapoints--{c}--by--global--time.csv"
OWID_FILES = {"co2": "owid-co2-data.csv"}

YEARS = list(range(1800, 2026, 5))  # 1800, 1805 ... 2025


def fetch(cache, repo, ref, path, offline):
    dest = os.path.join(cache, repo.replace("/", "__"), path)
    if not os.path.exists(dest):
        if offline:
            sys.exit(f"missing {dest} (run without --offline to download)")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        url = RAW.format(repo=repo, ref=ref, path=path)
        print("download", url, file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as r, open(dest + ".part", "wb") as f:
            f.write(r.read())
        os.replace(dest + ".part", dest)
    return dest


def rows(p):
    with open(p, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def sig(x, n=3):
    if x == 0:
        return 0
    d = n - 1 - int(math.floor(math.log10(abs(x))))
    v = round(x, d)
    return int(v) if d <= 0 else v


def rnd(x, how):
    if x is None:
        return None
    if how == "dp1":
        return round(x, 1)
    if how == "dp2":
        return round(x, 2)
    if how == "sig3k":
        return sig(x / 1000.0)
    return sig(x)


def series(path, key_col, val_col):
    out = {}
    for r in rows(path):
        v = r.get(val_col, "")
        if v in ("", None):
            continue
        out.setdefault(r[key_col], {})[int(r["time"])] = float(v)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True, help="folder for downloaded source files (outside the repo)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "study", "m", "world-data.json"))
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--retrieved", default=date.today().isoformat(), help="retrieval date to record in meta")
    a = ap.parse_args()

    gm = {k: fetch(a.cache, *FASTTRACK, p, a.offline) for k, p in GM_FILES.items()}
    ow = {k: fetch(a.cache, *OWID_CO2, p, a.offline) for k, p in OWID_FILES.items()}

    concepts = {r["concept"]: r for r in rows(gm["concepts"])}
    geo = {r["country"]: r for r in rows(gm["geo"])}
    regions = {r["world_6region"]: r["name"] for r in rows(gm["regions"])}

    data, world = {}, {}
    for k, (c, *_r) in INDICATORS.items():
        data[k] = series(gm[k], "country", c)
        world[k] = series(gm[k + "_world"], "global", c)["world"]

    # CO2 per person from Our World in Data, matched on ISO 3166 alpha-3 codes
    iso = {g["iso3166_1_alpha3"].lower(): gid for gid, g in geo.items() if g.get("iso3166_1_alpha3")}
    co2, co2w = {}, {}
    for r in rows(ow["co2"]):
        v = r.get("co2_per_capita", "")
        if v == "":
            continue
        y = int(r["year"])
        if r["country"] == "World":
            co2w[y] = float(v)
        elif r["iso_code"] and r["iso_code"].lower() in iso:
            co2.setdefault(iso[r["iso_code"].lower()], {})[y] = float(v)
    data["co2"], world["co2"] = co2, co2w

    # countries: every Gapminder country with population, life expectancy and income
    ids = sorted(set(data["pop"]) & set(data["lex"]) & set(data["gdp"]))
    how = {k: v[3] for k, v in INDICATORS.items()}
    how["co2"] = "sig3"
    order = ["lex", "gdp", "pop", "cmu5", "tfr", "co2"]
    countries = []
    for gid in ids:
        g = geo[gid]
        countries.append({
            "id": gid, "name": g["name"], "region": g["world_6region"],
            "d": {k: [rnd(data[k].get(gid, {}).get(y), how[k]) for y in YEARS] for k in order},
        })
    wout = {k: [rnd(world[k].get(y), how[k]) for y in YEARS] for k in order}
    # CO2 data stop a year or two before the last grid year, so keep the latest real year as well (used for "today")
    ly = max(y for y in co2w if y <= YEARS[-1])
    latest = {"co2": {"year": ly, "world": rnd(co2w[ly], "sig3"),
                      "values": {gid: rnd(co2[gid][ly], "sig3") for gid in ids if ly in co2.get(gid, {})}}}

    def src(k):
        c = concepts[INDICATORS[k][0]]
        return {"gapminder_name": c["name"], "gapminder_concept": INDICATORS[k][0], "version": c.get("version", ""),
                "updated": c.get("updated", ""), "documentation": c.get("source_url", ""),
                "file": GM_FILES[k], "world_file": GM_FILES[k + "_world"]}

    ind = {k: {"name": v[1], "unit": v[2], "source": "Gapminder", **src(k)} for k, v in INDICATORS.items()}
    ind["co2"] = {"name": "CO₂ per person", "unit": "tonnes of CO₂ per person per year (territorial, fossil fuels and industry)",
                  "source": "Our World in Data", "owid_column": "co2_per_capita", "file": OWID_FILES["co2"],
                  "world_entity": "World", "note": "Global Carbon Project data processed by Our World in Data; matched to Gapminder countries by ISO alpha-3 code."}
    for k in ind:
        ind[k]["round"] = how[k]

    out = {
        "meta": {
            "title": "Guess the world machine data",
            "built_by": "tools/world/build_world_data.py",
            "retrieved": a.retrieved,
            "years": YEARS,
            "order": order,
            "missing": "null means no estimate for that country and year",
            "population_unit": "thousands of people (multiply by 1,000)",
            "world_series": "Gapminder's own world totals and averages (global files); CO₂ world value is Our World in Data's 'World' row",
            "regions": regions,
            "sources": [
                {"name": "Gapminder Fast Track", "credit": "Free data from Gapminder (CC BY 4.0)", "licence": "CC BY 4.0",
                 "licence_url": "https://creativecommons.org/licenses/by/4.0/", "url": "https://www.gapminder.org/data/",
                 "repo": "https://github.com/" + FASTTRACK[0], "commit": FASTTRACK[1],
                 "raw_base": RAW.format(repo=FASTTRACK[0], ref=FASTTRACK[1], path=""),
                 "files": [GM_FILES[k] for k in GM_FILES]},
                {"name": "Our World in Data CO₂ and greenhouse gas emissions", "credit": "Our World in Data (CC BY 4.0)", "licence": "CC BY 4.0",
                 "licence_url": "https://creativecommons.org/licenses/by/4.0/", "url": "https://ourworldindata.org/co2-and-greenhouse-gas-emissions",
                 "repo": "https://github.com/" + OWID_CO2[0], "commit": OWID_CO2[1],
                 "raw_base": RAW.format(repo=OWID_CO2[0], ref=OWID_CO2[1], path=""),
                 "files": list(OWID_FILES.values())},
            ],
            "honesty": "All values are estimates. Figures before about 1950 are reconstructed by historians and statisticians from scattered records and are much less certain. Recent years can include Gapminder's short-term projections. Countries are shown with today's borders, which were different in the past.",
        },
        "indicators": ind,
        "countries": countries,
        "world": wout,
        "latest": latest,
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {a.out}: {len(countries)} countries, {len(YEARS)} years, {os.path.getsize(a.out)/1024:.0f} KB", file=sys.stderr)


if __name__ == "__main__":
    main()
