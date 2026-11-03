#!/usr/bin/env python3
"""Point every Simulated listing at the body-style drawing for its body, instead of the old one-mesh-recoloured render.

    python3 cars/dealer-twin/tools/apply_body_drawings.py

Idempotent. Edits, in cars/dealer-twin/:
  data/stock.json        img -> {card, sq, alt, kind: "drawing", label}; drops the old `render` hint
  js/agentdesk-data.js   recorded replay images -> the matching square drawing
  js/variant.js          department tiles use the maquette posters; stock tags say "drawing"; no hero GLB;
                         dead film/studio entries no longer point at deleted renders

Upstream: this folder is the public output of /home/claude/dealer-twin-v2/build.py (outside the lab repo). Until that build
does the same, a rebuild will bring the old renders back; see ../README.md.
"""
import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent.parent
BODY_WORD = {"hatch": "hatchback", "sedan": "sedan", "wagon": "station wagon", "suv": "SUV", "ute": "double-cab ute", "van": "van"}
VERSION = "dt5b0d1a"  # cache-buster for css/js after this change


def drawing(body):
    w = BODY_WORD[body]
    return {"card": f"img/body/{body}.svg", "sq": f"img/body/{body}-sq.svg", "kind": "drawing",
            "alt": f"Drawing of a generic {w}, side view. Not a picture of this car.",
            "label": f"Generic {w} · drawing, not this car"}


def stock():
    p = HERE / "data" / "stock.json"
    d = json.loads(p.read_text())
    for c in d["cars"]:
        assert c["body"] in BODY_WORD, c["id"]
        c["img"] = drawing(c["body"])
        c.pop("render", None)
    p.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    return {c["id"]: c["body"] for c in d["cars"]}


def agentdesk(bodies):
    p = HERE / "js" / "agentdesk-data.js"
    s = p.read_text()
    s = re.sub(r"img/cars/(hl-\d{3})-(?:1x1|4x3)\.webp", lambda m: f"img/body/{bodies[m.group(1)]}-sq.svg", s)
    p.write_text(s)


def variant(bodies):
    p = HERE / "js" / "variant.js"
    s = p.read_text()
    head, body = s.split("=", 1)
    cfg = json.loads(body.strip().rstrip(";"))
    cfg["stock"] = {"filter": "body", "renderTag": "Body-style drawing · not this car", "drawingTag": "Body-style drawing · not this car", "drawingBadge": "Drawing"}
    cfg["tileImg"].update({k: f"assets/posters/{k}.webp" for k in ("showroom", "used", "marketing", "fi")})
    cfg["hero"].pop("glb", None)
    cfg["lead3"] = ["hl-040", "hl-008", "hl-044"]  # ute, SUV, van: three body styles up top, not three Aquas
    to_drawing = lambda src: re.sub(r"img/cars/(hl-\d{3})-4x3\.webp", lambda m: f"img/body/{bodies[m.group(1)]}.svg", src)
    for f in cfg.get("film", []):
        if "img/cars/" in f["src"]:
            f["src"] = to_drawing(f["src"]); f.pop("mode", None)
    st = cfg.get("studio") or {}
    for w in st.get("wall", []):
        if "img/cars/" in w["src"]:
            bid = re.search(r"hl-\d{3}", w["src"]).group(0)
            w["src"] = to_drawing(w["src"]); w["alt"] = drawing(bodies[bid])["alt"]
    if st:
        st["wallCap"] = "Harbour Lane's 48 cars, shown as body-style drawings until each has a photo."
        st["evidence"] = re.sub(r"<p>The wall shows.*?</p>", "<p>The wall shows Harbour Lane's Simulated stock as body-style drawings, one per body style. They are not pictures of the listed cars.</p>", st["evidence"])
    cfg["v"] = VERSION
    p.write_text(head + "= " + json.dumps(cfg, ensure_ascii=False, separators=(",", ":")) + ";\n")


def bump():
    p = HERE / "index.html"
    s = p.read_text()
    p.write_text(re.sub(r"\?v=[0-9a-z]+", f"?v={VERSION}", s))


if __name__ == "__main__":
    b = stock(); agentdesk(b); variant(b); bump()
    print("cars:", len(b))
