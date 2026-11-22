#!/usr/bin/env python3
"""Make the asset library's pictures and manifest, so they can be redone after any change to a piece.

    python3 -I tools/library-shots.py --tb BUILD_DIR [--ids LIB-SEAT-01,...] [--frames 40] [--measure-only]
                                      [--still OUT.png --id ID --opts '{"dist":1.0}']

BUILD_DIR is a folder with three r187 and vite installed (node_modules), as the 3D page's own build uses. The script
copies plan-studio/twins/src into it, builds the tool page src/library-shots.html (not deployed), serves it with the
GLB library beside it, and drives it in headless Chromium (software rendering: SwiftShader). For each catalogue piece
it measures the built model (bounds in mm, triangles) and renders its picture in the studio (library/studio.ts:
soft key, sky fill, contact shadows, AgX, a light grade, jittered sub-frames averaged, a little depth of field).

Writes: plan-studio/twins/library/pics/<id>.webp (800 x 800, at most 60 KB each) and plan-studio/twins/library/
catalogue.json (the manifest the ops page reads without loading three.js). Frames are averaged in memory: nothing is
left on disk but the pictures.
"""
import argparse, base64, functools, http.server, io, json, os, shutil, socketserver, subprocess, sys, threading, time
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TWINS = os.path.join(ROOT, 'plan-studio', 'twins')
OUT = os.path.join(TWINS, 'library')
LIMIT = 60 * 1024


def build(tb):
    src = os.path.join(TWINS, 'src')
    for d in ('twin', 'objects'):
        shutil.rmtree(os.path.join(tb, 'src', d), ignore_errors=True)
        shutil.copytree(os.path.join(src, d), os.path.join(tb, 'src', d))
    shutil.copy(os.path.join(src, 'library-shots.html'), os.path.join(tb, 'src', 'library-shots.html'))
    cfg = os.path.join(tb, 'vite.shots.config.ts')
    with open(cfg, 'w') as f:
        f.write("import { defineConfig } from 'vite';\nexport default defineConfig({ root: 'src', base: './', build: { target: 'esnext', outDir: '../dist-shots', emptyOutDir: true, chunkSizeWarningLimit: 8000, rollupOptions: { input: 'src/library-shots.html' } } });\n")
    r = subprocess.run(['npx', 'vite', 'build', '--config', 'vite.shots.config.ts'], cwd=tb, capture_output=True, text=True)
    if r.returncode:
        sys.exit('build failed:\n' + r.stdout[-3000:] + r.stderr[-3000:])
    dist = os.path.join(tb, 'dist-shots')
    link = os.path.join(dist, 'twin')
    if not os.path.exists(link):
        os.symlink(os.path.join(TWINS, 'drop', 'twin'), link)  # the GLB library, read in place
    return dist


def serve(root):
    class H(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.txt': 'text/plain'}
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    s = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(H, directory=root))
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, s.server_address[1]


def webp(png_bytes, path):
    from PIL import Image
    im = Image.open(io.BytesIO(png_bytes)).convert('RGB')
    for q in range(88, 40, -4):
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
        if buf.tell() <= LIMIT: break
    with open(path, 'wb') as f: f.write(buf.getvalue())
    return buf.tell(), q


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tb', required=True)
    ap.add_argument('--ids', default='')
    ap.add_argument('--frames', type=int, default=40)
    ap.add_argument('--measure-only', action='store_true')
    ap.add_argument('--no-build', action='store_true')
    ap.add_argument('--still', default='')
    ap.add_argument('--id', default='')
    ap.add_argument('--opts', default='{}')
    a = ap.parse_args()
    dist = os.path.join(a.tb, 'dist-shots') if a.no_build else build(a.tb)
    srv, port = serve(dist)
    from playwright.sync_api import sync_playwright
    flags = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    with sync_playwright() as p:
        b = p.chromium.launch(args=flags)
        pg = b.new_page(viewport={'width': 820, 'height': 860})
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        pg.goto(f'http://127.0.0.1:{port}/library-shots.html')
        pg.wait_for_function("document.getElementById('status').textContent === 'Ready'", timeout=120000)
        if a.still:
            r = pg.evaluate('([id, o]) => window.__lib.shoot(id, o)', [a.id, json.loads(a.opts)])
            if 'error' in r: sys.exit(r['error'])
            with open(a.still, 'wb') as f: f.write(base64.b64decode(r['png'].split(',', 1)[1]))
            print(json.dumps({k: v for k, v in r.items() if k != 'png'}))
            for l in logs[-10:]: print(l[:300])
            b.close(); srv.shutdown(); return
        cat = pg.evaluate('window.__lib.catalogue()')
        ids = [i for i in a.ids.split(',') if i] or [c['id'] for c in cat]
        man_path = os.path.join(OUT, 'catalogue.json')
        old = {}
        if os.path.exists(man_path):
            with open(man_path) as f: old = {x['id']: x for x in json.load(f).get('items', [])}
        os.makedirs(os.path.join(OUT, 'pics'), exist_ok=True)
        got = {}
        for i in ids:
            t0 = time.time()
            m = pg.evaluate('id => window.__lib.measure(id)', i)
            if 'error' in m: print(i, m['error']); continue
            row = {'measured': {'w': m['w'], 'd': m['d'], 'h': m['h']}, 'tris': m['tris']}
            if not a.measure_only:
                r = pg.evaluate('([id, f]) => window.__lib.shoot(id, { frames: f })', [i, a.frames])
                n, q = webp(base64.b64decode(r['png'].split(',', 1)[1]), os.path.join(OUT, 'pics', f'{i}.webp'))
                row.update({'picBytes': n, 'picQuality': q, 'renderMs': r['ms']})
            got[i] = row
            print(f"{i:14} {m['w']:5} x {m['d']:5} x {m['h']:5} mm  {m['tris']:7} tris  {row.get('picBytes', '-')} B  {time.time() - t0:.1f} s", flush=True)
        stats = pg.evaluate('window.__lib.texStats()')
        b.close()
    srv.shutdown()
    items = []
    for c in cat:
        prev = old.get(c['id'], {})
        row = {**c, **{k: prev[k] for k in ('measured', 'tris', 'picBytes', 'picQuality', 'renderMs') if k in prev}, **got.get(c['id'], {})}
        items.append(row)
    cats = json.loads(subprocess.run(['node', '-e', "import('" + os.path.join(TWINS, 'src', 'twin', 'library', 'catalogue.ts') + "').then(m => console.log(JSON.stringify({ categories: m.CATEGORIES, rooms: m.ROOMS })))"], capture_output=True, text=True).stdout)
    man = {
        'schema': 'assembl.library.v1',
        'built': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'note': 'Written by tools/library-shots.py from plan-studio/twins/src/twin/library/catalogue.ts. Pictures: studio renders of the models themselves, not photographs. Dimensions: the model bounds, checked against the built model (measured).',
        'base': '/plan-studio/twins/library/',
        **cats,
        'items': items,
    }
    with open(man_path, 'w') as f: json.dump(man, f, ensure_ascii=False, indent=1); f.write('\n')
    print('textures made on the page:', stats)
    for l in logs[-15:]: print(l[:300])


if __name__ == '__main__':
    main()
