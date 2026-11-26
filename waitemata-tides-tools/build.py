"""Build static tables and the browser index from the original LINZ Auckland CSVs."""
import calendar
import csv
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo

SITE = Path(__file__).resolve().parents[1] / "waitemata-tides"
ZONE = ZoneInfo("Pacific/Auckland")
# April PDF footers identify bold times as daylight time. The 2025 time is bold,
# the 2029 time is regular. Fail on a new ambiguous time until its PDF is read.
FOLDS = {"2025-04-06T02:33": 0, "2029-04-01T02:27": 1}
events = []
for path in sorted((SITE / "data").glob("auckland-*.csv")):
    with path.open(encoding="utf-8-sig") as file:
        rows = csv.reader(file)
        assert next(rows)[:2] == ["070", "Auckland"]
        next(rows)
        assert "Daylight" in next(rows)[0]
        for day, _, month, year, *fields in rows:
            date = dt.date(int(year), int(month), int(day)).isoformat()
            for clock, height in zip(fields[::2], fields[1::2]):
                if not clock:
                    assert not height
                    continue
                wall = f"{date}T{clock}"
                local = dt.datetime.fromisoformat(wall).replace(tzinfo=ZONE)
                if local.utcoffset() != local.replace(fold=1).utcoffset():
                    local = local.replace(fold=FOLDS[wall])
                assert dt.datetime.fromtimestamp(local.timestamp(), ZONE) == local
                events.append([date, clock, height, int(local.timestamp()), local.tzname()])
days = {}
for i, (date, clock, height, epoch, zone) in enumerate(events):
    neighbors = [float(events[j][2]) for j in (i-1, i+1) if 0 <= j < len(events)]
    if float(height) > max(neighbors):
        kind = "High"
    else:
        assert float(height) < min(neighbors)
        kind = "Low"
    if i:
        assert epoch > events[i-1][3]
    days.setdefault(date, []).append([clock, height, epoch, zone, kind])
assert len(events) == 7057 and len(days) == 1826
(SITE / "data" / "events.json").write_text(json.dumps(days, separators=(",", ":")))
archive = SITE / "tables"
archive.mkdir(exist_ok=True)
origin = "https://www.linz.govt.nz/products-services/tides-and-tidal-streams/tide-predictions/tide-predictions-list-view"
for year in range(2025,2030):
    for month in range(1,13):
        prefix = f"{year}-{month:02d}"
        title = f"{calendar.month_name[month]} {year}"
        sections = []
        for date, records in days.items():
            if not date.startswith(prefix):
                continue
            label = dt.date.fromisoformat(date).strftime("%A %d %B")
            rows = "".join(f"<tr><td>{clock} {zone}</td><td>{kind}</td><td>{height} m</td></tr>" for clock,height,_,zone,kind in records)
            sections.append(f'<table id="d{date[-2:]}"><caption>{label}</caption><thead><tr><th>NZ local time</th><th>Tide</th><th>Height</th></tr></thead><tbody>{rows}</tbody></table>')
        (archive / f"{prefix}.html").write_text(f'''<!doctype html><html lang="en-NZ"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} · Auckland tide tables</title><link rel="stylesheet" href="../style.css"><main class="archive"><a href="./">All months</a><h1>{title}</h1><p>Auckland station 070 · Predicted tides in metres above Auckland chart datum. Not for navigation. Actual water levels can differ.</p>{''.join(sections)}<p>Contains Toitū Te Whenua Land Information New Zealand data licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. <a href="{origin}">Original LINZ tables</a></p></main></html>''')
index = ''.join(f'<h2>{year}</h2><p>'+ ' · '.join(f'<a href="{year}-{month:02d}.html">{calendar.month_name[month]}</a>' for month in range(1,13))+'</p>' for year in range(2025,2030))
(archive / "index.html").write_text(f'<!doctype html><html lang="en-NZ"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Auckland tide tables</title><link rel="stylesheet" href="../style.css"><main class="archive"><a href="../">Waitematā tides</a><h1>Auckland tide tables</h1><p>Published predictions by month, in Auckland local time. Metres above Auckland chart datum. Not for navigation.</p>{index}</main></html>')
