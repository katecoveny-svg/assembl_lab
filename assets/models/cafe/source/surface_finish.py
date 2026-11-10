"""Portable PBR finish pass. ambientCG CC0; UV scale is in metres, not object size.

Wood041 is lime wood, used as a generic pale timber study, not verified oak.
Only roughness and normal maps are used for the fabric; colours remain authored.
"""
import bpy
import os


def refine(materials, collection, texture_dir):
    textured = {}
    for key, asset, colour, metres, strength in (
        ('terrazzo', 'Terrazzo019L', True, 1.2, .1),
        ('oak', 'Wood041', True, 3.0, .06),
        ('floor', 'Wood041', True, 3.0, .08),
        ('lilac', 'Fabric041', False, .45, .28),
        ('blush', 'Fabric041', False, .55, .22),
    ):
        mat = materials[key]
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bsdf = nodes.get('Principled BSDF')
        if colour:
            bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
        for channel in ('Color', 'Roughness', 'NormalGL'):
            if channel == 'Color' and not colour:
                continue
            image = bpy.data.images.load(os.path.join(texture_dir, f'{asset}_1K-JPG_{channel}.jpg'), check_existing=True)
            if channel != 'Color':
                image.colorspace_settings.name = 'Non-Color'
            image.pack()
            tex = nodes.new('ShaderNodeTexImage')
            tex.image = image
            tex.label = f'ambientCG {asset} · CC0'
            if channel == 'NormalGL':
                normal = nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = strength
                links.new(tex.outputs['Color'], normal.inputs['Color'])
                links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
            else:
                links.new(tex.outputs['Color'], bsdf.inputs['Base Color' if channel == 'Color' else 'Roughness'])
        textured[mat.name] = metres

    # Each linked mesh gets UVs once. Keep the live menu/roster's existing 0..1 UVs.
    done = set()
    for obj in collection.objects:
        if obj.type != 'MESH' or obj.data.name in done:
            continue
        mesh = obj.data
        done.add(mesh.name)
        if not any(m and m.name in textured for m in mesh.materials):
            continue
        uv = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
        for poly in mesh.polygons:
            mat = mesh.materials[poly.material_index]
            scale = textured.get(mat.name, 1)
            axis = max(range(3), key=lambda a: abs(poly.normal[a]))
            axes = ((1, 2), (0, 2), (0, 1))[axis]
            for li in poly.loop_indices:
                p = mesh.vertices[mesh.loops[li].vertex_index].co
                a, b = axes
                if axis != 2 and mat.name in (materials['oak'].name, materials['floor'].name):
                    a, b = b, a  # vertical members: grain follows their height
                uv.data[li].uv = (p[a] / scale, p[b] / scale)

    # Neutral, materially distinct finishes; retain state-specific material names.
    for key, colour, rough, metal in (
        ('lilac', (.20, .245, .19, 1), .9, 0),
        ('powder', (.06, .09, .085, 1), .25, .5),
        ('char', (.025, .023, .02, 1), .32, .55),
        ('steel', (.58, .61, .63, 1), .26, 1),
    ):
        bsdf = materials[key].node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = colour
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = metal


    glass = materials['glass'].node_tree.nodes.get('Principled BSDF')
    glass.inputs['Alpha'].default_value = 1
    glass.inputs['Transmission Weight'].default_value = 1
    glass.inputs['IOR'].default_value = 1.45
    glass.inputs['Roughness'].default_value = .06
