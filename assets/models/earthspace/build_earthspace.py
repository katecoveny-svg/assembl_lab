"""Blender build for the Earth & Space machine (study/m/earthspace.html).
Makes the Earth (with clouds, an axis and a pin on Aotearoa), the Moon, the Sun and six star types, exports
earthspace.glb, and renders a Cycles hero image. Textures come from make_textures.py.
Usage: python build_earthspace.py <texdir> <outdir>   (bpy 5.x as a Python module)
Coordinates: Blender Z-up; the glTF exporter writes Y-up, so the Earth's spin axis is +Y in three.js.
Equirectangular UVs are set from each vertex's longitude/latitude (lon = atan2(y, x)), and the NZ pin uses the
same formula, so the pin always sits on New Zealand."""
import math, sys, bpy, bmesh
from mathutils import Vector

tex, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def img(name, cs='sRGB'):
    i = bpy.data.images.load(f'{tex}/{name}'); i.colorspace_settings.name = cs; return i

def sphere(name, r, seg=128, rings=64):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm.loops.layers.uv.new("UVMap")
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r, calc_uvs=True)
    uv = bm.loops.layers.uv.active
    for f in bm.faces:
        us = []
        for l in f.loops:
            p = l.vert.co.normalized(); lon = math.atan2(p.y, p.x); lat = math.asin(max(-1, min(1, p.z)))
            us.append([(lon + math.pi) / (2 * math.pi), (lat + math.pi / 2) / math.pi, abs(p.z) > .9999])
        real = [u for u in us if not u[2]]
        if max(u[0] for u in real) - min(u[0] for u in real) > .5:
            for u in us:
                if u[0] < .5: u[0] += 1
        cu = sum(u[0] for u in real) / len(real)
        for l, u in zip(f.loops, us): l[uv].uv = (cu if u[2] else u[0], u[1])
    for f in bm.faces: f.smooth = True
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob

def empty(name, parent=None):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.parent = parent; return e

def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; return m, m.node_tree.nodes, m.node_tree.links

# ---------------- Earth
system = empty('EARTH_SYSTEM'); tilt = empty('EARTH_TILT', system); spin = empty('EARTH_SPIN', tilt)
earth = sphere('EARTH', 1.0); earth.parent = spin
m, n, l = mat('Earth'); b = n['Principled BSDF']
t = n.new('ShaderNodeTexImage'); t.image = img('earth.jpg'); l.new(t.outputs['Color'], b.inputs['Base Color'])
r = n.new('ShaderNodeTexImage'); r.image = img('earth-rough.jpg', 'Non-Color'); sp = n.new('ShaderNodeSeparateColor')
l.new(r.outputs['Color'], sp.inputs['Color']); l.new(sp.outputs['Green'], b.inputs['Roughness']); l.new(sp.outputs['Blue'], b.inputs['Metallic'])
b.inputs['Specular IOR Level'].default_value = .5
earth.data.materials.append(m)

clouds = sphere('CLOUDS', 1.012, 96, 48); clouds.parent = spin
m, n, l = mat('Clouds'); b = n['Principled BSDF']
t = n.new('ShaderNodeTexImage'); t.image = img('clouds.png'); l.new(t.outputs['Color'], b.inputs['Base Color']); l.new(t.outputs['Alpha'], b.inputs['Alpha'])
b.inputs['Roughness'].default_value = .9
m.surface_render_method = 'BLENDED' if hasattr(m, 'surface_render_method') else None
clouds.data.materials.append(m)

# the pin on Aotearoa (Wellington, 41.3° S, 174.8° E) and a little marker ring
LAT, LON = math.radians(-41.3), math.radians(174.8)
dirv = Vector((math.cos(LAT) * math.cos(LON), math.cos(LAT) * math.sin(LON), math.sin(LAT)))
pin = empty('NZ_PIN', spin); pin.location = dirv * 1.0
bpy.ops.mesh.primitive_uv_sphere_add(radius=.028, location=dirv * 1.07); head = bpy.context.object; head.name = 'NZ_PIN_HEAD'; head.parent = spin
bpy.ops.mesh.primitive_cylinder_add(radius=.006, depth=.07, location=dirv * 1.035); stalk = bpy.context.object; stalk.name = 'NZ_PIN_STALK'; stalk.parent = spin
stalk.rotation_mode = 'QUATERNION'; stalk.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(dirv)
m, n, l = mat('Pin'); b = n['Principled BSDF']; b.inputs['Base Color'].default_value = (.91, .38, .42, 1); b.inputs['Emission Color'].default_value = (.91, .38, .42, 1); b.inputs['Emission Strength'].default_value = 1.5
head.data.materials.append(m); stalk.data.materials.append(m)

# the axis: a thin rod through the poles
bpy.ops.mesh.primitive_cylinder_add(radius=.012, depth=2.9, vertices=16); axis = bpy.context.object; axis.name = 'AXIS'; axis.parent = tilt
m, n, l = mat('Axis'); b = n['Principled BSDF']; b.inputs['Base Color'].default_value = (.96, .93, .9, 1); b.inputs['Roughness'].default_value = .3; axis.data.materials.append(m)

# ---------------- Moon (radius 0.273 × Earth's, as in real life)
moon = sphere('MOON', .273, 96, 48)
m, n, l = mat('Moon'); b = n['Principled BSDF']
t = n.new('ShaderNodeTexImage'); t.image = img('moon.jpg'); l.new(t.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = .95
moon.data.materials.append(m)

# ---------------- Sun
sun = sphere('SUN', 1.0, 96, 48)
m, n, l = mat('Sun'); b = n['Principled BSDF']
t = n.new('ShaderNodeTexImage'); t.image = img('sun.jpg'); l.new(t.outputs['Color'], b.inputs['Emission Color']); l.new(t.outputs['Color'], b.inputs['Base Color'])
b.inputs['Emission Strength'].default_value = 4.0
sun.data.materials.append(m)

# ---------------- six star types (colour from surface temperature); three.js sizes and places them
STARS = [('STAR_RED_DWARF', (1., .45, .25)), ('STAR_SUN', (1., .82, .45)), ('STAR_BLUE_GIANT', (.55, .7, 1.)),
         ('STAR_RED_GIANT', (1., .5, .3)), ('STAR_SUPERGIANT', (1., .38, .2)), ('STAR_WHITE_DWARF', (.9, .94, 1.))]
for i, (name, c) in enumerate(STARS):
    s = sphere(name, 1.0, 48, 24); s.location = (i * 3 - 7.5, 0, -40)
    m, n, l = mat(name.title()); b = n['Principled BSDF']; b.inputs['Base Color'].default_value = (*c, 1)
    b.inputs['Emission Color'].default_value = (*c, 1); b.inputs['Emission Strength'].default_value = 3.0
    s.data.materials.append(m)

bpy.ops.export_scene.gltf(filepath=f'{out}/earthspace.glb', export_format='GLB', export_apply=True, export_yup=True,
                          export_image_format='AUTO', export_jpeg_quality=86, export_cameras=False, export_lights=False)

# ---------------- hero render: Earth with Aotearoa in view, the Moon close by, the Sun behind
for o in bpy.data.objects:
    if o.name.startswith('STAR_'): o.hide_render = True
import os
PREVIEW = os.environ.get('PREVIEW') == '1'
CAM = Vector((5.4, -5.0, -2.6))
cam_lon = math.degrees(math.atan2(CAM.y, CAM.x))
spin.rotation_euler = (0, 0, math.radians(cam_lon - 174.8 + 36))   # Aotearoa turned towards the camera
axis.hide_render = True
head.visible_shadow = False; stalk.visible_shadow = False
moon.location = (-.27, -1.83, .2)
sun.location = (56, 21, 8); sun.scale = (3, 3, 3); sun.visible_shadow = False
# atmosphere: a thin glowing rim
atm = sphere('ATMOS', 1.035, 96, 48); atm.parent = spin
m, n, l = mat('Atmos'); n.remove(n['Principled BSDF']); o = n['Material Output']
lw = n.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = .2
em = n.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (.35, .6, 1., 1); tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader')
pw = n.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 5
l.new(lw.outputs['Facing'], pw.inputs[0]); l.new(pw.outputs[0], mx.inputs['Fac']); l.new(tr.outputs[0], mx.inputs[1]); l.new(em.outputs[0], mx.inputs[2]); l.new(mx.outputs[0], o.inputs['Surface'])
em.inputs['Strength'].default_value = 3; atm.data.materials.append(m)
lamp = bpy.data.lights.new('SunLight', 'SUN'); lamp.energy = 4.5; lamp.angle = math.radians(.6); lo = bpy.data.objects.new('SunLight', lamp); sc.collection.objects.link(lo)
lo.rotation_euler = sun.location.to_track_quat('Z', 'Y').to_euler()  # a Sun lamp shines down its -Z
cam = bpy.data.cameras.new('Cam'); cam.lens = 50; co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = CAM; co.rotation_euler = (Vector((-.35, -.35, -.25)) - co.location).to_track_quat('-Z', 'Y').to_euler()
w = bpy.data.worlds.new('Space'); sc.world = w; w.use_nodes = True; wn = w.node_tree.nodes; wl = w.node_tree.links; bg = wn['Background']
nz = wn.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1500; nz.inputs['Detail'].default_value = 0
ramp = wn.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .79; ramp.color_ramp.elements[0].color = (.002, .003, .008, 1); ramp.color_ramp.elements[1].position = .80; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
wl.new(nz.outputs['Fac'], ramp.inputs['Fac']); wl.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = .6
sc.render.engine = 'CYCLES'; sc.cycles.samples = 16 if PREVIEW else 128; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
sc.render.resolution_x, sc.render.resolution_y = (640, 400) if PREVIEW else (1600, 1000); sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.filepath = f'{out}/earthspace-hero.png'; bpy.ops.render.render(write_still=True)
print('built', out)
