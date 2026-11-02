# Prints the SVG sheets from build-plans.mjs to one-page A3 landscape PDFs with headless Chromium (vector output; pdf.js renders it).
# Run: python3 trades/src/print-plans.py <svgdir> <outdir>
import sys, pathlib
from playwright.sync_api import sync_playwright

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
names = {"a101": "a101-floor-plan.pdf", "a201": "a201-deck-pergola.pdf"}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    for svg in sorted(src.glob("*.svg")):
        html = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono&display=block" rel="stylesheet">'
                '<style>@page{size:420mm 297mm;margin:0}html,body{margin:0;padding:0}svg{display:block;width:420mm;height:297mm}</style></head><body>' + svg.read_text() + '</body></html>')
        pg.set_content(html, wait_until="networkidle"); pg.evaluate("document.fonts.ready")
        f = out / names.get(svg.stem, svg.stem + ".pdf")
        pg.pdf(path=str(f), width="420mm", height="297mm", print_background=True, prefer_css_page_size=True)
        print("wrote", f, f.stat().st_size, "bytes")
    b.close()
