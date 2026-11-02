#!/usr/bin/env python3
"""Browser QA for the stock spotlight's generic 3D vehicle (Playwright Chromium; WebGL is SwiftShader software GL here).

    python3 -m http.server 8741 --bind 127.0.0.1      # from the lab repo root
    python3 cars/dealer-twin/tests/vehicle_browser.py [base_url] [screenshot_dir]

Checks: the wall loads stills and no GLB; opening a car fetches the contract and only that body's GLB; the model draws (canvas live);
a second car of another body fetches one more GLB and the same body never refetches; the 3D/still switch keeps the selection and
yaw; Reset view; reduced motion keeps the model still; WebGL off and a failed GLB both leave the labelled still with no 3D controls.
Never claims real-device or AR verification.
"""
import sys, time
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8741").rstrip("/") + "/cars/dealer-twin/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
fails = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg); ok or fails.append(msg)


def open_page(pw, width=1440, reduced=False, args=None, block_glb=False):
    b = pw.chromium.launch(args=args or [])
    ctx = b.new_context(viewport={"width": width, "height": 900 if width > 600 else 800}, reduced_motion="reduce" if reduced else "no-preference")
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


with sync_playwright() as pw:
    b, p = open_page(pw)
    stills = p.locator("#wall2 .wc img").evaluate_all("a => a.map(i => i.getAttribute('src'))")
    check(all(s.startswith("img/stock/") and s.endswith(".webp") for s in stills), "wall cards are offline WebP stills")
    check(glbs(p) == [], "no GLB fetched before a car is opened")
    open_car(p, 0)                                            # first card: an Aqua -> hatch
    p.wait_for_selector("#spotStage.live", timeout=180000)
    check(glbs(p) == ["hatch.glb"], f"opening an Aqua fetches only hatch.glb ({glbs(p)})")
    check(any(u.endswith("vehicles-rig-contract.json") for u in p.reqs), "the rig contract is fetched and checked")
    st = p.evaluate("window.__vehicleStage.state")
    check(st["body"] == "hatch" and st["paint"] == "pearl-white", f"hatch in the listing's pearl white ({st})")
    check("not the actual vehicle" in p.locator("#spotTruth").inner_text(), "spotlight chip: not the actual vehicle")
    nonblank = p.evaluate("""() => { const c = document.querySelector('#spotCv'); const g = c.getContext('webgl2') || c.getContext('webgl'); return c.width > 0 && !!g; }""")
    check(nonblank, "spotlight canvas has a WebGL context")
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/b-spot3d-hatch-1440.png")
    # another body, then back: one extra GLB, no refetch
    ute = p.evaluate("""() => [...document.querySelectorAll('.wall-f button')].findIndex(b => b.textContent.startsWith('Ute'))""")
    p.locator(".wall-f button").nth(ute).click(); p.wait_for_timeout(200)
    open_car(p, 0); p.wait_for_function("window.__vehicleStage.state.body === 'ute'", timeout=180000)
    p.wait_for_timeout(800)
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/b-spot3d-ute-1440.png")
    p.locator(".wall-f button").first.click(); p.wait_for_timeout(200); open_car(p, 1)
    p.wait_for_function("window.__vehicleStage.state.body === 'hatch'", timeout=180000)
    check(sorted(glbs(p)) == ["hatch.glb", "ute.glb"], f"each body fetched once ({glbs(p)})")
    # 3D/still switch keeps the selection and the view; Reset view
    sel = p.locator("#wall2 .wc[aria-pressed=true]").get_attribute("data-id")
    p.locator("#spotView").click(); p.wait_for_timeout(300)
    yaw0 = p.evaluate("window.__vehicleStage.state.yaw")
    check("live" not in p.locator("#spotStage").get_attribute("class") and p.locator("#spotView").get_attribute("aria-pressed") == "false", "3D off shows the still")
    p.wait_for_timeout(600)
    check(p.evaluate("window.__vehicleStage.state.yaw") == yaw0, "3D off: the model stops turning")
    p.locator("#spotView").click(); p.wait_for_selector("#spotStage.live", timeout=180000)
    check(p.locator("#wall2 .wc[aria-pressed=true]").get_attribute("data-id") == sel, "selection kept across the 3D/still switch")
    p.locator("#spotReset").click(); p.wait_for_timeout(100)
    check(abs(p.evaluate("window.__vehicleStage.state.yaw")) < .05, "Reset view returns the turntable to the start")
    check(not [e for e in p.errs], f"no page errors ({p.errs[:2]})")
    b.close()
    # reduced motion: the model is shown but does not turn
    b, p = open_page(pw, 390, reduced=True)
    open_car(p, 0); p.wait_for_selector("#spotStage.live", timeout=180000)
    y0 = p.evaluate("window.__vehicleStage.state.yaw"); p.wait_for_timeout(1500)
    check(p.evaluate("window.__vehicleStage.state.yaw") == y0, "reduced motion: no auto-turn")
    check(p.evaluate("document.documentElement.scrollWidth") <= 390, "390 px: no horizontal scroll with the 3D spotlight")
    if SHOTS: p.locator("#spot").screenshot(path=f"{SHOTS}/b-spot3d-390-reduced.png")
    b.close()
    # WebGL off: still only, no GLB, no 3D controls
    b, p = open_page(pw, args=["--disable-webgl", "--disable-3d-apis"])
    open_car(p, 0); p.wait_for_timeout(1500)
    check(glbs(p) == [] and p.locator(".spot-ctl").is_hidden() and p.locator("#spotPoster").is_visible(), "WebGL off: the labelled still, no GLB, no 3D controls")
    b.close()
    # failed load: the still stays, controls hide, no page error
    b, p = open_page(pw, block_glb=True)
    open_car(p, 0)
    try: p.wait_for_function("document.querySelector('.spot-ctl').hidden && !document.querySelector('#spotStage').classList.contains('live')", timeout=180000)
    except Exception: pass                                 # the assertions below report it
    cls = p.locator("#spotStage").get_attribute("class")
    check("live" not in cls and p.locator("#spotPoster").is_visible() and p.locator(".spot-ctl").is_hidden(), "GLB 404: the still stays, 3D controls hide")
    check(not p.errs, f"GLB 404: no uncaught page errors ({p.errs[:2]})")
    b.close()
print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
