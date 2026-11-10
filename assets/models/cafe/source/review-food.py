"""Blender review: compare the original-geometry master with the browser candidate.
blender -b -t 2 --python assets/models/cafe/source/review-food.py
"""
import bpy, os
from mathutils import Vector

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(os.path.dirname(HERE),'renders')
os.makedirs(OUT,exist_ok=True)
for variant in ('master','browser'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE,f'muffin-{variant}.glb'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    lo=Vector(tuple(min(p[a] for p in points) for a in range(3)))
    hi=Vector(tuple(max(p[a] for p in points) for a in range(3)))
    centre=(lo+hi)/2; span=max(hi-lo)
    scene=bpy.context.scene
    world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.2,.2,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.world=world
    bpy.ops.object.light_add(type='AREA',location=centre+Vector((-span,-span,span*2)))
    lamp=bpy.context.object;lamp.data.energy=span*span*75;lamp.data.size=span
    lamp.rotation_euler=(centre-lamp.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=centre+Vector((span,-span*1.5,span*.8)))
    cam=bpy.context.object;cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=span*1.3;cam.data.clip_start=.001;scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=800;scene.render.resolution_y=650;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
    scene.render.filepath=os.path.join(OUT,f'muffin-{variant}-review.png')
    bpy.ops.render.render(write_still=True)
    print('FOOD_REOPEN_RENDER_OK',variant,list(lo),list(hi))
