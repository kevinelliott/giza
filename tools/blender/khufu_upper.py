#!/usr/bin/env python3
"""Great Pyramid — Grand Gallery, antechamber, King's Chamber, Campbell's Chamber.

    python3 tools/blender/khufu_upper.py      ->  assets/models/khufu_upper.glb

Sizes follow research/sites/khufu.md (Petrie 1883 and standard references):
  Grand Gallery   46.7 m on the slope (26.5 deg here), 8.6 m high, 2.06 m wide
                  above the ramps, 1.04 m channel between two 0.52 x 0.6 m
                  ramps; seven corbels of ~7.5 cm from 2.29 m up, narrowing to
                  ~1.04 m at the roof; 27 slots in each ramp; the Great Step.
  Antechamber     2.97 x 1.65 x 3.8 m, granite, with the hanging granite leaf
                  and three portcullis slots in each side wall.
  King's Chamber  10.47 (E-W) x 5.23 (N-S) x 5.85 m, red granite, entered at
                  the east end of the north wall; sarcophagus 2.28 x 0.98 x
                  1.05 m near the west wall with its broken corner; the two
                  shaft mouths in the north and south walls.
  Campbell's      the topmost of five relieving chambers, gabled, with the
                  builders' red-ochre graffiti (Khufu's cartouche).
The two low passages either side of the antechamber are true size
(1.05 x 1.11 m): the player has to crouch, as every visitor does.

Origin = the foot of the gallery (game point J2). Y is north, so the gallery
climbs toward -Y.
"""
import math, random
import bpy, bmesh
from mathutils import Vector
import gizalib as G

random.seed(4)
G.reset({
    'limestone': (0.66, 0.60, 0.50), 'granite': (0.42, 0.30, 0.26), 'granite_dark': (0.20, 0.15, 0.13),
    'wood': (0.35, 0.22, 0.12), 'dark': (0.02, 0.02, 0.02), 'fixture': (1, 0.95, 0.8),
})

TAN = math.tan(math.radians(26.5))
R = 41.79                 # horizontal run of the gallery (46.7 m on the slope)
STEP = 1.55               # depth of the Great Step
TOP = R * TAN             # level of the Great Step / chamber floors (20.84)
PW, PH = 0.525, 1.11      # half-width / height of the low passages (true size: crouch!)
Y = lambda s: -s          # s = horizontal distance south of the origin

# ---- voids -------------------------------------------------------------
def gallery_profile(ramps):
    hw = 1.03
    pts = [(0.52 if ramps else hw, 0.0)]
    if ramps: pts += [(0.52, 0.6), (hw, 0.6)]
    h = 2.29
    for i in range(7):
        pts += [(hw, h), (hw - 0.075, h)]
        hw -= 0.075; h += 0.86
    pts += [(hw, 8.6)]
    return pts + [(-x, z) for x, z in reversed(pts)]

voids = []
def void(name, build):
    bm = bmesh.new(); build(bm); bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    voids.append(G.obj(bm, name))

# stub that meets the ascending passage of khufu_lower.glb (true size; deleted north face = opening)
T2 = math.tan(math.radians(26 + 2 / 60 + 30 / 3600)); V2 = 1.20 / math.cos(math.radians(26.0417))
void('stub', lambda bm: G.prism(bm, [(-PW, 0), (PW, 0), (PW, V2), (-PW, V2)], Y(-0.3), Y(0.05), -0.3 * T2, 0.05 * T2))
# the head of the Queen's passage: level, under the gallery floor (the rest is in khufu_lower.glb)
void('qhead', lambda bm: G.box(bm, -PW, PW, Y(4.6), Y(-0.02), 0.0, 1.17))
void('gal_a', lambda bm: G.prism(bm, gallery_profile(False), Y(0), Y(2.7), 0, 2.7 * TAN))      # the ramps are broken away at the foot
void('gal_b', lambda bm: G.prism(bm, gallery_profile(True), Y(2.65), Y(R), 2.65 * TAN, R * TAN))
A0, A1 = R + 1.3, R + 4.27                      # antechamber
K0 = R + 6.83; K1 = K0 + 5.23                    # King's Chamber (north / south walls)
KE = PW + 0.02; KW = KE - 10.47                  # its east / west walls
void('pass1', lambda bm: G.box(bm, -PW, PW, Y(A0 + 0.05), Y(R - 0.05), TOP, TOP + PH))
void('ante', lambda bm: G.box(bm, -0.825, 0.825, Y(A1), Y(A0), TOP, TOP + 3.8))
void('pass2', lambda bm: G.box(bm, -PW, PW, Y(K0 + 0.05), Y(A1 - 0.05), TOP, TOP + PH))
void('king', lambda bm: G.box(bm, KW, KE, Y(K1), Y(K0), TOP, TOP + 5.85))
# shaft mouths (0.2 x 0.14 m), ~0.9 m above the floor, in the north and south walls
SHX = KE - 2.6
void('shaft_n', lambda bm: G.box(bm, SHX - 0.1, SHX + 0.1, Y(K0 + 0.05), Y(K0 - 0.7), TOP + 0.9, TOP + 1.04))
void('shaft_s', lambda bm: G.box(bm, SHX - 0.1, SHX + 0.1, Y(K1 + 0.7), Y(K1 - 0.05), TOP + 0.9, TOP + 1.04))
room = G.union(voids, 'limestone')
G.void_to_room(room, 0.7, drop=lambda c: c.y > 0.29 or (c.y < -4.59 and c.z < 1.2 and abs(c.x) < PW + 0.01 and c.y > -4.7))       # open toward the passages

# granite where it really is: antechamber (south part), second passage, King's Chamber
room.data.materials.clear()
room.data.materials.append(G.M['limestone']); room.data.materials.append(G.M['granite']); room.data.materials.append(G.M['dark'])
for p in room.data.polygons:
    c = p.center; s = -c.y
    in_shaft = (abs(c.x - SHX) < 0.12 and (s < K0 - 0.06 or s > K1 + 0.06) and s > A1 + 1)
    p.material_index = 2 if in_shaft else (1 if s > A0 + 0.9 else 0)
    p.use_smooth = False

# Campbell's Chamber: the top relieving chamber, 17.2 m above the King's Chamber floor
CZ = TOP + 17.2
def gable(bm):
    y0, y1 = Y(K1 + 0.3), Y(K0 - 0.3); ym = (y0 + y1) / 2
    prof = [(y0, 0.0), (y1, 0.0), (y1, 0.55), (ym, 2.3), (y0, 0.55)]          # (y, z): ridge runs east-west
    a = [bm.verts.new((KW - 0.5, y, CZ + z)) for y, z in prof]
    b = [bm.verts.new((KE + 0.5, y, CZ + z)) for y, z in prof]
    for i in range(5):
        j = (i + 1) % 5; bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(a[::-1]); bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm = bmesh.new(); gable(bm)
camp = G.void_to_room(G.obj(bm, 'campbell', 'limestone'), 0.7)
camp.data.materials.clear(); camp.data.materials.append(G.M['limestone']); camp.data.materials.append(G.M['granite'])
for p in camp.data.polygons:
    p.material_index = 1 if p.center.z < CZ + 0.05 else 0      # floor = tops of the granite beams
    p.use_smooth = False

solids, deco = [], []
# ---- the gallery foot today: the floor is cut away over the head of the Queen's passage,
# leaving a ledge either side; boards widen the west ledge into the way up the gallery
bm = bmesh.new()
G.prism(bm, [(-0.53, -0.05), (-0.27, -0.05), (-0.27, 0.0), (-0.53, 0.0)], Y(0.25), Y(2.45), 0.25 * TAN, 2.45 * TAN)
solids.append(G.obj(bm, 'footboards', 'wood'))
# ---- Great Step + modern wooden steps up it --------------------------------
solids.append(G.box_obj('step', 'limestone', -1.03, 1.03, Y(R + 0.02), Y(R - STEP), (R - STEP) * TAN - 0.6, TOP))
# a wooden ramp with cleats up the Great Step (the gallery floor is already
# at 26.5 deg, so steps short enough to climb would never reach the top)
RAMP = 2.4
bm = bmesh.new()
G.prism(bm, [(-0.5, -0.4), (0.5, -0.4), (0.5, 0.0), (-0.5, 0.0)], Y(R - STEP + 0.02), Y(R - STEP - RAMP), TOP, (R - STEP - RAMP) * TAN + 0.02)
solids.append(G.obj(bm, 'wramp', 'wood'))
bm = bmesh.new()
for k in range(1, 8):
    s_ = R - STEP - RAMP + k * RAMP / 8; z_ = (R - STEP - RAMP) * TAN + 0.02 + (TOP - (R - STEP - RAMP) * TAN) * k / 8
    G.box(bm, -0.5, 0.5, Y(s_ + 0.03), Y(s_ - 0.03), z_ - 0.02, z_ + 0.035)
deco.append(G.obj(bm, 'deco_rampcleats', 'wood'))

# ---- ramp slots (27 each side) and the modern handrails -------------------
bm = bmesh.new()
for i in range(27):
    s = 2.6 + i * 1.44
    for sx in (-1, 1):
        x0 = sx * 0.56; x1 = sx * 1.02
        z = s * TAN + 0.6 + 0.012
        vs = [bm.verts.new((min(x0, x1), Y(s - 0.26), z - 0.26 * TAN)), bm.verts.new((max(x0, x1), Y(s - 0.26), z - 0.26 * TAN)),
              bm.verts.new((max(x0, x1), Y(s + 0.26), z + 0.26 * TAN)), bm.verts.new((min(x0, x1), Y(s + 0.26), z + 0.26 * TAN))]
        bm.faces.new(vs[::-1])
deco.append(G.obj(bm, 'deco_slots', 'dark'))
bm = bmesh.new()
for sx in (-1, 1):
    x = sx * 0.6
    G.prism(bm, [(x - 0.03, 1.5), (x + 0.03, 1.5), (x + 0.03, 1.56), (x - 0.03, 1.56)], Y(2.0), Y(R - STEP - 0.3), 2.0 * TAN, (R - STEP - 0.3) * TAN)
    s = 2.0
    while s < R - STEP:
        G.box(bm, x - 0.025, x + 0.025, Y(s + 0.025), Y(s - 0.025), s * TAN + 0.6, s * TAN + 1.52); s += 2.4
deco.append(G.obj(bm, 'deco_rails', 'wood'))
# wooden walkway with cleats in the channel (visual only; the stone floor carries you)
bm = bmesh.new()
s = 1.8
while s < R - STEP - 0.4:
    G.prism(bm, [(-0.5, 0.012), (0.5, 0.012), (0.5, 0.05), (-0.5, 0.05)], Y(s), Y(s + 0.07), s * TAN, (s + 0.07) * TAN); s += 0.45
deco.append(G.obj(bm, 'deco_cleats', 'wood'))

# ---- antechamber: granite leaf and portcullis slots ----------------------
solids.append(G.box_obj('leaf', 'granite', -0.825, 0.825, Y(A0 + 1.1 + 0.4), Y(A0 + 1.1), TOP + PH + 0.05, TOP + 3.3))
bm = bmesh.new()
for k in range(3):
    s = A0 + 1.75 + k * 0.42
    for sx in (-1, 1):
        x = sx * 0.823
        vs = [bm.verts.new((x, Y(s), TOP + 0.9)), bm.verts.new((x, Y(s + 0.3), TOP + 0.9)), bm.verts.new((x, Y(s + 0.3), TOP + 3.7)), bm.verts.new((x, Y(s), TOP + 3.7))]
        bm.faces.new(vs if sx < 0 else vs[::-1])
deco.append(G.obj(bm, 'deco_portcullis', 'dark'))

# ---- sarcophagus: granite, lidless, one corner broken away -----------------
SX = KW + 1.55; SS = (K0 + K1) / 2 + 0.35
bm = bmesh.new(); G.box(bm, SX - 0.49, SX + 0.49, Y(SS + 1.14), Y(SS - 1.14), TOP, TOP + 1.05)
sarc = G.obj(bm, 'sarc', 'granite_dark')
cav = G.box_obj('cav', None, SX - 0.34, SX + 0.34, Y(SS + 0.99), Y(SS - 0.99), TOP + 0.18, TOP + 1.3)
chip = bmesh.new(); G.box(chip, -0.3, 0.3, -0.3, 0.3, -0.25, 0.25)
bmesh.ops.rotate(chip, verts=chip.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(0.6, 3, 'X') @ __import__('mathutils').Matrix.Rotation(0.5, 3, 'Z'))
bmesh.ops.translate(chip, verts=chip.verts, vec=(SX + 0.49, Y(SS + 1.14), TOP + 1.05))
chipo = G.obj(chip, 'chip')
for cut in (cav, chipo):
    mod = sarc.modifiers.new('c', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cut; mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = sarc; bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cut, do_unlink=True)
solids.append(sarc)

# ---- Campbell's Chamber floor: uneven tops of the nine granite beams ---------
bm = bmesh.new()
for i in range(9):
    x0 = KW - 0.5 + i * (11.47 / 9)
    G.box(bm, x0 + 0.03, x0 + 11.47 / 9 - 0.03, Y(K1 + 0.28), Y(K0 - 0.28), CZ - 0.2, CZ + random.uniform(0.04, 0.3))
solids.append(G.obj(bm, 'beams', 'granite'))

# ---- lamps (as lit today) -------------------------------------------------
s = 3.0; side = 1
while s < R - 2:
    G.light((side * 0.8, Y(s), s * TAN + 0.6 + 0.15), 55, size=0.07); s += 4.4; side = -side
G.light((0.0, Y(R - 0.6), TOP + 2.6), 140, fixture=False)
G.light((0.55, Y(A0 + 2.4), TOP + 0.15), 60, size=0.06)
for x, s_ in ((KE - 0.5, K1 - 0.5), (KW + 0.5, K0 + 0.5), (KW + 4.5, K1 - 0.4)):
    G.light((x, Y(s_), TOP + 0.18), 110, size=0.09)
G.light(((KW + KE) / 2 + 2, Y((K0 + K1) / 2), CZ + 0.4), 70, size=0.07)

# ---- anchors -----------------------------------------------------------
G.empty('poi_gallery', (0, Y(R * 0.45), R * 0.45 * TAN + 1.5))
G.empty('poi_antechamber', (0, Y((A0 + A1) / 2), TOP + 1.5))
G.empty('poi_king', ((KW + KE) / 2, Y((K0 + K1) / 2), TOP + 1.5))
G.empty('poi_sarcophagus', (SX + 1.2, Y(SS), TOP + 1.2))
G.empty('poi_campbell', ((KW + KE) / 2, Y((K0 + K1) / 2), CZ + 1.0))
G.empty('tp_king', (KE - 1.6, Y(K0 + 1.6), TOP + 0.3))
G.empty('tp_campbell', (KE - 2.0, Y((K0 + K1) / 2), CZ + 0.45))
# graffiti on the gable blocks (sloping walls) and the end walls of Campbell's Chamber
ym = Y((K0 + K1) / 2)
G.empty('insc_campbell_khufu', (KW - 0.49, ym + 0.5, CZ + 0.95), (0, 1, 0), (0, 0, 1), 1.5, 0.75)        # west end wall
G.empty('insc_campbell_khnumkhuf', (KE + 0.49, ym - 0.3, CZ + 0.9), (0, -1, 0), (0, 0, 1), 1.7, 0.7)       # east end wall
sl = Vector((0, -(ym - Y(K1 + 0.3)), 2.3 - 0.55)).normalized()                                             # up the south gable slope
G.empty('insc_campbell_gang', ((KW + KE) / 2 - 1.5, Y(K1 + 0.3) + (ym - Y(K1 + 0.3)) * 0.5 + 0.01, CZ + 0.55 + 1.75 * 0.5 - 0.02), (-1, 0, 0), (0, -sl.y, sl.z) if False else (0, sl.y * -1, sl.z), 2.6, 0.9)

final = [room, camp, G.join(solids, 'solids')]
G.join(deco, 'deco')
G.bake_and_export(final, 'khufu_upper.glb')
