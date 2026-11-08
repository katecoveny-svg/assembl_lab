# A static server for the lab repo with the same /ar/w/:id/ rewrite as vercel.json, for local tests:
#   python3 ar/tools/serve.py . 8964
import http.server, sys, os, re, functools
root = sys.argv[1]; port = int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]
        m = re.match(r'^/ar/w/([a-z0-9-]+)/?$', p)
        if m: path = '/ar/w/index.html'
        return super().translate_path(path)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
H.extensions_map.update({'.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.usdz': 'model/vnd.usdz+zip', '.webp': 'image/webp'})
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
