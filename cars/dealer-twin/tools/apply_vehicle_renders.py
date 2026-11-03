#!/usr/bin/env python3
"""Point every Simulated listing at the offline Cycles still of its GENERIC body in its listing colour (PR B).

    python3 cars/dealer-twin/tools/apply_vehicle_renders.py

Idempotent. Run after tools/compose_vehicle_images.py has written img/stock/<body>-<paint>.webp (+ -sq.webp).
Edits, in cars/dealer-twin/:
  data/stock.json        img -> {card, sq, alt, kind: "render", generic: true, label}; model3d -> {body, paint}
  js/agentdesk-data.js   recorded replay images and alts -> the same stills, labelled generic
  js/variant.js          stock tags; cache-buster
  index.html             the "assistant asks" picture; cache-buster
The listing's body is the body of its real model (an Aqua is a hatch, a Hilux a ute); the picture is never the actual car.
"""
import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent.parent
CONTRACT = json.loads((HERE.parent.parent / "assets" / "models" / "vehicles" / "vehicles-rig-contract.json").read_text())
WORD = {"hatch": "hatch", "sedan": "sedan", "wagon": "wagon", "suv": "SUV", "ute": "ute", "van": "van"}
VERSION = "dt5b0d3c"


def paint_of(colour):
    for k, p in CONTRACT["paints"].items():
        if p["label"].lower() == (colour or "").lower(): return k
    raise SystemExit(f"no paint for colour {colour!r}")


def img(body, paint):
    w, label = WORD[body], CONTRACT["paints"][paint]["label"].lower()
    for f in (f"img/stock/{body}-{paint}.webp", f"img/stock/{body}-{paint}-sq.webp"):
        assert (HERE / f).exists(), f"missing {f}: run tools/compose_vehicle_images.py first"
    return {"card": f"img/stock/{body}-{paint}.webp", "sq": f"img/stock/{body}-{paint}-sq.webp", "kind": "render", "generic": True,
            "alt": f"Render of a generic {w} in {label}, front three-quarter view. Not the actual vehicle.",
            "label": f"Generic {w} render · not the actual vehicle"}


def stock():
    p = HERE / "data" / "stock.json"
    d = json.loads(p.read_text())
    for c in d["cars"]:
        k = paint_of(c["colour"])
        c["img"] = img(c["body"], k)
        c["model3d"] = {"body": c["body"], "paint": k}
        c.pop("render", None)
    p.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    return {c["id"]: c for c in d["cars"]}


def agentdesk(cars):
    p = HERE / "js" / "agentdesk-data.js"
    head, body = p.read_text().split("=", 1)
    data = json.loads(body.strip().rstrip(";"))
    def walk(o):
        if isinstance(o, dict):
            cid = o.get("id")
            if isinstance(cid, str) and cid in cars:
                im = cars[cid]["img"]
                if isinstance(o.get("image"), dict): o["image"].update(url=im["sq"], alt=im["alt"])
                for x in o.get("images") or []:
                    if isinstance(x, dict) and "url" in x: x.update(url=im["card"], alt=im["alt"], label=im["label"])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(data)
    p.write_text(head + "= " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")


def variant():
    p = HERE / "js" / "variant.js"
    head, body = p.read_text().split("=", 1)
    cfg = json.loads(body.strip().rstrip(";"))
    cfg["stock"].update({"renderTag": "Generic render · not the actual vehicle", "renderBadge": "Generic render", "model3d": "/assets/models/vehicles/"})
    cfg["v"] = VERSION
    p.write_text(head + "= " + json.dumps(cfg, ensure_ascii=False, separators=(",", ":")) + ";\n")


def page(cars):
    p = HERE / "index.html"
    s = p.read_text()
    aqua = cars["hl-002"]["img"]
    s = re.sub(r'<img src="img/(?:body|stock)/[^"]+" alt="[^"]*Not a picture of the car in the enquiry\.?[^"]*"', f'<img src="{aqua["card"]}" alt="{aqua["alt"][:-1]}, not the car in the enquiry."', s)
    s = re.sub(r'<img src="img/(?:body|stock)/[^"]+" alt="[^"]*not the car in the enquiry\."', f'<img src="{aqua["card"]}" alt="{aqua["alt"][:-1]}, not the car in the enquiry."', s)
    s = s.replace("Pictures are body-style drawings, one per body style, drawn at the same scale so a ute reads bigger than a hatch. They are not pictures of the listed cars. A real dealer's own photos replace them.",
                  "Pictures are generic vehicles of each listing's body style, built in Blender at real-world size and rendered in the listing's colour, all at the same scale. They are not the actual vehicles. A real dealer's own photos replace them.")
    s = s.replace("Simulated stock · body-style drawings, not photographs", "Simulated stock · generic renders, not photographs")
    s = re.sub(r"\?v=[0-9a-z]+", f"?v={VERSION}", s)
    p.write_text(s)


if __name__ == "__main__":
    cars = stock(); agentdesk(cars); variant(); page(cars)
    print("cars:", len(cars))
