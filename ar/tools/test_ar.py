"""assembl AR end-to-end checks (Playwright, Chromium with SwiftShader WebGL).

  python3 ar/tools/test_ar.py http://127.0.0.1:8964 OUT_DIR [studio] [qr] [viewer] [layout] [embed] [machines] [worlds] [files] [xr]

Needs: playwright (with Chromium), opencv-python-headless, trimesh, usd-core. Serve the repo root first, e.g.
  python3 -m http.server 8964 --directory /path/to/repo
The machine checks route cdnjs three r128 (used by vend and pinball) to a local copy if THREE128 points at one.

What it checks
  studio   each kind previews without errors; GLB and USDZ download, parse (header, chunks, trimesh) and validate
           (USDZ: stored, 64-byte aligned, model.usda first, Pixar's USD validators)
  qr       every card style and centre decodes with OpenCV's QRCodeDetector to the share link, and every code style
           decodes at about 160 px for short links (larger for long logo links)
  viewer   the decoded link rebuilds the same object (kind, title, triangle count, size)
  layout   1280 and 400 px: no horizontal scroll; screenshots
  embed    the demo page's buttons; the desktop popover's code decodes to the right URL; files from a custom object
  machines genes, vend and kokopu scenes snapshot, export and validate under about 15 MB
  worlds   the AR worlds: /ar/ (eight cards) at 1440 and 390 px; every world's launcher on a computer (3D preview builds,
           the code decodes to its short link for both modes, the print card's code decodes); the phone layout
           (?device=quicklook); and every page with a "View in AR" button (the code sheet's code decodes). No page errors,
           no sideways scroll, screenshots of all of it
  files    every pre-built USDZ passes usdchecker --arkit (see usd_check.py) and is under 20 MB; every GLB parses
  xr       the Android path in a WebXR emulator (Meta's IWER, file named by IWER=.../iwer.min.js): the session starts,
           hit-test places the world, it builds itself, the model ticks, and the doorway flips when you walk through it
  (worlds and xr need the /ar/w/:id/ rewrite: serve with ar/tools/serve.py, not plain http.server)
"""
import asyncio, json, os, struct, sys, time, zipfile, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8964'
OUT = sys.argv[2] if len(sys.argv) > 2 else './ar-test-out'
PARTS = set(sys.argv[3:]) or {'studio', 'qr', 'viewer', 'layout', 'embed', 'machines', 'worlds', 'files', 'xr'}
THREE128 = os.environ.get('THREE128')
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
os.makedirs(OUT, exist_ok=True)
RESULTS = {'checks': [], 'errors': []}


def check(name, ok, detail=''):
    RESULTS['checks'].append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (('  ' + str(detail)) if detail else ''), flush=True)
    return ok


# ---------------------------------------------------------------- file validation
def check_glb(path):
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<4sII', b[:12])
    assert magic == b'glTF' and ver == 2, 'bad header'
    assert length == len(b), f'length {length} != file {len(b)}'
    jl, jt = struct.unpack('<I4s', b[12:20])
    assert jt == b'JSON'
    j = json.loads(b[20:20 + jl])
    off = 20 + jl
    binlen = 0
    if off < len(b):
        bl, bt = struct.unpack('<I4s', b[off:off + 8])
        assert bt == b'BIN\x00', 'second chunk is not BIN'
        binlen = bl
        assert off + 8 + bl == len(b), 'BIN chunk length mismatch'
    for bv in j.get('bufferViews', []):
        assert bv.get('byteOffset', 0) + bv['byteLength'] <= binlen, 'bufferView outside BIN'
    tris = 0
    for m in j.get('meshes', []):
        for p in m['primitives']:
            if 'indices' in p:
                tris += j['accessors'][p['indices']]['count'] // 3
            else:
                tris += j['accessors'][p['attributes']['POSITION']]['count'] // 3
    import trimesh
    sc = trimesh.load(path)
    bounds = sc.bounds.tolist() if hasattr(sc, 'bounds') and sc.bounds is not None else None
    return {'bytes': len(b), 'meshes': len(j.get('meshes', [])), 'materials': len(j.get('materials', [])), 'images': len(j.get('images', [])),
            'triangles': tris, 'extensions': j.get('extensionsUsed', []), 'bounds_m': [[round(v, 4) for v in r] for r in bounds] if bounds else None}


def check_usdz(path):
    raw = open(path, 'rb').read()
    z = zipfile.ZipFile(io.BytesIO(raw))
    names = z.namelist()
    assert names and (names[0].endswith('.usda') or names[0].endswith('.usdc')), f'first file is {names[:1]}'
    for info in z.infolist():
        assert info.compress_type == 0, f'{info.filename} is compressed'
        lh = info.header_offset
        n, e = struct.unpack('<HH', raw[lh + 26:lh + 30])
        data = lh + 30 + n + e
        assert data % 64 == 0, f'{info.filename} data at {data} is not 64-byte aligned'
    model = z.read(names[0]).decode()
    assert 'metersPerUnit = 1' in model and 'upAxis = "Y"' in model
    from pxr import Usd, UsdGeom
    from pxr import UsdValidation as V
    stage = Usd.Stage.Open(path)
    meshes = sum(1 for p in stage.Traverse() if p.IsA(UsdGeom.Mesh))
    ctx = V.ValidationContext(V.ValidationRegistry().GetOrLoadAllValidators())
    errs = [f'{e.GetName()}: {e.GetMessage()[:120]}' for e in ctx.Validate(stage) if 'Error' in str(e.GetType())]
    bbox = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ['default', 'render']).ComputeWorldBound(stage.GetPseudoRoot()).ComputeAlignedRange()
    size = [round(v, 4) for v in (bbox.GetMax() - bbox.GetMin())] if not bbox.IsEmpty() else None
    anchoring = 'vertical' if 'alignment = "vertical"' in model else 'horizontal'
    return {'bytes': len(raw), 'files': len(names), 'first': names[0], 'meshes': meshes, 'usd_errors': errs, 'size_m': size, 'anchoring': anchoring}


def decode_qr(png_bytes_or_path, upscale=1):
    img = cv2.imread(png_bytes_or_path) if isinstance(png_bytes_or_path, str) else cv2.imdecode(np.frombuffer(png_bytes_or_path, np.uint8), cv2.IMREAD_COLOR)
    if upscale != 1:
        img = cv2.resize(img, None, fx=upscale, fy=upscale, interpolation=cv2.INTER_NEAREST)
    data, pts, _ = cv2.QRCodeDetector().detectAndDecode(img)
    return data


async def browser(p):
    return await p.chromium.launch(args=ARGS)


def watch(page, name):
    errs = []
    page.on('pageerror', lambda e: errs.append(f'{name} pageerror: {e}'))
    page.on('console', lambda m: errs.append(f'{name} console.{m.type}: {m.text[:200]}') if m.type == 'error' else None)
    return errs


async def studio_ready(pg):
    await pg.wait_for_function('window.__assemblAR && window.__assemblAR.result', timeout=180000)
    await pg.evaluate('window.__assemblAR.ready()')


async def pick(pg, kind, extra=None):
    await pg.click(f'button.type[data-type="{kind}"]')
    if extra:
        await extra()
    await pg.wait_for_function('''k => { const r = window.__assemblAR.result; return r && (r.kind === k || (k === 'lib' && (r.kind === 'car' || r.kind === 'bike'))) }''', arg=kind, timeout=180000)
    await pg.wait_for_timeout(1800)
    return await pg.evaluate('''() => { const r = window.__assemblAR.result; let t = 0; r.object.traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 });
      return { kind: r.kind, title: r.title, triangles: t, size: r.size, shareable: r.shareable, qrOK: r.qrOK || false, url: r.shareURL || null } }''')


async def download(pg, selector, path):
    async with pg.expect_download(timeout=600000) as dl:
        await pg.click(selector)
    d = await dl.value
    await d.save_as(path)
    return path


# ---------------------------------------------------------------- studio, qr, viewer
async def run_studio(p):
    b = await browser(p)
    ctx = await b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    pg = await ctx.new_page()
    errs = watch(pg, 'studio')
    await pg.goto(BASE + '/ar/', wait_until='load', timeout=180000)
    await studio_ready(pg)
    objects = {}
    kinds = [
        ('text', 'text', None),
        ('logo', 'logo', None),
        ('frame', 'frame', None),
        ('ute', 'lib', None),
        ('bike', 'lib', lambda: pg.click('label.tile:has(input[value="bike"])')),
        ('glb', 'glb', lambda: pg.set_input_files('#glbFile', os.path.join(os.path.dirname(__file__), '..', 'models', 'car_hatch.glb'))),
    ]
    for name, kind, extra in kinds:
        info = await pick(pg, kind, extra)
        objects[name] = info
        check(f'studio previews {name}', info['triangles'] > 0, f"{info['title']} · {info['triangles']} triangles · {info['size']}")
        await pg.locator('#studio').screenshot(path=f'{OUT}/studio_{name}.png', timeout=120000)
        if 'studio' in PARTS:
            g = await download(pg, '#dlGLB', f'{OUT}/{name}.glb')
            try:
                gi = check_glb(g)
                check(f'{name}.glb valid', gi['triangles'] > 0, gi)
            except Exception as e:
                check(f'{name}.glb valid', False, repr(e))
            u = await download(pg, '#dlUSDZ', f'{OUT}/{name}.usdz')
            try:
                ui = check_usdz(u)
                check(f'{name}.usdz valid', ui['meshes'] > 0 and not ui['usd_errors'], ui)
            except Exception as e:
                check(f'{name}.usdz valid', False, repr(e))
        if 'qr' in PARTS and info['shareable'] and info['qrOK']:
            await pg.wait_for_function('() => window.__assemblAR.card && window.__assemblAR.card.url === window.__assemblAR.result.shareURL', timeout=60000)
            png = await download(pg, '#dlPNG', f'{OUT}/card_{name}.png')
            got = decode_qr(png)
            check(f'card PNG for {name} decodes to its link', got == info['url'], got[:90])
        if name == 'frame':
            # wall frame USDZ asks Quick Look for a vertical plane
            if 'studio' in PARTS:
                ui = check_usdz(f'{OUT}/frame.usdz')
                check('wall frame USDZ uses vertical anchoring', ui['anchoring'] == 'vertical', ui['anchoring'])
    # every card style and centre, for the text object
    if 'qr' in PARTS:
        await pick(pg, 'text')
        url = objects['text']['url']
        for style in ['assembly', 'dots', 'glass', 'square']:
            for centre in ['thumb', 'cube']:
                await pg.check(f'#styleSeg input[value="{style}"]')
                await pg.check(f'#centreSeg input[value="{centre}"]')
                await pg.wait_for_timeout(700)
                await pg.wait_for_function('() => !document.getElementById("cardHolder").classList.contains("busy")', timeout=60000)
                await pg.wait_for_timeout(600)
                png = await download(pg, '#dlPNG', f'{OUT}/card_text_{style}_{centre}.png')
                check(f'card style {style} with {centre} centre decodes', decode_qr(png) == url)
        await pg.check('#styleSeg input[value="assembly"]'); await pg.check('#centreSeg input[value="thumb"]')
        # small codes: each style at about 160 px, rendered on its own
        urls = {k: v['url'] for k, v in objects.items() if v.get('url')}
        await pg.evaluate('''() => { const d = document.createElement('div'); d.id = 'qrtest'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#FFFDFB;padding:12px'; document.body.appendChild(d); }''')
        for name, url in urls.items():
            for style in ['assembly', 'dots', 'glass', 'square']:
                for centre in ['thumb', 'cube']:
                    m = await pg.evaluate('''async ([url, style, centre]) => {
                        const q = await import('/ar/js/qr.js'); const m = q.planQR(url);
                        const thumb = window.__assemblAR.stage.thumbnail(120, 1);
                        const svg = q.qrSVG(url, { style, size: 160, matrix: m, centre: centre === 'cube' ? { kind: 'cube' } : { kind: 'image', href: thumb } });
                        const d = document.getElementById('qrtest'); d.innerHTML = svg; d.firstElementChild.style.display = 'block';
                        await new Promise(r => setTimeout(r, 150));
                        return { n: m.n, ecl: m.ecl, version: m.version } }''', [url, style, centre])
                    path = f'{OUT}/qr160_{name}_{style}_{centre}.png'
                    await pg.locator('#qrtest').screenshot(path=path)
                    got = decode_qr(path)
                    note = f"v{m['version']} {m['ecl']} {m['n']}x{m['n']} modules"
                    if got != url and m['version'] > 12:
                        # long links are dense: check at the size the card asks for (6 cm or larger, about 480 px on screen)
                        await pg.evaluate('''() => { const s = document.querySelector('#qrtest svg'); s.setAttribute('width', 480); s.setAttribute('height', 480); }''')
                        await pg.locator('#qrtest').screenshot(path=path.replace('qr160', 'qr480'))
                        got2 = decode_qr(path.replace('qr160', 'qr480'))
                        check(f'{style}/{centre} code for {name} decodes ({note}; too dense for 160 px, decodes at 480 px)', got2 == url)
                    else:
                        check(f'{style}/{centre} code for {name} decodes at 160 px ({note})', got == url)
        await pg.evaluate('document.getElementById("qrtest").remove()')
    # viewer rebuilds the same object
    if 'viewer' in PARTS:
        for name in ['text', 'logo', 'ute', 'bike']:
            o = objects.get(name)
            if not o or not o['url']:
                continue
            v = await ctx.new_page()
            verrs = watch(v, 'viewer ' + name)
            await v.goto(o['url'], wait_until='load', timeout=180000)
            await v.wait_for_function('window.__assemblAR && window.__assemblAR.result', timeout=180000)
            await v.wait_for_timeout(1500)
            r = await v.evaluate('''() => { const r = window.__assemblAR.result; let t = 0; r.object.traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 });
              return { kind: r.kind, title: r.title, triangles: t, size: r.size } }''')
            same = r['kind'] == o['kind'] and r['title'] == o['title'] and r['triangles'] == o['triangles'] and all(abs(r['size'][k] - o['size'][k]) < 1e-6 for k in 'xyz')
            check(f'viewer rebuilds the same {name}', same, f"viewer {r['title']} {r['triangles']} tris vs studio {o['title']} {o['triangles']}")
            await v.screenshot(path=f'{OUT}/viewer_{name}_1280.png', timeout=120000)
            errs.extend(verrs)
            await v.close()
        # a damaged link gets an honest message, not a crash
        v = await ctx.new_page()
        await v.goto(BASE + '/ar/v/#k=logo&s=AAAA', wait_until='load', timeout=120000)
        await v.wait_for_timeout(1500)
        t = await v.inner_text('#vEmpty')
        check('viewer explains a damaged link', 'rebuild' in t.lower() or 'missing' in t.lower(), t[:80])
        await v.close()
    check('studio has no console errors', not errs, errs[:6])
    RESULTS['errors'].extend(errs)
    RESULTS['objects'] = objects
    await b.close()


async def run_layout(p):
    b = await browser(p)
    for w, h in [(1280, 900), (400, 860)]:
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
        pg = await ctx.new_page()
        errs = watch(pg, f'layout {w}')
        await pg.goto(BASE + '/ar/', wait_until='load', timeout=180000)
        await studio_ready(pg)
        await pg.wait_for_timeout(1500)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        check(f'studio at {w} px has no horizontal scroll', sw <= w, f'scrollWidth {sw}')
        await pg.screenshot(path=f'{OUT}/studio_{w}.png', full_page=False, timeout=120000)
        await pg.screenshot(path=f'{OUT}/studio_{w}_full.png', full_page=True, timeout=180000)
        for t in ['logo', 'frame', 'lib', 'glb']:
            await pg.click(f'button.type[data-type="{t}"]')
            await pg.wait_for_timeout(2500)
            sw = await pg.evaluate('document.documentElement.scrollWidth')
            check(f'studio {t} panel at {w} px has no horizontal scroll', sw <= w, f'scrollWidth {sw}')
        v = await ctx.new_page()
        await v.goto(BASE + '/ar/v/#k=bike&wb=140&wd=74&su=200&fr=492B3E&ac=F5F1F2&b=1&s=model', wait_until='load', timeout=180000)
        await v.wait_for_function('window.__assemblAR && window.__assemblAR.result', timeout=180000)
        await v.wait_for_timeout(2000)
        sw = await v.evaluate('document.documentElement.scrollWidth')
        check(f'viewer at {w} px has no horizontal scroll', sw <= w, f'scrollWidth {sw}')
        await v.screenshot(path=f'{OUT}/viewer_{w}.png', full_page=True, timeout=180000)
        check(f'no errors at {w} px', not errs, errs[:4])
        await ctx.close()
    await b.close()


# ---------------------------------------------------------------- embed
async def run_embed(p):
    b = await browser(p)
    ctx = await b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    pg = await ctx.new_page()
    errs = watch(pg, 'embed')
    await pg.goto(BASE + '/ar/tools/embed-demo.html', wait_until='load', timeout=180000)
    await pg.wait_for_selector('#slotObj .aar-btn', timeout=60000)
    await pg.wait_for_timeout(1500)
    check('embed renders three buttons', await pg.locator('.aar-btn').count() == 3)
    # desktop: the custom object's code points at this page with #ar
    await pg.click('#slotObj .aar-btn')
    await pg.wait_for_selector('#slotObj .aar-pop svg', timeout=60000)
    await pg.wait_for_timeout(500)
    await pg.locator('#slotObj .aar-pop').screenshot(path=f'{OUT}/embed_popover_obj.png')
    got = decode_qr(f'{OUT}/embed_popover_obj.png')
    check('embed popover code for an object opens this page with #ar', got == BASE + '/ar/tools/embed-demo.html#ar', got)
    await pg.keyboard.press('Escape')
    # library bike: the code carries the parameters
    await pg.click('#slotBike .aar-btn')
    await pg.wait_for_selector('#slotBike .aar-pop svg', timeout=60000)
    await pg.wait_for_timeout(500)
    await pg.screenshot(path=f'{OUT}/embed_demo_1280.png', timeout=120000)
    await pg.locator('#slotBike .aar-pop').screenshot(path=f'{OUT}/embed_popover_bike.png')
    got = decode_qr(f'{OUT}/embed_popover_bike.png')
    check('embed popover code for lib:bike opens the viewer with its settings', '/ar/v/#k=bike&wb=140' in got and 's=real' in got, got)
    await pg.keyboard.press('Escape')
    if got:
        v = await ctx.new_page()
        await v.goto(got, wait_until='load', timeout=180000)
        await v.wait_for_function('window.__assemblAR && window.__assemblAR.result', timeout=180000)
        r = await v.evaluate('() => ({ title: window.__assemblAR.result.title, size: window.__assemblAR.result.size })')
        check('that code rebuilds a real-size bike with a 140 mm (1:10) wheelbase', 'real size' in r['title'] and r['size']['x'] > 1.5, r)
        await v.close()
    # files from the custom object: instances baked, points and sprite skipped
    for kind in ['glb', 'usdz']:
        async with pg.expect_download(timeout=300000) as dl:
            await pg.evaluate(f'''async () => {{ const b = await window.__demo.obj.files('{kind}'); const ex = await import('/ar/js/exporters.js'); ex.download(b, 'demo.{kind}'); }}''')
        d = await dl.value
        await d.save_as(f'{OUT}/embed_obj.{kind}')
    rep = await pg.evaluate('window.__demo.obj.report')
    gi = check_glb(f'{OUT}/embed_obj.glb'); ui = check_usdz(f'{OUT}/embed_obj.usdz')
    check('embed object GLB valid', gi['triangles'] > 0, gi)
    check('embed object USDZ valid', ui['meshes'] > 0 and not ui['usd_errors'], ui)
    check('embed baked 59 visible instances and skipped points and sprite', rep['instances'] == 59 and rep['skipped'].get('points') == 1 and rep['skipped'].get('sprite') == 1, {'instances': rep['instances'], 'skipped': rep['skipped']})
    check('embed table scale is about 38 cm across', abs(max(rep['size']['x'], rep['size']['z']) - 0.38) < 0.005, rep['size'])
    # the size snapshot of the same unchanged object is reused
    same = await pg.evaluate('''async () => { const a = window.__demo.obj.report; await window.__demo.obj.files('glb'); return a === window.__demo.obj.report }''')
    check('an unchanged object reuses its snapshot', same)
    check('embed page has no console errors', not errs, errs[:4])
    # 400 px
    ctx2 = await b.new_context(viewport={'width': 400, 'height': 860})
    pg2 = await ctx2.new_page()
    await pg2.goto(BASE + '/ar/tools/embed-demo.html', wait_until='load', timeout=180000)
    await pg2.wait_for_selector('#slotObj .aar-btn', timeout=60000)
    await pg2.click('#slotObj .aar-btn')
    await pg2.wait_for_selector('#slotObj .aar-pop svg', timeout=60000)
    sw = await pg2.evaluate('document.documentElement.scrollWidth')
    check('embed popover at 400 px has no horizontal scroll', sw <= 400, sw)
    await pg2.screenshot(path=f'{OUT}/embed_demo_400.png', full_page=True, timeout=120000)
    await b.close()


# ---------------------------------------------------------------- study machines
GRAB = '''async () => {
  if (window.__VEND && window.__VEND.scene) { await new Promise(r => setTimeout(r, 3000)); window.__machineScene = window.__VEND.scene; window.__machineCamera = window.__VEND.camera; return 'vend3d'; }
  const THREE = await import('/assets/vendor/three/three.module.min.js');
  window.__scenes = new Set(); window.__cams = new Map();
  // WebGLRenderer.render is an instance method, but every render calls scene.onBeforeRender
  const orig = THREE.Scene.prototype.onBeforeRender;
  THREE.Scene.prototype.onBeforeRender = function (r, s, camera, rt) { window.__scenes.add(this); if (camera && camera.isPerspectiveCamera) window.__cams.set(this, camera); return orig.call(this, r, s, camera, rt); };
  const t0 = performance.now();
  while (performance.now() - t0 < 120000) { await new Promise(r => setTimeout(r, 500)); if ([...window.__scenes].some(s => s.children.length > 2)) break; }
  let best = null, bestN = -1;
  for (const s of window.__scenes) { let n = 0; s.traverse(() => n++); if (n > bestN) { best = s; bestN = n; } }
  window.__machineScene = best; window.__machineCamera = window.__cams.get(best) || null;
  return 'kit3d';
}'''
RUN = '''async (o) => {
  const ar = await import('/ar/embed.js');
  const opts = { scale: 'table', maxTriangles: 150000, ...(o.view ? { view: window.__machineCamera } : {}) };
  const t0 = performance.now();
  const { group, report } = await ar.snapshot(window.__machineScene, opts);
  const t1 = performance.now();
  const glb = await ar.exportGLB(group); const t2 = performance.now();
  const usdz = await ar.exportUSDZ(group); const t3 = performance.now();
  window.__files = { glb, usdz };
  return { report, ms: { snapshot: Math.round(t1 - t0), glb: Math.round(t2 - t1), usdz: Math.round(t3 - t2) } };
}'''


async def run_machines(p):
    b = await browser(p)
    out = {}
    for name, view in [('genes', False), ('genes', True), ('vend', False), ('kokopu', False), ('kokopu', True)]:
        ctx = await b.new_context(viewport={'width': 1280, 'height': 860}, accept_downloads=True)
        pg = await ctx.new_page()
        if THREE128:
            await pg.route('**/ajax/libs/three.js/r128/three.min.js', lambda route: route.fulfill(path=THREE128, content_type='application/javascript'))
        errs = watch(pg, name)
        await pg.goto(f'{BASE}/study/m/{name}.html?lq', wait_until='load', timeout=180000)
        await pg.wait_for_selector('.s3-host canvas, #vend-gl', timeout=180000)
        await pg.wait_for_timeout(3000)
        kind = await pg.evaluate(GRAB)
        res = await pg.evaluate(RUN, {'view': view})
        tag = name + ('_view' if view else '_scene')
        for k in ['glb', 'usdz']:
            async with pg.expect_download(timeout=300000) as dl:
                await pg.evaluate(f"(async()=>{{const ex=await import('/ar/js/exporters.js'); ex.download(window.__files.{k}, 'snap.{k}')}})()")
            d = await dl.value
            await d.save_as(f'{OUT}/{tag}.{k}')
        gi = check_glb(f'{OUT}/{tag}.glb'); ui = check_usdz(f'{OUT}/{tag}.usdz')
        r = res['report']
        check(f'{tag}: GLB valid and under 15 MB', gi['triangles'] > 0 and gi['bytes'] < 15e6, f"{gi['bytes'] / 1e6:.1f} MB")
        check(f'{tag}: USDZ valid and under 15 MB', ui['meshes'] > 0 and not ui['usd_errors'] and ui['bytes'] < 15e6, f"{ui['bytes'] / 1e6:.1f} MB {ui['usd_errors'][:2]}")
        out[tag] = {'bench': kind, 'triangles_before': r['trianglesBefore'], 'triangles': r['triangles'], 'size_m': r['size'], 'skipped': r['skipped'],
                    'simplified': r['simplified'], 'dropped': r['dropped'], 'note': r.get('budgetNote'), 'ms': res['ms'], 'glb_mb': round(gi['bytes'] / 1e6, 2), 'usdz_mb': round(ui['bytes'] / 1e6, 2), 'errors': errs[:3]}
        print(json.dumps(out[tag])[:600], flush=True)
        await ctx.close()
    RESULTS['machines'] = out
    await b.close()


# ---------------------------------------------------------------- AR worlds
WORLD_IDS = ['f1', 'claw', 'heart', 'earth', 'dairy', 'ed', 'dc', 'cafe']
LIVE = 'https://lab.assembl.co.nz'
BUTTON_PAGES = [('dairy', '/dairy/plant/?frames=2'), ('ed', '/ed/floor/?frames=2'), ('dc', '/store/dc/?frames=2'), ('cafe', '/cafe/'),
                ('f1', '/study/m/windtunnel.html'), ('claw', '/study/m/claw.html'), ('earth', '/study/m/earthspace.html'), ('heart', '/study/m/heart.html')]
NOISE = ('GPU stall', 'favicon', 'fonts.g', 'Failed to load resource: net::ERR', 'WebGL', 'feeds', '/api/')


def quiet(errs):
    return [e for e in errs if not any(n in e for n in NOISE)]


async def no_scroll(pg, w, name):
    sw = await pg.evaluate('document.documentElement.scrollWidth')
    return check(f'{name} at {w} px has no sideways scroll', sw <= w, f'scrollWidth {sw}')


async def run_worlds(p):
    b = await browser(p)
    # the gallery
    for w, h in [(1440, 900), (390, 844)]:
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
        pg = await ctx.new_page(); errs = watch(pg, f'/ar/ {w}')
        await pg.goto(BASE + '/ar/', wait_until='load', timeout=180000)
        await pg.wait_for_function('document.querySelectorAll(".w-card[data-world]").length === 8', timeout=60000)
        await pg.wait_for_timeout(1500)
        n = await pg.locator('.w-card[data-world] a.w-mode').count()
        check(f'/ar/ at {w} px shows 8 worlds with two ways in each', n == 16, n)
        await no_scroll(pg, w, '/ar/')
        await pg.screenshot(path=f'{OUT}/worlds_ar_{w}.png', timeout=120000)
        for y in range(0, 12000, 600):   # let the lazy posters load before the full-page picture
            await pg.evaluate(f'window.scrollTo(0, {y})'); await pg.wait_for_timeout(80)
        await pg.evaluate('window.scrollTo(0, 0)'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f'{OUT}/worlds_ar_{w}_full.png', full_page=True, timeout=180000)
        check(f'/ar/ at {w} px has no page errors', not quiet(errs), quiet(errs)[:3])
        await ctx.close()
    # each world's launcher on a computer: the 3D preview (built from the same code as the phone), and the code sheet
    INSIDE_PREVIEW = {'f1', 'heart', 'cafe', 'dairy'}   # life-size previews are slow in SwiftShader; these cover objects and the doorway
    for wid in WORLD_IDS:
        for w, h in [(1440, 900), (390, 844)]:
            modes = ['table', 'inside'] if (w == 1440 and wid in INSIDE_PREVIEW) else ['table']
            for mode in modes:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
                pg = await ctx.new_page(); errs = watch(pg, f'launcher {wid} {mode} {w}')
                await pg.goto(f'{BASE}/ar/w/{wid}/?mode={mode}&frames=3&motion=reduce', wait_until='load', timeout=180000)
                await pg.wait_for_selector('.ws-qr svg', timeout=60000)
                try:
                    await pg.wait_for_function('(window.__wl && document.documentElement.classList.contains("still")) || document.getElementById("wl-load-t").textContent.includes("couldn")', timeout=900000)
                    ok3d = await pg.evaluate('!!window.__wl')
                except Exception:
                    ok3d = False
                check(f'launcher {wid} ({mode}) at {w} px: the 3D preview builds', ok3d)
                if ok3d and w == 1440:
                    info = await pg.evaluate('({ calls: window.__wl.calls, tris: window.__wl.triangles, size: window.__wl.world.size, tags: window.__wl.world.tags.length, status: window.__wl.status(), portal: !!window.__wl.portal })')
                    RESULTS.setdefault('previews', {})[f'{wid}-{mode}'] = info
                await pg.wait_for_timeout(800)
                await no_scroll(pg, w, f'launcher {wid} ({mode})')
                await pg.screenshot(path=f'{OUT}/worlds_launcher_{wid}_{mode}_{w}.png', timeout=300000)
                check(f'launcher {wid} ({mode}) at {w} px has no page errors', not quiet(errs), quiet(errs)[:3])
                await ctx.close()
        # the code sheet for both modes, and the print card (without the 3D, which the checks above cover)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, accept_downloads=True)
        pg = await ctx.new_page(); errs = watch(pg, f'sheet {wid}')
        await pg.goto(f'{BASE}/ar/w/{wid}/?mode=table&preview=0', wait_until='load', timeout=120000)
        await pg.wait_for_selector('.ws-qr svg', timeout=60000)
        for mode in ['table', 'inside']:
            if mode == 'inside':
                await pg.click('.ws-modes input[value="inside"]', force=True); await pg.wait_for_timeout(500)
            await pg.locator('.ws-qr').screenshot(path=f'{OUT}/worlds_code_{wid}_{mode}.png')
            got = decode_qr(f'{OUT}/worlds_code_{wid}_{mode}.png')
            check(f'launcher {wid}: the {mode} code opens {LIVE}/ar/w/{wid}/?mode={mode}', got == f'{LIVE}/ar/w/{wid}/?mode={mode}', got)
        for kind in ['png', 'svg']:
            async with pg.expect_download(timeout=180000) as dl:
                await pg.click(f'[data-dl="{kind}"]', timeout=120000)
            d = await dl.value; await d.save_as(f'{OUT}/worlds_card_{wid}.{kind}')
        got = decode_qr(f'{OUT}/worlds_card_{wid}.png')
        check(f'launcher {wid}: the printed card (PNG) decodes; the SVG is there too', got == f'{LIVE}/ar/w/{wid}/?mode=inside' and os.path.getsize(f'{OUT}/worlds_card_{wid}.svg') > 10000, got)
        check(f'launcher {wid}: code sheet has no page errors', not quiet(errs), quiet(errs)[:3])
        await ctx.close()
    # the phone layout (forced, since this browser has no AR)
    for wid in ['dairy', 'f1']:
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        pg = await ctx.new_page(); errs = watch(pg, f'phone {wid}')
        await pg.goto(f'{BASE}/ar/w/{wid}/?mode=inside&device=quicklook', wait_until='load', timeout=120000)
        await pg.wait_for_selector('#wl-big .w-mode', timeout=60000)
        first = await pg.get_attribute('#wl-big .w-mode.picked', 'data-mode')
        check(f'phone launcher {wid}: the mode from the link comes first', first == 'inside', first)
        await no_scroll(pg, 390, f'phone launcher {wid}')
        await pg.screenshot(path=f'{OUT}/worlds_phone_{wid}_390.png', full_page=True, timeout=120000)
        check(f'phone launcher {wid} has no page errors', not quiet(errs), quiet(errs)[:3])
        await ctx.close()
    await run_buttons(b)
    await b.close()


async def run_buttons(b=None):
    """Every page with a "View in AR" button: the buttons show, and on a computer the code sheet opens the right world."""
    own = b is None
    if own:
        b = await browser(PW)
    for wid, path in BUTTON_PAGES:
        for w, h in [(1440, 900), (390, 844)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
            pg = await ctx.new_page(); errs = watch(pg, f'{path} {w}')
            try:
                await pg.goto(BASE + path, wait_until='load', timeout=180000)
                try:
                    await pg.wait_for_selector('.war .war-btn', timeout=240000)
                    has = True
                except Exception:
                    has = False
                check(f'{path} at {w} px shows the View in AR buttons', has)
                await pg.wait_for_timeout(2500)
                await no_scroll(pg, w, path)
                if has:
                    await pg.locator('.war').first.scroll_into_view_if_needed(timeout=180000)
                    await pg.screenshot(path=f'{OUT}/worlds_page_{wid}_{w}.png', timeout=300000)
                    await pg.click('.war .war-btn[data-mode="table"]', timeout=180000)
                    await pg.wait_for_selector('.war-pop svg', timeout=120000)
                    await pg.wait_for_timeout(400)
                    await pg.locator('.war-pop').screenshot(path=f'{OUT}/worlds_button_pop_{wid}_{w}.png', timeout=180000)
                    got = decode_qr(f'{OUT}/worlds_button_pop_{wid}_{w}.png')
                    check(f'{path} at {w} px: the code sheet opens {wid} on a phone', got == f'{LIVE}/ar/w/{wid}/?mode=table', got)
                    await pg.screenshot(path=f'{OUT}/worlds_page_{wid}_{w}_code.png', timeout=300000)
                    await pg.keyboard.press('Escape')
                    check(f'{path} at {w} px: Escape closes the code sheet', await pg.locator('.war-pop').count() == 0)
                check(f'{path} at {w} px has no page errors', not quiet(errs), quiet(errs)[:3])
            except Exception as e:
                check(f'{path} at {w} px: page checks ran', False, repr(e)[:160])
            await ctx.close()
    if own:
        await b.close()


def run_files():
    import usd_check
    files = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'worlds', 'files')
    out = {}
    for wid in WORLD_IDS:
        for mode in ['table', 'inside']:
            u = os.path.join(files, f'{wid}-{mode}.usdz'); g = os.path.join(files, f'{wid}-{mode}.glb')
            if not check(f'{wid}-{mode}: USDZ and GLB exist', os.path.exists(u) and os.path.exists(g)):
                continue
            r = usd_check.check(u)
            check(f'{wid}-{mode}.usdz passes usdchecker --arkit ({r["arkit"]["checker"]}) and the USD validators', r['ok'], {'arkit': r['arkit']['errors'][:2] + r['arkit']['failed_checks'][:2], 'validators': r['validators'][:2]})
            check(f'{wid}-{mode}.usdz is under 20 MB', r['bytes'] < 20e6, f"{r['bytes'] / 1e6:.2f} MB, {r['triangles']:,} triangles, {r['size_m']} m, loop {r['seconds']} s")
            head = open(g, 'rb').read(12)
            check(f'{wid}-{mode}.glb is a glTF 2 binary', head[:4] == b'glTF' and struct.unpack('<I', head[4:8])[0] == 2, f'{os.path.getsize(g) / 1e6:.2f} MB')
            out[f'{wid}-{mode}'] = {'usdz_mb': round(r['bytes'] / 1e6, 2), 'glb_mb': round(os.path.getsize(g) / 1e6, 2), 'triangles': r['triangles'], 'size_m': r['size_m'], 'animated_s': r['seconds']}
    RESULTS['files'] = out


XR_SETUP = r"""
(() => {
  if (!window.IWER || window.__iwer) return;
  const d = new IWER.XRDevice(IWER.metaQuest3);
  const room = document.createElement('canvas'); room.width = 512; room.height = 512;
  const g = room.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#cfc8c2'); gr.addColorStop(0.52, '#bdb5ae'); gr.addColorStop(0.53, '#8c7f74'); gr.addColorStop(1, '#6f6359'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  room.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  // a synthetic environment with one floor at y = 0: a hit test returns where the ray meets it
  d[IWER.P_DEVICE].sem = { environmentCanvas: room, trackedPlanes: new Set(), trackedMeshes: new Set(), render() {},
    computeHitTestResults(m) { const ox = m[12], oy = m[13], oz = m[14], dx = -m[8], dy = -m[9], dz = -m[10]; if (dy > -1e-4) return [];
      const t = -oy / dy; if (t < 0 || t > 20) return []; const r = new Float32Array(16); r[0] = r[5] = r[10] = r[15] = 1; r[12] = ox + dx * t; r[14] = oz + dz * t; return [r]; } };
  d.installRuntime({ forceInstall: true });
  d.position.set(0, 1.5, 0); const a = -0.7; d.quaternion.set(Math.sin(a / 2), 0, 0, Math.cos(a / 2));
  window.__iwer = d;
})();
"""


async def xr_session(b, path, name):
    ctx = await b.new_context(viewport={'width': 412, 'height': 860})
    await ctx.add_init_script(open(os.environ['IWER']).read() + '\n' + XR_SETUP)
    pg = await ctx.new_page(); errs = watch(pg, name)
    await pg.goto(BASE + path, wait_until='load', timeout=120000)
    await pg.wait_for_selector('#wl-big .w-mode', timeout=60000)
    await pg.click('#wl-big .w-mode.picked')
    await pg.wait_for_function('window.__arxr && window.__arxr.session', timeout=60000)
    check(f'{name}: the immersive-ar session starts from the tap', True)
    await pg.evaluate('window.__arxr.renderer.domElement.style.display = "block"')
    await pg.wait_for_function('window.__arxr.world && window.__arxr.reticle.visible', timeout=420000)
    check(f'{name}: hit-test finds the floor and shows the ring', True)
    return ctx, pg, errs


async def run_xr(p):
    if not os.environ.get('IWER'):
        check('xr: IWER points at iwer.min.js (npm install iwer)', False); return
    b = await browser(p)
    # a table world: placed with the headset's trigger, builds itself
    ctx, pg, errs = await xr_session(b, '/ar/w/claw/?mode=table', 'xr claw table')
    await pg.evaluate('window.__iwer.controllers.right.updateButtonValue("trigger", 1)'); await pg.wait_for_timeout(600)
    await pg.evaluate('window.__iwer.controllers.right.updateButtonValue("trigger", 0)'); await pg.wait_for_timeout(600)
    check('xr claw table: the trigger (an XR select) places it', await pg.evaluate('window.__arxr.placed'))
    await pg.wait_for_timeout(300); await pg.screenshot(path=f'{OUT}/xr_claw_assembling.png', timeout=300000)
    await pg.wait_for_function('window.__arxr.assembled', timeout=300000)
    check('xr claw table: it builds itself piece by piece, then runs', True)
    await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{OUT}/xr_claw_table.png', timeout=300000)
    check('xr claw table: no page errors', not quiet(errs), quiet(errs)[:3]); await ctx.close()
    # the live sims tick
    for wid, read in [('dairy', 'window.__arxr.world.sim.t'), ('ed', 'window.__arxr.world.status()'), ('dc', 'window.__arxr.world.status()')]:
      try:
        ctx, pg, errs = await xr_session(b, f'/ar/w/{wid}/?mode=table&motion=reduce', f'xr {wid} table')
        await pg.evaluate('window.__arxr.place()')
        await pg.wait_for_function('window.__arxr.placed', timeout=60000)
        a = await pg.evaluate(read); await pg.wait_for_timeout(9000); z = await pg.evaluate(read)
        check(f'xr {wid} table: the model keeps running ({a} → {z})', a != z)
        labels = await pg.evaluate('[...document.querySelectorAll(".wxr-chip")].map(e => e.textContent)')
        sos = await pg.evaluate('(document.querySelector(".wxr-sos") || {}).textContent || ""')
        credit = await pg.evaluate('document.querySelector(".wxr-credit").textContent')
        check(f'xr {wid} table: the truth labels and the SimReady credit show in AR', 'Simulated' in labels and 'NVIDIA SimReady (CC BY 4.0)' in credit and (wid != 'ed' or '111' in sos), {'labels': labels, 'sos': sos[:40]})
        RESULTS.setdefault('xr', {})[wid] = {'calls': await pg.evaluate('window.__arxr.calls'), 'fps_emulated': await pg.evaluate('window.__arxr.fps')}
        await pg.screenshot(path=f'{OUT}/xr_{wid}_table.png', timeout=300000)
        check(f'xr {wid} table: no page errors', not quiet(errs), quiet(errs)[:3]); await ctx.close()
      except Exception as e:
        check(f'xr {wid} table: checks ran', False, repr(e)[:160])
    # step inside: the doorway, then walk through it
    for wid in ['cafe', 'ed']:
      try:
        ctx, pg, errs = await xr_session(b, f'/ar/w/{wid}/?mode=inside&motion=reduce', f'xr {wid} inside')
        await pg.evaluate('window.__arxr.place()')
        await pg.wait_for_function('window.__arxr.placed', timeout=60000)
        await pg.evaluate('(() => { const d = window.__iwer; d.position.set(0.5, 1.5, 0.6); const a = -0.12; d.quaternion.set(Math.sin(a / 2), 0, 0, Math.cos(a / 2)); })()')
        await pg.wait_for_timeout(2500)
        check(f'xr {wid} inside: the doorway stands in the room, world behind it (outside)', not await pg.evaluate('window.__arxr.portal.inside'))
        await pg.screenshot(path=f'{OUT}/xr_{wid}_portal_outside.png', timeout=300000)
        for z in [0.0, -0.6, -1.2, -1.6, -2.0, -2.6, -3.2]:
            await pg.evaluate(f'window.__iwer.position.set(0.05, 1.5, {z})'); await pg.wait_for_timeout(700)
        check(f'xr {wid} inside: walking through the doorway puts you inside', await pg.evaluate('window.__arxr.portal.inside'))
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{OUT}/xr_{wid}_portal_inside.png', timeout=300000)
        await pg.evaluate('window.__iwer.quaternion.set(0, 1, 0, 0)'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{OUT}/xr_{wid}_portal_lookback.png', timeout=300000)
        check(f'xr {wid} inside: no page errors', not quiet(errs), quiet(errs)[:3]); await ctx.close()
      except Exception as e:
        check(f'xr {wid} inside: checks ran', False, repr(e)[:160])
    await b.close()


async def main():
    t = time.time()
    async with async_playwright() as p:
        if PARTS & {'studio', 'qr', 'viewer'}:
            await run_studio(p)
        if 'layout' in PARTS:
            await run_layout(p)
        if 'embed' in PARTS:
            await run_embed(p)
        if 'machines' in PARTS:
            await run_machines(p)
        global PW
        PW = p
        if 'worlds' in PARTS:
            await run_worlds(p)
        elif 'buttons' in PARTS:
            await run_buttons()
        if 'xr' in PARTS:
            await run_xr(p)
    if 'files' in PARTS:
        run_files()
    passed = sum(c['ok'] for c in RESULTS['checks'])
    print(f'\n{passed}/{len(RESULTS["checks"])} checks passed in {round(time.time() - t)} s')
    with open(f'{OUT}/results-{"-".join(sorted(PARTS))}.json', 'w') as f:
        json.dump(RESULTS, f, indent=1, default=str)

asyncio.run(main())
