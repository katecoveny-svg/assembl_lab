"""Sky-only diffuse transport for the existing café, not a fixed sunny photograph.

Blender --background --python bake_daylight.py
CAFE_DAYLIGHT_OUT sets the evidence directory. The existing master/GLB are read-only.
Receivers do not cast or receive secondary rays. Runtime uses the same plan coordinates.
"""
import bpy, os, json, hashlib, math
import numpy as np
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
OUT = Path(os.environ['CAFE_DAYLIGHT_OUT']).resolve()
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = HERE / 'cafe.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = int(os.environ.get('CAFE_BAKE_SAMPLES', '128'))
scene.cycles.max_bounces = 10
scene.cycles.diffuse_bounces = 6
scene.cycles.use_denoising = True
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'; prefs.get_devices()
for d in prefs.devices: d.use = d.type == 'METAL'
scene.cycles.device = 'GPU'
P = lambda p: (p[0], -p[2], p[1])

# Bake only fixed architecture/equipment. Moving stock, door and optional kit
# cannot leave permanent shadows after the simulation changes their state.
dynamic = ('CAB_SCONE_', 'CAB_TOASTIE_', 'CAB_SALAD_', 'CAB_BROWNIE_',
           'CAB_MUFFIN_', 'ESPRESSO_SECOND', 'HOST_STAND', 'AWNING',
           'awning_arm', 'TABLE_', 'DOOR_LEAF', 'QUEUE_SPOT_', 'ESPRESSO_MAIN_CUP_STACK')
for obj in scene.objects:
    ancestors = [obj]
    while ancestors[-1].parent: ancestors.append(ancestors[-1].parent)
    if obj.type == 'LIGHT' or any(o.name.startswith(dynamic) or o.name == 'BAR' for o in ancestors):
        obj.hide_render = True
    if obj.type == 'MESH':
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes: continue
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if not bsdf: continue
            bsdf.inputs['Emission Strength'].default_value = 0
            if bsdf.inputs['Transmission Weight'].default_value > .5:
                obj.visible_shadow = False

def plane(name, origin, u, v, material):
    verts = [origin, [origin[i]+u[i] for i in range(3)],
             [origin[i]+u[i]+v[i] for i in range(3)], [origin[i]+v[i] for i in range(3)]]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([P(p) for p in verts], [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new(name='daylight')
    for i, p in enumerate([(0,0),(1,0),(1,1),(0,1)]): uv.data[i].uv = p
    obj = bpy.data.objects.new(name, mesh); scene.collection.objects.link(obj)
    mesh.materials.append(material)
    return obj

# Provisional lid at the existing 3.1 m wall head, not a new measured plan claim.
ceilingmat = bpy.data.materials.new('Ceiling warm mineral paint'); ceilingmat.use_nodes = True
bsdf = ceilingmat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (.78,.76,.71,1); bsdf.inputs['Roughness'].default_value = .88
ceiling = plane('CAFE_CEILING', [-9,3.25,-6], [18,0,0], [0,0,12], ceilingmat)
infill=plane('FLOOR_COUNTER_THRESHOLD', [1.4,.163,2.1], [7.6,0,0], [0,0,-1.5], bpy.data.materials['cafe_floor_honey'])
for loop in infill.data.loops:
    p=infill.data.vertices[loop.vertex_index].co
    infill.data.uv_layers.active.data[loop.index].uv=(p.x/3,p.y/3)
world = bpy.data.worlds.new('Uniform diffuse sky, no sun'); world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.92,.965,1,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
scene.world = world

specs = [
    ('floor', [-8.89,.167,5.89], [17.78,0,0], [0,0,-11.78], [1024,1024]),
    ('ceiling', [-8.89,3.248,-5.89], [17.78,0,0], [0,0,11.78], [1024,1024]),
    ('right', [8.899,.16,-5.89], [0,0,11.78], [0,3.08,0], [1024,256]),
    ('left', [-8.899,.16,5.89], [0,0,-11.78], [0,3.08,0], [1024,256]),
    ('back', [-.5,.16,-5.877], [9.39,0,0], [0,3.08,0], [1024,256]),
    ('counter-front', [1.55,.25,1.622], [6.9,0,0], [0,.94,0], [1024,256]),
    ('counter-top', [1.45,1.207,1.625], [7.1,0,0], [0,0,-.95], [1024,256]),
]
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = False
scene.render.bake.use_selected_to_active = False
scene.render.bake.margin = 0
records=[]
for name, origin, u, v, size in specs:
    mat = bpy.data.materials.new('receiver-'+name); mat.use_nodes=True
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
    obj=plane('receiver-'+name, origin, u, v, mat)
    for flag in ['visible_shadow','visible_diffuse','visible_glossy','visible_transmission']:
        setattr(obj,flag,False)
    im=bpy.data.images.new(name+' diffuse transport',width=size[0],height=size[1],float_buffer=True)
    im.colorspace_settings.name='Linear Rec.709'
    node=mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image=im; mat.node_tree.nodes.active=node
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    bpy.ops.object.bake(type='DIFFUSE')
    im.filepath_raw=str(OUT/(name+'.exr')); im.file_format='OPEN_EXR'; im.save()
    rgb=np.array(im.pixels[:],dtype=np.float32).reshape(size[1],size[0],4)[:,:,:3]
    assert np.isfinite(rgb).all() and rgb.max() <= 4, (name,float(rgb.max()))
    rgb=np.maximum(rgb,0)
    m=np.ceil(rgb.max(axis=2,keepdims=True)/4*255).clip(1,255)
    div=m/255*4
    colour=np.rint(rgb/div*255).clip(0,255)
    rgba=np.concatenate([colour,m],axis=2).astype(np.uint8)
    (OUT/(name+'.rgba')).write_bytes(np.flipud(rgba).tobytes())
    error=np.abs(colour/255*div-rgb)
    assert (error <= div/510+1e-7).all()
    records.append({'name':name,'origin':origin,'u':u,'v':v,'size':size,
                    'min':float(rgb.min()),'max':float(rgb.max()),'mean':float(rgb.mean()),
                    'max_quantisation_error':float(error.max())})
    obj.hide_render=True; obj.hide_viewport=True
    print('BAKED',name,flush=True)

# Packed, editable proof with the exact receiving positions and a named camera.
camdata=bpy.data.cameras.new('Inside café'); cam=bpy.data.objects.new('Inside café',camdata)
scene.collection.objects.link(cam); scene.camera=cam
cam.location=P((8.4,1.8,5.3)); cam.rotation_euler=(Vector(P((4.4,1.25,.9)))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.lens=28
scene.view_settings.view_transform='AgX'
scene.render.resolution_x=1280; scene.render.resolution_y=800; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(OUT/'sky-only-cycles.png')
for im in bpy.data.images:
    if im.source=='FILE': im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cafe-daylight.blend'),compress=True)
bpy.ops.render.render(write_still=True)
(OUT/'bake-record.json').write_text(json.dumps({'encoding':'RGBM','range':4,'maps':records,
    'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'source_glb_sha256':hashlib.sha256((HERE.parent/'cafe-venue.glb').read_bytes()).hexdigest(),
    'samples':scene.cycles.samples,'ceiling_height':3.25,
    'limitation':'Uniform sky transport for fixed shell. No direct sun, practical lamps or dynamic furniture/stock shadows are baked. Not a measured lighting calculation.'},indent=2)+'\n')
