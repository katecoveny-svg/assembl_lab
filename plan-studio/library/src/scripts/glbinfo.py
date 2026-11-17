"""Read a GLB's JSON chunk: materials, extensions, bounds of the scene's POSITION accessors (rough), triangle count."""
import json, struct, sys

def glb_json(path):
    with open(path, 'rb') as f:
        magic, ver, length = struct.unpack('<4sII', f.read(12))
        if magic != b'glTF':
            raise ValueError(f'not a GLB: {path}')
        clen, ctype = struct.unpack('<I4s', f.read(8))
        return json.loads(f.read(clen)), ver, length

def summary(path):
    j, ver, length = glb_json(path)
    tris = 0
    for m in j.get('meshes', []):
        for p in m['primitives']:
            if 'indices' in p:
                tris += j['accessors'][p['indices']]['count'] // 3
            else:
                tris += j['accessors'][p['attributes']['POSITION']]['count'] // 3
    mats = [(m.get('name'), [round(x, 3) for x in m.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])]) for m in j.get('materials', [])]
    return {
        'version': ver, 'bytes': length, 'generator': j.get('asset', {}).get('generator'),
        'extensionsUsed': j.get('extensionsUsed', []), 'extensionsRequired': j.get('extensionsRequired', []),
        'meshes': len(j.get('meshes', [])), 'nodes': len(j.get('nodes', [])), 'materials': mats,
        'textures': len(j.get('textures', [])), 'images': len(j.get('images', [])), 'triangles_indexed': tris,
    }

if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(p); print(json.dumps(summary(p), indent=1, ensure_ascii=False))
