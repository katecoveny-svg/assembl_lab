#!/usr/bin/env python3
"""Browser QA for the stock's optional generic 3D model (Playwright Chromium; WebGL is SwiftShader software GL here).

    python3 -m http.server 8741 --bind 127.0.0.1      # from the lab repo root
    python3 cars/dealer-twin/tests/vehicle_browser.py [base_url] [screenshot_dir]

Checks: the wall and lead cards show PR A's drawings only and no GLB is fetched; opening a listing shows its drawing with a
keyboard-operable "View in 3D" button (visible focus) and still fetches no GLB or contract; pressing it fetches exactly that
listing's body GLB in its colour, labelled "Generic <body> model · not the actual vehicle"; "Back to drawing" returns and keeps
the selection; Reset view; another listing opens on its drawing again and fetches one more GLB only when asked; reduced motion
keeps the model still; WebGL off, data saver and a failed GLB each leave the drawing with a disabled button and a short note;
320/375/390/1440 have no horizontal scroll. Never claims real-device or AR verification.
"""
import sys, time
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8741").rstrip("/") + "/cars/dealer-twin/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
fails = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg); ok or fails.append(msg)


def open_page(pw, width=1440, reduced=False, args=None, block_glb=False, save_data=False):
    b = pw.chromium.launch(args=args or [])
    ctx = b.new_context(viewport={"width": width, "height": 900 if width > 600 else 800}, reduced_motion="reduce" if reduced else "no-preference")
    if save_data: ctx.add_init_script("Object.defineProperty(navigator, 'connection', {value: {saveData: true}, configurable: true})")
    p = ctx.new_page(); p.set_default_timeout(180000)
    p.reqs, p.errs = [], []
    p.on("request", lambda r: p.reqs.append(r.url))
    p.on("pageerror", lambda e: p.errs.append(str(e)))
    if block_glb: p.route("**/*.glb", lambda r: r.fulfill(status=404, body="no"))
    p.goto(BASE, wait_until="load")
    p.locator("#stock").scroll_into_view_if_needed()
    p.wait_for_selector("#wall2 .wc", timeout=120000)
    return b, p


def glbs(p): return [u.rsplit("/", 1)[1] for u in p.reqs if u.endswith(".glb")]


def open_car(p, idx):
    p.locator("#wall2 .wc").nth(idx).click()
    p.wait_for_timeout(300)


def contract_fetched(p): return any(u.endswith("vehicles-rig-contract.json") for u in p.reqs)


def press_3d(p):
    btn = p.locator("#spotView3d")
    btn.focus(); p.keyboard.press("Shift+Tab"); p.keyboard.press("Tab")        # reach it by keyboard
    return btn


with sync_playwright() as pw:
    b, p = open_page(pw)
    srcs = p.locator("#wall2 .wc img").evaluate_all("a => a.map(i => i.getAttribute('src'))")
    check(len(srcs) > 0 and all(s.startswith("img/body/") and s.endswith(".svg") for s in srcs), f"wall cards are PR A drawings only ({len(srcs)})")
    leads = p.locator(".lc img").evaluate_all("a => a.map(i => i.getAttribute('src'))")
    check(all(s.startswith("img/body/") for s in leads), f"lead cards are drawings only ({len(leads)})")
    check(not p.locator("img[src*='img/stock/']").count(), "no rendered still anywhere on the page")
    if SHOTS: p.locator("#stock").screenshot(path=f"{SHOTS}/c-wall-1440.png")
    check(glbs(p) == [] and not contract_fetched(p), "no GLB or contract fetched on load")
    open_car(p, 0)                                            # first card: an Aqua -> hatch
    p.wait_for_timeout(1500)
    check(p.locator("#spotPoster").get_attribute("src").startswith("img/body/hatch") and "live" not in (p.locator("#spotStage").get_attribute("class") or ""), "spotlight opens on the hatch drawing")
    check("not this car" in p.locator("#spotTruth").inner_text(), "drawing chip: not this car")
    btn = p.locator("#spotView3d")
    check(btn.is_visible() and btn.is_enabled() and btn.inner_text() == "View in 3D" and btn.get_attribute("aria-pressed") == "false", "'View in 3D' offered")
    check(p.locator("#spotReset").is_hidden(), "Reset view hidden until 3D")
    check(glbs(p) == [] and not contract_fetched(p), f"opening a listing fetches no GLB ({glbs(p)})")
    check("View in 3D" in p.locator("#spotInfo .note").inner_text() and "not the actual vehicle" in p.locator("#spotInfo .note").inner_text(), "spotlight note explains drawing + optional generic model")
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/c-spot-drawing-1440.png")
    press_3d(p)
    outline = btn.evaluate("e => getComputedStyle(e).outlineStyle + ' ' + getComputedStyle(e).outlineWidth")
    check(btn.evaluate("e => e.matches(':focus-visible')") and not outline.startswith("none"), f"'View in 3D' has visible keyboard focus ({outline})")
    p.keyboard.press("Enter")
    p.wait_for_selector("#spotStage.live", timeout=180000)
    check(glbs(p) == ["hatch.glb"], f"pressing it fetches exactly hatch.glb ({glbs(p)})")
    check(contract_fetched(p), "the rig contract is fetched and checked")
    st = p.evaluate("window.__vehicleStage.state")
    check(st["body"] == "hatch" and st["paint"] == "pearl-white", f"hatch in the listing's pearl white ({st})")
    check(p.locator("#spotTruth").inner_text() == "Generic hatch model · not the actual vehicle", f"3D chip: {p.locator('#spotTruth').inner_text()!r}")
    check(btn.inner_text() == "Back to drawing" and btn.get_attribute("aria-pressed") == "true" and p.locator("#spotReset").is_visible(), "toggle reads 'Back to drawing'; Reset view shown")
    check(p.evaluate("""() => { const c = document.querySelector('#spotCv'); return c.width > 0 && !!(c.getContext('webgl2') || c.getContext('webgl')); }"""), "spotlight canvas has a WebGL context")
    p.wait_for_timeout(800)
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/c-spot-3d-hatch-1440.png")
    sel = p.locator("#wall2 .wc[aria-pressed=true]").get_attribute("data-id")
    btn.click(); p.wait_for_timeout(300)
    yaw0 = p.evaluate("window.__vehicleStage.state.yaw")
    check("live" not in p.locator("#spotStage").get_attribute("class") and p.locator("#spotPoster").is_visible() and "not this car" in p.locator("#spotTruth").inner_text(), "'Back to drawing' shows the drawing and its label")
    p.wait_for_timeout(600)
    check(p.evaluate("window.__vehicleStage.state.yaw") == yaw0, "back on the drawing, the model stops turning")
    check(p.locator("#wall2 .wc[aria-pressed=true]").get_attribute("data-id") == sel, "selection kept across the toggle")
    btn.click(); p.wait_for_selector("#spotStage.live", timeout=180000)
    check(glbs(p) == ["hatch.glb"], "back to 3D: no refetch")
    p.locator("#spotReset").click(); p.wait_for_timeout(100)
    check(abs(p.evaluate("window.__vehicleStage.state.yaw")) < .05, "Reset view returns the turntable to the start")
    # another body: opens on its drawing, one more GLB only when asked
    ute = p.evaluate("""() => [...document.querySelectorAll('.wall-f button')].findIndex(b => b.textContent.startsWith('Ute'))""")
    p.locator(".wall-f button").nth(ute).click(); p.wait_for_timeout(200)
    open_car(p, 0); p.wait_for_timeout(1500)
    check(p.locator("#spotPoster").get_attribute("src").startswith("img/body/ute") and "live" not in p.locator("#spotStage").get_attribute("class") and btn.inner_text() == "View in 3D", "a new listing opens on its drawing")
    check(glbs(p) == ["hatch.glb"], f"no ute GLB until asked ({glbs(p)})")
    btn.click(); p.wait_for_function("window.__vehicleStage.state.body === 'ute'", timeout=180000); p.wait_for_selector("#spotStage.live", timeout=180000)
    check(sorted(glbs(p)) == ["hatch.glb", "ute.glb"], f"exactly one more GLB ({glbs(p)})")
    check(p.locator("#spotTruth").inner_text() == "Generic ute model · not the actual vehicle", "ute chip")
    p.wait_for_timeout(800)
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/c-spot-3d-ute-1440.png")
    check(not p.errs, f"no page errors ({p.errs[:2]})")
    b.close()
    # widths: drawing spotlight with the button, no horizontal scroll, no GLB
    for w in (320, 375, 390):
        b, p = open_page(pw, w)
        open_car(p, 0); p.wait_for_timeout(800)
        sw = p.evaluate("document.documentElement.scrollWidth")
        check(sw <= w and p.locator("#spotView3d").is_visible() and glbs(p) == [], f"{w} px: drawing + 'View in 3D', no horizontal scroll ({sw}), no GLB")
        if SHOTS and w == 390: p.locator("#spot").screenshot(path=f"{SHOTS}/c-spot-drawing-390.png")
        b.close()
    # reduced motion: the model is shown on request but does not turn
    b, p = open_page(pw, 390, reduced=True)
    open_car(p, 0); p.wait_for_timeout(500); p.locator("#spotView3d").click(); p.wait_for_selector("#spotStage.live", timeout=180000)
    y0 = p.evaluate("window.__vehicleStage.state.yaw"); p.wait_for_timeout(1500)
    check(p.evaluate("window.__vehicleStage.state.yaw") == y0, "reduced motion: no auto-turn")
    check(p.evaluate("document.documentElement.scrollWidth") <= 390, "390 px: no horizontal scroll with the 3D model")
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/c-spot-3d-390-reduced.png")
    b.close()
    # WebGL off / data saver: drawing stays, button disabled with a short note, no GLB
    for tag, kw, word in (("WebGL off", dict(args=["--disable-webgl", "--disable-3d-apis"]), "WebGL"), ("data saver", dict(save_data=True), "data saver")):
        b, p = open_page(pw, **kw)
        open_car(p, 0); p.wait_for_timeout(1000)
        bt = p.locator("#spotView3d"); nt = p.locator("#spotModelNote")
        if bt.is_enabled(): bt.click(); p.wait_for_timeout(800)
        check(bt.is_disabled() and nt.is_visible() and word in nt.inner_text() and glbs(p) == [] and p.locator("#spotPoster").is_visible(), f"{tag}: drawing stays, button disabled with a note, no GLB")
        if SHOTS and tag == "WebGL off": p.locator("#spot").screenshot(path=f"{SHOTS}/c-spot-webgl-off.png")
        b.close()
    # failed load: the drawing stays, the button disables and says why, no page error
    b, p = open_page(pw, block_glb=True)
    open_car(p, 0); p.wait_for_timeout(500); p.locator("#spotView3d").click()
    try: p.wait_for_function("document.querySelector('#spotView3d').disabled", timeout=180000)
    except Exception: pass                                 # the assertions below report it
    cls = p.locator("#spotStage").get_attribute("class")
    check("live" not in cls and p.locator("#spotPoster").is_visible() and p.locator("#spotView3d").is_disabled() and "didn't load" in p.locator("#spotModelNote").inner_text(), "GLB 404: the drawing stays, button disabled with a note")
    check("not this car" in p.locator("#spotTruth").inner_text(), "GLB 404: the drawing label is back")
    check(not p.errs, f"GLB 404: no uncaught page errors ({p.errs[:2]})")
    b.close()
print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
