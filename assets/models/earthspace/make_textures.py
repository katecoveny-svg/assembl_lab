"""Textures for the Earth & Space machine, painted from data rather than photographs.
Earth: coastlines and lakes from Natural Earth 1:50m (public domain, naturalearthdata.com), coloured by latitude
(ice, tundra, forest, desert bands) with noise; clouds, Moon and Sun are procedural.
Usage: python make_textures.py <ne_50m_land.geojson> <ne_50m_lakes.geojson> <outdir>"""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

land_path, lakes_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
rng = np.random.default_rng(1840)

def fbm(h, w, base=8, octaves=6, seed=0, gain=.5):
    """Fractal noise that wraps left-right (longitude), 0..1."""
    r = np.random.default_rng(seed); acc = np.zeros((h, w), np.float32); amp = 1.; tot = 0.
    for o in range(octaves):
        gw = base * 2 ** o; gh = max(2, gw // 2)
        g = r.random((gh, gw)).astype(np.float32)
        g = np.concatenate([g, g, g], 1)  # wrap horizontally
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w * 3, h), Image.BICUBIC)
        a = np.asarray(im, np.float32)[:, w:2 * w] / 255.
        acc += a * amp; tot += amp; amp *= gain
    return acc / tot

def rasterise(path, W, H):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for f in json.load(open(path))['features']:
        g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for k, ring in enumerate(poly):
                pts = [((lon + 180) / 360 * W, (90 - lat) / 180 * H) for lon, lat in ring]
                d.polygon(pts, fill=255 if k == 0 else 0)
    return np.asarray(m, np.float32) / 255.

def mix(a, b, t): return a + (b - a) * t[..., None]
def col(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
def smooth(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ---------------- Earth
W, H = 4096, 2048
land = rasterise(land_path, W, H); lakes = rasterise(lakes_path, W, H); land = np.clip(land - lakes, 0, 1)
lat = np.linspace(90, -90, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
lon = np.linspace(-180, 180, W, dtype=np.float32)[None, :] * np.ones((H, 1), np.float32)
n1 = fbm(H, W, 6, 7, 1); n2 = fbm(H, W, 16, 5, 2); n3 = fbm(H, W, 64, 3, 3)
coast = np.asarray(Image.fromarray((land * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), np.float32) / 255.
# ocean: deep navy, lighter over shelves near coasts
ocean = mix(np.broadcast_to(col('#06183A'), (H, W, 3)), np.broadcast_to(col('#0E3466'), (H, W, 3)), n1 * .9)
ocean = mix(ocean, np.broadcast_to(col('#1B5E86'), (H, W, 3)), smooth(.05, .5, coast) * .55)
# land biomes by latitude, broken up with noise
alat = np.abs(lat)
nlow = fbm(H, W, 4, 5, 4)
# the world's big dry regions, placed where they are (centre lon, lat; half-widths in degrees)
DRY = [(10, 23, 30, 9), (45, 22, 12, 9), (58, 31, 10, 6), (64, 41, 10, 5), (71, 27, 6, 5), (88, 39, 12, 5), (105, 43, 14, 5),
       (130, -25, 15, 9), (135, -29, 7, 4), (19, -25, 6, 5), (15, -21, 2.5, 6), (-70, -23, 2.2, 7), (-68, -45, 3, 5),
       (-114, 35, 7, 5), (-104, 29, 4, 4), (-40, -8, 3, 3)]
arid = np.zeros((H, W), np.float32)
lonw = lon + (n1 - .5) * 16; latw = lat + (n2 - .5) * 9
for clon, clat, rx, ry in DRY:
    arid = np.maximum(arid, np.exp(-(((lonw - clon) / rx) ** 2 + ((latw - clat) / ry) ** 2)))
arid = arid * (.6 + .8 * nlow) + (n3 - .5) * .3 + (n2 - .5) * .3
arid = np.clip(arid, 0, 1)
forest = mix(np.broadcast_to(col('#2E4A22'), (H, W, 3)), np.broadcast_to(col('#4E6B33'), (H, W, 3)), n2)
tropic = np.exp(-(alat / 12) ** 2)
forest = mix(forest, np.broadcast_to(col('#1F3D1B'), (H, W, 3)), tropic * .7)
desert = mix(np.broadcast_to(col('#B79A66'), (H, W, 3)), np.broadcast_to(col('#D6B98A'), (H, W, 3)), n3)
savanna = mix(np.broadcast_to(col('#6E7A3E'), (H, W, 3)), np.broadcast_to(col('#8D8650'), (H, W, 3)), n3)
ground = mix(forest, savanna, smooth(.2, .45, arid))
ground = mix(ground, desert, smooth(.4, .62, arid))
boreal = mix(np.broadcast_to(col('#26381F'), (H, W, 3)), np.broadcast_to(col('#3B4A2C'), (H, W, 3)), n2)
ground = mix(ground, boreal, smooth(48, 56, alat + (n2 - .5) * 8))
tundra = mix(np.broadcast_to(col('#5E5B48'), (H, W, 3)), np.broadcast_to(col('#7A7766'), (H, W, 3)), n2)
ground = mix(ground, tundra, smooth(62, 70, alat + (n2 - .5) * 8))
ice = (lat < -60) | ((lat > 59) & (lon > -62) & (lon < -10)) | (lat + (n2 - .5) * 4 > 76)
icecol = mix(np.broadcast_to(col('#E3EAF0'), (H, W, 3)), np.broadcast_to(col('#FFFFFF'), (H, W, 3)), n3)
ground = np.where(ice[..., None], icecol, ground)
ground *= (.88 + .24 * n3)[..., None]
earth = mix(ocean, ground, land)
# sea ice fringe around Antarctica
seaice = smooth(-66, -72, lat + (n2 - .5) * 6) * (1 - land)
earth = mix(earth, np.broadcast_to(col('#D8E2EA'), (H, W, 3)), seaice * .85)
Image.fromarray(np.clip(earth, 0, 255).astype(np.uint8)).resize((2048, 1024), Image.LANCZOS).save(f'{out}/earth.jpg', quality=88, optimize=True)
# roughness (G) for glTF: shiny ocean, rough land
rough = np.where(land > .5, 230, 70).astype(np.uint8)
rimg = np.stack([np.zeros_like(rough), rough, np.zeros_like(rough)], -1)
Image.fromarray(rimg).resize((1024, 512), Image.BILINEAR).save(f'{out}/earth-rough.jpg', quality=85)
Image.fromarray((land * 255).astype(np.uint8)).resize((1024, 512), Image.BILINEAR).save(f'{out}/earth-land.png')

# ---------------- clouds: swirls, more in the storm belts and at the equator
CW, CH = 2048, 1024
clat = np.linspace(90, -90, CH, dtype=np.float32)[:, None]
c = .6 * fbm(CH, CW, 8, 8, 7, .6) + .4 * fbm(CH, CW, 24, 5, 9, .55)
warp = fbm(CH, CW, 3, 3, 8)
c = .7 * c + .3 * np.roll(c, (warp * 80).astype(int)[0, 0], axis=1)
belt = .55 * np.exp(-((np.abs(clat) - 55) / 12) ** 2) + .35 * np.exp(-(clat / 7) ** 2) - .25 * np.exp(-((np.abs(clat) - 25) / 8) ** 2)
a = smooth(.52, .78, c + belt * .2) ** 1.3 * .95
a = (a * 255).astype(np.uint8)
Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a])).save(f'{out}/clouds.png', optimize=True)

# ---------------- Moon: highlands, dark maria, craters (stretched by 1/cos(lat) so they stay round on the sphere)
MW, MH = 2048, 1024
mlat = np.linspace(90, -90, MH, dtype=np.float32)
m = 150 + 40 * (fbm(MH, MW, 8, 7, 11) - .5) + 20 * (fbm(MH, MW, 48, 3, 12) - .5)
maria = np.asarray(Image.fromarray((smooth(.55, .68, fbm(MH, MW, 5, 6, 13)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255.
m = m - 62 * maria
yy, xx = np.mgrid[0:MH, 0:MW].astype(np.float32)
for i in range(900):
    r = float(rng.pareto(2.2) * 3 + 2.5); r = min(r, 60)
    cx = rng.random() * MW; cy = rng.random() * MH * .92 + MH * .04
    la = math.radians(90 - cy / MH * 180); sx = 1 / max(.2, math.cos(la))
    x0, x1 = int(max(0, cx - r * sx * 3.2)), int(min(MW, cx + r * sx * 3.2)); y0, y1 = int(max(0, cy - r * 3.2)), int(min(MH, cy + r * 3.2))
    if x1 <= x0 or y1 <= y0: continue
    dx = (xx[y0:y1, x0:x1] - cx) / sx; dy = yy[y0:y1, x0:x1] - cy; d = np.sqrt(dx * dx + dy * dy) / r
    shade = np.where(d < 1, -14 * (1 - d ** 2) + 9 * (dx / r), 0) + np.where((d >= .85) & (d < 1.3), 7 * (1 - np.abs(d - 1.05) / .25), 0) + np.where((d >= 1.3) & (d < 3), 6 * (1 - (d - 1.3) / 1.7) * (r > 14), 0)
    m[y0:y1, x0:x1] += shade * (.6 + .4 * min(1, r / 12))
m = np.clip(m, 30, 235).astype(np.uint8)
Image.fromarray(np.dstack([m, (m * .985).astype(np.uint8), (m * .96).astype(np.uint8)])).save(f'{out}/moon.jpg', quality=88, optimize=True)

# ---------------- Sun: granulation and a few sunspots, used as an emissive map
SW, SH = 1024, 512
g = .55 * fbm(SH, SW, 64, 3, 21) + .45 * fbm(SH, SW, 12, 4, 22)
s = mix(np.broadcast_to(col('#E8701A'), (SH, SW, 3)), np.broadcast_to(col('#FFE6A0'), (SH, SW, 3)), smooth(.25, .8, g))
sy, sx = np.mgrid[0:SH, 0:SW].astype(np.float32)
for i in range(9):
    cx, cy, r = rng.random() * SW, SH * (.35 + .3 * rng.random()), 3 + rng.random() * 6
    d = np.sqrt((sx - cx) ** 2 + (sy - cy) ** 2) / r
    s *= (1 - .75 * np.clip(1 - d, 0, 1) - .3 * np.clip(1 - d / 2, 0, 1))[..., None]
Image.fromarray(np.clip(s, 0, 255).astype(np.uint8)).save(f'{out}/sun.jpg', quality=88, optimize=True)
print('textures written to', out)
