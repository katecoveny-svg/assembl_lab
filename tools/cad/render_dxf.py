"""Render DXF drawings to PNG previews with ezdxf's drawing add-on (matplotlib), to check them by eye.
Usage: python tools/cad/render_dxf.py OUT_DIR file.dxf [file.dxf ...]   (renders model space; --layouts also renders each
paper-space layout). Previews are for checking only and are not part of the site."""
import os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import ezdxf
from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
from ezdxf.addons.drawing.config import Configuration, BackgroundPolicy, ColorPolicy

def render(doc, layout, path, dpi=200, size=(16.54, 11.69)):
    fig = plt.figure(figsize=size); ax = fig.add_axes([0, 0, 1, 1])
    cfg = Configuration(background_policy=BackgroundPolicy.WHITE, color_policy=ColorPolicy.COLOR, lineweight_scaling=1.6)
    Frontend(RenderContext(doc), MatplotlibBackend(ax), config=cfg).draw_layout(layout, finalize=True)
    fig.savefig(path, dpi=dpi); plt.close(fig); return path

if __name__ == '__main__':
    out, files = sys.argv[1], [a for a in sys.argv[2:] if not a.startswith('--')]
    os.makedirs(out, exist_ok=True)
    for f in files:
        doc = ezdxf.readfile(f); base = os.path.splitext(os.path.basename(f))[0]
        print(render(doc, doc.modelspace(), os.path.join(out, base + '.png')))
        if '--layouts' in sys.argv:
            for name in doc.layout_names_in_taborder():
                if name == 'Model': continue
                print(render(doc, doc.layout(name), os.path.join(out, base + '__' + name.replace(' ', '_') + '.png'), dpi=150))
