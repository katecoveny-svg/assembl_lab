"""Reproducible Assembl film: original artwork, camera moves, titles, NZ narration."""
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/pursuit-story.mp4'
TMP=ROOT/'.cinematic-render'
TMP.mkdir(exist_ok=True)
FONT='/usr/share/fonts/opentype/urw-base35/URWGothic-Book.otf'
SERIF='/usr/share/fonts/opentype/urw-base35/P052-Italic.otf'
shots=[
 ('assembl-form','YOUR NEXT PITCH, REIMAGINED.','An idea they can','step inside.',False),
 ('architecture','FROM BUYER BRIEF TO BUYER EXPERIENCE.','Show the vision.','Make the next step real.',True),
 ('loyalty','A CUSTOMER JOURNEY FOR EVERY MOMENT.','From first interest.','To lasting loyalty.',True),
 ('assembl-form','IMAGERY. FILM. INTERACTIVE EXPERIENCES.','One brief.','A world of possibility.',False),
]
clips=[]
for n,(asset,eyebrow,line1,line2,dark) in enumerate(shots):
  ink='0xfffaf5' if dark else '0x43273e'
  texts=[]
  for label,text in [('eyebrow',eyebrow),('line1',line1),('line2',line2),('brand','assembl. / pursuit')]:
    path=TMP/f'{n}-{label}.txt';path.write_text(text);texts.append(path)
  filters=["scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440",f"zoompan=z='1.04+on*0.00022':x='iw/2-iw/zoom/2+sin(on/150)*20':y='ih/2-ih/zoom/2':d=252:s=1280x720:fps=30",'setsar=1']
  if dark: filters+=['drawbox=x=0:y=0:w=iw:h=ih:color=0x18141c@0.20:t=fill','drawbox=x=0:y=365:w=iw:h=355:color=0x18141c@0.35:t=fill']
  else: filters+=['drawbox=x=0:y=410:w=iw:h=310:color=0xf7f4ef@0.78:t=fill']
  def text(path,x,y,size,font=FONT,alpha="min(1,max(0,(t-0.3)/0.6))"):
    return f"drawtext=fontfile={font}:textfile={path}:fontcolor={ink}:fontsize={size}:x={x}:y={y}:alpha='{alpha}'"
  filters += [text(texts[3],60,40,26,alpha='1'),text(texts[0],64,455,12),text(texts[1],60,491,52),text(texts[2],60,550,53,SERIF)]
  if n==1:
    panel=TMP/'panel.txt';panel.write_text('YOUR BUYER JOURNEY\n\nWhat matters most?\n\nA better first conversation\n\nExplore the next step')
    filters += ["drawbox=x=875:y=190:w=330:h=230:color=0xf8f4ef@0.94:t=fill",f"drawtext=fontfile={FONT}:textfile={panel}:fontcolor=0x43273e:fontsize=17:line_spacing=6:x=898:y=211:alpha='min(1,max(0,(t-1)/.8))'", "drawbox=x=892:y=320:w=294:h=2:color=0x946880@0.8:t=fill:enable='gte(t,3)'"]
  filters += ["drawbox=x=60:y=676:w=1160:h=1:color=0xbaa4b1@0.6:t=fill",f"drawtext=fontfile={FONT}:text='0{n+1} / 04':fontcolor={ink}:fontsize=10:x=1170:y=685",'format=yuv420p']
  clip=TMP/f'shot-{n}.mp4';clips.append(clip)
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(ROOT/f'public/cinematic/{asset}.png'),'-vf',','.join(filters),'-t','8.4','-c:v','libx264','-preset','fast','-crf','19','-threads','2',str(clip)],check=True)
  print(f'Shot {n+1} rendered',flush=True)
inputs=sum((['-i',str(p)] for p in clips),[])
graph='[0:v][1:v]xfade=transition=fade:duration=1:offset=7.4[v1];[v1][2:v]xfade=transition=fade:duration=1:offset=14.8[v2];[v2][3:v]xfade=transition=fade:duration=1:offset=22.2,format=yuv420p[v];[4:a]adelay=400|400,apad,alimiter=limit=0.95[a]'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*inputs,'-i',str(ROOT/'public/cinematic/assembl-nz-voice.mp3'),'-filter_complex_threads','1','-filter_complex',graph,'-map','[v]','-map','[a]','-t','30.6','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-c:a','aac','-b:a','160k','-movflags','+faststart',str(OUT)],check=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','3','-i',str(OUT),'-frames:v','1',str(ROOT/'public/pursuit-story-poster.png')],check=True)
print(f'Film ready: {OUT.stat().st_size} bytes',flush=True)
