"""Rebuild the optional close-up WebP from six CC BY 4.0 Auckland Council COGs.
Requires rasterio, numpy and Pillow. Run outside the browser with a network connection.
The output must use the same EPSG:2193 extent and north-up ordering as scene.js.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling

SOURCE = 'https://nz-imagery.s3.ap-southeast-2.amazonaws.com/auckland/auckland_2024_0.075m/rgb/2193/'
CODES = ['BA32_1000_' + str(code) for code in (3503, 3504, 3505, 3603, 3604, 3605)]
LEFT, BOTTOM, RIGHT, TOP = 1756960, 5920080, 1758400, 5921520
W = H = 3072

def tile(code):
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_TIMEOUT='30',
                      GDAL_HTTP_MAX_RETRY='2', CPL_VSIL_CURL_USE_HEAD='NO'):
        with rasterio.open('/vsicurl/' + SOURCE + code + '.tiff') as f:
            assert f.crs.to_epsg() == 2193
            x = round((f.bounds.left - LEFT) * W / (RIGHT - LEFT))
            y = round((TOP - f.bounds.top) * H / (TOP - BOTTOM))
            assert x in (0, W//3, 2*W//3) and y in (0, H//2), f.bounds
            rgb = f.read((1, 2, 3), out_shape=(3, H//2, W//3), resampling=Resampling.average)
            return x, y, rgb.transpose(1, 2, 0)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', nargs='?', default='auckland/live/data/waterfront-aerial-detail.webp', type=Path)
    args = parser.parse_args()
    pixels = np.zeros((H, W, 3), dtype='uint8')
    with ThreadPoolExecutor(max_workers=3) as workers:
        for x, y, rgb in workers.map(tile, CODES):
            pixels[y:y + H//2, x:x + W//3] = rgb
    assert pixels.max() > 180
    Image.fromarray(pixels).save(args.output, quality=81, method=5)
