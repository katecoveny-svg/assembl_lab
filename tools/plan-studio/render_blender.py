"""assembl Plan Studio · hero stills in Blender (Cycles), from the model the page exports.

    /path/to/python-with-bpy tools/plan-studio/render_blender.py -- model.glb out_dir [--views=street,aerial,interior,dusk] [--samples=96] [--size=1920x1080]

The page's "Studio render pack" saves the GLB (geometry and material ids) and the project JSON. This script upgrades each
material by its id (real-scale boards and seams, clear glass, satin aluminium), lights the site with a physical sky and sun,
and renders the requested views. Geometry is never changed: the stills are visualisations of that model revision.
"""
import sys, os, math
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB, OUT = argv[0], argv[1]
opt = {a.split("=")[0][2:]: a.split("=")[1] for a in argv[2:] if a.startswith("--") and "=" in a}
VIEWS = opt.get("views", "street,aerial,interior,dusk").split(",")
SAMPLES = int(opt.get("samples", "96"))
W, H = (int(v) for v in opt.get("size", "1920x1080").split("x"))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene

# ------------------------------------------------------------------------------------------------ materials by id
def principled(m):
    m.use_nodes = True
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")

def boards(m, vertical=True, width=0.14, base=(0.33, 0.22, 0.15)):
    """Timber boards at true scale: a wave texture across the boards plus fine noise, driven by object coordinates."""
    nt = m.node_tree; b = principled(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.wave_type = "BANDS"; wave.bands_direction = "X" if vertical else "Z"; wave.inputs["Scale"].default_value = 1 / width / 3.0
    wave.inputs["Distortion"].default_value = 0.6
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 40
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*[c * 0.75 for c in base], 1); ramp.color_ramp.elements[1].color = (*base, 1)
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[0].default_value = 0.25
    nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], mix.inputs[6]); nt.links.new(noise.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.72

MATS = {}
for m in bpy.data.materials:
    name = m.name.split(".")[0]
    b = principled(m)
    if name.startswith("cladding-vertical"): boards(m, True)
    elif name.startswith("cladding-fibre"): boards(m, False, 0.18, (0.78, 0.76, 0.72))
    elif name.startswith("glass") or name.startswith("door-glazed"):
        b.inputs["Base Color"].default_value = (0.8, 0.86, 0.88, 1); b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.0; b.inputs["IOR"].default_value = 1.5
        b.inputs["Alpha"].default_value = 1.0
    elif name.startswith("window-thermal"): b.inputs["Base Color"].default_value = (0.03, 0.03, 0.035, 1); b.inputs["Metallic"].default_value = 0.6; b.inputs["Roughness"].default_value = 0.35
    elif name.startswith("roof"): b.inputs["Metallic"].default_value = 0.3; b.inputs["Roughness"].default_value = 0.42; b.inputs["Coat Weight"].default_value = 0.4
    elif name.startswith("slab"): b.inputs["Roughness"].default_value = 0.5

# ------------------------------------------------------------------------------------------------ site: physical sky, sun, ground
world = bpy.data.worlds.new("sky"); sc.world = world; world.use_nodes = True
wn = world.node_tree; bg = wn.nodes["Background"]
sky = wn.nodes.new("ShaderNodeTexSky")
try: sky.sky_type = "NISHITA"
except Exception: pass
wn.links.new(sky.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.18
sun_d = bpy.data.lights.new("sun", "SUN"); sun_d.angle = math.radians(1.2); sun = bpy.data.objects.new("sun", sun_d); sc.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=400); ground = bpy.context.object
gm = bpy.data.materials.new("ground"); gb = principled(gm); gb.inputs["Base Color"].default_value = (0.09, 0.13, 0.06, 1); gb.inputs["Roughness"].default_value = 1; ground.data.materials.append(gm)
gnt = gm.node_tree; gn = gnt.nodes.new("ShaderNodeTexNoise"); gn.inputs["Scale"].default_value = 3; gr = gnt.nodes.new("ShaderNodeValToRGB")
gr.color_ramp.elements[0].color = (0.035, 0.055, 0.025, 1); gr.color_ramp.elements[1].color = (0.075, 0.1, 0.04, 1); gnt.links.new(gn.outputs["Fac"], gr.inputs["Fac"]); gnt.links.new(gr.outputs["Color"], gb.inputs["Base Color"])

# the building's extent (for cameras); no fake planting: landscaping comes from the landscape architect's model
mins = Vector((1e9, 1e9, 1e9)); maxs = -mins
for o in bpy.data.objects:
    if o.type == "MESH" and o is not ground:
        for c in o.bound_box:
            w_ = o.matrix_world @ Vector(c); mins = Vector(map(min, mins, w_)); maxs = Vector(map(max, maxs, w_))
ctr = (mins + maxs) / 2; size = maxs - mins

# ------------------------------------------------------------------------------------------------ cameras and light per view
cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
def aim(loc, target, lens):
    cam.location = loc; cam_d.lens = lens; cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
def light(elev, azim, strength, warm):
    sun.rotation_euler = (math.radians(90 - elev), 0, math.radians(azim)); sun_d.energy = strength; sun_d.color = warm
    try: sky.sun_elevation = math.radians(elev); sky.sun_rotation = math.radians(azim)
    except Exception: pass
# glTF imports y-up as Blender z-up; the page puts plan north at Blender +y
L = max(size.x, size.y)
VIEW = {
    "street": (lambda: aim((ctr.x + L * 0.55, ctr.y + L * 1.35, 1.6), (ctr.x, ctr.y, 3.0), 35), (24, 140, 4.0, (1, 0.96, 0.9))),
    "aerial": (lambda: aim((ctr.x + L * 1.0, ctr.y + L * 0.9, L * 0.75), (ctr.x, ctr.y, 1.5), 45), (14, 110, 3.6, (1, 0.82, 0.62))),
    "interior": (lambda: aim((ctr.x + size.x * 0.12, ctr.y - size.y * 0.35, 1.6), (ctr.x - size.x * 0.4, ctr.y + size.y * 0.4, 2.4), 18), (30, 150, 3.0, (1, 0.95, 0.88))),
    "dusk": (lambda: aim((ctr.x + L * 0.55, ctr.y + L * 1.35, 1.6), (ctr.x, ctr.y, 3.0), 35), (2, 250, 0.4, (1, 0.6, 0.45))),
}
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "CPU"
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.view_settings.view_transform = "AgX"; sc.view_settings.exposure = -0.6
interior_glow = bpy.data.lights.new("glow", "POINT"); glow = bpy.data.objects.new("glow", interior_glow); sc.collection.objects.link(glow)
glow.location = (ctr.x, ctr.y, maxs.z * 0.55); interior_glow.color = (1, 0.8, 0.55); interior_glow.shadow_soft_size = 3; glow.visible_camera = False; glow.visible_glossy = False
for v in VIEWS:
    place, (elev, azim, strength, warm) = VIEW[v]
    place(); light(elev, azim, strength, warm); interior_glow.energy = 9000 if v == "dusk" else 0
    sc.render.filepath = os.path.join(OUT, f"{v}.png"); bpy.ops.render.render(write_still=True); print("wrote", sc.render.filepath)
