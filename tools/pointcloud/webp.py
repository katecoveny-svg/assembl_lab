# Converts lab/pc/stills/*.png from stills.cjs to WebP (quality 84) and removes the PNGs. A still rendered on no ground (clear: true)
# keeps its alpha, so it sits on the page's own plum with no box edge.
import glob, os
from PIL import Image
for f in glob.glob(os.path.join(os.path.dirname(__file__), '../../lab/pc/stills/*.png')):
    im = Image.open(f)
    clear = im.mode == 'RGBA' and im.getextrema()[3][0] < 255
    if clear: im.save(f[:-4] + '.webp', quality=76, alpha_quality=90, method=6)   # the empty margin stays exactly transparent; a high
    # alpha quality keeps the bloom's soft falloff smooth (lower values step it into visible bands)
    else: im.convert('RGB').save(f[:-4] + '.webp', quality=84, method=6)
    os.remove(f); print('webp', os.path.basename(f[:-4]), 'alpha' if clear else '')
