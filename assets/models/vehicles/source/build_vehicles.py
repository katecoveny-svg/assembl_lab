#!/usr/bin/env python3
"""assembl generic vehicle set: six unbranded vehicles for the dealer twin, built entirely by this script in Blender (bpy).

    python -m venv .venv && .venv/bin/pip install bpy==5.1.2          # once; not committed
    .venv/bin/python assets/models/vehicles/source/build_vehicles.py              # model + GLBs + contract + report
    .venv/bin/python assets/models/vehicles/source/build_vehicles.py --render     # + Cycles hero/detail renders and listing stills
      options: --only=hatch,ute   --samples=96   --still-samples=48   --which=hero,detail,stills,sheet   --out=<dir for PNG renders>

Writes (next to this folder):
  source/vehicles.blend                one scene, one collection per vehicle (editable, named parts, metres)
  <body>.glb                           hatch, sedan, wagon, suv, ute, van (Y-up glTF, metres, origin at ground centre)
  vehicles-rig-contract.json           node names, pivots, axes, colourways, budgets (generated from the real nodes)
  build-report.json                    triangles, bytes, materials, dimensions per vehicle
  <out>/<body>-hero.png, -detail.png   Cycles, transparent background (composited onto chalk by tools/compose_vehicle_images.py)
  <out>/stills/<body>-<paint>.png      Cycles listing stills, one fixed camera and scale (review only: the page shows drawings)
  <out>/sheet/<body>-{front,side}.png  contact-sheet views (review only)

HOW THE BODY IS MADE. Each body is lofted from longitudinal feature curves measured from the FRONT of the vehicle (x, metres):
  crest  the centre-line top: nose, bonnet, windscreen, roof, rear window, boot or tailgate
  belt   the beltline: wing tops in front, base of the side glass, rear deck
  rail   the roof side rail (top of the side glass)
  low    the bottom of the body (bumper lips, sills)
  setF/setR  the plan view: how far each lateral fraction of the half-width is set back from the nose and tail
Every cross-section is a chain with creases: underbody, rocker, lower door, a slight door scallop, the SHOULDER CREASE (widest
point), the shoulder, the BELT, the greenhouse side with tumblehome, the ROOF RAIL, and the top. The top surface is
crest(x - sweep * eta^2) - crown * eta^2 (eta = lateral fraction): the windscreen and rear window wrap round the corners and the
A- and C-pillars fall out of the same surface instead of being painted on. Openings are cut, not painted: every window,
headlamp, grille and intake is outlined in 2D, ray-cast onto the body, turned into a cutter and subtracted (exact booleans),
so glass sits ~10 mm inside a black seal with a dark frit band, and lamps sit in recessed housings with projectors and a DRL.

The vehicles are GENERIC: typical New Zealand used-stock proportions (length, width, height, wheelbase, overhangs, tyre sizes,
ground clearance) and real construction cues, with no badges, logos, lettering or any manufacturer's signature design.

Axes: built Z-up in Blender with the nose toward +X, left side +Y. The glTF exporter writes Y-up: (x, y, z) -> (x, z, -y).
So in three.js: +X forward, +Y up, +Z = the vehicle's RIGHT side. Wheels spin about glTF Z; front hubs steer about glTF Y.
Honest simplifications: in the GLB the glass is opaque dark tinted (there is no interior in the web model); the Cycles renders
swap in a thin tinted glass and show a render-only blockout interior (right-hand drive). Lamps are shapes, not optics.
"""
import bpy, bmesh, math, json, sys, os, hashlib, pathlib
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = pathlib.Path(__file__).resolve().parent
ASSET = HERE.parent
ARGS = {a.split("=")[0].lstrip("-"): (a.split("=", 1)[1] if "=" in a else True) for a in sys.argv[1:] if a.startswith("--")}
ONLY = [s for s in str(ARGS.get("only", "")).split(",") if s]
OUT = pathlib.Path(ARGS.get("out", str(ASSET / "renders-png")))

# ------------------------------------------------------------------------------------------------ specs (metres)
# tyre = (width mm, aspect %, rim inch). All x are measured from the FRONT of the vehicle.
# windows: (front edge line or None, rear edge line or None), an edge line = (x at the belt, x at the roof rail).
SPEC = {
  "hatch": dict(label="Small hybrid hatch", L=4.050, W=1.695, H=1.455, wb=2.550, fo=0.800, track=1.470, tyre=(175, 65, 15), rim="ten",
    arch_gap=.030, flare=.010, cladding=False, tumble=24, ledge=.045, dsh=.105, crown=.055, swf=.14, swr=.08, xmid=2.6,
    low=[(0, .43), (.012, .33), (.045, .27), (.13, .235), (.32, .215), (.6, .20), (1.2, .185), (2.95, .185), (3.6, .205), (3.82, .235), (3.94, .27), (4.0, .31), (4.04, .38), (4.05, .48)],
    crest=[(0, .50), (.012, .58), (.045, .66), (.11, .72), (.22, .76), (.45, .81), (.72, .865), (.93, .91), (1.0, .93), (1.12, 1.0), (1.35, 1.155), (1.58, 1.30), (1.78, 1.39),
           (1.95, 1.435), (2.2, 1.452), (2.5, 1.455), (2.85, 1.44), (3.15, 1.415), (3.45, 1.375), (3.66, 1.34), (3.70, 1.335), (3.74, 1.31), (3.84, 1.18), (3.93, 1.06), (3.99, .975),
           (4.03, .89), (4.045, .80), (4.05, .62)],
    belt=[(0, .47), (.05, .56), (.15, .64), (.3, .68), (.6, .755), (.9, .817), (1.12, .87), (1.5, .91), (2.2, .955), (2.9, .99), (3.4, 1.025), (3.70, 1.045), (3.9, 1.03), (3.98, .98),
          (4.03, .87), (4.05, .66)],
    rail=[(1.45, 1.25), (1.8, 1.355), (2.3, 1.38), (2.8, 1.365), (3.2, 1.335), (3.5, 1.29), (3.75, 1.25)],
    setF=[(0, 0), (.3, .010), (.5, .032), (.65, .068), (.78, .125), (.88, .20), (.95, .285), (.985, .35), (1, .42)],
    setR=[(0, 0), (.4, .010), (.6, .028), (.75, .058), (.87, .105), (.95, .165), (1, .24)],
    ws=(.98, 1.92), rw=(3.73, 3.985), ws_band=.045, rw_band=.07, tg=dict(hw=.52, z=(.56, .84)),
    windows=[(None, (2.15, 2.12)), ((2.245, 2.215), (3.16, 2.94))], appliques=[(2.15, 2.245)],
    gaps=[1.06, 2.20, 3.06], bonnet=.16, tailgate=3.985,
    head=dict(c=(.55, .30), th=(12, 84), h=(.085, .05), margin=.012), grille=dict(hw=.30, h=.075, margin=.03), intake=dict(hw=.42, z=(.27, .44)),
    tail=dict(c=(.30, .30), th=(14, 78), z=(.84, .94)), plate_f=.355, plate_r=.64),
  "sedan": dict(label="Sedan", L=4.690, W=1.800, H=1.445, wb=2.750, fo=0.930, track=1.560, tyre=(215, 55, 17), rim="five_twin",
    arch_gap=.032, flare=.010, cladding=False, tumble=25, ledge=.050, dsh=.11, crown=.055, swf=.15, swr=.12, xmid=2.85,
    low=[(0, .44), (.012, .34), (.05, .28), (.15, .24), (.4, .215), (.7, .20), (1.3, .19), (3.3, .19), (3.95, .20), (4.3, .235), (4.52, .28), (4.64, .35), (4.68, .43), (4.69, .50)],
    crest=[(0, .52), (.012, .60), (.05, .67), (.13, .725), (.28, .765), (.6, .82), (1.0, .875), (1.28, .92), (1.36, .945), (1.5, 1.03), (1.75, 1.175), (2.0, 1.30), (2.2, 1.375),
           (2.38, 1.42), (2.6, 1.44), (2.85, 1.445), (3.1, 1.435), (3.28, 1.41), (3.40, 1.385), (3.55, 1.315), (3.75, 1.21), (3.95, 1.11), (4.08, 1.075), (4.25, 1.08), (4.50, 1.08),
           (4.62, 1.07), (4.665, 1.01), (4.685, .88), (4.688, .70), (4.69, .57)],
    belt=[(0, .49), (.05, .57), (.15, .635), (.3, .67), (.6, .745), (1.0, .805), (1.3, .845), (1.51, .89), (2.0, .93), (2.8, .965), (3.5, 1.0), (3.95, 1.03), (4.3, 1.04), (4.55, 1.035),
          (4.64, 1.0), (4.68, .90), (4.69, .65)],
    rail=[(1.9, 1.29), (2.3, 1.36), (2.8, 1.375), (3.2, 1.355), (3.45, 1.31)],
    setF=[(0, 0), (.3, .010), (.5, .032), (.65, .068), (.78, .13), (.88, .21), (.95, .30), (.985, .37), (1, .44)],
    setR=[(0, 0), (.4, .010), (.6, .030), (.75, .065), (.87, .12), (.95, .19), (1, .27)],
    ws=(1.36, 2.40), rw=(3.42, 4.07), ws_band=.045, rw_band=.10, bootlid=True,
    windows=[(None, (2.66, 2.63)), ((2.75, 2.72), (3.52, 3.30))], appliques=[(2.66, 2.75)],
    gaps=[1.50, 2.705, 3.60], bonnet=.18, tailgate=4.10,
    head=dict(c=(.60, .32), th=(10, 84), h=(.082, .05), margin=.014), grille=dict(hw=.33, h=.07, margin=.03), intake=dict(hw=.47, z=(.27, .45)),
    tail=dict(c=(.36, .32), th=(10, 80), z=(.88, .99)), plate_f=.36, plate_r=.77),
  "wagon": dict(label="Station wagon", L=4.660, W=1.790, H=1.475, wb=2.700, fo=0.920, track=1.550, tyre=(205, 55, 16), rim="six",
    arch_gap=.032, flare=.010, cladding=False, tumble=23, ledge=.050, dsh=.11, crown=.055, swf=.15, swr=.06, xmid=2.9, privacy=True,
    low=[(0, .44), (.012, .34), (.05, .28), (.15, .24), (.4, .215), (.7, .20), (1.3, .19), (3.3, .19), (3.95, .205), (4.28, .24), (4.5, .28), (4.62, .35), (4.655, .43), (4.66, .50)],
    crest=[(0, .52), (.012, .60), (.05, .67), (.13, .725), (.28, .765), (.6, .82), (1.0, .875), (1.27, .92), (1.35, .945), (1.49, 1.03), (1.74, 1.175), (1.99, 1.31), (2.18, 1.39),
           (2.38, 1.44), (2.65, 1.47), (3.0, 1.475), (3.6, 1.47), (4.05, 1.455), (4.32, 1.43), (4.42, 1.415), (4.47, 1.36), (4.54, 1.20), (4.59, 1.06), (4.625, .98), (4.65, .86),
           (4.658, .72), (4.66, .57)],
    belt=[(0, .49), (.05, .57), (.15, .635), (.3, .67), (.6, .745), (1.0, .805), (1.3, .845), (1.50, .89), (2.0, .925), (2.8, .96), (3.6, .995), (4.2, 1.02), (4.45, 1.03), (4.55, 1.02),
          (4.62, .97), (4.65, .87), (4.66, .65)],
    rail=[(1.9, 1.30), (2.3, 1.38), (2.9, 1.40), (3.6, 1.395), (4.1, 1.375), (4.38, 1.335)],
    setF=[(0, 0), (.3, .010), (.5, .032), (.65, .068), (.78, .13), (.88, .21), (.95, .30), (.985, .37), (1, .44)],
    setR=[(0, 0), (.4, .008), (.6, .022), (.75, .05), (.87, .095), (.95, .15), (1, .22)],
    ws=(1.35, 2.38), rw=(4.43, 4.59), ws_band=.045, rw_band=.075, tg=dict(hw=.58, z=(.58, .90)),
    windows=[(None, (2.62, 2.59)), ((2.71, 2.68), (3.42, 3.40)), ((3.52, 3.50), (4.30, 4.18))], appliques=[(2.62, 2.71), (3.42, 3.52)],
    gaps=[1.49, 2.665, 3.47], bonnet=.18, tailgate=4.60,
    head=dict(c=(.60, .32), th=(10, 84), h=(.082, .05), margin=.014), grille=dict(hw=.33, h=.07, margin=.03), intake=dict(hw=.47, z=(.27, .45)),
    tail=dict(c=(.32, .32), th=(12, 82), z=(.90, 1.01)), plate_f=.36, plate_r=.68),
  "suv": dict(label="Mid-size SUV", L=4.600, W=1.855, H=1.690, wb=2.690, fo=0.920, track=1.600, tyre=(225, 65, 17), rim="six",
    arch_gap=.045, flare=0, cladding=True, tumble=20, ledge=.055, dsh=.12, crown=.06, swf=.16, swr=.07, xmid=3.0, rails=True, privacy=True,
    low=[(0, .56), (.012, .45), (.05, .38), (.15, .33), (.4, .30), (.7, .285), (1.3, .26), (3.3, .26), (3.85, .275), (4.2, .31), (4.45, .36), (4.56, .43), (4.595, .52), (4.60, .60)],
    crest=[(0, .66), (.012, .77), (.05, .87), (.12, .945), (.25, .99), (.55, 1.03), (.9, 1.075), (1.15, 1.11), (1.30, 1.135), (1.45, 1.235), (1.7, 1.385), (1.95, 1.52), (2.12, 1.60),
           (2.3, 1.65), (2.6, 1.68), (3.0, 1.69), (3.5, 1.685), (3.9, 1.665), (4.2, 1.635), (4.33, 1.61), (4.38, 1.55), (4.46, 1.38), (4.52, 1.21), (4.565, 1.12), (4.59, .98),
           (4.598, .80), (4.60, .66)],
    belt=[(0, 1.3), (1.3, 1.3), (1.46, 1.075), (2.0, 1.105), (2.5, 1.13), (3.2, 1.16), (3.8, 1.185), (4.2, 1.20), (4.4, 1.20), (4.5, 1.18), (4.57, 1.12), (4.6, .90)],
    rail=[(1.9, 1.48), (2.4, 1.585), (3.0, 1.60), (3.7, 1.59), (4.1, 1.565), (4.32, 1.53)],
    setF=[(0, 0), (.3, .010), (.5, .030), (.65, .062), (.78, .115), (.88, .19), (.95, .27), (.985, .33), (1, .40)],
    setR=[(0, 0), (.4, .008), (.6, .022), (.75, .05), (.87, .095), (.95, .15), (1, .22)],
    ws=(1.30, 2.28), rw=(4.34, 4.52), ws_band=.05, rw_band=.075, tg=dict(hw=.62, z=(.66, 1.02)),
    windows=[(None, (2.50, 2.47)), ((2.60, 2.57), (3.36, 3.33)), ((3.46, 3.43), (3.98, 3.84))], appliques=[(2.50, 2.60), (3.36, 3.46)],
    gaps=[1.44, 2.55, 3.40], bonnet=.20, tailgate=4.54,
    head=dict(c=(.60, .34), th=(10, 82), h=(.09, .055), margin=.012), grille=dict(hw=.36, h=.13, margin=.03, slats=3), intake=dict(hw=.50, z=(.40, .55)),
    tail=dict(c=(.32, .34), th=(12, 82), z=(1.03, 1.12)), plate_f=.47, plate_r=.82),
  "ute": dict(label="Double-cab ute", L=5.330, W=1.860, H=1.815, wb=3.220, fo=0.900, track=1.570, tyre=(265, 65, 17), rim="six_ute",
    arch_gap=.055, flare=0, cladding=True, tumble=14, ledge=.035, dsh=.10, crown=.05, swf=.14, swr=0, xmid=2.8,
    low=[(0, .64), (.012, .56), (.05, .51), (.15, .47), (.35, .455), (.6, .45), (1.1, .46), (1.3, .49), (3.2, .49), (3.3, .55), (4.9, .55), (5.1, .57), (5.25, .60), (5.32, .66), (5.33, .72)],
    crest=[(0, .82), (.012, .94), (.04, 1.03), (.09, 1.085), (.18, 1.11), (.5, 1.135), (.9, 1.16), (1.3, 1.19), (1.40, 1.205), (1.55, 1.31), (1.8, 1.48), (2.05, 1.64), (2.2, 1.72),
           (2.4, 1.79), (2.7, 1.812), (3.0, 1.815), (3.12, 1.81), (3.165, 1.795), (3.18, 1.70), (3.19, 1.40), (3.20, 1.255), (3.24, 1.245), (5.25, 1.245), (5.30, 1.225),
           (5.325, 1.15), (5.33, .95)],
    belt=[(0, .78), (.05, .95), (.15, 1.02), (.3, 1.055), (.6, 1.082), (1.0, 1.108), (1.3, 1.127), (1.54, 1.155), (2.2, 1.18), (3.1, 1.205), (3.25, 1.21), (5.25, 1.215), (5.31, 1.19),
          (5.33, .95)],
    rail=[(2.0, 1.60), (2.5, 1.71), (3.05, 1.72), (3.16, 1.70)],
    setF=[(0, 0), (.3, .008), (.5, .022), (.65, .045), (.78, .085), (.88, .14), (.95, .21), (.985, .27), (1, .33)],
    setR=[(0, 0), (.6, .004), (.8, .012), (.92, .03), (.98, .06), (1, .09)],
    ws=(1.40, 2.40), rw=None, ws_band=.05, rw_band=.06,
    windows=[(None, (2.50, 2.47)), ((2.60, 2.57), (3.07, 3.06))], appliques=[(2.50, 2.60)],
    gaps=[1.50, 2.55, 3.12], bonnet=.16, tailgate=5.31, tub=(3.265, 5.275, .80), cabgap=3.215, step=True,
    cab_window=dict(hw=.42, z=(1.36, 1.64)),
    head=dict(c=(.62, .40), th=(4, 80), h=(.085, .07), margin=.014), grille=dict(hw=.40, h=.24, margin=.025, slats=4), intake=dict(hw=.52, z=(.52, .66)),
    tail=dict(c=(.25, .38), th=(25, 88), z=(.98, 1.17), vertical=True), plate_f=.73, plate_r=.86),
  "van": dict(label="Long-wheelbase van", L=5.265, W=1.880, H=1.990, wb=3.110, fo=0.820, track=1.650, tyre=(215, 70, 16), rim="steel",
    arch_gap=.045, flare=0, cladding=False, tumble=7, ledge=.020, dsh=.07, crown=.04, swf=.07, swr=0, xmid=3.0,
    low=[(0, .52), (.012, .42), (.05, .35), (.15, .30), (.35, .27), (.6, .255), (1.2, .25), (3.4, .25), (4.6, .26), (4.95, .29), (5.15, .33), (5.24, .38), (5.265, .44)],
    crest=[(0, .62), (.012, .74), (.04, .85), (.10, .94), (.20, .99), (.45, 1.04), (.70, 1.085), (.82, 1.11), (.88, 1.13), (1.0, 1.27), (1.15, 1.47), (1.30, 1.67), (1.42, 1.81),
           (1.55, 1.92), (1.75, 1.975), (2.1, 1.99), (5.1, 1.99), (5.2, 1.985), (5.25, 1.97), (5.265, 1.93)],
    belt=[(0, .60), (.05, .80), (.15, .90), (.3, .955), (.6, 1.015), (.9, 1.073), (.95, 1.09), (1.5, 1.11), (2.0, 1.12), (5.15, 1.13), (5.24, 1.10), (5.265, 1.0)],
    rail=[(1.4, 1.72), (1.7, 1.835), (2.1, 1.845), (5.1, 1.85), (5.2, 1.84)],
    setF=[(0, 0), (.3, .008), (.5, .024), (.65, .05), (.78, .095), (.88, .15), (.95, .21), (.985, .26), (1, .31)],
    setR=[(0, 0), (.6, .003), (.85, .015), (.95, .04), (1, .09)],
    ws=(.88, 1.55), rw=None, ws_band=.05, rw_band=.06,
    windows=[(None, (1.86, 1.84))], appliques=[], gaps=[1.00, 1.92, 2.98], bonnet=.24, tailgate=None,
    rear_windows=dict(y=(.07, .62), z=(1.42, 1.80)), panel=True,
    head=dict(c=(.60, .40), th=(6, 80), h=(.12, .08), margin=.015), grille=dict(hw=.40, h=.16, margin=.03, slats=3), intake=dict(hw=.50, z=(.36, .50)),
    tail=dict(c=(.18, .30), th=(64, 92), z=(.66, 1.05), vertical=True), plate_f=.43, plate_r=.60),
}

# Paint colourways (sRGB hex, metallic, base roughness). Real automotive colours for real-world-coloured listings; the
# brand palette is for the page and the backdrop, not the paint. The listing's colour name maps to one of these.
PAINTS = {
  "pearl-white": ("#E9E7E1", .15, .30, "Pearl white"), "silver": ("#A9ACAF", .85, .32, "Silver metallic"), "graphite": ("#4B4E53", .75, .33, "Graphite grey"),
  "black": ("#121214", .25, .26, "Black"), "red-mica": ("#7E1622", .55, .30, "Red mica"), "midnight-blue": ("#1C2A47", .65, .30, "Midnight blue"),
  "sage": ("#7D8B78", .45, .33, "Sage green"), "deep-plum": ("#3E1B36", .55, .30, "Deep plum"), "sand": ("#BDAE92", .40, .33, "Sand"),
}
BUDGET = {"tris": 40000, "bytes": 1_200_000, "textures": 0}
HERO_PAINT = {"hatch": "pearl-white", "sedan": "midnight-blue", "wagon": "graphite", "suv": "sage", "ute": "silver", "van": "pearl-white"}


def srgb_to_lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((v / 12.92) if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


def smooth(e0, e1, v):
    t = min(max((v - e0) / (e1 - e0), 0), 1)
    return t * t * (3 - 2 * t)


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
        lo, hi = 0, n - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if xs[mid] <= x: lo = mid
            else: hi = mid
        i = lo
        h = xs[i + 1] - xs[i]; t = (x - xs[i]) / h
        h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
        return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
    return f


def inverse(pts):
    """pts = [(eta, setback)] increasing in both: returns setback -> eta."""
    f = pchip(pts)
    top = pts[-1][1]
    def g(s):
        if s <= 0: return 0.0
        if s >= top: return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(36):
            mid = (lo + hi) / 2
            if f(mid) < s: lo = mid
            else: hi = mid
        return (lo + hi) / 2
    return g


def cr(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2))


def chain(pts, subs):
    """Catmull-Rom through pts (one-sided at the ends, so a chain can meet another at a crease)."""
    out, n = [pts[0]], len(pts)
    for s in range(n - 1):
        p1, p2 = pts[s], pts[s + 1]
        p0 = pts[s - 1] if s > 0 else tuple(2 * a - b for a, b in zip(p1, p2))
        p3 = pts[s + 2] if s + 2 < n else tuple(2 * a - b for a, b in zip(p2, p1))
        for k in range(1, subs[s] + 1):
            out.append(cr(p0, p1, p2, p3, k / subs[s]))
    return out


# ------------------------------------------------------------------------------------------------ 2D outlines
def area2(poly):
    return sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) / 2


def resample(poly, step):
    n = len(poly)
    segs = [(poly[i], poly[(i + 1) % n]) for i in range(n)]
    total = sum(math.dist(a, b) for a, b in segs)
    k = max(8, int(round(total / step)))
    out, acc, si = [], 0.0, 0
    lens = [math.dist(a, b) for a, b in segs]
    for j in range(k):
        target = j * total / k
        while si < n - 1 and acc + lens[si] < target: acc += lens[si]; si += 1
        a, b = segs[si]
        t = 0 if lens[si] < 1e-12 else (target - acc) / lens[si]
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def chaikin(poly, it=3):
    for _ in range(it):
        n = len(poly); nxt = []
        for i in range(n):
            a, b = poly[i], poly[(i + 1) % n]
            nxt += [(.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]), (.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1])]
        poly = nxt
    return poly


def rounded(poly, r=.03, step=.012):
    """Corner-rounded, evenly spaced closed outline (counter-clockwise)."""
    p = resample(poly, r)
    p = chaikin(p, 3)
    p = resample(p, step)
    if area2(p) < 0: p = p[::-1]
    return p


def inset(poly, d):
    n, out = len(poly), []
    for i in range(n):
        a, b = poly[i - 1], poly[(i + 1) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        out.append((poly[i][0] - ty / l * d, poly[i][1] + tx / l * d))       # CCW: left normal points inward
    return out


def clip(poly, keep):
    """Sutherland-Hodgman against the half-plane keep(p) >= 0 (keep is affine)."""
    out = []
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]
        fa, fb = keep(a), keep(b)
        if fb >= 0:
            if fa < 0: t = fa / (fa - fb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            out.append(b)
        elif fa >= 0:
            t = fa / (fa - fb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


# ------------------------------------------------------------------------------------------------ materials
MATS = {}


def mat(name, color, metallic=0., rough=.5, coat=0., coat_rough=.03, emit=None, alpha=1.):
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
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.surface_render_method = "BLENDED"
        except Exception: pass
    m.diffuse_color = (*srgb_to_lin(color), 1)
    MATS[name] = m
    return m


def make_materials(paint="pearl-white"):
    hx, met, ro, _ = PAINTS[paint]
    mat("PAINT", hx, met, ro, coat=1.0, coat_rough=.03)
    mat("GLASS", "#15191C", 0., .04)                   # web: opaque dark tinted glass (no interior in the GLB); Cycles swaps a thin tinted glass
    mat("GLASS_DARK", "#0D0F11", 0., .04)              # factory privacy glass behind the B-pillar on SUVs, wagons, utes and vans
    mat("FRIT", "#0C0C0D", 0., .18)                    # the black ceramic band round fixed glass
    mat("SEAL", "#0E0E0F", 0., .55)                    # rubber seals: the walls of every glass opening
    mat("TRIM_BLACK", "#111113", 0., .32)              # gloss-black pillar appliques, mirror arms, grille
    mat("GAP", "#060607", 0., .9)
    mat("UNDER", "#1A1A1C", 0., .85)
    mat("ARCH", "#0F0F10", 0., .95)                    # wheel-arch liners
    mat("CLADDING", "#1E1E20", 0., .78)                # textured-look unpainted plastic
    mat("TRAY", "#161618", 0., .8)
    mat("TYRE", "#161617", 0., .86)
    mat("RIM", "#C2C5C8", .9, .24)
    mat("RIM_INNER", "#55585C", .8, .42)
    mat("STEEL_WHEEL", "#2A2B2D", .5, .45)
    mat("BRAKE", "#77746F", .85, .38)
    mat("CALIPER", "#2E2F33", .3, .45)
    mat("HOUSING", "#3B3E43", 1., .22)                 # headlamp reflector housing
    mat("PROJECTOR", "#DDE0E3", 1., .08)
    mat("DRL", "#F2F3F1", 0., .25)
    mat("LENS", "#F4F6F8", 0., .02, alpha=.18)          # clear lamp lens; Cycles swaps a thin clear glass
    mat("TAIL_LENS", "#8E0E18", 0., .14)
    mat("TAIL_DARK", "#3A0509", 0., .12)
    mat("TAIL_WHITE", "#D9D9D6", 0., .2)               # reversing lamp
    mat("PLATE", "#EDEDEA", 0., .5)                    # a blank plate: no characters
    mat("MIRROR_GLASS", "#9DA3A8", 1., .02)
    mat("CAP_OPEN", "#FF00FF", 0., .5)                 # build-time only: the inner caps of window cutters, deleted after the cut


# ------------------------------------------------------------------------------------------------ the body surface
class Body:
    """Analytic body for one vehicle: x measured from the front (metres), y lateral (+ left), z up."""
    def __init__(self, S):
        self.S = S; self.L = S["L"]; self.W2 = S["W"] / 2
        self.crest, self.belt, self.low = pchip(S["crest"]), pchip(S["belt"]), pchip(S["low"])
        self.rail_f, self.rail_rng = pchip(S["rail"]), (S["rail"][0][0], S["rail"][-1][0])
        self.gF, self.gR = inverse(S["setF"]), inverse(S["setR"])
        self.tanT = math.tan(math.radians(S["tumble"]))
        self.tw, self.R, self.rr = tyre_dims(S)
        self.ra = self.R + S["arch_gap"]
        self.xf, self.xr = S["fo"], S["fo"] + S["wb"]

    def X(self, x): return self.L / 2 - x

    def rail(self, x):
        a, b = self.rail_rng
        return self.rail_f(x) if a <= x <= b else 9.

    def sweep(self, x):
        """How far the top surface is swept back (front) or forward (rear) at the sides: only round the windscreen and
        the rear window, fading out over the bonnet and boot so the nose and tail keep their own plan shape."""
        S = self.S
        if x <= S["xmid"]: return -S["swf"] * smooth(S["ws"][0] - .45, S["ws"][0] - .05, x)
        rw1 = S["rw"][1] if S["rw"] else self.L
        return S["swr"] * (1 - smooth(rw1 - .10, rw1 + .03, x))

    def topf(self, x, e):
        S = self.S
        xx = min(max(0., x + self.sweep(x) * e * e), self.L)
        return self.crest(xx) - S["crown"] * e * e

    def eta_plan(self, x):
        return min(self.gF(x), self.gR(self.L - x))

    def width(self, x):
        S, W2 = self.S, self.W2 - self.S["flare"]
        k = 1.0
        a, b = self.xf + self.R, self.xr - self.R
        if a < x < b: k -= .009 * math.sin(math.pi * (x - a) / (b - a))      # the body pinches a little between the arches
        return W2 * self.eta_plan(x) * k

    def stack(self, x):
        S = self.S
        zl, zt = self.low(x), self.crest(x)
        zb = max(min(self.belt(x), self.topf(x, 1.0) - .006, zt - .012), zl + .03)   # wing tops and deck edges meet the bonnet/boot
        zsh = min(zb - .25 * (zb - zl), max(zl + .55 * (zb - zl), zb - S["dsh"]))
        ts = self.topf(x, 1.0)
        zs = min(max(ts, zb + .006), max(self.rail(x), zb + .006), zt - .003)
        zs = max(zs, zb + .004)
        w = self.width(x)
        e = self.eta_plan(x)
        wg = w - S["ledge"] * min(1., e * 1.15)
        ys = max(wg - (zs - zb) * self.tanT, .25 * w)
        return dict(zl=zl, zt=zt, zb=zb, zsh=zsh, zs=zs, ts=ts, w=w, wg=wg, ys=ys)

    TOP_E = [.985, .93, .82, .64, .40, 0.]
    LOW_SUB = [1, 1, 1, 2, 2, 2]
    SH_SUB = [1, 2]
    GH_SUB = [2]
    TOP_SUB = [1, 1, 1, 2, 2, 2]

    def section(self, x):
        """Half cross-section from the underbody centre to the roof centre: list of (y, z) and per-edge class."""
        k = self.stack(x)
        zl, zt, zb, zsh, zs, w, wg, ys = k["zl"], k["zt"], k["zb"], k["zsh"], k["zs"], k["w"], k["wg"], k["ys"]
        f = min(1., (zsh - zl) / .4)
        low = [(0, zl), (.78 * w, zl), (.93 * w, zl + .006), (.977 * w, zl + .04 * f), (.997 * w, zl + .32 * (zsh - zl)), (.990 * w, zl + .66 * (zsh - zl)), (w, zsh)]
        sh = [(w, zsh), (w - .25 * (w - wg), zsh + .62 * (zb - zsh)), (wg, zb)]
        gh = [(wg, zb), (ys, zs)]
        f1 = self.topf(x, 1.0)
        corr = zs - f1
        top = [(ys, zs)] + [(e * ys, self.topf(x, e) + corr * e ** 6) for e in self.TOP_E]
        pts, cls = [], []
        for part, subs, base in ((low, self.LOW_SUB, 0), (sh, self.SH_SUB, 6), (gh, self.GH_SUB, 8), (top, self.TOP_SUB, 9)):
            c = chain(part, subs)
            seg = [base + i for i, s in enumerate(subs) for _ in range(s)]
            if pts: c = c[1:]
            pts += c; cls += seg
        return pts, cls

    CREASES = None   # ring indices (one side) of the shoulder crease, belt and roof rail

    def crease_index(self):
        a = sum(self.LOW_SUB); b = a + sum(self.SH_SUB); c = b + sum(self.GH_SUB)
        return (a, b, c)


def tyre_dims(S):
    w, a, rim = S["tyre"]
    R = (rim * 25.4 + 2 * w * a / 100) / 2000
    return w / 1000, R, rim * 25.4 / 2000


def stations(B):
    S, L = B.S, B.L
    xs = set()
    n = int(L / .045)
    for i in range(1, n): xs.add(round(i * L / n, 4))
    for e in [.06, .12, .2, .3, .4, .5, .6, .7, .78, .85, .9, .94, .97, .99]:
        xs.add(round(pchip(S["setF"])(e), 4)); xs.add(round(L - pchip(S["setR"])(e), 4))
    for v in [.002, .006, .012, .02, .03, .045]: xs.add(v); xs.add(round(L - v, 4))
    feats = list(S["gaps"]) + [S["bonnet"]] + ([S["tailgate"]] if S.get("tailgate") else [])
    xs = sorted(xs)
    keep = []
    for x in xs:
        if any(abs(x - g) < .012 for g in feats): continue
        if keep and x - keep[-1] < .006: continue
        keep.append(x)
    for g in feats: keep += [round(g - .0045, 4), round(g + .0045, 4)]
    keep = sorted(set(k for k in keep if 0 <= k <= L))
    return [0.0] + [k for k in keep if 0 < k < L] + [L]


def build_body(B, name):
    S, L = B.S, B.L
    bm = bmesh.new()
    rings, xs = [], stations(B)
    cls = None
    for x in xs:
        half, cls = B.section(x)
        X = B.X(x)
        ring = [bm.verts.new((X, y, z)) for y, z in half] + [bm.verts.new((X, -y, z)) for y, z in reversed(half[1:-1])]
        rings.append((x, ring))
    n = len(rings[0][1]); hs = len(half) - 1
    names = ["PAINT", "GAP", "UNDER", "CLADDING", "TRIM_BLACK"]
    gap = lambda x, xs_: any(abs(x - g) < .0046 for g in xs_)
    ws0 = S["ws"][0]
    for (x0, r0), (x1, r1) in zip(rings, rings[1:]):
        xm = (x0 + x1) / 2
        st = B.stack(xm)
        for j in range(n):
            k = (j + 1) % n
            f = bm.faces.new((r0[j], r0[k], r1[k], r1[j]))
            s = cls[j] if j < hs else cls[n - j - 1]
            m = "PAINT"
            if s <= 1: m = "UNDER"
            elif s in (2, 3) and S["cladding"]: m = "CLADDING"
            elif 2 <= s <= 7 and gap(xm, S["gaps"]): m = "GAP"
            elif s == 8 and st["zs"] - st["zb"] < .02 and (xm < ws0 + S["swf"] or (S.get("bootlid") and xm > S["rw"][1])): m = "GAP"   # bonnet / boot-lid side shut lines
            elif s >= 8 and gap(xm, [S["bonnet"]]): m = "GAP"
            elif S.get("tailgate") and not S.get("tg") and gap(xm, [S["tailgate"]]) and s >= 8: m = "GAP"
            f.material_index = names.index(m)
    # the end rings have zero width: weld them into a line so the nose and tail close without a cap
    for idx in (0, -1):
        for v in rings[idx][1]: v.co.y = 0.
    bmesh.ops.remove_doubles(bm, verts=rings[0][1] + rings[-1][1], dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-7, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # creases: shoulder, belt and roof rail run the length of the body
    ci = B.crease_index()
    crease_rings = set()
    for c in ci: crease_rings |= {c, n - c}
    for e in bm.edges:
        e.smooth = True
    ring_of = {}
    for i, (_, r) in enumerate(rings):
        for j, v in enumerate(r):
            if v.is_valid: ring_of[v] = (i, j)
    for e in bm.edges:
        a, b = e.verts
        if a in ring_of and b in ring_of:
            (ia, ja), (ib, jb) = ring_of[a], ring_of[b]
            if ia != ib and ja == jb and ja in crease_rings: e.smooth = False
    flare(B, bm)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for nm in names: me.materials.append(MATS[nm])
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def flare(B, bm):
    """A soft lip round each wheel arch (pushes the side out by up to S.flare just outside the opening)."""
    S = B.S
    fl = S["flare"]
    if not fl: return
    for v in bm.verts:
        if abs(v.co.y) < B.W2 * .8: continue
        x = B.L / 2 - v.co.x
        for xa in (B.xf, B.xr):
            d = math.hypot(x - xa, v.co.z - B.R)
            if B.ra < d < B.ra + .12 and v.co.z > B.low(x) + .03:
                t = 1 - (d - B.ra) / .12
                v.co.y += math.copysign(fl * t * t, v.co.y)


# ------------------------------------------------------------------------------------------------ projection, cutters, panels
class Proj:
    """Maps 2D outline coordinates (a, b) in metres to a ray (origin, inward direction) aimed at the body."""
    def __init__(self, fn): self.fn = fn
    def __call__(self, a, b): return self.fn(a, b)


def side_proj(B, side):      # (x from front, z)
    return Proj(lambda a, b: (Vector((B.X(a), side * 3.0, b)), Vector((0, -side, 0))))


def top_proj(B):             # (x from front, y)
    return Proj(lambda a, b: (Vector((B.X(a), b, 4.0)), Vector((0, 0, -1))))


def end_proj(B, front=True):  # (y, z)
    s = 1 if front else -1
    return Proj(lambda a, b: (Vector((s * (B.L / 2 + 2.0), a, b)), Vector((-s, 0, 0))))


def corner_proj(B, xc, yc, side, front=True, Rp=.5):   # (s = arc metres from straight ahead/behind toward the side, z)
    s0 = 1 if front else -1
    cx = B.X(xc) if front else B.X(B.L - xc)
    def f(a, b):
        th = a / Rp
        d = Vector((s0 * math.cos(th), side * math.sin(th), 0))
        c = Vector((cx, side * yc, b))
        return c + d * 3.0, -d
    return Proj(f)


def cast(bvh, proj, a, b):
    o, d = proj(a, b)
    hit = bvh.ray_cast(o, d, 10.)
    if hit[0] is None: return None
    n = hit[1]
    if n.dot(d) > 0: n = -n
    return hit[0], n, d


def fit2(xs, ys):
    """Least-squares quadratic y = a + b x + c x^2."""
    n = len(xs); S = [sum(x ** k for x in xs) for k in range(5)]; T = [sum(y * x ** k for x, y in zip(xs, ys)) for k in range(3)]
    M = Matrix(((S[0], S[1], S[2]), (S[1], S[2], S[3]), (S[2], S[3], S[4])))
    a, b, c = M.inverted() @ Vector(T)
    return lambda x: a + b * x + c * x * x


def edge_line(bvh, proj, coords, z0, z1, up=.55):
    """edge_z along several lateral coordinates, median-filtered (the probe can catch a stray facet)."""
    zs = [edge_z(bvh, proj, a, z0, z1, up) for a in coords]
    out = []
    for i in range(len(zs)):
        w = sorted(zs[max(0, i - 2): i + 3])
        out.append(w[len(w) // 2])
    return out


def edge_z(bvh, proj, a, z0, z1, up=.55, step=.004):
    """Lowest z in [z0, z1] where the ray at lateral coordinate a meets a surface facing up (a bonnet or deck edge)."""
    z, seen = z0, False
    while z < z1:
        h = cast(bvh, proj, a, z)
        if h is None:
            if seen: return z
        else:
            seen = True
            if h[1].z > up: return z
        z += step
    return z1


def mesh_from(name, verts, faces, mats, fmat, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    for nm in mats: me.materials.append(MATS[nm])
    for p, m in zip(me.polygons, fmat): p.material_index = m; p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


class M2:
    """A 2D mesh in projection coordinates: points, quad/tri faces (with a band index each) and its boundary loop."""
    def __init__(self, pts, faces, band, loop): self.pts, self.faces, self.band, self.loop = pts, faces, band, loop


def m_rings(outline, bands=(), fill=(.66, .33)):
    """Concentric rings inside a (convex-ish) outline: ring 0 is the outline, then inward offsets, then rings scaled to the centre."""
    rings = [outline] + [inset(outline, d) for d in bands]
    last = rings[-1]
    c = (sum(p[0] for p in last) / len(last), sum(p[1] for p in last) / len(last))
    for k in fill: rings.append([(c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k) for p in last])
    pts, idx = [], []
    for r in rings: idx.append(list(range(len(pts), len(pts) + len(r)))); pts += r
    ci = len(pts); pts.append(c)
    faces, band = [], []
    for k in range(len(rings) - 1):
        a, b = idx[k], idx[k + 1]; n = len(a)
        for i in range(n): faces.append((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])); band.append(k)
    a = idx[-1]
    for i in range(len(a)): faces.append((a[i], a[(i + 1) % len(a)], ci)); band.append(len(rings) - 1)
    return M2(pts, faces, band, idx[0])


def m_strip(top, bot, nv=4, round_r=0., bands=()):
    """A structured grid between two polylines (same count, end to end), with rounded ends. bands = row fractions (0 at the
    top) where the material changes, e.g. (.25,) = a top band."""
    n = len(top)
    mids = [((t[0] + b[0]) / 2, (t[1] + b[1]) / 2) for t, b in zip(top, bot)]
    acc = [0.]
    for i in range(1, n): acc.append(acc[-1] + math.dist(mids[i], mids[i - 1]))
    total = acc[-1]
    rows = sorted(set([j / nv for j in range(nv + 1)] + list(bands)))
    cols = []
    for i in range(n):
        d = min(acc[i], total - acc[i])
        k = 1. if not round_r or d >= round_r else max(.3, math.sqrt(max(0., 1 - (1 - d / round_r) ** 2)))
        m, t, b = mids[i], top[i], bot[i]
        tt = (m[0] + (t[0] - m[0]) * k, m[1] + (t[1] - m[1]) * k); bb = (m[0] + (b[0] - m[0]) * k, m[1] + (b[1] - m[1]) * k)
        cols.append([(tt[0] + (bb[0] - tt[0]) * v, tt[1] + (bb[1] - tt[1]) * v) for v in rows])
    nr = len(rows)
    pts = [p for c in cols for p in c]
    I = lambda i, j: i * nr + j
    faces, band = [], []
    for i in range(n - 1):
        for j in range(nr - 1):
            faces.append((I(i, j), I(i, j + 1), I(i + 1, j + 1), I(i + 1, j))); band.append(sum(1 for b in bands if b <= rows[j] + 1e-9))
    loop = [I(i, 0) for i in range(n)] + [I(n - 1, j) for j in range(1, nr)] + [I(i, nr - 1) for i in range(n - 2, -1, -1)] + [I(0, j) for j in range(nr - 2, 0, -1)]
    return M2(pts, faces, band, loop)


def project(m2, bvh, proj):
    return [cast(bvh, proj, *p) for p in m2.pts]


def cutter(name, bvh, proj, m2, depth=.02, out=.08, wall="SEAL", cap="CAP_OPEN"):
    """A closed shell over a 2D mesh: an outer layer outside the body, an inner layer `depth` under the skin along the rays,
    walls round the boundary. Subtracting it opens the outline (walls = the seal/reveal); the inner layer is the pocket
    back (kept for lamps and grilles, deleted for windows)."""
    if not isinstance(m2, M2): m2 = m_rings(m2, (), (.6, .25))
    hits = project(m2, bvh, proj)
    miss = sum(1 for h in hits if not h)
    if ARGS.get("debug"):
        hs = [h for h in hits if h]
        print(f"  cutter {name}: n={len(hits)} miss={miss} X {min(h[0].x for h in hs):.3f}..{max(h[0].x for h in hs):.3f} "
              f"Z {min(h[0].z for h in hs):.3f}..{max(h[0].z for h in hs):.3f}", flush=True)
    if miss: print(f"  ! cutter {name}: {miss} rays missed the body; skipped", flush=True); return None
    n = len(hits)
    verts = [h[0] - h[2] * out for h in hits] + [h[0] + h[2] * depth for h in hits]
    faces, fm = [], []
    for f in m2.faces:
        faces.append(tuple(reversed(f))); fm.append(0)
        faces.append(tuple(n + i for i in f)); fm.append(1)
    lp = m2.loop
    for i in range(len(lp)):
        a, b = lp[i], lp[(i + 1) % len(lp)]
        faces.append((a, b, n + b, n + a)); fm.append(0)
    ob = mesh_from(name, verts, faces, [wall, cap], fm, smooth=False)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    vol = 0.
    for f in bm.faces:
        v = [x.co for x in f.verts]
        for k in range(1, len(v) - 1): vol += v[0].dot(v[k].cross(v[k + 1]))
    if vol < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)          # a solid, not a void
    bm.to_mesh(ob.data); bm.free()
    return ob


def panel(name, bvh, proj, m2, off, mats=("GLASS",), smooth=True, along_ray=False, bands=(), fill=(.66, .33)):
    """A surface patch over a 2D mesh, ray-cast onto the body and lifted `off` along the normal (negative = sunk).
    Face band k gets mats[min(k, len(mats)-1)]."""
    if not isinstance(m2, M2): m2 = m_rings(m2, bands, fill)
    hits = project(m2, bvh, proj)
    verts, vid = [], []
    for h in hits:
        if h is None: vid.append(None); continue
        vid.append(len(verts)); verts.append(h[0] - h[2] * off if along_ray else h[0] + h[1] * off)
    faces, fm = [], []
    for f, b in zip(m2.faces, m2.band):
        q = tuple(vid[i] for i in f)
        if None in q: continue
        faces.append(q); fm.append(min(b, len(mats) - 1))
    if not faces: return None
    ob = mesh_from(name, verts, faces, list(mats), fm, smooth)
    ref = sum((h[1] for h in hits if h), Vector())
    orient_out(ob, ref)
    return ob


def orient_out(ob, ref_dir):
    """Flip a patch so its faces point along ref_dir (outward)."""
    me = ob.data
    s = sum((p.normal.dot(ref_dir) for p in me.polygons), 0.)
    if s < 0: me.flip_normals()


def boolean(ob, cutter_ob):
    m = ob.modifiers.new("b", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = cutter_ob; m.solver = "EXACT"; m.material_mode = "TRANSFER"
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter_ob, do_unlink=True)


def cutter_cyl(loc, r, depth, matname, cap=None, verts=64):
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


# ------------------------------------------------------------------------------------------------ outlines on the body
def window_outline(B, front, rear, mb=.014, mt=.034):
    """Side-view (x, z) outline of one side window: above the belt, below the greenhouse top (which already follows the
    A- and C-pillar lines), clipped by optional slanted edge lines."""
    xs = [i * .01 for i in range(int(B.L * 100))]
    good = [x for x in xs if B.stack(x)["zs"] - mt - (B.stack(x)["zb"] + mb) > .04]
    lo = (front[0] - .3) if front else 0
    hi = (rear[0] + .3) if rear else B.L
    good = [x for x in good if lo <= x <= hi]
    if not good: return None
    x0, x1 = good[0], good[-1]
    xs = [x0 + (x1 - x0) * i / 120 for i in range(121)]
    bottom = [(x, B.stack(x)["zb"] + mb) for x in xs]
    top = [(x, B.stack(x)["zs"] - mt) for x in reversed(xs)]
    poly = bottom + top
    zb0, zt0 = B.belt(x0), B.rail((x0 + x1) / 2)
    def line(edge, sgn):
        (xa, xb) = edge
        za, zbt = B.belt(xa) + mb, min(B.rail(xb), 3) - mt
        # keep points on the window side of the line through (xa, za) and (xb, zbt)
        return lambda p: sgn * ((p[0] - xa) - (xb - xa) * (p[1] - za) / (zbt - za))
    if front: poly = clip(poly, line(front, 1))
    if rear: poly = clip(poly, line(rear, -1))
    return rounded(poly, r=.035, step=.028) if len(poly) > 3 else None


def glass_top_outline(B, x0c, x1c, band, front=True, mlo=.035, mhi=.03):
    """Plan-view (x, y) outline of the windscreen (front=True) or a rear window: between the centre-line x0c..x1c,
    swept round the corners like the surface, inside the pillars by `band`."""
    S = B.S
    sw = S["swf"] if front else -S["swr"]
    pts_r, pts_l = [], []
    N = 40
    def ymax(x):
        st = B.stack(x)
        return max(st["ys"] - band, .05)
    # bottom/top edges at lateral fractions; sides follow the pillar
    lo_edge, hi_edge = [], []
    for i in range(N + 1):
        e = -1 + 2 * i / N
        for which, xc, m in ((lo_edge, x0c, mlo if front else mhi), (hi_edge, x1c, -mhi if front else -mlo)):
            x = xc + m
            for _ in range(4):
                ym = ymax(x)
                ee = abs(e) * ym / max(B.stack(x)["ys"], .05)
                x = xc + m + sw * ee * ee
            which.append((x, e * ymax(x)))
    poly = lo_edge + hi_edge[::-1]
    return rounded(poly, r=.06, step=.035)


# ------------------------------------------------------------------------------------------------ wheels
def lathe(bm, prof, segs, mat_idx, notch=None):
    """Spin a profile [(r, y)] about the Y axis. notch(i, j) -> radial offset for ring i, profile point j."""
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        ring = []
        for j, (r, y) in enumerate(prof):
            rr_ = r + (notch(i, j) if notch else 0)
            ring.append(bm.verts.new((math.cos(a) * rr_, y, math.sin(a) * rr_)))
        rings.append(ring)
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % segs]
        for j in range(len(prof) - 1):
            f = bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
            f.material_index = mat_idx
    return rings


def build_wheel(S, name):
    """Tyre (sidewall bulge, shoulders, grooves, shoulder blocks), rim (lip, barrel, spokes with depth, hub, nuts).
    Local origin = wheel centre, outer face toward +Y."""
    tw, R, rr = tyre_dims(S)
    h, hw = R - rr, tw / 2
    at = S["rim"] == "six_ute"
    gd = .010 if at else .007
    bm = bmesh.new()
    prof = [(rr + .004, -hw * .80), (rr + .52 * h, -hw * 1.0), (R - .016, -hw * .88), (R - .004, -hw * .79),
            (R, -hw * .68), (R, -hw * .40), (R - gd, -hw * .36), (R - gd, -hw * .27), (R, -hw * .23), (R, hw * .23), (R - gd, hw * .27), (R - gd, hw * .36), (R, hw * .40),
            (R, hw * .68), (R - .004, hw * .79), (R - .016, hw * .88), (rr + .80 * h, hw * .965), (rr + .52 * h, hw * 1.0), (rr + .16 * h, hw * .95), (rr + .10 * h, hw * .975),
            (rr + .004, hw * .82)]
    blocks = {3, 4, 14, 15} | ({5, 13} if at else set())
    deep = .016 if at else .006
    lathe(bm, prof, 48, 0, notch=lambda i, j: -deep if (i % 2 and j in blocks) else 0)
    face = hw * .62                                   # the rim's outer face plane (inboard of the tyre's sidewall bulge)
    lathe(bm, [(rr - .016, face - .022), (rr - .016, -hw * .78)], 40, 2)                                            # barrel, seen between spokes
    lathe(bm, [(rr - .020, face - .010), (rr - .010, face + .002), (rr + .002, face + .008), (rr + .012, face + .004), (rr + .010, face - .012)], 40, 1)   # lip
    if S["rim"] == "steel":                            # a steel wheel with a plain plastic cover: dished, with vent slots shaded dark
        lathe(bm, [(0, face + .004), (.05, face + .003), (.09, face - .004), (rr * .70, face - .010), (rr * .86, face - .002), (rr - .020, face - .010)], 40, 3)
        for i in range(8):
            a = 2 * math.pi * i / 8
            c, s_ = math.cos(a), math.sin(a); t = Vector((-s_, 0, c))
            p = lambda r, w: tuple(Vector((c * r, face - .0045, s_ * r)) + t * w)
            v = [bm.verts.new(p(r, w)) for r, w in ((rr * .62, -.018), (rr * .80, -.026), (rr * .80, .026), (rr * .62, .018))]
            f = bm.faces.new(v); f.material_index = 2
    else:
        n, twin, wid, dep = {"ten": (10, 0, .016, .05), "five_twin": (5, .085, .013, .055), "six": (6, 0, .030, .055), "six_ute": (6, 0, .036, .06)}[S["rim"]]
        r0, r1 = .085, rr - .018
        hub_y = face - .014
        for i in range(n):
            for tws in ((-twin, twin) if twin else (0,)):
                a = 2 * math.pi * i / n + tws
                c, s_ = math.cos(a), math.sin(a)
                t = Vector((-s_, 0, c))
                rows = []
                for k in range(5):
                    u = k / 4
                    r = r0 + (r1 - r0) * u
                    yf = hub_y + (face - .004 - hub_y) * (u ** .6)            # concave: the hub sits deeper than the lip
                    ww = wid * (1.15 - .30 * u) * (1.6 if S["rim"] == "six_ute" and u < .3 else 1)
                    base = Vector((c * r, 0, s_ * r))
                    sec = [(-ww * .5, yf - dep), (-ww * .5, yf - .006), (-ww * .34, yf), (ww * .34, yf), (ww * .5, yf - .006), (ww * .5, yf - dep)]
                    rows.append([bm.verts.new(tuple(base + t * q + Vector((0, y, 0)))) for q, y in sec])
                for k in range(4):
                    for j in range(5):
                        f = bm.faces.new((rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j])); f.material_index = 1
        lathe(bm, [(0, hub_y + .010), (.028, hub_y + .009), (.050, hub_y + .003), (.075, hub_y - .004), (.095, hub_y - .012)], 24, 1)   # hub + centre cap (blank)
        for i in range(5 if S["rim"] != "six_ute" else 6):
            a = 2 * math.pi * i / (5 if S["rim"] != "six_ute" else 6) + .31
            off = Vector((math.cos(a) * .060, 0, math.sin(a) * .060))
            for ring in lathe(bm, [(0, hub_y + .002), (.0095, hub_y + .001), (.0095, hub_y - .012)], 6, 2):
                for v in ring: v.co += off
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for nm in ("TYRE", "RIM", "RIM_INNER", "STEEL_WHEEL"): me.materials.append(MATS[nm])
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    sharpen(ob, 50)
    return ob


def build_brake(S, name):
    tw, R, rr = tyre_dims(S)
    bm = bmesh.new()
    rd = rr * .80
    lathe(bm, [(.075, -.012), (rd, -.012), (rd, .012), (.075, .012), (.075, .026), (.04, .028)], 28, 0)
    a = math.radians(150)                                # caliper at the back of the disc, upper quadrant
    c, s_ = math.cos(a), math.sin(a)
    t = Vector((-s_, 0, c))
    for r, w, y0, y1 in ((rd * .70, .065, -.034, .034),):
        pts = []
        for rr_, ww, yy in ((r, -w, y0), (rd + .018, -w * 1.1, y0), (rd + .018, w * 1.1, y0), (r, w, y0), (r, -w, y1), (rd + .018, -w * 1.1, y1), (rd + .018, w * 1.1, y1), (r, w, y1)):
            pts.append(tuple(Vector((c * rr_, yy, s_ * rr_)) + t * ww))
        v = [bm.verts.new(p) for p in pts]
        for q in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
            f = bm.faces.new([v[i] for i in q]); f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for nm in ("BRAKE", "CALIPER"): me.materials.append(MATS[nm])
    return bpy.data.objects.new(name, me)


# ------------------------------------------------------------------------------------------------ small parts
def box_mesh(name, center, size, matname, rot=(0, 0, 0), bevel=0.):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    if bevel:
        m = o.modifiers.new("bv", "BEVEL"); m.width = bevel; m.segments = 2
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def bar(name, p0, p1, w, h, matname):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bpy.ops.mesh.primitive_cube_add(size=1, location=(p0 + p1) / 2)
    o = bpy.context.active_object; o.name = name
    o.scale = (d.length, w, h)
    o.rotation_euler = (0, -math.atan2(d.z, math.hypot(d.x, d.y)), math.atan2(d.y, d.x))
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    return o


def mirror_mesh(name, base, side):
    """Door mirror: a rounded housing (superellipsoid) on a short arm, mirror glass on its back face."""
    bm = bmesh.new()
    nu, nv = 16, 9
    ax, ay, az = .05, .10, .062                       # half depth (x), half width (y), half height (z)
    grid = []
    for i in range(nv + 1):
        th = -math.pi / 2 + math.pi * i / nv
        row = []
        for j in range(nu):
            ph = 2 * math.pi * j / nu
            sg = lambda v, e: math.copysign(abs(v) ** e, v)
            cx, cy, cz = sg(math.cos(th), .55) * sg(math.cos(ph), .7), sg(math.cos(th), .55) * sg(math.sin(ph), .55), sg(math.sin(th), .55)
            x = ax * cx if cx > 0 else ax * cx * .25          # flat back (the glass side faces -X, rearward)
            y = ay * cy * (1 - .18 * (1 - (cy + 1) / 2))       # slightly bigger at the outboard end
            z = az * cz * (.92 + .16 * (cy + 1) / 2)
            row.append(bm.verts.new((base.x + x, base.y + side * (ay + y), base.z + z)))
        grid.append(row)
    for i in range(nv):
        for j in range(nu):
            f = bm.faces.new((grid[i][j], grid[i][(j + 1) % nu], grid[i + 1][(j + 1) % nu], grid[i + 1][j])); f.material_index = 0
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # glass: an inset plate on the back
    gl = [bm.verts.new((base.x - ax * .25 - .002, base.y + side * (ay + y), base.z + z)) for y, z in ((-ay * .82, -az * .70), (ay * .86, -az * .78), (ay * .86, az * .74), (-ay * .82, az * .70))]
    f = bm.faces.new(gl); f.material_index = 1
    # arm
    a0, a1 = Vector((base.x + .01, base.y + side * .005, base.z - .045)), Vector((base.x + .012, base.y + side * .05, base.z - .035))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for nm in ("PAINT", "MIRROR_GLASS"): me.materials.append(MATS[nm])
    for p in me.polygons: p.use_smooth = p.material_index == 0
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    arm = bar("MIRROR_ARM", a0, a1, .055, .03, "TRIM_BLACK")
    return [ob, arm]


def sharpen(ob, angle=38):
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            a = e.link_faces[0].normal.angle(e.link_faces[1].normal, 0)
            m0, m1 = e.link_faces[0].material_index, e.link_faces[1].material_index
            if a > math.radians(angle) or (m0 != m1 and a > math.radians(4)): e.smooth = False
        elif len(e.link_faces) != 2:
            e.smooth = False
    bm.to_mesh(me); bm.free()


# ------------------------------------------------------------------------------------------------ assembly
def build_vehicle(body_key):
    S = SPEC[body_key]
    B = Body(S)
    L, X = B.L, B.X
    coll = bpy.data.collections.new(body_key.upper())
    bpy.context.scene.collection.children.link(coll)
    body = build_body(B, "BODY")
    bpy.context.view_layer.update()
    bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    parts, cuts = [], []
    R, tw, rr = B.R, B.tw, B.rr

    # ---- wheel arches: a pocket each side, lined
    for xw in (B.xf, B.xr):
        for side in (1, -1):
            cuts.append(cutter_cyl((X(xw), side * B.W2, R), B.ra, .80, "ARCH"))
    # ---- side windows: openings with a 22 mm black reveal, flush-ish glass 10 mm in, black B/C pillar appliques
    for side in (1, -1):
        sp = side_proj(B, side)
        for wi, (fe, re_) in enumerate(S["windows"]):
            ol = window_outline(B, fe, re_)
            if not ol: continue
            c = cutter(f"CUT_W{wi}", bvh, sp, ol, depth=.022)
            if c: cuts.append(c)
            fixed = (wi == len(S["windows"]) - 1 and len(S["windows"]) == 3)
            gm = "GLASS_DARK" if (wi > 0 and S.get("privacy")) else "GLASS"
            g = panel("GLASS_SIDE", bvh, sp, inset(ol, -.008), -.011, bands=(.028,) if fixed else (), mats=("FRIT", gm) if fixed else (gm,), fill=(.5,))
            if g: parts.append(g)
        for (_, ra_), (rb_, _) in zip(S["windows"], S["windows"][1:]):   # gloss-black pillar between two openings
            top = lambda x: B.stack(x)["zs"] - .032
            ol = [(ra_[0] - .004, B.belt(ra_[0]) + .012), (rb_[0] + .004, B.belt(rb_[0]) + .012), (rb_[1] + .004, top(rb_[1])), (ra_[1] - .004, top(ra_[1]))]
            g = panel("PILLAR_TRIM", bvh, sp, rounded(ol, r=.008, step=.012), .0015, mats=("TRIM_BLACK",), fill=(.5,))
            if g: parts.append(g)
    # ---- windscreen and rear window
    tp = top_proj(B)
    ws = glass_top_outline(B, S["ws"][0], S["ws"][1], S["ws_band"], front=True)
    cuts.append(cutter("CUT_WS", bvh, tp, ws, depth=.024))
    parts.append(panel("GLASS_WS", bvh, tp, inset(ws, -.008), -.012, bands=(.045,), mats=("FRIT", "GLASS"), fill=(.6, .25)))
    if S["rw"]:
        rw = glass_top_outline(B, S["rw"][0], S["rw"][1], S["rw_band"], front=False)
        cuts.append(cutter("CUT_RW", bvh, tp, rw, depth=.024))
        parts.append(panel("GLASS_RW", bvh, tp, inset(rw, -.008), -.012, bands=(.04,), mats=("FRIT", "GLASS_DARK" if S.get("privacy") else "GLASS"), fill=(.5,)))
    rp = end_proj(B, front=False)
    if S.get("cab_window"):                              # ute: rear window in the cab back
        cw = S["cab_window"]
        ol = rounded([(-cw["hw"], cw["z"][0]), (cw["hw"], cw["z"][0]), (cw["hw"] * .96, cw["z"][1]), (-cw["hw"] * .96, cw["z"][1])], r=.05)
        cuts.append(cutter("CUT_CAB", bvh, rp, ol, depth=.022))
        parts.append(panel("GLASS_CAB", bvh, rp, inset(ol, -.008), -.011, bands=(.03,), mats=("FRIT", "GLASS_DARK")))
    if S.get("rear_windows"):                            # van: two windows in the rear doors
        y0, y1 = S["rear_windows"]["y"]; z0, z1 = S["rear_windows"]["z"]
        for s in (1, -1):
            ol = rounded([(s * y0, z0), (s * y1, z0), (s * y1 * .98, z1), (s * y0, z1)], r=.05)
            cuts.append(cutter("CUT_RD", bvh, rp, ol, depth=.022))
            parts.append(panel("GLASS_RD", bvh, rp, inset(ol, -.008), -.011, bands=(.03,), mats=("FRIT", "GLASS_DARK")))
    # ---- headlamps: recessed housings wrapping the front corners, below the bonnet edge
    hd = S["head"]
    for side in (1, -1):
        cp = corner_proj(B, hd["c"][0], hd["c"][1], side, front=True, Rp=.5)
        th0, th1 = [math.radians(a) * .5 for a in hd["th"]]
        N = 18
        top, bot = [], []
        ss = [th0 + (th1 - th0) * i / N for i in range(N + 1)]
        q = fit2(ss, edge_line(bvh, cp, ss, .3, 2.2))        # a smooth quadratic through the bonnet/wing edge (no steps)
        for i, s in enumerate(ss):
            ze = q(s) - hd["margin"]
            hgt = hd["h"][0] + (hd["h"][1] - hd["h"][0]) * (i / N) ** 1.4
            top.append((s, ze)); bot.append((s, ze - hgt))
        strip = m_strip(top, bot, nv=4, round_r=.03)
        c = cutter("CUT_HEAD", bvh, cp, strip, depth=.05, wall="HOUSING", cap="HOUSING")
        if c: cuts.append(c)
        lens = panel("HEAD_LENS", bvh, cp, strip, -.001, mats=("LENS",))
        if lens: parts.append(lens)
        g = panel("DRL", bvh, cp, m_strip([(s, z - .010) for s, z in top[2:-2]], [(s, z - .019) for s, z in top[2:-2]], nv=1, round_r=.006), -.012, mats=("DRL",))
        if g: parts.append(g)
        for frac, rad in ((.30, .028), (.55, .024)):        # two projector modules
            s = th0 + (th1 - th0) * frac
            zc = (top[int(frac * N)][1] + bot[int(frac * N)][1]) / 2 - .006
            h = cast(bvh, cp, s, zc)
            if not h: continue
            pr = bpy.data.meshes.new("PROJECTOR"); bmp = bmesh.new()
            lathe(bmp, [(0, .002), (rad * .7, .0), (rad, -.006), (rad * 1.18, -.012), (rad * 1.18, -.035)], 16, 0)
            bmesh.ops.recalc_face_normals(bmp, faces=bmp.faces)
            bmp.to_mesh(pr); bmp.free(); pr.materials.append(MATS["PROJECTOR"])
            po = bpy.data.objects.new("PROJECTOR", pr); bpy.context.scene.collection.objects.link(po)
            n = -h[2]
            po.matrix_world = Matrix.Translation(h[0] - n * .016) @ n.to_track_quat("Y", "Z").to_matrix().to_4x4()
            for p in pr.polygons: p.use_smooth = True
            parts.append(po)
    # ---- grille and lower intake: pockets with plain horizontal slats (no pattern, no emblem)
    fp = end_proj(B, front=True)
    gr = S["grille"]
    hwl = gr["hw"]
    ys_ = [-hwl + 2 * hwl * i / 12 for i in range(13)]
    tops = [(y, z - gr["margin"]) for y, z in zip(ys_, edge_line(bvh, fp, ys_, .3, 2.2))]
    q = fit2([y for y, _ in tops], [z for _, z in tops])
    tops = [(y, q(y)) for y, _ in tops]
    zbot = min(z for _, z in tops) - gr["h"]
    bots = [(y * .94, zbot) for y, _ in tops]
    c = cutter("CUT_GRILLE", bvh, fp, m_strip(tops, bots, nv=3, round_r=.035), depth=.045, wall="TRIM_BLACK", cap="TRIM_BLACK")
    if c: cuts.append(c)
    zg1, zg0 = max(z for _, z in tops), min(z for _, z in tops) - gr["h"]
    for k in range(gr.get("slats", 2)):
        z = zg0 + (zg1 - zg0) * (k + 1) / (gr.get("slats", 2) + 1)
        h = cast(bvh, fp, 0, z)
        if h: parts.append(box_mesh("GRILLE_SLAT", h[0] + Vector((-.022, 0, 0)), (.02, hwl * 1.75, .012), "TRIM_BLACK"))
    it = S["intake"]
    iz0 = max(it["z"][0], B.low(.12) + .045)            # never let a cutter wall run along the underside (it grazes the skin)
    ol = rounded([(-it["hw"], iz0), (it["hw"], iz0), (it["hw"] * .86, it["z"][1]), (-it["hw"] * .86, it["z"][1])], r=.04)
    c = cutter("CUT_INTAKE", bvh, fp, ol, depth=.05, wall="TRIM_BLACK", cap="TRIM_BLACK")
    if c: cuts.append(c)
    # front plate (blank) on the bumper
    pz = S["plate_f"]
    pl = rounded([(-.186, pz - .067), (.186, pz - .067), (.186, pz + .067), (-.186, pz + .067)], r=.01, step=.02)
    for nm, o, ins in (("PLATE_F", .012, ()),):
        g = panel(nm, bvh, fp, pl, o, bands=(.008,), mats=("TRIM_BLACK", "PLATE"), fill=(.5,), smooth=False)
        if g: parts.append(g)
    # ---- tail lamps (flush lenses with a dark seal), rear plate, lower rear band
    tl = S["tail"]
    for side in (1, -1):
        cp = corner_proj(B, tl["c"][0], tl["c"][1], side, front=False, Rp=.5)
        th0, th1 = [math.radians(a) * .5 for a in tl["th"]]
        z0, z1 = tl["z"]
        if tl.get("vertical"):
            ol = rounded([(th0, z0), (th1, z0), (th1, z1), (th0, z1)], r=.02, step=.01)
        else:
            ol = rounded([(th0, z0 + .02), (th1, z0 + .035), (th1, z1 - .005), (th0, z1)], r=.02, step=.01)
        g = panel("TAIL_SEAL", bvh, cp, inset(ol, -.006), .0015, mats=("GAP",), fill=(.5,))
        if g: parts.append(g)
        g = panel("TAIL", bvh, cp, ol, .004, bands=(.012,), mats=("TAIL_DARK", "TAIL_LENS"), fill=(.6, .25))
        if g: parts.append(g)
    pr_ = S["plate_r"]
    pl = rounded([(-.186, pr_ - .067), (.186, pr_ - .067), (.186, pr_ + .067), (-.186, pr_ + .067)], r=.01, step=.02)
    g = panel("PLATE_R", bvh, rp, pl, .006, bands=(.008,), mats=("TRIM_BLACK", "PLATE"), fill=(.5,), smooth=False)
    if g: parts.append(g)
    if S.get("tg"):                                     # tailgate shut line: under the lamps and across above the bumper
        hw_, (z0, z1) = S["tg"]["hw"], S["tg"]["z"]
        for ol in ([(-hw_, z0 - .003), (hw_, z0 - .003), (hw_, z0 + .003), (-hw_, z0 + .003)],
                   [(hw_ - .003, z0), (hw_ + .003, z0), (hw_ + .003, z1), (hw_ - .003, z1)], [(-hw_ - .003, z0), (-hw_ + .003, z0), (-hw_ + .003, z1), (-hw_ - .003, z1)]):
            g = panel("TAILGATE_GAP", bvh, rp, resample(ol, .03), .0012, mats=("GAP",), fill=(.5,))
            if g: parts.append(g)
    # ---- door mirrors at the front of the side glass, door handles, wipers
    xm = S["ws"][0] + S["swf"] + .10
    st = B.stack(xm)
    for side in (1, -1):
        parts += mirror_mesh("MIRROR", Vector((X(xm), side * (st["w"] - .01), st["zb"] + .075)), side)
    for xh in [S["gaps"][1] - .26, S["gaps"][2] - .24]:
        st = B.stack(xh)
        zh = st["zsh"] - .045
        for side in (1, -1):
            sp = side_proj(B, side)
            hl = rounded([(xh - .075, zh - .012), (xh + .075, zh - .012), (xh + .075, zh + .012), (xh - .075, zh + .012)], r=.012, step=.01)
            g = panel("HANDLE_RECESS", bvh, sp, inset(hl, -.006), .001, mats=("GAP",), fill=(.5,))
            if g: parts.append(g)
            g = panel("HANDLE", bvh, sp, hl, .006, mats=("PAINT",), fill=(.5,))
            if g: parts.append(g)
    for k, (y0, y1) in enumerate(((.04, .50), (-.44, .06))):     # wipers resting on the glass, parked low
        x0 = S["ws"][0] + .085
        pts = []
        for i in range(7):
            y = y0 + (y1 - y0) * i / 6
            h = cast(bvh, tp, x0 + .03 * i / 6 + S["swf"] * (y / B.W2) ** 2, y)
            if h: pts.append(h[0] - h[1] * .004)
        for a, b in zip(pts, pts[1:]): parts.append(bar("WIPER", a, b, .009, .006, "TRIM_BLACK"))
    # ---- body-specific
    if S.get("rails"):                                  # SUV roof rails
        for side in (1, -1):
            pts = []
            for i in range(11):
                x = 2.15 + (4.05 - 2.15) * i / 10
                st = B.stack(x)
                h = cast(bvh, tp, x, side * (st["ys"] - .05))
                if h: pts.append(h[0] + Vector((0, 0, .045)))
            for a, b in zip(pts, pts[1:]): parts.append(bar("ROOF_RAIL", a, b, .026, .022, "TRIM_BLACK"))
            for a in (pts[0], pts[-1]): parts.append(bar("RAIL_FOOT", a - Vector((0, 0, .05)), a + Vector((0, 0, .005)), .05, .034, "TRIM_BLACK"))
    if S.get("step"):                                   # ute side steps and rear step bumper
        for side in (1, -1):
            parts.append(box_mesh("SIDE_STEP", (X(2.25), side * (B.W2 - .07), .42), (1.70, .14, .035), "TRIM_BLACK", bevel=.008))
        parts.append(box_mesh("REAR_STEP", (X(L - .01), 0, .56), (.14, B.W2 * 1.75, .08), "CLADDING", bevel=.01))
        parts.append(box_mesh("FRAME", (X(2.6), 0, .36), (4.2, 1.0, .14), "UNDER"))
    if S.get("panel"):                                  # van: sliding-door track, rear door split
        for side in (1, -1):
            pts = [cast(bvh, side_proj(B, side), x, 1.08) for x in (2.0, 4.0)]
            if all(pts): parts.append(bar("SLIDE_TRACK", pts[0][0] + Vector((0, side * .006, 0)), pts[1][0] + Vector((0, side * .006, 0)), .014, .02, "TRIM_BLACK"))
        sp_ = rounded([(-.004, .50), (.004, .50), (.004, 1.90), (-.004, 1.90)], r=.002, step=.03)
        g = panel("REAR_SPLIT", bvh, rp, sp_, .0015, mats=("GAP",), fill=(.5,))
        if g: parts.append(g)
    if S["cladding"]:                                   # arch flares: an unpainted lip round each opening
        for xw in (B.xf, B.xr):
            for side in (1, -1):
                parts.append(arch_lip(B, X(xw), side))
    if S.get("tub"):
        x0, x1, zf = S["tub"]
        cuts.append(cutter_box((X((x0 + x1) / 2), 0, zf + 1.0), (x1 - x0, S["W"] - .09, 2.0), "TRAY"))
    if S.get("cabgap"):
        cuts.append(cutter_box((X(S["cabgap"]), 0, 1.4), (.012, S["W"] + .1, 1.8), "GAP"))
    if body_key in ("hatch", "sedan", "wagon", "suv"):  # a small antenna fin at the back of the roof
        xa = (S["rw"][0] - .28)
        h = cast(bvh, tp, xa, 0)
        if h: parts.append(fin(h[0]))

    # ---- apply the cuts, open the window caps
    MATS.setdefault("CAP_OPEN", bpy.data.materials.get("CAP_OPEN") or bpy.data.materials.new("CAP_OPEN"))
    for c in cuts:
        if c and any(c.name.startswith(k) for k in str(ARGS.get("skipcut", "~")).split(",")):
            bpy.data.objects.remove(c, do_unlink=True); continue
        if c:
            nm, before = c.name, len(body.data.polygons)
            boolean(body, c)
            if ARGS.get("debug"): print("  cut", nm, before, "->", len(body.data.polygons), flush=True)
    # delete the window caps, then drop their material slots and re-point every face by material NAME (Mesh.materials.pop
    # already shifts the indices above the removed slot; shifting them again by hand would move faces onto the wrong material)
    me = body.data
    bm = bmesh.new(); bm.from_mesh(me)
    capi = [i for i, m in enumerate(me.materials) if m and m.name == "CAP_OPEN"]
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in capi], context="FACES")
    bm.to_mesh(me); bm.free()
    face_mat = [me.materials[p.material_index].name for p in me.polygons]
    for i in sorted(capi, reverse=True): me.materials.pop(index=i)
    names = [m.name for m in me.materials]
    for p, nm in zip(me.polygons, face_mat): p.material_index = names.index(nm)
    # the underbody is dark only where it faces the ground: where the sill ramps up into a bumper it is the bumper
    ui, pi = names.index("UNDER"), names.index("CLADDING" if S["cladding"] else "PAINT")
    for p in me.polygons:
        if p.material_index == ui and p.normal.z > -.55: p.material_index = pi
    sharpen(body, 40)
    link(body, coll)
    for p in parts:
        if not p.users_collection: bpy.context.scene.collection.objects.link(p)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    det = bpy.context.active_object; det.name = "BODY_DETAIL"; det.data.name = "BODY_DETAIL"
    sharpen(det, 40)
    link(det, coll)
    root = bpy.data.objects.new("VEHICLE_ROOT", None); coll.objects.link(root)
    root.empty_display_type = "ARROWS"
    body.parent = root; det.parent = root
    for code, xw, side in (("FL", B.xf, 1), ("FR", B.xf, -1), ("RL", B.xr, 1), ("RR", B.xr, -1)):
        front = code[0] == "F"
        loc = (X(xw), side * S["track"] / 2, R)
        hub = bpy.data.objects.new(("STEER_" if front else "HUB_") + code, None); coll.objects.link(hub)
        hub.location = loc; hub.parent = root; hub.empty_display_size = .15
        spin = bpy.data.objects.new("WHEEL_" + code, None); coll.objects.link(spin)
        spin.parent = hub; spin.empty_display_size = .2
        wm = build_wheel(S, "WHEEL_MESH_" + code); coll.objects.link(wm); wm.parent = spin
        br = build_brake(S, "BRAKE_" + code); coll.objects.link(br); br.parent = hub
        if side < 0:  # mirror the right-hand wheel and brake so their faces point outward
            for o in (wm, br):
                o.scale.y = -1
                bpy.context.view_layer.objects.active = o
                bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
                bpy.ops.object.transform_apply(scale=True)
                bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
        for o in (wm, br): o["lesson_part_id"] = o.name
    for o in coll.objects:
        o["assembl_vehicle"] = body_key
    interior = build_interior(B, body_key)
    return coll, S, interior


def fin(p):
    bm = bmesh.new()
    prof = [(0, 0), (-.16, 0), (-.13, .045), (-.04, .062)]
    v0 = [bm.verts.new((p.x + x, -.025, p.z - .004 + z)) for x, z in prof]
    v1 = [bm.verts.new((p.x + x * .96, .025 * (1 - .3 * (z / .062)), p.z - .004 + z)) for x, z in prof]
    v2 = [bm.verts.new((p.x + x * .96, -.025 * (1 - .3 * (z / .062)), p.z - .004 + z)) for x, z in prof]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((v1[i], v1[j], v2[j], v2[i]))
    bm.faces.new(v1); bm.faces.new(v2[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("ANTENNA"); bm.to_mesh(me); bm.free(); me.materials.append(MATS["TRIM_BLACK"])
    ob = bpy.data.objects.new("ANTENNA", me); bpy.context.scene.collection.objects.link(ob)
    return ob


def arch_lip(B, xc, side):
    S = B.S
    bm = bmesh.new()
    zcut = B.low(B.xf) + .06
    ra = B.ra
    a0 = math.asin(max(min((zcut - B.R) / (ra + .03), 1), -1))
    n = 24
    prof = [(-.004, -.01), (.06, -.004), (.065, .018), (.03, .03), (-.004, .026)]     # (radial, outward)
    rings = []
    for i in range(n + 1):
        a = a0 + (math.pi - 2 * a0) * i / n
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((xc + ca * (ra + dr), side * (B.W2 - .022 + dy), B.R + sa * (ra + dr))) for dr, dy in prof])
    for i in range(n):
        for j in range(len(prof) - 1):
            bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("ARCH_FLARE"); bm.to_mesh(me); bm.free()
    me.materials.append(MATS["CLADDING"])
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new("ARCH_FLARE", me); bpy.context.scene.collection.objects.link(ob)
    return ob


def build_interior(B, key):
    """Render-only blockout seen through the Cycles glass (never exported): dash, seats with headrests, a right-hand-drive
    steering wheel. Dark, simple, honest."""
    S, X = B.S, B.X
    coll = bpy.data.collections.new(key.upper() + "_RENDER_ONLY")
    bpy.context.scene.collection.children.link(coll)
    if "INTERIOR" not in MATS: mat("INTERIOR", "#232325", 0., .75); mat("INTERIOR_HI", "#3A3A3D", 0., .6)
    objs = []
    xa = S["ws"][0] + S["swf"]                           # A-pillar base
    xb = S["windows"][0][1][0] if S["windows"][0][1] else xa + .9   # B-pillar
    zb = B.belt(xb)
    st = B.stack(xb)
    hw = st["wg"] - .07
    zfl = B.low(xb) + .12
    za = B.belt(xa) + .02                                 # the dash stays under the windscreen, never through the cowl
    objs.append(box_mesh("DASH", (X(xa + .26), 0, za - .13), (.42, 2 * hw, .26), "INTERIOR", bevel=.04))
    xback = S["windows"][-1][1][0] if S["windows"][-1][1] else B.xr
    rows = [xb - .30] + ([min(xb + .60, xback - .48)] if key not in ("van",) else [])   # headrests stay inside the cabin
    if key == "van": rows = [xb - .30]
    for r, xr in enumerate(rows):
        zt = B.stack(xr)["zs"]
        for y in ((.36, -.36) if r == 0 else (.40, 0, -.40)):
            w = .48 if r == 0 else .42
            objs.append(box_mesh("SEAT", (X(xr + .10), y, zfl + .26), (.50, w, .14), "INTERIOR", bevel=.04))
            objs.append(box_mesh("SEAT_BACK", (X(xr + .30), y, zfl + .62), (.12, w * .95, .62), "INTERIOR", rot=(0, math.radians(-14), 0), bevel=.04))
            objs.append(box_mesh("HEADREST", (X(xr + .40), y, min(zfl + .98, zt - .17)), (.08, .22, .15), "INTERIOR_HI", bevel=.035))
    bpy.ops.mesh.primitive_torus_add(major_radius=.185, minor_radius=.016, location=(X(xa + .55), -.37, za + .02), rotation=(0, math.radians(62), 0))
    sw = bpy.context.active_object; sw.name = "STEERING"; sw.data.materials.append(MATS["INTERIOR_HI"]); objs.append(sw)
    objs.append(box_mesh("FLOOR", (X((xa + B.xr) / 2), 0, zfl), (B.xr - xa, 2 * hw, .03), "INTERIOR"))
    for o in objs:
        for c in list(o.users_collection): c.objects.unlink(o)
        coll.objects.link(o)
    return coll


def link(ob, coll):
    for c in list(ob.users_collection): c.objects.unlink(ob)
    coll.objects.link(ob)


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
def node(nt, kind, loc=(0, 0)):
    n = nt.nodes.new(kind); n.location = loc
    return n


def cycles_materials():
    """Render-time shading (after the GLB is written): thin tinted glass, clear lenses, metallic flake under the clearcoat,
    a little texture on tyres and plastics. None of this is in the GLB."""
    def thin_glass(m, tint, gloss_rough=.02, ior=1.52):
        nt = m.node_tree; nt.nodes.clear()
        out = node(nt, "ShaderNodeOutputMaterial", (400, 0))
        tr = node(nt, "ShaderNodeBsdfTransparent", (0, 100)); tr.inputs["Color"].default_value = (*tint, 1)
        try: gl = node(nt, "ShaderNodeBsdfGlossy", (0, -100))
        except Exception: gl = node(nt, "ShaderNodeBsdfAnisotropic", (0, -100))
        gl.inputs["Roughness"].default_value = gloss_rough
        fr = node(nt, "ShaderNodeFresnel", (-200, 200)); fr.inputs["IOR"].default_value = ior
        mx = node(nt, "ShaderNodeMixShader", (200, 0))
        nt.links.new(fr.outputs[0], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(gl.outputs[0], mx.inputs[2])
        nt.links.new(mx.outputs[0], out.inputs[0])
    thin_glass(MATS["GLASS"], (.075, .085, .085))
    thin_glass(MATS["GLASS_DARK"], (.022, .025, .026))
    thin_glass(MATS["LENS"], (.92, .93, .94), .01)
    p = MATS["PAINT"].node_tree
    b = p.nodes["Principled BSDF"]
    tc = node(p, "ShaderNodeTexCoord", (-900, 0))
    nz = node(p, "ShaderNodeTexNoise", (-700, 0)); nz.inputs["Scale"].default_value = 2600.; nz.inputs["Detail"].default_value = 1.
    bp = node(p, "ShaderNodeBump", (-400, 0)); bp.inputs["Strength"].default_value = .05; bp.inputs["Distance"].default_value = .0002
    p.links.new(tc.outputs["Object"], nz.inputs["Vector"]); p.links.new(nz.outputs["Fac"], bp.inputs["Height"]); p.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    for nm, sc, st_ in (("TYRE", 900., .25), ("CLADDING", 1800., .18), ("TRAY", 1400., .3), ("INTERIOR", 1500., .2)):
        if nm not in MATS: continue
        t = MATS[nm].node_tree; bb = t.nodes["Principled BSDF"]
        tc = node(t, "ShaderNodeTexCoord", (-900, 0)); nz = node(t, "ShaderNodeTexNoise", (-700, 0)); nz.inputs["Scale"].default_value = sc
        bp = node(t, "ShaderNodeBump", (-400, 0)); bp.inputs["Strength"].default_value = st_; bp.inputs["Distance"].default_value = .0004
        t.links.new(tc.outputs["Object"], nz.inputs["Vector"]); t.links.new(nz.outputs["Fac"], bp.inputs["Height"]); t.links.new(bp.outputs["Normal"], bb.inputs["Normal"])
    d = MATS["DRL"].node_tree.nodes["Principled BSDF"]
    d.inputs["Emission Color"].default_value = (1, 1, 1, 1); d.inputs["Emission Strength"].default_value = .6


def studio(scene, samples):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    try: scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception: pass
    scene.cycles.max_bounces = 6; scene.cycles.transparent_max_bounces = 12; scene.cycles.glossy_bounces = 4
    scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
    scene.cycles.blur_glossy = 1.0
    scene.render.use_persistent_data = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = .15
    # world: a studio gradient (dark floor, light ceiling) so the paint reads its form with a horizon line
    w = bpy.data.worlds.get("STUDIO") or bpy.data.worlds.new("STUDIO"); scene.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputWorld", (600, 0))
    bg = node(nt, "ShaderNodeBackground", (400, 0)); bg.inputs[1].default_value = 1.0
    tc = node(nt, "ShaderNodeTexCoord", (-600, 0)); sx = node(nt, "ShaderNodeSeparateXYZ", (-400, 0))
    rp = node(nt, "ShaderNodeValToRGB", (0, 0))
    ramp = rp.color_ramp
    ramp.elements[0].position = .44; ramp.elements[0].color = (.035, .033, .034, 1)
    ramp.elements[1].position = .62; ramp.elements[1].color = (.62, .60, .61, 1)
    e = ramp.elements.new(.53); e.color = (.20, .19, .195, 1)
    mr = node(nt, "ShaderNodeMapRange", (-200, 0)); mr.inputs["From Min"].default_value = -1; mr.inputs["From Max"].default_value = 1
    nt.links.new(tc.outputs["Generated"], sx.inputs[0]); nt.links.new(sx.outputs["Z"], mr.inputs["Value"]); nt.links.new(mr.outputs[0], rp.inputs[0])
    nt.links.new(rp.outputs[0], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
    if "FLOOR" not in bpy.data.objects:
        bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0)); f = bpy.context.active_object; f.name = "FLOOR"; f.is_shadow_catcher = True
        # overhead softbox: an emissive panel whose brightness falls off toward its edges (soft, graded reflections, no hard smear)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 4.6)); sb = bpy.context.active_object; sb.name = "SOFTBOX_TOP"
        sb.scale = (7.5, 3.6, 1); sb.rotation_euler = (math.pi, 0, 0)
        sm = bpy.data.materials.new("SOFTBOX"); sm.use_nodes = True; t = sm.node_tree; t.nodes.clear()
        o = node(t, "ShaderNodeOutputMaterial", (600, 0)); em = node(t, "ShaderNodeEmission", (400, 0))
        tc = node(t, "ShaderNodeTexCoord", (-400, 0)); gr = node(t, "ShaderNodeTexGradient", (-200, 0)); gr.gradient_type = "SPHERICAL"
        mp = node(t, "ShaderNodeMapping", (-300, 0)); mp.inputs["Location"].default_value = (-.8, -1.1, 0); mp.inputs["Scale"].default_value = (1.6, 2.2, 1)
        mt_ = node(t, "ShaderNodeMath", (200, 0)); mt_.operation = "MULTIPLY"; mt_.inputs[1].default_value = 9.0
        t.links.new(tc.outputs["UV"], mp.inputs[0]); t.links.new(mp.outputs[0], gr.inputs[0]); t.links.new(gr.outputs["Fac"], mt_.inputs[0])
        t.links.new(mt_.outputs[0], em.inputs["Strength"]); t.links.new(em.outputs[0], o.inputs[0])
        sb.data.materials.append(sm); sb.visible_camera = False; sb.visible_shadow = False
        for nm, loc, rot, size, e_ in (("KEY", (6.0, -5.0, 3.4), (math.radians(58), 0, math.radians(50)), (3.5, 2.5), 520),
                                       ("RIM", (-6.0, 4.5, 3.0), (math.radians(62), 0, math.radians(-128)), (3, 2), 300),
                                       ("STRIP_R", (0.6, -6.5, 1.6), (math.radians(90), 0, 0), (7.0, .5), 260),
                                       ("STRIP_L", (0.6, 6.5, 1.6), (math.radians(-90), 0, 0), (7.0, .5), 160),
                                       ("FILL", (9.0, -1.0, 1.0), (math.radians(85), 0, math.radians(95)), (4, 1.6), 120)):
            ld = bpy.data.lights.new(nm, "AREA"); ld.shape = "RECTANGLE"; ld.size, ld.size_y = size; ld.energy = e_; ld.color = (1, .985, .975)
            lo = bpy.data.objects.new(nm, ld); lo.location = loc; lo.rotation_euler = rot; scene.collection.objects.link(lo)
            lo.visible_camera = False
            if nm in ("RIM", "STRIP_R", "STRIP_L", "FILL"): ld.use_shadow = False     # no long side shadows: a tight contact shadow only
    if "CAM" not in bpy.data.objects:
        cd = bpy.data.cameras.new("CAM"); co = bpy.data.objects.new("CAM", cd); scene.collection.objects.link(co); scene.camera = co
        cd.sensor_width = 36


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
        coll, S, interior = build_vehicle(k)
        built[k] = (coll, interior)
        bpy.context.view_layer.update()
        path = ASSET / f"{k}.glb"
        if not ARGS.get("no-export"): export(coll, path)
        tw, R, rr = tyre_dims(S)
        mn, mx = bbox(coll)
        nodes = {}
        for o in coll.objects:
            if o.name.split(".")[0] in ("VEHICLE_ROOT",) or o.name.startswith(("STEER_", "HUB_", "WHEEL_F", "WHEEL_R")) and not o.name.startswith("WHEEL_MESH"):
                p = o.matrix_world.translation
                nodes[o.name] = {"pivot_gltf_m": [round(p.x, 5), round(p.z, 5), round(-p.y, 5)]}
        size = path.stat().st_size if path.exists() else 0
        tris = tri_count(coll)
        body_tris = tri_count_obj(coll, "BODY")
        contract["vehicles"][k] = {"file": f"{k}.glb", "label": S["label"], "sha256": hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else "", "bytes": size,
                                   "dimensions_m": {"length": S["L"], "width": S["W"], "height": S["H"], "wheelbase": S["wb"], "track": S["track"],
                                                    "front_overhang": S["fo"], "tyre": "%d/%dR%d" % S["tyre"], "tyre_diameter": round(2 * R, 3)},
                                   "nodes": nodes, "wheel_radius_m": round(R, 4)}
        bm_ = body_bbox(coll)
        report[k] = {"tris": tris, "tris_body": body_tris, "bytes": size, "bbox_m": {"min": [round(v, 3) for v in mn], "max": [round(v, 3) for v in mx]},
                     "measured_body": {"length": round(bm_[1].x - bm_[0].x, 3), "width": round(bm_[1].y - bm_[0].y, 3), "height": round(bm_[1].z, 3), "ground_clearance_body": round(bm_[0].z, 3)},
                     "materials": sorted({m.name for o in coll.objects if o.type == "MESH" for m in o.data.materials if m})}
        print(f"[{k}] tris={tris} (body {body_tris}) bytes={size} body L={bm_[1].x - bm_[0].x:.3f} W={bm_[1].y - bm_[0].y:.3f} H={bm_[1].z:.3f} min z={bm_[0].z:.3f}", flush=True)
        for o in list(coll.objects) + list(interior.objects):
            o.name = f"{k.upper()}:{o.name}"
            if o.data is not None: o.data.name = o.name
    if not ONLY and not ARGS.get("no-export"):
        (ASSET / "vehicles-rig-contract.json").write_text(json.dumps(contract, indent=1) + "\n")
        (ASSET / "build-report.json").write_text(json.dumps({"blender": bpy.app.version_string, "budget": BUDGET, "vehicles": report}, indent=1) + "\n")
        bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "vehicles.blend"), compress=True)
    if ARGS.get("render"):
        render_all(scene, built)


def tri_count_obj(coll, name):
    n = 0
    for o in coll.objects:
        if o.type == "MESH" and o.name == name:
            me = o.data; me.calc_loop_triangles(); n += len(me.loop_triangles)
    return n


def body_bbox(coll):
    mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in coll.objects:
        if o.type == "MESH" and o.name == "BODY":
            for v in o.data.vertices:
                p = o.matrix_world @ v.co
                mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    return mn, mx


def views(S):
    """(camera location, target, lens) for the review views; Blender coords, nose +X, the camera on the right (-Y) side."""
    L, H = S["L"], S["H"]
    d = 2.7 * L + 1.0
    a = math.radians(38)
    front = ((math.cos(a) * d, -math.sin(a) * d, 1.15), (0.1, 0, H * .40), 85)
    side = ((0.0, -(2.45 * L + 1.0), .95), (0, 0, H * .45), 85)
    rear = ((-math.cos(a) * d, -math.sin(a) * d, 1.3), (-0.1, 0, H * .42), 85)
    return {"front": front, "side": side, "rear": rear}


def render_all(scene, built):
    samples, still_samples = int(ARGS.get("samples", 96)), int(ARGS.get("still-samples", 48))
    cycles_materials()
    studio(scene, samples)
    cam = bpy.data.objects["CAM"]
    which = str(ARGS.get("which", "hero,detail,stills")).split(",")
    stock = json.loads((ASSET.parent.parent.parent / "cars" / "dealer-twin" / "data" / "stock.json").read_text())
    from_colour = {v[3].lower(): k for k, v in PAINTS.items()}
    combos = sorted({(c["body"], from_colour[c["colour"].lower()]) for c in stock["cars"]})
    sres = tuple(int(v) for v in str(ARGS.get("sheet-res", "560x350")).split("x"))
    for k, (coll, interior) in built.items():
        for c, i in built.values():
            c.hide_render = c is not coll; i.hide_render = c is not coll
        S = SPEC[k]
        if "sheet" in which:
            scene.cycles.samples = int(ARGS.get("sheet-samples", 24)); set_paint(HERO_PAINT[k])
            (OUT / "sheet").mkdir(parents=True, exist_ok=True)
            for vname in str(ARGS.get("sheet-views", "front,side")).split(","):
                loc, tgt, lens = views(S)[vname]
                aim(cam, loc, tgt, lens)
                render_to(scene, OUT / "sheet" / f"{k}-{vname}.png", sres)
        if "hero" in which:
            scene.cycles.samples = samples; set_paint(HERO_PAINT[k])
            loc, tgt, lens = views(S)["front"]
            aim(cam, loc, tgt, lens)
            render_to(scene, OUT / f"{k}-hero.png", (1200, 750))
        if "rear" in which:
            scene.cycles.samples = samples; set_paint(HERO_PAINT[k])
            loc, tgt, lens = views(S)["rear"]
            aim(cam, loc, tgt, lens)
            render_to(scene, OUT / f"{k}-rear.png", (1200, 750))
        if "detail" in which:
            scene.cycles.samples = samples; set_paint(HERO_PAINT[k])
            tw, R, rr = tyre_dims(S)
            xf = S["L"] / 2 - S["fo"]
            aim(cam, (xf + 1.65, -S["W"] / 2 - 2.0, R + .62), (xf + .22, -S["W"] / 2, R + .25), 50)
            render_to(scene, OUT / f"{k}-detail.png", (800, 600))
        if "stills" in which:
            (OUT / "stills").mkdir(parents=True, exist_ok=True)
            scene.cycles.samples = still_samples
            aim(cam, (8.4, -6.3, 1.75), (0, 0, .78), 50)     # ONE camera and scale for every body: a ute is bigger than a hatch
            for b, p in combos:
                if b != k: continue
                set_paint(p)
                render_to(scene, OUT / "stills" / f"{k}-{p}.png", (640, 480))
    set_paint("pearl-white")


if __name__ == "__main__":
    main()
