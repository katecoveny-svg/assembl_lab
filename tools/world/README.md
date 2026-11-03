# World data for "The guess the world machine"

`build_world_data.py` builds `study/m/world-data.json` (about 290 KB), the only data file the machine
(`study/m/world.html`, `study/m/world.js`) reads. Every number on screen is read or calculated from it.

## Rebuild

```sh
# downloads into the cache folder (keep it outside the repo), then writes study/m/world-data.json
python3 -I tools/world/build_world_data.py --cache /path/to/scratch/world-cache --retrieved 2026-11-03
# rebuild from an existing cache without the network
python3 -I tools/world/build_world_data.py --cache /path/to/scratch/world-cache --offline --retrieved 2026-11-03
```

Standard library only. Source files are fetched from pinned Git commits, so the output is reproducible. Behind a
TLS-inspecting proxy, set `SSL_CERT_FILE` to the proxy's CA bundle. Then run `node --test study/tests/world.test.mjs`.

## Sources (retrieved 2026-11-03)

| Data | Source | Licence | Pinned commit |
|---|---|---|---|
| Life expectancy, income per person (GDP per capita, PPP, constant 2021 int. $), population, child mortality, babies per woman, country names and regions, and Gapminder's world totals | Gapminder Fast Track, <https://github.com/open-numbers/ddf--gapminder--fasttrack> | CC BY 4.0 ("Free data from Gapminder") | `b840e5bed1e9f68695af9cb5b037fe2dce576de0` |
| CO₂ per person (territorial, fossil fuels and industry; column `co2_per_capita`) | Our World in Data, <https://github.com/owid/co2-data> | CC BY 4.0 ("Our World in Data") | `382ee6c662b0ece26e111f263b44c029afad7787` |

Exact files (raw base `https://raw.githubusercontent.com/<repo>/<commit>/`):

- Fast Track: `ddf--concepts.csv`, `ddf--entities--geo--country.csv`, `ddf--entities--geo--world_6region.csv`,
  `countries_etc_datapoints/ddf--datapoints--{lex,gdp_pcap,pop,child_mortality_0_5_year_olds_dying_per_1000_born,children_per_woman_total_fertility}--by--country--time.csv`
  and the matching `global_regions_datapoints/ddf--datapoints--<concept>--by--global--time.csv` world files.
- Our World in Data: `owid-co2-data.csv`.

Why Fast Track and not Systema Globalis: the brief pointed at `open-numbers/ddf--gapminder--systema_globalis`, but at
commit `ee190605fdec9d1c35c38e18e869a400a5818fe6` that repo no longer holds the five core series (life expectancy,
income, population, child mortality, babies per woman). Gapminder now publishes them in Fast Track, the same
Gapminder/open-numbers data under the same CC BY 4.0 licence. The JSON's `meta.sources` and each indicator record
the concept, version, update date and file.

## What is in the JSON

- `meta`: years (1800 to 2025, every 5 years), regions (Gapminder's six world regions), sources, licences,
  commits, files, retrieval date and an honesty note.
- `indicators`: name, unit, source, Gapminder concept and version, rounding.
- `countries`: 195 countries with population, life expectancy and income; each has `d.<indicator>` arrays on the
  year grid (`null` = no estimate). Population is in thousands. Rounding: life expectancy 1 dp, babies per woman 2 dp,
  everything else 3 significant figures.
- `world`: Gapminder's own world series (not averages computed here); CO₂ is Our World in Data's `World` row.
- `latest.co2`: CO₂ stops a year or two before 2025, so the latest real year (2024) is kept for "today".

## Limits (also shown in the machine)

All values are estimates. Figures before about 1950 are reconstructed and much less certain; recent years can
include Gapminder's short-term projections. Countries are shown with today's borders. Income is an average that
hides inequality inside a country. CO₂ counts fossil fuels and industry only (not land use, not methane).
