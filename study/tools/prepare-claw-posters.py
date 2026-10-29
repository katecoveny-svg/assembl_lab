"""Resize a genuine Blender hero render for the lesson and cards; never crop the cabinet.
Run: python3 study/tools/prepare-claw-posters.py /absolute/path/to/claw-hero.png
Only the neutral background's edge pixels are extended to fill the landscape card.
"""
from PIL import Image
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[2]
im=Image.open(sys.argv[1]).convert('RGB')
im.thumbnail((1200,1400))
im.save(root/'assets/models/claw/claw-hero.webp',quality=88)
thumb=im.copy();thumb.thumbnail((800,500))
x=(800-thumb.width)//2
card=Image.new('RGB',(800,500))
# Preserve the entire render, extending only the neutral studio background.
if thumb.height!=500:thumb=thumb.resize((round(thumb.width*500/thumb.height),500),Image.Resampling.LANCZOS);x=(800-thumb.width)//2
card.paste(thumb.crop((0,0,1,500)).resize((x,500)),(0,0))
card.paste(thumb,(x,0))
card.paste(thumb.crop((thumb.width-1,0,thumb.width,500)).resize((800-x-thumb.width,500)),(x+thumb.width,0))
card.save(root/'study/thumbnails/claw.jpg',quality=92)
card.save(root/'assets/posters/m-claw.webp',quality=88)
