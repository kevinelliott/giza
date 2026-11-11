#!/usr/bin/env python3
"""Pyramid of Menkaure — the substructure.

    python3 tools/blender/menkaure.py      ->  assets/models/menkaure.glb

Dimensions are Petrie's (The Pyramids and Temples of Gizeh, 1883, ch. 11, in
inches -> metres), with Vyse's passage length and angle; research/sites/menkaure.md
lists every figure and what is still assumed:
  entrance floor 165.3 in (4.20 m) above the base, middle of the north face;
  passage 31.7 m at 26 deg 2' (Vyse), ~1.05 x 1.2 m;
  first (panelled) chamber 3.17 (E-W) x 3.905 m, doorways 1.057 m, in the middle thirds;
  horizontal passage 12.6 m: 1.245 m high with portcullis slots at 1.62-1.905,
  2.746-3.083 and 3.79-4.10 m, then 1.806 m high to the second chamber;
  second chamber 14.23 x 3.86 m, 4.872 m high; door 2.634-3.686 m from its east wall;
  pilasters 10.57-11.63 m from the east wall, projecting 0.32 m; the upper (first-design)
  passage opens 2.99-4.37 m above the floor over the door;
  ramp in the floor from 5.16 m west of the east wall, 0.90 m wide (0.904 m high);
  granite chamber 6.623 (N-S) x 2.643 m, 2.687 m at the sides, 3.419 m at the crown,
  its 1.385 m doorway at the south end of the east wall;
  loculus chamber 1.9 (E-W) x 5.3 m, 2.0 m high, reached by six steps (0.287 m treads),
  door 0.965-1.877 m from its east side; four loculi east (0.83-0.86 m wide, ~1.44 m
  high, 2.57 m deep) and two north (0.70 and 0.65 m wide, 2.58 m deep).
Assumed: first-chamber height (2.13 m); depth of the lower apartments below the second
chamber (5.3 m, from the published section); stair rise. The ramp and lower passage are
1.25 m high here (really ~0.9 m: a crawl), everything else is true size — crouch.
Origin = centre of the pyramid's base; X east, Y north, Z up.
"""
import math
import bpy, bmesh
import gizalib as G

G.reset({'rock': (0.6, 0.52, 0.4), 'plaster': (0.66, 0.6, 0.5), 'granite': (0.42, 0.3, 0.26),
         'dark': (0.02, 0.02, 0.02), 'wood': (0.4, 0.27, 0.15), 'fixture': (1, 0.95, 0.8)})

IN = 0.0254
ANG = math.radians(26 + 2 / 60)
T26 = math.tan(ANG)
ENT = 165.3 * IN                         # entrance floor above the base
YD = 51.1 * (1 - ENT / 65)               # where it meets the north face
RUN = 31.7 * math.cos(ANG)
YA = YD - RUN                            # foot of the descent
F = ENT - RUN * T26                      # floor of the upper apartments
PW = 41.6 * IN / 2                       # half-width of passages and doorways
PV = 1.2 / math.cos(ANG)                 # vertical height of the sloping passage
C1W, C1L, C1H = 124.85 * IN, 153.8 * IN, 2.13
PY0, PY1 = YA - C1L, YA                  # first (panelled) chamber
HL = 12.6
UY1 = PY0 - HL; UY0 = UY1 - 152.2 * IN   # second chamber (north / south walls)
UX1 = (103.7 + 145.1) / 2 * IN; UX0 = UX1 - 560.0 * IN
UH = 191.8 * IN
RYc = (UY0 + UY1) / 2
DROP = 5.3; LF = F - DROP                # lower apartments (assumed depth)
RX0 = UX1 - 203.2 * IN                   # head of the ramp
RX1 = RX0 - DROP / T26                   # foot of the ramp
RW, RH = 35.5 * IN / 2, 1.25
BX1 = RX1 - 1.2; BX0 = BX1 - 103.8 * IN  # granite chamber (east / west walls)
BY0 = RYc - 54.52 * IN / 2; BY1 = BY0 + 259.8 * IN
BHS, BHM = 105.7 * IN, 134.9 * IN
STX = RX1 - 0.62                         # loculus stair, turning north out of the lower passage
SW = (73.9 - 38.0) * IN / 2
NX1 = STX + SW + 38.0 * IN; NX0 = NX1 - 75.5 * IN
NY0 = RYc + RW + 6 * 0.287; NY1 = NY0 + 208 * IN
NF, NH = LF - 6 * 0.2, 79 * IN

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
void('descent', lambda bm: G.prism(bm, sq(PW, PV), YD - 0.05, YA - 0.2, ENT - 0.05 * T26, ENT - (RUN + 0.2) * T26))
void('panelled', lambda bm: G.box(bm, -C1W / 2, C1W / 2, PY0, PY1, F, F + C1H))
P3 = PY0 - 161.5 * IN                                          # past the last portcullis the passage is higher
void('horiz_low', lambda bm: G.box(bm, -PW, PW, P3 - 0.05, PY0 + 0.05, F, F + 49.0 * IN))
void('horiz_high', lambda bm: G.box(bm, -PW, PW, UY1 - 0.05, P3, F, F + 71.1 * IN))
void('upper', lambda bm: G.box(bm, UX0, UX1, UY0, UY1, F, F + UH))
void('blind', lambda bm: G.box(bm, -0.5, 0.5, UY1 - 0.05, UY1 + 6.0, F + 117.7 * IN, F + 172.1 * IN))   # first-design passage
void('ramp', lambda bm: prism_x(bm, [(RYc - RW, 0), (RYc + RW, 0), (RYc + RW, RH), (RYc - RW, RH)], RX0, RX1, F, LF))
void('lower', lambda bm: G.box(bm, BX1 - 0.05, RX1 + 0.05, RYc - RW, RYc + RW, LF, LF + RH))
void('gdoor', lambda bm: G.box(bm, BX1 - 0.05, BX1 + 0.35, BY0, BY0 + 54.52 * IN, LF, LF + 80.8 * IN))  # granite doorway (3 courses)
def vault(bm):
    prof = [(BX0, 0.0), (BX1, 0.0), (BX1, BHS)]
    cx, hw = (BX0 + BX1) / 2, (BX1 - BX0) / 2
    prof += [(cx + hw * math.cos(a), BHS + (BHM - BHS) * math.sin(a)) for a in [math.pi * k / 12 for k in range(1, 12)]]
    prof += [(BX0, BHS)]
    G.prism(bm, prof, BY0, BY1, LF, LF)
void('burial', vault)
void('nstair', lambda bm: G.box(bm, STX - SW, STX + SW, RYc + RW - 0.05, NY0 + 0.05, NF, LF + 1.5))
void('nroom', lambda bm: G.box(bm, NX0, NX1, NY0, NY1, NF, NF + NH))
LOC_E = ((10.0, 42.7, 59.5, 102.5), (65.1, 98.9, 56.8, 101), (120.2, 153.6, 55.3, 101.5), (176.0, 208.0, 55.3, 97))
for a_, b_, h_, d_ in LOC_E:                                    # four loculi in the east wall
    void('locE', lambda bm, a_=a_, b_=b_, h_=h_, d_=d_: G.box(bm, NX1 - 0.05, NX1 + d_ * IN, NY0 + a_ * IN, NY0 + b_ * IN, NF, NF + h_ * IN))
for a_, b_, d_ in ((0.0, 27.5, 101), (48.3, 74.0, 102)):         # two in the north wall
    void('locN', lambda bm, a_=a_, b_=b_, d_=d_: G.box(bm, NX1 - b_ * IN, NX1 - a_ * IN, NY1 - 0.05, NY1 + d_ * IN, NF, NF + 55 * IN))
room = G.union(voids, 'substructure')
G.void_to_room(room, 0.6, drop=lambda c: c.y > YD - 0.1)       # open to the entrance
room.data.materials.clear()
for m in ('rock', 'plaster', 'granite', 'dark'): room.data.materials.append(G.M[m])
for p in room.data.polygons:
    c = p.center
    if c.x < BX1 + 0.4 and c.x < RX1 - 0.9 and BY0 - 0.1 < c.y < BY1 + 0.1 and c.z < LF + BHM + 0.1: p.material_index = 2    # granite chamber + doorway
    elif c.y > YA + 14 and abs(c.x) < PW + 0.1: p.material_index = 2                                      # granite-built part of the entrance passage
    elif PY0 - 0.02 < c.y < PY1 + 0.02 and abs(c.x) < C1W / 2 + 0.05 and c.z < F + C1H + 0.1: p.material_index = 1
    elif UY1 + 5.6 < c.y < UY1 + 6.2 and abs(c.x) < 0.6 and c.z > F + 2.9: p.material_index = 3          # the blind passage runs off into the dark
    else: p.material_index = 0
    p.use_smooth = False

solids, deco = [], []
# the two pilasters that divide the second chamber (rock-cut, 0.32 m proud of each long wall)
PXa, PXb = UX1 - (416.1 + 41.55) * IN, UX1 - 416.1 * IN
solids.append(G.box_obj('pilaster', 'rock', PXa, PXb, UY1 - 12.85 * IN, UY1 + 0.02, F, F + UH))
solids.append(G.box_obj('pilaster', 'rock', PXa, PXb, UY0 - 0.02, UY0 + 12.35 * IN, F, F + UH))
# the six steps down to the loculus chamber (treads 11.3 in)
bm = bmesh.new()
for i in range(6):
    y0 = RYc + RW + i * 0.287
    G.box(bm, STX - SW, STX + SW, y0, y0 + 0.3, NF - 0.1, LF - 0.2 * (i + 1) + 0.2)
solids.append(G.obj(bm, 'steps_loculus', 'rock'))
# the sites of the three portcullises, 63.9-75.0, 108.1-121.4 and 149.3-161.5 in beyond the doorway
bm = bmesh.new()
for a_, b_ in ((63.9, 75.0), (108.1, 121.4), (149.3, 161.5)):
    for sx in (-1, 1):
        x = sx * (PW - 0.002)
        vs = [bm.verts.new((x, PY0 - a_ * IN, F + 0.02)), bm.verts.new((x, PY0 - b_ * IN, F + 0.02)), bm.verts.new((x, PY0 - b_ * IN, F + 1.22)), bm.verts.new((x, PY0 - a_ * IN, F + 1.22))]
        bm.faces.new(vs if sx > 0 else vs[::-1])
deco.append(G.obj(bm, 'deco_portcullis', 'dark'))
# the fallen granite lintel of the first chamber's south door (62.9 x 18.4 x 15 in), lying on the floor
bm = bmesh.new(); G.box(bm, -0.8, 0.8, 0, 0.467, 0, 0.38)
from mathutils import Matrix
bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(1.35, 3, 'Z'))
bmesh.ops.translate(bm, verts=bm.verts, vec=(1.3, PY0 + 1.0, F))
solids.append(G.obj(bm, 'lintel', 'granite'))
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
RE = RX0 - RH / T26 - 0.3                                     # where the ramp's roof dips under the floor
rail((RX0 - 0.2, RYc - RW - 0.12, F), (RE, RYc - RW - 0.12, F)); rail((RX0 - 0.2, RYc + RW + 0.12, F), (RE, RYc + RW + 0.12, F)); rail((RE, RYc - RW - 0.12, F), (RE, RYc + RW + 0.12, F))

for loc, e in (((0.35, YA + 14, ENT - (RUN - 14) * T26 + 0.1), 30), ((0.35, YA + 3, F + 3 * T26 + 0.1), 30),
               ((1.2, PY0 + 0.4, F + 0.12), 45), ((0.35, PY0 - 7, F + 0.1), 30),
               ((UX1 - 0.5, UY0 + 0.4, F + 0.12), 90), ((UX0 + 0.6, UY1 - 0.4, F + 0.12), 90), ((-5.0, UY0 + 0.3, F + 0.12), 60),
               ((RX1 - 0.5, RYc - 0.3, LF + 0.1), 25), ((BX0 + 0.3, BY0 + 0.4, LF + 0.12), 60), ((BX1 - 0.3, BY1 - 0.4, LF + 0.12), 60),
               ((NX0 + 0.3, NY0 + 2.4, NF + 0.12), 45)):
    G.light(loc, e, size=0.06)

G.empty('tp_menkaure', (0.7, PY0 + 1.2, F + 0.3))
G.empty('poi_panelled', (0, (PY0 + PY1) / 2, F + 1.4))
G.empty('poi_upper', (-4, RYc, F + 1.6))
G.empty('poi_burial', ((BX0 + BX1) / 2, (BY0 + BY1) / 2, LF + 1.5))
G.empty('poi_niches', ((NX0 + NX1) / 2, (NY0 + NY1) / 2, NF + 1.0))
ym = (PY0 + PY1) / 2
G.empty('insc_menkaure_panel_long', (-C1W / 2 + 0.015, ym, F + 1.05), (0, 1, 0), (0, 0, 1), C1L - 0.2, 2.0)
G.empty('insc_menkaure_panel_long', (C1W / 2 - 0.015, ym, F + 1.05), (0, -1, 0), (0, 0, 1), C1L - 0.2, 2.0)
tw = (C1W - 2 * PW) / 2                                        # the end walls: a panelled third either side of the door
for sx in (-1, 1):
    xc = sx * (PW + tw / 2)
    G.empty('insc_menkaure_panel_short', (xc, PY1 - 0.015, F + 1.05), (-1, 0, 0), (0, 0, 1), tw - 0.08, 2.0)
    G.empty('insc_menkaure_panel_short', (xc, PY0 + 0.015, F + 1.05), (1, 0, 0), (0, 0, 1), tw - 0.08, 2.0)

final = [room, G.join(solids, 'solids')]
G.join(deco, 'deco')
G.bake_and_export(final, 'menkaure.glb')
