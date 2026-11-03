# assembl study · The house design machine (study/m/house.html): an original practice design, a split-level house on a
# north-facing NZ hillside, built as a white card model on a stepped green contour site.
# Run: PREVIEW=1 /path/to/python build_house.py   (bpy 5.x as a module). Writes house.glb and house-hero.png beside this file
# (NORENDER=1 skips the Cycles render).
# Coordinates: metres. Blender X = east, Y = north, Z = up, with Z = 0 at the lower floor (RL 10.000). The glTF exporter writes
# Y-up, so in three.js north is -Z. Named nodes are the contract with study/m/house-scene.js (see study/tests/house.test.mjs).
# The numbers here match the H / ROOMS / OPEN tables in study/m/house.js; change both together.
import bpy, bmesh, math, os
from mathutils import Vector
OUT = os.path.dirname(os.path.abspath(__file__))
PREVIEW = os.environ.get('PREVIEW') == '1'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c] + [1]
MATS = {}
def mat(name, colour, rough=.85, alpha=1.0, metal=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(colour); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    MATS[name] = m; return m
M = dict(card=mat('card', '#F3F0EA', .88), roof=mat('roof', '#D8D3CB', .8), floor=mat('floor', '#E7DCCB', .7),
         timber=mat('timber', '#C9A47A', .7), furn=mat('furniture', '#FBFAF7', .9), glass=mat('glass', '#A9C6CF', .08, .32),
         frame=mat('frame', '#4B4A48', .5), door=mat('door', '#B98B5E', .6), greenA=mat('contourA', '#9CBE84', .95),
         greenB=mat('contourB', '#A7C78F', .95), base=mat('plywood', '#D8BC94', .75), street=mat('street', '#B9B5AF', .95),
         water=mat('water', '#9CC3D3', .25), neighbour=mat('neighbour', '#E2DED7', .9), tree=mat('tree', '#F2F0E9', .9),
         red=mat('red', '#D2463C', .55))

def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; sc.collection.objects.link(e)
    if parent: set_parent(e, parent)
    return e
def set_parent(ob, par):
    bpy.context.view_layer.update(); ob.parent = par; ob.matrix_parent_inverse = par.matrix_world.inverted()
def F(v, x, y): return v(x, y) if callable(v) else v
def box(bm, x0, x1, y0, y1, zb, zt):
    """an axis-aligned block; zb and zt may be numbers or functions of (x, y) for sloping tops (walls under a skillion roof)"""
    if x1 - x0 < 1e-4 or y1 - y0 < 1e-4: return
    v = [bm.verts.new((x, y, F(zb, x, y))) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    w = [bm.verts.new((x, y, F(zt, x, y))) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    bm.faces.new((v[3], v[2], v[1], v[0])); bm.faces.new(w)
    for i in range(4): j = (i + 1) % 4; bm.faces.new((v[i], v[j], w[j], w[i]))
def prism_x(bm, x0, x1, prof):
    """extrude a (y, z) profile, counter-clockwise seen from +x, along x"""
    a = [bm.verts.new((x0, y, z)) for y, z in prof]; b = [bm.verts.new((x1, y, z)) for y, z in prof]
    bm.faces.new(list(reversed(a))); bm.faces.new(b)
    n = len(prof)
    for i in range(n): j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
def make(name, fill, m, parent=None, smooth=False):
    bm = bmesh.new(); fill(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); me.materials.append(m)
    for p in me.polygons: p.use_smooth = smooth
    if parent: set_parent(ob, parent)
    return ob

# ------------------------------------------------------------------ the design (keep in step with study/m/house.js)
LO = dict(x0=-7, x1=7, y0=0, y1=5.5, ffl=0.0)      # lower wing: living, kitchen + dining, opens north to the deck and view
UP = dict(x0=-7, x1=7, y0=-4.5, y1=0, ffl=1.4)     # upper wing, half a level (1.4 m) up the slope: entry, bedrooms, bath
ceilL = lambda x, y: 2.7 + y * .6 / 5.5            # lower ceiling: skillion rising to the north (sun and view)
ceilU = lambda x, y: 3.8 + (y + 4.5) * .2          # upper ceiling: rising to the north, so clerestory windows face the sun
T = .2                                             # outside walls; inside walls are 0.1
STAIR = dict(x0=5.6, x1=6.8, top=-1.56, bottom=.4, risers=8, rise=.175, going=.28)
# openings: wall, from, to (along the wall), sill, head (heights above RL 10.000), kind
OPEN = [('LN', -6.4, -2.2, 0, 2.4, 'slider'), ('LN', -1.0, 6.4, 0, 2.4, 'slider'), ('LE', 1.4, 4.4, .8, 2.4, 'window'),
        ('LW', 2.0, 4.0, .9, 2.1, 'window'), ('LS', 5.6, 6.8, 0, 2.6, 'open'),
        ('UN', -6.6, -2.9, 3.15, 4.45, 'window'), ('UN', -2.1, -.4, 3.15, 4.45, 'window'), ('UN', .4, 3.1, 3.15, 4.45, 'window'),
        ('UN', 3.9, 5.4, 3.15, 4.45, 'window'), ('UN', 5.6, 6.8, 1.4, 2.6, 'open'),
        ('US', 4.6, 5.6, 1.4, 3.5, 'door'), ('US', 5.8, 6.6, 1.4, 3.5, 'window'), ('US', -6.2, -1.0, 3.0, 3.5, 'window'),
        ('UE', -3.8, -1.8, 2.3, 3.6, 'window'), ('UW', -2.6, -.8, 2.3, 3.6, 'window')]
INNER = [('x', -6.8, 3.5, -3.3, [(-4.6, -3.8), (-1.7, -.9), (.9, 1.7)]), ('y', -3.25, -.2, -2.5, []), ('y', -3.25, -.2, 0, []), ('y', -3.25, -.2, 3.5, [])]
WALLS = {  # name: (axis, along-from, along-to, across-from, across-to, bottom, top); walls stand on the floor slab's underside
    'LN': ('x', -7, 7, 5.3, 5.5, -.3, ceilL), 'LS': ('x', -7, 7, 0, .2, -.3, ceilL),
    'LE': ('y', .2, 5.3, 6.8, 7, -.3, ceilL), 'LW': ('y', .2, 5.3, -7, -6.8, -.3, ceilL),
    'UN': ('x', -7, 7, -.2, 0, 1.4, ceilU), 'US': ('x', -7, 7, -4.5, -4.3, 1.1, ceilU),
    'UE': ('y', -4.3, -.2, 6.8, 7, 1.1, ceilU), 'UW': ('y', -4.3, -.2, -7, -6.8, 1.1, ceilU)}
FOOT = {'L': -1.6, 'U': -.5}   # foundation walls go down into the slope (the section drawing shows them below the floors)
def foundations(bm, lv):
    for key, (axis, a0, a1, b0, b1, zb, zt) in WALLS.items():
        if key[0] != lv or key == 'UN': continue
        piece(bm, axis, a0, a1, b0 + .03, b1 - .03, FOOT[lv], zb - .005)

def piece(bm, axis, a0, a1, b0, b1, zb, zt):
    if axis == 'x': box(bm, a0, a1, b0, b1, zb, zt)
    else: box(bm, b0, b1, a0, a1, zb, zt)
def wall(bm, key):
    axis, a0, a1, b0, b1, zb, zt = WALLS[key]
    ops = sorted([o for o in OPEN if o[0] == key], key=lambda o: o[1]); cur = a0
    for _, o0, o1, sill, head, kind in ops:
        if o0 > cur: piece(bm, axis, cur, o0, b0, b1, zb, zt)
        if sill > zb + 1e-3: piece(bm, axis, o0, o1, b0, b1, zb, sill)
        piece(bm, axis, o0, o1, b0, b1, head, zt); cur = o1
    if cur < a1: piece(bm, axis, cur, a1, b0, b1, zb, zt)
def glazing(bm_glass, bm_frame, bm_door, keys):
    for key, o0, o1, sill, head, kind in OPEN:
        if key not in keys or kind == 'open': continue
        axis, a0, a1, b0, b1, zb, zt = WALLS[key]; mid = (b0 + b1) / 2
        if kind == 'door': piece(bm_door, axis, o0, o1, mid - .03, mid + .03, sill, head); continue
        piece(bm_glass, axis, o0, o1, mid - .01, mid + .01, sill, head)
        f = .05
        for a, b, z0, z1 in ((o0, o0 + f, sill, head), (o1 - f, o1, sill, head), (o0, o1, sill, sill + f), (o0, o1, head - f, head)):
            piece(bm_frame, axis, a, b, mid - .04, mid + .04, z0, z1)
        if kind == 'slider':
            n = max(2, round((o1 - o0) / 2.2))
            for i in range(1, n): a = o0 + (o1 - o0) * i / n; piece(bm_frame, axis, a - .03, a + .03, mid - .04, mid + .04, sill, head)
def inner_walls(bm):
    for axis, a0, a1, at, doors in INNER:
        cur = a0
        for d0, d1 in doors:
            piece(bm, axis, cur, d0, at - .05, at + .05, UP['ffl'], ceilU); piece(bm, axis, d0, d1, at - .05, at + .05, 3.5, ceilU); cur = d1
        piece(bm, axis, cur, a1, at - .05, at + .05, UP['ffl'], ceilU)

ROOMS = [('ROOM_LIVING', -1.5, 7, 0, 5.5, 0), ('ROOM_KITCHEN', -7, -1.5, 0, 5.5, 0),
         ('ROOM_BED1', -7, -2.5, -3.3, 0, 1.4), ('ROOM_BATH', -2.5, 0, -3.3, 0, 1.4), ('ROOM_BED2', 0, 3.5, -3.3, 0, 1.4),
         ('ROOM_HALL', -7, 3.5, -4.5, -3.3, 1.4), ('ROOM_ENTRY', 3.5, 7, -4.5, 0, 1.4)]
def room_plate(name, x0, x1, y0, y1, ffl, parent):
    ins = lambda v, outer: T if v in outer else (0 if v == -1.5 else .05)
    def fill(bm):
        a0, a1 = x0 + ins(x0, (-7, 7)), x1 - ins(x1, (-7, 7)); b0, b1 = y0 + ins(y0, (0, 5.5, -4.5)), y1 - ins(y1, (0, 5.5, -4.5))
        if name == 'ROOM_ENTRY':  # leave the stair well open
            s = STAIR; box(bm, a0, a1, b0, s['top'], ffl, ffl + .02); box(bm, a0, s['x0'], s['top'], b1, ffl, ffl + .02); box(bm, s['x1'], a1, s['top'], b1, ffl, ffl + .02)
        else: box(bm, a0, a1, b0, b1, ffl, ffl + .02)
    return make(name, fill, M['floor'], parent)

# ------------------------------------------------------------------ the site: a north-facing slope of about 1 in 6
def ground(x, y): return 10.6 - .16 * y + .01 * max(0, abs(x) - 7) ** 2   # RL of the natural ground
SITE = dict(x0=-20, x1=20, y0=-12.6, y1=15.5)
def layer_top(x, y): return math.floor(ground(x, y) * 2) / 2 - 10          # top of the card contour layer at a point
root = empty('HOUSE_MODEL')
site = empty('SITE', parent=root)
make('BASE', lambda bm: box(bm, -20.6, 20.6, -16.1, 16.1, -2.7, -2.0), M['base'], site)
make('WATER', lambda bm: box(bm, -20, 20, 10.5, 15.5, -2.0, -1.97), M['water'], site)
make('STREET', lambda bm: (box(bm, -20, 20, -15.5, -12.6, -2.0, 2.4), box(bm, -20, 20, -12.85, -12.6, 2.4, 2.52)), M['street'], site)

def terrain_layers():
    out = {'A': [], 'B': []}
    xs = [SITE['x0'] + i * .5 for i in range(int((SITE['x1'] - SITE['x0']) / .5) + 1)]
    for k, L in enumerate([8.5 + .5 * i for i in range(14)]):
        ymax = lambda x: min(SITE['y1'], (10.6 - L + .01 * max(0, abs(x) - 7) ** 2) / .16)
        ok = [ymax(x) > SITE['y0'] + .05 for x in xs]
        runs, start = [], None
        for i, o in enumerate(ok + [False]):
            if o and start is None: start = i
            if not o and start is not None: runs.append((start, i - 1)); start = None
        for i0, i1 in runs:
            def cross(xa, xb):  # where ymax meets the street edge, between a sample inside and one outside
                for _ in range(30):
                    xm = (xa + xb) / 2
                    if ymax(xm) > SITE['y0'] + .05: xa = xm
                    else: xb = xm
                return xa
            xa = xs[i0] if i0 == 0 else cross(xs[i0], xs[i0 - 1]); xb = xs[i1] if i1 == len(xs) - 1 else cross(xs[i1], xs[i1 + 1])
            top = [(x, ymax(x)) for x in [xa] + [x for x in xs if xa < x < xb] + [xb]]
            poly = [(xa, SITE['y0']), (xb, SITE['y0'])] + [(x, y) for x, y in reversed(top)]
            out['A' if k % 2 == 0 else 'B'].append((poly, L - 10.5 + .004, L - 10))   # a hair's gap, so stacked layers never share a face
    return out
LAY = terrain_layers()
def fill_layers(items):
    def fill(bm):
        for poly, zb, zt in items:
            # drop repeated points
            pts = []
            for p in poly:
                if not pts or (abs(p[0] - pts[-1][0]) > 1e-4 or abs(p[1] - pts[-1][1]) > 1e-4): pts.append(p)
            if len(pts) > 2 and abs(pts[0][0] - pts[-1][0]) < 1e-4 and abs(pts[0][1] - pts[-1][1]) < 1e-4: pts.pop()
            a = [bm.verts.new((x, y, zb)) for x, y in pts]; b = [bm.verts.new((x, y, zt)) for x, y in pts]
            bm.faces.new(list(reversed(a))); bm.faces.new(b)
            for i in range(len(pts)): j = (i + 1) % len(pts); bm.faces.new((a[i], a[j], b[j], b[i]))
    return fill
terrain = empty('TERRAIN', parent=site)
TA = make('TERRAIN_A', fill_layers(LAY['A']), M['greenA'], terrain); TB = make('TERRAIN_B', fill_layers(LAY['B']), M['greenB'], terrain)
# the cut: no card above the lower floor inside the house, above the upper floor, or above the entry path
def cutter(name, fill):
    bm = bmesh.new(); fill(bm); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob
PATH = dict(x0=4.2, x1=6.0, y0=-12.6, y1=-4.5)
path_top = lambda x, y: 1.4 + (-4.5 - y) / 8.1 * 1.0
cuts = [cutter('cut_lower', lambda bm: box(bm, -7.0, 7.0, 0.0, 5.5, -.32, 12)), cutter('cut_upper', lambda bm: box(bm, -7, 7, -4.5, 0, 1.08, 12)),
        cutter('cut_path', lambda bm: box(bm, PATH['x0'] - .05, PATH['x1'] + .05, PATH['y0'] - .1, PATH['y1'], lambda x, y: path_top(x, y) - .03, 12))]
for t in (TA, TB):
    for c in cuts:
        mod = t.modifiers.new('cut', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = c; mod.solver = 'EXACT'
        bpy.context.view_layer.objects.active = t; bpy.ops.object.modifier_apply(modifier=mod.name)
for c in cuts: bpy.data.objects.remove(c)
make('PATH', lambda bm: box(bm, PATH['x0'], PATH['x1'], PATH['y0'], PATH['y1'], -1.0, path_top), M['street'], site)

# neighbours (plain massing, as on a real site model), trees, the north point
def neighbour(name, x0, x1, y0, y1, h):
    z = max(layer_top(x, y) for x in (x0, x1) for y in (y0, y1))
    def fill(bm):
        box(bm, x0, x1, y0, y1, -2.0, z + h)
        prism_x(bm, x0 - .3, x1 + .3, [(y0 - .3, z + h), (y1 + .3, z + h), ((y0 + y1) / 2, z + h + 1.4)])
    make(name, fill, M['neighbour'], site)
neighbour('NEIGHBOUR_W', -19.6, -14.6, -7, 1, 2.8); neighbour('NEIGHBOUR_E', 14.6, 19.6, -4, 4, 2.8)
trees = empty('TREES', parent=site)
TREES = [(-10, 8), (-13.5, 3.8), (-9.4, -9.6), (10.6, 9.2), (13, -8.4), (-17, 10.6), (17.4, 11.2), (9.4, -10.6), (-16.4, -10.8), (-11.8, 12.6)]
def tree_fill(bm):
    for i, (x, y) in enumerate(TREES):
        z = layer_top(x, y); s = .85 + .25 * ((i * 7) % 3) / 2
        r = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=.09, radius2=.07, depth=2.2 * s)
        for v in r['verts']: v.co += Vector((x, y, z + 1.1 * s))
        r = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.25 * s)
        for v in r['verts']: v.co = Vector((v.co.x, v.co.y, v.co.z * 1.1)) + Vector((x, y, z + 2.6 * s))
make('TREE_CANOPIES', tree_fill, M['tree'], trees)
npt = empty('NORTH_POINT', (-17.4, -14.1, 2.42), site)
def arrow_fill(bm):
    pts = [(-17.4, -12.9), (-16.75, -15.1), (-17.4, -14.55), (-18.05, -15.1)]
    a = [bm.verts.new((x, y, 2.42)) for x, y in pts]; b = [bm.verts.new((x, y, 2.5)) for x, y in pts]
    bm.faces.new(list(reversed(a))); bm.faces.new(b)
    for i in range(4): j = (i + 1) % 4; bm.faces.new((a[i], a[j], b[j], b[i]))
make('NORTH_ARROW', arrow_fill, M['red'], npt)
cu = bpy.data.curves.new('N', 'FONT'); cu.body = 'N'; cu.size = 1.1; cu.extrude = .04; cu.align_x = 'CENTER'
tob = bpy.data.objects.new('nlabel', cu); sc.collection.objects.link(tob); tob.location = (-17.4, -12.75, 2.46)
bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
nm = bpy.data.meshes.new_from_object(tob.evaluated_get(dg)); nob = bpy.data.objects.new('NORTH_N', nm); sc.collection.objects.link(nob)
nob.matrix_world = tob.matrix_world.copy(); nm.materials.clear(); nm.materials.append(M['red']); bpy.data.objects.remove(tob); set_parent(nob, npt)

# ------------------------------------------------------------------ the metamorphosis: four massing stages (stage 0 is the bare site)
def stage(name):
    return empty(name, (0, 0, -2.0), root)
m1 = stage('MASS_1'); make('MASS_1_BLOCK', lambda bm: box(bm, -7, 7, -4.5, 5.5, 0, 3.0), M['card'], m1)
m2 = stage('MASS_2'); make('MASS_2_LOWER', lambda bm: box(bm, -7, 7, 0, 5.5, 0, 2.95), M['card'], m2); make('MASS_2_UPPER', lambda bm: box(bm, -7, 7, -4.5, 0, 1.4, 4.2), M['card'], m2)
m3 = stage('MASS_3')
make('MASS_3_LOWER', lambda bm: prism_x(bm, -7, 7, [(0, 0), (5.5, 0), (5.5, 3.55), (0, 2.95)]), M['card'], m3)
make('MASS_3_UPPER', lambda bm: prism_x(bm, -7, 7, [(-4.5, 1.4), (0, 1.4), (0, 4.95), (-4.5, 4.05)]), M['card'], m3)

# ------------------------------------------------------------------ the final house
house = stage('HOUSE')
lower = empty('LEVEL_LOWER', parent=house); upper = empty('LEVEL_UPPER', parent=house)
make('FLOOR_LOWER', lambda bm: box(bm, -6.8, 6.8, .2, 5.3, -.3, 0), M['card'], lower)   # inside the walls, so a plan cut shows the walls solid
def floor_upper(bm):
    box(bm, -6.8, 6.8, -4.3, STAIR['top'], 1.1, 1.4); box(bm, -6.8, STAIR['x0'], STAIR['top'], -.2, 1.1, 1.4); box(bm, STAIR['x1'], 6.8, STAIR['top'], -.2, 1.1, 1.4)
make('FLOOR_UPPER', floor_upper, M['card'], upper)
make('WALLS_LOWER', lambda bm: [wall(bm, k) for k in ('LN', 'LS', 'LE', 'LW')], M['card'], lower)
make('WALLS_UPPER', lambda bm: [wall(bm, k) for k in ('UN', 'US', 'UE', 'UW')], M['card'], upper)
make('WALLS_INNER', inner_walls, M['card'], upper)
make('FOUND_LOWER', lambda bm: foundations(bm, 'L'), M['card'], lower); make('FOUND_UPPER', lambda bm: foundations(bm, 'U'), M['card'], upper)
for keys, lv, suf in ((('LN', 'LE', 'LW'), lower, 'LOWER'), (('UN', 'US', 'UE', 'UW'), upper, 'UPPER')):
    bg, bf, bd = bmesh.new(), bmesh.new(), bmesh.new(); glazing(bg, bf, bd, keys)
    if suf == 'LOWER': box(bg, -3.5, 5.5, 7.94, 7.97, -.02, 1.0)   # glass balustrade on the deck edge
    for name, bmx, m in ((f'GLASS_{suf}', bg, M['glass']), (f'FRAMES_{suf}', bf, M['frame']), ('DOOR_FRONT', bd, M['door'])):
        if not bmx.faces: bmx.free(); continue
        bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces); me = bpy.data.meshes.new(name); bmx.to_mesh(me); bmx.free()
        ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); me.materials.append(m); set_parent(ob, lv)
for r in ROOMS: room_plate(*r, lower if r[5] == 0 else upper)
def deck(bm):
    box(bm, -3.5, 5.5, 5.5, 8.0, -.17, -.02)
    for x in (-3.3, 1.0, 5.3): box(bm, x - .07, x + .07, 7.75, 7.89, -2.0, -.17)
    box(bm, -3.5, 5.5, 7.92, 8.0, 1.0, 1.05)
make('DECK', deck, M['timber'], lower)
def furn_lower(bm):
    box(bm, -6.8, -2.6, .2, .8, 0, .9)        # kitchen bench along the back wall
    box(bm, -5.6, -3.0, 2.0, 2.9, 0, .9)      # island
    box(bm, -5.7, -3.5, 3.9, 4.8, .7, .76); [box(bm, x - .04, x + .04, y - .04, y + .04, 0, .7) for x in (-5.6, -3.6) for y in (4.0, 4.7)]  # table
    box(bm, .6, 3.6, 1.5, 2.4, 0, .45); box(bm, .6, 3.6, 1.5, 1.75, .45, .8); box(bm, .6, .85, 1.75, 2.4, .45, .65); box(bm, 3.35, 3.6, 1.75, 2.4, .45, .65)  # sofa
    box(bm, 1.4, 2.8, 2.9, 3.6, 0, .38)       # low table
def furn_upper(bm):
    f = UP['ffl']
    box(bm, -6.2, -4.6, -2.9, -.8, f, f + .45); box(bm, -6.2, -4.6, -3.1, -2.9, f, f + .9)       # bed 1 + headboard
    box(bm, 1.6, 3.0, -2.9, -.9, f, f + .45); box(bm, 1.6, 3.0, -3.1, -2.9, f, f + .9)           # bed 2
    box(bm, -2.35, -.65, -.95, -.25, f, f + .55)                                                 # bath
    box(bm, -2.3, -1.4, -3.15, -2.7, f, f + .85)                                                 # vanity
make('FURN_LOWER', furn_lower, M['furn'], lower); make('FURN_UPPER', furn_upper, M['furn'], upper)
def stair(bm):
    s = STAIR
    for i in range(1, s['risers']):
        box(bm, s['x0'], s['x1'], s['bottom'] - s['going'] * i, s['bottom'] - s['going'] * (i - 1), 0, s['rise'] * i)
make('STAIR', stair, M['timber'], house)
make('ROOF_LOWER', lambda bm: prism_x(bm, -7.4, 7.4, [(0, 2.7), (6.5, ceilL(0, 6.5)), (6.5, ceilL(0, 6.5) + .25), (0, 2.95)]), M['roof'], house)
make('ROOF_UPPER', lambda bm: prism_x(bm, -7.4, 7.4, [(-5.1, ceilU(0, -5.1)), (.6, ceilU(0, .6)), (.6, ceilU(0, .6) + .25), (-5.1, ceilU(0, -5.1) + .25)]), M['roof'], house)

bpy.ops.export_scene.gltf(filepath=f'{OUT}/house.glb', export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_extras=False)
print('exported', os.path.getsize(f'{OUT}/house.glb'))
if os.environ.get('NORENDER') == '1': raise SystemExit(0)   # model only, no hero render

# ------------------------------------------------------------------ hero render (Cycles): only the final house
for o in (m1, m2, m3):
    for c in o.children: c.hide_render = True
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16 if PREVIEW else 64; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = (640, 400) if PREVIEW else (1600, 1000)
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Base Contrast'
w = bpy.data.worlds.new('Studio'); sc.world = w; w.use_nodes = True; bgn = w.node_tree.nodes['Background']
bgn.inputs['Color'].default_value = srgb('#F4EFE7'); bgn.inputs['Strength'].default_value = .9
floor_ = make('PAPER', lambda bm: box(bm, -200, 200, -200, 200, -2.72, -2.7), mat('paper', '#F4EFE7', .95))
lamp = bpy.data.lights.new('Sun', 'SUN'); lamp.energy = 4.2; lamp.angle = math.radians(2.5); lamp.color = (1, .96, .9)
lo = bpy.data.objects.new('Sun', lamp); sc.collection.objects.link(lo)
az, alt = math.radians(-35), math.radians(34)   # from the north-west (afternoon), about 34° up
d = Vector((math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt)))
lo.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
cam = bpy.data.cameras.new('Cam'); cam.lens = 58; co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (29, 37, 19); co.rotation_euler = (Vector((0.6, 1.4, .2)) - co.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = f'{OUT}/house-hero.png'; bpy.ops.render.render(write_still=True)
print('rendered')
