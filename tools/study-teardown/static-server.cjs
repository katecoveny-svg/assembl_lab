'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.woff2':'font/woff2','.wasm':'application/wasm'};
function within(root, file) {
  const rel = path.relative(root, file);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}
function serve(root) {
  const base = fs.realpathSync(root);
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        const raw = (req.url || '/').split('?')[0];
        const decoded = decodeURIComponent(raw);
        if (decoded.includes('\0') || decoded.includes('\\')) return res.writeHead(400).end();
        let file = path.resolve(base, '.' + decoded);
        if (!within(base, file)) return res.writeHead(403).end();
        file = fs.realpathSync(file);
        if (!within(base, file)) return res.writeHead(403).end();
        if (fs.statSync(file).isDirectory()) file = fs.realpathSync(path.join(file, 'index.html'));
        if (!within(base, file)) return res.writeHead(403).end();
        if (!fs.statSync(file).isFile()) return res.writeHead(404).end();
        const stream = fs.createReadStream(file);
        stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
        res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'x-content-type-options':'nosniff'});
        stream.pipe(res);
      } catch (error) {
        res.writeHead(error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 403).end();
      }
    });
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
module.exports = {serve};
