"""GLB to USDZ for AR Quick Look, with Pixar's OpenUSD (pip install usd-core).

  python3 ar/tools/glb2usdz.py in.glb out.usdz [--anchor horizontal|vertical]

Writes a binary crate (.usdc) root layer, about four times smaller than three.js's text USDZ, and keeps:
  - the node tree, with each node's transform
  - meshes as triangles with normals and texture coordinates (subdivision off, so Quick Look draws them as authored)
  - UsdPreviewSurface materials: base colour (factor and texture), metallic, roughness, opacity, emissive; glTF's
    KHR_texture_transform is baked into the coordinates; vertex colours are not read (split them into materials first)
  - glTF animation on translation, rotation and scale, as USD transform time samples (Quick Look plays these on a loop)
  - AR Quick Look's plane anchoring (horizontal or vertical)
Packed with UsdUtils.CreateNewARKitUsdzPackage (stored, 64-byte aligned). Check it with ar/tools/usd_check.py.
"""
import hashlib, json, os, struct, sys, shutil, tempfile
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, Vt, UsdUtils

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<4sII', b[:12])
    assert magic == b'glTF' and ver == 2, 'not a glTF 2 binary'
    jl, _ = struct.unpack('<I4s', b[12:20])
    j = json.loads(b[20:20 + jl])
    off = 20 + jl
    binc = b''
    if off < len(b):
        bl, _ = struct.unpack('<I4s', b[off:off + 8])
        binc = b[off + 8:off + 8 + bl]
    return j, binc


def accessor(j, binc, i):
    a = j['accessors'][i]
    n, k = a['count'], NCOMP[a['type']]
    dt = COMP[a['componentType']]
    if 'bufferView' not in a:
        return np.zeros((n, k), dt)
    bv = j['bufferViews'][a['bufferView']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    item = np.dtype(dt).itemsize * k
    stride = bv.get('byteStride', item)
    if stride == item:
        arr = np.frombuffer(binc, dt, n * k, start).reshape(n, k)
    else:
        raw = np.frombuffer(binc, np.uint8, stride * (n - 1) + item, start)
        arr = np.stack([np.frombuffer(raw[r * stride:r * stride + item].tobytes(), dt) for r in range(n)])
    if a.get('normalized'):
        info = np.iinfo(dt)
        arr = np.maximum(arr.astype(np.float32) / info.max, -1.0)
    return arr


def safe(name, used):
    s = ''.join(c if c.isalnum() or c == '_' else '_' for c in (name or 'node'))
    if not s or s[0].isdigit():
        s = 'n_' + s
    base, k = s, 1
    while s in used:
        k += 1
        s = f'{base}_{k}'
    used.add(s)
    return s


def uv_transform(uv, ext):
    # glTF KHR_texture_transform: uv' = T * R * S * uv
    if not ext:
        return uv
    off = ext.get('offset', [0, 0]); rot = ext.get('rotation', 0.0); sc = ext.get('scale', [1, 1])
    u = uv[:, 0] * sc[0]; v = uv[:, 1] * sc[1]
    c, s = np.cos(rot), np.sin(rot)
    u2 = c * u + s * v; v2 = -s * u + c * v
    return np.stack([u2 + off[0], v2 + off[1]], 1)


def convert(glb, usdz, anchor='horizontal'):
    j, binc = read_glb(glb)
    tmp = tempfile.mkdtemp(prefix='glb2usdz-')
    try:
        root_file = os.path.join(tmp, os.path.splitext(os.path.basename(usdz))[0] + '.usdc')
        stage = Usd.Stage.CreateNew(root_file)
        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        UsdGeom.SetStageMetersPerUnit(stage, 1.0)
        root = UsdGeom.Xform.Define(stage, '/Root')
        stage.SetDefaultPrim(root.GetPrim())
        Usd.ModelAPI(root.GetPrim()).SetKind('component')
        rp = root.GetPrim()
        rp.AddAppliedSchema('Preliminary_AnchoringAPI')
        rp.CreateAttribute('preliminary:anchoring:type', Sdf.ValueTypeNames.Token, variability=Sdf.VariabilityUniform).Set('plane')
        rp.CreateAttribute('preliminary:planeAnchoring:alignment', Sdf.ValueTypeNames.Token, variability=Sdf.VariabilityUniform).Set(anchor)

        # textures
        os.makedirs(os.path.join(tmp, 'textures'), exist_ok=True)
        tex_files, seen = {}, {}
        for i, img in enumerate(j.get('images', [])):
            if 'bufferView' not in img:
                continue
            bv = j['bufferViews'][img['bufferView']]
            data = binc[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            h = hashlib.sha1(data).hexdigest()
            if h in seen:   # the same picture used by several materials goes in once
                tex_files[i] = seen[h]; continue
            ext = 'jpg' if img.get('mimeType') == 'image/jpeg' else 'png'
            rel = f'textures/tex_{i}.{ext}'
            open(os.path.join(tmp, rel), 'wb').write(data)
            tex_files[i] = seen[h] = rel

        # materials
        UsdGeom.Scope.Define(stage, '/Root/Materials')
        mats, mat_info = [], []
        used = set()
        for i, m in enumerate(j.get('materials', [])):
            nm = safe(m.get('name') or f'material_{i}', used)
            path = f'/Root/Materials/{nm}'
            mat = UsdShade.Material.Define(stage, path)
            sh = UsdShade.Shader.Define(stage, path + '/Surface')
            sh.CreateIdAttr('UsdPreviewSurface')
            pbr = m.get('pbrMetallicRoughness', {})
            bc = pbr.get('baseColorFactor', [1, 1, 1, 1])
            sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(float(pbr.get('metallicFactor', 1.0)))
            sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(float(pbr.get('roughnessFactor', 1.0)))
            sh.CreateInput('useSpecularWorkflow', Sdf.ValueTypeNames.Int).Set(0)
            em = m.get('emissiveFactor', [0, 0, 0])
            strength = m.get('extensions', {}).get('KHR_materials_emissive_strength', {}).get('emissiveStrength', 1.0)
            em = [min(1.0, float(c) * strength) for c in em]
            if any(em):
                sh.CreateInput('emissiveColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*em))
            alpha_mode = m.get('alphaMode', 'OPAQUE')
            tinfo = pbr.get('baseColorTexture')
            tex_ext = None
            if tinfo is not None and j['textures'][tinfo['index']].get('source') in tex_files:
                tex_ext = tinfo.get('extensions', {}).get('KHR_texture_transform')
                rd = UsdShade.Shader.Define(stage, path + '/st')
                rd.CreateIdAttr('UsdPrimvarReader_float2')
                rd.CreateInput('varname', Sdf.ValueTypeNames.String).Set('st')
                rd.CreateOutput('result', Sdf.ValueTypeNames.Float2)
                tx = UsdShade.Shader.Define(stage, path + '/baseColor')
                tx.CreateIdAttr('UsdUVTexture')
                tx.CreateInput('file', Sdf.ValueTypeNames.Asset).Set(Sdf.AssetPath('./' + tex_files[j['textures'][tinfo['index']]['source']]))
                tx.CreateInput('st', Sdf.ValueTypeNames.Float2).ConnectToSource(rd.ConnectableAPI(), 'result')
                smp = j.get('samplers', [{}])[j['textures'][tinfo['index']].get('sampler', 0)] if j.get('samplers') else {}
                wrap = {33071: 'clamp', 33648: 'mirror', 10497: 'repeat'}
                tx.CreateInput('wrapS', Sdf.ValueTypeNames.Token).Set(wrap.get(smp.get('wrapS', 10497), 'repeat'))
                tx.CreateInput('wrapT', Sdf.ValueTypeNames.Token).Set(wrap.get(smp.get('wrapT', 10497), 'repeat'))
                tx.CreateInput('sourceColorSpace', Sdf.ValueTypeNames.Token).Set('sRGB')
                if any(abs(c - 1) > 1e-4 for c in bc[:3]):
                    tx.CreateInput('scale', Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(bc[0], bc[1], bc[2], 1.0))
                tx.CreateOutput('rgb', Sdf.ValueTypeNames.Float3)
                sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).ConnectToSource(tx.ConnectableAPI(), 'rgb')
                if alpha_mode != 'OPAQUE':
                    tx.CreateOutput('a', Sdf.ValueTypeNames.Float)
                    sh.CreateInput('opacity', Sdf.ValueTypeNames.Float).ConnectToSource(tx.ConnectableAPI(), 'a')
            else:
                sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*[float(c) for c in bc[:3]]))
                if alpha_mode != 'OPAQUE':
                    sh.CreateInput('opacity', Sdf.ValueTypeNames.Float).Set(float(bc[3]))
            if alpha_mode == 'MASK':
                sh.CreateInput('opacityThreshold', Sdf.ValueTypeNames.Float).Set(float(m.get('alphaCutoff', 0.5)))
            mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface')
            mats.append(mat)
            mat_info.append({'double': bool(m.get('doubleSided')), 'tex_ext': tex_ext})
        default_mat = None

        # animation: node index -> {path: (times, values)}
        anim = {}
        tmax = 0.0
        for a in j.get('animations', [])[:1]:
            for ch in a['channels']:
                s = a['samplers'][ch['sampler']]
                t = accessor(j, binc, s['input'])[:, 0].astype(np.float64)
                v = accessor(j, binc, s['output']).astype(np.float64)
                anim.setdefault(ch['target']['node'], {})[ch['target']['path']] = (t, v)
                tmax = max(tmax, float(t[-1]))
        fps = 20.0
        if anim:
            ts = next(iter(next(iter(anim.values())).values()))[0]
            if len(ts) > 1:
                fps = round(1.0 / float(np.median(np.diff(ts))))
            stage.SetTimeCodesPerSecond(fps); stage.SetFramesPerSecond(fps)
            stage.SetStartTimeCode(0); stage.SetEndTimeCode(round(tmax * fps))

        stats = {'triangles': 0, 'meshes': 0, 'vertices': 0}

        def write_mesh(parent_path, mi, used_names):
            mesh = j['meshes'][mi]
            for pi, prim in enumerate(mesh['primitives']):
                if prim.get('mode', 4) != 4:
                    continue
                att = prim['attributes']
                pos = accessor(j, binc, att['POSITION']).astype(np.float32)
                idx = accessor(j, binc, prim['indices'])[:, 0].astype(np.int32) if 'indices' in prim else np.arange(len(pos), dtype=np.int32)
                nm = safe((mesh.get('name') or 'mesh') + (f'_{pi}' if pi else ''), used_names)
                um = UsdGeom.Mesh.Define(stage, f'{parent_path}/{nm}')
                um.CreateSubdivisionSchemeAttr('none')
                um.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(pos))
                um.CreateFaceVertexCountsAttr(Vt.IntArray.FromNumpy(np.full(len(idx) // 3, 3, np.int32)))
                um.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(idx))
                um.CreateExtentAttr(Vt.Vec3fArray([Gf.Vec3f(*pos.min(0).tolist()), Gf.Vec3f(*pos.max(0).tolist())]))
                if 'NORMAL' in att:
                    nrm = accessor(j, binc, att['NORMAL']).astype(np.float32)
                    um.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(nrm))
                    um.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
                mi_ = prim.get('material')
                info = mat_info[mi_] if mi_ is not None and mi_ < len(mat_info) else {'double': False, 'tex_ext': None}
                if 'TEXCOORD_0' in att:
                    uv = accessor(j, binc, att['TEXCOORD_0']).astype(np.float64)
                    uv = uv_transform(uv, info['tex_ext'])
                    st = np.stack([uv[:, 0], 1.0 - uv[:, 1]], 1).astype(np.float32)
                    pv = UsdGeom.PrimvarsAPI(um).CreatePrimvar('st', Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
                    pv.Set(Vt.Vec2fArray.FromNumpy(st))
                um.CreateDoubleSidedAttr(info['double'])
                if mi_ is not None and mi_ < len(mats):
                    UsdShade.MaterialBindingAPI.Apply(um.GetPrim()).Bind(mats[mi_])
                stats['triangles'] += len(idx) // 3; stats['meshes'] += 1; stats['vertices'] += len(pos)

        used_nodes = set()

        def write_node(ni, parent_path):
            n = j['nodes'][ni]
            nm = safe(n.get('name') or f'node_{ni}', used_nodes)
            path = f'{parent_path}/{nm}'
            x = UsdGeom.Xform.Define(stage, path)
            T = n.get('translation', [0, 0, 0]); R = n.get('rotation', [0, 0, 0, 1]); S = n.get('scale', [1, 1, 1])
            if 'matrix' in n:
                M = np.array(n['matrix'], np.float64).reshape(4, 4)
                x.AddTransformOp().Set(Gf.Matrix4d(*M.flatten().tolist()))
            else:
                a = anim.get(ni, {})
                if 'translation' in a or any(abs(v) > 1e-9 for v in T):
                    op = x.AddTranslateOp(precision=UsdGeom.XformOp.PrecisionFloat)
                    if 'translation' in a:
                        for t, v in zip(*a['translation']):
                            op.Set(Gf.Vec3f(*v.tolist()), Usd.TimeCode(round(t * fps)))
                    else:
                        op.Set(Gf.Vec3f(*T))
                if 'rotation' in a or any(abs(v) > 1e-9 for v in R[:3]):
                    op = x.AddOrientOp(precision=UsdGeom.XformOp.PrecisionFloat)
                    if 'rotation' in a:
                        for t, v in zip(*a['rotation']):
                            op.Set(Gf.Quatf(float(v[3]), float(v[0]), float(v[1]), float(v[2])), Usd.TimeCode(round(t * fps)))
                    else:
                        op.Set(Gf.Quatf(float(R[3]), float(R[0]), float(R[1]), float(R[2])))
                if 'scale' in a or any(abs(v - 1) > 1e-9 for v in S):
                    op = x.AddScaleOp(precision=UsdGeom.XformOp.PrecisionFloat)
                    if 'scale' in a:
                        for t, v in zip(*a['scale']):
                            op.Set(Gf.Vec3f(*v.tolist()), Usd.TimeCode(round(t * fps)))
                    else:
                        op.Set(Gf.Vec3f(*S))
            if 'mesh' in n:
                write_mesh(path, n['mesh'], set())
            for c in n.get('children', []):
                write_node(c, path)

        scene = j['scenes'][j.get('scene', 0)]
        for ni in scene['nodes']:
            write_node(ni, '/Root')
        stage.GetRootLayer().Save()
        if os.path.exists(usdz):
            os.remove(usdz)
        ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(root_file), usdz)
        if not ok:
            raise RuntimeError('UsdUtils could not write the USDZ')
        stats.update({'bytes': os.path.getsize(usdz), 'animated_nodes': len(anim), 'seconds': round(tmax, 2), 'fps': fps})
        return stats
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    anchor = 'horizontal'
    if '--anchor' in args:
        anchor = args[args.index('--anchor') + 1]
    print(json.dumps(convert(args[0], args[1], anchor)))
