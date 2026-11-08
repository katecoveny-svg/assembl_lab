"""Normalize two vendored Three.js USD shader types, preserve stored 64-byte aligned USDZ."""
from pathlib import Path
import zipfile,struct,sys
p=Path(sys.argv[1]);z=zipfile.ZipFile(p);files=[]
for info in z.infolist():
 data=z.read(info.filename)
 if info.filename.endswith('.usda'):data=data.replace(b'token inputs:varname',b'string inputs:varname').replace(b'token inputs:in.connect',b'float2 inputs:in.connect')
 files.append((info.filename,data))
z.close();out=p.with_suffix('.aligned.usdz')
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as dst:
 for name,data in files:
  info=zipfile.ZipInfo(name);info.compress_type=zipfile.ZIP_STORED
  offset=dst.fp.tell()+30+len(name.encode());pad=(-offset)%64
  if 0<pad<4:pad+=64
  if pad:info.extra=struct.pack('<HH',0x1986,pad-4)+bytes(pad-4)
  dst.writestr(info,data)
out.replace(p)
