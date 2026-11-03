#!/usr/bin/env python3
"""Composite the Cycles renders (transparent PNG, car + shadow-catcher shadow) onto assembl chalk and write web WebPs.

    python3 cars/dealer-twin/tools/compose_vehicle_images.py <png_dir>

<png_dir> is the --out folder of assets/models/vehicles/source/build_vehicles.py --render:
  <png_dir>/stills/<body>-<paint>.png  -> cars/dealer-twin/img/stock/<body>-<paint>.webp (480x360) and -sq.webp (360x360)
    (optional, review only: the page shows PR A's drawings, so these stills are NOT referenced or committed)
    Stills are cut from the 640x480 render through ONE fixed window (STILL_CROP) for every body, so a ute stays bigger than a
    hatch; the window is the union of all 22 cars' bounds plus margin (measured: cars span x 150-543, y 137-344).
  <png_dir>/<body>-{hero,rear,detail}.png -> assets/models/vehicles/renders/<body>-{hero,rear,detail}.webp
Every image is an offline render of a generic body, labelled as such wherever it is shown.
"""
import sys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[3]
CHALK = (245, 241, 242, 255)
STILL_CROP = (106, 80, 586, 440)      # 480x360, the same for every still


def flat(p):
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGBA", im.size, CHALK); bg.alpha_composite(im)
    return im, bg.convert("RGB")


def main(src):
    src = pathlib.Path(src)
    stock = ROOT / "cars" / "dealer-twin" / "img" / "stock"; stock.mkdir(parents=True, exist_ok=True)
    rend = ROOT / "assets" / "models" / "vehicles" / "renders"; rend.mkdir(parents=True, exist_ok=True)
    n = 0
    for p in sorted((src / "stills").glob("*.png")):
        im, rgb = flat(p)
        im, rgb = im.crop(STILL_CROP), rgb.crop(STILL_CROP)
        rgb.save(stock / f"{p.stem}.webp", "WEBP", quality=82, method=6)
        a = im.getchannel("A").point(lambda v: 255 if v > 200 else 0)     # the car, not its shadow
        box = a.getbbox() or (0, 0, im.width, im.height)
        s = min(im.height, im.width)
        cx = (box[0] + box[2]) // 2
        x0 = max(0, min(im.width - s, cx - s // 2))
        rgb.crop((x0, 0, x0 + s, s)).save(stock / f"{p.stem}-sq.webp", "WEBP", quality=82, method=6)
        n += 1
    for p in sorted(src.glob("*-*.png")):
        if p.stem.split("-")[-1] in ("hero", "rear", "detail"):
            _, rgb = flat(p)
            rgb.save(rend / f"{p.stem}.webp", "WEBP", quality=84, method=6); n += 1
    print("wrote", n)


if __name__ == "__main__":
    main(sys.argv[1])
