#!/usr/bin/env python3
"""Give every study machine structured year/level/standard fields, derived from its tags and the NZQA `levels` table.

Run after editing study/data.js by hand (or after a merge): it is idempotent and keeps everything else as is.
  python3 scripts/enrich-study-data.py

Adds to each machine in window.STUDY.machines:
  years:     [9, 10]              every school year the machine is for (NCEA L1 = Year 11, L2 = 12, L3 = 13)
  level:     'junior'|'L1'|'L2'|'L3'   the lowest NCEA level it maps to, or 'junior' for Years 7–10 only
  standards: [{code, subject, title, full, exam}]  the external standards it covers; exam is the sitting time from `levels`
`tags` are kept for search. The `levels` table stays the one source of truth for dates: a standard row's `machine`
field and a machine's "NCEA Lx Subject 9xxxx" tag are both read, so a mapping made in either place shows up.
"""
import json, re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
P = ROOT / "study" / "data.js"
PREFIX = "window.STUDY="

# a plain title a 13-year-old can read, from the standard's full NZQA title
def short_title(t):
    s = t
    s = re.sub(r"^(Demonstrate|Apply|Analyse|Interpret and apply|Evaluate|Investigate|Describe|Explain|Discuss|Respond critically to|Develop)\s+(understanding of|knowledge of)?\s*", "", s, flags=re.I)
    s = re.sub(r"\s+in solving problems$", "", s)
    s = re.sub(r"\s+(through close reading, )?supported by evidence$", "", s)
    s = re.sub(r"\s+in (a|the) New Zealand context$", "", s)
    s = re.sub(r"^(significant|specific|a range of|the|a)\s+", "", s, flags=re.I)
    s = s.strip().rstrip(".,;: ")
    s = s[:1].upper() + s[1:]
    if len(s) > 72:
        s = s[:72].rsplit(" ", 1)[0]
    return s

# fixes agreed in the Nov 2026 review (Tier 1 item 5): the vinyl machine is a waves machine, the reading machine covers unfamiliar texts
EXTRA = {"91170": "vinyl", "91523": "vinyl", "91927": "read", "91100": "read", "91474": "read"}
# L3 Calculus/Statistics rows confirmed against the 2026 timetable (Calculus Mon 16 Nov AM, Statistics Tue 24 Nov AM)
VERIFIED_2026 = ["91577", "91578", "91579", "91584", "91585", "91586"]
# machines whose tags carry no year: the years they are written for
EXTRA_YEARS = {"heart": [9, 10]}
SHORT_SUBJ = {"Mathematics and Statistics": "Maths", "Physics, Earth and Space Science": "PESS", "Earth and Space Science": "ESS", "Chemistry and Biology": "Chem & Bio", "Design and Visual Communication": "DVC"}
LEVEL_YEAR = {"l1": 11, "l2": 12, "l3": 13}

def main():
    src = P.read_text(encoding="utf-8")
    assert src.startswith(PREFIX), "unexpected data.js shape"
    body = src[len(PREFIX):].strip().rstrip(";")
    D = json.loads(body)
    machines, levels = D["machines"], D["levels"]
    std = {}  # code -> (level, row)
    for lv in ("l1", "l2", "l3"):
        for row in levels[lv].get("standards", []):
            std[row["num"]] = (lv, row)
    # every exam date below was checked against the NZQA 2026 timetable PDF (www2.nzqa.govt.nz/assets/NCEA/2026-Exam-Timetable.pdf) on 2 Nov 2026
    for code in VERIFIED_2026:
        if code in std:
            std[code][1]["verified"] = True
    for code, mid in EXTRA.items():
        if code not in std or mid not in machines:
            continue
        lv, row = std[code]
        if not row.get("machine"):
            row["machine"] = mid
        tag = f"NCEA {lv.upper()} {SHORT_SUBJ.get(row['subject'], row['subject'])} {code}"
        if not any(t.endswith(code) for t in machines[mid].get("tags", [])):
            machines[mid].setdefault("tags", []).append(tag)
    for mid, ys in EXTRA_YEARS.items():
        if mid in machines:
            for y in ys:
                if f"Year {y}" not in machines[mid]["tags"]:
                    machines[mid]["tags"].append(f"Year {y}")
    covers = {}  # machine -> set(codes)
    for code, (lv, row) in std.items():
        if row.get("machine") in machines:
            covers.setdefault(row["machine"], set()).add(code)
    for mid, m in machines.items():
        for t in m.get("tags", []):
            mm = re.match(r"^NCEA L([123]) .*?(\d{5})$", t)
            if mm and mm.group(2) in std:
                covers.setdefault(mid, set()).add(mm.group(2))
    for mid, m in machines.items():
        years = set()
        for t in m.get("tags", []):
            y = re.match(r"^Year (\d+)$", t)
            if y:
                years.add(int(y.group(1)))
            r = re.match(r"^NCEA L([123])[–-]L([123])$", t)
            if r:
                for k in range(int(r.group(1)), int(r.group(2)) + 1):
                    years.add(10 + k)
        rows = []
        for code in sorted(covers.get(mid, [])):
            lv, row = std[code]
            years.add(LEVEL_YEAR[lv])
            rows.append({"code": code, "level": lv.upper(), "subject": row["subject"], "title": short_title(row["title"]), "full": row["title"], "exam": row.get("when"), "url": row.get("url")})
        rows.sort(key=lambda r: (r["exam"] or "9", r["code"]))
        ncea = sorted({r["level"] for r in rows})
        m["years"] = sorted(years)
        m["level"] = ncea[0] if ncea else "junior"
        m["standards"] = rows
    out = PREFIX + json.dumps(D, ensure_ascii=False) + "\n"
    P.write_text(out, encoding="utf-8")
    n = sum(1 for m in machines.values() if m["standards"])
    print(f"{len(machines)} machines; {n} mapped to standards; {sum(len(m['standards']) for m in machines.values())} standard links")

if __name__ == "__main__":
    main()
