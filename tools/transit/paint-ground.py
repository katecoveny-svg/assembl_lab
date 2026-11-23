#!/usr/bin/env python3
"""assembl lab · paint the ground colour map for /auckland/live/ from the draw list written by bake-ground.mjs.

    python3 tools/transit/paint-ground.py /tmp/assembl-tiles/ground-draw.json

Natural, aerial-like colours (no brand palette). Alpha is 0 over mapped water so the page's sea shows through.
Source shapes: OpenStreetMap via OpenFreeMap (ODbL 1.0). Output: auckland/live/data/ground-colour.webp (4096 px wide, about 5.25 m a pixel).
Needs Pillow and numpy.
"""
import json, os, sys, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src = sys.argv[1] if len(sys.argv) > 1 else "/tmp/assembl-tiles/ground-draw.json"
out = os.path.join(os.path.dirname(__file__), "..", "..", "auckland", "live", "data", "ground-colour.webp")
d = json.load(open(src))
box, ops = d["box"], d["ops"]
WM, HM = box["maxX"] - box["minX"], box["maxY"] - box["minY"]
W = 4096; H = round(W * HM / WM); SS = 2; S = SS * W / WM  # pixels per metre while drawing

def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
LAND = hexrgb("#8b8a74")
COL = {
    "residential": "#8e8b78", "suburb": "#8e8b78", "neighbourhood": "#8e8b78", "commercial": "#9b978c", "retail": "#9b978c",
    "industrial": "#97948d", "railway": "#857c6f", "cemetery": "#71834f", "hospital": "#958f84", "school": "#8f8c7c",
    "university": "#8f8c7c", "college": "#8f8c7c", "kindergarten": "#8f8c7c", "stadium": "#7b8c56", "pitch": "#6d8d45", "playground": "#7e8a5c",
    "track": "#9a6b55", "grass": "#687f47", "park": "#6c8747", "nature_reserve": "#4f6b37", "garden": "#6f8a49", "recreation_ground": "#6f8a49",
    "wood": "#3d5630", "forest": "#3d5630", "scrub": "#4c5c36", "farmland": "#87985a", "farm": "#87985a", "meadow": "#7e9252", "wetland": "#5c6c49",
    "sand": "#d6c7a0", "beach": "#d6c7a0", "rock": "#8f8a80", "bare_rock": "#8f8a80", "quarry": "#a19a8a", "ice": "#e8eef0",
    "aerodrome": "#878a7a", "runway": "#56585a", "taxiway": "#5f6163", "apron": "#77797a", "helipad": "#6d6f70", "military": "#878a74",
}
ROAD = {"motorway": (24, "#4b4d4f"), "trunk": (18, "#4e5052"), "primary": (15, "#55575a"), "secondary": (12, "#5a5c5e"), "tertiary": (10, "#5e6062"),
        "minor": (7, "#636567"), "service": (4.5, "#6a6b6c"), "track": (3, "#8d8169"), "path": (1.8, "#a49983"), "busway": (10, "#5c5452"),
        "raceway": (8, "#5e6062"), "pier": (8, "#8c8378"), "motorway_construction": (18, "#7a756c")}
ROOFS = [hexrgb(h) for h in ("#7c7975", "#86564b", "#5d666e", "#b2aea4", "#6b625a", "#a6a196", "#4f5458", "#94867a")]

img = Image.new("RGB", (W * SS, H * SS), LAND)
water = Image.new("L", (W * SS, H * SS), 0)
dr, dw = ImageDraw.Draw(img), ImageDraw.Draw(water)
P = lambda ring: [(x * S, y * S) for x, y in ring]

def area(r):
    a = 0.0
    for i in range(len(r)): x1, y1 = r[i]; x2, y2 = r[(i + 1) % len(r)]; a += x1 * y2 - x2 * y1
    return a / 2

def fill(draw, parts, colour, hole):
    """MVT polygons: rings in order, an exterior followed by its holes (opposite winding). Holes are painted back with `hole`."""
    if not parts: return
    sign = 1 if area(parts[0]) > 0 else -1
    for r in parts:
        if len(r) < 3: continue
        draw.polygon(P(r), fill=colour if area(r) * sign > 0 else hole)

for layer in ("landuse", "landcover", "park", "aeroway"):
    for f in ops.get(layer, []):
        c = COL.get(f["c"]) or (COL["park"] if layer == "park" else None)
        if not c: continue
        fill(dr, f["p"], hexrgb(c), None) if False else None
        # holes inside land cover keep what was under them: draw exteriors only, then nothing for holes
        sign = 1 if f["p"] and area(f["p"][0]) > 0 else -1
        for r in f["p"]:
            if len(r) >= 3 and area(r) * sign > 0: dr.polygon(P(r), fill=hexrgb(c))

# roads under water level first (tunnels skipped), rail, then water, then bridges over water
def lines(feats, bridges):
    for f in feats:
        if f["b"] == "tunnel" or (f["b"] == "bridge") != bridges: continue
        if f["c"] in ("rail", "transit"): wd, c = 5, "#6e655c"
        else:
            wd, c = ROAD.get(f["c"], (0, None))
            if not c: continue
            if f["c"] == "service" and f["s"] in ("parking_aisle", "driveway"): wd = 3
        for r in f["p"]:
            if len(r) >= 2: dr.line(P(r), fill=hexrgb(c), width=max(1, round(wd * S)), joint="curve")

lines(ops["road"], False); lines(ops["rail"], False)
for f in ops["water"]:
    fill(dw, f["p"], 255, 0)
random.seed(7)
for f in ops["building"]:  # tiles merge a tile's buildings into one feature, so pick a roof per outline, not per feature
    sign = 1 if f["p"] and area(f["p"][0]) > 0 else -1
    for r in f["p"]:
        if len(r) >= 3 and area(r) * sign > 0:
            c = ROOFS[random.randrange(len(ROOFS))]
            dr.polygon(P(r), fill=c, outline=tuple(max(0, v - 25) for v in c))

img = img.resize((W, H), Image.LANCZOS)
water = water.resize((W, H), Image.LANCZOS)
a = np.asarray(img).astype(np.float32)
# fine value noise so flat classes do not read as plastic (two octaves, deterministic)
rng = np.random.default_rng(11)
def octave(scale):
    g = rng.random((H // scale + 2, W // scale + 2)).astype(np.float32)
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((W + scale, H + scale), Image.BICUBIC), dtype=np.float32)[:H, :W] / 255
n = 0.6 * octave(24) + 0.4 * octave(5)
a *= (0.9 + 0.2 * n)[..., None]
alpha = 255 - np.asarray(water, dtype=np.float32)
rgba = np.dstack([np.clip(a, 0, 255), alpha]).astype(np.uint8)
im = Image.fromarray(rgba, "RGBA")
im.save(out, "WEBP", quality=80, method=6)
print(out, im.size, os.path.getsize(out))

# street-light map for the night view: roads only (no paths, driveways or parking aisles), soft-edged, half resolution
LW = W // 2; LS = LW / WM
li = Image.new("L", (LW, round(LW * HM / WM)), 0); dl = ImageDraw.Draw(li)
for f in ops["road"]:
    if f["b"] == "tunnel" or f["c"] not in ("motorway", "trunk", "primary", "secondary", "tertiary", "minor", "busway"): continue
    wd = ROAD[f["c"]][0]; v = 255 if f["c"] in ("motorway", "trunk", "primary", "secondary") else 170
    for r in f["p"]:
        if len(r) >= 2: dl.line([(x * LS, y * LS) for x, y in r], fill=v, width=max(1, round(wd * LS * 1.6)))
li = li.filter(ImageFilter.GaussianBlur(1.2))
lout = os.path.join(os.path.dirname(out), "ground-lights.webp")
li.convert("RGB").save(lout, "WEBP", quality=70, method=6)
print(lout, li.size, os.path.getsize(lout))
