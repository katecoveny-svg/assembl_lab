"""Photo-real Earth textures from NASA imagery (public domain):
  Blue Marble (daytime surface) and Black Marble (city lights at night), via the equirectangular copies in the
  three-globe example images: https://github.com/vasturiano/three-globe/tree/master/example/img
Writes earth.jpg (day, 2048x1024) and earth-lights.jpg (city lights only, warm, 2048x1024) into <texdir>,
replacing the painted earth.jpg from make_textures.py (which still makes the clouds, roughness, Moon and Sun).
Usage: python make_nasa_textures.py <earth-blue-marble.jpg> <earth-night.jpg> <texdir>"""
import sys
import numpy as np
from PIL import Image, ImageFilter

day, night, out = sys.argv[1], sys.argv[2], sys.argv[3]
d = Image.open(day).convert('RGB').resize((2048, 1024), Image.LANCZOS)
# a touch more contrast so it reads at small sizes
a = np.asarray(d, np.float32) / 255.
a = np.clip((a - .5) * 1.08 + .5 + .01, 0, 1)
Image.fromarray((a * 255).astype(np.uint8)).save(f'{out}/earth.jpg', quality=88, optimize=True, progressive=True)
# city lights: keep the bright pixels of the night image and drop its blue moonlit land and sea
n = np.asarray(Image.open(night).convert('RGB').resize((2048, 1024), Image.LANCZOS), np.float32) / 255.
r, g, b = n[..., 0], n[..., 1], n[..., 2]
# lit cities are near-white; the moonlit land and sea are blue with almost no red, so red alone finds the lights
k = np.clip((r - .07) / .33, 0, 1) ** .85
glow = np.asarray(Image.fromarray((k * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255.
k = np.clip(k * .8 + glow * .5, 0, 1)
lights = np.stack([k * 1.0, k * .78, k * .45], -1)
Image.fromarray((lights * 255).astype(np.uint8)).save(f'{out}/earth-lights.jpg', quality=88, optimize=True)
print('NASA textures written to', out)
