"""Screenshots of the Manu pages, served from the lab clone (headless Chrome, SwiftShader WebGL).

usage: python3 -I scripts/shots.py OUT_PREFIX URL WIDTHxHEIGHT [--full] [--wait-live] [--reduced] [--nowebgl] [--js 'code']
Prints console errors and the stage status. Writes OUT_PREFIX.png
"""
import sys, time
from playwright.sync_api import sync_playwright
a = sys.argv[1:]
prefix, url, size = a[0], a[1], a[2]
w, h = map(int, size.split('x'))
full = '--full' in a
wait_live = '--wait-live' in a
reduced = '--reduced' in a
nowebgl = '--nowebgl' in a
js = a[a.index('--js') + 1] if '--js' in a else None
flags = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
if nowebgl:
    flags = ['--disable-webgl', '--disable-3d-apis']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=flags)
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, reduced_motion='reduce' if reduced else 'no-preference', is_mobile=w < 700, has_touch=w < 700)
    pg = ctx.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.on('requestfailed', lambda r: logs.append(f'REQFAIL: {r.url}'))
    pg.on('response', lambda r: logs.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
    pg.goto(url, wait_until='load')
    t0 = time.time()
    if wait_live:
        while time.time() - t0 < 200:
            time.sleep(1)
            if pg.evaluate("!!document.querySelector('.mt-stage.live, .mt-stage.no-webgl')"): break
        time.sleep(3)
    else:
        time.sleep(2.5)
    if js:
        try:
            r = pg.evaluate(js)
            if r is not None: print('JS:', str(r)[:2000])
        except Exception as e: print('JS error', e)
        time.sleep(3)
    print('stage:', pg.evaluate("(()=>{const s=document.querySelector('.mt-stage');return s?s.className+' | '+(document.querySelector('.mt-stage-msg')||{}).textContent:'(none)'})()"), 'after', round(time.time() - t0), 's')
    print('scrollWidth', pg.evaluate('document.documentElement.scrollWidth'), 'viewport', w)
    pg.screenshot(path=f'{prefix}.png', full_page=full, timeout=180000)
    for l in logs:
        if 'GL Driver' not in l and 'KHR_parallel' not in l and 'GPU stall' not in l: print('  ', l[:300])
    b.close()
