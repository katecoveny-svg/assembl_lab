"""Render a still of each bird from the live 3D model (headless Chrome, SwiftShader WebGL),
with its anchor points, for the pages' first picture, the no-WebGL fallback and the cards.

usage: python3 -I scripts/stills.py BASE_URL OUT_DIR [bird ...]
BASE_URL is a vite dev server for this folder, e.g. http://127.0.0.1:5181/manu/
"""
import sys, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

FLORA = {'tui': 'kowhai', 'korimako': 'kowhai', 'piwakawaka': 'manuka', 'tauhou': 'pohutukawa',
         'miromiro': 'manuka', 'toutouwai': 'manuka', 'hihi': 'pohutukawa', 'kereru': 'kowhai'}
base, out = sys.argv[1], Path(sys.argv[2])
birds = sys.argv[3:] or list(FLORA)
out.mkdir(parents=True, exist_ok=True)
flags = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
meta = {}
mp = out / 'stills.json'
if mp.exists():
    meta = json.loads(mp.read_text())
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=flags)
    for bird in birds:
        pg = b.new_page(viewport={'width': 1000, 'height': 800}, device_scale_factor=2)
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        pg.goto(f"{base}harness/still.html?bird={bird}&flora={FLORA[bird]}&perch={base}public/models/perch.glb")
        t0 = time.time()
        st = None
        while time.time() - t0 < 240:
            time.sleep(1)
            st = pg.evaluate('window.__still || null')
            if st and st.get('ready'): break
        if not st or st.get('error'):
            print(bird, 'FAILED', st, logs[-5:]); continue
        png = out / f'{bird}.png'
        pg.screenshot(path=str(png), omit_background=True, timeout=180000)
        meta[bird] = {'anchors': st['anchors'], 'w': 1000, 'h': 800}
        print(bird, 'ok', time.time() - t0)
        for l in logs:
            if 'GL Driver' not in l and 'vite' not in l and 'GPU stall' not in l: print('   ', l[:200])
        pg.close()
    b.close()
mp.write_text(json.dumps(meta, indent=1))
