import json,struct,zipfile,hashlib,pathlib,math
p=pathlib.Path('auckland/3d');b=(p/'auckland-city.glb').read_bytes();assert struct.unpack_from('<4sII',b)==(b'glTF',2,len(b));size,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a;g=json.loads(b[20:20+size]);binstart=20+size+8
for v in g['bufferViews']:assert v.get('byteOffset',0)+v['byteLength']<=g['buffers'][0]['byteLength']
triangles=0
for m in g['meshes']:
 for primitive in m['primitives']:
  a=g['accessors'][primitive['attributes']['POSITION']];assert a['componentType']==5126 and a['type']=='VEC3';view=g['bufferViews'][a['bufferView']];offset=binstart+view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',12)
  for i in range(a['count']):assert all(math.isfinite(x) for x in struct.unpack_from('<3f',b,offset+i*stride))
  triangles+=(g['accessors'][primitive['indices']]['count'] if 'indices'in primitive else a['count'])//3
for n in g['nodes']:
 if n.get('name')=='Auckland_CBD_true_proportions':
  scales=n.get('scale') or [math.sqrt(sum(n['matrix'][i+j]**2 for j in range(3))) for i in [0,4,8]]
  assert max(scales)-min(scales)<1e-10
raw=(p/'auckland-city.usdz').read_bytes();z=zipfile.ZipFile(p/'auckland-city.usdz')
for i in z.infolist():
 name,extra=struct.unpack_from('<HH',raw,i.header_offset+26);assert (i.header_offset+30+name+extra)%64==0 and i.compress_type==0
usd=z.read('model.usda').decode();assert 'metersPerUnit = 1' in usd and 'upAxis = "Y"' in usd
manifest=json.loads((p/'city-ar-manifest.json').read_text());assert manifest['verticalExaggeration']==1 and all(v['identical']for v in manifest['geometryParity'].values());assert abs(manifest['realWorldCropDimensionsMetres'][0]*manifest['uniformXYZScale']-.7)<1e-9
files={q.name:{'bytes':q.stat().st_size,'sha256':hashlib.sha256(q.read_bytes()).hexdigest()}for q in [p/'auckland-city.glb',p/'auckland-city.usdz']};assert files['auckland-city.glb']['bytes']<5*1024**2 and files['auckland-city.usdz']['bytes']<10*1024**2
r={'glbVersion':2,'finitePositions':True,'bufferViewsWithinBounds':True,'uniformCoreScale':True,'usdzStoredAligned64':True,'usdzMetresYUp':True,'triangles':triangles,'files':files,'limits':'Structural checks and Apple usdchecker, not a full Khronos glTF validator or physical-device AR test.'};(p/'city-ar-validation.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
