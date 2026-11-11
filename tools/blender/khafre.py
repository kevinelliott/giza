#!/usr/bin/env python3
"""Pyramid of Khafre — both passage systems and the burial chamber.

    python3 tools/blender/khafre.py      ->  assets/models/khafre.glb

After Petrie, The Pyramids and Temples of Gizeh (1883), ch. 9 (inches x 0.0254;
see research/sites/khafre.md). Origin = centre of the base at pavement level.
  Upper passage   granite, 41.29 wide x 47.29 high, from 11.54 m up the north
                  face, 25 deg 55' down to the level of the chamber floor;
                  a half-round roll across the roof at its foot; granite
                  portcullis in grooves 15.5 thick (now propped up)
  Horizontal      41.59 wide x 71.06 high to the chamber; fine limestone, then
                  plastered rock; the lower passage rises through its floor
  Great chamber   557.7 E-W x 195.8 N-S, walls 206.4, gable 244.4 at the ends,
                  rock-cut and stuccoed under limestone gable beams; door
                  104.3-144.9 from the east wall; blind holes and red lines
                  198.3 from the east on the north and south walls
  Coffer          103.68 x 41.97 x 38.12 outside, sunk in the floor to the
                  level of its lid, 43.1 from the west wall and 42.5 from the
                  north; lid 103.73 x 42.03 x ~8.2 lying on the floor
  Lower passage   from the pavement north of the pyramid, down, level (with
                  a recess 123.8 x 68 on the east and a short slope west to
                  the lower chamber, 411.9 x 123.1, pent roof), then up to
                  the horizontal passage
Not measured by Petrie, so approximate here: the lengths and slopes of the
lower system (21 deg 40'), where it surfaces (8.9 m north of the base here,
moved 2 m north of the first estimate), the lower chamber's height (2.6 m),
the chamber's place north-south (centred under the apex), and the height the
portcullis is raised (1.12 m, so that a crouching player can pass).
"""
import math, random
import bpy, bmesh
from mathutils import Vector, Matrix
import gizalib as G

random.seed(5)
G.reset({
    'limestone': (0.66, 0.60, 0.50), 'plaster': (0.70, 0.66, 0.57), 'rock': (0.62, 0.56, 0.45), 'masonry': (0.6, 0.55, 0.46),
    'granite': (0.42, 0.30, 0.26), 'granite_black': (0.08, 0.08, 0.09), 'ceiling_red': (0.5, 0.16, 0.12),
    'wood': (0.35, 0.22, 0.12), 'dark': (0.02, 0.02, 0.02), 'fixture': (1, 0.95, 0.8),
})
IN = 0.0254
PX = 12.2                                      # passage axis east of the centre (Petrie: 490.3 in at the face)
A = math.radians(25 + 55 / 60); TA, CA = math.tan(A), math.cos(A)
HW, HV = 41.29 * IN / 2, 47.29 * IN / CA       # upper passage: half width, vertical height
face = lambda z: 107.625 * (1 - z / 143.5)
EZ = 11.54; EY = face(EZ)                      # upper entrance
CF = -206.4 * IN                               # chamber floor: its rock-cut walls end at the pavement level
YA = EY - (EZ - CF) / TA                       # foot of the slope
zu = lambda y: EZ - (EY - y) * TA
CNS, CEW = 195.8 * IN, 557.7 * IN
CN, CS = CNS / 2, -CNS / 2
CE = PX + (104.3 + 144.9) / 2 * IN; CW = CE - CEW
WALL, RIDGE = 206.4 * IN, 244.4 * IN
HH, HHW = 71.06 * IN, 41.59 * IN / 2           # horizontal passage
LOWY = YA - (11.7 + 40.92 + 15.5 + 42.0) * IN  # the granite, 47 in high part ends behind the portcullis
PC0 = YA - (11.7 + 40.92) * IN; PC1 = PC0 - 15.5 * IN
# lower system
LA = math.radians(21 + 40 / 60); TL, CL = math.tan(LA), math.cos(LA)
LV = 1.2 / CL
LF = CF - 7.5                                   # floor of its level part
LE = 118.5                                      # where it meets the pavement
LB = LE + LF / TL                               # foot of the descent (LF is negative)
LC = LB - 16.0                                  # end of the level part
LJ = LC - (CF - LF) / TL                        # where its floor reaches the horizontal passage's
zl = lambda y: -(LE - y) * TL
zr = lambda y: LF + (LC - y) * TL
RY = LB - 8.0                                   # axis of the recess and the way to the lower chamber
SCW, SCN = 411.9 * IN, 123.1 * IN
SCE = PX - HW - 6.0; SCF = LF - 1.05

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

sq = lambda hw, h: [(PX - hw, 0), (PX + hw, 0), (PX + hw, h), (PX - hw, h)]
void('mouth', lambda bm: G.box(bm, PX - 0.95, PX + 0.95, EY - 2.2, EY + 2.5, EZ - 2.4, EZ + 3.2))
void('upper', lambda bm: G.prism(bm, sq(HW, HV), EY + 1.0, YA - 0.02, zu(EY + 1.0), CF))
void('low', lambda bm: G.box(bm, PX - HW, PX + HW, LOWY, YA + 0.4, CF, CF + 47.29 * IN))
void('grooves', lambda bm: G.box(bm, PX - HW - 0.25, PX + HW + 0.25, PC1, PC0, CF, CF + 2.6))
void('horiz', lambda bm: G.box(bm, PX - HHW, PX + HHW, CN - 0.05, LOWY + 0.02, CF, CF + HH))
void('chamber', lambda bm: prism_x(bm, [(CN, CF), (CS, CF), (CS, CF + WALL), (0, CF + RIDGE), (CN, CF + WALL)], CW, CE))
KX0 = CW + 43.1 * IN; KY1 = CN - 42.5 * IN                          # coffer: outer NW corner
KL, KWD, KH, KT = 103.68 * IN, 41.97 * IN, 38.12 * IN, 7.645 * IN
void('coffer', lambda bm: G.box(bm, KX0 + KT, KX0 + KWD - KT, KY1 - KL + KT, KY1 - KT, CF - 29.59 * IN, CF + 0.02))
HX = CE - 198.3 * IN - 0.14                                         # the blind holes, just west of the red lines
void('hole_n', lambda bm: G.box(bm, HX - 0.14, HX + 0.14, CN - 0.02, CN + 0.22, CF + WALL - 53.6 * IN, CF + WALL - 53.6 * IN + 0.27))
void('hole_s', lambda bm: G.box(bm, HX - 0.14, HX + 0.14, CS - 0.22, CS + 0.02, CF + WALL - 55.2 * IN, CF + WALL - 55.2 * IN + 0.27))
# lower system
void('l_rise', lambda bm: G.prism(bm, sq(HW, LV), LC + 0.02, LJ, LF, CF))
void('l_level', lambda bm: G.box(bm, PX - HW, PX + HW, LC, LB, LF, LF + 1.25))
void('l_desc', lambda bm: G.prism(bm, sq(HW, LV), LE + 0.6, LB - 0.02, zl(LE + 0.6), LF))
void('l_recess', lambda bm: G.box(bm, PX + HW - 0.02, PX + HW + 68.0 * IN, RY - 123.8 * IN / 2, RY + 123.8 * IN / 2, LF, LF + 1.25))
void('l_slope', lambda bm: prism_x(bm, [(RY - 0.52, 0), (RY + 0.52, 0), (RY + 0.52, 1.25), (RY - 0.52, 1.25)], SCE - 0.02, PX - HW + 0.02, SCF, LF))
void('l_chamber', lambda bm: prism_x(bm, [(RY + SCN / 2, SCF), (RY - SCN / 2, SCF), (RY - SCN / 2, SCF + 1.9), (RY, SCF + 2.61), (RY + SCN / 2, SCF + 1.9)], SCE - SCW, SCE))

room = G.union(voids, 'khafre')
G.void_to_room(room, 0.4, drop=lambda c: (c.z > EZ - 3.0 and c.y > face(c.z) - 0.02) or (c.z > 0.02 and c.y > 108.5))

room.data.materials.clear()
NAMES = ['plaster', 'limestone', 'rock', 'granite', 'granite_black', 'dark']
for m in NAMES: room.data.materials.append(G.M[m])
for p in room.data.polygons:
    c = p.center; m = 'plaster'
    in_pass = abs(c.x - PX) < HW + 0.3
    if c.y > CN + 0.01:
        if c.z > CF - 0.05 and in_pass:
            m = 'granite' if c.y > LOWY - 0.05 else ('limestone' if c.y > LOWY - 9 else 'plaster')
        if c.z < CF - 0.06: m = 'rock'                                                    # the lower system: bare or plastered rock
        if c.z < CF - 0.06 and c.x < SCE + 0.05: m = 'plaster'
        if c.y > EY - 2.3 and c.z > EZ - 2.6: m = 'limestone'
    else:
        if c.z > CF + WALL - 0.02: m = 'limestone'                                        # gable beams
        if c.z < CF + 0.03: m = 'granite' if c.x < CW + 3.7 else 'limestone'              # paving: granite round the coffer
        if c.z < CF - 0.03: m = 'granite_black'
        if KX0 - 0.01 < c.x < KX0 + KWD + 0.01 and KY1 - KL - 0.01 < c.y < KY1 + 0.01 and c.z < CF + 0.03: m = 'granite_black'    # the coffer's rim
        if abs(c.x - HX) < 0.15 and (c.y > CN + 0.18 or c.y < CS - 0.18): m = 'dark'
    p.material_index = NAMES.index(m); p.use_smooth = False

solids, deco = [], []
# ---- mouth sill, the roll, the portcullis propped up in its grooves ---------------------------------
bm = bmesh.new(); prism_x(bm, [(face(EZ - 2.6), EZ - 2.6), (EY - 2.2, EZ - 2.6), (EY - 2.2, zu(EY - 2.2)), (EY, EZ)], PX - 0.95, PX + 0.95)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
solids.append(G.obj(bm, 'sill', 'limestone'))
bm = bmesh.new()
r = 11.65 * IN / 2
ring = [(YA - r + r * math.cos(t), CF + 47.29 * IN - r * math.sin(t) * 0.55) for t in [math.pi * k / 10 for k in range(11)]]
prism_x(bm, ring, PX - HW, PX + HW)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
deco.append(G.obj(bm, 'deco_roll', 'granite'))
solids.append(G.box_obj('portcullis', 'granite', PX - HW - 0.24, PX + HW + 0.24, PC1 + 0.012, PC0 - 0.012, CF + 1.12, CF + 2.55))
bm = bmesh.new()
for sx in (-1, 1):                                              # the rough limestone props in each groove
    x = PX + sx * (HW + 0.13)
    for k in range(3):
        G.box(bm, x - 0.1 + random.uniform(-0.02, 0.02), x + 0.1, PC1 + 0.04, PC0 - 0.04, CF + k * 0.37, CF + k * 0.37 + 0.36)
solids.append(G.obj(bm, 'props', 'limestone'))
# ---- the coffer's lid on the floor, and Perring's torn-up paving piled against the east wall ----------
bm = bmesh.new(); G.box(bm, -103.73 * IN / 2, 103.73 * IN / 2, -42.03 * IN / 2, 42.03 * IN / 2, 0, 8.2 * IN)
bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(1.2, 3, 'Z'))
bmesh.ops.translate(bm, verts=bm.verts, vec=(KX0 + KWD + 1.5, KY1 - KL / 2 - 0.2, CF))
solids.append(G.obj(bm, 'lid', 'granite_black'))
bm = bmesh.new()
for i in range(26):
    w, d, h = random.uniform(0.5, 1.1), random.uniform(0.4, 0.8), random.uniform(0.23, 0.36)
    x = CE - random.uniform(0.3, 1.5) ; y = random.uniform(CS + 0.4, CN - 2.6); z = CF + random.choice((0, 0, 0.3, 0.6)) * (1.0 if x > CE - 1.0 else 0.4)
    vs = G.box(bm, -w / 2, w / 2, -d / 2, d / 2, 0, h)
    bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(random.uniform(-0.5, 0.5), 3, 'Z') @ Matrix.Rotation(random.uniform(-0.12, 0.12), 3, 'X'))
    bmesh.ops.translate(bm, verts=vs, vec=(x, y, z))
solids.append(G.obj(bm, 'rubble', 'limestone'))
# ---- the red setting-out lines on the north and south walls ------------------------------------------
bm = bmesh.new()
XL = CE - 198.3 * IN
for y, top in ((CN - 0.004, CF + WALL - 53.6 * IN), (CS + 0.004, CF + WALL - 55.2 * IN)):
    vs = [bm.verts.new((XL - 0.006, y, CF + 0.3)), bm.verts.new((XL + 0.006, y, CF + 0.3)), bm.verts.new((XL + 0.006, y, top + 0.27)), bm.verts.new((XL - 0.006, y, top + 0.27))]
    bm.faces.new(vs)
    for dz in (0.0,):                                           # the square marked below the hole, where it was first meant to be
        z0 = top - 62.5 * IN
        for (xa, xb, za_, zb) in ((XL - 0.29, XL - 0.01, z0, z0 + 0.012), (XL - 0.29, XL - 0.01, z0 + 0.23, z0 + 0.242), (XL - 0.29, XL - 0.278, z0, z0 + 0.24)):
            bm.faces.new([bm.verts.new((xa, y, za_)), bm.verts.new((xb, y, za_)), bm.verts.new((xb, y, zb)), bm.verts.new((xa, y, zb))])
deco.append(G.obj(bm, 'deco_redlines', 'ceiling_red'))
# ---- modern fittings ------------------------------------------------------------------------------
def boards(name, y_hi, y_lo, zf, pitch=0.42):
    bm = bmesh.new(); y = y_hi
    while y > y_lo:
        G.box(bm, PX - 0.36, PX + 0.36, y - 0.025, y + 0.025, zf(y), zf(y) + 0.035); y -= pitch
    deco.append(G.obj(bm, 'deco_' + name, 'wood'))
def rails(name, y_hi, y_lo, zf, h=0.62):
    bm = bmesh.new()
    for sx in (-1, 1):
        x = PX + sx * (HW - 0.045)
        G.prism(bm, [(x - 0.02, h), (x + 0.02, h), (x + 0.02, h + 0.04), (x - 0.02, h + 0.04)], y_hi, y_lo, zf(y_hi), zf(y_lo))
    deco.append(G.obj(bm, 'deco_' + name, 'wood'))
boards('cleats_u', EY - 0.5, YA + 0.4, zu); rails('rails_u', EY - 0.5, YA + 0.6, zu)
boards('cleats_l', LE - 0.3, LB + 0.3, zl); rails('rails_l', LE - 4.2, LB + 0.4, zl)
boards('cleats_r', LC - 0.3, LJ + 0.3, zr); rails('rails_r', LC - 0.4, LJ + 1.6, zr)
bm = bmesh.new()
for k in range(4):                                              # iron gates, standing open
    G.box(bm, PX + HW - 0.05, PX + HW - 0.02, LE - 4.2 - k * 0.22 - 0.02, LE - 4.2 - k * 0.22, zl(LE - 4.4) + 0.05, zl(LE - 4.4) + LV - 0.1)
    G.box(bm, PX + HW - 0.05, PX + HW - 0.02, EY - 1.0 - k * 0.22 - 0.02, EY - 1.0 - k * 0.22, zu(EY - 1.0) + 0.05, zu(EY - 1.0) + HV - 0.1)
deco.append(G.obj(bm, 'deco_iron', 'granite_black'))

# ---- lighting -------------------------------------------------------------------------------------
y = EY - 3
while y > YA: G.light((PX + HW - 0.07, y, zu(y) + HV - 0.12), 5, size=0.035); y -= 6.5
y = LOWY - 3
while y > CN + 2: G.light((PX + HHW - 0.07, y, CF + HH - 0.1), 6, size=0.035); y -= 6.5
y = LE - 6
while y > LB: G.light((PX + HW - 0.07, y, zl(y) + LV - 0.12), 5, size=0.035); y -= 6.5
y = LB - 2
while y > LC: G.light((PX + HW - 0.07, y, LF + 1.15), 5, size=0.035); y -= 5.0
y = LC - 3
while y > LJ + 2: G.light((PX + HW - 0.07, y, zr(y) + LV - 0.12), 5, size=0.035); y -= 6.0
for loc, e in (((CE - 0.4, CN - 0.4, CF + 0.12), 160), ((CW + 0.4, CS + 0.4, CF + 0.12), 160), ((CW + 5.0, CN - 0.3, CF + 0.12), 120), ((CE - 5.0, CS + 0.3, CF + 0.12), 120),
               ((SCE - 0.5, RY + 1.0, SCF + 0.12), 35), ((SCE - SCW + 0.5, RY - 1.0, SCF + 0.12), 35), ((PX + HW + 1.2, RY, LF + 1.1), 8)):
    G.light(loc, e, size=0.06)

# ---- anchors --------------------------------------------------------------------------------------
G.empty('tp_burial_chamber', ((CW + CE) / 2 + 2.0, 0.3, CF + 0.3))
G.empty('tp_lower_chamber', (SCE - 2.5, RY, SCF + 0.3))
G.empty('tp_upper_entrance', (PX, EY - 2.0, zu(EY - 2.0) + 0.3))
G.empty('tp_lower_entrance', (PX, LE - 4.6, zl(LE - 4.6) + 0.3))
G.empty('poi_upper', (PX, (EY + YA) / 2, zu((EY + YA) / 2) + 0.7))
G.empty('poi_portcullis', (PX, PC0 + 0.5, CF + 0.8))
G.empty('poi_horizontal', (PX, (LOWY + LJ) / 2, CF + 0.9))
G.empty('poi_junction', (PX, LJ + 1.5, CF + 0.5))
G.empty('poi_chamber', ((CW + CE) / 2 + 1.5, 0, CF + 1.6))
G.empty('poi_coffer', (KX0 + KWD / 2, KY1 - KL / 2, CF + 0.6))
G.empty('poi_belzoni', ((CW + CE) / 2 + 0.5, CS + 1.0, CF + 1.8))
G.empty('poi_lower', (SCE - SCW / 2, RY, SCF + 1.3))
G.empty('poi_recess', (PX + 0.2, RY, LF + 0.8))
G.empty('poi_lowerpass', (PX, (LE + LB) / 2, zl((LE + LB) / 2) + 0.7))
# Belzoni's painted record of his entry, on the south wall
G.empty('tex_belzoni', ((CW + CE) / 2 + 0.5, CS + 0.012, CF + 2.75), (-1, 0, 0), (0, 0, 1), 5.4, 0.8)

final = [room, G.join(solids, 'solids')]
G.join(deco, 'deco')
print('KEY', dict(EY=round(EY, 3), EZ=EZ, CF=round(CF, 3), LE=LE, LJ=round(LJ, 3), LB=round(LB, 3), LC=round(LC, 3), LF=round(LF, 3), RY=round(RY, 3), SCE=round(SCE, 3), YA=round(YA, 3), CE=round(CE, 3), CW=round(CW, 3)))
G.bake_and_export(final, 'khafre.glb', samples=160)
