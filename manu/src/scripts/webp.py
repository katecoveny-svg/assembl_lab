"""Stills: 2000x1600 RGBA PNG -> 1200 and 640 wide WebP with alpha, and the og image on blush."""
import sys
from pathlib import Path
from PIL import Image
d = Path(sys.argv[1])
for png in sorted(d.glob('*.png')):
    im = Image.open(png).convert('RGBA')
    for w in (1200, 640):
        im.resize((w, w * 4 // 5), Image.LANCZOS).save(d / f'{png.stem}-{w}.webp', 'WEBP', quality=84, method=6)
    thumb = im.copy()
    thumb.thumbnail((134, 107), Image.LANCZOS)
    thumb.save(d / f'{png.stem}-tab.webp', 'WEBP', quality=83, method=6)
    if png.stem == 'tui':
        bg = Image.new('RGBA', (1200, 630), (241, 234, 233, 255))
        s = im.resize((1050, 840), Image.LANCZOS)
        bg.alpha_composite(s, (120, -150))
        bg.convert('RGB').save(d / 'og.jpg', quality=86)
    print(png.stem)
