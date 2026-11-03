"""CAD exports for the wind tunnel machine (study/m/windtunnel.html): the race car from windtunnel.glb, as files students
can open in real CAD and 3D-print software.

Writes assets/models/windtunnel/cad/:
  race-car-1to20.stl   the whole car as one closed solid, scaled 1:20, in millimetres (about 265 mm long), ready to slice
  race-car.obj (+.mtl) the car at full size in metres, one named object per part, with the model's colours
  race-car-side.dxf    a side elevation at 1:20 on an A3 sheet: part outlines, dimensions in mm, title block

Run:  /tmp/bl/bin/python tools/cad/windtunnel_cad.py     (a Python with bpy 5.x, ezdxf and shapely)
The car is read from assets/models/windtunnel/windtunnel.glb (built by build_windtunnel.py), so the CAD files always match
the 3D model in the machine. Blender coordinates: metres, nose along +X, Z up, the car's centre line on Y = 0."""
import os, sys, math
import bpy, bmesh
from mathutils import Vector
import ezdxf
from ezdxf.enums import TextEntityAlignment
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'models', 'windtunnel', 'windtunnel.glb')
OUT = os.path.join(ROOT, 'assets', 'models', 'windtunnel', 'cad')
os.makedirs(OUT, exist_ok=True)
SCALE = 20                                     # the print is 1:20

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
car = bpy.data.objects['CAR']
def descendants(o):
    for c in o.children:
        yield c; yield from descendants(c)
parts = [o for o in descendants(car) if o.type == 'MESH']
print('car parts:', len(parts))
for o in [o for o in bpy.data.objects if o not in parts]: bpy.data.objects.remove(o)   # the tunnel, fan, empties
for o in parts:   # bake the hierarchy: every part in world coordinates, no parent
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    o.data = o.data.copy(); o.data.transform(o.matrix_world); o.matrix_world.identity()

def select(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

# ------------------------------------------------------------------ OBJ: full size, metres, named parts and materials
select(parts)
bpy.ops.wm.obj_export(filepath=os.path.join(OUT, 'race-car.obj'), export_selected_objects=True, export_materials=True,
                      export_uv=False, export_normals=True, forward_axis='NEGATIVE_Z', up_axis='Y', apply_modifiers=True)

# ------------------------------------------------------------------ side elevation outlines (before the parts are merged)
# looking at the car's right side (from -Y): u = x (nose to the right, as in the machine's drawings), v = z
GROUPS = [('CAR-WHEL', ('WHEEL_',)), ('CAR-WING', ('FRONT_', 'REAR_', 'BEAM_WING', 'ENDPLATE')),
          ('CAR-SUSP', ('WISHBONE', 'UPRIGHT', 'NOSE_PYLON', 'MIRROR_STALK')), ('CAR-HALO', ('HALO',)),
          ('CAR-DRVR', ('HELMET', 'VISOR')), ('CAR-FLOR', ('FLOOR', 'PLANK', 'DIFFUSER'))]
def layer_of(name):
    if any(k in name for k in ('WISHBONE', 'UPRIGHT')): return 'CAR-SUSP'
    for lay, keys in GROUPS:
        if any(name.startswith(k) or k in name for k in keys): return lay
    return 'CAR-BODY'
def projection(o):
    me = o.data; tris = []
    me.calc_loop_triangles()
    for t in me.loop_triangles:
        p = [me.vertices[i].co for i in t.vertices]
        q = Polygon([(v.x, v.z) for v in p])
        if q.area > 1e-9: tris.append(q)
    return unary_union(tris).buffer(0) if tris else None
proj = []
for o in parts:
    g = projection(o)
    if g is None or g.is_empty: continue
    ys = [v.co.y for v in o.data.vertices]
    proj.append(dict(name=o.name, layer=layer_of(o.name), geom=g, depth=min(ys)))   # smaller y = nearer the viewer
proj.sort(key=lambda d: d['depth'])
silhouette = unary_union([d['geom'] for d in proj]).buffer(0)
nearer = None; visible = []
for d in proj:   # hidden-line removal by parts: keep only what the nearer parts don't cover
    vis = d['geom'] if nearer is None else d['geom'].difference(nearer)
    if not vis.is_empty and vis.area > 2e-6: visible.append((d['layer'], vis))
    nearer = d['geom'] if nearer is None else unary_union([nearer, d['geom']])
bb = silhouette.bounds   # (xmin, zmin, xmax, zmax) in metres
print('silhouette bounds (m):', [round(b, 3) for b in bb])

# ------------------------------------------------------------------ the 1:20 print: every part cleaned, then unioned into one solid
# Each part is cleaned the way Blender's 3D-print toolbox does it (merge by distance, fill holes, recalculate normals), then
# all the parts are unioned with manifold3d (a robust mesh boolean library) so the slicer gets one closed, watertight shell.
import numpy as np, manifold3d, trimesh
def edge_report(F):
    """(non-manifold edges, boundary edges): every edge of a closed solid is shared by exactly two triangles"""
    e = np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
    _, n = np.unique(e, axis=0, return_counts=True); return int((n > 2).sum()), int((n == 1).sum())
def cleaned(o):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)                        # glTF splits verts at seams
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)    # cap open tube ends (the halo)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-7, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=bm.faces); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    V = np.array([v.co[:] for v in bm.verts], dtype=np.float64); F = np.array([[v.index for v in f.verts] for f in bm.faces], dtype=np.int64)
    bm.free(); return V, F
solids, skipped, raw_faces = [], [], 0
rng = np.random.default_rng(20)
for o in parts:
    V, F = cleaned(o); raw_faces += len(F)
    # nudge each part by a few hundredths of a millimetre (at full size) so no two parts merely touch along a shared face or
    # edge: the union then cuts them properly, and the STL stays manifold once a slicer welds vertices by position
    V = V + rng.uniform(-3e-5, 3e-5, 3)
    m = manifold3d.Manifold(manifold3d.Mesh(vert_properties=V.astype(np.float32), tri_verts=F.astype(np.uint32)))
    if m.status() != manifold3d.Error.NoError or m.is_empty():
        tm = trimesh.Trimesh(V, F, process=True); trimesh.repair.fill_holes(tm); trimesh.repair.fix_normals(tm)
        m = manifold3d.Manifold(manifold3d.Mesh(vert_properties=np.asarray(tm.vertices, np.float32), tri_verts=np.asarray(tm.faces, np.uint32)))
    if m.status() != manifold3d.Error.NoError or m.is_empty():
        m = manifold3d.Manifold.hull_points(V.astype(np.float32)); skipped.append(o.name)   # last resort for a tiny part: its convex hull
    solids.append(m)
union = manifold3d.Manifold.batch_boolean(solids, manifold3d.OpType.Add)
mesh = union.to_mesh(); V = np.asarray(mesh.vert_properties)[:, :3].astype(np.float64); F = np.asarray(mesh.tri_verts).astype(np.int64)
tm = trimesh.Trimesh((V * 1000 / SCALE).astype(np.float32).astype(np.float64), F, process=True)   # mm at 1:20, welded as a slicer would
F = np.asarray(tm.faces); NM = edge_report(F)
print(f'print solid: parts={len(parts)} hulled={skipped} triangles={len(F)} non-manifold edges={NM[0]} boundary edges={NM[1]} '
      f'watertight={tm.is_watertight} volume={tm.volume / 1000:.1f} cm3 size_mm={np.round(tm.extents, 1).tolist()}')
tm.export(os.path.join(OUT, 'race-car-1to20.stl'))
union_ok = tm.is_watertight

# ------------------------------------------------------------------ the DXF: side elevation at 1:20 on A3 (millimetres)
doc = ezdxf.new('R2010', setup=True)
doc.header['$INSUNITS'] = 4; doc.header['$MEASUREMENT'] = 1; doc.header['$LUNITS'] = 2
doc.styles.add('ASSEMBL', font='arial.ttf'); doc.styles.add('ASSEMBL-MONO', font='cour.ttf')
LAYERS = {'CAR-OUTL': (7, 50), 'CAR-BODY': (6, 25), 'CAR-WING': (1, 25), 'CAR-WHEL': (8, 25), 'CAR-SUSP': (9, 18),
          'CAR-HALO': (5, 25), 'CAR-DRVR': (4, 18), 'CAR-FLOR': (3, 25), 'A-ANNO-DIMS': (7, 18), 'A-ANNO-TEXT': (7, 25),
          'A-ANNO-TTLB': (7, 35), 'A-ANNO-GRND': (8, 35)}
for n, (c, lw) in LAYERS.items(): doc.layers.add(n, color=c, lineweight=lw)
ds = doc.dimstyles.new('A20', dxfattribs=dict(dimtxt=2.5, dimasz=2.0, dimtsz=1.6, dimexe=1.5, dimexo=1.5, dimgap=1.0,
                                              dimscale=SCALE, dimdec=0, dimtad=1, dimtih=0, dimtoh=0, dimtxsty='ASSEMBL',
                                              dimlunit=2, dimclrd=256, dimclre=256, dimclrt=256, dimzin=8))
msp = doc.modelspace()
mmp = lambda u, v: (u * 1000, v * 1000)     # metres to drawing millimetres (model space is full size)
def poly(geom, layer):
    gs = getattr(geom, 'geoms', [geom])
    for g in gs:
        if g.geom_type != 'Polygon': continue
        for ring in [g.exterior, *g.interiors]:
            pts = [mmp(*p) for p in ring.simplify(0.0008).coords]
            if len(pts) > 3: msp.add_lwpolyline(pts, close=True, dxfattribs={'layer': layer})
for layer, g in visible: poly(g, layer)
poly(silhouette, 'CAR-OUTL')
x0, z0, x1, z1 = [b * 1000 for b in bb]
msp.add_line((x0 - 400, 0), (x1 + 400, 0), dxfattribs={'layer': 'A-ANNO-GRND'})
def text(t, p, h, layer='A-ANNO-TEXT', align=TextEntityAlignment.LEFT, style='ASSEMBL'):
    msp.add_text(t, height=h * SCALE, dxfattribs={'layer': layer, 'style': style}).set_placement(p, align=align)
def dim(p1, p2, base, angle=0):
    d = msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=angle, dimstyle='A20', dxfattribs={'layer': 'A-ANNO-DIMS'}); d.render()
fx, rx = 1550, -1620   # axle positions (build_windtunnel.py WHEELS: front x 1.55, r .33; rear x -1.62, r .345)
dim((x0, z1), (x1, z1), (0, z1 + 260))                                   # overall length
dim((rx, 345), (fx, 330), (0, -260))                                     # wheelbase, between the axle centres
dim((x1, 0), (x1, z1), (x1 + 300, 0), angle=90)                          # overall height
dim((x0, 0), (rx, 0), (0, -520)); dim((fx, 0), (x1, 0), (0, -520))      # rear and front overhangs
for x, r in ((fx, 330), (rx, 345)):
    msp.add_line((x - 80, r), (x + 80, r), dxfattribs={'layer': 'A-ANNO-DIMS'}); msp.add_line((x, r - 80), (x, r + 80), dxfattribs={'layer': 'A-ANNO-DIMS'})
text('FRONT WHEEL  %%c 660', (fx, -1000), 2.2, align=TextEntityAlignment.MIDDLE_CENTER, style='ASSEMBL-MONO')
text('REAR WHEEL  %%c 690', (rx, -1000), 2.2, align=TextEntityAlignment.MIDDLE_CENTER, style='ASSEMBL-MONO')
text('GROUND', (x0 - 380, 60), 2.0, style='ASSEMBL-MONO')
text('WIND  ←', (x1 + 120, z1 + 120), 2.2, style='ASSEMBL-MONO')

# the A3 sheet (420 × 297 mm at 1:20, so 8 400 × 5 940 in model space) with a title block on the right
W, H, M = 420 * SCALE, 297 * SCALE, 10 * SCALE
cx = (x0 + x1) / 2 + 45 * SCALE; cy = (z0 + z1) / 2 - 10 * SCALE   # the drawing sits in the space left of the title block
sx0, sy0 = cx - W / 2, cy - H / 2
L = lambda pts: msp.add_lwpolyline(pts, close=True, dxfattribs={'layer': 'A-ANNO-TTLB'})
L([(sx0, sy0), (sx0 + W, sy0), (sx0 + W, sy0 + H), (sx0, sy0 + H)])
L([(sx0 + M, sy0 + M), (sx0 + W - M, sy0 + M), (sx0 + W - M, sy0 + H - M), (sx0 + M, sy0 + H - M)])
tb0 = sx0 + W - M - 90 * SCALE
L([(tb0, sy0 + M), (sx0 + W - M, sy0 + M), (sx0 + W - M, sy0 + H - M), (tb0, sy0 + H - M)])
rows = [('assembl · study', 6, 'ASSEMBL'), ('Wind tunnel machine', 3.5, 'ASSEMBL'), ('Open-wheel race car', 3.5, 'ASSEMBL'),
        ('', 0, ''), ('SIDE ELEVATION', 3.5, 'ASSEMBL-MONO'), ('SCALE 1:20 @ A3', 2.5, 'ASSEMBL-MONO'), ('UNITS: MILLIMETRES', 2.5, 'ASSEMBL-MONO'),
        ('SHEET W101', 2.5, 'ASSEMBL-MONO'), ('', 0, ''), ('A generic practice model, not', 2.5, 'ASSEMBL'), ("any real team's car.", 2.5, 'ASSEMBL'),
        ('Simplified: outlines of the', 2.5, 'ASSEMBL'), ('Blender model, not a design for', 2.5, 'ASSEMBL'), ('manufacture.', 2.5, 'ASSEMBL'),
        ('', 0, ''), ('SOURCE windtunnel.glb', 2.0, 'ASSEMBL-MONO'), ('tools/cad/windtunnel_cad.py', 2.0, 'ASSEMBL-MONO')]
y = sy0 + H - M - 14 * SCALE
for t, h, st in rows:
    if t: text(t, (tb0 + 6 * SCALE, y), h, layer='A-ANNO-TTLB', style=st)
    y -= (h * 1.9 + 2.5) * SCALE if h else 5 * SCALE
text('SIDE ELEVATION  1:20', (sx0 + M + 8 * SCALE, sy0 + M + 10 * SCALE), 3.5, style='ASSEMBL-MONO')
# a scale bar: 0 to 1 m in 250 mm steps
bx, by = sx0 + M + 90 * SCALE, sy0 + M + 9 * SCALE
for i in range(4):
    msp.add_lwpolyline([(bx + i * 250, by), (bx + (i + 1) * 250, by), (bx + (i + 1) * 250, by + 2 * SCALE), (bx + i * 250, by + 2 * SCALE)],
                       close=True, dxfattribs={'layer': 'A-ANNO-TTLB'})
    if i % 2 == 0:
        h = msp.add_hatch(color=7, dxfattribs={'layer': 'A-ANNO-TTLB'})
        h.paths.add_polyline_path([(bx + i * 250, by), (bx + (i + 1) * 250, by), (bx + (i + 1) * 250, by + 2 * SCALE), (bx + i * 250, by + 2 * SCALE)])
text('0', (bx, by - 4 * SCALE), 2.0, style='ASSEMBL-MONO'); text('1 m', (bx + 1000, by - 4 * SCALE), 2.0, style='ASSEMBL-MONO')
# a paper-space layout with one 1:20 viewport on the sheet
lay = doc.layouts.new('W101 Side elevation')
lay.page_setup(size=(420, 297), margins=(0, 0, 0, 0), units='mm')
lay.add_viewport(center=(210, 148.5), size=(420, 297), view_center_point=(cx, cy), view_height=H)
doc.layouts.delete('Layout1')
doc.set_modelspace_vport(height=H * 1.05, center=(cx, cy))
auditor = doc.audit()
print('dxf audit errors:', len(auditor.errors), 'fixes:', len(auditor.fixes))
doc.saveas(os.path.join(OUT, 'race-car-side.dxf'))

for f in sorted(os.listdir(OUT)): print(f, os.path.getsize(os.path.join(OUT, f)))
with open(os.path.join(OUT, 'build-report.txt'), 'w') as fh:
    fh.write(f'race-car-1to20.stl: watertight={union_ok} triangles={len(F)} non_manifold_edges={NM[0]} boundary_edges={NM[1]} hulled_parts={skipped}\n'
             f'size_mm={np.round(tm.extents, 1).tolist()} volume_cm3={tm.volume / 1000:.1f}\n'
             f'silhouette_mm length={x1 - x0:.0f} height={z1 - z0:.0f}\n')
