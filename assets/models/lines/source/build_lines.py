"""Reproducible Blender build for the straight-line machine's two water tanks.

    .venv/bin/python assets/models/lines/source/build_lines.py            # .blend + GLB + renders + reports
    .venv/bin/python assets/models/lines/source/build_lines.py --no-render # .blend + GLB + reports only
    .venv/bin/python assets/models/lines/source/build_lines.py --preview   # quick low-sample renders
    add --only=hero (or detail-outlet, detail-inlet) to render a single shot

Runs with headless `bpy` 5.1.x (pip) or inside Blender 5.1 (`blender -b -P build_lines.py -- --no-render`).
Everything is authored here from primitives: no imported meshes, no generated imagery, no textures.

Units are metres. Blender axes: +X right, +Y rear, +Z up; the front of each tank faces -Y.
glTF axes: +X right, +Y up, +Z front. Mapping (x, y, z)_Blender -> (x, z, -y)_glTF.

The tank interior is 0.40 m wide x 0.25 m deep, so its plan area is 0.1 m^2 and
    1 litre = 0.001 m^3 / 0.1 m^2 = 0.01 m of water height.
`WATER_<k>` is authored as the full 100 L volume (1.00 m tall) with its origin on the
interior floor, so a node scale of (litres / 100) on the vertical axis is exact.
The lesson model (study/m/lines.js) remains the only source of litres.
"""
import bpy, bmesh, math, os, sys, json, hashlib, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)  # assets/models/lines
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
RENDER = '--no-render' not in ARGS
PREVIEW = '--preview' in ARGS

# ------------------------------------------------------------------ dimensions (metres)
IX, IY = 0.40, 0.25            # interior plan
WALL = 0.010                   # acrylic wall
FLOOR_T = 0.015                # acrylic floor
STAND_H = 0.160                # top of the steel stand
PAN_T = 0.012                  # powder-coated base pan under the acrylic
FZ = STAND_H + PAN_T + FLOOR_T # interior floor, 0.187 m above the bench
M_PER_L = 0.01                 # 1 L = 10 mm of height (0.1 m^2 plan)
CAP_L = 100.0                  # lesson clamps the drawing to 0..100 L
FULL_H = CAP_L * M_PER_L       # 1.00 m
FREEBOARD = 0.060
WALL_TOP = FZ + FULL_H + FREEBOARD   # 1.247
OX, OY = IX / 2 + WALL, IY / 2 + WALL  # outer half extents of the acrylic box
NOZZLE_Z = 1.300               # inlet nozzle tip
PIPE_R = 0.0107                # DN15 steel, 21.3 mm OD
TANK_X = {'A': -0.31, 'B': 0.31}
OUTLET = dict(x=0.120, z=FZ + 0.016)   # bulkhead centre on the front wall
FLOAT = dict(x=0.165, y=-0.088, r=0.022, half=0.012)
STREAM_R = 0.0055
DRAIN_TIP_Z = 0.118
TROUGH_WATER_Z = 0.046

PAL = {  # sRGB hex; palette per docs/design/3d-production-standard.md
    'cream': '#F6EFE3', 'white': '#FFFFFF', 'lilac': '#D3C2F2', 'blush': '#F3B8C8', 'mint': '#BFE8D6',
    'powder': '#BFDDF5', 'navy': '#222A55', 'steel': '#CBD3DD', 'slate': '#4A5166',
    'waterA': '#7FB7E8', 'waterB': '#F2A7BE', 'accentA': '#9CC6EE', 'accentB': '#F0A9BD'}

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]

# ------------------------------------------------------------------ scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'; scene.unit_settings.scale_length = 1.0
EXPORT = bpy.data.collections.new('LINES_TANKS'); scene.collection.children.link(EXPORT)
STAGE = bpy.data.collections.new('RENDER_STAGE_NOT_EXPORTED'); scene.collection.children.link(STAGE)

# ------------------------------------------------------------------ materials
MATS = {}
def material(name, col, rough=0.4, metal=0.0, coat=0.0, trans=0.0, ior=1.45, alpha=1.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(col); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['IOR'].default_value = ior
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.08
    b.inputs['Transmission Weight'].default_value = trans; b.inputs['Alpha'].default_value = alpha
    if alpha < 1: m.surface_render_method = 'BLENDED'
    m.diffuse_color = lin(col)[:3] + [alpha]
    MATS[name] = m; return m

material('POWDERCOAT_CREAM', PAL['cream'], rough=0.42, coat=0.25)
material('PLASTIC_WHITE', PAL['white'], rough=0.35, coat=0.3)
material('PROFILE_LILAC', PAL['lilac'], rough=0.32, coat=0.35)
material('ACRYLIC_CLEAR', '#FBFAFF', rough=0.015, trans=1.0, ior=1.49, coat=0.0)
material('STEEL_BRUSHED', PAL['steel'], rough=0.26, metal=1.0)
material('STEEL_FASTENER', '#B7C0CC', rough=0.3, metal=1.0)
material('RUBBER_SLATE', PAL['slate'], rough=0.85)
material('INK_NAVY', PAL['navy'], rough=0.5)
material('SCALE_VINYL', PAL['white'], rough=0.55)
material('TROUGH_MINT', PAL['mint'], rough=0.38, coat=0.3)
for k in 'AB':
    material('WATER_' + k, PAL['water' + k], rough=0.03, trans=0.9, ior=1.333)
    material('ACCENT_' + k, PAL['accent' + k], rough=0.34, coat=0.4)
    material('STREAM_' + k, PAL['water' + k], rough=0.03, trans=0.85, ior=1.333)

# ------------------------------------------------------------------ mesh helpers (all return bmesh, built about a local pivot)
def bm_new(): return bmesh.new()

def add_box(bm, sx, sy, sz, c=(0, 0, 0), bevel=0.0, seg=2, mat=0):
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    for v in vs:
        v.co = Vector((v.co.x * sx + c[0], v.co.y * sy + c[1], v.co.z * sz + c[2]))
    faces = list({f for v in vs for f in v.link_faces})
    for f in faces: f.material_index = mat
    if bevel > 0:
        edges = list({e for v in vs for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=min(bevel, sx / 2.2, sy / 2.2, sz / 2.2), segments=seg,
                        affect='EDGES', profile=0.5, clamp_overlap=True)
    return vs

def add_cyl(bm, r1, r2, h, c=(0, 0, 0), axis='Z', seg=24, mat=0, cap=True):
    res = bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    rot = {'Z': Matrix.Identity(3), 'X': Matrix.Rotation(math.pi / 2, 3, 'Y'), 'Y': Matrix.Rotation(-math.pi / 2, 3, 'X')}[axis]
    for v in res['verts']:
        v.co = rot @ v.co + Vector(c)
    for f in {f for v in res['verts'] for f in v.link_faces}: f.material_index = mat
    return res['verts']

def add_hex(bm, across_flats, h, c, axis='Z', mat=0):
    return add_cyl(bm, across_flats / math.sqrt(3), across_flats / math.sqrt(3), h, c, axis, seg=6, mat=mat)

def add_torus(bm, R, r, c=(0, 0, 0), seg=40, rseg=10, arc=2 * math.pi, start=0.0, mat=0, normal='Z'):
    """Torus (or arc of one) in the plane normal to `normal`."""
    closed = abs(arc - 2 * math.pi) < 1e-6
    n = seg if closed else seg + 1
    rings = []
    for i in range(n):
        a = start + arc * i / seg
        ring = []
        for j in range(rseg):
            b = 2 * math.pi * j / rseg
            p = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
            if normal == 'Y': p = Vector((p.x, p.z, p.y))
            elif normal == 'X': p = Vector((p.z, p.x, p.y))
            ring.append(bm.verts.new(p + Vector(c)))
        rings.append(ring)
    for i in range(seg):
        a, b2 = rings[i], rings[(i + 1) % n]
        for j in range(rseg):
            f = bm.faces.new((a[j], a[(j + 1) % rseg], b2[(j + 1) % rseg], b2[j])); f.material_index = mat
    return rings

def add_sweep(bm, pts, r, bend=0.035, seg=16, mat=0, cap=True, bend_steps=10):
    """A pipe of radius r along a polyline with filleted bends (bend radius `bend`). Parallel-transport frames."""
    P = [Vector(p) for p in pts]
    path = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        d1, d2 = (b - a).normalized(), (c - b).normalized()
        ang = d1.angle(d2)
        if ang < 1e-4: path.append(b); continue
        t = bend * math.tan(ang / 2)
        t = min(t, (b - a).length * 0.49, (c - b).length * 0.49)
        p1, p2 = b - d1 * t, b + d2 * t
        # quadratic-ish fillet via circular arc approximation (rotating direction)
        axis = d1.cross(d2).normalized(); rr = t / math.tan(ang / 2)
        centre = p1 + axis.cross(d1).normalized() * rr
        for k in range(bend_steps + 1):
            q = Matrix.Rotation(ang * k / bend_steps, 3, axis)
            path.append(centre + q @ (p1 - centre))
    path.append(P[-1])
    # de-duplicate
    clean = [path[0]]
    for p in path[1:]:
        if (p - clean[-1]).length > 1e-6: clean.append(p)
    path = clean
    tangents = []
    for i in range(len(path)):
        a = path[max(0, i - 1)]; b = path[min(len(path) - 1, i + 1)]
        tangents.append((b - a).normalized())
    up = Vector((0, 0, 1)) if abs(tangents[0].z) < 0.9 else Vector((1, 0, 0))
    nrm = tangents[0].cross(up).normalized()
    rings = []
    for i, p in enumerate(path):
        if i > 0:
            q = tangents[i - 1].rotation_difference(tangents[i]); nrm = (q @ nrm).normalized()
        bin_ = tangents[i].cross(nrm).normalized()
        ring = [bm.verts.new(p + (nrm * math.cos(2 * math.pi * j / seg) + bin_ * math.sin(2 * math.pi * j / seg)) * r) for j in range(seg)]
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(seg):
            f = bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j])); f.material_index = mat
    if cap:
        f = bm.faces.new(list(reversed(rings[0]))); f.material_index = mat
        f = bm.faces.new(rings[-1]); f.material_index = mat
    return path

def rrect(w, d, r, seg=4):
    pts = []
    for cx, cy, a0 in [(w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)]:
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def add_prism(bm, outline, z0, z1, mat=0):
    bot = [bm.verts.new((x, y, z0)) for x, y in outline]
    top = [bm.verts.new((x, y, z1)) for x, y in outline]
    n = len(outline)
    f = bm.faces.new(list(reversed(bot))); f.material_index = mat
    f = bm.faces.new(top); f.material_index = mat
    for i in range(n):
        f = bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i])); f.material_index = mat
    return bot + top

def add_text(bm, body, size, c, mat=0, align='CENTER', valign='CENTER', rot_x=math.pi / 2, depth=0.0004):
    cu = bpy.data.curves.new('tmp_text', 'FONT'); cu.body = body; cu.size = size
    cu.align_x = align; cu.align_y = valign; cu.extrude = depth / 2; cu.resolution_u = 3
    ob = bpy.data.objects.new('tmp_text', cu); scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    tb = bmesh.new(); tb.from_mesh(me)
    M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot_x, 4, 'X')
    for v in tb.verts: v.co = M @ v.co
    for f in tb.faces: f.material_index = mat
    tmp = bpy.data.meshes.new('tmp'); tb.to_mesh(tmp); tb.free(); bm.from_mesh(tmp)
    bpy.data.meshes.remove(tmp); bpy.data.meshes.remove(me); bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)

def obj(name, bm, mats, parent, loc=(0, 0, 0), smooth_angle=None, coll=EXPORT, extras=None):
    me = bpy.data.meshes.new(name)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(MATS[m])
    if smooth_angle is not None:
        for p in me.polygons: p.use_smooth = True
        try: me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        except Exception: pass
    o = bpy.data.objects.new(name, me); coll.objects.link(o)
    o.parent = parent; o.location = loc
    for k, v in (extras or {}).items(): o[k] = v
    return o

def empty(name, parent=None, loc=(0, 0, 0), coll=EXPORT, extras=None):
    e = bpy.data.objects.new(name, None); coll.objects.link(e); e.parent = parent; e.location = loc
    e.empty_display_size = 0.05
    for k, v in (extras or {}).items(): e[k] = v
    return e

# ------------------------------------------------------------------ one tank
def build_tank(k):
    root = empty('TANK_' + k, loc=(TANK_X[k], 0, 0), extras={'lesson_tank': k})
    P = lambda s: 'TANK_%s_%s' % (k, s)
    acc, water, stream = 'ACCENT_' + k, 'WATER_' + k, 'STREAM_' + k

    # --- stand: 30x30 powder-coated square tube, braced, levelling feet
    SW, SD, T = OX + 0.035, OY + 0.035, 0.030
    bm = bm_new()
    legs = [(sx * (SW - T / 2), sy * (SD - T / 2)) for sx in (-1, 1) for sy in (-1, 1)]
    for x, y in legs:
        add_box(bm, T, T, STAND_H - 0.030, (x, y, 0.030 + (STAND_H - 0.030) / 2), bevel=0.003)
    for z in (STAND_H - T / 2, 0.062):
        add_box(bm, 2 * SW - 2 * T, T, T, (0, -(SD - T / 2), z), bevel=0.003)
        add_box(bm, 2 * SW - 2 * T, T, T, (0, (SD - T / 2), z), bevel=0.003)
        add_box(bm, T, 2 * SD - 2 * T, T, (-(SW - T / 2), 0, z), bevel=0.003)
        add_box(bm, T, 2 * SD - 2 * T, T, ((SW - T / 2), 0, z), bevel=0.003)
    add_box(bm, T * 0.8, 2 * SD - 2 * T, T * 0.8, (0, 0, STAND_H - T * 0.4), bevel=0.002)  # centre joist
    for x, y in legs:  # gusset plates under the top rails
        sx, sy = (1 if x < 0 else -1), (1 if y < 0 else -1)
        add_box(bm, 0.050, 0.004, 0.050, (x + sx * (T / 2 + 0.025), y, STAND_H - T - 0.025), bevel=0.001, seg=1)
        add_box(bm, 0.004, 0.050, 0.050, (x, y + sy * (T / 2 + 0.025), STAND_H - T - 0.025), bevel=0.001, seg=1)
    obj(P('STAND'), bm, ['POWDERCOAT_CREAM'], root, smooth_angle=35)
    bm = bm_new()
    for x, y in legs:
        add_cyl(bm, 0.0055, 0.0055, 0.022, (x, y, 0.019), seg=12, mat=0)
        add_hex(bm, 0.017, 0.006, (x, y, 0.027), mat=0)
        add_cyl(bm, 0.019, 0.021, 0.010, (x, y, 0.005), seg=28, mat=1)
    obj(P('FEET'), bm, ['STEEL_FASTENER', 'RUBBER_SLATE'], root, smooth_angle=40)

    # --- base pan (white powder-coat tray the acrylic stands in)
    bm = bm_new()
    add_box(bm, 2 * OX + 0.03, 2 * OY + 0.03, PAN_T, (0, 0, STAND_H + PAN_T / 2), bevel=0.004, seg=3)
    obj(P('BASE_PAN'), bm, ['PLASTIC_WHITE'], root, smooth_angle=35)

    # --- acrylic box: four bonded 10 mm panels on a 15 mm floor (real thickness, so Cycles refracts honestly)
    bm = bm_new()
    add_box(bm, 2 * OX, 2 * OY, FLOOR_T, (0, 0, STAND_H + PAN_T + FLOOR_T / 2), bevel=0.0015)
    zc, hz = (FZ + WALL_TOP) / 2, WALL_TOP - FZ
    add_box(bm, 2 * OX, WALL, hz, (0, -(OY - WALL / 2), zc), bevel=0.0015)
    add_box(bm, 2 * OX, WALL, hz, (0, (OY - WALL / 2), zc), bevel=0.0015)
    add_box(bm, WALL, 2 * OY - 2 * WALL, hz, (-(OX - WALL / 2), 0, zc), bevel=0.0015)
    add_box(bm, WALL, 2 * OY - 2 * WALL, hz, ((OX - WALL / 2), 0, zc), bevel=0.0015)
    obj(P('ACRYLIC'), bm, ['ACRYLIC_CLEAR'], root, smooth_angle=30)

    # --- frame: lilac aluminium angle on all vertical edges, a top rim of 30x20 box section, bolted
    bm = bm_new(); A, t = 0.026, 0.003
    for sx in (-1, 1):
        for sy in (-1, 1):
            z0, z1 = STAND_H + PAN_T, WALL_TOP + 0.002
            add_box(bm, A, t, z1 - z0, (sx * (OX + 0) - sx * (A / 2 - t), sy * (OY + t / 2), (z0 + z1) / 2), bevel=0.0008, seg=1)
            add_box(bm, t, A, z1 - z0, (sx * (OX + t / 2), sy * (OY + 0) - sy * (A / 2 - t), (z0 + z1) / 2), bevel=0.0008, seg=1)
    RW, RH = 0.030, 0.020
    rz = WALL_TOP + RH / 2 - 0.004
    add_box(bm, 2 * OX + 2 * RW, RW, RH, (0, -(OY + RW / 2 - WALL), rz), bevel=0.003)
    add_box(bm, 2 * OX + 2 * RW, RW, RH, (0, (OY + RW / 2 - WALL), rz), bevel=0.003)
    add_box(bm, RW, 2 * OY - 2 * WALL + 0.0, RH, (-(OX + RW / 2 - WALL), 0, rz), bevel=0.003)
    add_box(bm, RW, 2 * OY - 2 * WALL, RH, ((OX + RW / 2 - WALL), 0, rz), bevel=0.003)
    obj(P('FRAME'), bm, ['PROFILE_LILAC'], root, smooth_angle=35)
    bm = bm_new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            for z in [STAND_H + 0.06 + i * 0.20 for i in range(6)]:
                add_cyl(bm, 0.0042, 0.0042, 0.003, (sx * (OX - 0.010), sy * (OY + t + 0.0015), z), axis='Y', seg=10)
                add_cyl(bm, 0.0042, 0.0042, 0.003, (sx * (OX + t + 0.0015), sy * (OY - 0.010), z), axis='X', seg=10)
    obj(P('FASTENERS'), bm, ['STEEL_FASTENER'], root, smooth_angle=50)

    # --- measuring scale: white vinyl strip on the outside of the front wall, navy ticks every 5 L, numerals every 10 L
    SX0 = -OX + 0.052; SY = -(OY + 0.0003)
    bm = bm_new()
    add_box(bm, 0.050, 0.0006, FULL_H + 0.045, (SX0 + 0.006, SY, FZ + FULL_H / 2 + 0.012), bevel=0.0002, seg=1)
    obj(P('SCALE'), bm, ['SCALE_VINYL'], root)
    bm = bm_new(); INK_Y = SY - 0.0006
    for i in range(0, 21):
        L = i * 5; z = FZ + L * M_PER_L; major = (L % 10 == 0)
        wdt = 0.024 if major else 0.013
        add_box(bm, wdt, 0.0003, 0.0016 if major else 0.0011, (SX0 - 0.016 + wdt / 2, INK_Y, z))
        if major:
            add_text(bm, str(L), 0.0120, (SX0 + 0.0110, INK_Y, z), align='LEFT', depth=0.0003)
    add_text(bm, 'LITRES', 0.0085, (SX0 + 0.010, INK_Y, FZ + FULL_H + 0.026), align='CENTER', depth=0.0003)
    obj(P('SCALE_INK'), bm, ['INK_NAVY'], root, extras={'metres_per_litre': M_PER_L, 'zero_litre_z_blender_m': FZ})

    # --- name plate on the stand's front rail
    bm = bm_new()
    add_box(bm, 0.120, 0.004, 0.024, (0, -(SD + 0.002), STAND_H - 0.015), bevel=0.0012, seg=2, mat=0)
    add_text(bm, 'TANK ' + k, 0.0145, (0, -(SD + 0.0042), STAND_H - 0.0152), mat=1, depth=0.0004)
    obj(P('NAMEPLATE'), bm, ['PLASTIC_WHITE', 'INK_NAVY'], root, smooth_angle=40)

    # --- inlet: riser behind the tank, gate valve on the overhead run, downturned spout over the centre
    ry, run_z = OY + 0.075, 1.345
    bm = bm_new()
    riser = [(0, ry, 0.012), (0, ry, run_z), (0, -0.0, run_z), (0, 0.0, NOZZLE_Z + 0.032)]
    add_sweep(bm, riser, PIPE_R, bend=0.034, seg=18)
    add_cyl(bm, 0.032, 0.032, 0.008, (0, ry, 0.004), seg=32, mat=0)                       # floor flange
    for a in range(4):
        aa = a * math.pi / 2 + math.pi / 4
        add_cyl(bm, 0.0045, 0.0045, 0.006, (0.022 * math.cos(aa), ry + 0.022 * math.sin(aa), 0.010), seg=6, mat=1)
    for z in (0.40, 0.95):                                                              # pipe clips to the frame
        add_cyl(bm, PIPE_R + 0.004, PIPE_R + 0.004, 0.014, (0, ry, z), seg=18, mat=1)
        add_box(bm, 0.012, ry - OY - 0.012, 0.010, (0, (ry + OY) / 2 - 0.004, z), bevel=0.001, seg=1, mat=1)
    for y in (ry - 0.065, 0.06):                                                        # couplings on the run
        add_cyl(bm, PIPE_R + 0.0028, PIPE_R + 0.0028, 0.024, (0, y, run_z), axis='Y', seg=18, mat=0)
    obj(P('INLET_PIPE'), bm, ['STEEL_BRUSHED', 'STEEL_FASTENER'], root, smooth_angle=40)
    vy = 0.150  # gate valve centre on the overhead run (behind the rim, above the back wall)
    bm = bm_new()
    add_cyl(bm, 0.017, 0.017, 0.050, (0, vy, run_z), axis='Y', seg=24)                   # body
    add_hex(bm, 0.030, 0.012, (0, vy - 0.031, run_z), axis='Y'); add_hex(bm, 0.030, 0.012, (0, vy + 0.031, run_z), axis='Y')
    add_cyl(bm, 0.013, 0.015, 0.030, (0, vy, run_z + 0.028), seg=20)                     # bonnet
    add_hex(bm, 0.026, 0.008, (0, vy, run_z + 0.045))                                    # gland nut
    add_cyl(bm, 0.0035, 0.0035, 0.030, (0, vy, run_z + 0.060), seg=10)                   # stem
    obj(P('INLET_VALVE'), bm, ['STEEL_BRUSHED'], root, smooth_angle=40)
    hw_z = run_z + 0.074
    bm = bm_new()   # authored about its own pivot: the stem axis at the hub
    add_torus(bm, 0.040, 0.0055, (0, 0, 0), seg=40, rseg=10, mat=0)
    for a in range(3):
        aa = a * 2 * math.pi / 3
        add_sweep(bm, [(0.008 * math.cos(aa), 0.008 * math.sin(aa), 0.004), (0.037 * math.cos(aa), 0.037 * math.sin(aa), 0)], 0.0034, seg=8, mat=0)
    add_cyl(bm, 0.010, 0.011, 0.012, (0, 0, 0.004), seg=20, mat=0)
    add_hex(bm, 0.010, 0.006, (0, 0, 0.013), mat=1)
    obj(P('INLET_HANDWHEEL'), bm, [acc, 'STEEL_FASTENER'], root, loc=(0, vy, hw_z), smooth_angle=45,
        extras={'rotation_axis_blender': 'Z', 'note': 'visual only; angle supplied by the lesson rate'})
    bm = bm_new()   # spout nozzle with flow straightener, tip at NOZZLE_Z
    add_cyl(bm, PIPE_R + 0.003, PIPE_R + 0.001, 0.020, (0, 0, NOZZLE_Z + 0.022), seg=20, mat=0)
    add_cyl(bm, 0.0105, 0.0085, 0.012, (0, 0, NOZZLE_Z + 0.006), seg=20, mat=0)
    add_cyl(bm, 0.0068, 0.0068, 0.0012, (0, 0, NOZZLE_Z - 0.0002), seg=20, mat=1)
    obj(P('SPOUT'), bm, ['STEEL_BRUSHED', 'INK_NAVY'], root, smooth_angle=40)

    # --- inlet stream: pivot at the nozzle tip, authored down to the floor; adapter scales its length to the water
    bm = bm_new()
    add_cyl(bm, STREAM_R, STREAM_R * 0.82, NOZZLE_Z - FZ, (0, 0, -(NOZZLE_Z - FZ) / 2), seg=14, cap=True)
    obj(P('INLET_STREAM'), bm, [stream], root, loc=(0, 0, NOZZLE_Z), smooth_angle=60,
        extras={'pivot': 'nozzle tip', 'rest_length_m': round(NOZZLE_Z - FZ, 6)})

    # --- water: full 100 L prism, origin on the interior floor. scale_z = litres / 100 is exact.
    bm = bm_new()
    add_prism(bm, rrect(IX - 0.001, IY - 0.001, 0.003, 3), 0.0, FULL_H)
    obj(P('WATER'), bm, [water], root, loc=(0, 0, FZ), smooth_angle=30,
        extras={'pivot': 'interior floor', 'full_litres': CAP_L, 'metres_per_litre': M_PER_L,
                'interior_plan_m': [IX, IY]})

    # --- float gauge: guide rod with stop collar; float pivot at its waterline
    bm = bm_new(); fx, fy = FLOAT['x'], FLOAT['y']
    add_cyl(bm, 0.0030, 0.0030, WALL_TOP - FZ + 0.010, (fx, fy, (FZ + WALL_TOP + 0.010) / 2), seg=12)
    add_cyl(bm, 0.0085, 0.0085, 0.006, (fx, fy, FZ + 0.003), seg=16)                     # foot
    add_cyl(bm, 0.0060, 0.0060, 0.005, (fx, fy, FZ + 0.0085), seg=16)                    # stop collar
    add_box(bm, 0.006, OY - abs(fy), 0.006, (fx, (fy - OY) / 2, WALL_TOP - 0.006), bevel=0.001, seg=1)  # top bracket to the front wall
    obj(P('FLOAT_ROD'), bm, ['STEEL_BRUSHED'], root, smooth_angle=40)
    bm = bm_new(); h = FLOAT['half']
    add_cyl(bm, FLOAT['r'], FLOAT['r'], 2 * h, (0, 0, 0), seg=28, mat=0)
    add_torus(bm, FLOAT['r'] - 0.001, 0.0025, (0, 0, h), seg=28, rseg=8, mat=0)
    add_torus(bm, FLOAT['r'] - 0.001, 0.0025, (0, 0, -h), seg=28, rseg=8, mat=0)
    add_cyl(bm, 0.0052, 0.0052, 2 * h + 0.004, (0, 0, 0), seg=12, mat=1)                  # sleeve
    obj(P('FLOAT'), bm, [acc, 'STEEL_FASTENER'], root, loc=(fx, fy, FZ + FULL_H), smooth_angle=40,
        extras={'pivot': 'float waterline (mid-height)', 'min_centre_above_floor_m': 0.011 + h})

    # --- outlet: bulkhead through the front wall, ball valve with lever, drop spout to a trough on the bench
    ox, oz = OUTLET['x'], OUTLET['z']; wy = -OY
    bm = bm_new()
    add_cyl(bm, 0.024, 0.024, 0.004, (ox, wy - 0.002, oz), axis='Y', seg=28, mat=0)     # outer flange
    add_hex(bm, 0.036, 0.008, (ox, wy + WALL + 0.004, oz), axis='Y', mat=0)            # inner lock nut
    add_cyl(bm, 0.015, 0.015, 0.012, (ox, wy - WALL * 0 - 0.010, oz), axis='Y', seg=20, mat=0)
    vy0 = wy - 0.055
    add_sweep(bm, [(ox, wy + WALL, oz), (ox, vy0 + 0.02, oz)], PIPE_R, seg=18, mat=0)
    add_sweep(bm, [(ox, vy0 - 0.02, oz), (ox, wy - 0.105, oz), (ox, wy - 0.105, DRAIN_TIP_Z)], PIPE_R, bend=0.03, seg=18, mat=0)
    add_cyl(bm, 0.0125, 0.0105, 0.010, (ox, wy - 0.105, DRAIN_TIP_Z + 0.005), seg=18, mat=0)
    obj(P('OUTLET_PIPE'), bm, ['STEEL_BRUSHED'], root, smooth_angle=40)
    bm = bm_new()
    sph = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=0.019)
    for v in sph['verts']: v.co = Vector((v.co.x, v.co.y * 1.15, v.co.z)) + Vector((ox, vy0, oz))
    add_hex(bm, 0.030, 0.010, (ox, vy0 + 0.024, oz), axis='Y'); add_hex(bm, 0.030, 0.010, (ox, vy0 - 0.024, oz), axis='Y')
    add_cyl(bm, 0.008, 0.008, 0.014, (ox, vy0, oz + 0.022), seg=14)
    obj(P('OUTLET_VALVE'), bm, ['STEEL_BRUSHED'], root, smooth_angle=40)
    bm = bm_new()   # lever pivot on the valve stem; closed = across the pipe (+X), opens 90 deg toward -Y
    add_box(bm, 0.016, 0.016, 0.006, (0, 0, 0.003), bevel=0.002, mat=0)
    add_box(bm, 0.085, 0.012, 0.0035, (0.050, 0, 0.004), bevel=0.0012, mat=0)
    add_box(bm, 0.052, 0.016, 0.009, (0.072, 0, 0.0045), bevel=0.004, seg=3, mat=1)
    add_hex(bm, 0.010, 0.005, (0, 0, 0.009), mat=0)
    obj(P('OUTLET_LEVER'), bm, ['STEEL_BRUSHED', acc], root, loc=(ox, vy0, oz + 0.029), smooth_angle=40,
        extras={'rotation_axis_blender': 'Z', 'closed_deg': 0, 'open_deg': -90})
    bm = bm_new()
    L0 = DRAIN_TIP_Z - TROUGH_WATER_Z
    add_cyl(bm, STREAM_R * 0.9, STREAM_R * 1.05, L0, (0, 0, -L0 / 2), seg=14)
    obj(P('DRAIN_STREAM'), bm, [stream], root, loc=(ox, wy - 0.105, DRAIN_TIP_Z), smooth_angle=60,
        extras={'pivot': 'drain spout tip', 'rest_length_m': round(L0, 6)})
    # trough: moulded mint basin on the bench under the spout
    bm = bm_new(); tx, ty = ox, wy - 0.105
    TW_, TD_, TH_ = 0.150, 0.120, 0.060
    outer = rrect(TW_, TD_, 0.018, 4); inner = rrect(TW_ - 0.012, TD_ - 0.012, 0.012, 4)
    ob = [bm.verts.new((x + tx, y + ty, 0.0)) for x, y in outer]
    ot = [bm.verts.new((x + tx, y + ty, TH_)) for x, y in outer]
    it = [bm.verts.new((x + tx, y + ty, TH_)) for x, y in inner]
    ib = [bm.verts.new((x + tx, y + ty, 0.008)) for x, y in inner]
    n = len(outer)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((ob[i], ob[j], ot[j], ot[i])); bm.faces.new((ot[i], ot[j], it[j], it[i])); bm.faces.new((it[i], it[j], ib[j], ib[i]))
    bm.faces.new(list(reversed(ob))); bm.faces.new(ib)
    obj(P('TROUGH'), bm, ['TROUGH_MINT'], root, smooth_angle=35)
    bm = bm_new(); add_prism(bm, rrect(TW_ - 0.013, TD_ - 0.013, 0.011, 4), 0.009, TROUGH_WATER_Z)
    for v in bm.verts: v.co.x += tx; v.co.y += ty
    obj(P('TROUGH_WATER'), bm, [water], root, smooth_angle=30)

    # --- anchors for labels / camera (no geometry)
    empty(P('FLOOR'), root, (0, 0, FZ), extras={'note': 'interior floor; 0 L'})
    empty(P('LABEL_ANCHOR'), root, (-OX, 0, WALL_TOP + 0.02))
    empty(P('NOZZLE_TIP'), root, (0, 0, NOZZLE_Z))
    return root

ROOTS = {k: build_tank(k) for k in 'AB'}

# ------------------------------------------------------------------ rig helpers (Blender side, mirrors the JS adapter for renders/validation)
def level_m(litres):
    return max(0.0, min(CAP_L, litres)) * M_PER_L

def pose(k, litres, inflow=0.0, outflow=0.0):
    o = lambda s: bpy.data.objects['TANK_%s_%s' % (k, s)]
    h = level_m(litres)
    o('WATER').scale = (1, 1, max(h / FULL_H, 1e-4)); o('WATER').hide_render = h <= 0.0005
    o('FLOAT').location.z = FZ + max(h, 0.011 + FLOAT['half'])
    fill = inflow > 0 and litres < CAP_L
    o('INLET_STREAM').hide_render = not fill
    o('INLET_STREAM').scale = (1, 1, max(1e-4, (NOZZLE_Z - (FZ + h)) / (NOZZLE_Z - FZ)))
    o('INLET_HANDWHEEL').rotation_euler.z = -min(1.0, inflow / 8.0) * 1.5 * math.pi
    o('OUTLET_LEVER').rotation_euler.z = -min(1.0, outflow / 8.0) * math.pi / 2
    o('DRAIN_STREAM').hide_render = not (outflow > 0 and litres > 0)

def rest():
    for k in 'AB':
        o = lambda s: bpy.data.objects['TANK_%s_%s' % (k, s)]
        o('WATER').scale = (1, 1, 1); o('WATER').hide_render = False
        o('FLOAT').location.z = FZ + FULL_H
        o('INLET_STREAM').scale = (1, 1, 1); o('INLET_STREAM').hide_render = False
        o('INLET_HANDWHEEL').rotation_euler.z = 0; o('OUTLET_LEVER').rotation_euler.z = 0
        o('DRAIN_STREAM').hide_render = False

# ------------------------------------------------------------------ validation: the level mapping at the lesson's tested cases
def world_top_of_water(k):
    o = bpy.data.objects['TANK_%s_WATER' % k]
    bpy.context.view_layer.update()
    return max((o.matrix_world @ Vector(c)).z for c in o.bound_box)

validation = {'metres_per_litre': M_PER_L, 'interior_floor_z_blender_m': FZ, 'cases': []}
for L in (0, 10, 40, 70, 100):
    pose('A', L)
    top = world_top_of_water('A'); expect = FZ + L * M_PER_L
    vol_l = IX * IY * (top - FZ) * 1000  # prism plan area x height (corner radius 3 mm ignored, < 0.1 %)
    validation['cases'].append({'litres': L, 'water_top_z_blender_m': round(top, 6), 'expected_m': round(expect, 6),
                                'error_mm': round((top - expect) * 1000, 4), 'volume_from_geometry_L': round(vol_l, 3)})
    assert abs(top - expect) < 1e-5 or L == 0, (L, top, expect)
rest()

# clearances that matter for a believable build (closest approach, metres)
def bbox_world(o):
    bpy.context.view_layer.update(); cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))), Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
def gap(a, b):
    (a0, a1), (b0, b1) = bbox_world(bpy.data.objects[a]), bbox_world(bpy.data.objects[b])
    d = [max(b0[i] - a1[i], a0[i] - b1[i], 0) for i in range(3)]
    return round(math.sqrt(sum(x * x for x in d)), 5)
validation['clearances_m'] = {
    'stand_A_to_stand_B (authoring layout)': gap('TANK_A_STAND', 'TANK_B_STAND'),
    'trough_A_to_stand_B': gap('TANK_A_TROUGH', 'TANK_B_STAND'),
    'float_A_bbox_to_outlet_valve_A': gap('TANK_A_FLOAT', 'TANK_A_OUTLET_VALVE'),
    'nozzle_tip_above_wall_top': round(NOZZLE_Z - WALL_TOP, 4),
}

# ------------------------------------------------------------------ export (only the LINES_TANKS collection)
def export(path):
    for o in bpy.data.objects: o.select_set(o.name in EXPORT.all_objects)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_extras=True, export_cameras=False, export_lights=False, export_materials='EXPORT',
                              export_image_format='NONE', export_texcoords=False, export_normals=True,
                              export_animations=False, export_draco_mesh_compression_enable=False)
rest()
glb = os.path.join(OUT, 'lines-tanks.glb')
export(glb)
for o in bpy.data.objects: o.select_set(False)

# triangle and size stats from the exported scene objects
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in EXPORT.all_objects if o.type == 'MESH')
validation['glb'] = {'bytes': os.path.getsize(glb), 'triangles_from_blender_polygons': tris,
                     'mesh_objects': sum(1 for o in EXPORT.all_objects if o.type == 'MESH'),
                     'materials': len({m.name for o in EXPORT.all_objects if o.type == 'MESH' for m in o.data.materials}),
                     'sha256': hashlib.sha256(open(glb, 'rb').read()).hexdigest()}

# ------------------------------------------------------------------ rig contract (written from the exported rest pose)
def g(v): return [round(v.x, 6), round(v.z, 6), round(-v.y, 6)]  # Blender -> glTF
bpy.context.view_layer.update()
ROLE = {'WATER': 'water', 'FLOAT': 'float', 'INLET_STREAM': 'inlet_stream', 'DRAIN_STREAM': 'drain_stream',
        'INLET_HANDWHEEL': 'inlet_handwheel', 'OUTLET_LEVER': 'outlet_lever', 'FLOOR': 'floor_anchor',
        'LABEL_ANCHOR': 'label_anchor', 'NOZZLE_TIP': 'nozzle_anchor'}
nodes = {}
for o in sorted(EXPORT.all_objects, key=lambda o: o.name):
    nodes[o.name] = {'world_pivot_gltf_m': g(o.matrix_world.translation), 'parent': o.parent.name if o.parent else None}
contract = {
    'contract': 'assembl.lines.v1',
    'asset': 'lines-tanks.glb',
    'units': 'metres',
    'route': '/study/m/lines.html',
    'coordinates': {
        'authoring': 'Blender +X right, +Y rear, +Z up; tank fronts face -Y',
        'gltf': 'glTF +X right, +Y up, +Z front',
        'map': '(x,y,z) -> (x,z,-y)',
        'scene_units_per_metre': 3,
        'scene_note': 'The existing lines3d tank drew 100 L as TH = 3.0 scene units. The browser applies ONE uniform scale of 3 to each tank root; never scale parts individually.',
        'authored_layout_x_m': {k: TANK_X[k] for k in 'AB'},
        'layout_note': 'Each TANK_<k> root may be translated as a whole (the lesson slides tank A aside when B appears). Nothing inside a tank moves except the controls below.'},
    'state_owner': 'study/m/lines.js owns s (mA, cA, mB, cB, t, B, playing) and lev(m, c, t) = m*t + c. The adapter receives litres already computed by lev(); it never integrates flow, advances time, clamps the lesson model or decides whether a tap runs.',
    'level_mapping': {
        'interior_plan_m': [IX, IY], 'plan_area_m2': round(IX * IY, 6), 'metres_per_litre': M_PER_L,
        'formula': 'level_m = clamp(litres, 0, 100) * 0.01   (1 L = 0.001 m^3 over 0.1 m^2 = 10 mm)',
        'display_clamp_note': 'The 0..100 L clamp is the same display clamp the existing drawing uses (clamp(lev, 0, 100)); readouts still show the unclamped model value.',
        'floor_y_gltf_m': round(FZ, 6), 'full_litres': CAP_L, 'full_height_m': FULL_H,
        'tested_cases': [{'litres': L, 'level_m': round(L * M_PER_L, 6), 'water_top_y_gltf_m': round(FZ + L * M_PER_L, 6),
                          'water_node_scale_y': round(L / CAP_L, 6), 'scene_units_above_floor': round(L * M_PER_L * 3, 6)} for L in (40, 70)]},
    'controls': {
        'water': {'node': 'TANK_<k>_WATER', 'pivot': 'interior floor', 'property': 'scale.y (glTF local +Y)',
                  'value': 'level_m / 1.00  (= litres / 100), absolute', 'visible': 'litres > 0.2 (as the existing drawing)'},
        'float': {'node': 'TANK_<k>_FLOAT', 'property': 'position.y', 'value': 'floor_y + max(level_m, %.3f)' % (0.011 + FLOAT['half']),
                  'note': 'Below %.1f L the float rests on its stop collar. Visual only; the float is also the drag handle for the start level.' % ((0.011 + FLOAT['half']) / M_PER_L)},
        'inlet_stream': {'node': 'TANK_<k>_INLET_STREAM', 'pivot': 'nozzle tip', 'property': 'scale.y', 'rest_length_m': round(NOZZLE_Z - FZ, 6),
                         'value': '(nozzle_y - (floor_y + level_m)) / (nozzle_y - floor_y)', 'radius_scale': '0.6 + 0.9 * min(1, rate / 8)  (x and z)',
                         'visible': 'caller passes filling = rate > 0 && t < 20 && litres < 100 (the existing condition)'},
        'drain_stream': {'node': 'TANK_<k>_DRAIN_STREAM', 'pivot': 'drain spout tip', 'property': 'visible + radius scale',
                         'visible': 'caller passes draining = rate < 0 && litres > 0 (the existing condition)', 'radius_scale': '0.6 + 0.9 * min(1, -rate / 8)'},
        'inlet_handwheel': {'node': 'TANK_<k>_INLET_HANDWHEEL', 'axis_gltf': 'local +Y', 'value': 'rotation.y = -min(1, max(0, rate) / 8) * 1.5 * PI',
                            'note': 'Illustrative valve opening from the lesson rate. Valve hydraulics are not modelled.'},
        'outlet_lever': {'node': 'TANK_<k>_OUTLET_LEVER', 'axis_gltf': 'local +Y', 'value': 'rotation.y = -min(1, max(0, -rate) / 8) * PI / 2',
                         'note': 'Quarter-turn ball valve: closed across the pipe, open along it. Illustrative only.'}},
    'tanks': {k: {'root': 'TANK_' + k, **{r: 'TANK_%s_%s' % (k, s) for s, r in ROLE.items()}} for k in 'AB'},
    'required_nodes': sorted(['TANK_' + k for k in 'AB'] + ['TANK_%s_%s' % (k, s) for k in 'AB' for s in ROLE]),
    'browser_materials': {
        'ACRYLIC_CLEAR': 'Authored as Principled transmission (IOR 1.49) for Cycles. Replaced in the browser by an alpha-blended clear-coat material (opacity 0.14, no refraction, no transmission pass).',
        'WATER_A, WATER_B, STREAM_A, STREAM_B': 'Authored as tinted transmission (IOR 1.333). Replaced in the browser by alpha-blended clear-coat materials in the lesson colours (#7FB7E8 / #F2A7BE).',
        'others': 'Used as exported (metallic-roughness + KHR_materials_clearcoat). No textures.'},
    'budget': {'glb_bytes_max': 2500000, 'triangles_max': 80000, 'textures_max': 0, 'primitives_max': 80,
               'actual': {'bytes': validation['glb']['bytes'], 'triangles': tris}},
    'simulation_limits': 'Idealised tanks: the inflow and outflow rates are whatever the lesson sets and stay constant. No fluid dynamics, pressure-dependent drain rate, sloshing, meniscus or valve hydraulics are modelled. Streams are illustrative.',
    'nodes': nodes}
with open(os.path.join(OUT, 'lines-rig-contract.json'), 'w') as f: json.dump(contract, f, indent=2)

# ------------------------------------------------------------------ render stage (not exported)
def stage():
    bm = bm_new()  # a cream cyclorama: floor sweeping up into a backdrop
    W, Dp, R, Hh = 7.0, 3.0, 0.9, 3.0
    prof = [(-Dp, 0.0)] + [(1.0 - R + R * math.sin(a), R - R * math.cos(a)) for a in [i * (math.pi / 2) / 12 for i in range(13)]] + [(1.0, Hh)]
    rows = []
    for y, z in prof:
        rows.append([bm.verts.new((x, y, z)) for x in (-W / 2, W / 2)])
    for i in range(len(rows) - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    m = material('STAGE_CREAM', '#F4EEE6', rough=0.9)
    o = obj('STAGE_CYC', bm, ['STAGE_CREAM'], None, coll=STAGE, smooth_angle=80)
    o.location = (0, 0.25, -0.04)  # below the bench: coplanar faces render black in Cycles
    # bench top the tanks stand on
    bm = bm_new(); add_box(bm, 1.9, 0.95, 0.04, (0, -0.05, -0.02), bevel=0.012, seg=3)
    material('BENCH_LILAC', '#E7DEF6', rough=0.55, coat=0.2)
    obj('STAGE_BENCH', bm, ['BENCH_LILAC'], None, coll=STAGE, smooth_angle=40)

def light(name, kind, loc, rot, energy, size, col='#FFFFFF'):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = lin(col)[:3]
    if kind == 'AREA': d.shape = 'RECTANGLE'; d.size = size[0]; d.size_y = size[1]
    o = bpy.data.objects.new(name, d); STAGE.objects.link(o); o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    return o

def camera(name, loc, target, lens):
    c = bpy.data.cameras.new(name); c.lens = lens; c.clip_start = 0.02
    o = bpy.data.objects.new(name, c); STAGE.objects.link(o); o.location = loc
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o

# The stage, lights and cameras are always built (so the .blend is complete); rendering is optional.
prev_path = os.path.join(OUT, 'rig-validation.json')
try: previous = {r['file']: r for r in json.load(open(prev_path)).get('renders', [])}
except Exception: previous = {}
renders = []
stage()
world = bpy.data.worlds.new('STUDIO'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = lin('#F3EEF2'); bg.inputs['Strength'].default_value = 0.7
light('KEY', 'AREA', (-1.6, -1.9, 2.6), (52, 0, -38), 520, (1.6, 1.0), '#FFF6EC')
light('FILL', 'AREA', (2.0, -1.4, 1.2), (70, 0, 52), 160, (1.2, 1.2), '#EEF2FF')
light('RIM', 'AREA', (0.4, 1.4, 2.3), (-38, 0, 172), 260, (1.4, 0.6), '#FFFFFF')
sc = scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
SAMPLES = 24 if PREVIEW else 64
sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
sc.cycles.max_bounces = 14; sc.cycles.transmission_bounces = 12; sc.cycles.transparent_max_bounces = 12
sc.cycles.glossy_bounces = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.cycles.blur_glossy = 0.5
sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -0.4
for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
    try: sc.view_settings.look = look; break
    except Exception: pass
sc.render.film_transparent = False; sc.render.image_settings.file_format = 'PNG'
# the lesson's investigate case: 10 L start at t = 10 min: A 3 L/min -> 40 L, B 6 L/min -> 70 L
shots = [
    ('lines-hero', (-1.02, -2.80, 1.50), (0.02, -0.06, 0.66), 42, (1600, 1100), lambda: (pose('A', 40, inflow=3), pose('B', 70, inflow=6)),
     'A 40 L filling at 3 L/min, B 70 L filling at 6 L/min (lesson investigate case, t = 10 min)'),
    ('lines-detail-outlet', (0.12, -0.95, 0.52), (-0.24, -0.18, 0.26), 50, (1200, 860), lambda: (pose('A', 40, outflow=4), pose('B', 70, inflow=6)),
     'A at 40 L with its drain open (rate -4 L/min, lever half open); B 70 L'),
    ('lines-detail-inlet', (-0.75, -0.70, 1.62), (-0.31, 0.05, 1.29), 58, (1200, 860), lambda: (pose('A', 40, inflow=3), pose('B', 70, inflow=6)),
     'inlet gate valve, handwheel and spout; A filling at 3 L/min'),
]
ONLY = [x.split('=', 1)[1] for x in ARGS if x.startswith('--only=')]
os.makedirs(os.path.join(OUT, 'renders'), exist_ok=True)
for name, loc, tgt, lens, res, setup, state in shots:
    cam = camera('CAM_' + name, loc, tgt, lens); sc.camera = cam
    rel = os.path.join('renders', name + ('-preview' if PREVIEW else '') + '.png')
    if not RENDER or (ONLY and not any(q in name for q in ONLY)):
        if rel in previous: renders.append(previous[rel])
        continue
    setup(); sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 50 if PREVIEW else 100
    path = os.path.join(OUT, rel); sc.render.filepath = path
    t0 = time.time(); bpy.ops.render.render(write_still=True)
    renders.append({'file': rel, 'label': 'Offline render (Cycles), not the browser view', 'engine': 'Cycles (CPU)', 'samples': SAMPLES,
                    'adaptive_threshold': 0.02, 'denoise': 'OpenImageDenoise', 'view_transform': 'AgX - Medium High Contrast, exposure -0.4',
                    'resolution': [int(res[0] * (0.5 if PREVIEW else 1)), int(res[1] * (0.5 if PREVIEW else 1))], 'seconds': round(time.time() - t0, 1),
                    'state': state, 'glb_sha256_at_render': validation['glb']['sha256']})
    print('rendered', path, round(time.time() - t0, 1), 's')
    rest()
sc.camera = bpy.data.objects['CAM_lines-hero']
pose('A', 40, inflow=3); pose('B', 70, inflow=6)  # the saved .blend opens on the lesson's A/B case (the GLB was exported at rest)
validation['renders'] = renders

# ------------------------------------------------------------------ save
validation['blender'] = bpy.app.version_string
validation['gltf_exporter'] = '.'.join(map(str, __import__('io_scene_gltf2').bl_info['version']))
with open(os.path.join(OUT, 'rig-validation.json'), 'w') as f: json.dump(validation, f, indent=2)
bpy.context.preferences.filepaths.save_version = 0  # no lines.blend1 backup next to the source
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'lines.blend'), compress=True)
print(json.dumps(validation['glb'], indent=1)); print(json.dumps(validation['cases'], indent=1))
