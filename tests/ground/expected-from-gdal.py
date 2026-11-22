# Writes fixtures/castlepoint.ground.expected.json: the same cells read by GDAL (rasterio), an independent LERC reader.
#   python3 tests/ground/expected-from-gdal.py      (uses the real internet and needs rasterio; not part of the tests)
import json, hashlib, os, numpy as np, rasterio
from rasterio.windows import Window
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
g = json.load(open(os.path.join(here, 'castlepoint.ground.grid.json'))); n = g['n']
ca = os.environ.get('CURL_CA_BUNDLE')   # set this where outbound HTTPS goes through a proxy with its own certificate
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', **({'CURL_CA_BUNDLE': ca, 'GDAL_CURL_CA_BUNDLE': ca} if ca else {})):
    with rasterio.open('/vsicurl/' + g['file']) as ds:
        c0 = int(g['originE'] - 0.5 - ds.transform.c); r0 = int(ds.transform.f - (g['originN'] + 0.5))
        win = ds.read(1, window=Window(c0, r0, n, n))
        tx, ty = (c0 + n // 2) // 512, (r0 + n // 2) // 512
        tile = ds.read(1, window=Window(tx * 512, ty * 512, 512, 512)).astype('<f4')
        nodata = ds.nodata
json.dump({'reader': 'GDAL ' + rasterio.__gdal_version__ + ' through rasterio ' + rasterio.__version__, 'file': g['file'], 'nodata': nodata, 'window': {'col0': c0, 'row0': r0, 'n': n, 'values': [round(float(v), 3) for v in win.ravel()]},
           'tile': {'tx': int(tx), 'ty': int(ty), 'sha256OfFloat32LE': hashlib.sha256(tile.tobytes()).hexdigest(), 'cellsWithNodata': int((tile == nodata).sum()), 'max': round(float(tile.max()), 3)}}, open(os.path.join(here, 'castlepoint.ground.expected.json'), 'w'))
print('written', n * n, 'cells; tile', tx, ty, 'nodata cells', int((tile == nodata).sum()))
