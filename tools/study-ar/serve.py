from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json,base64,pathlib,os
os.chdir(pathlib.Path(__file__).resolve().parents[2])
class Handler(SimpleHTTPRequestHandler):
 def do_POST(self):
  if self.headers.get('Origin') not in [None,'http://127.0.0.1:8882']: self.send_error(403);return
  if int(self.headers.get('Content-Length','0'))>40*1024*1024:self.send_error(413);return
  if self.path!='/export': self.send_error(404);return
  data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if data['id'] not in ['four-stroke','pendulum','generator','slushie','slushie-main','bike','phone','vend','vinyl','house','space','fish','materials','plan','climate','sky','inanga','kokopu','ecology','energy','particles','reactions','engine','pinball','shaky','shapes','atoms','genes']:self.send_error(400);return
  for ext in ['glb','usdz']: pathlib.Path('study/ar/models/'+data['id']+'.'+ext).write_bytes(base64.b64decode(data[ext]))
  pathlib.Path('study/ar/models/'+data['id']+'.json').write_text(json.dumps({'boundsMetres':data['size']}))
  self.send_response(200);self.end_headers();self.wfile.write(b'ok')
ThreadingHTTPServer(('127.0.0.1',8882),Handler).serve_forever()
