from pathlib import Path
import re,hashlib
p=Path(__file__).resolve().parents[2] / 'pavilion'
def link(f,s,path):
 name=path.name;return re.sub(re.escape(s+name)+r'(?:\?v=\w+)?',s+name+'?v='+hashlib.sha256(path.read_bytes()).hexdigest()[:10],f)
for n,deps in [('kitchen.js',['design-profiles.js']),('garden-bed.js',['design-profiles.js']),('world.js',['design-profiles.js','house-walk.js','pohutukawa.js','kitchen.js','garden-bed.js','interior.js','arrange-room.js']),('app.js',['tour-score.js','world.js','house-walk.js'])]:
 f=p/n;s=f.read_text()
 for dep in deps:s=link(s,'./',p/dep)
 f.write_text(s)
f=p.parent/'index.html';s=f.read_text()
for dep in ('app.js','waterfront.css'):s=link(s,'/pavilion/',p/dep)
f.write_text(s)
