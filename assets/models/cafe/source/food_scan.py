"""Place the licensed muffin scan without changing the cabinet rig or its stock rules."""
import bpy
from mathutils import Vector


def load_muffin(path, width=.10, pivot_height=.0225):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in imported if o.type == 'MESH']
    if len(meshes) != 1:
        raise ValueError('Muffin source must contain one mesh, with its original UVs.')
    obj = meshes[0]
    mesh = obj.data.copy()
    mesh.transform(obj.matrix_world)
    lo = Vector(tuple(min(v.co[a] for v in mesh.vertices) for a in range(3)))
    hi = Vector(tuple(max(v.co[a] for v in mesh.vertices) for a in range(3)))
    scale = width / max(hi.x-lo.x, hi.y-lo.y)
    centre = (lo+hi)/2
    for v in mesh.vertices:
        v.co.x = (v.co.x-centre.x)*scale
        v.co.y = (v.co.y-centre.y)*scale
        # Keep the legacy pivot: the lowest point rests on the shelf, not below it.
        v.co.z = (v.co.z-lo.z)*scale-pivot_height
    mesh.name = 'portion_muffin_ambientcg_3DCake001'
    for material in mesh.materials:
        material.name = 'cafe_muffin_scan_ambientcg'
        material['source'] = 'https://ambientcg.com/view?id=3DCake001'
        material['licence'] = 'CC0-1.0'
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                node.image.pack()
    for o in imported:
        bpy.data.objects.remove(o, do_unlink=True)
    return mesh
