"""Repeatable neutral source comparison and reopened café counter review (Blender 5.1)."""
import bpy, os, math, sys
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent
OUT=Path(os.environ['CAFE_COUNTER_REVIEW']).resolve();OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(HERE))
from counter_detail import scan_mesh

def setup(eye,target,lens=50,size=(1280,800)):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='METAL'
    scene.cycles.device='GPU';scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=6
    scene.render.resolution_x,scene.render.resolution_y=size;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Neutral studio light');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.75,.78,.82,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.35;scene.world=world
    bpy.ops.object.camera_add(location=eye);camera=bpy.context.object;camera.name='Counter review camera'
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=lens;camera.data.clip_start=.005;scene.camera=camera
    return scene

def area(name,eye,target,power,size):
    bpy.ops.object.light_add(type='AREA',location=eye);light=bpy.context.object;light.name=name
    light.data.energy=power;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(Vector(target)-light.location).to_track_quat('-Z','Y').to_euler()

def render(scene,name):
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True);print('COUNTER_REOPEN_RENDER_OK',name,flush=True)

# Separate neutral comparisons: left unchanged-geometry 2K master, right browser derivative.
for asset,width in [('cookie',.062),('croissant',.18)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for i,variant in enumerate(['master','browser']):
        mesh=scan_mesh(str(HERE/f'{asset}-{variant}.glb'),width,asset+variant)
        obj=bpy.data.objects.new(variant,mesh);bpy.context.scene.collection.objects.link(obj);obj.location.x=(i-.5)*width*1.4
    scene=setup((width*1.4,-width*3,width*2.5),(0,0,width*.15),55,(1400,650))
    area('Large softbox',(-width,-width,width*3),(0,0,0),width*width*130,width*2)
    render(scene,asset+'-master-left-browser-right')

bpy.ops.wm.open_mainfile(filepath=str(HERE/'cafe.blend'))
P=lambda p:(p[0],-p[2],p[1])
scene=setup(P((4.6,1.95,-.4)),P((3.1,1.45,1.12)),43)
for obj in scene.objects:
    ancestors=[obj]
    while ancestors[-1].parent:ancestors.append(ancestors[-1].parent)
    if any(o.name.startswith(('STATION_2','HOST_STAND','AWNING','awning_arm')) or o.name=='BAR' for o in ancestors):obj.hide_render=True
area('Counter window',P((2.5,3.1,4.8)),P((3.1,1.3,1.12)),450,4)
area('Barista fill',P((4,2.8,-1)),P((3.3,1.5,1.15)),65,2)
render(scene,'counter-cycles')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cafe-counter-review.blend'),compress=True)
