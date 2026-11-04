#!/usr/bin/env python3
"""A 2020-on five-door Golf-class hatch (eighth generation proportions) for the /cars/ hero, built entirely by this script in
Blender (bpy). It reuses the lofting, cutting and rig helpers of build_vehicles.py and adds the parts that make this body read
as the real car: the short bonnet and steep screen, the long flat roof, the thick forward-leaning C-pillar, the near-vertical
tailgate under a roof spoiler, slim headlamps joined by a light bar across a narrow upper grille, a big lower intake, the crisp
shoulder line from headlamp to tail lamp, horizontal tail lamps that run into the tailgate, and five double-spoke alloys.

    /path/to/python-with-bpy assets/models/vehicles/source/build_golf.py                 # golf.glb + golf-build.json
    ... build_golf.py --render [--samples=96] [--sheet-samples=32] [--which=hero,sheet] [--out=<png dir>] [--no-export]

Writes (next to this folder):
  golf.glb            Y-up glTF, metres, origin at ground centre, the rig nodes of vehicles-rig-contract.json, one PAINT material
  golf-build.json     triangles, bytes, sha256, measured body, rig pivots, the stations the /cars/ stage uses
  <out>/golf-hero.png, <out>/sheet/golf-{front,side,rear}.png   Cycles, transparent (composite onto chalk with --compose)

NO BADGES: there is no maker's emblem, lettering or logo anywhere on the model (the badge areas on the grille and tailgate are left
plain) and the number plates are blank. All geometry is original: no downloaded models, scans or textures.
Real dimensions: length 4.284, width 1.789, height 1.456, wheelbase 2.636, front overhang 0.86, track 1.55, 225/45R17.
"""
import sys, math, json, hashlib, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_vehicles as bv  # noqa: E402  (its main() only runs as a script)
import bpy, bmesh  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

ARGS = bv.ARGS
ASSET = bv.ASSET
OUT = pathlib.Path(ARGS.get("out", str(ASSET / "renders-png")))

# ------------------------------------------------------------------------------------------------ the spec (metres, x from the front)
GOLF = dict(label="Five-door hatch (2020-on Golf)", L=4.284, W=1.789, H=1.456, wb=2.636, fo=0.860, track=1.550, tyre=(225, 45, 17), rim="golf",
    arch_gap=.034, flare=.012, cladding=False, tumble=23, ledge=.050, dsh=.112, crown=.062, swf=.15, swr=.11, xmid=2.75,
    # the underside: a short, low front lip, flat sills, the rear bumper rising into the diffuser
    low=[(0, .30), (.008, .255), (.025, .228), (.06, .212), (.12, .203), (.18, .199), (.30, .195), (.6, .19), (1.2, .178), (3.05, .178), (3.6, .195), (3.85, .215), (4.02, .245),
         (4.14, .28), (4.22, .33), (4.262, .40), (4.28, .47), (4.284, .53)],
    # the centre-line top: an upright nose, a short bonnet rising to the cowl, a steep raked screen, the long flat roof, the raked
    # tailgate glass and an almost vertical lower tailgate
    crest=[(0, .735), (.008, .762), (.025, .780), (.055, .793), (.09, .801), (.13, .807), (.22, .826), (.40, .862), (.65, .906), (.90, .944), (1.04, .961), (1.14, .972),
           (1.20, .979), (1.28, 1.025), (1.42, 1.111), (1.57, 1.201), (1.72, 1.287), (1.84, 1.351), (1.94, 1.397), (2.04, 1.427), (2.20, 1.447), (2.38, 1.456), (2.55, 1.454),
           (2.85, 1.444), (3.15, 1.423), (3.45, 1.394), (3.68, 1.366), (3.80, 1.350), (3.84, 1.338), (3.88, 1.292), (3.94, 1.215), (4.00, 1.135), (4.05, 1.072),
           (4.085, 1.033), (4.13, .995), (4.19, .945), (4.235, .885), (4.262, .80), (4.276, .72), (4.284, .62)],
    # the beltline: wing tops in front (the bonnet's side shut lines), the base of the side glass rising gently to the rear
    belt=[(0, .725), (.03, .758), (.08, .772), (.16, .786), (.35, .815), (.65, .858), (.95, .898), (1.15, .922), (1.34, .940), (1.8, .953), (2.4, .968), (2.85, .982), (3.02, .992),
          (3.18, 1.016), (3.36, 1.047), (3.62, 1.062), (3.85, 1.062), (4.0, 1.046), (4.10, 1.016), (4.18, .958), (4.24, .87), (4.284, .68)],
    rail=[(1.67, 1.27), (1.92, 1.36), (2.3, 1.393), (2.6, 1.392), (2.9, 1.378), (3.2, 1.352), (3.45, 1.322), (3.65, 1.29), (3.82, 1.255)],
    setF=[(0, 0), (.4, .005), (.6, .014), (.75, .030), (.85, .055), (.92, .095), (.96, .14), (.985, .20), (1, .29)],
    setR=[(0, 0), (.4, .005), (.6, .016), (.75, .036), (.87, .068), (.95, .112), (1, .18)],
    ws=(1.20, 2.00), rw=(3.85, 4.085), ws_band=.046, rw_band=.15,
    # front door glass to the B-pillar; the rear door glass ends early, on a short steep edge where the belt kicks up, leaving
    # the wide solid C-pillar (about half a metre at the belt, its base ahead of its top) that the car is known for
    windows=[(None, (2.385, 2.35)), ((2.465, 2.43), (3.33, 3.335))], appliques=[(2.385, 2.465)],
    gaps=[1.30, 2.425, 3.42], bonnet=.115, tailgate=4.085, tg=dict(hw=.60, z=(.64, .885)),
    head=dict(c=(.62, .30), th=(10, 80), h=(.068, .094), margin=.010),
    grille=dict(hw=.43, h=.032, margin=.010), intake=dict(hw=.60, z=(.235, .455)),
    tail=dict(c=(.32, .22), th=(6, 74)), plate_f=.355, plate_r=.705)

PAINTS = {"kings-red": ("#8E1119", .5, .27, "Kings Red metallic"), "moonstone": ("#8A8C8D", .10, .30, "Moonstone Grey"),
          "pure-white": ("#ECEDEA", .0, .28, "Pure White"), "atlantic-blue": ("#1E3653", .65, .28, "Atlantic Blue metallic")}
HERO_PAINT = str(ARGS.get("paint", "kings-red"))
BUDGET = {"tris": 60000, "bytes": 2_000_000, "textures": 0}


def golf_materials():
    bv.PAINTS.update(PAINTS)
    bv.make_materials(HERO_PAINT)
    bv.mat("LIGHTBAR", "#F4F2EE", 0., .22, emit=("#FFFFFF", .25))   # the thin light bar across the grille and along the lamp tops
    bv.mat("TAIL_LINE", "#E0303A", 0., .2, emit=("#FF2A36", .4))     # the lit line inside the tail lamps
    bv.mat("HONEY", "#0B0B0C", 0., .5)                              # the lower intake's mesh
    bv.mat("HOUSING", "#D2D5D8", .3, .25)
    bv.mat("RIM", "#D9DCDF", .55, .26)                               # bright machined faces
    bv.mat("RIM_INNER", "#4A4D52", .6, .4)                           # dark-painted spoke sides and barrel                            # LED headlamps: bright reflector housings, dark inner bands


class GolfBody(bv.Body):
    """The generic body with a crisper shoulder: right above the crease (the long shoulder line from headlamp to tail lamp) the
    surface turns in more sharply, so the line catches the light the way the real car's does. The bonnet carries two raised
    creases that run from the A-pillars toward the inner ends of the headlamps."""
    TOP_E = [.985, .93, .86, .78, .70, .62, .52, .38, .2, 0.]
    LOW_SUB = [1, 1, 1, 2, 1, 1, 2, 2]
    TOP_SUB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

    def width(self, x):
        return super().width(x) * 1.0045          # the arch flare is pulled in at the widest point; this lands the body on 1.789 m

    def topf(self, x, e):
        z = super().topf(x, e)
        S = self.S
        fade = 1 - bv.smooth(S["ws"][0] - .10, S["ws"][0] + .02, x)      # only on the bonnet
        if fade <= 0: return z
        z += (S["crown"] - .032) * e * e * fade                          # a flatter bonnet than roof: the wings rise to meet it
        ec = .70 + .10 * min(1., x / S["ws"][0])                          # the crease converges a little toward the nose
        rise = .016 * (1 - bv.smooth(ec - .07, ec, e)) * bv.smooth(.06, .30, x)
        return z + rise * fade
    def section(self, x):
        k = self.stack(x)
        zl, zt, zb, zsh, zs, w, wg, ys = k["zl"], k["zt"], k["zb"], k["zsh"], k["zs"], k["w"], k["wg"], k["ys"]
        f = min(1., (zsh - zl) / .4)
        # the lower door feature line: a crisp edge over a shallow concave band, rising toward the rear wheel
        kf = bv.smooth(self.xf + .25, self.xf + .55, x) * (1 - bv.smooth(self.xr - .55, self.xr - .25, x))
        zf = min(zsh - .12, max(zl + .12, .425 + .045 * (x - 1.2) / 2.0))
        dz = .012 * kf
        low = [(0, zl), (.78 * w, zl), (.93 * w, zl + .006), (.975 * w, zl + .04 * f), (.996 * w - dz * .3, zl + .5 * (zf - zl)), (.996 * w - dz, zf - .022),
               (.998 * w, zf), (.994 * w, zf + .5 * (zsh - zf)), (w, zsh)]
        k_ = bv.smooth(.30, .75, x) * (1 - bv.smooth(self.L - .45, self.L - .15, x))   # the crisp shoulder fades out round the nose and tail
        sh = [(w, zsh), (w - (.25 + .23 * k_) * (w - wg), zsh + (.62 - .32 * k_) * (zb - zsh)), (wg, zb)]
        gh = [(wg, zb), (ys, zs)]
        f1 = self.topf(x, 1.0)
        corr = zs - f1
        top = [(ys, zs)] + [(e * ys, self.topf(x, e) + corr * e ** 6) for e in self.TOP_E]
        pts, cls = [], []
        for part, subs, base in ((low, self.LOW_SUB, 0), (sh, self.SH_SUB, 6), (gh, self.GH_SUB, 8), (top, self.TOP_SUB, 9)):
            c = bv.chain(part, subs)
            seg = [base + i for i, s in enumerate(subs) for _ in range(s)]
            if pts: c = c[1:]
            pts += c; cls += seg
        return pts, cls


# ------------------------------------------------------------------------------------------------ wheels: five double spokes
def golf_wheel(S, name):
    """225/45R17 tyre and a five double-spoke alloy: each pair leaves the hub as one arm and opens into a V at the rim; machined
    silver faces over dark-painted sides. Local origin = wheel centre, outer face toward +Y."""
    tw, R, rr = bv.tyre_dims(S)
    h, hw = R - rr, tw / 2
    gd = .007
    bm = bmesh.new()
    prof = [(rr + .004, -hw * .80), (rr + .55 * h, -hw * 1.0), (R - .014, -hw * .90), (R - .004, -hw * .80),
            (R, -hw * .68), (R, -hw * .40), (R - gd, -hw * .36), (R - gd, -hw * .27), (R, -hw * .23), (R, hw * .23), (R - gd, hw * .27), (R - gd, hw * .36), (R, hw * .40),
            (R, hw * .68), (R - .004, hw * .80), (R - .014, hw * .90), (rr + .80 * h, hw * .975), (rr + .55 * h, hw * 1.0), (rr + .18 * h, hw * .96), (rr + .10 * h, hw * .99),
            (rr + .004, hw * .84)]
    blocks = {3, 4, 14, 15}
    bv.lathe(bm, prof, 56, 0, notch=lambda i, j: -.005 if (i % 2 and j in blocks) else 0)
    face = hw * .66
    bv.lathe(bm, [(rr - .016, face - .024), (rr - .016, -hw * .78)], 48, 2)                                         # barrel
    bv.lathe(bm, [(rr - .022, face - .010), (rr - .012, face + .003), (rr + .002, face + .009), (rr + .013, face + .005), (rr + .011, face - .012)], 48, 1)  # lip
    r0, r1, hub_y = .078, rr - .020, face - .020
    for i in range(5):
        for side in (-1, 1):
            rows = []
            for k in range(7):
                u = k / 6
                r = r0 + (r1 - r0) * u
                a = 2 * math.pi * i / 5 + side * (.055 + .085 * u)                 # a pair close at the hub, opening a little to the rim
                c, s_ = math.cos(a), math.sin(a)
                t = Vector((-s_, 0, c))
                yf = hub_y + (face - .003 - hub_y) * (u ** .55)                  # concave: the hub sits deeper than the lip
                ww = .026 * (1.10 - .22 * u)
                dep = .05
                base = Vector((c * r, 0, s_ * r))
                sec = [(-ww * .5, yf - dep, 2), (-ww * .5, yf - .005, 2), (-ww * .40, yf, 1), (ww * .40, yf, 1), (ww * .5, yf - .005, 2), (ww * .5, yf - dep, 2)]
                rows.append([(bm.verts.new(tuple(base + t * q + Vector((0, y, 0)))), m) for q, y, m in sec])
            for k in range(6):
                for j in range(5):
                    f = bm.faces.new((rows[k][j][0], rows[k][j + 1][0], rows[k + 1][j + 1][0], rows[k + 1][j][0]))
                    f.material_index = 1 if (rows[k][j][1] == 1 and rows[k][j + 1][1] == 1) else 2
    bv.lathe(bm, [(0, hub_y + .007), (.032, hub_y + .007), (.036, hub_y + .004), (.05, hub_y + .001), (.07, hub_y - .002), (.088, hub_y - .010)], 28, 1)   # hub, a flat plain cap
    for i in range(5):
        a = 2 * math.pi * i / 5 + math.pi / 5
        off = Vector((math.cos(a) * .052, 0, math.sin(a) * .052))
        for ring in bv.lathe(bm, [(0, hub_y + .003), (.007, hub_y + .0025), (.007, hub_y - .010)], 6, 2):
            for v in ring: v.co += off
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for nm in ("TYRE", "RIM", "RIM_INNER", "STEEL_WHEEL"): me.materials.append(bv.MATS[nm])
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bv.sharpen(ob, 50)
    return ob


# ------------------------------------------------------------------------------------------------ small Golf parts
def strip_on(bvh, proj, top, bot, off, mats, nv=2, round_r=.004, bands=()):
    return bv.panel("STRIP", bvh, proj, bv.m_strip(top, bot, nv=nv, round_r=round_r, bands=bands), off, mats=mats)


def spoiler(B, bvh):
    """The roof spoiler: a body-colour blade that carries the roof line back over the tailgate glass, a dark underside, and
    small end plates that drop down the sides of the glass."""
    S = B.S
    x0, x1 = S["rw"][0] - .10, S["rw"][0] + .13           # starts on the roof, overhangs the glass
    tp = bv.top_proj(B)
    ny = 13
    top, und = [], []
    for j in range(ny + 1):
        e = -1 + 2 * j / ny
        y = e * (B.stack(x0)["ys"] - .015)
        h = bv.cast(bvh, tp, x0, y)
        if not h: continue
        p0 = h[0]
        row_t, row_u = [], []
        for k in range(6):
            u = k / 5
            x = B.X(x0 + (x1 - x0) * u)
            z = p0.z + .008 - .032 * u * u - .012 * abs(e) ** 3
            xs_ = x0 + (x1 - x0) * u
            yy = p0.y * min(1., (B.stack(min(xs_, S["rw"][0] + .02))["ys"] - .01) / max(B.stack(x0)["ys"] - .015, .1))
            row_t.append(Vector((x, yy, z + .004 * math.sin(math.pi * u))))
            row_u.append(Vector((x, yy, z - .022 + .016 * u)))
        top.append(row_t); und.append(row_u)
    bm = bmesh.new()
    T = [[bm.verts.new(v) for v in r] for r in top]
    U = [[bm.verts.new(v) for v in r] for r in und]
    n, m = len(T), len(T[0])
    for i in range(n - 1):
        for k in range(m - 1):
            f = bm.faces.new((T[i][k], T[i][k + 1], T[i + 1][k + 1], T[i + 1][k])); f.material_index = 0
            f = bm.faces.new((U[i][k], U[i + 1][k], U[i + 1][k + 1], U[i][k + 1])); f.material_index = 1
        f = bm.faces.new((T[i][m - 1], U[i][m - 1], U[i + 1][m - 1], T[i + 1][m - 1])); f.material_index = 0      # trailing edge
    for i in (0, n - 1):                                                                                     # end caps
        ring = T[i] + U[i][::-1]
        f = bm.faces.new(ring if i == 0 else ring[::-1]); f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("SPOILER"); bm.to_mesh(me); bm.free()
    me.materials.append(bv.MATS["PAINT"]); me.materials.append(bv.MATS["TRIM_BLACK"])
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new("SPOILER", me); bpy.context.scene.collection.objects.link(ob)
    bv.sharpen(ob, 45)
    return ob


def soften_ends(B, ob):
    """build_body makes the shoulder, belt and rail creases sharp from end to end; on this car they stop at the lamps."""
    me = ob.data
    for e in me.edges:
        if e.use_edge_sharp:
            xa = [B.L / 2 - me.vertices[i].co.x for i in e.vertices]
            if max(xa) < .55 or min(xa) > B.L - .30: e.use_edge_sharp = False
    for p in me.polygons: p.use_smooth = True


def build_golf():
    S = bv.SPEC["golf"]
    B = GolfBody(S)
    L, X = B.L, B.X
    coll = bpy.data.collections.new("GOLF")
    bpy.context.scene.collection.children.link(coll)
    body = bv.build_body(B, "BODY")
    soften_ends(B, body)
    bpy.context.view_layer.update()
    bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    parts, cuts = [], []
    R = B.R

    # ---- wheel arches
    for xw in (B.xf, B.xr):
        for side in (1, -1):
            cuts.append(bv.cutter_cyl((X(xw), side * B.W2, R), B.ra, .80, "ARCH"))
    # ---- side glass in black reveals, the gloss-black B-pillar
    for side in (1, -1):
        sp = bv.side_proj(B, side)
        for wi, (fe, re_) in enumerate(S["windows"]):
            ol = bv.window_outline(B, fe, re_)
            if not ol: continue
            c = bv.cutter(f"CUT_W{wi}", bvh, sp, ol, depth=.022)
            if c: cuts.append(c)
            g = bv.panel("GLASS_SIDE", bvh, sp, bv.inset(ol, -.008), -.011, mats=("GLASS",), fill=(.5,))
            if g: parts.append(g)
        for (_, ra_), (rb_, _) in zip(S["windows"], S["windows"][1:]):
            top = lambda x: B.stack(x)["zs"] - .032
            ol = [(ra_[0] - .004, B.belt(ra_[0]) + .012), (rb_[0] + .004, B.belt(rb_[0]) + .012), (rb_[1] + .004, top(rb_[1])), (ra_[1] - .004, top(ra_[1]))]
            g = bv.panel("PILLAR_TRIM", bvh, sp, bv.rounded(ol, r=.008, step=.012), .0015, mats=("TRIM_BLACK",), fill=(.5,))
            if g: parts.append(g)
    # ---- windscreen and tailgate glass
    tp = bv.top_proj(B)
    ws = bv.glass_top_outline(B, S["ws"][0], S["ws"][1], S["ws_band"], front=True)
    cuts.append(bv.cutter("CUT_WS", bvh, tp, ws, depth=.024))
    parts.append(bv.panel("GLASS_WS", bvh, tp, bv.inset(ws, -.008), -.012, bands=(.045,), mats=("FRIT", "GLASS"), fill=(.6, .25)))
    rw = bv.glass_top_outline(B, S["rw"][0], S["rw"][1], S["rw_band"], front=False)
    cuts.append(bv.cutter("CUT_RW", bvh, tp, rw, depth=.024))
    parts.append(bv.panel("GLASS_RW", bvh, tp, bv.inset(rw, -.008), -.012, bands=(.05,), mats=("FRIT", "GLASS_DARK"), fill=(.5,)))

    # ---- the narrow upper grille between the lamps (plain: no emblem), the light bar across its top edge
    fp = bv.end_proj(B, front=True)
    gr = S["grille"]
    hwl = gr["hw"]
    ys_ = [-hwl + 2 * hwl * i / 16 for i in range(17)]
    tops = [(y, z - gr["margin"]) for y, z in zip(ys_, bv.edge_line(bvh, fp, ys_, .3, 2.2))]
    zline = min(z for _, z in tops)                       # one straight light line across the nose
    tops = [(y, zline - .003 * (y / hwl) ** 2) for y, _ in tops]
    bots = [(y, z - gr["h"] - .004 * (1 - (y / hwl) ** 2)) for y, z in tops]
    c = bv.cutter("CUT_GRILLE", bvh, fp, bv.m_strip(tops, bots, nv=3, round_r=.012), depth=.04, wall="TRIM_BLACK", cap="TRIM_BLACK")
    if c: cuts.append(c)
    g = bv.panel("LIGHTBAR", bvh, fp, bv.m_strip([(y, z - .006) for y, z in tops], [(y, z - .0105) for y, z in tops], nv=1, round_r=.002), -.004, mats=("LIGHTBAR",))
    if g: parts.append(g)
    for k in range(2):                                     # two thin horizontal bars inside the grille
        zz = [(y, z - gr["h"] * (.42 + .3 * k)) for y, z in tops]
        g = bv.panel("GRILLE_BAR", bvh, fp, bv.m_strip([(y * .985, z + .0035) for y, z in zz], [(y * .985, z - .0035) for y, z in zz], nv=1, round_r=.002), -.022, mats=("TRIM_BLACK",))
        if g: parts.append(g)

    # ---- headlamps: slim horizontal units under the bonnet edge, wrapping the corners, a light bar along the top
    hd = S["head"]
    lamp_top = {}
    for side in (1, -1):
        cp = bv.corner_proj(B, hd["c"][0], hd["c"][1], side, front=True, Rp=.5)
        th0, th1 = [math.radians(a) * .5 for a in hd["th"]]
        N = 20
        ss = [th0 + (th1 - th0) * i / N for i in range(N + 1)]
        e = bv.edge_line(bvh, cp, ss, .3, 2.2)
        q = bv.fit2(ss, [min(z - hd["margin"], zline - .003 - .03 * (i / N) ** 2) + hd["margin"] for i, z in enumerate(e)])
        top, bot = [], []
        for i, s in enumerate(ss):
            u = i / N
            ze = q(s) - hd["margin"]
            # a point at the inner end (into the light bar), full depth by a third of the way out, tapering again as it wraps
            hgt = .024 + (hd["h"][1] - .024) * bv.smooth(0., .34, u) * (1 - .28 * bv.smooth(.80, 1., u))
            top.append((s, ze)); bot.append((s, ze - hgt))
        lamp_top[side] = (top[0], bot[0])
        strip = bv.m_strip(top, bot, nv=4, round_r=.010)
        c = bv.cutter("CUT_HEAD", bvh, cp, strip, depth=.028, wall="HOUSING", cap="HOUSING")
        if c: cuts.append(c)
        lens = bv.panel("HEAD_LENS", bvh, cp, strip, -.001, mats=("LENS",))
        if lens: parts.append(lens)
        g = bv.panel("DRL", bvh, cp, bv.m_strip([(s, z - .006) for s, z in top[1:-1]], [(s, z - .0115) for s, z in top[1:-1]], nv=1, round_r=.004), -.010, mats=("LIGHTBAR",))
        if g: parts.append(g)
        # a dark inner band (the lower half of the unit) and three small LED modules in a row
        g = bv.panel("HEAD_DARK", bvh, cp, bv.m_strip([(s, zb + (zt - zb) * .36) for (s, zt), (_, zb) in zip(top[1:-2], bot[1:-2])],
                                                     [(s, zb + .006) for (s, _), (_, zb) in zip(top[1:-2], bot[1:-2])], nv=1, round_r=.01), -.018, mats=("TRIM_BLACK",))
        if g: parts.append(g)
        for frac, rad in ((.22, .016), (.38, .016), (.54, .015)):
            s = th0 + (th1 - th0) * frac
            k = int(frac * N)
            zc = (top[k][1] + bot[k][1]) / 2 - .002
            h = bv.cast(bvh, cp, s, zc)
            if not h: continue
            pr = bpy.data.meshes.new("PROJECTOR"); bmp = bmesh.new()
            bv.lathe(bmp, [(0, .002), (rad * .7, .0), (rad, -.005), (rad * 1.15, -.010), (rad * 1.15, -.03)], 16, 0)
            bmesh.ops.recalc_face_normals(bmp, faces=bmp.faces)
            bmp.to_mesh(pr); bmp.free(); pr.materials.append(bv.MATS["PROJECTOR"])
            po = bpy.data.objects.new("PROJECTOR", pr); bpy.context.scene.collection.objects.link(po)
            n = -h[2]
            po.matrix_world = Matrix.Translation(h[0] - n * .02) @ n.to_track_quat("Y", "Z").to_matrix().to_4x4()
            for p in pr.polygons: p.use_smooth = True
            parts.append(po)

    # ---- the big lower intake (a wide trapezoid with a mesh), corner air curtains, a blank front plate
    it = S["intake"]
    iz0 = max(it["z"][0], B.low(.12) + .045)
    ol = bv.rounded([(-it["hw"], iz0), (it["hw"], iz0), (it["hw"] * .93, iz0 + .07), (it["hw"] * .78, it["z"][1]), (-it["hw"] * .78, it["z"][1]), (-it["hw"] * .93, iz0 + .07)], r=.035)
    c = bv.cutter("CUT_INTAKE", bvh, fp, ol, depth=.05, wall="TRIM_BLACK", cap="HONEY")
    if c: cuts.append(c)
    for k in range(3):                                     # the mesh: horizontal bars staggered with short verticals
        z = iz0 + .045 + k * .055
        hwk = it["hw"] * (.92 - .06 * k)
        h = bv.cast(bvh, fp, 0, z)
        if h: parts.append(bv.box_mesh("INTAKE_BAR", h[0] + Vector((-.03, 0, 0)), (.012, 2 * hwk, .006), "TRIM_BLACK"))
    for side in (1, -1):                                   # air-curtain slots at the bumper corners
        cp = bv.corner_proj(B, .40, .55, side, front=True, Rp=.5)
        a0, a1 = math.radians(24) * .5, math.radians(36) * .5
        ol = bv.rounded([(a0, .27), (a1, .285), (a1 + .012, .445), (a0 + .012, .47)], r=.012, step=.006)
        c = bv.cutter("CUT_CURTAIN", bvh, cp, ol, depth=.035, wall="TRIM_BLACK", cap="TRIM_BLACK")
        if c: cuts.append(c)
    pz = S["plate_f"]
    pl = bv.rounded([(-.186, pz - .067), (.186, pz - .067), (.186, pz + .067), (-.186, pz + .067)], r=.01, step=.02)
    g = bv.panel("PLATE_F", bvh, fp, pl, .018, bands=(.008,), mats=("TRIM_BLACK", "PLATE"), fill=(.5,), smooth=False)
    if g: parts.append(g)

    # ---- tail lamps: horizontal, from the rear quarter round the corner and into the tailgate, a lit line inside
    rp = bv.end_proj(B, front=False)
    tl = S["tail"]
    for side in (1, -1):
        cp = bv.corner_proj(B, tl["c"][0], tl["c"][1], side, front=False, Rp=.5)
        th0, th1 = [math.radians(a) * .5 for a in tl["th"]]
        N = 18
        top, bot, mid = [], [], []
        for i in range(N + 1):
            u = i / N
            s = th0 + (th1 - th0) * u
            zt = .962 + .022 * u - .008 * u * u         # top edge just under the glass, rising a little outward
            hgt = .060 + .095 * u ** 1.7               # a slim blade on the tailgate, deeper on the quarter
            top.append((s, zt)); bot.append((s, zt - hgt)); mid.append((s, zt - hgt * .55))
        g = bv.panel("TAIL_SEAL", bvh, cp, bv.m_strip([(s, z + .006) for s, z in top], [(s, z - .006) for s, z in bot], nv=2, round_r=.02), .0015, mats=("GAP",))
        if g: parts.append(g)
        g = bv.panel("TAIL", bvh, cp, bv.m_strip(top, bot, nv=4, round_r=.018, bands=(.3,)), .0055, mats=("TAIL_DARK", "TAIL_LENS"))
        if g: parts.append(g)
        g = bv.panel("TAIL_LINE", bvh, cp, bv.m_strip([(s, z + .004) for s, z in mid[1:-1]], [(s, z - .004) for s, z in mid[1:-1]], nv=1, round_r=.004), .008, mats=("TAIL_LINE",))
        if g: parts.append(g)
    # tailgate shut lines: across above the bumper, up each side to the lamps (the lamps split with the tailgate)
    hw_, z0 = .60, .64
    for ol in ([(-hw_, z0 - .003), (hw_, z0 - .003), (hw_, z0 + .003), (-hw_, z0 + .003)],
               [(hw_ - .003, z0), (hw_ + .003, z0), (hw_ + .003, .885), (hw_ - .003, .885)], [(-hw_ - .003, z0), (-hw_ + .003, z0), (-hw_ + .003, .885), (-hw_ - .003, .885)]):
        g = bv.panel("TAILGATE_GAP", bvh, rp, bv.resample(ol, .03), .0012, mats=("GAP",), fill=(.5,))
        if g: parts.append(g)
    pr_ = S["plate_r"]
    pl = bv.rounded([(-.186, pr_ - .067), (.186, pr_ - .067), (.186, pr_ + .067), (-.186, pr_ + .067)], r=.01, step=.02)
    g = bv.panel("PLATE_R", bvh, rp, pl, .006, bands=(.008,), mats=("TRIM_BLACK", "PLATE"), fill=(.5,), smooth=False)
    if g: parts.append(g)
    # the lower rear bumper in dark grained plastic (the diffuser), with two slim reflectors
    ol = bv.rounded([(-.62, .345), (.62, .345), (.58, .425), (-.58, .425)], r=.03, step=.02)
    g = bv.panel("DIFFUSER", bvh, rp, ol, .0025, mats=("CLADDING",), fill=(.5,))
    if g: parts.append(g)
    for s in (1, -1):
        ol = bv.rounded([(s * .63, .47), (s * .75, .475), (s * .75, .493), (s * .63, .488)], r=.006, step=.008)
        g = bv.panel("REFLECTOR", bvh, rp, ol, .003, mats=("TAIL_DARK",), fill=(.5,))
        if g: parts.append(g)

    # ---- mirrors on the doors, flush handles on the shoulder line, wipers
    xm = S["ws"][0] + S["swf"] + .14
    st = B.stack(xm)
    for side in (1, -1):
        parts += bv.mirror_mesh("MIRROR", Vector((X(xm), side * (st["w"] - .02), st["zb"] + .06)), side)
    for xh in [S["gaps"][1] - .27, S["gaps"][2] - .25]:
        st = B.stack(xh)
        zh = st["zsh"] - .05
        for side in (1, -1):
            sp = bv.side_proj(B, side)
            hl = bv.rounded([(xh - .08, zh - .011), (xh + .08, zh - .011), (xh + .08, zh + .011), (xh - .08, zh + .011)], r=.011, step=.01)
            g = bv.panel("HANDLE_RECESS", bvh, sp, bv.inset(hl, -.006), .001, mats=("GAP",), fill=(.5,))
            if g: parts.append(g)
            g = bv.panel("HANDLE", bvh, sp, hl, .006, mats=("PAINT",), fill=(.5,))
            if g: parts.append(g)
    for k, (y0, y1) in enumerate(((.04, .52), (-.46, .06))):
        x0 = S["ws"][0] + .08
        pts = []
        for i in range(7):
            y = y0 + (y1 - y0) * i / 6
            h = bv.cast(bvh, tp, x0 + .03 * i / 6 + S["swf"] * (y / B.W2) ** 2, y)
            if h: pts.append(h[0] - h[1] * .004)
        for a, b in zip(pts, pts[1:]): parts.append(bv.bar("WIPER", a, b, .009, .006, "TRIM_BLACK"))
    h = bv.cast(bvh, tp, S["rw"][0] - .30, 0)
    if h: parts.append(bv.fin(h[0]))
    parts.append(spoiler(B, bvh))

    # ---- cut, open the window caps (as build_vehicle does)
    for c in cuts:
        if c: bv.boolean(body, c)
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
    ui, pi = names.index("UNDER"), names.index("PAINT")
    for p in me.polygons:
        if p.material_index == ui and p.normal.z > -.55: p.material_index = pi
    bv.sharpen(body, 40)
    bv.link(body, coll)
    for p in parts:
        if not p.users_collection: bpy.context.scene.collection.objects.link(p)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    det = bpy.context.active_object; det.name = "BODY_DETAIL"; det.data.name = "BODY_DETAIL"
    bv.sharpen(det, 40)
    bv.link(det, coll)
    root = bpy.data.objects.new("VEHICLE_ROOT", None); coll.objects.link(root)
    body.parent = root; det.parent = root
    for code, xw, side in (("FL", B.xf, 1), ("FR", B.xf, -1), ("RL", B.xr, 1), ("RR", B.xr, -1)):
        front = code[0] == "F"
        hub = bpy.data.objects.new(("STEER_" if front else "HUB_") + code, None); coll.objects.link(hub)
        hub.location = (X(xw), side * S["track"] / 2, R); hub.parent = root
        spin = bpy.data.objects.new("WHEEL_" + code, None); coll.objects.link(spin); spin.parent = hub
        wm = golf_wheel(S, "WHEEL_MESH_" + code); coll.objects.link(wm); wm.parent = spin
        br = bv.build_brake(S, "BRAKE_" + code); coll.objects.link(br); br.parent = hub
        if side < 0:
            for o in (wm, br):
                o.scale.y = -1
                bpy.context.view_layer.objects.active = o
                bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
                bpy.ops.object.transform_apply(scale=True)
                bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
    # the stations the /cars/ stage reads (it also measures the model itself; these are the designer's numbers, glTF metres)
    root["stations_gltf_m"] = {"cowl": round(X(S["ws"][0]), 4), "roof_front": round(X(S["ws"][1]), 4), "roof_rear": round(X(S["rw"][0]), 4),
                               "bonnet_front": round(X(S["bonnet"]), 4), "belt": round(B.belt((S["gaps"][1] + S["gaps"][2]) / 2), 4),
                               "sill": round(B.low(B.L / 2), 4), "wheel_radius": round(R, 4), "length": S["L"], "width": S["W"], "height": S["H"]}
    for o in coll.objects: o["assembl_vehicle"] = "golf"
    interior = bv.build_interior(B, "golf")
    return coll, S, interior, B


def golf_views(S):
    L, H = S["L"], S["H"]
    d = 2.7 * L + 1.0
    a = math.radians(36)
    return {"front": ((math.cos(a) * d, -math.sin(a) * d, 1.20), (-0.05, -0.05, H * .37), 85),
            "side": ((0.0, -(2.5 * L + 1.0), .92), (0, 0, H * .45), 85),
            "rear": ((-math.cos(a) * d, -math.sin(a) * d, 1.35), (0.05, -0.05, H * .40), 85),
            "nose": ((d * .98, -d * .14, 1.0), (0, 0, H * .38), 85),
            "tail": ((-d * .98, -d * .16, 1.15), (0, 0, H * .40), 85),
            "rq": ((-3.6, -3.0, .75), (-1.75, -.55, .45), 50), "fq": ((3.4, -2.9, .85), (1.7, -.55, .55), 50)}


def main():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    scene = bpy.context.scene
    bv.SPEC["golf"] = GOLF
    golf_materials()
    coll, S, interior, B = build_golf()
    bpy.context.view_layer.update()
    path = ASSET / "golf.glb"
    if not ARGS.get("no-export"): bv.export(coll, path)
    tw, R, rr = bv.tyre_dims(S)
    tris, body_tris = bv.tri_count(coll), bv.tri_count_obj(coll, "BODY")
    mn, mx = bv.body_bbox(coll)
    nodes = {}
    for o in coll.objects:
        if o.name == "VEHICLE_ROOT" or (o.name.startswith(("STEER_", "HUB_", "WHEEL_F", "WHEEL_R")) and not o.name.startswith("WHEEL_MESH")):
            p = o.matrix_world.translation
            nodes[o.name] = {"pivot_gltf_m": [round(p.x, 5), round(p.z, 5), round(-p.y, 5)]}
    size = path.stat().st_size if path.exists() else 0
    report = {"generator": "assets/models/vehicles/source/build_golf.py", "blender": bpy.app.version_string, "file": "golf.glb", "label": S["label"],
              "note": "No badges, logos or lettering; blank number plates. Original geometry, no textures.",
              "sha256": hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else "", "bytes": size, "tris": tris, "tris_body": body_tris, "budget": BUDGET,
              "paint_material": "PAINT", "paints": {k: {"hex": v[0], "metallic": v[1], "roughness": v[2], "label": v[3], "clearcoat": 1.0} for k, v in PAINTS.items()},
              "hero_paint": HERO_PAINT,
              "dimensions_m": {"length": S["L"], "width": S["W"], "height": S["H"], "wheelbase": S["wb"], "track": S["track"], "front_overhang": S["fo"],
                               "tyre": "%d/%dR%d" % S["tyre"], "tyre_diameter": round(2 * R, 3)},
              "measured_body": {"length": round(mx.x - mn.x, 3), "width": round(mx.y - mn.y, 3), "height": round(mx.z, 3), "ground_clearance_body": round(mn.z, 3)},
              "wheel_radius_m": round(R, 4), "nodes": nodes, "stations_gltf_m": dict(bpy.data.objects["VEHICLE_ROOT"]["stations_gltf_m"]),
              "materials": sorted({m.name for o in coll.objects if o.type == "MESH" for m in o.data.materials if m})}
    print(f"[golf] tris={tris} (body {body_tris}) bytes={size} body L={mx.x - mn.x:.3f} W={mx.y - mn.y:.3f} H={mx.z:.3f} min z={mn.z:.3f}", flush=True)
    if not ARGS.get("no-export"):
        (ASSET / "golf-build.json").write_text(json.dumps(report, indent=1) + "\n")
    for o in list(coll.objects) + list(interior.objects):     # as build_vehicles does: "GOLF:<node>" in the .blend, so the
        o.name = "GOLF:" + o.name                              # studio's own FLOOR, lights and camera are created for renders
        if o.data is not None: o.data.name = o.name
    if ARGS.get("blend"):
        bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "golf.blend"), compress=True)
    if ARGS.get("render"):
        render(scene, coll, interior, S)


def render(scene, coll, interior, S):
    bv.cycles_materials()
    tl = bv.MATS["TAIL_LENS"].node_tree.nodes["Principled BSDF"]
    tl.inputs["Emission Color"].default_value = (1, .05, .06, 1); tl.inputs["Emission Strength"].default_value = .15
    for nm, tint in (("GLASS", .03), ("GLASS_DARK", .012)):              # deeper tint than the generic set: the backdrop shouldn't show through
        tr = [n for n in bv.MATS[nm].node_tree.nodes if n.bl_idname == "ShaderNodeBsdfTransparent"][0]
        tr.inputs["Color"].default_value = (tint, tint * 1.1, tint * 1.1, 1)
    hb = bv.MATS["HOUSING"].node_tree.nodes["Principled BSDF"]          # render only: the lamp interiors catch some light, as lit units do
    hb.inputs["Emission Color"].default_value = (1, 1, 1, 1); hb.inputs["Emission Strength"].default_value = .12
    bv.studio(scene, int(ARGS.get("samples", 96)))
    cam = bpy.data.objects["CAM"]
    which = str(ARGS.get("which", "hero,sheet")).split(",")
    V = golf_views(S)
    bv.set_paint(HERO_PAINT)
    if "sheet" in which:
        scene.cycles.samples = int(ARGS.get("sheet-samples", 32))
        (OUT / "sheet").mkdir(parents=True, exist_ok=True)
        for vname in str(ARGS.get("sheet-views", "front,side,rear")).split(","):
            loc, tgt, lens = V[vname]
            bv.aim(cam, loc, tgt, lens)
            bv.render_to(scene, OUT / "sheet" / f"golf-{vname}.png", tuple(int(v) for v in str(ARGS.get("sheet-res", "800x500")).split("x")))
    if "hero" in which:
        scene.cycles.samples = int(ARGS.get("samples", 96))
        loc, tgt, lens = V["front"]
        bv.aim(cam, loc, tgt, lens)
        bv.render_to(scene, OUT / "golf-hero.png", (1200, 750))


if __name__ == "__main__":
    main()
