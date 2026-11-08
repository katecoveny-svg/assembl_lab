"""Check USDZ files the way `usdchecker --arkit` does, plus OpenUSD's newer validators.

  python3 ar/tools/usd_check.py file.usdz [more.usdz ...]

usdchecker --arkit is OpenUSD's ComplianceChecker with arkit=True (the rules for AR Quick Look: usdc/usda layers only,
png/jpg textures, UsdPreviewSurface shaders, material bindings, a default prim, a well-formed package). The usd-core 26
wheel no longer includes the Python checker or the usdchecker command, so this loads it from, in order:
  pxr.UsdUtils.ComplianceChecker (usd-core 25.x and earlier, or a full OpenUSD build)
  the file named by USD_COMPLIANCE_CHECKER (complianceChecker.py from OpenUSD v25.08, pxr/usd/usdUtils/)
Exit code 1 if any file fails.
"""
import importlib.util, json, os, sys


def load_checker():
    try:
        from pxr.UsdUtils import ComplianceChecker
        return ComplianceChecker, 'pxr.UsdUtils'
    except ImportError:
        pass
    p = os.environ.get('USD_COMPLIANCE_CHECKER')
    if p and os.path.exists(p):
        spec = importlib.util.spec_from_file_location('complianceChecker', p)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        return m.ComplianceChecker, os.path.basename(p)
    return None, None


def check(path):
    out = {'file': os.path.basename(path), 'bytes': os.path.getsize(path)}
    CC, src = load_checker()
    if CC:
        c = CC(arkit=True, skipARKitRootLayerCheck=False, rootPackageOnly=False, skipVariants=False, verbose=False)
        c.CheckCompliance(path)
        out['arkit'] = {'checker': src, 'errors': c.GetErrors(), 'failed_checks': c.GetFailedChecks(), 'warnings': c.GetWarnings()}
    else:
        out['arkit'] = {'checker': None, 'errors': ['ComplianceChecker not found: set USD_COMPLIANCE_CHECKER'], 'failed_checks': []}
    from pxr import Usd, UsdGeom
    from pxr import UsdValidation as V
    st = Usd.Stage.Open(path)
    ctx = V.ValidationContext(V.ValidationRegistry().GetOrLoadAllValidators())
    out['validators'] = [f'{e.GetName()}: {e.GetMessage()[:140]}' for e in ctx.Validate(st) if 'Error' in str(e.GetType())]
    tris = 0
    for p in st.Traverse():
        if p.IsA(UsdGeom.Mesh):
            c = UsdGeom.Mesh(p).GetFaceVertexCountsAttr().Get()
            tris += sum(n - 2 for n in c) if c else 0
    out['triangles'] = tris
    bb = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ['default', 'render']).ComputeWorldBound(st.GetPseudoRoot()).ComputeAlignedRange()
    out['size_m'] = [round(v, 3) for v in (bb.GetMax() - bb.GetMin())] if not bb.IsEmpty() else None
    out['animated'] = st.GetEndTimeCode() > st.GetStartTimeCode()
    out['seconds'] = round((st.GetEndTimeCode() - st.GetStartTimeCode()) / st.GetTimeCodesPerSecond(), 2) if out['animated'] else 0
    out['ok'] = not out['arkit']['errors'] and not out['arkit']['failed_checks'] and not out['validators']
    return out


if __name__ == '__main__':
    bad = 0
    for f in sys.argv[1:]:
        r = check(f); bad += not r['ok']
        print(json.dumps(r))
    sys.exit(1 if bad else 0)
