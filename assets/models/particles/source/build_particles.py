"""Reproducible Blender build for the particle machine apparatus (assembl.particles.v1).

One command rebuilds the editable .blend, the offline Cycles renders, the browser GLB and the rig contract:

    python -m venv .venv && .venv/bin/pip install bpy==5.1.2
    .venv/bin/python assets/models/particles/source/build_particles.py            # build + renders + GLB + contract
    .venv/bin/python assets/models/particles/source/build_particles.py --no-render  # skip the Cycles renders

Everything is authored here in Python: no imported meshes, scans, textures or generated imagery.
Units are metres. Blender axes: +X right, +Y rear, +Z up. The glTF export maps (x, y, z) -> (x, z, -y).

The asset only DISPLAYS the existing lesson (study/m/particles.js). It contains no gas law, heating model, timer or random
values. Moving parts have identity rest rotations so the browser adapter can apply absolute poses without drift.
"""
import bpy, bmesh, json, math, os, sys, hashlib
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)                      # assets/models/particles
RENDER = "--no-render" not in sys.argv
SAMPLES = 16 if "--preview" in sys.argv else 64
RES_SCALE = 50 if "--preview" in sys.argv else 100
CONTRACT = "assembl.particles.v1"

# --------------------------------------------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils
addon_utils.enable("cycles", default_set=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
EXPORT = bpy.data.collections.new("PARTICLES_EXPORT"); scene.collection.children.link(EXPORT)
STUDIO = bpy.data.collections.new("STUDIO_RENDER_ONLY"); scene.collection.children.link(STUDIO)

# --------------------------------------------------------------------------------------------------- materials
def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]

MATS = {}
def material(name, hexcol, rough=0.45, metal=0.0, coat=0.0, transmission=0.0, ior=1.45, alpha=1.0):
    m = bpy.data.materials.new(name)
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = lin(hexcol)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = 0.2
    bsdf.inputs["Transmission Weight"].default_value = transmission
    bsdf.inputs["IOR"].default_value = ior
    bsdf.inputs["Alpha"].default_value = alpha
    m.diffuse_color = lin(hexcol)
    m.use_backface_culling = alpha >= 1 and transmission == 0   # single-sided web materials except glass and water
    if alpha < 1:
        m.surface_render_method = "BLENDED"
    if transmission > 0:
        # offline product-render convention: shadow rays pass through clear glass and water (no caustic solve),
        # so the hotplate and bench under the glassware are not falsely darkened
        nt = m.node_tree; out = nt.nodes["Material Output"]
        lp = nt.nodes.new("ShaderNodeLightPath"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(lp.outputs["Is Shadow Ray"], mix.inputs[0]); nt.links.new(bsdf.outputs[0], mix.inputs[1])
        nt.links.new(tr.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs["Surface"])
    MATS[name] = m
    return m

# Palette (docs/design/3d-production-standard.md): cream, white, soft lilac, blush, mint, powder blue, lighter structural
# accents, restrained navy labels. Real copper, steel, rubber and glass cues. No yellow, no emission.
M_CREAM   = material("assembl_cream",   "#F7F3EC", rough=.5)
M_WHITE   = material("assembl_white",   "#FFFFFF", rough=.32, coat=.35)
M_MINT    = material("assembl_mint",    "#BFE8D6", rough=.42, coat=.3)
M_LILAC   = material("assembl_lilac",   "#D9CBF2", rough=.42, coat=.3)
M_BLUSH   = material("assembl_blush",   "#F3B8C8", rough=.4, coat=.3)
M_POWDER  = material("assembl_powder",  "#DCEBF8", rough=.25, coat=.6)
M_NAVY    = material("assembl_navy",    "#222A55", rough=.5)
M_STEEL   = material("steel_brushed",   "#CBD3DD", rough=.26, metal=1.0)
M_COPPER  = material("copper_tube",     "#C97A4A", rough=.3, metal=1.0)
M_RUBBER  = material("rubber_slate",    "#4E5468", rough=.62)
M_CERAMIC = material("ceramic_top",     "#F1EEF2", rough=.18, coat=.6)
M_COIL    = material("heat_coil",       "#D9CCD3", rough=.35, metal=.35)   # adapter tints toward blush when heating
M_LED     = material("status_led",      "#BFE8D6", rough=.25, coat=.8)     # adapter tints mint (idle) / blush (on)
M_SPIRIT  = material("thermo_spirit",   "#E8688A", rough=.3, coat=.5)      # red alcohol: a real thermometer cue
M_CABLE   = material("cable_sleeve",    "#B9B4C8", rough=.55)
# glass and water: true transmission for Cycles; swapped for honest alpha versions before the GLB export
M_GLASS   = material("lab_glass",       "#FFFFFF", rough=.02, transmission=1.0, ior=1.47)
M_WATER   = material("water_volume",    "#CFE6F7", rough=.05, transmission=.92, ior=1.33)
WEB_SWAP = {
    "lab_glass": material("lab_glass_web", "#F4F8FC", rough=.05, coat=1.0, alpha=.16),
    "water_volume": material("water_volume_web", "#9CC8EE", rough=.1, coat=1.0, alpha=.34),
}

# --------------------------------------------------------------------------------------------------- geometry helpers
def axis_map(axis):
    return {
        "Z": lambda x, y, h: (x, y, h),
        "X": lambda x, y, h: (h, x, y),
        "-Y": lambda x, y, h: (x, -h, y),
    }[axis]

def lathe(profile, seg=48, axis="Z", closed=True):
    """Revolve (r, h) profile points around an axis. r == 0 collapses to a pole."""
    f = axis_map(axis); verts, rings, faces = [], [], []
    for r, h in profile:
        if r < 1e-9:
            i = len(verts); verts.append(f(0, 0, h)); rings.append([i] * seg)
        else:
            ring = []
            for k in range(seg):
                a = 2 * math.pi * k / seg
                ring.append(len(verts)); verts.append(f(r * math.cos(a), r * math.sin(a), h))
            rings.append(ring)
    n = len(profile)
    for i in range(n if closed else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(seg):
            k2 = (k + 1) % seg; q = []
            for v in (A[k], A[k2], B[k2], B[k]):
                if v not in q: q.append(v)
            if len(q) >= 3: faces.append(q)
    return verts, faces

def cylinder(r, h, seg=32, axis="Z", z0=0.0):
    return lathe([(0, z0), (r, z0), (r, z0 + h), (0, z0 + h)], seg, axis)

def rounded_box(sx, sy, sz, bevel=0.0, segs=3):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=min(bevel, sx / 2.01, sy / 2.01, sz / 2.01),
                        segments=segs, affect="EDGES", profile=0.5)
    verts = [tuple(v.co) for v in bm.verts]; bm.verts.index_update()
    faces = [[v.index for v in f.verts] for f in bm.faces]; bm.free()
    return verts, faces

def torus(R, r, seg=48, rseg=10, axis="Z", arc=2 * math.pi, h=0.0):
    f = axis_map(axis); verts, faces = [], []
    full = abs(arc - 2 * math.pi) < 1e-6; n = seg if full else seg + 1
    for i in range(n):
        a = arc * i / seg
        for j in range(rseg):
            b = 2 * math.pi * j / rseg
            rr = R + r * math.cos(b)
            verts.append(f(rr * math.cos(a), rr * math.sin(a), h + r * math.sin(b)))
    for i in range(seg):
        i2 = (i + 1) % n
        for j in range(rseg):
            j2 = (j + 1) % rseg
            faces.append([i * rseg + j, i * rseg + j2, i2 * rseg + j2, i2 * rseg + j])
    return verts, faces

def catmull(points, steps=10):
    P = [Vector(p) for p in points]; out = []
    for i in range(len(P) - 1):
        p0 = P[max(0, i - 1)]; p1 = P[i]; p2 = P[i + 1]; p3 = P[min(len(P) - 1, i + 2)]
        for s in range(steps):
            t = s / steps; t2 = t * t; t3 = t2 * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-1]); return out

def tube(points, r, rseg=12, steps=10, caps=True):
    """Sweep a circle along a smoothed polyline with parallel-transport frames."""
    pts = catmull(points, steps); verts, faces = [], []
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(t0.z) < .9 else Vector((1, 0, 0))
    nrm = t0.cross(ref).normalized()
    prev_t = t0
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        axis = prev_t.cross(t)
        if axis.length > 1e-8:
            ang = prev_t.angle(t); nrm = (Matrix.Rotation(ang, 3, axis.normalized()) @ nrm).normalized()
        prev_t = t; bn = t.cross(nrm).normalized()
        for j in range(rseg):
            a = 2 * math.pi * j / rseg
            verts.append(tuple(p + r * (math.cos(a) * nrm + math.sin(a) * bn)))
    n = len(pts)
    for i in range(n - 1):
        for j in range(rseg):
            j2 = (j + 1) % rseg
            faces.append([i * rseg + j, i * rseg + j2, (i + 1) * rseg + j2, (i + 1) * rseg + j])
    if caps:
        c0 = len(verts); verts.append(tuple(pts[0])); c1 = len(verts); verts.append(tuple(pts[-1]))
        for j in range(rseg):
            j2 = (j + 1) % rseg
            faces.append([c0, j2, j]); faces.append([c1, (n - 1) * rseg + j, (n - 1) * rseg + j2])
    return verts, faces

def extrude_polygon(poly, length, axis="X"):
    """poly: list of (u, v) in the cross-section plane; extruded along +axis from 0..length."""
    n = len(poly); verts = []
    for s in (0.0, length):
        for u, v in poly:
            verts.append((s, u, v) if axis == "X" else (u, v, s))
    faces = [list(range(n))[::-1], [n + i for i in range(n)]]
    for i in range(n):
        i2 = (i + 1) % n; faces.append([i, i2, n + i2, n + i])
    return verts, faces

def text_geo(body, size, align="CENTER"):
    cu = bpy.data.curves.new("tmp_text", "FONT"); cu.body = body; cu.size = size
    cu.align_x = align; cu.align_y = "CENTER"; cu.extrude = 0.00012; cu.resolution_u = 3
    ob = bpy.data.objects.new("tmp_text", cu); scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    verts = [tuple(v.co) for v in me.vertices]; faces = [list(p.vertices) for p in me.polygons]
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu); bpy.data.meshes.remove(me)
    return verts, faces

def xf(geo, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    v, f = geo
    M = Matrix.Translation(loc) @ Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X") @ Matrix.Diagonal((*scale, 1))
    return [tuple(M @ Vector(p)) for p in v], f

def merge(*geos):
    V, F = [], []
    for v, f in geos:
        o = len(V); V.extend(v); F.extend([[i + o for i in face] for face in f])
    return V, F

OBJ = {}
def mesh_obj(name, geo, mat, parent=None, loc=(0, 0, 0), sharp_deg=38.0, smooth=True, role=None):
    v, f = geo
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.validate(clean_customdata=False)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    thr = math.radians(sharp_deg)
    for fc in bm.faces: fc.smooth = smooth
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > thr: e.smooth = False
    bm.to_mesh(me); bm.free(); me.update()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); EXPORT.objects.link(ob)
    if parent: ob.parent = parent
    ob.location = loc
    if role: ob["role"] = role
    OBJ[name] = ob; return ob

def empty(name, parent=None, loc=(0, 0, 0), role=None, size=.01):
    ob = bpy.data.objects.new(name, None); ob.empty_display_size = size; EXPORT.objects.link(ob)
    if parent: ob.parent = parent
    ob.location = loc
    if role: ob["role"] = role
    OBJ[name] = ob; return ob

# =================================================================================================== THE APPARATUS
ROOT = empty("PARTICLES_APPARATUS", role="asset root; apply the lesson's single uniform scale here (25 scene units per metre)")

# --------------------------------------------------------------------------------------------------- heat station
HEAT = empty("HEAT_STATION", ROOT, (0, 0, 0), role="hotplate, beaker, thermometer and stand")
HP = empty("HOTPLATE", HEAT, (0, 0, 0))
mesh_obj("HOTPLATE_FEET", merge(*[xf(cylinder(.0095, .008, 20), (x, y, 0)) for x in (-.075, .075) for y in (-.085, .085)]), M_RUBBER, HP)
mesh_obj("HOTPLATE_BODY", xf(rounded_box(.19, .21, .074, .009, 3), (0, 0, .045)), M_MINT, HP)
# side vents: shallow louvres on both flanks
vents = [xf(rounded_box(.0016, .034, .0042, .0007, 1), (sx * .0953, .02, .03 + k * .009)) for sx in (-1, 1) for k in range(4)]
mesh_obj("HOTPLATE_VENTS", merge(*vents), M_CABLE, HP)
TOP_Y = .015; TOP_Z = .0935
mesh_obj("HOTPLATE_TOP", xf(rounded_box(.194, .176, .012, .0055, 3), (0, TOP_Y, .0855)), M_WHITE, HP, role="pick: start/stop heating")
mesh_obj("HOTPLATE_SCREWS", merge(*[xf(lathe([(0, 0), (.0028, 0), (.0028, .0008), (.0018, .0014), (0, .0015)], 16), (x, TOP_Y + y, .0915))
                                    for x in (-.084, .084) for y in (-.076, .076)]), M_STEEL, HP)
mesh_obj("CERAMIC_PLATE", lathe([(0, .0915), (.0745, .0915), (.0745, .0928), (.0738, .0935), (0, .0935)], 72), M_CERAMIC, HP, loc=(0, TOP_Y, 0))
mesh_obj("PLATE_TRIM", torus(.0758, .0018, 72, 8, h=.0925), M_STEEL, HP, loc=(0, TOP_Y, 0))
# the element ring visible through the ceramic top: three concentric turns joined by a radial lead
coil = merge(torus(.0615, .0015, 72, 8, h=.0937), torus(.0465, .0015, 64, 8, h=.0937), torus(.0315, .0015, 48, 8, h=.0937),
             tube([(.0315, 0, .0937), (.0465, 0, .0937), (.0615, 0, .0937)], .0013, 8, 4, caps=True))
mesh_obj("HEAT_COIL", coil, M_COIL, HP, loc=(0, TOP_Y, 0), role="visual heat indicator; adapter tints colour only (no emission)")
# front fascia with display, LED and the power knob
mesh_obj("CONTROL_FASCIA", xf(rounded_box(.162, .006, .048, .0028, 2), (0, -.1062, .044)), M_LILAC, HP)
mesh_obj("DISPLAY_FRAME", xf(rounded_box(.066, .002, .024, .0015, 2), (-.036, -.1096, .047)), M_NAVY, HP)
mesh_obj("DISPLAY_WINDOW", xf(rounded_box(.062, .0012, .020, .0012, 2), (-.036, -.1104, .047)), M_POWDER, HP)
mesh_obj("STATUS_LED", lathe([(0, 0), (.0032, 0), (.0032, .0012), (.0024, .0022), (0, .0024)], 20, "-Y"), M_LED, HP,
         loc=(.010, -.1093, .047), role="power indicator; adapter tints colour only (no emission)")
ticks = []
for k in range(7):
    a = math.radians(225 - k * 45)
    ticks.append(xf(rounded_box(.0012, .0008, .0045, .0003, 1), (.046 + .0215 * math.cos(a), -.1095, .044 + .0215 * math.sin(a)), (0, -(a - math.pi / 2), 0)))
mesh_obj("KNOB_TICKS", merge(*ticks), M_NAVY, HP)
KNOB = empty("POWER_KNOB_PIVOT", HP, (.046, -.1093, .044), role="rotates about glTF +Z (front normal) with the existing hotplate power")
knob_body = lathe([(0, 0), (.0168, 0), (.0168, .0035), (.0142, .0045), (.0138, .0150), (.0124, .0168), (0, .0170)], 48, "-Y")
grips = [xf(rounded_box(.0016, .011, .0016, .0005, 1), (.0140 * math.cos(2 * math.pi * k / 20), -.010, .0140 * math.sin(2 * math.pi * k / 20)))
         for k in range(20)]
mesh_obj("POWER_KNOB", merge(knob_body, *grips), M_BLUSH, KNOB)
# pointer aims at the 0.5 kW mark (225 degrees, lower left) at rest
pa = math.radians(225)
mesh_obj("KNOB_POINTER", xf(rounded_box(.0105, .0010, .0018, .0004, 1), (.0062 * math.cos(pa), -.0172, .0062 * math.sin(pa)), (0, -pa, 0)), M_WHITE, KNOB)
# power cable from the rear
mesh_obj("POWER_CABLE", merge(tube([(-.062, .100, .025), (-.064, .125, .02), (-.09, .16, .006), (-.15, .19, .0045), (-.21, .205, .0045)], .0034, 12, 10),
                              xf(lathe([(0, 0), (.0062, 0), (.0062, .004), (.0045, .016), (0, .016)], 20, "-Y"), (-.062, .121, .025))), M_CABLE, HP)

# beaker: 800 mL low-form glass, rolled rim and pour spout, fired graduations
BEAKER = empty("BEAKER", HEAT, (0, TOP_Y, TOP_Z), role="beaker; its inner volume is the particle chamber for the heating steps")
B_RO, B_RI, B_H, B_FLOOR = .0500, .0485, .130, .0030
beaker_prof = [(0, 0), (.0462, 0), (.0492, .0012), (B_RO, .0048), (B_RO, B_H - .002), (.0511, B_H - .0006), (.0513, B_H + .0012),
               (.0502, B_H + .0021), (B_RI, B_H), (B_RI, .0062), (.0470, B_FLOOR + .0004), (.0452, B_FLOOR), (0, B_FLOOR)]
bv, bf = lathe(beaker_prof, 72)
spout_dir = math.radians(150)                           # rear-left, so the front view shows the graduations
bv2 = []
for (x, y, z) in bv:
    r = math.hypot(x, y)
    if r > 1e-6 and z > B_H - .018:
        a = math.atan2(y, x); d = math.atan2(math.sin(a - spout_dir), math.cos(a - spout_dir))
        w = max(0.0, 1 - abs(d) / math.radians(22)); lift = (z - (B_H - .018)) / .020
        k = 1 + (.0075 * (w ** 1.6) * lift ** 1.4) / r
        x, y = x * k, y * k
    bv2.append((x, y, z))
mesh_obj("BEAKER_GLASS", (bv2, bf), M_GLASS, BEAKER, sharp_deg=60)
grads = []; lab = []
area = math.pi * B_RI ** 2
ga = math.radians(-62)                                  # graduation column, front-right
for mL in range(50, 801, 50):
    z = B_FLOOR + mL * 1e-6 / area
    major = mL % 100 == 0; L = .012 if major else .0065
    for s in range(5):                                 # each mark follows the curve of the glass
        a = ga + (s - 2) / 4 * (L / B_RO)
        grads.append(xf(rounded_box(L / 4.6, .00035, .0007, 0, 1), ((B_RO + .00018) * math.cos(a), (B_RO + .00018) * math.sin(a), z), (0, 0, a + math.pi / 2)))
    if mL % 200 == 0:
        a = ga + .0115 / B_RO
        lab.append(xf(text_geo(str(mL), .0046, "LEFT"), ((B_RO + .0002) * math.cos(a), (B_RO + .0002) * math.sin(a), z - .0016), (math.pi / 2, 0, a + math.pi / 2)))
a = ga; lab.append(xf(text_geo("mL", .0052), ((B_RO + .0002) * math.cos(a), (B_RO + .0002) * math.sin(a), B_H - .009), (math.pi / 2, 0, a + math.pi / 2)))
mesh_obj("BEAKER_GRADUATIONS", merge(*grads, *lab), M_NAVY, BEAKER, smooth=False)
WATER_REST_H = .040
WATER = empty("WATER_PIVOT", BEAKER, (0, 0, B_FLOOR), role="origin at the inner floor; scale glTF Y for the liquid height")
mesh_obj("WATER_VOLUME", lathe([(0, 0), (B_RI - .0006, 0), (B_RI - .0006, WATER_REST_H - .0008), (B_RI - .0018, WATER_REST_H), (0, WATER_REST_H)], 64),
         M_WATER, WATER, role="liquid display only; height is supplied by the lesson's existing visual mapping")

# thermometer clamped into the beaker, on a retort stand
TH_POS = (.033, TOP_Y + .022, TOP_Z + B_FLOOR + .006)
THERMO = empty("THERMOMETER", HEAT, TH_POS, role="spirit thermometer; scale -30..140 C")
TH_L = .300; SC_MIN, SC_MAX = .022, .222; T_MIN, T_MAX = -30.0, 140.0
mesh_obj("THERMO_GLASS", lathe([(0, 0), (.0030, .0006), (.0047, .006), (.0047, .016), (.0036, .021), (.0036, TH_L - .004), (.0024, TH_L - .0005), (0, TH_L)], 24),
         M_GLASS, THERMO, sharp_deg=70)
mesh_obj("THERMO_BULB", lathe([(0, .0012), (.0028, .002), (.0038, .006), (.0038, .015), (.0012, .021), (0, .021)], 20), M_SPIRIT, THERMO)
mesh_obj("THERMO_SCALE_CARD", xf(rounded_box(.0052, .0007, SC_MAX - SC_MIN + .02, .0003, 1), (0, .0016, (SC_MIN + SC_MAX) / 2)), M_WHITE, THERMO)
tt = []
for T in range(-30, 141, 10):
    z = SC_MIN + (T - T_MIN) / (T_MAX - T_MIN) * (SC_MAX - SC_MIN); major = T % 50 == 0
    tt.append(xf(rounded_box(.0034 if major else .0018, .00025, .00042, 0, 1), (.0009 if not major else 0, .00115, z)))
mesh_obj("THERMO_TICKS", merge(*tt), M_NAVY, THERMO, smooth=False)
SPIRIT = empty("THERMO_SPIRIT_PIVOT", THERMO, (0, 0, SC_MIN), role="origin at -30 C; scale glTF Y by (T - -30) / 170")
mesh_obj("THERMO_SPIRIT", cylinder(.00085, SC_MAX - SC_MIN, 10), M_SPIRIT, SPIRIT)
mesh_obj("THERMO_CAPILLARY_LOW", cylinder(.00085, SC_MIN - .019, 10, z0=.019), M_SPIRIT, THERMO)
STAND_Y = .160                                                      # the retort stand stands BEHIND the beaker
STAND = empty("RETORT_STAND", HEAT, (TH_POS[0], STAND_Y, 0))
mesh_obj("STAND_BASE", xf(rounded_box(.100, .120, .012, .0045, 3), (0, .035, .006)), M_LILAC, STAND)
mesh_obj("STAND_ROD", merge(cylinder(.0055, .418, 28, z0=.012), xf(lathe([(0, 0), (.0062, 0), (.0062, .004), (0, .0065)], 24), (0, 0, .430)),
                             xf(lathe([(0, 0), (.0105, 0), (.0105, .006), (.0062, .009), (0, .009)], 28), (0, 0, .012))), M_STEEL, STAND)
CLAMP_Z = TH_POS[2] + .262
boss = merge(xf(rounded_box(.020, .022, .026, .003, 2), (0, 0, CLAMP_Z)), xf(cylinder(.0035, .014, 16, "X"), (.010, 0, CLAMP_Z)))
mesh_obj("BOSS_HEAD", boss, M_STEEL, STAND)
mesh_obj("BOSS_SCREW", xf(lathe([(0, 0), (.0072, 0), (.0072, .005), (.006, .0065), (0, .0068)], 24, "X"), (.024, 0, CLAMP_Z)), M_RUBBER, STAND)
arm_len = STAND_Y - TH_POS[1] - .011
mesh_obj("CLAMP_ARM", xf(cylinder(.0038, arm_len, 20, "-Y", z0=.011), (0, 0, CLAMP_Z)), M_STEEL, STAND)
mesh_obj("CLAMP_JAW", merge(xf(lathe([(.0049, -.009), (.0085, -.009), (.0085, .009), (.0049, .009)], 32), (0, TH_POS[1] - STAND_Y, CLAMP_Z)),
                            xf(torus(.0088, .0013, 32, 8), (0, TH_POS[1] - STAND_Y, CLAMP_Z + .006)), xf(torus(.0088, .0013, 32, 8), (0, TH_POS[1] - STAND_Y, CLAMP_Z - .006))),
         M_CREAM, STAND)

# --------------------------------------------------------------------------------------------------- gas station
GAS = empty("GAS_STATION", ROOT, (.40, 0, 0), role="sealed gas syringe on a bench with a pressure gauge")
mesh_obj("SYRINGE_PLINTH", xf(rounded_box(.300, .140, .007, .003, 2), (0, 0, .0035)), M_LILAC, GAS)
mesh_obj("SYRINGE_BOARD", xf(rounded_box(.292, .132, .012, .0045, 3), (0, 0, .013)), M_WHITE, GAS)
BOARD_TOP = .019; AX_Z = BOARD_TOP + .040; XN = -.072            # syringe axis height and inner nozzle wall (0 mL)
S_RI, S_RO, S_LEN = .0170, .0196, .118
ML = 1e-6 / (math.pi * S_RI ** 2)                                 # metres of plunger travel per mL
REST_ML = 60
def cradle(x):
    poly = [(-.029, 0), (.029, 0), (.029, .040)]
    for k in range(25):
        a = -k / 24 * math.pi; poly.append((.0199 * math.cos(a), .040 + .0199 * math.sin(a)))
    poly.append((-.029, .040))
    return xf(extrude_polygon(poly, .016), (x - .008, 0, BOARD_TOP))
mesh_obj("SYRINGE_CRADLES", merge(cradle(XN + .026), cradle(XN + .098)), M_MINT, GAS, sharp_deg=50)
mesh_obj("CRADLE_SCREWS", merge(*[xf(lathe([(0, 0), (.0024, 0), (.0024, .0007), (.0015, .0012), (0, .0013)], 14), (XN + x, y, BOARD_TOP + .040))
                                  for x in (.026, .098) for y in (-.0245, .0245)]), M_STEEL, GAS)
SYR = empty("SYRINGE", GAS, (XN, 0, AX_Z), role="axis along glTF +X; x = 0 is the inner face of the nozzle end (0 mL)")
mesh_obj("BARREL_GLASS", lathe([(.0021, -.004), (S_RI - .001, -.004), (S_RO, -.0012), (S_RO, S_LEN), (S_RI, S_LEN), (S_RI, 0), (.0021, 0)], 56, "X"),
         M_GLASS, SYR, sharp_deg=60, role="particle chamber for the gas-pressure step")
mesh_obj("BARREL_FLANGE", xf(rounded_box(.0045, .084, .028, .0065, 3), (S_LEN + .0012, 0, 0)), M_GLASS, SYR)
mesh_obj("NOZZLE", lathe([(.0021, -.004), (.0046, -.004), (.0040, -.010), (.0029, -.021), (.0012, -.021), (.0012, -.009), (.0021, -.006)], 24, "X"), M_GLASS, SYR)
mesh_obj("NOZZLE_SLEEVE", lathe([(.0032, -.017), (.0050, -.017), (.0052, -.0185), (.0052, -.029), (.0034, -.031), (.0026, -.031)], 24, "X"), M_BLUSH, SYR)
st = []; sl = []
for mL in range(0, 101, 5):
    x = mL * ML; major = mL % 10 == 0; L = .0075 if major else .0042
    for s in range(3):
        a = math.radians(115) + (s - 1) / 2 * (L / S_RO)   # top-front of the barrel
        st.append(xf(rounded_box(.00038, L / 2.4, .00034, 0, 1), (x, (S_RO + .00016) * math.cos(a), (S_RO + .00016) * math.sin(a)), (a - math.pi / 2, 0, 0)))
    if mL % 20 == 0 and mL > 0:
        a = math.radians(115) + .0095 / S_RO
        sl.append(xf(text_geo(str(mL), .0042), (x, (S_RO + .0002) * math.cos(a), (S_RO + .0002) * math.sin(a)), (a - math.pi / 2, 0, 0)))
a = math.radians(115) + .0095 / S_RO
sl.append(xf(text_geo("mL", .0040), (.0045, (S_RO + .0002) * math.cos(a), (S_RO + .0002) * math.sin(a)), (a - math.pi / 2, 0, 0)))
mesh_obj("BARREL_GRADUATIONS", merge(*st, *sl), M_NAVY, SYR, smooth=False)
PLUNGER = empty("PLUNGER_SLIDE", SYR, (REST_ML * ML, 0, 0), role="x = gas-side face of the rubber head; translate along glTF +X by volume")
mesh_obj("PLUNGER_HEAD", lathe([(0, -.0008), (.0110, -.0003), (.0167, .0010), (.0167, .0034), (.0157, .0044), (.0157, .0074), (.0167, .0084),
                                (.0167, .0108), (.0150, .0120), (0, .0120)], 48, "X"), M_RUBBER, PLUNGER)
ROD_L = .126
mesh_obj("PLUNGER_ROD", merge(xf(rounded_box(ROD_L, .0150, .0026, .0008, 1), (.012 + ROD_L / 2, 0, 0)),
                              xf(rounded_box(ROD_L, .0026, .0150, .0008, 1), (.012 + ROD_L / 2, 0, 0)),
                              xf(cylinder(.0058, .004, 24, "X"), (.012, 0, 0))), M_WHITE, PLUNGER, role="drag handle")
THUMB_X = .012 + ROD_L
mesh_obj("THUMB_PLATE", xf(lathe([(0, 0), (.0215, 0), (.0225, .0012), (.0225, .0040), (.0212, .0052), (0, .0052)], 48, "X"), (THUMB_X, 0, 0)), M_LILAC, PLUNGER,
         role="drag handle: press or pull to change the volume")
# copper line and gauge
GX, GY, GZ = XN - .044, .004, .192
mesh_obj("COPPER_LINE", tube([(XN - .029, 0, AX_Z), (XN - .036, 0, AX_Z), (XN - .043, .0015, AX_Z + .010), (GX, .003, AX_Z + .045), (GX, GY, GZ - .056)], .0021, 10, 10),
         M_COPPER, GAS)
GAUGE = empty("GAUGE", GAS, (GX, GY, GZ), role="pressure gauge, face normal glTF +Z, 0-400 kPa over 270 degrees clockwise")
G_R = .046
mesh_obj("GAUGE_CASE", lathe([(0, -.020), (G_R - .006, -.021), (G_R - .0015, -.018), (G_R, -.012), (G_R, .0075), (G_R - .001, .0085), (G_R - .0035, .0085), (G_R - .0035, .0012), (0, .0012)], 72, "-Y"),
         M_STEEL, GAUGE, sharp_deg=50)
mesh_obj("GAUGE_BEZEL", torus(G_R - .0015, .0024, 72, 10, "-Y", h=.0088), M_STEEL, GAUGE)
mesh_obj("GAUGE_STEM", merge(xf(lathe([(0, 0), (.0075, 0), (.0075, .009), (0, .009)], 6), (0, 0, -G_R - .007)),
                             xf(cylinder(.004, .008, 16), (0, 0, -G_R - .014))), M_STEEL, GAUGE)
mesh_obj("GAUGE_DIAL", lathe([(0, .0016), (G_R - .0042, .0016), (G_R - .0042, .0020), (0, .0020)], 72, "-Y"), M_WHITE, GAUGE)
# a lilac band shows the working sweep; navy ticks and numerals are fixed scale marks, never live values
arc = []
for i in range(54):
    a0 = math.radians(225 - 270 * i / 54); a1 = math.radians(225 - 270 * (i + 1) / 54)
    r0, r1 = .0315, .0335
    p = [(r0 * math.cos(a0), r0 * math.sin(a0)), (r1 * math.cos(a0), r1 * math.sin(a0)), (r1 * math.cos(a1), r1 * math.sin(a1)), (r0 * math.cos(a1), r0 * math.sin(a1))]
    arc.append(([(u, -.0022, v) for u, v in p], [[0, 1, 2, 3]]))
mesh_obj("GAUGE_ARC", merge(*arc), M_LILAC, GAUGE, smooth=False)
gt = []
for kPa in range(0, 401, 10):
    a = math.radians(225 - 270 * kPa / 400); major = kPa % 50 == 0; L = .0065 if major else .0032; w = .0011 if major else .0006
    r = .0398 - L / 2
    gt.append(xf(rounded_box(L, .0003, w, 0, 1), (r * math.cos(a), -.0023, r * math.sin(a)), (0, -a, 0)))
    if kPa % 100 == 0:
        rr = .0255
        gt.append(xf(text_geo(str(kPa), .0052), (rr * math.cos(a), -.0023, rr * math.sin(a)), (math.pi / 2, 0, 0)))
gt.append(xf(text_geo("kPa", .0060), (0, -.0023, -.0175), (math.pi / 2, 0, 0)))
mesh_obj("GAUGE_MARKS", merge(*gt), M_NAVY, GAUGE, smooth=False)
NEEDLE = empty("GAUGE_NEEDLE_PIVOT", GAUGE, (0, -.0034, 0), role="rotate about glTF +Z: angle = -(kPa / 400) * 270 degrees from the 0 kPa rest")
na = math.radians(225)
blade = ([(-.0075, -.0004, -.0011), (-.0075, -.0004, .0011), (.0355, -.0004, .00035), (.0355, -.0004, -.00035),
          (-.0075, -.0011, -.0011), (-.0075, -.0011, .0011), (.0355, -.0011, .00035), (.0355, -.0011, -.00035)],
         [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]])
mesh_obj("GAUGE_NEEDLE", xf(blade, rot=(0, -na, 0)), material("needle_blush_deep", "#B5466F", rough=.35, coat=.4), NEEDLE, smooth=False)
mesh_obj("NEEDLE_HUB", lathe([(0, 0), (.0036, 0), (.0036, .0016), (.0024, .0026), (0, .0028)], 24, "-Y"), M_NAVY, NEEDLE, loc=(0, -.0004, 0))
mesh_obj("GAUGE_LENS", lathe([(0, .0076), (G_R - .0034, .0076), (G_R - .0034, .0082), (0, .0086)], 72, "-Y"), M_GLASS, GAUGE)
mesh_obj("GAUGE_POST", merge(xf(cylinder(.0042, GZ - BOARD_TOP - .02, 20), (GX, .032, BOARD_TOP)),
                             xf(rounded_box(.014, .018, .010, .002, 2), (GX, .0235, GZ - .022)),
                             xf(lathe([(0, 0), (.0085, 0), (.0085, .003), (.0045, .005), (0, .005)], 24), (GX, .032, BOARD_TOP))), M_STEEL, GAS)

# --------------------------------------------------------------------------------------------------- hotspots (label anchors)
for name, parent, loc, why in [
    ("HOTSPOT_BEAKER", BEAKER, (-B_RO, 0, B_H * .82), "beaker label"),
    ("HOTSPOT_HOTPLATE", HP, (-.06, -.11, .07), "hotplate label"),
    ("HOTSPOT_THERMOMETER", THERMO, (0, 0, SC_MAX), "thermometer label"),
    ("HOTSPOT_GAUGE", GAUGE, (0, -.006, G_R), "pressure label"),
    ("HOTSPOT_CHAMBER", SYR, (S_LEN * .45, 0, S_RO + .004), "volume label"),
    ("HOTSPOT_PLUNGER", PLUNGER, (THUMB_X + .003, 0, .024), "drag hint"),
]:
    empty(name, parent, loc, role=why, size=.005)

bpy.context.view_layer.update()

# =================================================================================================== contract
def g(v):  # Blender world -> glTF world
    return [round(v[0], 6), round(v[2], 6), round(-v[1], 6)]
def world(ob, local=(0, 0, 0)):
    return ob.matrix_world @ Vector(local)

beaker_w = world(BEAKER); syr_w = world(SYR); th_w = world(THERMO); gauge_w = world(GAUGE)
contract = {
    "contract": CONTRACT,
    "asset": "particles-apparatus.glb",
    "units": "metres",
    "route": "/study/m/particles.html",
    "coordinates": {
        "authoring": "Blender +X right, +Y rear, +Z up",
        "gltf": "glTF +X right, +Y up, +Z front",
        "map": "(x,y,z) -> (x,z,-y)",
        "legacy_scene_units_per_metre": 25,
        "legacy_note": "The lesson's 3D bench draws particles in scene units. Apply ONE uniform root scale of 25; never scale rig parts individually.",
    },
    "state_owner": "study/m/particles.js owns the heating model (stateFrom, boilPoint, pressureAt), the gas law pressure(), the timer, controls, "
                   "lesson A/B capture and every challenge. This asset holds no physics, timer or random values.",
    "rig": {
        "plunger": {"node": "PLUNGER_SLIDE", "axis_gltf": "parent +X", "input": "existing s.vol (mL)",
                    "rest_volume_mL": REST_ML, "metres_per_mL": ML, "geometry_range_mL": [0, 100], "lesson_range_mL": [20, 100],
                    "pose": "position.x = rest.x + (volume_mL - 60) * metres_per_mL"},
        "gauge_needle": {"node": "GAUGE_NEEDLE_PIVOT", "axis_gltf": "local +Z (dial normal, towards the viewer)", "input": "existing pressure() in kPa",
                         "zero_angle_deg": 225, "sweep_deg": 270, "full_scale_kPa": 400, "direction": "clockwise as seen from the front",
                         "pose": "rotation.z = -clamp(kPa, 0, 400) / 400 * 1.5 * PI", "note": "Display clamp only; readouts keep the model's value."},
        "thermometer": {"node": "THERMO_SPIRIT_PIVOT", "axis_gltf": "local +Y", "input": "existing stateFrom(...).T in degrees C",
                        "scale_min_C": T_MIN, "scale_max_C": T_MAX, "pose": "scale.y = clamp((T + 30) / 170, 0.01, 1)",
                        "world_y_at_min_m": round(world(SPIRIT).z, 6), "world_y_at_max_m": round(world(SPIRIT, (0, 0, SC_MAX - SC_MIN)).z, 6),
                        "world_xz_m": [round(world(THERMO).x, 6), round(-world(THERMO).y, 6)]},
        "water": {"node": "WATER_PIVOT", "mesh": "WATER_VOLUME", "axis_gltf": "local +Y", "rest_height_m": WATER_REST_H,
                  "input": "liquid height in metres from the lesson's existing liqTop mapping (particle sample, not 500 mL)",
                  "pose": "scale.y = clamp(height_m / 0.040, 0.02, 2.5); visible flag from the lesson"},
        "heat_coil": {"node": "HEAT_COIL", "input": "heat level 0..1 already smoothed by the lesson",
                      "pose": "material colour lerp #D9CCD3 -> #E58A9E; no emission or bloom"},
        "status_led": {"node": "STATUS_LED", "pose": "colour #BFE8D6 when idle, #E8688A while the lesson is heating; no emission"},
        "power_knob": {"node": "POWER_KNOB_PIVOT", "axis_gltf": "local +Z", "input": "existing s.power (kW)", "range_kW": [0.5, 3.0],
                       "pose": "rotation.z = -(clamp(kW, 0.5, 3) - 0.5) / 2.5 * 1.5 * PI"},
    },
    "regions": {
        "beaker_inner": {"note": "Particle chamber for the heating steps (glTF metres).", "centre_xz_m": [round(beaker_w.x, 6), round(-beaker_w.y, 6)],
                         "floor_y_m": round(beaker_w.z + B_FLOOR, 6), "rim_y_m": round(beaker_w.z + B_H, 6), "inner_radius_m": B_RI},
        "syringe_chamber": {"note": "Particle chamber for the gas step: a cylinder from the nozzle wall to the plunger face.",
                            "axis_y_m": round(syr_w.z, 6), "axis_z_m": round(-syr_w.y, 6), "nozzle_inner_x_m": round(syr_w.x, 6),
                            "inner_radius_m": S_RI, "plunger_face_x_at_rest_m": round(syr_w.x + REST_ML * ML, 6),
                            "thumb_offset_from_face_m": round(THUMB_X, 6), "barrel_open_end_x_m": round(syr_w.x + S_LEN, 6)},
        "gauge": {"centre_m": g(gauge_w), "radius_m": G_R},
    },
    "nodes": {},
    "hotspots": {},
}
for name, ob in OBJ.items():
    entry = {"parent": ob.parent.name if ob.parent else None, "world_pivot_gltf_m": g(ob.matrix_world.translation),
             "rest_translation_gltf_m": g(ob.location), "type": "mesh" if ob.type == "MESH" else "empty"}
    if "role" in ob: entry["role"] = ob["role"]
    (contract["hotspots"] if name.startswith("HOTSPOT_") else contract["nodes"])[name] = entry

# =================================================================================================== save .blend, render
os.makedirs(os.path.join(OUT, "renders"), exist_ok=True)

def studio():
    sc = scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception: pass
    sc.cycles.max_bounces = 10; sc.cycles.transmission_bounces = 10; sc.cycles.transparent_max_bounces = 12
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "None"; sc.view_settings.exposure = 0.0
    sc.render.film_transparent = False
    w = bpy.data.worlds.new("studio_world"); sc.world = w
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = lin("#EDE9EE"); bg.inputs["Strength"].default_value = .35
    # a curved cream cyclorama
    cyc_v, cyc_f = [], []
    xs = (-1.2, 1.6); n = 24
    for i in range(n + 1):
        t = i / n
        if t < .5: y, z = -1.0 + t / .5 * 1.25, 0.0
        else:
            a = (t - .5) / .5 * math.pi / 2; y, z = .25 + .45 * math.sin(a), .45 * (1 - math.cos(a))
        cyc_v += [(xs[0], y, z), (xs[1], y, z)]
    cyc_v.append((xs[0], .70, 1.4)); cyc_v.append((xs[1], .70, 1.4))
    for i in range(n + 1):
        cyc_f.append([2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2])
    me = bpy.data.meshes.new("cyclorama"); me.from_pydata(cyc_v, [], cyc_f); me.update()
    for p in me.polygons: p.use_smooth = True
    cyc = bpy.data.objects.new("cyclorama", me); STUDIO.objects.link(cyc); cyc.location.z = -0.0005
    cyc.data.materials.append(material("studio_paper", "#F2EEEA", rough=.9))
    def area(name, loc, rot, size, energy, col="#FFFFFF"):
        L = bpy.data.lights.new(name, "AREA"); L.shape = "RECTANGLE"; L.size = size[0]; L.size_y = size[1]; L.energy = energy
        L.color = lin(col)[:3]; o = bpy.data.objects.new(name, L); STUDIO.objects.link(o); o.location = loc; o.rotation_euler = rot
    area("key_softbox", (-.55, -.55, .95), (math.radians(48), 0, math.radians(-40)), (.9, .6), 34, "#FFF6EE")
    area("fill_card", (.95, -.6, .45), (math.radians(65), 0, math.radians(55)), (.8, .8), 10, "#EEF1FF")
    area("top_card", (.2, .2, 1.3), (0, 0, 0), (1.4, 1.0), 16)

def camera(name, loc, target, lens):
    c = bpy.data.cameras.new(name); c.lens = lens; c.clip_start = .01
    o = bpy.data.objects.new(name, c); STUDIO.objects.link(o); o.location = loc
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return o

def pose(volume_mL, kPa, temp_C, water_h):
    OBJ["PLUNGER_SLIDE"].location.x = volume_mL * ML
    # Blender: glTF +Z (front) is Blender -Y; a glTF rotation of -theta about +Z is +theta about Blender -Y i.e. -theta about +Y
    OBJ["GAUGE_NEEDLE_PIVOT"].rotation_euler = (0, math.radians(270 * kPa / 400), 0)
    OBJ["THERMO_SPIRIT_PIVOT"].scale.z = max(.01, (temp_C - T_MIN) / (T_MAX - T_MIN))
    OBJ["WATER_PIVOT"].scale.z = water_h / WATER_REST_H

def render(cam, path, res):
    scene.camera = cam; scene.render.resolution_x, scene.render.resolution_y = res; scene.render.resolution_percentage = RES_SCALE
    scene.render.image_settings.file_format = "PNG"; scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

studio()
cams = {
    "hero": camera("cam_hero", (-.14, -1.10, .56), (.235, .02, .17), 48),
    "syringe": camera("cam_syringe_detail", (.20, -.43, .29), (.375, .0, .118), 46),
    "heat": camera("cam_heat_detail", (-.30, -.42, .34), (.02, .02, .16), 52),
}
pose(60, 101.3, 20.0, .030)        # the lesson's defaults: 60 mL at 20 C reads 101.3 kPa
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "particles.blend"), compress=True)
renders = {}
if RENDER:
    render(cams["hero"], os.path.join(OUT, "renders", "particles-hero.png"), (1400, 1050)); renders["hero"] = "renders/particles-hero.png"
    if "--hero-only" in sys.argv: RENDER_DETAIL = False
    else: RENDER_DETAIL = True
if RENDER and RENDER_DETAIL:
    pose(30, 202.6, 20.0, .030)    # observation B: half the volume, double the pressure
    render(cams["syringe"], os.path.join(OUT, "renders", "particles-detail-syringe.png"), (1000, 750)); renders["detail_syringe"] = "renders/particles-detail-syringe.png"
    pose(60, 101.3, 62.0, .036)
    render(cams["heat"], os.path.join(OUT, "renders", "particles-detail-heat.png"), (1000, 750)); renders["detail_heat"] = "renders/particles-detail-heat.png"
pose(60, 0.0, T_MIN, WATER_REST_H) # export rest: needle at 0 kPa, spirit at full scale length, water at rest height
OBJ["THERMO_SPIRIT_PIVOT"].scale.z = 1.0
OBJ["GAUGE_NEEDLE_PIVOT"].rotation_euler = (0, 0, 0)
bpy.context.view_layer.update()

# =================================================================================================== GLB export
for ob in EXPORT.objects:
    if ob.type == "MESH" and ob.data.materials[0].name in WEB_SWAP:
        ob.data.materials[0] = WEB_SWAP[ob.data.materials[0].name]
for ob in bpy.data.objects: ob.select_set(ob.name in EXPORT.objects)
glb = os.path.join(OUT, "particles-apparatus.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True, export_extras=True,
                          export_texcoords=False, export_normals=True, export_tangents=False, export_materials="EXPORT", export_cameras=False,
                          export_lights=False, export_animations=False, export_skins=False, export_morph=False)

# stats from the exported file itself
data = open(glb, "rb").read()
jlen = int.from_bytes(data[12:16], "little"); gj = json.loads(data[20:20 + jlen])
tris = 0
for m in gj["meshes"]:
    for p in m["primitives"]:
        tris += gj["accessors"][p["indices"]]["count"] // 3 if "indices" in p else gj["accessors"][p["attributes"]["POSITION"]]["count"] // 3
prims = sum(len(m["primitives"]) for m in gj["meshes"])
contract["asset_stats"] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "triangles": tris, "meshes": len(gj["meshes"]),
                           "primitives": prims, "nodes": len(gj["nodes"]), "materials": len(gj.get("materials", [])),
                           "textures": len(gj.get("textures", [])), "extensions_used": gj.get("extensionsUsed", []),
                           "budget": {"bytes_max": 2_500_000, "triangles_max": 80_000, "primitives_max": 80, "textures_max": 0}}
contract["tooling"] = {"blender": bpy.app.version_string, "gltf_exporter": ".".join(map(str, __import__("io_scene_gltf2").bl_info["version"])),
                       "render": {"engine": "Cycles (CPU)", "samples": SAMPLES, "denoiser": "OpenImageDenoise", "rendered": RENDER, "files": renders}}
with open(os.path.join(OUT, "particles-rig-contract.json"), "w") as fh:
    json.dump(contract, fh, indent=1)
print("GLB", contract["asset_stats"])
