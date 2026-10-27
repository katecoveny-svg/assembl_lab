"""Copy assembl's five Blender cars into ar/models and write a 1:18 table-model copy of each.

The source GLBs (dealer-twin/assets/cars) are real size in metres, quantised with KHR_mesh_quantization and scaled
by their single root node. The table copies only change that node's scale, so they stay byte-for-byte the same mesh.
They exist for Android Scene Viewer, which needs a real https file at the size it should appear; the studio and the
viewer build the table model in the browser instead.

Usage: python3 ar/tools/build_models.py /home/claude/dealer-twin/assets/cars
"""
import json, pathlib, shutil, struct, sys

OUT = pathlib.Path(__file__).resolve().parent.parent / 'models'
TABLE = 1 / 18


def rescale(src, dst, factor):
    b = src.read_bytes()
    magic, ver, _ = struct.unpack('<4sII', b[:12])
    assert magic == b'glTF' and ver == 2
    jlen, jtype = struct.unpack('<I4s', b[12:20])
    assert jtype == b'JSON'
    j = json.loads(b[20:20 + jlen])
    rest = b[20 + jlen:]
    for i in j['scenes'][j.get('scene', 0)]['nodes']:
        n = j['nodes'][i]
        n['scale'] = [v * factor for v in n.get('scale', [1, 1, 1])]
        if 'translation' in n:
            n['translation'] = [v * factor for v in n['translation']]
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    body = struct.pack('<I4s', len(js), b'JSON') + js + rest
    dst.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + len(body)) + body)


if __name__ == '__main__':
    src = pathlib.Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for t in ['hatch', 'sedan', 'suv', 'ute', 'van']:
        f = src / f'car_{t}.glb'
        shutil.copyfile(f, OUT / f'car_{t}.glb')
        rescale(f, OUT / f'car_{t}_table.glb', TABLE)
        print(t, (OUT / f'car_{t}.glb').stat().st_size, (OUT / f'car_{t}_table.glb').stat().st_size)
