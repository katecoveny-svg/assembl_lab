#!/usr/bin/env python3
"""Browser QA for the dealer twin's stock view (Playwright, Chromium, software GL).

    python3 -m http.server 8741 --bind 127.0.0.1      # from the lab repo root, in another shell
    python3 cars/dealer-twin/tests/stock_browser.py [base_url] [screenshot_dir]

Checks at 320, 375, 390 and 1440 px: no horizontal scroll; heading in Instrument Sans, not italic; every picture on the
stock wall is a body-style drawing labelled "not this car"; filter counts match the cards; "Show all" reaches all 48;
keyboard opens a listing with a visible focus ring; reduced motion; no console errors; nothing requests the old renders
or the AI-generated GLB. Exit code 1 on any failure.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8741").rstrip("/") + "/cars/dealer-twin/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
fails = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok: fails.append(msg)


def run(pw, width, reduced=False):
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": 900 if width > 600 else 780}, reduced_motion="reduce" if reduced else "no-preference")
    p = ctx.new_page()
    errs, bad, glb = [], [], []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.on("console", lambda m: m.type == "error" and errs.append(m.text))
    p.on("request", lambda r: ("/img/cars/" in r.url or "sedan.glb" in r.url or "spot3d" in r.url or "/img/stock/" in r.url) and bad.append(r.url))
    p.on("request", lambda r: r.url.endswith(".glb") and glb.append(r.url))
    p.goto(BASE, wait_until="load")
    p.locator("#stock").scroll_into_view_if_needed()
    p.wait_for_selector("#wall2 .wc", timeout=15000)
    tag = f"{width}{' reduced' if reduced else ''}"
    h = p.locator("#stockH")
    ff, fs = h.evaluate("e => getComputedStyle(e).fontFamily"), h.evaluate("e => getComputedStyle(e).fontStyle")
    check("Instrument Sans" in ff and fs == "normal" and h.locator("em").count() == 0, f"{tag}: heading is Instrument Sans, upright ({ff.split(',')[0]}, {fs})")
    # every card on the wall is a labelled drawing
    srcs = p.locator("#wall2 .wc img").evaluate_all("a => a.map(i => i.getAttribute('src'))")
    labels = p.locator("#wall2 .wc .dr-lb").evaluate_all("a => a.map(e => e.textContent)")
    check(len(srcs) == 24 and all(s.startswith("img/body/") for s in srcs), f"{tag}: 24 wall cards, all body drawings ({len(srcs)})")
    check(all("not this car" in l for l in labels) and len(labels) == len(srcs), f"{tag}: every wall card says 'not this car'")
    more = p.locator(".wall-more")
    check(more.is_visible() and "48" in more.inner_text(), f"{tag}: 'Show all 48 cars' offered")
    more.click(); p.wait_for_timeout(150)
    check(p.locator("#wall2 .wc").count() == 48 and more.is_hidden(), f"{tag}: show all reaches 48")
    # filters: counts on the buttons match the cards
    for btn in p.locator(".wall-f button:not([disabled])").all():
        name, n = btn.inner_text().rsplit(" ", 1)[0].strip(), int(btn.locator("i").inner_text())
        btn.click(); p.wait_for_timeout(80)
        check(p.locator("#wall2 .wc").count() == n and btn.get_attribute("aria-pressed") == "true", f"{tag}: filter {name} shows {n}")
    p.locator(".wall-f button").first.click()
    # keyboard: focus the first wall card, Enter opens the spotlight, focus is visible
    first = p.locator("#wall2 .wc").first
    first.focus(); p.keyboard.press("Enter"); p.wait_for_timeout(300)
    outline = first.evaluate("e => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth; }")
    check(not outline.startswith("none") and first.evaluate("e => e.matches(':focus-visible')"), f"{tag}: visible keyboard focus ({outline})")
    spot = p.locator("#spot")
    check(spot.is_visible() and "light" in (spot.get_attribute("class") or ""), f"{tag}: Enter opens a light spotlight")
    check("not this car" in p.locator("#spotTruth").inner_text(), f"{tag}: spotlight chip says not this car")
    check(first.get_attribute("aria-pressed") == "true", f"{tag}: selected card is aria-pressed")
    sw = p.evaluate("document.documentElement.scrollWidth")
    check(sw <= width, f"{tag}: no horizontal scroll ({sw})")
    if SHOTS:
        spot.screenshot(path=f"{SHOTS}/qa-spot-{width}{'-reduced' if reduced else ''}.png")
    b3 = p.locator("#spotView3d")
    check(b3.is_visible() and b3.inner_text() == "View in 3D", f"{tag}: the spotlight offers 'View in 3D' over the drawing")
    check(not glb, f"{tag}: no GLB fetched without pressing 'View in 3D' ({glb[:2]})")
    check(not bad, f"{tag}: no requests for old renders, rendered stills or sedan.glb ({bad[:2]})")
    real = [e for e in errs if "api/mcp" not in e and "Failed to load resource" not in e]
    check(not real, f"{tag}: no console errors ({real[:2]})")
    b.close()


with sync_playwright() as pw:
    for w in (320, 375, 390, 1440):
        run(pw, w)
    run(pw, 390, reduced=True)
print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
