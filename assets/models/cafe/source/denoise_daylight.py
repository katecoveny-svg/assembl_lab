"""Denoise sky transport masters, encode linear RGBM, retain the original EXRs.
Run Blender --background --factory-startup --python denoise_daylight.py.
"""
import bpy, os, json
import numpy as np
from pathlib import Path
OUT=Path(os.environ['CAFE_DAYLIGHT_OUT']).resolve()
record=json.loads((OUT/'bake-record.json').read_text())
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=1
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='OPEN_EXR'
scene.render.image_settings.color_mode='RGB'; scene.render.image_settings.color_depth='32'
scene.render.image_settings.exr_codec='ZIP'
tree=bpy.data.node_groups.new('Sky transport denoise','CompositorNodeTree')
tree.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
scene.compositing_node_group=tree
src=tree.nodes.new('CompositorNodeImage'); den=tree.nodes.new('CompositorNodeDenoise')
den.inputs['HDR'].default_value=True
out=tree.nodes.new('NodeGroupOutput'); tree.links.new(src.outputs['Image'],den.inputs['Image']); tree.links.new(den.outputs['Image'],out.inputs['Image'])
for spec in record['maps']:
    name=spec['name']; width,height=spec['size']
    src.image=bpy.data.images.load(str(OUT/(name+'.exr')))
    scene.render.resolution_x=width; scene.render.resolution_y=height
    scene.render.filepath=str(OUT/(name+'-denoised.exr'))
    bpy.ops.render.render(write_still=True)
    image=bpy.data.images.load(scene.render.filepath,check_existing=False)
    rgb=np.maximum(np.array(image.pixels[:],dtype=np.float32).reshape(height,width,4)[:,:,:3],0)
    assert np.isfinite(rgb).all() and rgb.max()<=4
    mult=np.ceil(rgb.max(axis=2,keepdims=True)/4*255).clip(1,255)
    divisor=mult/255*4
    colour=np.rint(rgb/divisor*255).clip(0,255)
    rgba=np.concatenate([colour,mult],axis=2).astype(np.uint8)
    error=np.abs(colour/255*divisor-rgb); assert (error<=divisor/510+1e-7).all()
    (OUT/(name+'.rgba')).write_bytes(np.flipud(rgba).tobytes())
    spec['processing']='OpenImageDenoise HDR, image-only; raw EXR retained'
    spec['max_quantisation_error']=float(error.max())
record['processed']=True
(OUT/'bake-record.json').write_text(json.dumps(record,indent=2)+'\n')
print('CAFE_DAYLIGHT_DENOISED',flush=True)
