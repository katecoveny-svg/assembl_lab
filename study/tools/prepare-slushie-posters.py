"""Resize the artist's revised hero/card without cropping the machine.
Usage: python3 study/tools/prepare-slushie-posters.py /absolute/poster-revision-02
"""
from PIL import Image
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1])
hero=Image.open(source/'slushie-hero-revised.png').convert('RGB');hero.thumbnail((1200,1400));hero.save(root/'assets/models/slushie/slushie-hero.webp',quality=88)
card=Image.open(source/'slushie-card.png').convert('RGB');card.thumbnail((800,500))
# Match the catalogue's 8:5 frame by extending neutral side pixels, never crop the object.
x=(800-card.width)//2;out=Image.new('RGB',(800,500));out.paste(card.crop((0,0,1,500)).resize((x,500)),(0,0));out.paste(card,(x,0));out.paste(card.crop((card.width-1,0,card.width,500)).resize((800-x-card.width,500)),(x+card.width,0))
out.save(root/'study/thumbnails/slushie.jpg',quality=92);out.save(root/'assets/posters/m-slushie.webp',quality=88)
