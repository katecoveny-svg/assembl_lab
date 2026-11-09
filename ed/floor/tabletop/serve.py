"""Loopback-only local prototype builder; no uploads or production deployment."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parents[3]
os.chdir(ROOT)
class Handler(SimpleHTTPRequestHandler):
 extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.glb':'model/gltf-binary','.usdz':'model/vnd.usdz+zip'}
 def do_POST(self):
  ext=self.path.removeprefix('/save/')
  if self.path not in ['/save/glb','/save/usdz','/save/json'] or self.headers.get('Origin')!='http://127.0.0.1:8766': self.send_error(403);return
  n=int(self.headers.get('Content-Length','0'))
  if not 0<n<=8*1024*1024:self.send_error(413);return
  (ROOT/'ed/floor/tabletop/models'/('ed-zone.'+ext)).write_bytes(self.rfile.read(n))
  self.send_response(200);self.end_headers();self.wfile.write(b'ok')
ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
