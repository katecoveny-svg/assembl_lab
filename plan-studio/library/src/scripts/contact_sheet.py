"""Contact sheet of previews for review: python3 -I scripts/contact_sheet.py OUT.png [cols] [size]"""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = json.load(open(os.path.join(ROOT, '.cache', 'render-list.json')))
out = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 10; S = int(sys.argv[3]) if len(sys.argv) > 3 else 180
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * S, rows * (S + 14)), 'white')
d = ImageDraw.Draw(sheet)
for i, it in enumerate(items):
    im = Image.open(os.path.join(ROOT, 'public', 'previews', it['id'] + '.webp')).convert('RGB').resize((S, S))
    x, y = (i % cols) * S, (i // cols) * (S + 14)
    sheet.paste(im, (x, y))
    d.text((x + 3, y + S), it['id'].replace('kowhai-hero-', 'k-').replace('objects-', 'o-').replace('curated-', 'c-'), fill=(40, 20, 30))
sheet.save(out)
