"""Make the AR worlds' files: a GLB (Scene Viewer) and a USDZ (AR Quick Look) for every world and mode.

  python3 ar/tools/build_worlds.py http://127.0.0.1:8964 [ids] [modes] [--posters]
    e.g. python3 ar/tools/build_worlds.py http://127.0.0.1:8964 dairy,claw table,inside
         python3 ar/tools/build_worlds.py http://127.0.0.1:8964 all table --posters   (also the 640 x 480 gallery posters)

Serve the repo root first (python3 -m http.server 8964). Needs: playwright with Chromium, usd-core, numpy.
Each world is built by the same code as the live AR (ar/worlds/scenes.js) in a headless browser, frozen at its starting
moment, and written by ar/worlds/export.js: still parts merged by material under a triangle budget, a few moving parts
with a short loop. Then ar/tools/glb2usdz.py makes the USDZ and ar/tools/usd_check.py checks it (usdchecker --arkit).
Output: ar/worlds/files/<id>-<mode>.glb and .usdz, and ar/worlds/files/manifest.json (sizes, triangles, checks).
The GLBs for Scene Viewer are then Draco-compressed by ar/tools/draco_glb.mjs if node and its packages are installed:
  npm install --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 draco3dgltf@1.5
usdchecker --arkit: see ar/tools/usd_check.py (usd-core 26 needs USD_COMPLIANCE_CHECKER pointing at OpenUSD's
complianceChecker.py).
"""
import asyncio, base64, json, os, shutil, subprocess, sys, time
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import glb2usdz, usd_check  # noqa: E402

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8964'
ALL = ['f1', 'claw', 'heart', 'earth', 'dairy', 'ed', 'dc', 'cafe']
IDS = [a for a in sys.argv if a != '--posters'][2].split(',') if len([a for a in sys.argv if a != '--posters']) > 2 and [a for a in sys.argv if a != '--posters'][2] != 'all' else ALL
POSTERS = '--posters' in sys.argv
ARGV = [a for a in sys.argv if a != '--posters']
MODES = ARGV[3].split(',') if len(ARGV) > 3 else ['table', 'inside']
OUT = os.path.join(HERE, '..', 'worlds', 'files')
# triangle budgets: phones in Quick Look stay smooth around 100 to 200 thousand; life size gets a little more detail
BUDGET = {'table': 120000, 'inside': 160000}
LIMIT_MB = 20
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']


def draco_glb(path):
    """Scene Viewer gets a Draco-compressed GLB (ar/tools/draco_glb.mjs). Without node and the gltf-transform packages
    the uncompressed GLB is kept, and the manifest says so."""
    if not shutil.which('node'):
        return False
    tmp = path + '.draco.glb'
    r = subprocess.run(['node', os.path.join(HERE, 'draco_glb.mjs'), path, tmp], capture_output=True, text=True)
    if r.returncode or not os.path.exists(tmp):
        print('  (Draco skipped: ' + (r.stderr.strip().splitlines() or ['?'])[-1][:160] + ')', flush=True)
        return False
    os.replace(tmp, path)
    return True


async def main():
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for wid in IDS:
            for mode in MODES:
                t0 = time.time()
                pg = await b.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
                await pg.goto(BASE + '/ar/tools/export-worlds.html', wait_until='load')
                await pg.wait_for_function('window.__ready', timeout=60000)
                tex = 2048 if (wid == 'earth' and mode == 'inside') else 1024   # the giant Earth keeps its full NASA picture
                r = await pg.evaluate('([id, mode, max, tex]) => window.__export(id, mode, { maxTriangles: max, maxTexture: tex })', [wid, mode, BUDGET[mode], tex])
                await pg.close()
                glb = os.path.join(OUT, f'{wid}-{mode}.glb'); usdz = os.path.join(OUT, f'{wid}-{mode}.usdz')
                open(glb, 'wb').write(base64.b64decode(r['b64']))
                st = glb2usdz.convert(glb, usdz)
                raw_glb = os.path.getsize(glb)
                draco = draco_glb(glb)
                chk = usd_check.check(usdz)
                rep = r['report']
                entry = {'glb_bytes': os.path.getsize(glb), 'glb_draco': draco, 'glb_bytes_uncompressed': raw_glb, 'usdz_bytes': os.path.getsize(usdz), 'triangles': chk['triangles'], 'triangles_before': rep['trianglesBefore'],
                         'size_m': rep['size'], 'scale': rep['scale'], 'moving_parts': rep['moving'], 'loop_seconds': rep['duration'], 'animated_tracks': rep['animated'],
                         'usdchecker_arkit': {'ok': not chk['arkit']['errors'] and not chk['arkit']['failed_checks'], 'checker': chk['arkit']['checker'], 'errors': chk['arkit']['errors'][:5], 'failed': chk['arkit']['failed_checks'][:5], 'warnings': chk['arkit'].get('warnings', [])[:3]},
                         'usd_validators': chk['validators'][:5], 'dropped': rep['dropped'][:6], 'page_errors': errs[:3], 'seconds_to_build': round(time.time() - t0)}
                entry['ok'] = entry['usdchecker_arkit']['ok'] and not chk['validators'] and entry['usdz_bytes'] < LIMIT_MB * 1e6 and not errs
                manifest[f'{wid}-{mode}'] = entry
                json.dump(manifest, open(mpath, 'w'), indent=1, sort_keys=True)
                print(('OK   ' if entry['ok'] else 'FAIL ') + f"{wid}-{mode}: glb {entry['glb_bytes']/1e6:.2f} MB, usdz {entry['usdz_bytes']/1e6:.2f} MB, {entry['triangles']:,} triangles, "
                      f"{rep['moving']} moving parts, {entry['seconds_to_build']} s", entry['usdchecker_arkit']['errors'][:2], entry['usdchecker_arkit']['failed'][:2], chk['validators'][:2], errs[:2], flush=True)
        if POSTERS:
            await posters(b)
        await b.close()


async def posters(b):
    import io
    from PIL import Image
    out = os.path.join(HERE, '..', 'worlds', 'posters'); os.makedirs(out, exist_ok=True)
    for wid in IDS:
        pg = await b.new_page(viewport={'width': 1280, 'height': 960}, device_scale_factor=1)
        await pg.goto(f'{BASE}/ar/tools/world-poster.html?w={wid}&mode=table&frames=6&motion=reduce&capture', wait_until='load')
        await pg.wait_for_function('document.documentElement.classList.contains("still") || window.__err.length', timeout=600000)
        png = await pg.locator('canvas').screenshot(timeout=300000)
        Image.open(io.BytesIO(png)).convert('RGB').resize((640, 480), Image.LANCZOS).save(os.path.join(out, f'{wid}.webp'), 'WEBP', quality=82, method=6)
        print('poster', wid, flush=True)
        await pg.close()

asyncio.run(main())
