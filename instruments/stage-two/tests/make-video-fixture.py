"""Generate original local-only test clips using the already-installed ffmpeg."""
from pathlib import Path
import math, subprocess
out=Path('../../output/playwright');out.mkdir(parents=True,exist_ok=True)
raw=bytearray()
for f in range(30):
 t=f/29*math.pi*2
 for y in range(90):
  for x in range(160):
   orb=(x-(80+45*math.sin(t)))**2+(y-(45+23*math.cos(t)))**2<11**2
   ribbon=abs(y-(45+15*math.sin(x/20+t)))<3 and 15<x<145
   raw.extend((240,90,100) if orb else (70,190,180) if ribbon else (0,0,0))
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','160x90','-framerate','15','-i','pipe:0','-an','-c:v','libvpx-vp9','-pix_fmt','yuv420p',str(out/'original-motion.webm')],input=raw,check=True)
for name,size,duration in [('too-long','16x16','13'),('too-wide','1922x16','1')]:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'color=c=black:s={size}:r=5:d={duration}','-an','-c:v','libvpx-vp9',str(out/(name+'.webm'))],check=True)
