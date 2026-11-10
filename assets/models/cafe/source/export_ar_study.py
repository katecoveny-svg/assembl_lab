"""Export static café AR review files from the same optimised venue.
These are review candidates; do not replace the animated AR world's files without device validation.
blender -b --python export_ar_study.py -- output_dir
"""
import bpy,sys,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__))
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(out,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(here,'..','cafe-venue.glb'))
# The default daytime study excludes dinner-only and proposed second-station equipment.
def excluded(o):
 while o:
  if o.name in ('STATION_2','BAR','HOST_STAND','AWNING') or o.name.endswith('_CANDLE') or o.name.endswith('_SPECIAL') or o.name.startswith('RANGE_FLAME'):return True
  o=o.parent
 return False
for o in list(bpy.data.objects):
 if excluded(o):o.hide_render=True;o.hide_viewport=True
visible=[o for o in bpy.context.scene.objects if o.type=='MESH' and not excluded(o)]
bpy.context.view_layer.update()
points=[o.matrix_world@Vector(c) for o in visible for c in o.bound_box]
centre=Vector(((min(p.x for p in points)+max(p.x for p in points))/2,(min(p.y for p in points)+max(p.y for p in points))/2,min(p.z for p in points)))
roots=[o for o in bpy.context.scene.objects if not o.parent]
anchor=bpy.data.objects.new('AR_ground_anchor',None);bpy.context.scene.collection.objects.link(anchor)
for o in roots:o.parent=anchor
anchor.location=-centre
bpy.context.scene.unit_settings.system='METRIC'
for mode,scale in [('table',1/30),('full-size',1)]:
 anchor.scale=(scale,)*3;anchor.location=-centre*scale
 bpy.context.view_layer.update()
 bpy.ops.object.select_all(action='DESELECT')
 for o in visible:o.select_set(True)
 bpy.ops.wm.usd_export(filepath=os.path.join(out,f'cafe-{mode}-candidate.usdz'),selected_objects_only=True,export_animation=False,export_lights=False,export_cameras=False,convert_world_material=False,generate_preview_surface=True,export_textures_mode='NEW',relative_paths=True,convert_orientation=True,export_global_up_selection='Y',export_global_forward_selection='NEGATIVE_Z',usdz_downscale_size='1024')
 print('AR_CANDIDATE',mode,scale)
