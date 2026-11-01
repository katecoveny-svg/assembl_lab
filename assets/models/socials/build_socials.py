# assembl · Year 9 social studies exam machine — the exam desk diorama.
# Run: python build_socials.py  (needs the `bpy` module, Blender 5.x). Writes socials-desk.glb and socials-hero.png.
# Blender is Z-up; the GLB is Y-up (x, z, -y). Metres. Named nodes are the contract with study/m/socials-scene.js.
import bpy, bmesh, math, os, sys
from mathutils import Vector
OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
P = {  # the assembl study palette: pastel cases, plum ink, product brights
  'paper': '#F7F1EA', 'desk': '#EAD9C8', 'peach': '#F6C7A8', 'blush': '#F3B8C8', 'lilac': '#C9B6EA', 'mint': '#A9D8C4',
  'sky': '#BFDDF5', 'butter': '#F2DC8A', 'plum': '#3A2140', 'navy': '#2E3A7A', 'coral': '#E8606A', 'white': '#FBF8F4', 'steel': '#C9CDD6', 'wood': '#D9B48F'}
def srgb(h):
    c = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return [(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c] + [1]
MATS = {}
def mat(name, colour, rough=.45, coat=.35, metal=0, alpha=1, transmission=0):
    key = (name, colour)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(colour); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = .25
    if alpha < 1 or transmission:
        b.inputs['Alpha'].default_value = alpha; b.inputs['Transmission Weight'].default_value = transmission
        m.surface_render_method = 'BLENDED'
    MATS[key] = m; return m
def finish(o, m, bevel=0, parent=None, name=None, seg=3):
    if name: o.name = name; o.data.name = name
    o.data.materials.append(m)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = seg; mod.limit_method = 'ANGLE'
    for p in o.data.polygons: p.use_smooth = True
    if parent: o.parent = parent
    return o
def box(name, size, loc, m, bevel=.01, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True); return finish(o, m, bevel, parent, name)
def cyl(name, r, h, loc, m, bevel=.004, parent=None, rot=(0, 0, 0), verts=48, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    return finish(bpy.context.object, m, bevel, parent, name)
def sphere(name, r, loc, m, parent=None, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=16); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(scale=True); return finish(o, m, 0, parent, name)
def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None); o.location = loc; bpy.context.collection.objects.link(o)
    if parent: o.parent = parent
    return o
root = empty('SOCIALS_DESK')
# ---- the desk: a rounded slab on a soft plinth
box('DESK_TOP', (3.2, 1.7, .08), (0, 0, .74), mat('desk', P['desk'], .55, .2), .025, root)
box('DESK_PLINTH', (3.0, 1.5, .7), (0, 0, .35), mat('plinth', P['paper'], .7, .1), .04, root)
DESK = .78
# ---- the board at the back: the face carries each step's live drawing (UV 0..1 across the face)
board = empty('BOARD', (0, .62, DESK), root)
box('BOARD_FRAME', (1.62, .05, .9), (0, 0, .53), mat('lilac', P['lilac'], .45, .4), .02, board)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -.028, .53), rotation=(math.radians(90), 0, 0)); face = bpy.context.object
face.scale = (1.52, .798, 1); bpy.ops.object.transform_apply(scale=True); finish(face, mat('board_face', P['white'], .6, 0), 0, board, 'BOARD_FACE')
for x in (-.55, .55): box('BOARD_LEG', (.05, .05, .1), (x, 0, .03), mat('lilac', P['lilac']), .01, board)
# ---- the exam bag (front left): a clear pouch with ruler, pencil, pen, coloured pencils and a rubber
bag = empty('EXAM_BAG', (-1.15, -.42, DESK), root)
box('BAG_POUCH', (.62, .36, .04), (0, 0, .025), mat('pouch', '#EAF2F8', .08, 1, 0, .28, .6), .015, bag)
box('BAG_ZIP', (.62, .02, .012), (0, .17, .05), mat('zip', P['coral'], .4), .004, bag)
box('RULER', (.5, .045, .006), (0, -.1, .012), mat('ruler', P['butter'], .35, .5), .002, bag)
for i in range(11): box('RULER_TICK', (.002, .012 if i % 5 else .02, .002), (-.24 + i * .048, -.115, .016), mat('ink', P['plum'], .5), 0, bag)
for i, (c, y) in enumerate([(P['navy'], .02), (P['coral'], .06), (P['mint'], .1), (P['lilac'], .14)]):
    pen = cyl('COLOURED_PENCIL' if i > 0 else 'PEN', .009, .34, (0, y, .016), mat('pc%d' % i, c, .4, .5), .001, bag, (0, math.radians(90), 0), 6 if i else 24)
    cyl('PENCIL_TIP', .009, .03, (.185, y, .016), mat('wood', P['wood'], .6), 0, bag, (0, math.radians(90), 0), 6, 0)
box('RUBBER', (.07, .04, .025), (.22, -.03, .02), mat('rubber', P['blush'], .7, .1), .008, bag)
# ---- the desk clock (front left, behind the bag): two hands the lesson turns to plan the two hours
clock = empty('CLOCK', (-1.18, .1, DESK), root)
cyl('CLOCK_BODY', .2, .06, (0, 0, .23), mat('mint', P['mint'], .4, .5), .01, clock, (math.radians(90), 0, 0))
cyl('CLOCK_FACE', .17, .005, (0, -.034, .23), mat('face', P['white'], .5, .2), 0, clock, (math.radians(90), 0, 0))
box('CLOCK_FOOT', (.16, .08, .04), (0, 0, .02), mat('mint', P['mint']), .01, clock)
for i in range(12):
    a = i / 12 * math.tau; box('CLOCK_TICK', (.01, .004, .025 if i % 3 else .04), (math.sin(a) * .145, -.039, .23 + math.cos(a) * .145), mat('ink', P['plum']), 0, clock, (0, a, 0))
for name, ln, w in (('HAND_HOUR', .09, .014), ('HAND_MIN', .13, .009)):
    h = empty(name, (0, -.043, .23), clock); box(name + '_MESH', (w, .004, ln), (0, 0, ln / 2), mat('ink', P['plum']), .002, h)
# section wedges: A and B as two discs behind the hands, turned by the lesson
# ---- the 3D graph (front right): six bars on a gridded plate, heights set from the data
graph = empty('GRAPH', (1.0, -.38, DESK), root)
box('GRAPH_PLATE', (.92, .5, .03), (0, 0, .015), mat('plate', P['white'], .55, .2), .01, graph)
for i in range(5): box('GRAPH_GRID', (.86, .003, .002), (0, -.2 + i * .1, .031), mat('grid', '#DCD3DE', .6), 0, graph)
for i in range(6):
    bar = empty('BAR_%d' % i, (-.36 + i * .145, 0, .03), graph)
    box('BAR_%d_MESH' % i, (.1, .2, 1), (0, 0, .5), mat('bar%d' % (i % 3), [P['coral'], P['lilac'], P['mint']][i % 3], .35, .6), .008, bar)
# ---- the values continuum (middle front): a rail from strongly disagree to strongly agree, with people tokens
cont = empty('CONTINUUM', (0, -.5, DESK), root)
box('RAIL', (1.3, .04, .03), (0, 0, .02), mat('rail', P['steel'], .3, .2, .6), .01, cont)
cyl('END_AGAINST', .05, .07, (-.68, 0, .035), mat('blush', P['blush']), .01, cont)
cyl('END_FOR', .05, .07, (.68, 0, .035), mat('mint', P['mint']), .01, cont)
def person(name, colour, parent, scale=1):
    t = empty(name, (0, 0, .035), parent)
    cyl(name + '_BODY', .03 * scale, .07 * scale, (0, 0, .035 * scale), mat(name, colour, .45, .5), .006, t, verts=32, r2=.02 * scale)
    sphere(name + '_HEAD', .022 * scale, (0, 0, .09 * scale), mat('skin_' + name, '#E8C3A0', .5), t)
    return t
for i, c in enumerate([P['coral'], P['navy'], P['lilac'], P['butter'], P['sky']]): person('TOKEN_%d' % i, c, cont)
person('TOKEN_YOU', P['plum'], cont, 1.35)
# ---- government (back left): a stylised Beehive, Parliament House, and the three branches as pillars
gov = empty('GOVERNMENT', (-1.0, .22, DESK), root)
hive = empty('BEEHIVE', (-.12, .1, 0), gov)
for i in range(9):
    cyl('BEEHIVE_TIER', .2 - i * .012, .045, (0, 0, .03 + i * .05), mat('hive', P['white'] if i % 2 else '#E7E1EA', .5, .2), .004, hive, verts=36)
cyl('BEEHIVE_TOP', .1, .05, (0, 0, .5), mat('hive_top', P['steel'], .3, .2, .5), .004, hive, r2=.07)
box('PARLIAMENT_HOUSE', (.36, .16, .2), (.25, .14, .1), mat('stone', '#EFE6DA', .6, .1), .01, gov)
for i in range(6): cyl('PH_COLUMN', .01, .14, (.12 + i * .05, .055, .09), mat('stone', '#EFE6DA'), 0, gov, verts=12)
for i, (name, c) in enumerate((('BRANCH_LEGISLATIVE', P['sky']), ('BRANCH_EXECUTIVE', P['peach']), ('BRANCH_JUDICIAL', P['lilac']))):
    p = empty(name, (-.08 + i * .16, -.18, 0), gov)
    cyl(name + '_PILLAR', .045, .26, (0, 0, .13), mat(name, c, .4, .5), .006, p, verts=24)
    box(name + '_CAP', (.12, .12, .025), (0, 0, .27), mat(name, c), .006, p)
box('BRANCH_ROOF', (.48, .14, .03), (.08, -.18, .3), mat('roof', P['white'], .5, .3), .008, gov)
# ---- innovation (right, behind the graph): a jet boat on a water plate, and an idea light bulb
inno = empty('INNOVATION', (1.05, .25, DESK), root)
box('WATER', (.62, .36, .02), (0, 0, .01), mat('water', P['sky'], .12, 1), .008, inno)
boat = empty('JETBOAT', (0, 0, .03), inno)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, .04)); hull = bpy.context.object; hull.scale = (.34, .13, .06); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(hull.data)
for v in bm.verts:
    if v.co.x > .1: v.co.y *= max(.15, 1 - (v.co.x - .1) * 4.5); v.co.z += (v.co.x - .1) * .25 if v.co.z > 0 else 0
bm.to_mesh(hull.data); bm.free(); finish(hull, mat('hull', P['coral'], .3, .7), .012, boat, 'JETBOAT_HULL', 4)
box('JETBOAT_DECK', (.2, .1, .02), (-.05, 0, .075), mat('deck', P['white'], .4, .4), .006, boat)
box('JETBOAT_SCREEN', (.02, .11, .06), (.06, 0, .105), mat('screen', '#DDEBF5', .05, 1, 0, .4, .5), .004, boat, (0, math.radians(-25), 0))
cyl('JETBOAT_NOZZLE', .022, .05, (-.19, 0, .03), mat('steel', P['steel'], .25, .2, .8), .003, boat, (0, math.radians(90), 0))
bulb = empty('IDEA_BULB', (.2, .12, .02), inno)
cyl('BULB_BASE', .025, .04, (0, 0, .02), mat('steel', P['steel'], .25, .2, .8), .003, bulb)
sphere('BULB_GLASS', .045, (0, 0, .085), mat('bulb', '#FFF4C8', .05, 1, 0, .5, .4), bulb)
# ---- the balance (middle back): strengths against weaknesses, for the evaluation paragraph
bal = empty('BALANCE', (.28, .1, DESK), root)
cyl('BALANCE_POST', .015, .36, (0, 0, .18), mat('steel', P['steel'], .25, .2, .8), .003, bal)
cyl('BALANCE_FOOT', .08, .02, (0, 0, .01), mat('steel', P['steel']), .004, bal)
beam = empty('BALANCE_BEAM', (0, 0, .36), bal)
box('BEAM_BAR', (.5, .02, .015), (0, 0, 0), mat('steel', P['steel']), .004, beam)
for name, x, c in (('PAN_STRENGTHS', -.24, P['mint']), ('PAN_WEAKNESSES', .24, P['blush'])):
    pan = empty(name, (x, 0, 0), beam)
    cyl(name + '_STRING', .002, .12, (0, 0, -.06), mat('ink', P['plum']), 0, pan, verts=8)
    cyl(name + '_DISH', .07, .02, (0, 0, -.125), mat(name, c, .4, .5), .006, pan, r2=.05)
# ---- definitions: a stack of flash cards with one card that flips
cards = empty('CARDS', (-.35, .05, DESK), root)
for i in range(6): box('CARD_STACK', (.24, .16, .006), (0, 0, .004 + i * .007), mat('card%d' % (i % 2), [P['white'], P['butter']][i % 2], .6, .1), .002, cards, (0, 0, math.radians(i * 2 - 5)))
flip = empty('CARD_FLIP', (0, 0, .05), cards)
box('CARD_FRONT', (.24, .16, .006), (0, 0, 0), mat('cardf', P['sky'], .5, .2), .002, flip)
# ---- the paragraph tower: six blocks that stack as a two-paragraph answer is assembled
tower = empty('PARAGRAPH_TOWER', (.62, -.12, DESK), root)
for i, c in enumerate([P['peach'], P['peach'], P['peach'], P['peach'], P['lilac'], P['lilac']]):
    b = empty('BLOCK_%d' % i, (0, 0, .025 + i * .052), tower); box('BLOCK_%d_MESH' % i, (.2 - (i % 3) * .015, .12, .048), (0, 0, 0), mat('block%d' % i, c, .4, .5), .008, b)
# ---- export the web asset (Y-up GLB) and a hero render for the study cards
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'socials-desk.glb'), export_format='GLB', export_apply=True, export_yup=True, use_selection=False)
if '--no-render' in sys.argv: sys.exit()
# studio: paper cyclorama, a warm key from the upper left, a cool fill
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0)); finish(bpy.context.object, mat('floor', P['paper'], .9, 0), 0, None, 'FLOOR')
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 6, 8), rotation=(math.radians(90), 0, 0)); finish(bpy.context.object, mat('floor', P['paper'], .9, 0), 0, None, 'WALL')
for name, loc, energy, size, colour in (('KEY', (-4, -4, 7), 1400, 4, (1, .95, .88)), ('FILL', (5, -3, 3), 500, 5, (.86, .9, 1)), ('RIM', (0, 5, 5), 400, 3, (1, .9, .95))):
    bpy.ops.object.light_add(type='AREA', location=loc); L = bpy.context.object; L.name = name; L.data.energy = energy; L.data.size = size; L.data.color = colour
    L.rotation_euler = (Vector((0, 0, .9)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(2.9, -4.2, 3.1)); cam = bpy.context.object; scene.camera = cam
cam.rotation_euler = (Vector((0, .05, .95)) - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 46
scene.world = bpy.data.worlds.new('w'); scene.world.use_nodes = True; scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.95, .93, .9, 1); scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
# the hero shows a sample graph on the bars and a sample tilt on the balance
for i, h in enumerate([.3, .21, .13, .26, .19, .09]): scene.objects['BAR_%d' % i].scale.z = h
scene.objects['BALANCE_BEAM'].rotation_euler.y = math.radians(-8)
board_png = os.path.join(OUT, 'board-sample.png')
if os.path.exists(board_png):
    m = bpy.data.materials.new('board_live'); m.use_nodes = True; nt = m.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(board_png)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.55
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    f = scene.objects['BOARD_FACE']; f.data.materials.clear(); f.data.materials.append(m)
scene.objects['TOKEN_YOU'].location.x = .25
for i, x in enumerate([-.5, -.25, .05, .4, .58]): scene.objects['TOKEN_%d' % i].location.x = x
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = int(os.environ.get('SAMPLES', 48)); scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000; scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast' if 'AgX - Medium High Contrast' in [l for l in []] else 'None'
scene.render.filepath = os.path.join(OUT, 'socials-hero.png'); bpy.ops.render.render(write_still=True)
