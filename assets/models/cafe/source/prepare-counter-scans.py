"""Import unchanged ambientCG OBJ masters, explicitly retaining their PBR channels.

Blender --background --python prepare-counter-scans.py -- SOURCE_DIRECTORY OUTPUT_DIRECTORY
The downloaded archives are never modified. Coordinates are OBJ Y-up -> Blender Z-up.
"""
import bpy, sys, os, json
from pathlib import Path

source, output = map(Path, sys.argv[sys.argv.index('--')+1:])
output.mkdir(parents=True, exist_ok=True)
for asset in ('3DCookie001', '3DPastry001'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    directory=source/asset
    bpy.ops.wm.obj_import(filepath=str(directory/f'{asset}_HQ-2K-JPG.obj'), forward_axis='NEGATIVE_Z', up_axis='Y')
    obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    material=bpy.data.materials.new(f'cafe_{asset}_scan_ambientcg'); material.use_nodes=True
    nodes, links=material.node_tree.nodes,material.node_tree.links
    bsdf=nodes.get('Principled BSDF'); bsdf.inputs['Roughness'].default_value=.68
    for channel in ('Color','NormalGL','AmbientOcclusion'):
        image=bpy.data.images.load(str(directory/f'{asset}_HQ-2K-JPG_{channel}.jpg'))
        if channel!='Color': image.colorspace_settings.name='Non-Color'
        image.pack()
        tex=nodes.new('ShaderNodeTexImage'); tex.image=image
        if channel=='Color': links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
        elif channel=='NormalGL':
            normal=nodes.new('ShaderNodeNormalMap')
            links.new(tex.outputs['Color'],normal.inputs['Color']); links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
        else:
            group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
            group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
            node=nodes.new('ShaderNodeGroup');node.node_tree=group
            links.new(tex.outputs['Color'],node.inputs['Occlusion'])
    material['source']=f'https://ambientcg.com/view?id={asset}';material['licence']='CC0-1.0'
    obj.data.materials.clear();obj.data.materials.append(material)
    for p in obj.data.polygons: p.use_smooth=True
    obj['source']=material['source'];obj['licence']='CC0-1.0'
    obj.data.calc_loop_triangles()
    print('SOURCE',asset,len(obj.data.loop_triangles),list(obj.dimensions))
    bpy.ops.wm.save_as_mainfile(filepath=str(output/f'{asset}-original.blend'),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(output/f'{asset}-original.glb'),export_format='GLB',export_extras=True,export_image_format='AUTO')
