"""Blender build for the wind tunnel machine (study/m/windtunnel.html).
An open-wheel single-seater (smooth lofted body, halo, front and rear wings with a rotating rear-wing flap, spinning
wheels) on a turntable with a rolling road, in a clean chalk-white wind-tunnel test section with a big fan at the end.
Exports windtunnel.glb (named nodes are the contract with study/m/windtunnel-scene.js) and renders a Cycles hero.
Usage: python build_windtunnel.py [--no-render]   (bpy 5.x as a Python module). PREVIEW=1 for a fast 640x400 test render.
Coordinates: Blender Z-up, metres, the car's nose points along +X (the wind blows towards -X). The glTF exporter writes
Y-up, so in three.js the nose is +X, up is +Y and the car's left side is -Z.
No real team, series or sponsor: a generic car in the assembl study palette (deep plum, blush and chalk)."""
import math, os, sys, bpy, bmesh
from mathutils import Vector, Matrix

OUT = os.path.dirname(os.path.abspath(__file__))
PREVIEW = os.environ.get('PREVIEW') == '1'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c] + [1]

MATS = {}
def mat(name, colour, rough=.4, metal=0., coat=0., emit=0., alpha=1.):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(colour); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = .08
    if emit:
        b.inputs['Emission Color'].default_value = srgb(colour); b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    MATS[name] = m; return m

PLUM = mat('body_plum', '#3B1737', .28, 0, 1.)           # deep plum gloss
BLUSH = mat('blush', '#F0B6C4', .35, 0, .6)               # livery accent
ROSE = mat('rose', '#B97A86', .4, 0, .4)
CHALK = mat('chalk_paint', '#F7F1F2', .35, 0, .6)
CARBON = mat('carbon', '#2A2229', .45, 0, .5)
TYRE = mat('tyre', '#2B2629', .78)
RIM = mat('rim', '#D9D3D8', .25, 1.)
DARK = mat('inlet', '#130910', .7)
HELMET = mat('helmet', '#F7F1F2', .2, 0, 1.)
VISOR = mat('visor', '#2C2A3E', .05, .2, 1.)
STEEL = mat('steel', '#B9B3B8', .3, 1.)
LIGHT_RED = mat('rain_light', '#E8606A', .3, 0, 0, 3.)

def link(o, parent=None):
    if o.name not in sc.collection.objects: sc.collection.objects.link(o)
    if parent: o.parent = parent
    return o

def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; return link(e, parent)

def obj_from_bm(name, bm, m, parent=None, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); me.materials.append(m); return link(o, parent)

def apply_mods(o):
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev); o.modifiers.clear(); old = o.data; o.data = me; bpy.data.meshes.remove(old)

def subsurf(o, levels=2):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = levels; m.render_levels = levels; apply_mods(o)
    for p in o.data.polygons: p.use_smooth = True

def bevel(o, w=.01, seg=2):
    m = o.modifiers.new('bev', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'; apply_mods(o)
    for p in o.data.polygons: p.use_smooth = True

def box(name, size, loc, m, parent=None, bev=.008, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    o = obj_from_bm(name, bm, m, parent, smooth=False); o.location = loc; o.rotation_euler = rot
    if bev: bevel(o, bev)
    return o

def cyl(name, r, h, loc, m, parent=None, rot=(0, 0, 0), seg=32, r2=None, bev=0.):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    o = obj_from_bm(name, bm, m, parent, smooth=True); o.location = loc; o.rotation_euler = rot
    if bev: bevel(o, bev)
    return o

def rod(name, a, b, r, m, parent=None, seg=10):
    a, b = Vector(a), Vector(b); d = b - a
    o = cyl(name, r, d.length, (a + b) / 2, m, parent, seg=seg)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized()); return o

def loft(name, sections, m, parent=None, k=20, exp=2.6, close_front=True, close_back=True, levels=2):
    """sections: (x, cy, cz, half-width, half-height) rings of a superellipse, nose first. Subdivided smooth."""
    bm = bmesh.new(); rings = []
    for (x, cy, cz, w, h) in sections:
        ring = []
        for i in range(k):
            a = 2 * math.pi * i / k; c, s = math.cos(a), math.sin(a)
            y = cy + w * math.copysign(abs(c) ** (2 / exp), c); z = cz + h * math.copysign(abs(s) ** (2 / exp), s)
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(k): bm.faces.new((r0[i], r0[(i + 1) % k], r1[(i + 1) % k], r1[i]))
    if close_front: bm.faces.new(list(reversed(rings[0])))
    if close_back: bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, m, parent)
    if levels: subsurf(o, levels)
    return o

def airfoil(name, chord, thick, camber, span, m, parent=None, n=18, te_origin=False):
    """An inverted cambered wing section (the curved side faces down), extruded along Y. Leading edge at x=0 facing +X
    and the chord running to x=-chord (or, with te_origin, trailing edge at the origin and the leading edge at +chord)."""
    pts_u, pts_l = [], []
    for i in range(n + 1):
        t = (1 - math.cos(math.pi * i / n)) / 2           # cosine spacing, 0 at the leading edge
        yt = 5 * thick * (.2969 * math.sqrt(t) - .126 * t - .3516 * t * t + .2843 * t ** 3 - .1036 * t ** 4)
        yc = -camber * 4 * t * (1 - t)                       # camber line below the chord: an upside-down wing
        pts_u.append((t, yc + yt)); pts_l.append((t, yc - yt))
    prof = pts_u + list(reversed(pts_l[1:-1]))
    bm = bmesh.new(); L, R = [], []
    for (t, z) in prof:
        x = (1 - t) * chord if te_origin else -t * chord
        L.append(bm.verts.new((x, -span / 2, z * chord))); R.append(bm.verts.new((x, span / 2, z * chord)))
    N = len(prof)
    for i in range(N): bm.faces.new((L[i], L[(i + 1) % N], R[(i + 1) % N], R[i]))
    bm.faces.new(list(reversed(L))); bm.faces.new(R)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, m, parent)
    for p in o.data.polygons: p.use_smooth = len(p.vertices) == 4
    return o

def lathe(name, profile, m, parent=None, seg=48):
    """Spin a closed (r, y) profile around the Y axis (the wheel axle)."""
    bm = bmesh.new(); rings = []
    for j in range(seg):
        a = 2 * math.pi * j / seg; rings.append([bm.verts.new((r * math.cos(a), y, r * math.sin(a))) for (r, y) in profile])
    P = len(profile)
    for j in range(seg):
        r0, r1 = rings[j], rings[(j + 1) % seg]
        for i in range(P): bm.faces.new((r0[i], r0[(i + 1) % P], r1[(i + 1) % P], r1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, m, parent)

root = empty('WINDTUNNEL')
car = empty('CAR', parent=root)

# ---------------------------------------------------------------- body: one smooth lofted tub from the nose to the gearbox
body = loft('BODY', [
    (2.62, 0, .215, .035, .03), (2.45, 0, .225, .09, .065), (2.2, 0, .25, .13, .095), (1.85, 0, .29, .175, .13),
    (1.45, 0, .34, .225, .17), (1.0, 0, .38, .27, .2), (.6, 0, .405, .31, .225), (.2, 0, .41, .34, .215),
    (-.2, 0, .42, .35, .21), (-.5, 0, .47, .32, .29), (-.78, 0, .49, .25, .31), (-1.15, 0, .44, .2, .24),
    (-1.6, 0, .38, .14, .16), (-1.95, 0, .34, .085, .095), (-2.12, 0, .33, .05, .06)], PLUM, car, k=24)
# the cockpit opening: cut with a rounded block, then a dark seat and the driver's helmet inside
cut = box('CUT', (.62, .42, .5), (.0, 0, .78), DARK, bev=.12)
bo = body.modifiers.new('cock', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cut; bo.solver = 'EXACT'; apply_mods(body)
bpy.data.objects.remove(cut)
for p in body.data.polygons: p.use_smooth = True
loft('COCKPIT_TUB', [(.3, 0, .5, .2, .08), (0, 0, .48, .21, .08), (-.3, 0, .5, .19, .08)], DARK, car, k=16, levels=1)
helmet = empty('DRIVER', (-.1, 0, .69), car)
bpy.ops.mesh.primitive_uv_sphere_add(radius=.125, segments=32, ring_count=16); h = bpy.context.object; h.name = 'HELMET'; h.data.materials.append(HELMET); h.parent = helmet
h.scale = (1.08, .93, .98)
for p in h.data.polygons: p.use_smooth = True
bpy.ops.mesh.primitive_uv_sphere_add(radius=.127, segments=32, ring_count=16); v = bpy.context.object; v.name = 'VISOR'; v.data.materials.append(VISOR); v.parent = helmet
v.scale = (1.08, .93, .5); v.location = (.02, 0, .01)
for p in v.data.polygons: p.use_smooth = True
box('HELMET_STRIPE', (.27, .03, .2), (-.01, 0, .02), BLUSH, helmet, bev=.012)
# nose tip and a blush pinstripe along the top
loft('NOSE_TIP', [(2.66, 0, .214, .02, .018), (2.62, 0, .215, .037, .032), (2.5, 0, .222, .075, .055), (2.42, 0, .226, .093, .068)], BLUSH, car, k=16, close_back=True)
stripe = loft('STRIPE', [(2.4, 0, .29, .03, .016), (1.9, 0, .4, .05, .016), (1.4, 0, .5, .055, .016), (.85, 0, .585, .05, .016), (.5, 0, .625, .045, .016)], BLUSH, car, k=12)

# ---------------------------------------------------------------- sidepods (mirrored), inlets, mirrors
for side, sgn in (('L', 1), ('R', -1)):
    loft('SIDEPOD_' + side, [(.8, sgn * .5, .31, .15, .19), (.6, sgn * .54, .3, .21, .23), (.2, sgn * .53, .29, .23, .22),
                             (-.35, sgn * .46, .26, .21, .19), (-.85, sgn * .34, .2, .15, .13), (-1.25, sgn * .24, .15, .08, .08),
                             (-1.42, sgn * .2, .13, .04, .05)], PLUM, car, k=20, exp=3.2)
    inlet = loft('SIDEPOD_INLET_' + side, [(.81, sgn * .5, .32, .11, .14), (.76, sgn * .5, .32, .105, .135)], DARK, car, k=20, levels=1, exp=3.2)
    loft('SIDEPOD_LIP_' + side, [(.82, sgn * .5, .315, .14, .175), (.795, sgn * .5, .315, .15, .185)], BLUSH, car, k=20, levels=1, exp=3.2)
    rod('MIRROR_STALK_' + side, (.62, sgn * .36, .6), (.62, sgn * .5, .7), .012, CARBON, car)
    box('MIRROR_' + side, (.07, .15, .07), (.62, sgn * .52, .71), PLUM, car, bev=.02)
# the airbox inlet above the driver's head, and an engine-cover fin
loft('AIRBOX', [(-.31, 0, .76, .085, .075), (-.4, 0, .775, .12, .1), (-.7, 0, .74, .13, .11), (-1.1, 0, .62, .1, .09), (-1.45, 0, .48, .06, .06)], PLUM, car, k=16)
loft('AIRBOX_INLET', [(-.3, 0, .76, .068, .058), (-.34, 0, .76, .07, .06)], DARK, car, k=16, levels=1)
bm = bmesh.new(); fin_pts = [(-.62, .8), (-.58, .86), (-1.0, .92), (-1.75, .64), (-1.75, .5), (-1.0, .66)]
vs_l = [bm.verts.new((x, -.008, z)) for x, z in fin_pts]; vs_r = [bm.verts.new((x, .008, z)) for x, z in fin_pts]
bm.faces.new(vs_l); bm.faces.new(list(reversed(vs_r)))
for i in range(len(fin_pts)): bm.faces.new((vs_l[i], vs_r[i], vs_r[(i + 1) % len(fin_pts)], vs_l[(i + 1) % len(fin_pts)]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); fin = obj_from_bm('FIN', bm, BLUSH, car, smooth=False); bevel(fin, .006)

# ---------------------------------------------------------------- the halo: a titanium hoop round the driver's head
cu = bpy.data.curves.new('HALO', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .024; cu.bevel_resolution = 4; cu.resolution_u = 10
sp = cu.splines.new('NURBS'); pts = [(-.36, .26, .6), (-.33, .27, .74), (-.25, .29, .86), (.05, .3, .9), (.36, .19, .9), (.48, 0, .89),
                                     (.36, -.19, .9), (.05, -.3, .9), (-.25, -.29, .86), (-.33, -.27, .74), (-.36, -.26, .6)]
sp.points.add(len(pts) - 1)
for p, c in zip(sp.points, pts): p.co = (*c, 1)
sp.use_endpoint_u = True; sp.order_u = 4
halo = bpy.data.objects.new('HALO', cu); link(halo, car)
cu2 = bpy.data.curves.new('HALO_PILLAR', 'CURVE'); cu2.dimensions = '3D'; cu2.bevel_depth = .022; cu2.bevel_resolution = 4
sp2 = cu2.splines.new('NURBS'); pp = [(.47, 0, .89), (.53, 0, .8), (.6, 0, .66), (.66, 0, .6)]; sp2.points.add(len(pp) - 1)
for p, c in zip(sp2.points, pp): p.co = (*c, 1)
sp2.use_endpoint_u = True; sp2.order_u = 3
pillar = bpy.data.objects.new('HALO_PILLAR', cu2); link(pillar, car)
for o in (halo, pillar):
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    o.data.materials.append(CARBON)
    for p in o.data.polygons: p.use_smooth = True

# ---------------------------------------------------------------- floor, plank, diffuser, crash structure, rain light
def prism(name, pts, z0, z1, m, parent):
    bm = bmesh.new(); a = [bm.verts.new((x, y, z0)) for x, y in pts]; b = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(list(reversed(a))); bm.faces.new(b)
    for i in range(len(pts)): bm.faces.new((a[i], a[(i + 1) % len(pts)], b[(i + 1) % len(pts)], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); o = obj_from_bm(name, bm, m, parent, smooth=False); bevel(o, .008); return o
FP = [(1.07, .5), (.9, .62), (.5, .7), (-1.0, .7), (-1.18, .52), (-1.98, .52)]
prism('FLOOR', FP + [(x, -y) for x, y in reversed(FP)], .043, .068, CARBON, car)
box('PLANK', (2.2, .3, .02), (-.3, 0, .035), mat('plank', '#8C6B5A', .7), car, bev=.004)
bm = bmesh.new(); dp = [(-1.55, .042), (-2.15, .2), (-2.15, .23), (-1.55, .068)]
for yy in (-.42, -.21, 0, .21, .42):
    a = [bm.verts.new((x, yy - .008, z)) for x, z in dp]; b = [bm.verts.new((x, yy + .008, z)) for x, z in dp]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(4): bm.faces.new((a[i], b[i], b[(i + 1) % 4], a[(i + 1) % 4]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); obj_from_bm('DIFFUSER', bm, CARBON, car, smooth=False)
box('DIFFUSER_ROOF', (.62, .9, .015), (-1.85, 0, .135), CARBON, car, bev=0, rot=(0, -math.atan2(.16, .6), 0))
box('CRASH_STRUCTURE', (.35, .12, .1), (-2.2, 0, .32), PLUM, car, bev=.03)
box('RAIN_LIGHT', (.02, .1, .05), (-2.38, 0, .33), LIGHT_RED, car, bev=.008)

# ---------------------------------------------------------------- front wing: two inverted elements and endplates
FW = empty('FRONT_WING', (2.42, 0, .1), car)
fw1 = airfoil('FRONT_WING_MAIN', .34, .1, .06, 1.78, CARBON, FW); fw1.location = (0, 0, 0); fw1.rotation_euler = (0, math.radians(4), 0)
fw2 = airfoil('FRONT_WING_FLAP', .2, .1, .07, 1.7, BLUSH, FW); fw2.location = (-.27, 0, .075); fw2.rotation_euler = (0, math.radians(22), 0)
for sgn in (1, -1):
    box('FRONT_ENDPLATE', (.4, .015, .15), (-.17, sgn * .9, .05), BLUSH, FW, bev=.006)
rod('NOSE_PYLON_L', (2.42, .06, .12), (2.35, .07, .22), .012, CARBON, car); rod('NOSE_PYLON_R', (2.42, -.06, .12), (2.35, -.07, .22), .012, CARBON, car)

# ---------------------------------------------------------------- rear wing: endplates fixed, the wing turns about mid-chord,
# and the flap (the DRS element) turns about its own trailing edge so its front lifts and the slot opens
RW_PIVOT = (-2.15, 0, .84)
RW = empty('REAR_WING', RW_PIVOT, car)
rwm = airfoil('REAR_WING_MAIN', .4, .12, .06, .98, CARBON, RW); rwm.location = (.2, 0, -.02)
FLAP = empty('REAR_WING_FLAP', (-.32, 0, .12), RW)       # the flap's trailing edge
flp = airfoil('REAR_WING_FLAP_MESH', .24, .1, .06, .98, BLUSH, FLAP, te_origin=True)
FLAP.rotation_euler = (0, math.radians(28), 0)           # closed in the file; three.js sets the live angle
for sgn in (1, -1):
    bm = bmesh.new(); ep = [(-1.84, .56), (-1.87, 1.08), (-2.63, 1.14), (-2.61, .6), (-2.36, .5)]
    a = [bm.verts.new((x, sgn * .5 - .01, z)) for x, z in ep]; b = [bm.verts.new((x, sgn * .5 + .01, z)) for x, z in ep]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(len(ep)): bm.faces.new((a[i], b[i], b[(i + 1) % len(ep)], a[(i + 1) % len(ep)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); e = obj_from_bm('REAR_ENDPLATE_' + ('L' if sgn > 0 else 'R'), bm, PLUM, car, smooth=False); bevel(e, .006)
    box('ENDPLATE_STRIPE', (.7, .024, .03), (-2.24, sgn * .5, 1.065), BLUSH, car, bev=.006, rot=(0, math.radians(-4), 0))
rod('REAR_WING_PYLON', (-2.12, 0, .38), (-2.08, 0, .78), .022, CARBON, car)
bw = airfoil('BEAM_WING', .22, .1, .04, .9, CARBON, car); bw.location = (-1.95, 0, .42); bw.rotation_euler = (0, math.radians(10), 0)

# ---------------------------------------------------------------- wheels: a hub empty per corner (three.js spins it), tyre, rim, spokes
def wheel(name, x, y, r, w):
    hub = empty(name, (x, y, r), car)
    rr, cr = .2, .055
    prof = []
    for i in range(7): a = math.pi / 2 * i / 6; prof.append((r - cr + cr * math.cos(a), -w / 2 + cr - cr * math.sin(a) + 0))
    prof = [(rr, -w / 2 + .01)] + [(r - cr + cr * math.sin(a), -w / 2 + cr - cr * math.cos(a)) for a in [math.pi / 2 * i / 6 for i in range(7)]]
    prof += [(r - cr + cr * math.cos(a), w / 2 - cr + cr * math.sin(a)) for a in [math.pi / 2 * i / 6 for i in range(7)]] + [(rr, w / 2 - .01)]
    tyre = lathe(name + '_TYRE', prof, TYRE, hub, seg=56)
    for p in tyre.data.polygons: p.use_smooth = True
    out = 1 if y > 0 else -1
    # a blush sidewall ring and three marks (so you can see the wheel turn)
    ring = lathe(name + '_STRIPE', [(r - .075, out * (w / 2 + .002)), (r - .06, out * (w / 2 + .002)), (r - .06, out * (w / 2 - .01)), (r - .075, out * (w / 2 - .01))], BLUSH, hub, seg=56)
    for k in range(3):
        a = 2 * math.pi * k / 3; box(name + '_MARK', (.09, .012, .03), (math.cos(a) * (r - .105), out * (w / 2 - .002), math.sin(a) * (r - .105)), CHALK, hub, bev=.004, rot=(0, -a, 0))
    cyl(name + '_RIM', rr, w - .06, (0, 0, 0), RIM, hub, rot=(math.pi / 2, 0, 0), seg=40)
    cyl(name + '_RIM_FACE', rr - .015, .02, (0, out * (w / 2 - .02), 0), mat('rim_face', '#4A2346', .3, .6, .6), hub, rot=(math.pi / 2, 0, 0), seg=40)
    for k in range(6):
        a = 2 * math.pi * k / 6 + .3; c, s = math.cos(a), math.sin(a)
        box(name + '_SPOKE', (.16, .02, .028), (c * .095, out * (w / 2 - .005), s * .095), RIM, hub, bev=.005, rot=(0, -a, 0))
    cyl(name + '_NUT', .035, .05, (0, out * (w / 2), 0), mat('nut', '#F0B6C4', .3, .2, .5), hub, rot=(math.pi / 2, 0, 0), seg=6)
    return hub
WHEELS = {'WHEEL_FL': (1.55, .8, .33, .3), 'WHEEL_FR': (1.55, -.8, .33, .3), 'WHEEL_RL': (-1.62, .78, .345, .38), 'WHEEL_RR': (-1.62, -.78, .345, .38)}
for n, (x, y, r, w) in WHEELS.items():
    wheel(n, x, y, r, w); sgn = 1 if y > 0 else -1; inner = abs(y) - w / 2 - .02
    for z0, z1 in ((.28, r + .05), (.47, r + .1)):
        rod(n + '_WISHBONE', (x + .18, sgn * (.2 if x > 0 else .16), z0), (x, sgn * inner, z1 - .02), .012, CARBON, car)
        rod(n + '_WISHBONE', (x - .18, sgn * (.2 if x > 0 else .16), z0), (x, sgn * inner, z1 - .02), .012, CARBON, car)
    cyl(n + '_UPRIGHT', .06, .06, (x, sgn * (inner + .01), r), CARBON, car, rot=(math.pi / 2, 0, 0), seg=16)

# a soft "centre of mass" marker the forces step can light up (hidden in the hero)
com = empty('CENTRE_OF_MASS', (-.25, 0, .3), car)

# ---------------------------------------------------------------- the wind tunnel: chalk test section, turntable, rolling road, fan
T = empty('TUNNEL', parent=root)
WALL = mat('wall', '#F5F1F2', .85); FLOOR_M = mat('tunnel_floor', '#ECE6E8', .6); RING = mat('ring', '#D8CDD2', .45, 0, .3)
WALL.use_backface_culling = True; FLOOR_M.use_backface_culling = True
X0, X1, HW, HT = -12., 10., 8., 5.2
def quad(name, verts, m, parent):
    bm = bmesh.new(); vs = [bm.verts.new(v) for v in verts]; bm.faces.new(vs); return obj_from_bm(name, bm, m, parent, smooth=False)
quad('TUNNEL_FLOOR', [(X0, -HW, 0), (X1, -HW, 0), (X1, HW, 0), (X0, HW, 0)], FLOOR_M, T)
quad('TUNNEL_WALL_FAR', [(X0, HW, 0), (X1, HW, 0), (X1, HW, HT), (X0, HW, HT)], WALL, T)          # three.js -Z: behind the car in side views
quad('TUNNEL_WALL_NEAR', [(X0, -HW, HT), (X1, -HW, HT), (X1, -HW, 0), (X0, -HW, 0)], WALL, T)
quad('TUNNEL_CEILING', [(X0, HW, HT), (X1, HW, HT), (X1, -HW, HT), (X0, -HW, HT)], WALL, T)
# a dusty-rose datum line and a dark control-room window on the far wall, light strips on the ceiling
box('WALL_LINE', (X1 - X0, .02, .05), ((X0 + X1) / 2, HW - .01, 1.1), ROSE, T, bev=0)
box('WALL_LINE', (X1 - X0, .02, .025), ((X0 + X1) / 2, HW - .01, 1.2), ROSE, T, bev=0)
box('CONTROL_WINDOW', (5.2, .04, 1.3), (-1.0, HW - .02, 2.7), mat('window', '#6F6178', .12, .2, .6), T, bev=.02)
box('CONTROL_WINDOW_FRAME', (5.4, .03, 1.5), (-1.0, HW - .005, 2.7), mat('frame', '#D8CDD2', .4), T, bev=.02)
for i in range(6):
    x = X0 + 2 + i * (X1 - X0 - 4) / 5
    box('CEILING_LIGHT', (2.2, .5, .04), (x, -2.4, HT - .03), mat('light', '#FFFFFF', .5, 0, 0, 2.5), T, bev=.01)
    box('CEILING_LIGHT', (2.2, .5, .04), (x, 2.4, HT - .03), mat('light', '#FFFFFF', .5, 0, 0, 2.5), T, bev=.01)
# turntable with a rolling road through it (three.js scrolls a texture on the belt)
cyl('TURNTABLE', 3.2, .03, (0, 0, .0), mat('turntable', '#E2D9DD', .5, 0, .3), T, seg=96)
cyl('TURNTABLE_RING', 3.26, .025, (0, 0, -.001), RING, T, seg=96)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
for v in bm.verts: v.co.x *= 2 * 6.0; v.co.y *= 2 * 1.05
for f in bm.faces:
    for l in f.loops: pass
uvl = bm.loops.layers.uv.new('UVMap')
for f in bm.faces:
    for l in f.loops: l[uvl].uv = ((l.vert.co.x / 12 + .5) * 6, (l.vert.co.y / 2.1 + .5))
belt = obj_from_bm('ROLLING_ROAD', bm, mat('belt', '#9C9298', .55), T, smooth=False); belt.location = (0, 0, .017)
for sgn in (1, -1): box('ROAD_EDGE', (6.04, .05, .03), (0, sgn * 1.07, .015), STEEL, T, bev=.006)
# the inlet screen (honeycomb) upstream, the fan downstream
screen = empty('INLET_SCREEN', (X1 - .05, 0, 0), T)
box('SCREEN_FRAME', (.1, 2 * HW, HT), (0, 0, HT / 2), mat('screen_frame', '#E6DEE2', .6), screen, bev=0)
for i in range(1, 24):
    box('SCREEN_BAR', (.12, .02, HT), (-.02, -HW + i * 2 * HW / 24, HT / 2), RING, screen, bev=0)
for j in range(1, 8):
    box('SCREEN_BAR', (.12, 2 * HW, .02), (-.02, 0, j * HT / 8), RING, screen, bev=0)
fanw = empty('FAN_HOUSING', (X0 + .05, 0, HT / 2), T)
box('FAN_WALL', (.1, 2 * HW, HT), (0, 0, 0), mat('fan_wall', '#E6DEE2', .6), fanw, bev=0)
cyl('FAN_RING', 2.25, .5, (.2, 0, 0), mat('fan_ring', '#C9BFC5', .35, .6), fanw, rot=(0, math.pi / 2, 0), seg=96)
cyl('FAN_HOLE', 2.05, .52, (.2, 0, 0), mat('fan_hole', '#3A2E36', .7), fanw, rot=(0, math.pi / 2, 0), seg=96)
fan = empty('TUNNEL_FAN', (.5, 0, 0), fanw)
cyl('FAN_HUB', .45, .5, (0, 0, 0), mat('fan_hub', '#F0B6C4', .35, 0, .5), fan, rot=(0, math.pi / 2, 0), seg=48, bev=.05)
for k in range(9):
    a = 2 * math.pi * k / 9
    bl = box('FAN_BLADE', (.04, 1.6, .42), (0, math.cos(a) * 1.15, math.sin(a) * 1.15), mat('blade', '#D9D3D8', .3, .8), fan, bev=.015)
    bl.rotation_euler = (a, 0, 0); bl.rotation_euler.rotate_axis('Y', math.radians(30))
# the smoke wand: a stand beside the road, a carriage that slides up it, an arm to the centre line, a nozzle facing downstream
wand_stand = empty('SMOKE_STAND', (4.4, 1.4, 0), T)
cyl('STAND_BASE', .22, .04, (0, 0, .02), STEEL, wand_stand, seg=32)
cyl('STAND_POLE', .025, 1.7, (0, 0, .85), STEEL, wand_stand, seg=16)
wand = empty('SMOKE_WAND', (4.4, 1.4, .6), T)
box('WAND_CARRIAGE', (.08, .08, .12), (0, 0, 0), mat('wand_c', '#F0B6C4', .35, 0, .5), wand, bev=.015)
rod('WAND_ARM', (0, 0, 0), (0, -1.4, 0), .012, STEEL, wand)
cyl('WAND_NOZZLE', .022, .14, (-.07, -1.4, 0), mat('nozzle', '#3B1737', .3, .3), wand, rot=(0, math.pi / 2, 0), seg=16, r2=.01)

# ---------------------------------------------------------------- export (rear wing at the default 15°, flap closed)
RW.rotation_euler = (0, math.radians(15), 0)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'windtunnel.glb'), export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_extras=False, export_image_format='AUTO')
print('exported', os.path.getsize(os.path.join(OUT, 'windtunnel.glb')))
if '--no-render' in sys.argv: sys.exit()

# ---------------------------------------------------------------- hero render: a low three-quarter front view, ceiling light, smoke lines
for o in sc.objects:
    if o.name.startswith('TUNNEL_WALL_NEAR'): o.hide_render = True
for name, loc, energy, size in (('KEY', (2.5, -3.5, 4.6), 700, 4.5), ('TOP', (-1.5, 0, 4.9), 600, 6), ('RIM', (-6, 3, 3.5), 350, 4), ('FILL', (7, -4, 1.6), 150, 3)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size; lo = bpy.data.objects.new(name, ld); link(lo)
    lo.location = loc; lo.rotation_euler = (Vector((0, 0, .4)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
# a few smoke streaks for the hero: thin emissive tubes following a simple path over the car
SMOKE = mat('smoke', '#B48DB5', .9, 0, 0, 1.4, .55)
def streak(z0, y0, lift):
    cu = bpy.data.curves.new('smk', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .009; sp = cu.splines.new('NURBS')
    xs = [4.4 - i * .35 for i in range(28)]; pts = []
    for x in xs:
        bump = lift * math.exp(-((x - .2) / 1.6) ** 2) + (.22 * math.exp(-((x + 2.4) / .5) ** 2) if z0 > .7 else 0)
        pts.append((x, y0, z0 + bump))
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    sp.use_endpoint_u = True; o = bpy.data.objects.new('SMOKE', cu); link(o); o.data.materials.append(SMOKE)
for z0, y0, lift in ((.55, -.05, .42), (.7, 0, .3), (.85, .05, .2), (1.0, -.03, .14), (1.15, .02, .08)): streak(z0, y0, lift)
cam = bpy.data.cameras.new('Cam'); cam.lens = 36; co = bpy.data.objects.new('Cam', cam); link(co); sc.camera = co
co.location = (5.0, -4.5, 1.25); co.rotation_euler = (Vector((-.15, .05, .5)) - co.location).to_track_quat('-Z', 'Y').to_euler()
cam.dof.use_dof = True; cam.dof.focus_distance = 6.2; cam.dof.aperture_fstop = 5.6
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = srgb('#F5F1F2'); w.node_tree.nodes['Background'].inputs[1].default_value = .22
sc.view_settings.exposure = -.3
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16 if PREVIEW else int(os.environ.get('SAMPLES', 48)); sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.render.resolution_x, sc.render.resolution_y = (640, 400) if PREVIEW else (1600, 1000)
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = os.path.join(OUT, 'windtunnel-hero-preview.png' if PREVIEW else 'windtunnel-hero.png'); bpy.ops.render.render(write_still=True)
print('rendered', sc.render.filepath)
