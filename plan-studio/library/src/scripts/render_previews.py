"""Render a preview still for every staged GLB and measure its bounds, in headless Chrome (SwiftShader WebGL).

usage: python3 -I scripts/render_previews.py [id ...]
writes public/previews/<id>.webp (720 px) and .cache/measure.json ({id: {bounds: [x,y,z] metres, swatch: '#rrggbb'}})
"""
import base64, functools, http.server, io, json, os, socketserver, sys, threading, time
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from inventory_data import VIEW

items = json.load(open(os.path.join(ROOT, '.cache', 'render-list.json')))
only = set(sys.argv[1:])
mpath = os.path.join(ROOT, '.cache', 'measure.json')
meas = json.load(open(mpath)) if os.path.exists(mpath) else {}
os.makedirs(os.path.join(ROOT, 'public', 'previews'), exist_ok=True)
BG = (0xF3, 0xEE, 0xE9)

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass
Handler = functools.partial(Quiet, directory=ROOT)
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()


def swatch(im):
    """median colour of the pixels that are clearly not ground or shadow"""
    small = im.resize((180, 180))
    data = small.get_flattened_data() if hasattr(small, 'get_flattened_data') else small.getdata()
    px = [p for p in data if sum(abs(a - b) for a, b in zip(p, BG)) > 60]
    if len(px) < 30:
        return None
    chans = [sorted(c[i] for c in px)[len(px) // 2] for i in range(3)]
    return '#%02x%02x%02x' % tuple(chans)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 1100})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(f'http://127.0.0.1:{port}/.cache/render/index.html')
    pg.wait_for_function('window.ready === true', timeout=60000)
    for it in items:
        if only and it['id'] not in only:
            continue
        t = time.time()
        r = pg.evaluate('([u, o]) => window.renderOne(u, o)', [f"/public/{it['glb']}", VIEW.get(it['id'], {})])
        im = Image.open(io.BytesIO(base64.b64decode(r['png'].split(',', 1)[1]))).convert('RGB')
        im = im.resize((720, 720), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'public', 'previews', it['id'] + '.webp'), 'WEBP', quality=80, method=6)
        meas[it['id']] = {'bounds': r['bounds'], 'min': r['min'], 'swatch': swatch(im)}
        print(it['id'], [round(x, 3) for x in r['bounds']], meas[it['id']]['swatch'], f'{time.time() - t:.1f}s', flush=True)
        json.dump(meas, open(mpath, 'w'), indent=1)
    for e in errs:
        print('ERR', e[:300])
    b.close()
