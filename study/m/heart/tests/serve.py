"""Local QA server only. Normal, delayed, or failed GLB loads; no production hooks.
Run from any directory: python3 study/m/heart/tests/serve.py --port 8770
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse,time
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8770);p.add_argument('--mode',choices=['normal','fail','delay'],default='normal');p.add_argument('--delay',type=float,default=30);a=p.parse_args()
root=Path(__file__).resolve().parents[4]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
 def do_GET(self):
  if self.path.split('?')[0].endswith('/heart/assets/heart_pump_lab.glb'):
   if a.mode=='delay':time.sleep(a.delay)
   if a.mode=='fail':self.send_error(503,'Intentional QA load failure');return
  try:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass # Expected when a load is cancelled.
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
