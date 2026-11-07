# Converts lab/pc/stills/*.png from stills.cjs to WebP (quality 84) and removes the PNGs.
import glob, os
from PIL import Image
for f in glob.glob(os.path.join(os.path.dirname(__file__), '../../lab/pc/stills/*.png')):
    Image.open(f).convert('RGB').save(f[:-4] + '.webp', quality=84, method=6); os.remove(f); print('webp', os.path.basename(f[:-4]))
