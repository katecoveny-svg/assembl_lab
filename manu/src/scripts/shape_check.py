"""Shape check for the Manu birds: orthographic silhouettes of each model (side, front, top)
from harness/shape.html, overlaid on reference outlines traced from photographs, with the
overlap reported as IoU (intersection over union, 1 = identical).

usage: python3 -I scripts/shape_check.py BASE_URL REF_DIR OUT_DIR [bird ...]
  BASE_URL  vite dev server for this folder, e.g. http://127.0.0.1:5181/manu/
  REF_DIR   folder of <bird>.png reference masks (white bird on black, bill to the right,
            legs and perch removed). Reference photos are study material only: they and their
            masks are never committed or shipped.
Writes OUT_DIR/<bird>-<view>.png silhouettes, OUT_DIR/<bird>-overlay.png and prints JSON.
Legs are left out of the side comparison on both sides (the model's 'without legs' pass).
"""
import sys, json, time, base64, io
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

BIRDS = ['tui', 'korimako', 'piwakawaka', 'tauhou', 'miromiro', 'toutouwai', 'hihi', 'kereru']
REFS = {'tui': 'tui_12', 'korimako': 'korimako_17', 'piwakawaka': 'piwakawaka_12', 'tauhou': 'tauhou_20',
        'miromiro': 'miromiro_17', 'toutouwai': 'toutouwai_13', 'hihi': 'hihi_03', 'kereru': 'kereru_11'}
base, refdir, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
birds = sys.argv[4:] or BIRDS
out.mkdir(parents=True, exist_ok=True)

def mask_of(data_url):
    im = Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('RGBA')
    return (np.asarray(im)[:, :, 3] > 100)

def crop(m):
    ys, xs = np.nonzero(m)
    return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def norm(m, n=400):
    """crop, scale so the longer side is n px, centre on a (n*1.5)^2 canvas by centroid"""
    c = crop(m)
    s = n / max(c.shape)
    im = Image.fromarray((c * 255).astype(np.uint8)).resize((max(1, int(c.shape[1] * s)), max(1, int(c.shape[0] * s))), Image.BILINEAR)
    a = np.asarray(im) > 127
    N = int(n * 1.6)
    canvas = np.zeros((N, N), bool)
    ys, xs = np.nonzero(a)
    cy, cx = ys.mean(), xs.mean()
    oy, ox = int(N / 2 - cy), int(N / 2 - cx)
    canvas[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return canvas

def transform(m, ang, sc):
    im = Image.fromarray((m * 255).astype(np.uint8))
    N = m.shape[0]
    im = im.rotate(ang, resample=Image.BILINEAR, center=(N / 2, N / 2))
    w = int(N * sc)
    im = im.resize((w, w), Image.BILINEAR)
    a = np.asarray(im) > 127
    res = np.zeros_like(m)
    if sc >= 1:
        o = (w - N) // 2
        res = a[o:o + N, o:o + N]
    else:
        o = (N - w) // 2
        res[o:o + w, o:o + w] = a
    return res

def recentre(a):
    ys, xs = np.nonzero(a)
    N = a.shape[0]
    return np.roll(np.roll(a, int(N / 2 - ys.mean()), 0), int(N / 2 - xs.mean()), 1)

def iou(a, b):
    return (a & b).sum() / max((a | b).sum(), 1)

def best_fit(model, ref):
    """similarity fit of the model onto the reference: rotation and scale about the centroid
    (the photo's perch and camera tilt differ), small shifts, by IoU"""
    M = norm(model)
    R = norm(ref)
    best = (0, 0, 1, 0, 0)
    for ang in range(-8, 9, 4):
        for sc in (0.85, 0.92, 1.0, 1.08, 1.16):
            t = recentre(transform(M, ang, sc))
            for dy in (-12, 0, 12):
                for dx in (-12, 0, 12):
                    v = iou(np.roll(np.roll(t, dy, 0), dx, 1), R)
                    if v > best[0]: best = (v, ang, sc, dy, dx)
    v, ang, sc, dy, dx = best
    # refine (camera tilt only: posture is part of the shape, so rotation stays within 10 degrees)
    for a2 in [a for a in (ang - 2, ang - 1, ang, ang + 1, ang + 2) if abs(a) <= 10]:
        for s2 in (sc - 0.04, sc - 0.02, sc, sc + 0.02, sc + 0.04):
            t = recentre(transform(M, a2, s2))
            for dy2 in (dy - 6, dy, dy + 6):
                for dx2 in (dx - 6, dx, dx + 6):
                    w = iou(np.roll(np.roll(t, dy2, 0), dx2, 1), R)
                    if w > best[0]: best = (w, a2, s2, dy2, dx2)
    v, ang, sc, dy, dx = best
    fitted = np.roll(np.roll(recentre(transform(M, ang, sc)), dy, 0), dx, 1)
    return v, fitted, R, ang

flags = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
report = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=flags)
    for bird in birds:
        report[bird] = {}
        for view in ('side', 'front', 'top'):
            pg = b.new_page(viewport={'width': 900, 'height': 700})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'{base}harness/shape.html?bird={bird}&view={view}')
            st = None
            t0 = time.time()
            while time.time() - t0 < 120:
                time.sleep(0.5)
                st = pg.evaluate('window.__shape ? {ready: true} : null')
                if st: break
            if not st:
                print(bird, view, 'FAILED', errs); pg.close(); continue
            st = pg.evaluate('window.__shape')
            pg.close()
            for k, d in st['images'].items():
                Image.open(io.BytesIO(base64.b64decode(d.split(',', 1)[1]))).save(out / f'{bird}-{view}-{k}.png')
            if view == 'side':
                report[bird]['measures'] = st['measures']
                report[bird]['px'] = st['px']
                report[bird]['pxPerUnit'] = st['pxPerUnit']
                body = mask_of(st['images']['noLegs'])
                billm = mask_of(st['images']['bill']) & ~mask_of(st['images']['noBill'])
                # visible bill: its extent beyond the feathers, in model units
                report[bird]['billVisible'] = round(int(billm.any(axis=0).sum()) / st['pxPerUnit'], 4)
                legs = mask_of(st['images']['all']) & ~body
                report[bird]['tarsusVisible'] = round(int(legs.any(axis=1).sum()) / st['pxPerUnit'], 4)
                ref = refdir / f'{REFS[bird]}.png'
                if ref.exists():
                    r = np.asarray(Image.open(ref).convert('L')) > 127
                    v, fitted, R, ang = best_fit(body, r)
                    report[bird]['iou_side'] = round(float(v), 3)
                    report[bird]['fit_angle'] = ang
                    ov = np.zeros(R.shape + (3,), np.uint8) + 255
                    ov[R & ~fitted] = (230, 60, 60)      # in the photo only
                    ov[fitted & ~R] = (40, 120, 230)     # in the model only
                    ov[R & fitted] = (60, 60, 60)        # both
                    Image.fromarray(ov).save(out / f'{bird}-overlay.png')
        print(bird, json.dumps({k: v for k, v in report[bird].items() if k in ('iou_side', 'fit_angle', 'billVisible', 'tarsusVisible')}))
    b.close()
(out / 'report.json').write_text(json.dumps(report, indent=1))
