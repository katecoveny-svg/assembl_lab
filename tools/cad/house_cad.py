"""CAD exports for the house design machine (study/m/house.html): real drawings and models students can open in CAD.

Writes assets/models/house/cad/:
  house-drawings.dxf     the drawing set (R2010, millimetres): site plan 1:200, lower and upper floor plans, section A-A and
                         north elevation at 1:100, each on an A3 sheet with a title block, in model space at full size, plus
                         one paper-space layout per sheet
  house-A001-site-plan.dxf ... house-A301-north-elevation.dxf   the same sheets, one per file
  house.stl              the finished house (no site) in metres, Z up, origin at the lower floor (RL 10.000)
  house.obj + house.mtl  the house and its site model in metres, one named object per part, with the model's colours
  house-cadbuildr.py     the same house as a CADBuildr Foundation model (run it with cadbuildr-foundation installed)

Every number comes from assets/models/house/build_house.py, the Blender build behind the 3D model: this script reads that
file's design tables and fill functions (with the AST, without running Blender's part of it) and records the blocks they
would build. So the drawings, the CAD model and the 3D model in the machine always agree. Room names and the legal
boundary come from study/m/house.js (they are labels, not geometry, in the Blender build).

Drawings are made the way a CAD program makes them from a model: a plan is a horizontal cut 1.2 m above the floor (what
the cut passes through is solid poche; what is below is drawn in outline, nearer things hiding farther ones; what is above,
like the roof edge, is dashed). The section is a vertical cut at x = 1.2 m looking west, and the elevation is the model seen
from the north with hidden lines removed.

Run:  /tmp/bl/bin/python tools/cad/house_cad.py           (a Python with ezdxf + shapely; bpy 5.x for the STL/OBJ)
      CADBUILDR_PYTHON=/path/to/python  also runs house-cadbuildr.py with that interpreter (it needs cadbuildr-foundation).
A practice design, simplified: not for construction."""
import ast, math, os, re, subprocess, sys
import ezdxf
from ezdxf.enums import TextEntityAlignment as TA
from shapely.geometry import Polygon, box as sbox, LineString, MultiPolygon, GeometryCollection
from shapely.ops import unary_union

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BUILD = os.path.join(ROOT, 'assets', 'models', 'house', 'build_house.py')
OUT = os.path.join(ROOT, 'assets', 'models', 'house', 'cad')
os.makedirs(OUT, exist_ok=True)

# ================================================================== the design, read from build_house.py
SRC = open(BUILD).read()
TREE = ast.parse(SRC)
WANT = {'LO', 'UP', 'ceilL', 'ceilU', 'T', 'STAIR', 'OPEN', 'INNER', 'WALLS', 'FOOT', 'ROOMS', 'ground', 'SITE', 'layer_top',
        'PATH', 'path_top', 'TREES', 'F', 'piece', 'wall', 'glazing', 'inner_walls', 'foundations', 'floor_upper', 'deck',
        'furn_lower', 'furn_upper', 'stair'}
D = {'math': math}
keep = []
for n in TREE.body:
    names = set()
    if isinstance(n, ast.Assign): names = {t.id for t in n.targets if isinstance(t, ast.Name)}
    elif isinstance(n, ast.FunctionDef): names = {n.name}
    if names & WANT: keep.append(n)
exec(compile(ast.Module(body=keep, type_ignores=[]), BUILD, 'exec'), D)
assert not (WANT - set(D)), 'build_house.py no longer defines ' + ', '.join(sorted(WANT - set(D)))

class Rec(list):
    """stands in for a bmesh: build_house.py's box() and prism_x() append solid blocks here instead of making faces"""
def _box(bm, x0, x1, y0, y1, zb, zt):
    if x1 - x0 < 1e-4 or y1 - y0 < 1e-4: return
    f = lambda v, y: D['F'](v, 0, y)
    bm.append((x0, x1, [(y0, f(zb, y0)), (y1, f(zb, y1)), (y1, f(zt, y1)), (y0, f(zt, y0))]))
def _prism_x(bm, x0, x1, prof): bm.append((x0, x1, [tuple(p) for p in prof]))
D['box'], D['prism_x'] = _box, _prism_x
# the fill passed to each make('NAME', fill, ...) call at the top level of the build (lambdas or function names)
FILLS = {}
for n in TREE.body:
    calls = [n.value] if isinstance(n, ast.Expr) and isinstance(n.value, ast.Call) else []
    for c in calls:
        if getattr(c.func, 'id', '') == 'make' and isinstance(c.args[0], ast.Constant):
            FILLS[c.args[0].value] = c.args[1]
def record(name):
    rec = Rec(); fn = eval(compile(ast.Expression(FILLS[name]), BUILD, 'eval'), D); fn(rec); return rec
NEIGHBOURS = [tuple(ast.literal_eval(a) for a in c.value.args[1:]) for c in TREE.body
              if isinstance(c, ast.Expr) and isinstance(c.value, ast.Call) and getattr(c.value.func, 'id', '') == 'neighbour']

LO, UP, STAIR, OPEN, INNER, WALLS = D['LO'], D['UP'], D['STAIR'], D['OPEN'], D['INNER'], D['WALLS']
ceilL, ceilU, ground, PATH, TREES = D['ceilL'], D['ceilU'], D['ground'], D['PATH'], D['TREES']
RL0 = 10.0
G = {n: record(n) for n in ('FLOOR_LOWER', 'FLOOR_UPPER', 'WALLS_LOWER', 'WALLS_UPPER', 'WALLS_INNER', 'FOUND_LOWER',
                            'FOUND_UPPER', 'DECK', 'STAIR', 'ROOF_LOWER', 'ROOF_UPPER', 'FURN_LOWER', 'FURN_UPPER', 'PATH')}
for suf, keys in (('LOWER', ('LN', 'LE', 'LW')), ('UPPER', ('UN', 'US', 'UE', 'UW'))):
    g, f, d = Rec(), Rec(), Rec(); D['glazing'](g, f, d, keys)
    G['GLASS_' + suf], G['FRAMES_' + suf] = g, f
    if d: G['DOOR_FRONT'] = d
G['GLASS_LOWER'].append((-3.5, 5.5, [(7.94, -.02), (7.97, -.02), (7.97, 1.0), (7.94, 1.0)]))   # the deck's glass balustrade (as built)
assert 'box(bg, -3.5, 5.5, 7.94, 7.97, -.02, 1.0)' in SRC, 'balustrade moved in build_house.py'
DECK = dict(x0=G['DECK'][0][0], x1=G['DECK'][0][1], y0=G['DECK'][0][2][0][0], y1=G['DECK'][0][2][1][0])
RF = {k: (G[k][0][0], G[k][0][1], min(p[0] for p in G[k][0][2]), max(p[0] for p in G[k][0][2])) for k in ('ROOF_LOWER', 'ROOF_UPPER')}
# labels from the lesson (house.js): room names, and the legal boundary of the section
JS = open(os.path.join(ROOT, 'study', 'm', 'house.js')).read()
RNAME = {node: n for n, node in re.findall(r'n:"([^"]+)"[^}]*?node:"(ROOM_[A-Z0-9]+)"', JS)}
m = re.search(r'const SITE=\{x0:([-\d.]+),x1:([-\d.]+),y0:([-\d.]+),y1:([-\d.]+)\}', JS)
BOUNDARY = dict(x0=float(m[1]), x1=float(m[2]), y0=float(m[3]), y1=float(m[4]))
CUT_X = float(re.search(r'cut:([-\d.]+)', JS)[1])           # the machine's default section line, x = 1.2 m
LEVEL = {'LOWER': ['FLOOR_LOWER', 'WALLS_LOWER', 'FOUND_LOWER', 'GLASS_LOWER', 'FRAMES_LOWER', 'FURN_LOWER', 'DECK', 'STAIR'],
         'UPPER': ['FLOOR_UPPER', 'WALLS_UPPER', 'WALLS_INNER', 'FOUND_UPPER', 'GLASS_UPPER', 'FRAMES_UPPER', 'DOOR_FRONT', 'FURN_UPPER', 'STAIR']}
print('design read from build_house.py:', {k: len(v) for k, v in G.items()})

# ================================================================== geometry helpers (metres, in each drawing's own plane)
def prof_poly(pr): return Polygon(pr).buffer(0)
def zrange(pr): zs = [p[1] for p in pr]; return min(zs), max(zs)
def yrange(pr): ys = [p[0] for p in pr]; return min(ys), max(ys)
def parts(geom):
    if geom is None or geom.is_empty: return []
    if isinstance(geom, Polygon): return [geom]
    if isinstance(geom, (MultiPolygon, GeometryCollection)): return [g for p in geom.geoms for g in parts(p)]
    return []
def hidden_removed(items):
    """items: (layer, polygon, depth) with bigger depth nearer; returns the visible part of each, nearest first"""
    out, cover = [], None
    for layer, g, dep, occl in sorted(items, key=lambda t: -t[2]):
        vis = g if cover is None else g.difference(cover)
        if vis.area > 1e-6: out.append((layer, vis))
        if occl: cover = g if cover is None else unary_union([cover, g])
    return out

# ================================================================== the DXF document
LAYERS = {  # name: (ACI colour, lineweight 1/100 mm, linetype, description)
    'A-WALL': (7, 50, 'Continuous', 'walls cut by the plan'), 'A-WALL-PATT': (8, 0, 'Continuous', 'wall poche'),
    'A-GLAZ': (4, 18, 'Continuous', 'windows, sliders, glass'), 'A-DOOR': (3, 18, 'Continuous', 'doors and swings'),
    'A-FLOR': (7, 18, 'Continuous', 'floor edges, stair'), 'A-FURN': (8, 13, 'Continuous', 'furniture'),
    'A-DECK': (30, 18, 'Continuous', 'deck'), 'A-ROOF': (7, 25, 'Continuous', 'roofs'),
    'A-OVHD': (8, 18, 'A-HIDDEN', 'overhead and not-on-this-level, dashed'), 'A-ELEV': (7, 35, 'Continuous', 'elevation outlines'),
    'A-SECT': (7, 50, 'Continuous', 'section cut outlines and section marks'), 'A-SECT-PATT': (8, 0, 'Continuous', 'section poche'),
    'A-SECT-BYND': (8, 18, 'Continuous', 'seen beyond the section cut'),
    'A-ANNO-TEXT': (7, 25, 'Continuous', 'room names, notes'), 'A-ANNO-DIMS': (7, 18, 'Continuous', 'dimensions (mm)'),
    'A-ANNO-SYMB': (1, 25, 'Continuous', 'north point, levels, arrows'), 'A-ANNO-TTLB': (7, 35, 'Continuous', 'sheet border, title block'),
    'C-TOPO': (96, 18, 'Continuous', 'contours and ground lines'), 'C-TOPO-MAJR': (96, 35, 'Continuous', 'whole-metre contours'),
    'C-TOPO-PATT': (8, 0, 'Continuous', 'cut earth'), 'C-PROP': (1, 35, 'A-CHAIN', 'legal boundary'),
    'C-ROAD': (8, 25, 'Continuous', 'street, path'), 'C-WATR': (5, 25, 'Continuous', 'harbour edge'),
    'C-VEG': (52, 18, 'Continuous', 'trees'), 'C-NBRS': (8, 25, 'Continuous', 'neighbouring buildings')}

def new_doc():
    doc = ezdxf.new('R2010', setup=True)
    hdr = doc.header
    hdr['$INSUNITS'] = 4; hdr['$MEASUREMENT'] = 1; hdr['$LUNITS'] = 2; hdr['$AUNITS'] = 0
    hdr['$LTSCALE'] = 1.0; hdr['$PSLTSCALE'] = 0
    doc.linetypes.add('A-HIDDEN', pattern=[3.0, 2.0, -1.0], description='Hidden / overhead __ __ __')
    doc.linetypes.add('A-CHAIN', pattern=[12.0, 8.0, -1.5, 1.0, -1.5], description='Boundary / section line ____ . ____')
    doc.styles.add('ASSEMBL', font='arial.ttf'); doc.styles.add('ASSEMBL-MONO', font='cour.ttf')
    for n, (c, lw, lt, desc) in LAYERS.items():
        lay = doc.layers.add(n, color=c, linetype=lt); lay.dxf.lineweight = lw; lay.description = desc
    for S in (100, 200):
        doc.dimstyles.new(f'A{S}', dxfattribs=dict(dimtxt=2.5, dimasz=2.0, dimtsz=1.5, dimexe=1.5, dimexo=1.5, dimgap=0.8,
                                                   dimscale=S, dimdec=0, dimtad=1, dimtih=0, dimtoh=0, dimtxsty='ASSEMBL',
                                                   dimlunit=2, dimclrd=256, dimclre=256, dimclrt=256, dimzin=8, dimdsep=ord('.')))
    return doc

TITLE_W = 90   # title block strip width, paper mm
class Sheet:
    """one A3 sheet in model space: the frame at (fx, fy) mm, scale 1:S, drawing-plane metres mapped by map(a, b)"""
    def __init__(self, msp, num, title, S, fx, fy, centre, flip=False):
        self.msp, self.num, self.title, self.S, self.fx, self.fy = msp, num, title, S, fx, fy
        W, H = 420 * S, 297 * S
        ax, ay = fx + (W - TITLE_W * S) / 2, fy + H / 2 + 6 * S           # the middle of the drawing area
        self.k = -1 if flip else 1
        self.map = lambda a, b: (ax + (self.k * a - self.k * centre[0]) * 1000, ay + (b - centre[1]) * 1000)
        self.W, self.H = W, H
    def P(self, pts): return [self.map(*p) for p in pts]
    def line(self, a, b, layer, **kw): return self.msp.add_line(self.map(*a), self.map(*b), dxfattribs=self._at(layer, kw))
    def pline(self, pts, layer, close=False, **kw):
        if len(pts) < 2: return
        return self.msp.add_lwpolyline(self.P(pts), close=close, dxfattribs=self._at(layer, kw))
    def _at(self, layer, kw):
        at = {'layer': layer}
        if LAYERS[layer][2] != 'Continuous' or kw.get('lt'): at['ltscale'] = self.S
        if kw.get('lt'): at['linetype'] = kw['lt']
        if kw.get('lw'): at['lineweight'] = kw['lw']
        if kw.get('color'): at['color'] = kw['color']
        return at
    def geom(self, g, layer, hatch=None, hatch_layer=None, pattern=None, pscale=1.0, close_tol=1e-4):
        for p in parts(g):
            rings = [p.exterior, *p.interiors]
            for r in rings: self.pline(list(r.coords)[:-1], layer, close=True)
            if hatch is not None or pattern:
                h = self.msp.add_hatch(color=256, dxfattribs={'layer': hatch_layer or layer})
                if pattern: h.set_pattern_fill(pattern, scale=pscale * self.S * .4, color=256)
                for i, r in enumerate(rings):
                    h.paths.add_polyline_path(self.P(list(r.coords)[:-1]), is_closed=True, flags=1 if i == 0 else 0)
    def circle(self, c, r, layer): self.msp.add_circle(self.map(*c), r * 1000, dxfattribs={'layer': layer})
    def arc(self, c, r, a0, a1, layer):   # angles in drawing-plane degrees
        if self.k < 0: a0, a1 = 180 - a1, 180 - a0
        self.msp.add_arc(self.map(*c), r * 1000, a0, a1, dxfattribs={'layer': layer})
    def text(self, t, p, h, layer='A-ANNO-TEXT', align=TA.MIDDLE_CENTER, style='ASSEMBL', rot=0, paper=False):
        xy = p if paper else self.map(*p)
        e = self.msp.add_text(t, height=h * self.S, rotation=rot, dxfattribs={'layer': layer, 'style': style})
        e.set_placement(xy, align=align); return e
    def dim(self, p1, p2, base, angle=0):
        q1, q2, qb = self.map(*p1), self.map(*p2), self.map(*base)
        d = self.msp.add_linear_dim(base=qb, p1=q1, p2=q2, angle=angle, dimstyle=f'A{self.S}', dxfattribs={'layer': 'A-ANNO-DIMS'})
        d.render(); return d
    def chain(self, pts, base, horizontal=True):
        for a, b in zip(pts, pts[1:]):
            if horizontal: self.dim(a, b, (a[0], base))
            else: self.dim(a, b, (base, a[1]), angle=90)
    # ------------------------------------------------------------ symbols, in paper millimetres scaled to the sheet
    def north_point(self, p, r=7):
        R = r * self.S / 1000; c = p
        self.circle(c, R, 'A-ANNO-SYMB')
        tri = [(c[0], c[1] + R * 1.35), (c[0] + R * .42, c[1] - R * .55), (c[0], c[1] - R * .2), (c[0] - R * .42, c[1] - R * .55)]
        self.geom(Polygon(tri), 'A-ANNO-SYMB', hatch=True)
        self.text('N', (c[0], c[1] + R * 1.35 + 3.2 * self.S / 1000), 3.5, 'A-ANNO-SYMB')
    def level(self, p, txt, length=22, side=1):
        s = self.S / 1000; x, y = p; d = side * self.k    # side: +1 puts the text to the right on paper
        self.pline([(x - 2.4 * s, y + 3.4 * s), (x + 2.4 * s, y + 3.4 * s), (x, y)], 'A-ANNO-SYMB', close=True)
        self.line((x - d * 3 * s, y), (x + d * length * s, y), 'A-ANNO-SYMB')
        self.text(txt, (x + d * 3.5 * s, y + 1.2 * s), 2.2, 'A-ANNO-SYMB', TA.BOTTOM_LEFT if side > 0 else TA.BOTTOM_RIGHT, 'ASSEMBL-MONO')
    def arrow(self, a, b, layer='A-ANNO-SYMB', head=1.6):
        s = self.S / 1000; self.line(a, b, layer)
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); h = head * s
        for da in (2.6, -2.6):
            self.line(b, (b[0] + h * math.cos(ang + da), b[1] + h * math.sin(ang + da)), layer)
    def frame(self, sheet_list=None):
        S, fx, fy, W, H = self.S, self.fx, self.fy, self.W, self.H; M = 10 * S
        R = lambda x0, y0, x1, y1: self.msp.add_lwpolyline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True, dxfattribs={'layer': 'A-ANNO-TTLB'})
        R(fx, fy, fx + W, fy + H); R(fx + M, fy + M, fx + W - M, fy + H - M)
        tb = fx + W - M - TITLE_W * S; R(tb, fy + M, fx + W - M, fy + H - M)
        rows = [('assembl · study', 6, 'ASSEMBL'), ('House design machine', 3.5, 'ASSEMBL'), ('Split-level house on a', 3.0, 'ASSEMBL'),
                ('north-facing hillside, Aotearoa NZ', 3.0, 'ASSEMBL'), None, None,
                (self.num, 7, 'ASSEMBL-MONO'), (self.title.upper(), 3.2, 'ASSEMBL-MONO'), (f'SCALE 1:{S} @ A3', 2.6, 'ASSEMBL-MONO'),
                ('UNITS: MILLIMETRES', 2.6, 'ASSEMBL-MONO'), ('LEVELS: METRES (RL)', 2.6, 'ASSEMBL-MONO'), None,
                ('PRACTICE DESIGN', 3.4, 'ASSEMBL'), ('NOT FOR CONSTRUCTION', 3.4, 'ASSEMBL'), None,
                ('Simplified for teaching: no structure,', 2.4, 'ASSEMBL'), ('insulation, drainage, Building Code', 2.4, 'ASSEMBL'),
                ('or district plan checks. Not based on', 2.4, 'ASSEMBL'), ('any real house, site or firm.', 2.4, 'ASSEMBL'), None,
                ('MODEL  build_house.py', 2.0, 'ASSEMBL-MONO'), ('DRAWN  tools/cad/house_cad.py', 2.0, 'ASSEMBL-MONO')]
        if sheet_list:
            rows += [None, ('DRAWING LIST', 2.4, 'ASSEMBL-MONO')] + [(f'{n}  {t}', 2.1, 'ASSEMBL-MONO') for n, t in sheet_list]
        y = fy + H - M - 12 * S
        for r in rows:
            if r is None: y -= 4 * S; continue
            t, h, st = r
            self.text(t, (tb + 5 * S, y), h, 'A-ANNO-TTLB', TA.BOTTOM_LEFT, st, paper=True)
            y -= (h * 1.55 + 2.2) * S

# ================================================================== the plans
def cut_level(lv, cutZ):
    """plan cut: (poche polygons, glazing/frames cut, things below in outline, things above (overhead))"""
    solid, glaz, below, above = [], [], [], []
    for name in LEVEL[lv]:
        for x0, x1, pr in G[name]:
            z0, z1 = zrange(pr); y0, y1 = yrange(pr); r = sbox(x0, y0, x1, y1)
            if name == 'DOOR_FRONT': continue                           # drawn as a door swing instead
            if name == 'STAIR': below.append(('A-FLOR', r, z1, True)); continue
            layer = {'GLASS': 'A-GLAZ', 'FRAME': 'A-GLAZ', 'FURN_': 'A-FURN', 'DECK': 'A-DECK'}.get(name[:5], 'A-FLOR')
            if z0 < cutZ < z1:
                (glaz if layer == 'A-GLAZ' else solid if layer == 'A-FLOR' else below).append(r if layer in ('A-GLAZ', 'A-FLOR') else (layer, r, cutZ, True))
            elif z1 <= cutZ: below.append((layer, r, z1, layer != 'A-GLAZ'))
            elif layer == 'A-GLAZ' and name.startswith('GLASS'): above.append(r)
    return unary_union(solid), glaz, below, above

def plan_sheet(sh, lv):
    ffl = LO['ffl'] if lv == 'LOWER' else UP['ffl']; cutZ = ffl + 1.2
    poche, glaz, below, above = cut_level(lv, cutZ)
    # below the cut, in outline, nearer (higher) things hiding lower ones; the walls hide everything under them
    vis = hidden_removed([('A-WALL', poche, 1e9, True)] + below)
    for layer, g in vis:
        if layer != 'A-WALL': sh.geom(g, layer)
    for r in glaz: sh.geom(r.difference(poche), 'A-GLAZ')
    sh.geom(poche, 'A-WALL', hatch=True, hatch_layer='A-WALL-PATT')
    for r in above: sh.pline(list(r.exterior.coords)[:-1], 'A-OVHD', close=True)       # high windows, dashed
    # deck boards and the stair's walking line
    if lv == 'LOWER':
        x = DECK['x0'] + .3
        while x < DECK['x1'] - .05: sh.line((x, DECK['y0']), (x, DECK['y1']), 'A-DECK'); x += .3
    xm = (STAIR['x0'] + STAIR['x1']) / 2
    if lv == 'LOWER':
        sh.arrow((xm, STAIR['bottom'] - .12), (xm, STAIR['top'] + .1), 'A-FLOR')
        sh.text('UP', (STAIR['x0'] - .25, (STAIR['top'] + STAIR['bottom']) / 2), 2.2, 'A-ANNO-TEXT', TA.MIDDLE_RIGHT, 'ASSEMBL-MONO')
    else:
        sh.arrow((xm, STAIR['top'] + .1), (xm, STAIR['bottom'] - .12), 'A-FLOR')
        sh.text('DN', (STAIR['x0'] - .25, (STAIR['top'] + STAIR['bottom']) / 2), 2.2, 'A-ANNO-TEXT', TA.MIDDLE_RIGHT, 'ASSEMBL-MONO')
    # doors: the front door and the bedroom and bathroom doors, drawn open 90 degrees with their swing
    for key, o0, o1, sill, head, kind in OPEN:
        if kind == 'door' and key[0] == lv[0]:
            ax, a0, a1, b0, b1, zb, zt = WALLS[key]; w = o1 - o0
            sh.line((o0, b1), (o0, b1 + w), 'A-DOOR'); sh.arc((o0, b1), w, 0, 90, 'A-DOOR')
    if lv == 'UPPER':
        for ax, a0, a1, at, doors in INNER:
            for d0, d1 in doors:
                w = d1 - d0; hinge = (d0, at + .05)
                sh.line(hinge, (d0, at + .05 + w), 'A-DOOR'); sh.arc(hinge, w, 0, 90, 'A-DOOR')
    # roofs: this level's roof edge overhead (dashed); on the upper plan, the lower roof below in outline
    own = RF['ROOF_' + lv]
    sh.pline([(own[0], own[2]), (own[1], own[2]), (own[1], own[3]), (own[0], own[3])], 'A-OVHD', close=True)
    if lv == 'LOWER':
        u = RF['ROOF_UPPER']; ow = [(-7, -4.5), (7, -4.5), (7, 0), (-7, 0)]
        sh.pline(ow, 'A-OVHD', close=True)
        sh.text('UPPER LEVEL, 1 400 UP (SEE A102)', (0, -2.25), 2.5, 'A-ANNO-TEXT', style='ASSEMBL-MONO')
        sh.text('ROOF EDGE OVER (DASHED)', (-7.3, own[3] + .2), 1.8, 'A-ANNO-TEXT', TA.BOTTOM_LEFT, 'ASSEMBL-MONO')
    else:
        lr = RF['ROOF_LOWER']
        sh.pline([(lr[0], lr[2] + .0), (lr[1], lr[2]), (lr[1], lr[3]), (lr[0], lr[3])], 'A-ROOF', close=True)
        for x in (-4, 0, 4): sh.arrow((x, 5.2), (x, 1.4), 'A-ROOF', head=1.4)
        sh.text('LOWER ROOF BELOW, FALLS TO THE SOUTH', (-2.0, 5.95), 2.2, 'A-ANNO-TEXT', style='ASSEMBL-MONO')
        sh.text('ROOF EDGE OVER (DASHED)', (-7.3, own[2] - .2), 1.8, 'A-ANNO-TEXT', TA.TOP_LEFT, 'ASSEMBL-MONO')
    # room names and areas
    for name, x0, x1, y0, y1, f in D['ROOMS']:
        if (f == 0) != (lv == 'LOWER'): continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        cx, cy = {'ROOM_ENTRY': (5.0, -2.25), 'ROOM_LIVING': (4.9, 3.1), 'ROOM_KITCHEN': (-4.3, 1.45), 'ROOM_BED1': (-3.55, -1.5),
                  'ROOM_BED2': (.8, -1.5), 'ROOM_BATH': (-1.25, -1.9)}.get(name, (cx, cy))
        small = name in ('ROOM_HALL', 'ROOM_BATH')
        h = 2.4 if small else 2.2 if name in ('ROOM_BED1', 'ROOM_BED2') else 2.5 if name == 'ROOM_ENTRY' else 3.0
        sh.text(RNAME[name].upper(), (cx, cy + (0 if small else .2)), h, 'A-ANNO-TEXT')
        if not small: sh.text(f'{(x1 - x0) * (y1 - y0):.1f} m²', (cx, cy - .42), 2.2, 'A-ANNO-TEXT', style='ASSEMBL-MONO')
    if lv == 'LOWER':
        sh.text('DECK', (1.0, 7.45), 3.0, 'A-ANNO-TEXT'); sh.text(f'{(DECK["x1"] - DECK["x0"]) * (DECK["y1"] - DECK["y0"]):.1f} m²', (1.0, 6.95), 2.2, 'A-ANNO-TEXT', style='ASSEMBL-MONO')
        sh.text('GLASS BALUSTRADE', (-2.9, 8.25), 1.8, 'A-ANNO-TEXT', TA.BOTTOM_LEFT, 'ASSEMBL-MONO')
    sh.text(f'FFL RL {RL0 + ffl:.3f}', ((3.8, 0.55) if lv == 'LOWER' else (-6.6, -4.0)), 2.2, 'A-ANNO-TEXT', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')
    # dimensions (mm): openings along the north wall, rooms along the south, overall sizes
    if lv == 'LOWER':
        ln = sorted([(o[1], o[2]) for o in OPEN if o[0] == 'LN'])
        xs = [-7] + [v for o in ln for v in o] + [7]
        sh.chain([(x, 5.5) for x in xs], 9.6); sh.dim((-7, 5.5), (7, 5.5), (0, 10.5))
        sh.chain([(7, 0), (7, 5.5), (7, DECK['y1'])], 8.4, horizontal=False); sh.dim((7, 0), (7, DECK['y1']), (9.3, 0), angle=90)
        lw = [o for o in OPEN if o[0] == 'LW'][0]
        sh.chain([(-7, 0), (-7, lw[1]), (-7, lw[2]), (-7, 5.5)], -8.4, horizontal=False)
    else:
        xs = [-7] + sorted({a[3] for a in INNER if a[0] == 'y'}) + [7]
        sh.chain([(x, -4.5) for x in xs], -6.4); sh.dim((-7, -4.5), (7, -4.5), (0, -7.3))
        ys = [-4.5, INNER[0][3], 0]
        sh.chain([(7, y) for y in ys], 8.4, horizontal=False); sh.dim((7, -4.5), (7, 0), (9.3, 0), angle=90)
        d = [o for o in OPEN if o[0] == 'US' and o[5] == 'door'][0]
        sh.chain([(3.5, -4.5), (d[1], -4.5), (d[2], -4.5)], -5.6)
    # the section line A-A, looking west
    yt, yb = (8.75, -5.2) if lv == 'LOWER' else (7.4, -8.0)
    sh.line((CUT_X, yt), (CUT_X, yb), 'A-SECT', lt='A-CHAIN', lw=35)
    for y in (yt, yb):
        sh.arrow((CUT_X, y), (CUT_X - .9, y), 'A-SECT', head=2.0)
        sh.text('A', (CUT_X + .45, y), 3.5, 'A-SECT')
    sh.north_point((-9.6, 7.6 if lv == 'LOWER' else 5.2))

# ================================================================== section A-A at x = CUT_X, looking west (north on the right)
def section_sheet(sh, x=CUT_X):
    cut, cut_other, beyond = [], [], []
    for name, recs in G.items():
        if name == 'PATH': continue
        layer = 'A-GLAZ' if name.startswith(('GLASS', 'FRAMES')) else 'A-FURN' if name.startswith('FURN') else 'A-SECT'
        for x0, x1, pr in recs:
            p = prof_poly(pr)
            if x0 < x < x1: (cut if layer == 'A-SECT' else cut_other).append((layer, p))
            elif x1 <= x: beyond.append(('A-SECT-BYND' if layer == 'A-SECT' else layer, p, x1, not (name == 'GLASS_LOWER' and min(q[0] for q in pr) > 7)))
    poche = unary_union([p for _, p in cut])
    # the ground: natural ground at the cut, dug out under the lower floor; earth below it hatched
    ys = [i * .25 - 9.5 for i in range(81)]
    gl = [(y, min(ground(x, y) - RL0, -.3) if LO['y0'] < y < LO['y1'] else ground(x, y) - RL0) for y in ys]
    earth = Polygon([(-9.5, -2.7)] + gl + [(10.5, -2.7)]).buffer(0)
    vis = hidden_removed([('A-SECT', poche, 1e9, True), ('C-TOPO', earth, 1e8, True)] + beyond)
    for layer, g in vis:
        if layer not in ('A-SECT', 'C-TOPO'): sh.geom(g, layer)
    for layer, p in cut_other: sh.geom(p.difference(poche), layer)
    sh.geom(earth.difference(poche), 'C-TOPO-PATT', pattern='ANSI31', pscale=2, hatch_layer='C-TOPO-PATT')
    gline = LineString(gl).difference(poche.buffer(.001))
    for seg in getattr(gline, 'geoms', [gline]): sh.pline(list(seg.coords), 'C-TOPO-MAJR')
    sh.geom(poche, 'A-SECT', hatch=True, hatch_layer='A-SECT-PATT')
    # names of the rooms the cut passes through
    for name, x0, x1, y0, y1, f in D['ROOMS']:
        if x0 <= x <= x1:
            small = name == 'ROOM_HALL'
            at = (1.1, 2.4) if name == 'ROOM_LIVING' else ((y0 + y1) / 2, f + (.55 if small else 1.0))
            sh.text(RNAME[name].upper(), at, 2.0 if small else 3.0, 'A-ANNO-TEXT')
    if DECK['x0'] <= x <= DECK['x1']: sh.text('DECK', ((DECK['y0'] + DECK['y1']) / 2, .5), 3.0, 'A-ANNO-TEXT')
    top = ceilU(0, RF['ROOF_UPPER'][3]) + .25
    for z, t in ((0, f'FFL RL {RL0:.3f}'), (UP['ffl'], f'FFL RL {RL0 + UP["ffl"]:.3f}'), (top, f'RL {RL0 + top:.3f} ROOF'), (ceilL(0, 5.3), f'RL {RL0 + ceilL(0, 5.3):.3f} CEILING')):
        sh.level((DECK['y1'] + 1.0, z), t, length=30)
    sh.chain([(-8.0, 0), (-8.0, UP['ffl'])], -8.0, horizontal=False)
    sh.text('1 400 = HALF A LEVEL', (-9.3, 3.0), 1.8, 'A-ANNO-TEXT', TA.BOTTOM_LEFT, 'ASSEMBL-MONO')
    sh.dim((LO['y1'], 0), (LO['y1'], ceilL(0, LO['y1'])), (LO['y1'] - 1.0, 0), angle=90)     # the front ceiling height
    sh.chain([(RF['ROOF_UPPER'][2], -2.7), (UP['y0'], -2.7), (UP['y1'], -2.7), (LO['y1'], -2.7), (RF['ROOF_LOWER'][3], -2.7), (DECK['y1'], -2.7)], -3.6)
    sh.dim((UP['y0'], -2.7), (DECK['y1'], -2.7), (0, -4.5))
    sh.text('S · STREET', (-9.3, -2.2), 2.2, 'A-ANNO-TEXT', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')
    sh.text('VIEW · N', (10.3, -2.2), 2.2, 'A-ANNO-TEXT', TA.MIDDLE_RIGHT, 'ASSEMBL-MONO')
    sh.text('1 m EAVE', ((LO['y1'] + RF['ROOF_LOWER'][3]) / 2, ceilL(0, 6.5) + .65), 1.9, 'A-ANNO-TEXT', TA.BOTTOM_CENTER, 'ASSEMBL-MONO')
    sh.text('CLERESTORY WINDOWS', (.25, 4.2), 1.9, 'A-ANNO-TEXT', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')

# ================================================================== north elevation: the house seen from the north (east on the left)
def elevation_sheet(sh):
    items, gz = [], (lambda x: ground(x, LO['y1']) - RL0)
    earth = Polygon([(-10, -2.4)] + [(x / 4, gz(x / 4)) for x in range(-40, 41)] + [(10, -2.4)]).buffer(0)
    layer_of = lambda n: ('A-GLAZ' if n.startswith(('GLASS', 'FRAMES')) else 'A-ROOF' if n.startswith('ROOF') else
                          'A-DECK' if n == 'DECK' else 'A-DOOR' if n == 'DOOR_FRONT' else 'A-FURN' if n.startswith('FURN') else 'A-ELEV')
    for name, recs in G.items():
        if name == 'PATH': continue
        for x0, x1, pr in recs:
            ys = sorted({p[0] for p in pr}); y0, y1 = ys[0], ys[-1]
            n = max(1, int(math.ceil((y1 - y0) / .25))) if len(pr) > 4 or len({round(p[1], 4) for p in pr}) > 2 else 1
            strips = []
            for i in range(n):   # slice sloping profiles so each strip has one depth (see the module notes)
                a, b = y0 + (y1 - y0) * i / n, y0 + (y1 - y0) * (i + 1) / n
                sl = prof_poly(pr).intersection(sbox(a - 1e-9, -50, b + 1e-9, 50))
                if sl.is_empty: continue
                z0, z1 = sl.bounds[1], sl.bounds[3]
                strips.append((b, sbox(x0, z0, x1, z1)))     # the sheet maps x so that east is on the left
            balustrade = name == 'GLASS_LOWER' and y0 > 7
            for dep, g in strips: items.append((layer_of(name), g, dep, not balustrade, id(pr)))
    # hidden-line removal per strip, then the strips of each block are joined again before drawing
    cover = earth; vis = {}
    for layer, g, dep, occl, key in sorted(items, key=lambda t: -t[2]):
        v = g.difference(cover)
        if v.area > 1e-6: vis.setdefault(key, [layer, []])[1].append(v)
        if occl: cover = unary_union([cover, g])
    for layer, gs in vis.values():
        u = unary_union([g.buffer(1e-5) for g in gs]).buffer(-1e-5)
        sh.geom(u.simplify(1e-4), layer)
    sh.pline(list(earth.exterior.coords)[1:82], 'C-TOPO-MAJR', lw=70)   # the ground line: the heaviest line on an elevation
    top = ceilU(0, RF['ROOF_UPPER'][3]) + .25
    for z, t in ((0, f'FFL RL {RL0:.3f}'), (UP['ffl'], f'FFL RL {RL0 + UP["ffl"]:.3f} (UPPER)'), (top, f'RL {RL0 + top:.3f}')):
        sh.level((8.3, z), t, length=30, side=-1)
    sh.dim((7, -1.0), (-7, -1.0), (0, -3.2))
    xs = sorted({v for o in OPEN if o[0] == 'LN' for v in o[1:3]} | {-7, 7}, reverse=True)
    sh.chain([(x, 0) for x in xs], -2.4)
    sh.dim((-7.4, 0), (-7.4, ceilL(0, LO['y1'])), (-8.6, 0), angle=90); sh.dim((-7.4, 0), (-7.4, top), (-9.6, 0), angle=90)
    sh.text('E', (7.6, -1.6), 2.5, 'A-ANNO-TEXT', TA.MIDDLE_CENTER, 'ASSEMBL-MONO'); sh.text('W', (-7.6, -1.6), 2.5, 'A-ANNO-TEXT', TA.MIDDLE_CENTER, 'ASSEMBL-MONO')
    sh.text('CLERESTORY', (0, ceilU(0, 0) + .45), 1.9, 'A-ANNO-TEXT', TA.BOTTOM_CENTER, 'ASSEMBL-MONO')

# ================================================================== site plan, 1:200
def site_sheet(sh):
    X0, X1, Y0, Y1 = -20, 20, D['SITE']['y0'], 15.5
    sh.pline([(X0, -15.5), (X1, -15.5), (X1, Y1), (X0, Y1)], 'C-ROAD', close=True)    # the model board
    sh.line((X0, Y0), (X1, Y0), 'C-ROAD'); sh.line((X0, Y0 - .25), (X1, Y0 - .25), 'C-ROAD')
    sh.text('STREET', (-15, -14.1), 2.5, 'A-ANNO-TEXT', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')
    # contours every 0.5 m (whole metres heavier, labelled with their reduced level); the harbour edge below RL 8.5
    def cy(L, x): return (10.6 - L + .01 * max(0, abs(x) - 7) ** 2) / .16
    for k in range(0, 13):
        L = 8.5 + .5 * k; pts = [(x / 2, cy(L, x / 2)) for x in range(2 * X0, 2 * X1 + 1) if Y0 <= cy(L, x / 2) <= Y1]
        if len(pts) < 2: continue
        major = abs(L - round(L)) < 1e-9
        sh.pline(pts, 'C-WATR' if k == 0 else 'C-TOPO-MAJR' if major else 'C-TOPO')
        if major and k > 0:
            lx = 13.3; ly = cy(L, lx)
            if Y0 + .8 < ly < Y1 - .5: sh.text(f'{L:.1f}', (lx, ly + .35), 1.8, 'C-TOPO', TA.BOTTOM_CENTER, 'ASSEMBL-MONO')
    sh.text('HARBOUR', (8.3, 14.6), 2.2, 'C-WATR', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')
    # neighbours, trees, the entry path
    for x0, x1, y0, y1, h in NEIGHBOURS:
        sh.pline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 'C-NBRS', close=True)
        sh.line((x0, (y0 + y1) / 2), (x1, (y0 + y1) / 2), 'C-NBRS')          # its ridge
        sh.text('NEIGHBOUR', ((x0 + x1) / 2, (y0 + y1) / 2 + .8), 1.8, 'A-ANNO-TEXT', style='ASSEMBL-MONO')
    for i, (x, y) in enumerate(TREES):
        s = .85 + .25 * ((i * 7) % 3) / 2; sh.circle((x, y), 1.25 * s, 'C-VEG'); sh.circle((x, y), .1, 'C-VEG')
    sh.pline([(PATH['x0'], PATH['y0']), (PATH['x1'], PATH['y0']), (PATH['x1'], PATH['y1']), (PATH['x0'], PATH['y1'])], 'C-ROAD', close=True)
    sh.text('PATH', ((PATH['x0'] + PATH['x1']) / 2, -8.5), 1.8, 'A-ANNO-TEXT', TA.MIDDLE_CENTER, 'ASSEMBL-MONO', rot=90)
    # the legal boundary (red chain line) with its sizes and the ground level at each corner
    B = BOUNDARY
    sh.pline([(B['x0'], B['y0']), (B['x1'], B['y0']), (B['x1'], B['y1']), (B['x0'], B['y1'])], 'C-PROP', close=True)
    for x, y in ((B['x0'], B['y0']), (B['x1'], B['y0']), (B['x0'], B['y1']), (B['x1'], B['y1'])):
        sh.text(f'+{ground(x, y):.2f}', (x + (.5 if x < 0 else -.5), y + (.6 if y < 0 else -.6)), 1.8, 'C-TOPO',
                TA.BOTTOM_LEFT if x < 0 else TA.BOTTOM_RIGHT, 'ASSEMBL-MONO')
        sh.line((x - .3, y - .3), (x + .3, y + .3), 'C-TOPO'); sh.line((x - .3, y + .3), (x + .3, y - .3), 'C-TOPO')
    sh.dim((B['x0'], B['y1']), (B['x1'], B['y1']), (0, B['y1'] + 1.3))
    sh.dim((B['x0'], B['y0']), (B['x0'], B['y1']), (B['x0'] - 1.3, 0), angle=90)
    # the house: roof plan (upper roof over the lower where they overlap), deck, walls under the eaves dashed
    lr, ur = RF['ROOF_LOWER'], RF['ROOF_UPPER']
    upper = sbox(ur[0], ur[2], ur[1], ur[3]); lower = sbox(lr[0], lr[2], lr[1], lr[3]).difference(upper)
    deck = sbox(DECK['x0'], DECK['y0'], DECK['x1'], DECK['y1']).difference(lower)
    sh.geom(upper, 'A-ROOF'); sh.geom(lower, 'A-ROOF'); sh.geom(deck, 'A-DECK')
    sh.pline([(-7, -4.5), (7, -4.5), (7, 5.5), (-7, 5.5)], 'A-OVHD', close=True)
    for (y0, y1) in ((ur[3] - .9, ur[2] + .9), (lr[3] - .9, ur[3] + .5)):
        for x in (-4, 0, 4): sh.arrow((x, y0), (x, y1), 'A-ROOF', head=1.0)
    sh.text('UPPER ROOF', (-5.75, -1.0), 1.6, 'A-ANNO-TEXT', TA.MIDDLE_CENTER, 'ASSEMBL-MONO')
    sh.text('LOWER ROOF', (-5.75, 4.4), 1.6, 'A-ANNO-TEXT', TA.MIDDLE_CENTER, 'ASSEMBL-MONO')
    sh.text('DECK', (1.0, 7.25), 1.8, 'A-ANNO-TEXT', TA.MIDDLE_CENTER, 'ASSEMBL-MONO')
    # setbacks from the boundary to the walls (and the deck)
    sh.dim((B['x0'], -3.0), (-7, -3.0), (0, -3.0)); sh.dim((7, -3.0), (B['x1'], -3.0), (0, -3.0))
    sh.dim((-2.0, B['y0']), (-2.0, -4.5), (-2.0, 0), angle=90); sh.dim((-1.5, DECK['y1']), (-1.5, B['y1']), (-1.5, 0), angle=90)
    sh.text('FFL RL 10.000 / 11.400', (-11.5, -6.4), 1.8, 'A-ANNO-TEXT', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')
    sh.text('CONTOURS AT 0.5 m INTERVALS, RL IN METRES', (-19.5, -17.2), 1.8, 'A-ANNO-TEXT', TA.MIDDLE_LEFT, 'ASSEMBL-MONO')
    sh.north_point((-17.3, 5.4), r=8)

# ================================================================== the sheets
SHEETS = [('A001', 'Site plan', 200, site_sheet, (0, 0)), ('A101', 'Lower floor plan', 100, lambda s: plan_sheet(s, 'LOWER'), (0, 2.3)),
          ('A102', 'Upper floor plan', 100, lambda s: plan_sheet(s, 'UPPER'), (0, 0.0)),
          ('A201', 'Section A-A', 100, section_sheet, (0.5, 1.0)), ('A301', 'North elevation', 100, elevation_sheet, (0, 1.4))]
TITLES = {'A001': ('SITE PLAN', '1:200'), 'A101': ('LOWER FLOOR PLAN', '1:100 · CUT 1.2 m ABOVE FFL 10.000'),
          'A102': ('UPPER FLOOR PLAN', '1:100 · CUT 1.2 m ABOVE FFL 11.400'), 'A201': ('SECTION A-A', '1:100 · AT x = 1.2 m, LOOKING WEST'),
          'A301': ('NORTH ELEVATION', '1:100 · LOOKING SOUTH AT THE NORTH FACE')}
SLUG = {'A001': 'site-plan', 'A101': 'lower-floor-plan', 'A102': 'upper-floor-plan', 'A201': 'section-a-a', 'A301': 'north-elevation'}

def draw(doc, which, gap=6000):
    msp = doc.modelspace(); x = 0; made = []
    for num, title, S, fn, centre in SHEETS:
        if num not in which: continue
        sh = Sheet(msp, num, title, S, x, 0, centre, flip=(num == 'A301'))
        fn(sh)
        t, sc = TITLES[num]; s = S / 1000
        bl = (sh.fx + 18 * S, sh.fy + 26 * S)
        msp.add_text(t, height=4 * S, dxfattribs={'layer': 'A-ANNO-TEXT', 'style': 'ASSEMBL'}).set_placement(bl, align=TA.BOTTOM_LEFT)
        msp.add_text(sc, height=2.5 * S, dxfattribs={'layer': 'A-ANNO-TEXT', 'style': 'ASSEMBL-MONO'}).set_placement((bl[0], bl[1] - 6 * S), align=TA.BOTTOM_LEFT)
        msp.add_line((bl[0], bl[1] - 1.6 * S), (bl[0] + 130 * S, bl[1] - 1.6 * S), dxfattribs={'layer': 'A-ANNO-TEXT'})
        total = 10 if S == 200 else 5; seg = total * 1000 / 5; bx = bl[0] + 160 * S; by = bl[1] - 3 * S   # scale bar
        for i in range(5):
            q = [(bx + i * seg, by), (bx + (i + 1) * seg, by), (bx + (i + 1) * seg, by + 1.6 * S), (bx + i * seg, by + 1.6 * S)]
            msp.add_lwpolyline(q, close=True, dxfattribs={'layer': 'A-ANNO-TTLB'})
            if i % 2 == 0:
                h = msp.add_hatch(color=256, dxfattribs={'layer': 'A-ANNO-TTLB'}); h.paths.add_polyline_path(q)
        msp.add_text('0', height=2 * S, dxfattribs={'layer': 'A-ANNO-TTLB', 'style': 'ASSEMBL-MONO'}).set_placement((bx, by - 1.2 * S), align=TA.TOP_CENTER)
        msp.add_text(f'{total} m', height=2 * S, dxfattribs={'layer': 'A-ANNO-TTLB', 'style': 'ASSEMBL-MONO'}).set_placement((bx + total * 1000, by - 1.2 * S), align=TA.TOP_CENTER)
        sh.frame([(n, t) for n, t, *_ in SHEETS] if num == 'A001' else None)
        made.append((num, title, S, sh)); x += sh.W + gap
    for num, title, S, sh in made:   # one paper-space layout per sheet: an A3 page with a single viewport at the sheet's scale
        lay = doc.layouts.new(f'{num} {title}')
        lay.page_setup(size=(420, 297), margins=(0, 0, 0, 0), units='mm')
        lay.add_viewport(center=(210, 148.5), size=(420, 297), view_center_point=(sh.fx + sh.W / 2, sh.fy + sh.H / 2), view_height=sh.H)
    doc.layouts.delete('Layout1')
    x0, x1 = made[0][3].fx, made[-1][3].fx + made[-1][3].W; H = max(m[3].H for m in made)
    doc.set_modelspace_vport(height=H * 1.1, center=((x0 + x1) / 2, H / 2))
    return made

def save(doc, path):
    a = doc.audit()
    if a.errors: raise SystemExit(f'{path}: DXF audit found {len(a.errors)} errors')
    doc.saveas(path); print('wrote', os.path.relpath(path, ROOT), os.path.getsize(path), 'bytes; audit fixes', len(a.fixes))

def cadbuildr_model():
    """write house-cadbuildr.py: the house massing as CADBuildr Foundation extrusions, numbers inlined (mm)"""
    groups = [('slabs', ['FLOOR_LOWER', 'FLOOR_UPPER'], '#F3F0EA'), ('foundations', ['FOUND_LOWER', 'FOUND_UPPER'], '#E2DED7'),
              ('walls_lower', ['WALLS_LOWER'], '#F3F0EA'), ('walls_upper', ['WALLS_UPPER'], '#F3F0EA'), ('walls_inner', ['WALLS_INNER'], '#F3F0EA'),
              ('roof_lower', ['ROOF_LOWER'], '#D8D3CB'), ('roof_upper', ['ROOF_UPPER'], '#D8D3CB'), ('deck', ['DECK'], '#C9A47A'),
              ('stair', ['STAIR'], '#C9A47A'), ('front_door', ['DOOR_FRONT'], '#B98B5E'), ('glazing', ['GLASS_LOWER', 'GLASS_UPPER'], '#A9C6CF')]
    r = lambda v: round(v * 1000, 1)
    lines = []
    for gname, names, col in groups:
        blocks = [(r(x0), r(x1), [(r(y), r(z)) for y, z in pr]) for n in names for x0, x1, pr in G[n]]
        lines.append(f'    {gname!r}: ({col!r}, [\n' + ''.join(f'        ({b[0]}, {b[1]}, {b[2]}),\n' for b in blocks) + '    ]),')
    body = '\n'.join(lines)
    n_blocks = sum(len(G[n]) for _, ns, _ in groups for n in ns)
    src = f'''"""The assembl study house (a practice design: a split-level house on a north-facing NZ hillside) as a CADBuildr
Foundation model. Generated by tools/cad/house_cad.py from assets/models/house/build_house.py, so it has exactly the
same blocks as the Blender model in the house design machine. Not for construction: simplified massing, no structure.

Units: millimetres. X east, Y north, Z up; Z = 0 is the lower floor level (RL 10.000).
Every block is a profile in the Y-Z plane (a sketch on the part's yz plane) extruded along X from x0 to x1, so sloping
skillion roofs and the walls under them are exact.

Run:  pip install cadbuildr-foundation   then   python house-cadbuildr.py
It builds the DAG with show_dag(), then asks CADBuildr's kernel API (https://kernel-api.cadbuildr.com) to render
house.step and house-cadbuildr.stl. If the kernel API can't be reached and CadQuery is installed (pip install cadquery),
it writes house.step with CadQuery from the same blocks instead.
"""
import os, sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
# part name: (colour as in the Blender model, [(x0, x1, [(y, z), ...]), ...])   {n_blocks} blocks
BLOCKS = {{
{body}
}}


def build_assembly():
    from cadbuildr.foundation import Part, Assembly, Sketch, Extrusion

    class HousePart(Part):
        def __init__(self, name, colour, blocks):
            super().__init__()
            for x0, x1, prof in blocks:
                sketch = Sketch(self.yz())          # yz plane: sketch x is world Y, sketch y is world Z, normal +X
                pen = sketch.pencil
                pen.move_to(*prof[0])
                for y, z in prof[1:]:
                    pen.line_to(y, z)
                self.add_operation(Extrusion([pen.get_closed_shape()], end=x1, start=x0))
            self.paint(colour)

    house = Assembly()
    for name, (colour, blocks) in BLOCKS.items():
        house.add_component(HousePart(name, colour, blocks))
    return house


def step_with_cadquery(path):
    import cadquery as cq
    asm = cq.Assembly(name="house")
    for name, (colour, blocks) in BLOCKS.items():
        solids = [cq.Workplane("YZ").workplane(offset=x0).polyline(prof).close().extrude(x1 - x0).val() for x0, x1, prof in blocks]
        rgb = [int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        asm.add(cq.Workplane().add(cq.Compound.makeCompound(solids)), name=name, color=cq.Color(*rgb, 1.0))
    (asm.export if hasattr(asm, "export") else asm.save)(str(path))   # STEP AP214, millimetres, one named, coloured part per group
    return path


def main():
    from cadbuildr.foundation.dag_utils import show_dag
    dag = show_dag(build_assembly())
    for key in ("version", "rootNodeId", "DAG", "serializableNodes"):
        assert key in dag, "DAG is missing " + key
    assert dag["rootNodeId"] in dag["DAG"], "rootNodeId is not a node of the DAG"
    print(f"CADBuildr DAG built: {{len(dag['DAG'])}} nodes, root {{dag['rootNodeId']}}")
    if "--dag-only" in sys.argv:
        return
    from cadbuildr.foundation.coms.kernel_api import KernelApiClient
    client = KernelApiClient()
    try:
        step = client.render(dag=dag, kernel="replicad", format="step", file_name="house.step")
        (OUT / "house.step").write_bytes(step)
        stl = client.download_stl(dag=dag, kernel="replicad", file_name="house-cadbuildr.stl")
        (OUT / "house-cadbuildr.stl").write_bytes(stl)
        print("CADBuildr kernel rendered house.step and house-cadbuildr.stl")
    except Exception as e:
        print(f"CADBuildr render skipped: could not reach the kernel API at {{client.base_url}} ({{type(e).__name__}})")
        try:
            print("wrote", step_with_cadquery(OUT / "house.step"), "with CadQuery instead")
        except ImportError:
            print("CadQuery is not installed, so no STEP file was written (pip install cadquery)")
    finally:
        client.close()


if __name__ == "__main__":
    main()
'''
    p = os.path.join(OUT, 'house-cadbuildr.py'); open(p, 'w').write(src); print('wrote', os.path.relpath(p, ROOT), n_blocks, 'blocks')
    return p

def meshes():
    """house.stl (the house) and house.obj (house and site) from house.glb, the model the machine loads"""
    try:
        import bpy
    except ImportError:
        print('bpy not available: house.stl / house.obj not rebuilt'); return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'house', 'house.glb'))
    def desc(o):
        for c in o.children: yield c; yield from desc(c)
    house = [o for o in desc(bpy.data.objects['HOUSE']) if o.type == 'MESH']
    site = [o for o in desc(bpy.data.objects['SITE']) if o.type == 'MESH']
    keep = set(house) | set(site)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o not in keep: bpy.data.objects.remove(o)
    def sel(objs):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
    sel(house)
    bpy.ops.wm.stl_export(filepath=os.path.join(OUT, 'house.stl'), export_selected_objects=True, ascii_format=False,
                          forward_axis='Y', up_axis='Z', global_scale=1.0, apply_modifiers=True)
    sel(house + site)
    bpy.ops.wm.obj_export(filepath=os.path.join(OUT, 'house.obj'), export_selected_objects=True, export_materials=True,
                          export_uv=False, export_normals=True, forward_axis='NEGATIVE_Z', up_axis='Y', apply_modifiers=True)
    print('wrote house.stl (', len(house), 'parts) and house.obj (', len(house) + len(site), 'parts)')

if __name__ == '__main__':
    every = [s[0] for s in SHEETS]
    doc = new_doc(); draw(doc, every); save(doc, os.path.join(OUT, 'house-drawings.dxf'))
    for num in every:
        d = new_doc(); draw(d, [num]); save(d, os.path.join(OUT, f'house-{num}-{SLUG[num]}.dxf'))
    cadbuildr_model()
    if '--no-mesh' not in sys.argv: meshes()
    py = os.environ.get('CADBUILDR_PYTHON')
    if py: subprocess.run([py, os.path.join(OUT, 'house-cadbuildr.py')], check=False)
