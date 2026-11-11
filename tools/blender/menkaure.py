#!/usr/bin/env python3
"""Pyramid of Menkaure — the substructure.

    python3 tools/blender/menkaure.py      ->  assets/models/menkaure.glb

After Vyse & Perring (1837), Maragioglio & Rinaldi (1967) as summarised on
Wikipedia, the section "Menkaure pyramid scheme.svg" and R. F. Morgan's 3D
reconstruction (Commons "Menkaure Iso.jpg"), and a photo of the burial
chamber — see research/sites/menkaure.md:
  entrance 4 m up the north face; passage 31.7 m at 26 deg; panelled chamber
  3.63 x 3.16 m (palace-facade niches); horizontal passage 12.6 m with three
  portcullis slots; the large chamber 14.2 x 3.84 x 4.87 m (E-W) with the
  blind upper passage high in its north wall; a ramp cut in its floor going
  down west to the granite burial chamber 6.59 x 2.62 x 3.43 m under a
  vault of recut granite beams; and the stepped side passage to the room
  with six niches (four east, two north).
Passages are enlarged to 1.2 x 2.0 m (really ~1.05 x 1.2 m).
Origin = centre of the pyramid's base; X east, Y north, Z up.
"""
import math
import bpy, bmesh
import gizalib as G

G.reset({'rock': (0.6, 0.52, 0.4), 'plaster': (0.66, 0.6, 0.5), 'granite': (0.42, 0.3, 0.26),
         'dark': (0.02, 0.02, 0.02), 'wood': (0.4, 0.27, 0.15), 'fixture': (1, 0.95, 0.8)})

T26 = math.tan(math.radians(26))
YD = 51.1 * (1 - 4 / 65)                 # entrance, north face, 4 m up
RUN = 31.7 * math.cos(math.radians(26))
YA = YD - RUN                            # foot of the descent
F = 4 - RUN * T26                        # floor level of the upper apartments (-9.9)
PY0, PY1 = YA - 3.63, YA                 # panelled chamber
UY1 = PY0 - 12.6; UY0 = UY1 - 3.84       # large chamber (north / south walls)
UX0, UX1 = -11.2, 3.0                    # its west / east ends
RYc = (UY0 + UY1) / 2                    # the ramp runs along the chamber's axis
LF = F - 3.4                             # floor level of the lower apartments
BX0, BX1 = -16.6, -13.98                 # burial chamber (2.62 m E-W)
BY0, BY1 = RYc - 3.3, RYc + 3.29         # 6.59 m N-S

voids = []
def void(name, build):
    bm = bmesh.new(); build(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    voids.append(G.obj(bm, name))

def prism_x(bm, profile, x0, x1, dz0=0.0, dz1=0.0):
    """Extrude a (y, z) polygon along X, shearing z."""
    a = [bm.verts.new((x0, y, z + dz0)) for y, z in profile]
    b = [bm.verts.new((x1, y, z + dz1)) for y, z in profile]
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(a[::-1]); bm.faces.new(b)

sq = lambda hw, h: [(-hw, 0), (hw, 0), (hw, h), (-hw, h)]
void('descent', lambda bm: G.prism(bm, sq(0.6, 2.0), YD - 0.05, YA - 0.2, 4 - 0.05 * T26, 4 - (RUN + 0.2) * T26))
void('panelled', lambda bm: G.box(bm, -1.58, 1.58, PY0, PY1, F, F + 2.6))
void('horizontal', lambda bm: G.box(bm, -0.6, 0.6, UY1 - 0.05, PY0 + 0.05, F, F + 2.0))
void('upper', lambda bm: G.box(bm, UX0, UX1, UY0, UY1, F, F + 4.87))
void('blind', lambda bm: G.box(bm, -0.55, 0.55, UY1 - 0.05, UY1 + 6.0, F + 3.0, F + 4.4))            # first-design passage, a blind alley
void('ramp', lambda bm: prism_x(bm, [(RYc - 0.6, 0), (RYc + 0.6, 0), (RYc + 0.6, 2.0), (RYc - 0.6, 2.0)], -3.0, -10.5, F, LF))
void('lower', lambda bm: G.box(bm, BX1 - 0.05, -10.45, RYc - 0.6, RYc + 0.6, LF, LF + 2.0))
def vault(bm):
    prof = [(BX0, 0.0), (BX1, 0.0), (BX1, 2.4)]
    cx, hw = (BX0 + BX1) / 2, (BX1 - BX0) / 2
    prof += [(cx + hw * math.cos(a), 2.4 + 1.03 * math.sin(a)) for a in [math.pi * k / 10 for k in range(1, 10)]]
    prof += [(BX0, 2.4)]
    G.prism(bm, prof, BY0, BY1, LF, LF)
void('burial', vault)
# stepped side passage north to the room with six niches
NX0, NX1 = -12.9, -10.9
void('nstair', lambda bm: G.box(bm, -12.5, -11.3, RYc + 0.55, RYc + 3.6, LF - 1.0, LF + 2.0))
NY0, NY1 = RYc + 3.55, RYc + 8.6
void('nroom', lambda bm: G.box(bm, NX0, NX1, NY0, NY1, LF - 1.0, LF + 1.3))
for k in range(4):                                             # four niches east
    y = NY0 + 0.35 + k * 1.22
    void('nicheE', lambda bm, y=y: G.box(bm, NX1 - 0.05, NX1 + 2.5, y, y + 0.9, LF - 1.0, LF + 0.4))
for k in range(2):                                             # two north
    x = NX0 + 0.1 + k * 1.0
    void('nicheN', lambda bm, x=x: G.box(bm, x, x + 0.8, NY1 - 0.05, NY1 + 2.5, LF - 1.0, LF + 0.4))
room = G.union(voids, 'substructure')
G.void_to_room(room, 0.6, drop=lambda c: c.y > YD - 0.1)       # open to the entrance
room.data.materials.clear()
for m in ('rock', 'plaster', 'granite', 'dark'): room.data.materials.append(G.M[m])
for p in room.data.polygons:
    c = p.center
    if c.x < BX1 + 0.02 and c.z < LF + 3.6 and BY0 - 0.1 < c.y < BY1 + 0.1: p.material_index = 2      # granite burial chamber
    elif c.y > YA + 14 and abs(c.x) < 0.7: p.material_index = 2                                       # granite-lined part of the descent
    elif PY0 - 0.02 < c.y < PY1 + 0.02 and abs(c.x) < 1.6 and c.z < F + 2.7 and c.y < YA + 0.1: p.material_index = 1
    elif c.y > UY1 + 5.6 and c.z > F + 2.9: p.material_index = 3                                      # the blind passage runs off into the dark
    else: p.material_index = 0
    p.use_smooth = False

solids, deco = [], []
# steps down to the niche room
bm = bmesh.new()
for i in range(5):
    y0 = RYc + 0.9 + i * 0.5
    G.box(bm, -12.5, -11.3, y0, y0 + 0.52, LF - 1.1, LF - 0.2 * (i + 1) + 0.0)
solids.append(G.obj(bm, 'steps_niche', 'rock'))
# the three portcullis slots near the north end of the horizontal passage
bm = bmesh.new()
for k in range(3):
    y = PY0 - 1.0 - k * 0.75
    for sx in (-1, 1):
        x = sx * 0.598
        vs = [bm.verts.new((x, y, F + 0.02)), bm.verts.new((x, y - 0.35, F + 0.02)), bm.verts.new((x, y - 0.35, F + 1.98)), bm.verts.new((x, y, F + 1.98))]
        bm.faces.new(vs if sx > 0 else vs[::-1])
deco.append(G.obj(bm, 'deco_portcullis', 'dark'))
# timber rails round the ramp opening in the floor (as a visitor would find it)
def rail(a, b):
    from mathutils import Vector
    a, b = Vector(a), Vector(b); d = b - a; L = d.length; d.normalize(); side = Vector((-d.y, d.x, 0))
    bm = bmesh.new()
    for h in (0.5, 0.95):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            p = v.co.copy(); v.co = a + d * (p.x + 0.5) * L + side * p.y * 0.05 + Vector((0, 0, h + p.z * 0.07))
    for t in (0.02, 0.5, 0.98):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            p = v.co.copy(); v.co = a + d * t * L + d * p.x * 0.06 + side * p.y * 0.06 + Vector((0, 0, (p.z + 0.5) * 1.0))
    solids.append(G.obj(bm, 'rail', 'wood'))
rail((-3.2, RYc - 0.7, F), (-7.6, RYc - 0.7, F)); rail((-3.2, RYc + 0.7, F), (-7.6, RYc + 0.7, F)); rail((-7.6, RYc - 0.7, F), (-7.6, RYc + 0.7, F))

for loc, e in (((0.45, YA + 14, 4 - (RUN - 14) * T26 + 0.12), 40), ((0.45, YA + 3, F + 3 * T26 + 0.12), 40),
               ((1.2, PY0 + 0.4, F + 0.12), 45), ((0.45, PY0 - 6, F + 0.12), 35),
               ((2.4, UY0 + 0.4, F + 0.12), 90), ((-10.4, UY1 - 0.4, F + 0.12), 90), ((-5.0, UY0 + 0.3, F + 0.12), 60),
               ((-12.0, RYc - 0.45, LF + 0.12), 35), ((BX0 + 0.3, BY0 + 0.4, LF + 0.12), 60), ((BX1 - 0.3, BY1 - 0.4, LF + 0.12), 60),
               ((NX0 + 0.3, NY0 + 2.4, LF - 0.88), 45)):
    G.light(loc, e, size=0.07)

G.empty('tp_menkaure', (0.6, PY0 + 1.2, F + 0.3))
G.empty('poi_panelled', (0, (PY0 + PY1) / 2, F + 1.4))
G.empty('poi_upper', (-4, RYc, F + 1.6))
G.empty('poi_burial', ((BX0 + BX1) / 2, RYc, LF + 1.5))
G.empty('poi_niches', ((NX0 + NX1) / 2, (NY0 + NY1) / 2, LF + 0.4))
ym = (PY0 + PY1) / 2
G.empty('insc_menkaure_panel_long', (-1.565, ym, F + 1.3), (0, 1, 0), (0, 0, 1), 3.4, 2.3)
G.empty('insc_menkaure_panel_long', (1.565, ym, F + 1.3), (0, -1, 0), (0, 0, 1), 3.4, 2.3)

final = [room, G.join(solids, 'solids')]
G.join(deco, 'deco')
G.bake_and_export(final, 'menkaure.glb')
