#!/usr/bin/env python3
"""assembl generic vehicle set: six unbranded vehicles for the dealer twin, built entirely by this script in Blender (bpy).

    python -m venv .venv && .venv/bin/pip install bpy==5.1.2          # once; not committed
    .venv/bin/python assets/models/vehicles/source/build_vehicles.py              # model + GLBs + contract + report
    .venv/bin/python assets/models/vehicles/source/build_vehicles.py --render     # + Cycles hero/detail renders and listing stills
      options: --only=hatch,ute   --samples=96   --still-samples=40   --out=<dir for PNG renders>

Writes (next to this folder):
  source/vehicles.blend                one scene, one collection per vehicle (editable, named parts, metres)
  <body>.glb                           hatch, sedan, wagon, suv, ute, van (Y-up glTF, metres, origin at ground centre)
  vehicles-rig-contract.json           node names, pivots, axes, colourways, budgets (generated from the real nodes)
  build-report.json                    triangles, bytes, materials, dimensions per vehicle
  <out>/<body>-hero.png, -detail.png   Cycles, transparent background (composited onto chalk by tools/compose_vehicle_images.py)
  <out>/stills/<body>-<paint>.png      Cycles listing stills, one fixed camera and scale for every body

The vehicles are GENERIC: typical New Zealand used-stock proportions (length, width, height, wheelbase, overhangs, tyre sizes,
ground clearance), real construction cues (panel gaps, glazing and pillars, wheel wells, tyre/rim/brake, lamps, mirrors,
handles, grille openings, blank plates), and no badges, logos, lettering or any manufacturer's signature design.

Axes: built Z-up in Blender with the nose toward +X, left side +Y. The glTF exporter writes Y-up: (x, y, z) -> (x, z, -y).
So in three.js: +X forward, +Y up, +Z = the vehicle's RIGHT side. Wheels spin about glTF Z; front hubs steer about glTF Y.
Simplifications, honestly: glass is opaque tinted (no interior is modelled); lamps are lens shapes, not optics; no suspension.
"""
import bpy, bmesh, math, json, sys, os, hashlib, pathlib
from mathutils import Vector, Matrix

HERE = pathlib.Path(__file__).resolve().parent
ASSET = HERE.parent
ARGS = {a.split("=")[0].lstrip("-"): (a.split("=", 1)[1] if "=" in a else True) for a in sys.argv[1:] if a.startswith("--")}
ONLY = [s for s in str(ARGS.get("only", "")).split(",") if s]
OUT = pathlib.Path(ARGS.get("out", str(ASSET / "renders-png")))

# ------------------------------------------------------------------------------------------------ specs (metres)
# tyre = (width mm, aspect %, rim inch). Profiles are keyed on x measured from the FRONT of the vehicle.
SPEC = {
  "hatch": dict(label="Small hybrid hatch", L=4.050, W=1.695, H=1.455, wb=2.550, fo=0.800, track=1.470, tyre=(175, 65, 15), spokes=10, cladding=False,
    top=[(0, .48), (.03, .62), (.12, .72), (.55, .84), (.98, .93), (1.25, 1.10), (1.62, 1.34), (1.92, 1.44), (2.4, 1.455), (3.0, 1.445), (3.45, 1.41), (3.75, 1.34), (3.84, 1.31), (3.92, 1.12), (3.99, .95), (4.035, .80), (4.05, .56)],
    belt=[(0, .48), (.03, .60), (.15, .70), (.9, .86), (2.0, .92), (3.3, .99), (3.9, 1.0), (3.99, .92), (4.05, .56)],
    bot=[(0, .30), (.12, .24), (.30, .19), (.5, .165), (3.6, .17), (3.85, .22), (4.0, .30), (4.05, .36)],
    plan=[(0, .74), (.05, .86), (.18, .95), (.5, .99), (1.0, 1.0), (3.2, 1.0), (3.7, .985), (3.95, .95), (4.05, .88)],
    ws=(.98, 1.86), rw=(3.78, 3.985), dlo=(1.10, 3.62), pillars=[(2.24, 2.33, "TRIM"), (3.10, 3.22, "PAINT")],
    gaps=[1.10, 2.285, 3.04, 3.88], topgaps=[.98, 3.76], handles=[2.06, 2.95], tumble=.13, lamp_z=.67, tail_z=.98, grille=(.52, .07, .615), intake=(1.02, .17, .40)),
  "sedan": dict(label="Sedan", L=4.690, W=1.800, H=1.445, wb=2.750, fo=0.930, track=1.560, tyre=(215, 55, 17), spokes=5, cladding=False,
    top=[(0, .50), (.03, .62), (.15, .71), (.7, .83), (1.40, .90), (1.75, 1.08), (2.15, 1.34), (2.45, 1.43), (2.9, 1.445), (3.25, 1.42), (3.55, 1.30), (3.85, 1.12), (4.05, 1.035), (4.45, 1.02), (4.63, 1.00), (4.68, .86), (4.69, .58)],
    belt=[(0, .50), (.03, .60), (.2, .69), (1.4, .86), (2.6, .92), (3.9, .99), (4.5, 1.0), (4.65, .95), (4.69, .58)],
    bot=[(0, .30), (.15, .23), (.40, .17), (.7, .155), (4.0, .16), (4.35, .22), (4.6, .30), (4.69, .38)],
    plan=[(0, .74), (.05, .86), (.2, .95), (.6, .99), (1.2, 1.0), (3.8, 1.0), (4.3, .98), (4.6, .94), (4.69, .88)],
    ws=(1.40, 2.44), rw=(3.25, 3.97), dlo=(1.55, 3.56), pillars=[(2.56, 2.65, "TRIM"), (3.27, 3.32, "TRIM")],
    gaps=[1.30, 2.605, 3.42], topgaps=[1.40, 3.97], handles=[2.36, 3.25], tumble=.14, lamp_z=.665, tail_z=.93, grille=(.60, .075, .625), intake=(1.12, .17, .40)),
  "wagon": dict(label="Station wagon", L=4.660, W=1.790, H=1.475, wb=2.700, fo=0.920, track=1.550, tyre=(205, 55, 16), spokes=6, cladding=False,
    top=[(0, .50), (.03, .62), (.15, .71), (.7, .83), (1.38, .91), (1.72, 1.10), (2.10, 1.36), (2.40, 1.465), (3.0, 1.475), (4.0, 1.455), (4.35, 1.40), (4.55, 1.30), (4.62, 1.05), (4.655, .85), (4.66, .58)],
    belt=[(0, .5), (.03, .6), (.2, .69), (1.38, .87), (2.6, .93), (4.3, 1.0), (4.6, .98), (4.66, .58)],
    bot=[(0, .30), (.15, .23), (.4, .17), (.7, .16), (4.0, .165), (4.35, .22), (4.58, .30), (4.66, .38)],
    plan=[(0, .74), (.05, .86), (.2, .95), (.6, .99), (1.2, 1.0), (4.0, 1.0), (4.4, .98), (4.6, .95), (4.66, .90)],
    ws=(1.38, 2.42), rw=(4.47, 4.64), dlo=(1.52, 4.40), pillars=[(2.52, 2.61, "TRIM"), (3.42, 3.54, "TRIM")],
    gaps=[1.28, 2.565, 3.38, 4.50], topgaps=[1.38, 4.45], handles=[2.32, 3.22], tumble=.14, lamp_z=.67, tail_z=1.02, grille=(.60, .075, .63), intake=(1.10, .17, .40)),
  "suv": dict(label="Mid-size SUV", L=4.600, W=1.855, H=1.690, wb=2.690, fo=0.920, track=1.600, tyre=(225, 60, 18), spokes=6, cladding=True,
    top=[(0, .62), (.03, .78), (.15, .88), (.7, 1.00), (1.15, 1.07), (1.45, 1.27), (1.85, 1.58), (2.15, 1.675), (3.0, 1.69), (3.95, 1.67), (4.30, 1.60), (4.47, 1.50), (4.55, 1.20), (4.59, .95), (4.60, .70)],
    belt=[(0, .62), (.03, .75), (.2, .86), (1.15, 1.03), (2.4, 1.09), (4.2, 1.15), (4.5, 1.13), (4.60, .70)],
    bot=[(0, .40), (.15, .32), (.40, .25), (.7, .215), (3.9, .22), (4.25, .28), (4.5, .36), (4.60, .44)],
    plan=[(0, .76), (.05, .87), (.2, .95), (.6, .99), (1.2, 1.0), (3.9, 1.0), (4.3, .985), (4.55, .95), (4.60, .91)],
    ws=(1.15, 2.14), rw=(4.40, 4.575), dlo=(1.32, 4.32), pillars=[(2.40, 2.50, "TRIM"), (3.40, 3.53, "TRIM")],
    gaps=[1.24, 2.45, 3.36, 4.48], topgaps=[1.15, 4.38], handles=[2.20, 3.14], tumble=.15, lamp_z=.86, tail_z=1.16, grille=(.78, .15, .755), intake=(1.16, .20, .50), rails=True),
  "ute": dict(label="Double-cab ute", L=5.330, W=1.860, H=1.815, wb=3.220, fo=0.900, track=1.570, tyre=(265, 65, 17), spokes=6, cladding=True,
    top=[(0, .66), (.03, .86), (.15, .98), (.8, 1.08), (1.45, 1.14), (1.75, 1.36), (2.10, 1.70), (2.35, 1.80), (3.05, 1.815), (3.14, 1.79), (3.17, 1.60), (3.18, 1.30), (3.20, 1.215), (5.29, 1.215), (5.32, 1.17), (5.33, .80)],
    belt=[(0, .66), (.03, .84), (.2, .96), (1.45, 1.10), (3.0, 1.16), (3.20, 1.18), (5.30, 1.19), (5.33, .80)],
    bot=[(0, .44), (.15, .36), (.40, .28), (.7, .255), (4.6, .26), (5.0, .32), (5.25, .40), (5.33, .46)],
    plan=[(0, .76), (.05, .88), (.2, .96), (.6, 1.0), (5.2, 1.0), (5.33, .97)],
    ws=(1.45, 2.33), rw=(3.10, 3.18), dlo=(1.60, 3.05), pillars=[(2.42, 2.52, "TRIM")],
    gaps=[1.36, 2.47, 3.13, 5.27], topgaps=[1.45], handles=[2.25, 2.98], tumble=.13, lamp_z=.99, tail_z=1.02, grille=(.92, .28, .86), intake=(1.06, .16, .54),
    tub=(3.27, 5.265, .80), cabgap=3.19, step=True),
  "van": dict(label="Long-wheelbase van", L=5.265, W=1.880, H=1.990, wb=3.110, fo=0.760, track=1.650, tyre=(215, 70, 15), spokes=0, cladding=False,
    top=[(0, .55), (.03, .72), (.15, .86), (.45, .98), (.70, 1.08), (.95, 1.40), (1.30, 1.85), (1.60, 1.96), (2.2, 1.99), (5.10, 1.99), (5.20, 1.975), (5.265, 1.95)],
    belt=[(0, .55), (.03, .70), (.2, .84), (.70, 1.02), (2.0, 1.08), (5.0, 1.10), (5.265, 1.08)],
    bot=[(0, .36), (.12, .29), (.3, .23), (.6, .20), (4.5, .21), (4.9, .26), (5.2, .32), (5.265, .36)],
    plan=[(0, .80), (.05, .90), (.2, .97), (.6, 1.0), (5.1, 1.0), (5.265, .98)],
    ws=(.70, 1.56), rw=None, dlo=(.86, 1.76), pillars=[],
    gaps=[1.02, 1.80, 1.86, 3.14], topgaps=[.70], handles=[1.62, 2.02], tumble=.07, lamp_z=.90, tail_z=1.0, grille=(.92, .15, .79), intake=(1.18, .18, .46), panel=True),
}

# Paint colourways (sRGB hex, metallic, base roughness). Real automotive colours for real-world-coloured listings; the
# brand palette is for the page and the backdrop, not the paint. The listing's colour name maps to one of these.
PAINTS = {
  "pearl-white": ("#E9E7E1", .15, .30, "Pearl white"), "silver": ("#A9ACAF", .85, .32, "Silver metallic"), "graphite": ("#4B4E53", .75, .33, "Graphite grey"),
  "black": ("#121214", .25, .26, "Black"), "red-mica": ("#7E1622", .55, .30, "Red mica"), "midnight-blue": ("#1C2A47", .65, .30, "Midnight blue"),
  "sage": ("#7D8B78", .45, .33, "Sage green"), "deep-plum": ("#3E1B36", .55, .30, "Deep plum"), "sand": ("#BDAE92", .40, .33, "Sand"),
}
BUDGET = {"tris": 40000, "bytes": 1_200_000, "textures": 0}


def srgb_to_lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((v / 12.92) if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


# ------------------------------------------------------------------------------------------------ interpolation
def pchip(pts):
    """Monotone cubic through (x, y) keypoints: smooth, never overshoots (no bumps in a roofline)."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    n = len(xs)
    d = [(ys[i + 1] - ys[i]) / max(xs[i + 1] - xs[i], 1e-9) for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, n - 1):
        m[i] = 0.0 if d[i - 1] * d[i] <= 0 else 3 * (d[i - 1] + d[i]) / ((2 * d[i] + d[i - 1]) / d[i - 1] + (d[i] + 2 * d[i - 1]) / d[i]) if d[i - 1] and d[i] else 0.0
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(k for k in range(n - 1) if xs[k] <= x)
        h = xs[i + 1] - xs[i]; t = (x - xs[i]) / h
        h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
        return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
    return f


def catmull(points, sub):
    """Resample an open polyline with Catmull-Rom; returns [(p, segment_index)]."""
    out, n = [], len(points)
    for s in range(n - 1):
        p0, p1, p2, p3 = points[max(s - 1, 0)], points[s], points[s + 1], points[min(s + 2, n - 1)]
        for k in range(sub):
            t = k / sub
            t2, t3 = t * t, t * t * t
            out.append((tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)), s))
    out.append((points[-1], n - 2))
    return out


# ------------------------------------------------------------------------------------------------ materials
MATS = {}


def mat(name, color, metallic=0., rough=.5, coat=0., coat_rough=.03, emit=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*srgb_to_lin(color), 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_rough
    if emit:
        b.inputs["Emission Color"].default_value = (*srgb_to_lin(emit[0]), 1); b.inputs["Emission Strength"].default_value = emit[1]
    m.diffuse_color = (*srgb_to_lin(color), 1)
    MATS[name] = m
    return m


def make_materials(paint="pearl-white"):
    hx, met, ro, _ = PAINTS[paint]
    mat("PAINT", hx, met, ro, coat=1.0, coat_rough=.03)
    mat("GLASS", "#1C1F24", 0., .07) ; MATS["GLASS"].node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = .12  # softer studio reflections                # tinted glass, opaque in both renderers: no interior is modelled
    mat("TRIM_BLACK", "#141416", 0., .35)
    mat("GAP", "#0B0B0C", 0., .9)
    mat("UNDER", "#1E1E20", 0., .85)
    mat("ARCH", "#121213", 0., .95)
    mat("CLADDING", "#232325", 0., .72)
    mat("TRAY", "#18181A", 0., .8)
    mat("TYRE", "#19191A", 0., .88)
    mat("RIM", "#C3C6C9", .9, .26)
    mat("RIM_INNER", "#4A4C50", .8, .45)
    mat("BRAKE", "#6E6C69", .85, .42)
    mat("CALIPER", "#2C2D30", .3, .5)
    mat("HEADLAMP", "#3A3D42", 1., .06)                # chrome reflector behind a clear lens, read as one surface
    mat("DRL", "#F4F4F2", 0., .2)
    mat("TAIL_LENS", "#7A0E16", 0., .12)
    mat("PLATE", "#EDEDEA", 0., .5)                    # a blank plate: no characters
    mat("MIRROR_GLASS", "#9DA3A8", 1., .02)
    mat("HANDLE", "#B9BCBF", .9, .3)
    mat("PROJECTOR", "#E6E8EA", 1., .1)


# ------------------------------------------------------------------------------------------------ body loft
def body_profile(S):
    top, belt, bot = pchip(S["top"]), pchip(S["belt"]), pchip(S["bot"])
    plan = pchip([(x, 1 - (1 - f) * .6) for x, f in S["plan"]])     # plan taper at the corners (less than a bar of soap)
    def at(x):
        zb, zl = bot(x), belt(x)
        zt = max(top(x), zl + .025)
        w = S["W"] / 2 * plan(x)
        g = min(max((zt - zl - .08) / .25, 0), 1)
        return zb, zl, zt, w, g
    return at


def section(S, x, at, sy=1., sz=1.):
    zb, zl, zt, w, g = at(x)
    tb, tr = .015 + .06 * g * (S["tumble"] / .14), .03 + S["tumble"] * g
    crown, rr = .02 + .015 * g, .03 + .06 * g
    zr = max(zt - crown - rr, zl + .012)
    K = [(0, zb), (.70 * w, zb), (.90 * w, zb + .015), (.975 * w, zb + .06), (.995 * w, zb + .30 * (zl - zb)), (w, zl - .10 * (zl - zb)), (.985 * w, zl),
         (w - tb, zl + .012), ((w - tb) * .45 + (w - tr) * .55, zl + .55 * (zr - zl + .0001)), (w - tr, zr), (w - tr - rr * .7, zr + rr * .75), ((w - tr) * .5, zt - crown * .25), (0, zt)]
    zc = (zb + zt) / 2
    K = [(y * sy, zc + (z - zc) * sz) for y, z in K]
    return catmull(K, 2)


def classify(S, x, s, top_level):
    """Material for the face at station x (from the front), section segment s."""
    gap = lambda xs, h=.0046: any(abs(x - g) < h for g in xs)
    in_ = lambda r: r is not None and r[0] <= x <= r[1]
    if s <= 1: return "UNDER"
    if s == 2: return "CLADDING"                       # rocker: dark on every body, it reads the ride height
    if s in (3, 4, 5, 6):
        if gap(S["gaps"]): return "GAP"
        if s == 3 and S["cladding"]: return "CLADDING"
        if s == 6 and in_(S["dlo"]): return "TRIM_BLACK"
        return "PAINT"
    if s in (7, 8):
        if in_(S["dlo"]):
            for a, b, m in S["pillars"]:
                if a <= x <= b: return "TRIM_BLACK" if m == "TRIM" else "PAINT"
            return "GLASS"
        if S.get("cabgap") and abs(x - S["cabgap"]) < .012: return "GAP"
        return "PAINT"
    if s == 9:                                          # roof edge: glass across the windscreen and rear window, painted gutter elsewhere
        if gap(S["topgaps"]): return "GAP"
        return "GLASS" if (in_(S["ws"]) and x > S["ws"][0] + .06) or (in_(S["rw"]) and x < S["rw"][1] - .02) else "PAINT"
    if gap(S["topgaps"]): return "GAP"
    if in_(S["ws"]) or in_(S["rw"]): return "GLASS"
    return "PAINT"


def stations(S):
    L, step = S["L"], S["L"] / 128
    xs = set(round(i * step, 4) for i in range(1, int(L / step)))
    for g in S["gaps"] + S["topgaps"] + [S["ws"][0], S["ws"][1], S["dlo"][0], S["dlo"][1]] + ([S["rw"][0], S["rw"][1]] if S["rw"] else []) + [p for a, b, _ in S["pillars"] for p in (a, b)]:
        xs.update((round(g - .0045, 4), round(g + .0045, 4)))
    ends = [(0, .91, .93), (.006, .95, .96), (.02, .978, .982), (.045, .994, .995), (.08, 1, 1)]
    out = [(x, sy, sz) for x, sy, sz in ends] + [(x, 1, 1) for x in sorted(xs) if .08 < x < L - .08] + [(L - x, sy, sz) for x, sy, sz in reversed(ends)]
    return out


def build_body(S, name):
    at = body_profile(S)
    L = S["L"]
    bm = bmesh.new()
    rings = []
    for x, sy, sz in stations(S):
        sec = section(S, x, at, sy, sz)
        half = [p for p, _ in sec]
        seg = [s for _, s in sec]
        X = L / 2 - x
        ring = [bm.verts.new((X, y, z)) for y, z in half] + [bm.verts.new((X, -y, z)) for y, z in reversed(half[1:-1])]
        rings.append((x, ring))
    n = len(rings[0][1])
    hs = len(sec) - 1                                     # segments on one side; ring index j >= hs is the mirrored side
    names = ["PAINT", "GLASS", "TRIM_BLACK", "GAP", "UNDER", "CLADDING"]
    for (x0, r0), (x1, r1) in zip(rings, rings[1:]):
        xm = (x0 + x1) / 2
        for j in range(n):
            k = (j + 1) % n
            f = bm.faces.new((r0[j], r0[k], r1[k], r1[j]))
            s = sec[j][1] if j < hs else sec[min(n - j - 1, hs - 1)][1]
            f.material_index = names.index(classify(S, xm, s, None))
    for idx, (x, r) in ((0, rings[0]), (-1, rings[-1])):
        c = bm.verts.new((sum(v.co.x for v in r) / n, 0, sum(v.co.z for v in r) / n))
        for j in range(n):
            f = bm.faces.new((r[j], r[(j + 1) % n], c))
            f.material_index = 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for nm in names: me.materials.append(MATS[nm])
    ob = bpy.data.objects.new(name, me)
    return ob


def boolean(ob, cutter, op="DIFFERENCE"):
    m = ob.modifiers.new("b", "BOOLEAN"); m.operation = op; m.object = cutter; m.solver = "EXACT"; m.material_mode = "TRANSFER"
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def cutter_cyl(coll, loc, r, depth, matname, verts=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=(math.pi / 2, 0, 0))
    c = bpy.context.active_object
    c.data.materials.append(MATS[matname])
    return c


def cutter_box(loc, size, matname):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    c = bpy.context.active_object; c.scale = size
    bpy.ops.object.transform_apply(scale=True)
    c.data.materials.append(MATS[matname])
    return c


def tyre_dims(S):
    w, a, rim = S["tyre"]
    R = (rim * 25.4 + 2 * w * a / 100) / 2000
    return w / 1000, R, rim * 25.4 / 2000


# ------------------------------------------------------------------------------------------------ wheels
def lathe(bm, prof, segs, mat_idx, y_sign=1):
    """Spin a profile [(r, y)] about the Y axis; returns faces."""
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        rings.append([bm.verts.new((math.cos(a) * r, y * y_sign, math.sin(a) * r)) for r, y in prof])
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % segs]
        for j in range(len(prof) - 1):
            f = bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
            f.material_index = mat_idx
    return rings


def box_verts(bm, corners, mat_idx):
    v = [bm.verts.new(c) for c in corners]
    for q in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        f = bm.faces.new([v[i] for i in q]); f.material_index = mat_idx


def build_wheel(S, name):
    """Tyre, rim (spokes, lip, barrel, hub, nuts). Local origin = wheel centre, outer face toward +Y."""
    tw, R, rr = tyre_dims(S)
    h = R - rr
    bm = bmesh.new()
    tyre = [(rr + .004, -tw * .42), (rr + .25 * h, -tw * .50), (rr + .70 * h, -tw * .505), (R - .022, -tw * .47), (R - .004, -tw * .40), (R, -tw * .30),
            (R, -tw * .14), (R - .007, -tw * .12), (R - .007, -tw * .07), (R, -tw * .05), (R, tw * .05), (R - .007, tw * .07), (R - .007, tw * .12), (R, tw * .14),
            (R, tw * .30), (R - .004, tw * .40), (R - .022, tw * .47), (rr + .70 * h, tw * .505), (rr + .25 * h, tw * .50), (rr + .004, tw * .42)]
    lathe(bm, tyre, 40, 0)
    lathe(bm, [(rr - .012, -tw * .40), (rr - .012, tw * .26)], 40, 2)                       # inner barrel, seen between spokes
    lathe(bm, [(rr - .016, tw * .26), (rr - .004, tw * .36), (rr + .010, tw * .40), (rr + .006, tw * .43), (rr - .020, tw * .42)], 40, 1)   # outer lip
    face_y = tw * .36
    if S["spokes"]:
        n = S["spokes"]
        for i in range(n):
            a = 2 * math.pi * i / n
            for twin in ((-.07, .07) if n <= 6 else (0,)):
                ang = a + twin * (1 if n <= 6 else 0)
                c, s_ = math.cos(ang), math.sin(ang)
                t = Vector((-s_, 0, c))
                w0, w1 = (.016, .022) if n <= 6 else (.014, .018)
                r0, r1 = .085, rr - .014
                p = lambda r, w, y: Vector((c * r, y, s_ * r)) + t * w
                d0, d1 = face_y - .012, face_y + .004
                corners = [p(r0, -w0, d0 - .02), p(r1, -w1, d0), p(r1, w1, d0), p(r0, w0, d0 - .02), p(r0, -w0, d1 - .01), p(r1, -w1, d1), p(r1, w1, d1), p(r0, w0, d1 - .01)]
                box_verts(bm, [tuple(v) for v in corners], 1)
        lathe(bm, [(0, face_y - .004), (.03, face_y - .006), (.07, face_y - .018), (.095, face_y - .03)], 24, 1)    # hub face
        for i in range(5):
            a = 2 * math.pi * i / 5 + .3
            lathe_nut = [(0, face_y - .0), (.0085, face_y - .002), (.0085, face_y - .016)]
            off = Vector((math.cos(a) * .052, 0, math.sin(a) * .052))
            vs = lathe(bm, lathe_nut, 8, 2)
            for ring in vs:
                for v in ring: v.co += off
    else:  # steel wheel with a plain plastic cover (van)
        lathe(bm, [(0, face_y + .012), (.06, face_y + .010), (rr * .55, face_y + .002), (rr * .80, face_y - .006), (rr * .92, face_y - .004), (rr - .016, face_y - .012)], 40, 1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for nm in ("TYRE", "RIM", "RIM_INNER"): me.materials.append(MATS[nm])
    for p in me.polygons: p.use_smooth = True
    return bpy.data.objects.new(name, me)


def build_brake(S, name, front):
    tw, R, rr = tyre_dims(S)
    bm = bmesh.new()
    rd = rr * .80
    lathe(bm, [(.07, -.014), (rd, -.014), (rd, .014), (.07, .014)], 32, 0)
    # caliper sits at the back of the disc, upper quadrant (toward -X, +Z): the same side on both axles
    a = math.radians(150)
    c, s_ = math.cos(a), math.sin(a)
    t = Vector((-s_, 0, c))
    r0, r1 = rd * .70, rd + .02
    corners = []
    for r, w, y in ((r0, -.06, -.035), (r1, -.07, -.035), (r1, .07, -.035), (r0, .06, -.035), (r0, -.06, .035), (r1, -.07, .035), (r1, .07, .035), (r0, .06, .035)):
        corners.append(tuple(Vector((c * r, y, s_ * r)) + t * w))
    box_verts(bm, corners, 1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for nm in ("BRAKE", "CALIPER"): me.materials.append(MATS[nm])
    return bpy.data.objects.new(name, me)


# ------------------------------------------------------------------------------------------------ details
def patch(name, center, size, normal_axis, matname, radius=.3, res=(10, 5), roll=0.):
    """A rounded-rectangle grid facing along normal_axis ('+X', '-X', '+Y', '-Y'), later shrinkwrapped onto the body."""
    bm = bmesh.new()
    nu, nv = res
    du, dv = size
    grid = []
    for i in range(nu + 1):
        row = []
        for j in range(nv + 1):
            u, v = (i / nu - .5) * du, (j / nv - .5) * dv
            # round the corners: pull corner points in along a superellipse
            ku, kv = abs(u) / (du / 2 + 1e-9), abs(v) / (dv / 2 + 1e-9)
            e = (ku ** 4 + kv ** 4) ** .25
            k = 1 if e < 1e-9 else min(1, 1 / e) if radius else 1
            if radius: u, v = u * (k ** radius), v * (k ** radius)
            row.append(bm.verts.new((0, u, v)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(MATS[matname])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    rot = {"+X": (0, 0, 0), "-X": (0, 0, math.pi), "+Y": (0, 0, math.pi / 2), "-Y": (0, 0, -math.pi / 2)}[normal_axis]
    ob.rotation_euler = (roll, rot[1], rot[2])
    ob.location = center
    return ob


def shrink(ob, target, offset, axis, lim=None):
    """Wrap a patch onto the body; any vertex the projection missed (left floating) is removed."""
    m = ob.modifiers.new("sw", "SHRINKWRAP")
    m.target = target; m.offset = offset
    if axis:
        m.wrap_method = "PROJECT"; m.use_project_x = True; m.use_negative_direction = True; m.use_positive_direction = True
    else:
        m.wrap_method = "NEAREST_SURFACEPOINT"
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=m.name)
    lim = LIMIT[0]
    bm = bmesh.new(); bm.from_mesh(ob.data)
    mw = ob.matrix_world
    bad = [v for v in bm.verts if abs((mw @ v.co).x) > lim]
    if bad: bmesh.ops.delete(bm, geom=bad, context="VERTS")
    bm.to_mesh(ob.data); bm.free()


LIMIT = [9.9]


def ellipsoid(name, loc, scale, matname, segs=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=1, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    return o


def bar(name, p0, p1, w, h, matname):
    """A rectangular bar between two points (rails, steps, tracks)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bpy.ops.mesh.primitive_cube_add(size=1, location=(p0 + p1) / 2)
    o = bpy.context.active_object; o.name = name
    o.scale = (d.length, w, h)
    o.rotation_euler = (0, -math.atan2(d.z, math.hypot(d.x, d.y)), math.atan2(d.y, d.x))
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    return o


def details(S, body, at):
    L = S["L"]
    X = lambda x: L / 2 - x
    parts = []
    # headlamps (lens + a DRL strip inside), wrapped onto the front corners
    zb, zl, zt, w, g = at(.10)
    lz = S["lamp_z"]
    for side in (1, -1):
        hl = patch("HEADLAMP", (X(-.3), side * w * .69, lz), (w * .50, .115 + (.02 if S["H"] > 1.6 else 0)), "+X", "HEADLAMP", radius=.55, res=(16, 6))
        shrink(hl, body, .004, True); parts.append(hl)
        drl = patch("DRL", (X(-.3), side * w * .67, lz + .036), (w * .40, .013), "+X", "DRL", radius=0, res=(12, 1))
        shrink(drl, body, .0065, True); parts.append(drl)
        pj = patch("PROJECTOR", (X(-.3), side * w * .74, lz - .012), (.07, .055), "+X", "PROJECTOR", radius=1, res=(6, 4))
        shrink(pj, body, .006, True); parts.append(pj)
    # bonnet leading edge and bumper top: shut lines across the nose
    for zz, ww in ((lz + .085, w * 1.62), (lz - .085, w * 1.70)):
        sl = patch("SHUTLINE", (X(-.3), 0, zz), (ww, .006), "+X", "GAP", radius=0, res=(24, 1)); shrink(sl, body, .0015, True); parts.append(sl)
    # grille opening (upper) and lower intake: openings, plain black, no pattern or emblem
    gw, gh, gz = S["grille"]
    gr = patch("GRILLE", (X(-.3), 0, gz), (gw, gh), "+X", "TRIM_BLACK", radius=.5, res=(12, 4))
    shrink(gr, body, .003, True); parts.append(gr)
    iw, ih, iz = S["intake"]
    it = patch("INTAKE", (X(-.3), 0, iz), (iw, ih), "+X", "TRIM_BLACK", radius=.4, res=(16, 4))
    shrink(it, body, .003, True); parts.append(it)
    pl = patch("PLATE_F", (X(-.3), 0, iz), (.372, .134), "+X", "PLATE", radius=.15, res=(6, 2))
    shrink(pl, body, .009, True); parts.append(pl)
    # tail lamps, rear diffuser band and rear plate
    for side in (1, -1):
        tl = patch("TAIL", (X(L + .3), side * w * .76, S["tail_z"]), (w * .38, .12), "-X", "TAIL_LENS", radius=.5, res=(10, 5))
        shrink(tl, body, .004, True); parts.append(tl)
    zr0 = at(L - .02)[0]
    df = patch("DIFFUSER", (X(L + .3), 0, zr0 + .07), (w * 1.5, .09), "-X", "CLADDING", radius=.2, res=(16, 2)); shrink(df, body, .003, True); parts.append(df)
    pr = patch("PLATE_R", (X(L + .3), 0, S["tail_z"] - (.30 if S["H"] < 1.6 else .42)), (.372, .134), "-X", "PLATE", radius=.15, res=(6, 2))
    shrink(pr, body, .006, True); parts.append(pr)
    if S.get("panel"):  # van rear doors: centre split, two windows
        sp = patch("REAR_SPLIT", (X(L + .3), 0, 1.15), (.012, 1.45), "-X", "GAP", radius=0, res=(1, 8)); shrink(sp, body, .003, True); parts.append(sp)
        for side in (1, -1):
            rwn = patch("REAR_GLASS", (X(L + .3), side * .40, 1.62), (.62, .40), "-X", "GLASS", radius=.4, res=(6, 4)); shrink(rwn, body, .003, True); parts.append(rwn)
        track = bar("SLIDE_TRACK", (X(2.0), w + .002, 1.16), (X(4.70), w + .002, 1.16), .012, .018, "TRIM_BLACK"); parts.append(track)
    # mirrors: housing on a short arm, glass facing back
    x_m = S["dlo"][0] + .06
    zb, zl, zt, w, g = at(x_m)
    for side in (1, -1):
        hz = ellipsoid("MIRROR", (X(x_m), side * (w + .085), zl + .065), (.075, .098, .058), "PAINT")
        parts.append(hz)
        arm = bar("MIRROR_ARM", (X(x_m + .02), side * (w - .01), zl + .03), (X(x_m), side * (w + .03), zl + .05), .04, .028, "TRIM_BLACK"); parts.append(arm)
        gl = patch("MIRROR_GLASS", (X(x_m) - .074, side * (w + .09), zl + .065), (.15, .075), "-X", "MIRROR_GLASS", radius=.6, res=(6, 3)); parts.append(gl)
    # door handles, flush to the panel
    for xh in S["handles"]:
        zb, zl, zt, w, g = at(xh)
        for side in (1, -1):
            hd = bar("HANDLE", (X(xh - .08), side * (w * .995 + .004), zl - .11), (X(xh + .08), side * (w * .995 + .004), zl - .11), .014, .026, "HANDLE"); parts.append(hd)
    if S.get("rails"):  # roof rails on the SUV
        for side in (1, -1):
            zb, zl, zt, w, g = at(2.6)
            yr = side * (w - S["tumble"] - .16)            # over the roof panel, inboard of the roof edge
            parts.append(bar("ROOF_RAIL", (X(2.10), yr, at(2.10)[2] + .012), (X(3.95), yr, at(3.95)[2] + .012), .028, .026, "TRIM_BLACK"))
            for xf in (2.10, 3.95):
                parts.append(bar("RAIL_FOOT", (X(xf), yr, at(xf)[2] - .05), (X(xf), yr, at(xf)[2] + .02), .045, .07, "TRIM_BLACK"))
    if S.get("step"):  # ute side steps and rear step bumper
        for side in (1, -1):
            parts.append(bar("SIDE_STEP", (X(1.35), side * (S["W"] / 2 - .05), .40), (X(3.10), side * (S["W"] / 2 - .05), .40), .14, .035, "TRIM_BLACK"))
        parts.append(bar("REAR_STEP", (X(L - .02), -S["W"] / 2 * .9, .50), (X(L - .02), S["W"] / 2 * .9, .50), .12, .07, "CLADDING"))
    if S["cladding"]:  # wheel-arch flares
        tw, R, rr = tyre_dims(S)
        ra = R + .06
        for xw in (S["fo"], S["fo"] + S["wb"]):
            for side in (1, -1):
                parts.append(arch_lip(S, X(xw), side, ra, at))
    for p in parts:
        for poly in p.data.polygons: poly.use_smooth = p.name.startswith(("MIRROR", "HEADLAMP", "TAIL"))
    return parts


def arch_lip(S, xc, side, ra, at):
    tw, R, rr = tyre_dims(S)
    bm = bmesh.new()
    zcut = at(S["fo"])[0] + .05
    a0 = math.asin(max(min((zcut - R) / (ra + .03), 1), -1))
    n = 20
    prof = [(0, 0), (.055, 0), (.055, .022), (0, .030)]       # (radial, outward) section
    rings = []
    zb, zl, zt, w, g = at(S["L"] / 2 - xc)
    for i in range(n + 1):
        a = a0 + (math.pi - 2 * a0) * i / n
        ca, sa = math.cos(a), math.sin(a)
        ring = []
        for dr, dy in prof:
            r = ra + dr
            ring.append(bm.verts.new((xc + ca * r, side * (S["W"] / 2 - .015 + dy), R + sa * r)))
        rings.append(ring)
    for i in range(n):
        for j in range(len(prof) - 1):
            bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("ARCH_FLARE"); bm.to_mesh(me); bm.free()
    me.materials.append(MATS["CLADDING"])
    ob = bpy.data.objects.new("ARCH_FLARE", me); bpy.context.scene.collection.objects.link(ob)
    return ob


# ------------------------------------------------------------------------------------------------ assembly + rig
def link(ob, coll):
    for c in list(ob.users_collection): c.objects.unlink(ob)
    coll.objects.link(ob)


def sharpen(ob, angle=38):
    me = ob.data
    for p in me.polygons: p.use_smooth = True
    bm = bmesh.new(); bm.from_mesh(me)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            a = e.link_faces[0].normal.angle(e.link_faces[1].normal, 0)
            m0, m1 = e.link_faces[0].material_index, e.link_faces[1].material_index
            e.smooth = a < math.radians(angle) and (m0 == m1 or a < math.radians(8))
    bm.to_mesh(me); bm.free()


def build_vehicle(body_key):
    S = SPEC[body_key]
    coll = bpy.data.collections.new(body_key.upper())
    bpy.context.scene.collection.children.link(coll)
    at = body_profile(S)
    L = S["L"]
    X = lambda x: L / 2 - x
    tw, R, rr = tyre_dims(S)
    body = build_body(S, "BODY")
    bpy.context.scene.collection.objects.link(body)
    # wheel wells: a pocket each side, lined dark
    ra = R + (.06 if S["cladding"] else .045)
    LIMIT[0] = L / 2 + .015
    for xw in (S["fo"], S["fo"] + S["wb"]):
        for side in (1, -1):   # an 0.80 m cylinder centred on the body side: a 0.40 m deep pocket, lined dark
            boolean(body, cutter_cyl(coll, (X(xw), side * S["W"] / 2, R), ra, .80, "ARCH"))
    if S.get("tub"):
        x0, x1, zf = S["tub"]
        boolean(body, cutter_box((X((x0 + x1) / 2), 0, zf + .7), (x1 - x0, S["W"] - .095, 1.4), "TRAY"))
    if S.get("cabgap"):
        g = S["cabgap"]
        boolean(body, cutter_box((X(g), 0, 1.0), (.012, S["W"] + .1, 1.0), "GAP"))
    sharpen(body)
    link(body, coll)
    parts = details(S, body, at)
    for p in parts:
        if not p.users_collection: bpy.context.scene.collection.objects.link(p)
    # join details into one mesh
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    det = bpy.context.active_object; det.name = "BODY_DETAIL"; det.data.name = "BODY_DETAIL"
    link(det, coll)
    root = bpy.data.objects.new("VEHICLE_ROOT", None); coll.objects.link(root)
    root.empty_display_type = "ARROWS"
    body.parent = root; det.parent = root
    contract_nodes = {"VEHICLE_ROOT": {"role": "turntable pivot: ground centre of the footprint", "blender": [0, 0, 0]}}
    for code, xw, side in (("FL", S["fo"], 1), ("FR", S["fo"], -1), ("RL", S["fo"] + S["wb"], 1), ("RR", S["fo"] + S["wb"], -1)):
        front = code[0] == "F"
        loc = (X(xw), side * S["track"] / 2, R)
        hub = bpy.data.objects.new(("STEER_" if front else "HUB_") + code, None); coll.objects.link(hub)
        hub.location = loc; hub.parent = root; hub.empty_display_size = .15
        spin = bpy.data.objects.new("WHEEL_" + code, None); coll.objects.link(spin)
        spin.parent = hub; spin.empty_display_size = .2
        wm = build_wheel(S, "WHEEL_MESH_" + code); coll.objects.link(wm); wm.parent = spin
        br = build_brake(S, "BRAKE_" + code, front); coll.objects.link(br); br.parent = hub
        if side < 0:  # mirror the right-hand wheel and brake so their faces point outward
            for o in (wm, br):
                o.scale.y = -1
                bpy.context.view_layer.objects.active = o
                bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
                bpy.ops.object.transform_apply(scale=True)
                bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
        for o in (wm, br): o["lesson_part_id"] = o.name
        contract_nodes[hub.name] = {"role": "steer pivot (about up axis)" if front else "hub (fixed)", "blender": list(loc)}
        contract_nodes[spin.name] = {"role": "wheel spin (about axle)", "blender": list(loc)}
    for o in coll.objects:
        o["assembl_vehicle"] = body_key
    return coll, S


def tri_count(coll):
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in coll.objects:
        if o.type == "MESH":
            me = o.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); n += len(me.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return n


def bbox(coll):
    mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in coll.objects:
        if o.type == "MESH":
            for v in o.data.vertices:
                p = o.matrix_world @ v.co
                mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    return mn, mx


def export(coll, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in coll.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_extras=True, export_texcoords=False, export_normals=True, export_animations=False, export_cameras=False, export_lights=False,
                              export_materials="EXPORT")


# ------------------------------------------------------------------------------------------------ studio + renders
def studio(scene, samples):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4; scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
    scene.render.use_persistent_data = True              # stills of one body differ only in paint: keep the BVH between frames
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    w = bpy.data.worlds.get("STUDIO") or bpy.data.worlds.new("STUDIO"); scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (*srgb_to_lin("#F5F1F2"), 1); bg.inputs[1].default_value = .55
    if "FLOOR" not in bpy.data.objects:
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0)); f = bpy.context.active_object; f.name = "FLOOR"; f.is_shadow_catcher = True
        for nm, loc, rot, size, e in (("SOFTBOX_TOP", (0, 0, 5.5), (0, 0, 0), (7, 3.5), 900), ("KEY", (5.5, -5.5, 3.2), (math.radians(60), 0, math.radians(45)), (3, 3), 650),
                                       ("RIM", (-5.5, 4, 2.6), (math.radians(65), 0, math.radians(-125)), (3, 2), 380), ("FILL", (-1, -7, 1.4), (math.radians(82), 0, 0), (5, 1.5), 160)):
            ld = bpy.data.lights.new(nm, "AREA"); ld.shape = "RECTANGLE"; ld.size, ld.size_y = size; ld.energy = e; ld.color = (1, .985, .99)
            lo = bpy.data.objects.new(nm, ld); lo.location = loc; lo.rotation_euler = rot; scene.collection.objects.link(lo)
    for nm in ("CAM",):
        if nm not in bpy.data.objects:
            cd = bpy.data.cameras.new(nm); co = bpy.data.objects.new(nm, cd); scene.collection.objects.link(co); scene.camera = co


def aim(cam, loc, target, lens):
    cam.location = loc; cam.data.lens = lens
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render_to(scene, path, res):
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = int(float(ARGS.get("scale", 1)) * 100)
    scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def set_paint(key):
    hx, met, ro, _ = PAINTS[key]
    b = MATS["PAINT"].node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb_to_lin(hx), 1); b.inputs["Metallic"].default_value = met; b.inputs["Roughness"].default_value = ro


def main():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"; scene.unit_settings.scale_length = 1.0
    make_materials()
    built, report = {}, {}
    keys = ONLY or list(SPEC)
    contract = {"contract": "assembl.vehicles.v1", "generator": "assets/models/vehicles/source/build_vehicles.py", "units": "metres",
                "coordinates": {"blender": "Z-up, nose +X, left side +Y", "gltf": "Y-up; (x, y, z)_blender -> (x, z, -y)_gltf; nose +X, up +Y, right side +Z",
                                "origin": "VEHICLE_ROOT at ground level, centre of the footprint (turntable pivot)",
                                "wheel_spin_axis_gltf": [0, 0, 1], "steer_axis_gltf": [0, 1, 0]},
                "paint_material": "PAINT", "paints": {k: {"hex": v[0], "metallic": v[1], "roughness": v[2], "label": v[3], "clearcoat": 1.0} for k, v in PAINTS.items()},
                "budget_per_vehicle": BUDGET, "vehicles": {}}
    for k in keys:
        # one vehicle at a time, so its node names are clean in the GLB; renamed "<KEY>:<node>" afterwards in the .blend
        coll, S = build_vehicle(k)
        built[k] = coll
        bpy.context.view_layer.update()
        path = ASSET / f"{k}.glb"
        export(coll, path)
        S = SPEC[k]
        tw, R, rr = tyre_dims(S)
        mn, mx = bbox(coll)
        nodes = {}
        for o in coll.objects:
            if o.name.split(".")[0] in ("VEHICLE_ROOT",) or o.name.startswith(("STEER_", "HUB_", "WHEEL_F", "WHEEL_R")) and not o.name.startswith("WHEEL_MESH"):
                p = o.matrix_world.translation
                nodes[o.name] = {"pivot_gltf_m": [round(p.x, 5), round(p.z, 5), round(-p.y, 5)]}
        size = path.stat().st_size
        tris = tri_count(coll)
        contract["vehicles"][k] = {"file": f"{k}.glb", "label": S["label"], "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": size,
                                   "dimensions_m": {"length": S["L"], "width": S["W"], "height": S["H"], "wheelbase": S["wb"], "track": S["track"],
                                                    "front_overhang": S["fo"], "tyre": "%d/%dR%d" % S["tyre"], "tyre_diameter": round(2 * R, 3)},
                                   "nodes": nodes, "wheel_radius_m": round(R, 4)}
        report[k] = {"tris": tris, "bytes": size, "bbox_m": {"min": [round(v, 3) for v in mn], "max": [round(v, 3) for v in mx]},
                     "measured": {"length": round(mx.x - mn.x, 3), "width_body": round(mx.y - mn.y, 3), "height": round(mx.z - mn.z, 3)},
                     "materials": sorted({m.name for o in coll.objects if o.type == "MESH" for m in o.data.materials if m})}
        print(f"[{k}] tris={tris} bytes={size} L={mx.x - mn.x:.3f} W={mx.y - mn.y:.3f} H={mx.z - mn.z:.3f}", flush=True)
        for o in coll.objects:
            o.name = f"{k.upper()}:{o.name}"
            if o.data is not None: o.data.name = o.name
    if not ONLY:
        (ASSET / "vehicles-rig-contract.json").write_text(json.dumps(contract, indent=1) + "\n")
        (ASSET / "build-report.json").write_text(json.dumps({"blender": bpy.app.version_string, "budget": BUDGET, "vehicles": report}, indent=1) + "\n")
        bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "vehicles.blend"), compress=True)
    if ARGS.get("render"):
        render_all(scene, built)


def render_all(scene, built):
    samples, still_samples = int(ARGS.get("samples", 96)), int(ARGS.get("still-samples", 40))
    studio(scene, samples)
    cam = bpy.data.objects["CAM"]
    (OUT / "stills").mkdir(parents=True, exist_ok=True)
    stock = json.loads((ASSET.parent.parent.parent / "cars" / "dealer-twin" / "data" / "stock.json").read_text())
    from_colour = {v[3].lower(): k for k, v in PAINTS.items()}
    combos = sorted({(c["body"], from_colour[c["colour"].lower()]) for c in stock["cars"]})
    which = ARGS.get("which", "hero,detail,stills").split(",")
    for k, coll in built.items():
        for c in built.values(): c.hide_render = c is not coll
        S = SPEC[k]
        if "hero" in which:
            scene.cycles.samples = samples; set_paint({"hatch": "pearl-white", "sedan": "midnight-blue", "wagon": "graphite", "suv": "sage", "ute": "silver", "van": "pearl-white"}[k])
            aim(cam, (7.6, -5.2, 1.55), (0, 0, S["H"] * .42), 58)
            render_to(scene, OUT / f"{k}-hero.png", (1200, 750))
        if "rear" in which:
            scene.cycles.samples = samples
            aim(cam, (-7.4, -5.6, 1.7), (0, 0, S["H"] * .45), 58)
            render_to(scene, OUT / f"{k}-rear.png", (1200, 750))
        if "detail" in which:
            scene.cycles.samples = samples
            tw, R, rr = tyre_dims(S)
            xf = S["L"] / 2 - S["fo"]
            aim(cam, (xf + 1.55, -S["W"] / 2 - 1.9, R + .55), (xf + .25, -S["W"] / 2, R + .22), 50)
            render_to(scene, OUT / f"{k}-detail.png", (800, 600))
        if "stills" in which:
            scene.cycles.samples = still_samples
            aim(cam, (8.4, -6.3, 1.75), (0, 0, .78), 50)     # ONE camera and scale for every body: a ute is bigger than a hatch
            for b, p in combos:
                if b != k: continue
                set_paint(p)
                render_to(scene, OUT / "stills" / f"{k}-{p}.png", (640, 480))
    set_paint("pearl-white")


if __name__ == "__main__":
    main()
