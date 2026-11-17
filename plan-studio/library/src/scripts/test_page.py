"""Playwright checks for the design inventory in headless Chrome (SwiftShader WebGL).

usage: python3 -I scripts/test_page.py BASE_URL OUT_DIR [--only NAME]
BASE_URL is the page, e.g. http://127.0.0.1:8355/plan-studio/library/
Writes screenshots to OUT_DIR and prints one line per check. Exits non-zero if a check fails.
"""
import hashlib, json, struct, sys, time, urllib.request
from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
FLAGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok)))
    print(('PASS' if ok else 'FAIL'), name, detail, flush=True)


def new_page(b, w, h, mobile=False, rm=False, logs=None):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1 if not mobile else 2, is_mobile=mobile, has_touch=mobile, reduced_motion='reduce' if rm else 'no-preference', accept_downloads=True)
    pg = ctx.new_page()
    if logs is not None:
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        pg.on('requestfailed', lambda r: logs.append(f'REQFAIL: {r.url} {r.failure}'))
    return ctx, pg


def wait_live_shelf(pg, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.evaluate("document.querySelector('.card.is-active')?.dataset.mode === 'live'"):
            return True
        time.sleep(0.5)
    return False


def wait_detail(pg, state='live', timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = pg.evaluate("document.querySelector('.d-stage')?.dataset.state")
        if s == state:
            return True
        if s == 'failed' and state != 'failed':
            return False
        time.sleep(0.4)
    return False


def glb_ok(data, expect):
    magic, ver, length = struct.unpack('<4sII', data[:12])
    return magic == b'glTF' and ver == 2 and length == len(data) == expect['bytes'] and hashlib.sha256(data).hexdigest() == expect['sha256']


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=FLAGS)
    cat = json.loads(urllib.request.urlopen(base + 'catalogue.json').read())
    items = {i['id']: i for i in cat['items']}

    # ------------------------------------------------------------------ desktop
    if not only or only == 'desktop':
        logs = []
        ctx, pg = new_page(b, 1440, 900, logs=logs)
        pg.goto(base)
        pg.wait_for_function("document.documentElement.classList.contains('ready')", timeout=30000)
        time.sleep(1.5)
        pg.screenshot(path=f'{out}/d1-hero.png')
        check('page ready with 78 cards', pg.evaluate("document.querySelectorAll('.card').length") == 78)
        check('lab nav injected', pg.evaluate("!!document.getElementById('al-nav')"))
        pg.evaluate("document.getElementById('shelf').scrollIntoView()")
        check('shelf model goes live', wait_live_shelf(pg), pg.evaluate("document.querySelector('.card.is-active')?.dataset.id"))
        time.sleep(1.2)
        pg.screenshot(path=f'{out}/d2-shelf.png')
        first = pg.evaluate("document.querySelector('.cap-title .line:not(.out)').textContent")
        pg.focus('.card.is-active .card-btn')
        pg.keyboard.press('ArrowRight')
        pg.keyboard.press('ArrowRight')
        time.sleep(1.2)
        second = pg.evaluate("document.querySelector('.cap-title .line:not(.out)').textContent")
        check('arrow keys move the shelf', first != second, f'{first!r} -> {second!r}')
        check('focus follows the active card', pg.evaluate("document.activeElement.closest('.card')?.classList.contains('is-active')"))
        wait_live_shelf(pg, 40)
        time.sleep(0.8)
        pg.screenshot(path=f'{out}/d3-shelf-moved.png')
        pg.click('#tab-kitchen')
        time.sleep(1.4)
        n_vis = pg.evaluate("[...document.querySelectorAll('.card')].filter(c => !c.hidden).length")
        check('category tab filters the shelf', n_vis == next(c['count'] for c in cat['categories'] if c['id'] == 'kitchen'), str(n_vis))
        wait_live_shelf(pg, 40)
        time.sleep(0.8)
        pg.screenshot(path=f'{out}/d4-kitchen.png')
        # trackpad swipe
        before = pg.evaluate("document.querySelector('.card.is-active').dataset.id")
        pg.evaluate("document.querySelector('.shelf-stage').scrollIntoView({block: 'center'})")
        time.sleep(0.5)
        sb = pg.locator('.shelf-stage').bounding_box()
        pg.mouse.move(sb['x'] + sb['width'] / 2, sb['y'] + sb['height'] / 2)
        pg.evaluate("window.__w=[];document.addEventListener('wheel',e=>window.__w.push([e.deltaX,e.target.className]),{capture:true})")
        for _ in range(4):
            pg.mouse.wheel(60, 0)
            time.sleep(0.15)
        time.sleep(0.8)
        after = pg.evaluate("document.querySelector('.card.is-active').dataset.id")
        check('horizontal wheel moves the shelf', after != before, f"{before} -> {after} {pg.evaluate('window.__w')}")
        # open the detail view from the Explore button
        pg.click('#tab-all')
        time.sleep(0.6)
        aid = pg.evaluate("document.querySelector('.card.is-active').dataset.id")
        pg.click('.explore')
        time.sleep(0.3)
        pg.screenshot(path=f'{out}/d5-opening.png')
        check('detail dialog opens', pg.evaluate("document.getElementById('detail').open"))
        check('detail model goes live', wait_detail(pg), aid)
        time.sleep(1.0)
        pg.screenshot(path=f'{out}/d6-detail.png')
        cam0 = pg.evaluate("(() => { const v = window.__inventory.viewers().detail; return v ? v.camera.position.toArray() : null })()")
        box = pg.locator('.d-stage').bounding_box()
        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        pg.mouse.move(cx, cy)
        pg.mouse.down()
        for i in range(12):
            pg.mouse.move(cx + i * 18, cy + i * 4)
            time.sleep(0.03)
        pg.mouse.up()
        time.sleep(1.0)
        cam1 = pg.evaluate("window.__inventory.viewers().detail.camera.position.toArray()")
        check('orbit drag moves the camera', cam0 and cam1 and sum(abs(a - c) for a, c in zip(cam0, cam1)) > 1e-3, f'{cam0} -> {cam1}')
        pg.click('[data-act="bounds"]')
        pg.click('[data-act="in"]')
        time.sleep(0.8)
        pg.screenshot(path=f'{out}/d7-orbit-bounds.png')
        pg.focus('.d-stage')
        pg.keyboard.press('ArrowLeft')
        pg.keyboard.press('0')
        time.sleep(0.5)
        # focus trap: tab through more stops than the dialog holds; focus must stay inside
        inside = True
        for _ in range(60):
            pg.keyboard.press('Tab')
            if not pg.evaluate("document.getElementById('detail').contains(document.activeElement)"):
                inside = False
                break
        for _ in range(10):
            pg.keyboard.press('Shift+Tab')
            if not pg.evaluate("document.getElementById('detail').contains(document.activeElement)"):
                inside = False
                break
        check('focus stays in the dialog', inside)
        # the download link: fetch it as the browser would, validate it against the catalogue
        href = pg.evaluate("document.querySelector('.dl').getAttribute('href')")
        with pg.expect_download() as dl:
            pg.click('.dl')
        path = dl.value.path()
        data = open(path, 'rb').read()
        check('download is the catalogue GLB', glb_ok(data, items[aid]['files'][0]), f'{href} {len(data)} bytes, suggested {dl.value.suggested_filename}')
        pg.keyboard.press('Escape')
        time.sleep(0.8)
        check('Escape closes the dialog', not pg.evaluate("document.getElementById('detail').open"))
        check('focus returns to the opener', pg.evaluate("document.activeElement.classList.contains('explore')"), pg.evaluate("document.activeElement.className"))
        check('url cleared after close', 'item=' not in pg.url)
        # inventory search and filters
        pg.evaluate("document.getElementById('inventory').scrollIntoView()")
        pg.fill('input[name="q"]', 'rimu')
        time.sleep(0.4)
        cnt = pg.evaluate("document.querySelector('.inv-count').textContent")
        check('search filters the inventory', cnt.startswith(tuple('123456789')) and 'of 78' in cnt, cnt)
        pg.screenshot(path=f'{out}/d8-search.png')
        pg.fill('input[name="q"]', '')
        pg.select_option('select[name="collection"]', 'kowhai')
        pg.check('input[name="twin"]')
        time.sleep(0.4)
        check('source + twin filters', pg.evaluate("document.querySelector('.inv-count').textContent") == '33 of 78 pieces', pg.evaluate("document.querySelector('.inv-count').textContent"))
        pg.click('button[type="reset"]')
        time.sleep(0.3)
        pg.evaluate("window.scrollTo(0, document.getElementById('inventory').offsetTop + 120)")
        time.sleep(1.0)
        pg.screenshot(path=f'{out}/d9-inventory.png')
        # inspect from the grid: a bird (heaviest file)
        pg.click('.inv-card[data-id="manu-tui"] .inspect')
        check('bird detail goes live', wait_detail(pg), 'manu-tui')
        time.sleep(1.0)
        pg.screenshot(path=f'{out}/d10-bird.png')
        pg.click('.d-close')
        time.sleep(0.8)
        check('close button returns focus to Inspect', pg.evaluate("document.activeElement.classList.contains('inspect')"))
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2.0)
        pg.screenshot(path=f'{out}/d11-closing.png')
        pg.screenshot(path=f'{out}/d12-full.png', full_page=True)
        errs = [l for l in logs if 'GL Driver' not in l and 'GPU stall' not in l and 'favicon' not in l]
        check('no console errors', not errs, '\n  '.join(errs[:12]))
        ctx.close()

    # ------------------------------------------------------------------ deep link by twin id
    if not only or only == 'deeplink':
        ctx, pg = new_page(b, 1280, 800)
        pg.goto(base + '?twin=HERO-KIT-05')
        pg.wait_for_function("document.getElementById('detail').open", timeout=30000)
        check('?twin= opens the matching piece', pg.evaluate("document.getElementById('detail').dataset.id") == 'kowhai-hero-kit-05')
        wait_detail(pg)
        time.sleep(0.8)
        pg.screenshot(path=f'{out}/l1-deeplink.png')
        ctx.close()

    # ------------------------------------------------------------------ mobile
    if not only or only == 'mobile':
        logs = []
        ctx, pg = new_page(b, 390, 844, mobile=True, logs=logs)
        pg.goto(base)
        pg.wait_for_function("document.documentElement.classList.contains('ready')", timeout=30000)
        time.sleep(1.2)
        pg.screenshot(path=f'{out}/m1-hero.png')
        check('no horizontal scroll at 390', pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), str(pg.evaluate("document.documentElement.scrollWidth")))
        pg.evaluate("document.getElementById('shelf').scrollIntoView()")
        wait_live_shelf(pg, 50)
        time.sleep(1.0)
        pg.screenshot(path=f'{out}/m2-shelf.png')
        before = pg.evaluate("document.querySelector('.card.is-active').dataset.id")
        box = pg.locator('.shelf-stage').bounding_box()
        y = box['y'] + box['height'] * 0.45
        cdp = ctx.new_cdp_session(pg)
        def touch(type_, x):
            cdp.send('Input.dispatchTouchEvent', {'type': type_, 'touchPoints': [] if type_ == 'touchEnd' else [{'x': x, 'y': y}]})
        touch('touchStart', 330)
        for x in range(330, 120, -15):
            touch('touchMove', x)
            time.sleep(0.016)
        touch('touchEnd', 120)
        time.sleep(1.0)
        after = pg.evaluate("document.querySelector('.card.is-active').dataset.id")
        check('touch swipe moves the shelf', after != before, f'{before} -> {after}')
        wait_live_shelf(pg, 40)
        time.sleep(0.6)
        pg.screenshot(path=f'{out}/m3-swiped.png')
        pg.tap('.explore')
        check('mobile detail goes live', wait_detail(pg))
        time.sleep(0.8)
        pg.screenshot(path=f'{out}/m4-detail.png')
        pg.evaluate("document.querySelector('.d-grid').scrollTo(0, 700)")
        time.sleep(0.5)
        pg.screenshot(path=f'{out}/m5-detail-info.png')
        pg.tap('.d-close')
        time.sleep(0.8)
        pg.evaluate("document.getElementById('inventory').scrollIntoView()")
        time.sleep(1.0)
        pg.screenshot(path=f'{out}/m6-inventory.png')
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.5)
        pg.screenshot(path=f'{out}/m7-closing.png')
        errs = [l for l in logs if 'GL Driver' not in l and 'GPU stall' not in l and 'favicon' not in l]
        check('mobile: no console errors', not errs, '\n  '.join(errs[:12]))
        ctx.close()

    # ------------------------------------------------------------------ reduced motion
    if not only or only == 'rm':
        ctx, pg = new_page(b, 1280, 800, rm=True)
        pg.goto(base)
        pg.wait_for_function("document.documentElement.classList.contains('ready')", timeout=30000)
        check('reduced motion: ink drawn at once', pg.evaluate("getComputedStyle(document.querySelector('.hero-ink path')).strokeDashoffset") in ('0', '0px'))
        pg.click('.explore')
        time.sleep(0.15)
        check('reduced motion: dialog opens with no grow animation', pg.evaluate("document.querySelector('.d-surface').getAnimations().length === 0"))
        pg.keyboard.press('Escape')
        pg.screenshot(path=f'{out}/r1-reduced.png')
        ctx.close()

    # ------------------------------------------------------------------ no WebGL
    if not only or only == 'nogl':
        ctx, pg = new_page(b, 1280, 800)
        pg.goto(base + '?nogl')
        pg.wait_for_function("document.documentElement.classList.contains('ready')", timeout=30000)
        time.sleep(1.2)
        check('no WebGL: shelf stays on stills', pg.evaluate("!document.querySelector('.card.is-active canvas')"))
        pg.click('.explore')
        time.sleep(1.0)
        msg = pg.evaluate("document.querySelector('.v-status').textContent")
        check('no WebGL: detail explains and shows the still', 'WebGL' in msg and pg.evaluate("document.querySelector('.d-still').complete"), msg)
        pg.screenshot(path=f'{out}/n1-nogl.png')
        ctx.close()
    b.close()

failed = [n for n, ok in results if not ok]
print(f'\n{len(results) - len(failed)} of {len(results)} checks passed')
sys.exit(1 if failed else 0)
