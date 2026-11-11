#!/usr/bin/env python3
"""Great Pyramid — everything below the Grand Gallery, at true size and place.

    python3 tools/blender/khufu_lower.py      ->  assets/models/khufu_lower.glb

After Petrie, The Pyramids and Temples of Gizeh (1883), ch. 7 (see
research/sites/khufu.md). Origin = centre of the base at pavement level;
the passage system lies in a vertical plane 7.29 m east of the centre.
  Entrance          floor 16.97 m above the base, in the north face
  Descending passage 105.23 m at 26 deg 31' 23", 1.05 m wide x 1.20 m high
                    (square to the slope) — masonry, then bedrock
  Ascending passage leaves it 28.19 m down, 39.29 m at 26 deg 2' 30", same
                    section; its foot is blocked by three granite plugs
  al-Ma'mun's tunnel the forced tunnel visitors use today: from the 7th
                    course on the centre line, level, then east to break in
                    just above the plugs (and down to the descending passage)
  Queen's passage   38.7 m level, 1.05 x 1.17 m, the last 5.5 m a 0.5 m step lower
  Queen's Chamber   5.76 m E-W x 5.23 N-S, walls 4.69 m, gable ridge 6.23 m,
                    on the pyramid's E-W axis; corbelled niche in the east
                    wall 4.67 m high, 1.57 m wide, 1.04 m deep; two shaft mouths
  Subterranean      horizontal passage 8.83 m, chamber 14.06 E-W x 8.25 N-S,
                    unfinished: rock fins on the west, a pit, a blind
                    passage 16.4 m south
Deliberate departures: the subterranean horizontal passage is 1.1 m high
(really 0.92 m) so a crouching player fits; the chamber's roof height and the
shape of its unfinished western half are approximate; the tunnel is regularised.
The first 4.6 m of the Queen's passage belong to khufu_upper.glb.
"""
import math, random
import bpy, bmesh
from mathutils import Vector
import gizalib as G

random.seed(11)
G.reset({
    'limestone': (0.66, 0.60, 0.50), 'masonry': (0.6, 0.55, 0.46), 'rock': (0.62, 0.56, 0.45),
    'granite': (0.42, 0.30, 0.26), 'granite_black': (0.08, 0.08, 0.09),
    'wood': (0.35, 0.22, 0.12), 'dark': (0.02, 0.02, 0.02), 'fixture': (1, 0.95, 0.8),
})

OFF = 7.29
A1 = math.radians(26 + 31 / 60 + 23 / 3600); S1, C1, T1 = math.sin(A1), math.cos(A1), math.tan(A1)
A2 = math.radians(26 + 2 / 60 + 30 / 3600); S2, C2, T2 = math.sin(A2), math.cos(A2), math.tan(A2)
HW = 0.525                                     # half width of the passages
V1, V2 = 1.20 / C1, 1.20 / C2                  # their vertical height
EY, EZ = 101.87, 16.97                         # entrance floor (Blender Y = north)
zd = lambda y: EZ - (EY - y) * T1              # descending-passage floor at Y
JS = 28.19; JY, JZ = EY - JS * C1, EZ - JS * S1                      # junction (floor lines)
BY, BZ = EY - 105.23 * C1, EZ - 105.23 * S1                           # foot of the descent
za = lambda y: JZ + (JY - y) * T2              # ascending-passage floor at Y
GY, GZ = JY - 39.29 * C2, JZ + 39.29 * S2                             # foot of the Grand Gallery
PLUG = 6.0                                     # the plugs fill the first 6 m of the ascent
PY, PZ = JY - PLUG * C2, JZ + PLUG * S2
face = lambda z: 115.2 * (1 - z / 146.6)       # Y of the (casing-less) north face at height z

# Subterranean
SN = BY - 8.83; SS = SN - 8.25; SE = OFF + 1.6; SW = SE - 14.06; SF, SR = BZ - 0.45, BZ + 3.05
# Queen's
QF = GZ - 0.5; QN = GY - 38.7; QS = QN - 5.23; QE = OFF + HW; QW = QE - 5.76; QM = (QN + QS) / 2
# al-Ma'mun's tunnel
TF = 6.85                                      # its floor
OPY0, OPY1 = PY - 0.35, PY - 2.0               # where it breaks into the ascending passage

voids = []
def void(name, build):
    bm = bmesh.new(); build(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    voids.append(G.obj(bm, name))

def prism_x(bm, profile, x0, x1, dz0=0.0, dz1=0.0):
    a = [bm.verts.new((x0, y, z + dz0)) for y, z in profile]
    b = [bm.verts.new((x1, y, z + dz1)) for y, z in profile]
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(a[::-1]); bm.faces.new(b)

sq = lambda h: [(OFF - HW, 0), (OFF + HW, 0), (OFF + HW, h), (OFF - HW, h)]
void('descent', lambda bm: G.prism(bm, sq(V1), EY + 1.2, BY - 0.05, zd(EY + 1.2), zd(BY - 0.05)))
void('sub_pass', lambda bm: G.box(bm, OFF - 0.41, OFF + 0.41, SN - 0.05, BY + 0.6, BZ, BZ + 1.1))
void('sub_recess', lambda bm: G.box(bm, OFF - 0.41 - 1.0, OFF - 0.36, BY - 4.2, BY - 2.4, BZ, BZ + 1.25))
void('sub_chamber', lambda bm: G.box(bm, SW, SE, SS, SN, SF, SR))
void('sub_pit', lambda bm: G.box(bm, OFF - 2.4, OFF - 0.6, SN - 5.0, SN - 3.2, SF - 3.2, SF + 0.05))
void('sub_blind', lambda bm: G.box(bm, OFF - 0.38, OFF + 0.38, SS - 16.4, SS + 0.05, BZ, BZ + 0.76))
void('well', lambda bm: G.box(bm, OFF - HW - 1.3, OFF - HW + 0.05, 14.6, 15.5, zd(15.05) + 0.05, zd(15.05) + 1.0))
void('ascent', lambda bm: G.prism(bm, sq(V2), PY, GY + 0.3, PZ, za(GY + 0.3)))
void('q_pass', lambda bm: G.box(bm, OFF - HW, OFF + HW, GY - 33.2 - 0.05, GY - 4.6, GZ, GZ + 1.17))
void('q_low', lambda bm: G.box(bm, OFF - HW, OFF + HW, QN - 0.05, GY - 33.2, QF, GZ + 1.17))
void('queen', lambda bm: prism_x(bm, [(QN, QF), (QS, QF), (QS, QF + 4.69), (QM, QF + 6.23), (QN, QF + 4.69)], QW, QE))
NC = QM - 0.64                                 # niche axis, 0.64 m south of the ridge
zt = QF
for w, h in ((1.57, 1.70), (1.31, 0.74), (1.05, 0.74), (0.79, 0.74), (0.52, 0.75)):
    void('niche', lambda bm, w=w, h=h, zt=zt: G.box(bm, QE - 0.05, QE + 1.04, NC - w / 2, NC + w / 2, zt - 0.01, zt + h))
    zt += h
void('niche_hole', lambda bm: G.box(bm, QE + 1.0, QE + 3.2, NC - 0.5, NC + 0.5, QF + 0.1, QF + 1.2))     # treasure-hunters' cut
for y0, y1 in ((QN - 0.05, QN + 1.4), (QS - 1.4, QS + 0.05)):
    void('q_shaft', lambda bm, y0=y0, y1=y1: G.box(bm, (QW + QE) / 2 - 0.105, (QW + QE) / 2 + 0.105, y0, y1, QF + 1.55, QF + 1.76))
# the forced tunnel
void('tunnel', lambda bm: G.box(bm, -1.05, 1.05, 73.6, 112.0, TF, TF + 2.35))
void('cavity', lambda bm: G.box(bm, 0.9, 6.55, OPY1 - 0.3, 76.2, TF, TF + 2.7))
void('breach', lambda bm: G.box(bm, 6.5, OFF - HW + 0.05, OPY1, OPY0, za(OPY0) + 0.02, za(OPY1) + 1.25))
# the ragged mouths in the face (taller than the passages behind them), with sills up to floor level
void('mouth_t', lambda bm: G.box(bm, -1.3, 1.3, 107.6, 112.5, TF - 1.3, TF + 3.65))
void('mouth_e', lambda bm: G.box(bm, OFF - 0.95, OFF + 0.95, EY - 2.4, EY + 2.5, EZ - 2.4, EZ + 3.3))
DY0, DY1 = 74.75, 75.95                        # the way down to the descending passage
void('down', lambda bm: prism_x(bm, [(DY0, 0), (DY1, 0), (DY1, 2.2), (DY0, 2.2)], 3.1, OFF - HW + 0.05, TF, zd(75.35) + 0.05))

room = G.union(voids, 'khufu_lower')
G.void_to_room(room, 0.7, drop=lambda c: c.y > face(c.z) - 0.02 or (abs(c.y - (GY + 0.3)) < 0.02 and abs(c.x - OFF) < HW + 0.01 and c.z > GZ - 0.5) or (c.y > GY - 4.62 and c.z > GZ - 0.1 and c.z < GZ + 1.3 and abs(c.x - OFF) < HW + 0.01 and c.y < GY - 4.5))

# rough-hewn surfaces: the tunnel, the cavity and the unfinished chamber
def rough(v):
    c = v.co
    if c.y > 73.0 and c.z > TF - 0.2 and c.x < 6.6 and c.z < TF + 3: return 0.14 if c.z > TF + 0.1 else 0.03
    if c.y < SN + 0.02 and c.z < SR + 0.1 and c.z > SF - 4: return 0.12 if c.z > SF + 0.1 else 0.05
    if c.x > QE + 0.9 and c.z < QF + 1.4 and c.y < QN: return 0.1
    return 0.0
bm = bmesh.new(); bm.from_mesh(room.data)
for v in bm.verts:
    r = rough(v)
    if r:
        rnd = random.Random(hash((round(v.co.x, 2), round(v.co.y, 2), round(v.co.z, 2))))
        v.co += Vector((rnd.uniform(-r, r), rnd.uniform(-r, r), rnd.uniform(-r, r) * (1.0 if r > 0.06 else 0.6)))
bm.normal_update(); bm.to_mesh(room.data); bm.free()

room.data.materials.clear()
NAMES = ['limestone', 'masonry', 'rock', 'granite', 'dark']
for m in NAMES: room.data.materials.append(G.M[m])
for p in room.data.polygons:
    c = p.center; m = 'limestone'
    in_pass = abs(c.x - OFF) < HW + 0.02
    if c.y > 72.5 and c.x < 6.7 and c.z > TF - 3.2 and not (in_pass): m = 'masonry'                  # forced through the core
    if c.z < 1.0 and c.y < 75: m = 'rock'                                                              # below the pavement: bedrock
    if in_pass and abs(c.y - PY) < 0.03 and c.z > PZ - 0.1: m = 'granite'                              # top of the uppermost plug
    if c.y < SS - 15.5 or (c.z < SF - 2.9 and c.y < SN) or (c.x < OFF - HW - 1.15 and abs(c.y - 15.05) < 0.5 and c.z < -20): m = 'dark'
    if c.x > QE + 3.0 or (abs(c.x - (QW + QE) / 2) < 0.12 and (c.y > QN + 1.2 or c.y < QS - 1.2) and c.z > QF + 1.5 and c.z < QF + 1.8): m = 'dark'
    p.material_index = NAMES.index(m); p.use_smooth = False

solids, deco = [], []
# ---- granite plugs: the lowest shows in the roof of the descending passage -----------------------
bm = bmesh.new(); G.prism(bm, sq(0.06), JY + 0.75, JY - 0.75, zd(JY + 0.75) + V1 - 0.05, zd(JY - 0.75) + V1 - 0.05)
deco.append(G.obj(bm, 'deco_plug', 'granite'))
# ---- steps: up from the cavity into the ascending passage, and down to the descending one ---------
top = za((OPY0 + OPY1) / 2)
bm = bmesh.new(); prism_x(bm, [(OPY1, -0.1), (OPY0, -0.1), (OPY0, 0.0), (OPY1, 0.0)], 4.5, 6.56, TF + 0.02, top)          # boarded ramp
prism_x(bm, [(OPY1, -0.1), (OPY0, -0.1), (OPY0, 0.0), (OPY1, 0.0)], 6.5, 6.56, TF - 0.6, top - 0.02)
solids.append(G.obj(bm, 'wramp_breach', 'wood'))
bm = bmesh.new()
x0, x1 = 3.1, OFF - HW; z1 = zd(75.35); ns = math.ceil((TF - z1) / 0.27)
for i in range(ns):
    xa = x0 + (x1 - x0) * i / ns
    G.box(bm, xa, xa + (x1 - x0) / ns + 0.02, DY0 + 0.05, DY1 - 0.05, z1 - 0.3, TF - (TF - z1) * (i + 1) / ns)
solids.append(G.obj(bm, 'steps_down', 'wood'))
bm = bmesh.new(); prism_x(bm, [(face(TF - 1.35), TF - 1.35), (107.6, TF - 1.35), (107.6, TF), (face(TF), TF)], -1.3, 1.3)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
solids.append(G.obj(bm, 'sill_t', 'masonry'))
bm = bmesh.new(); prism_x(bm, [(face(EZ - 2.6), EZ - 2.6), (EY - 2.4, EZ - 2.6), (EY - 2.4, zd(EY - 2.4)), (EY, EZ)], OFF - 0.95, OFF + 0.95)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
solids.append(G.obj(bm, 'sill_e', 'limestone'))
# a wooden step at the drop in the Queen's passage
solids.append(G.box_obj('qstep', 'wood', OFF - HW + 0.05, OFF + HW - 0.05, GY - 33.2 - 0.45, GY - 33.2, QF, QF + 0.25))

# ---- modern fittings: boarded floors with cleats, handrails ----------------------------------------
def boards(name, y_hi, y_lo, zf, pitch=0.42):
    bm = bmesh.new(); y = y_hi
    while y > y_lo:
        G.box(bm, OFF - 0.36, OFF + 0.36, y - 0.025, y + 0.025, zf(y) + 0.0, zf(y) + 0.035); y -= pitch
    deco.append(G.obj(bm, 'deco_' + name, 'wood'))
def rails(name, y_hi, y_lo, zf, h=0.62):
    bm = bmesh.new()
    for sx in (-1, 1):
        x = OFF + sx * (HW - 0.045)
        G.prism(bm, [(x - 0.02, h), (x + 0.02, h), (x + 0.02, h + 0.04), (x - 0.02, h + 0.04)], y_hi, y_lo, zf(y_hi), zf(y_lo))
    deco.append(G.obj(bm, 'deco_' + name, 'wood'))
boards('cleats_d', EY - 0.5, BY + 0.5, zd); rails('rails_d', EY - 0.5, BY + 0.6, zd)
boards('cleats_a', PY - 2.2, GY + 0.3, za); rails('rails_a', PY - 2.4, GY + 0.3, za)
# iron: the pit railing, the grille across the well's lower mouth, the entrance gates (standing open)
bm = bmesh.new()
px0, px1, py0, py1 = OFF - 2.65, OFF - 0.35, SN - 5.25, SN - 2.95
for (xa, ya, xb, yb) in ((px0, py0, px1, py0), (px1, py0, px1, py1), (px1, py1, px0, py1), (px0, py1, px0, py0)):
    for h in (0.55, 1.05):
        G.box(bm, min(xa, xb) - 0.02, max(xa, xb) + 0.02, min(ya, yb) - 0.02, max(ya, yb) + 0.02, SF + h, SF + h + 0.04)
    G.box(bm, xa - 0.025, xa + 0.025, ya - 0.025, ya + 0.025, SF, SF + 1.09)
solids.append(G.obj(bm, 'pitrail', 'granite_black'))
bm = bmesh.new()
for k in range(5): G.box(bm, OFF - HW - 0.03, OFF - HW - 0.005, 14.65 + k * 0.2, 14.68 + k * 0.2, zd(15.05) + 0.05, zd(15.05) + 1.0)
for k in range(4):
    y = EY - 1.0 - 0.02; G.box(bm, OFF + HW - 0.05, OFF + HW - 0.02, y - k * 0.22 - 0.02, y - k * 0.22, zd(y) + 0.05, zd(y) + V1 - 0.1)      # original entrance gate, swung open
    G.box(bm, 1.0, 1.03, 108.6 - k * 0.3, 108.63 - k * 0.3, TF + 0.05, TF + 2.1)                                                              # tunnel gate, swung open
deco.append(G.obj(bm, 'deco_iron', 'granite_black'))

# ---- lighting as it is today: small lamps along the passages, floods in the chambers ---------------
y = EY - 3
while y > BY: G.light((OFF + HW - 0.07, y, zd(y) + V1 - 0.12), 5, size=0.035); y -= 6.5
y = PY - 2
while y > GY: G.light((OFF + HW - 0.07, y, za(y) + V2 - 0.12), 5, size=0.035); y -= 6.5
y = GY - 6
while y > QN + 1: G.light((OFF + HW - 0.07, y, GZ + 1.08), 4, size=0.035); y -= 6.5
y = 106
while y > 76: G.light((0.95, y, TF + 2.05), 14, size=0.05); y -= 7.5
G.light((3.6, 72.2, TF + 2.3), 25, size=0.05)
for loc, e in (((QW + 0.4, QN - 0.4, QF + 0.12), 55), ((QW + 0.4, QS + 0.4, QF + 0.12), 55), ((QE + 0.5, NC, QF + 0.15), 12),
               ((SE - 0.5, SN - 0.5, SF + 0.15), 60), ((OFF - 5.0, SS + 0.5, SF + 0.15), 60), ((SW + 1.0, SN - 1.0, SR - 0.4), 40),
               ((OFF, BY - 4.4, BZ + 1.0), 5)):
    G.light(loc, e, size=0.06)

# ---- the unfinished western half of the subterranean chamber: rock fins and trenches ---------------
bm = bmesh.new()
x = SW + 0.2
while x < OFF - 4.2:
    w = random.uniform(0.9, 1.5); h = random.uniform(1.5, 2.6)
    G.box(bm, x, x + w, SS + random.uniform(0.0, 0.6), SN - random.uniform(0.0, 0.5), SF - 0.1, SF + h)
    x += w + random.uniform(0.45, 0.8)
for v in bm.verts:
    v.co += Vector((random.uniform(-0.08, 0.08), random.uniform(-0.08, 0.08), random.uniform(-0.1, 0.1) if v.co.z > SF else 0))
solids.append(G.obj(bm, 'fins', 'rock'))

# ---- anchors ----------------------------------------------------------------------------------------
G.empty('tp_mamun', (0.0, 106.0, TF + 0.3))
G.empty('tp_entrance', (OFF, EY - 2.0, zd(EY - 2.0) + 0.3))
G.empty('tp_queen', ((QW + QE) / 2, QM, QF + 0.3))
G.empty('tp_subterranean', (OFF + 0.4, SN - 1.5, SF + 0.3))
G.empty('poi_mamun', (0, 92, TF + 1.2))
G.empty('poi_plugs', (5.2, 72.5, TF + 1.2))
G.empty('poi_descending', (OFF, 50, zd(50) + 0.7))
G.empty('poi_ascending', (OFF, 56, za(56) + 0.7))
G.empty('poi_qpassage', (OFF, QN + 12, GZ + 0.7))
G.empty('poi_queen', ((QW + QE) / 2, QM, QF + 1.5))
G.empty('poi_niche', (QE - 0.6, NC, QF + 1.5))
G.empty('poi_subterranean', (OFF - 4, (SN + SS) / 2, SF + 1.5))
G.empty('poi_pit', (OFF - 1.5, SN - 2.4, SF + 1.2))
G.empty('poi_well', (OFF, 15.05, zd(15.05) + 0.7))

final = [room, G.join(solids, 'solids')]
G.join(deco, 'deco')
print('KEY', dict(GY=round(GY, 3), GZ=round(GZ, 3), QF=round(QF, 3), QM=round(QM, 3), QX=round((QW + QE) / 2, 3), BZ=round(BZ, 3), SF=round(SF, 3), SN=round(SN, 3),
                  EY=EY, EZ=EZ, JY=round(JY, 3), JZ=round(JZ, 3)))
G.bake_and_export(final, 'khufu_lower.glb')
