#!/usr/bin/env python3
"""Tomb of Queen Meresankh III (G 7530-sub) — the rock-cut chapel.

    python3 tools/blender/meresankh.py      ->  assets/models/meresankh.glb

Plan and heights scaled off Reisner's published plan and section (scale bar
on the drawing; see research/sites/meresankh.md): main room (a) 7.10 x 3.35 m,
2.6 m high; north room (c) 2.7 x 4.7 m, 2.1 m high, its north wall carved
with ten standing women under an inscribed architrave; west offering room
(b) 5.3 x 2.7 m with the burial shaft and statue niches, reached through a
pillared wall. Ceilings are painted red to imitate granite; the floor today
is modern planking, with tube lights and timber rails (photos).
Origin = SW corner of room (a) at floor level; X east, Y north.
"""
import math, random
import bpy, bmesh
from mathutils import Vector, Matrix
import gizalib as G

random.seed(7)
G.reset({'granite_black': (0.07, 0.07, 0.08), 'plaster': (0.66, 0.6, 0.5), 'ceiling_red': (0.5, 0.3, 0.27), 'statue': (0.7, 0.66, 0.58),
         'wood': (0.4, 0.27, 0.15), 'dark': (0.02, 0.02, 0.02), 'fixture': (1, 0.95, 0.8), 'rock': (0.6, 0.52, 0.4)})

voids = []
def void(name, *b):
    bm = bmesh.new(); G.box(bm, *b); voids.append(G.obj(bm, name))

# Measured values from Dunham & Simpson (Giza Mastabas 1, 1974):
#  main room 7.10 (N-S) x 3.35 x 2.60 m; entrance in the east wall, 1.60 m from the
#  SE corner, 1.26 m wide (east wall north of it is 4.24 m long);
#  west (offering) room 5.45 x 2.62 m, 2.35-2.22 m high;
#  burial pit ~2.08 m square, 5.13 m deep, burial chamber opening north from it:
#  5.70 m long, 2.97-3.30 m wide, 1.97 m high, floor 0.32 m below the pit floor;
#  canopic pit 0.70 m square, 0.48 m deep in the pit's SE corner;
#  south-wall niches A 0.50 x 0.77 (0.34 deep), B 0.40 x 0.635 (0.32), C 0.75 x 0.372 (0.32);
#  west room, west wall from the south: palace-facade panel 1.13 m, niche 1.13 m wide and
#  0.20 m deep with two statues, false door, niche with two statues, palace-facade panel.
AX, AY, AH = 3.35, 7.10, 2.6
BX0, BX1, BY0, BY1, BH = -0.35 - 2.62, -0.35, 2.2, 7.65, 2.3
PX0, PX1, PY0, PY1, PZ = -2.7, -0.62, 3.89, 5.97, -5.13           # burial pit
KY1, KZ = PY1 + 5.70, PZ - 0.32                                   # burial chamber
void('a', 0, AX, 0, AY + 0.02, 0, AH)
void('c', -0.4, 4.3, AY, AY + 2.7, 0, 2.1)
void('b', BX0, BX1, BY0, BY1, 0, BH)
void('ab1', -0.4, 0.05, 2.3, 3.5, 0, 2.15)                  # two doorways a -> b, the central pillar between
void('ab2', -0.4, 0.05, 4.23, 5.2, 0, 2.15)
void('door', AX - 0.05, 4.9, 1.60, 2.86, 0, 2.0)            # entrance passage (east)
void('stairwell', 4.85, 6.2, 1.60, 7.6, 0, 5.0)
void('niche_n', 0.2, 3.9, AY + 2.65, AY + 3.1, 0.22, 1.78)  # the ten statues
void('niche_w1', BX0 - 0.2, BX0 + 0.05, BY0 + 1.13, BY0 + 2.26, 0.25, 1.85)     # two statues each
void('niche_w2', BX0 - 0.2, BX0 + 0.05, BY1 - 2.26, BY1 - 1.13, 0.25, 1.85)
NICHES = ((0.35, 0.50, 0.77, 0.34), (1.30, 0.40, 0.635, 0.32), (2.15, 0.75, 0.372, 0.32))   # x0, width, height, depth: A (west), B, C
for nx0, nw, nh, nd in NICHES:
    void('niche_s', nx0, nx0 + nw, -nd, 0.05, 0.3, 0.3 + nh)
void('pit', PX0, PX1, PY0, PY1, PZ, 0.02)
void('canopic', PX1 - 0.7, PX1, PY0, PY0 + 0.7, PZ - 0.48, PZ + 0.05)
void('burial', -3.2, -0.1, PY1 - 0.05, KY1, KZ, KZ + 1.97)
room = G.union(voids, 'chapel')
G.void_to_room(room, 0.45)
room.data.materials.clear()
for m in ('plaster', 'ceiling_red', 'dark', 'wood', 'rock'): room.data.materials.append(G.M[m])
for p in room.data.polygons:
    c, n = p.center, p.normal
    if c.z < -0.05: p.material_index = 4                                   # pit and burial chamber: bare rock
    elif n.z < -0.7 and c.z > 1.9 and c.x < 4.8: p.material_index = 1      # painted ceilings
    elif n.z > 0.7 and c.z < 0.05 and c.x < 4.8: p.material_index = 3      # modern plank floor
    else: p.material_index = 0
    p.use_smooth = False

solids, deco = [], []
# pillars between (a) and (c), carrying an architrave
for x in (1.05, 2.4):                                      # 1.0 and 2.4 m from the west wall (plan)
    solids.append(G.box_obj('pillar', 'plaster', x - 0.34, x + 0.34, AY - 0.25, AY + 0.3, 0, 2.1))
solids.append(G.box_obj('architrave', 'plaster', 0, AX, AY - 0.25, AY + 0.25, 2.1, AH))

def loft(bm, secs, seg=10):
    """Skin a stack of ellipses: secs = [(z, rx, ry, cx, cy), ...]."""
    rings = []
    for z, rx, ry, cx, cy in secs:
        rings.append([bm.verts.new((cx + rx * math.cos(2 * math.pi * k / seg), cy + ry * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])

def figure(x, y, z, h, face=(0, -1), seated=False, wig=1.0):
    """A rock-cut statue of a woman in a sheath dress and tripartite wig,
    engaged in the wall behind her (local +Y is into the wall)."""
    bm = bmesh.new()
    s = h / 1.62
    S = lambda secs: [(zz * s, rx * s, ry * s, cx * s, cy * s) for zz, rx, ry, cx, cy in secs]
    loft(bm, S([(0.0, 0.11, 0.09, 0, 0), (0.1, 0.105, 0.08, 0, 0), (0.45, 0.12, 0.085, 0, 0), (0.8, 0.165, 0.105, 0, 0.005),
                (1.0, 0.125, 0.085, 0, 0), (1.17, 0.16, 0.11, 0, -0.01), (1.3, 0.205, 0.09, 0, 0.01), (1.36, 0.06, 0.055, 0, 0), (1.43, 0.05, 0.05, 0, 0)]))
    for sx in (-1, 1):                                    # arms hanging at the sides, open hands
        loft(bm, S([(0.66, 0.035, 0.045, sx * 0.2, 0), (0.75, 0.04, 0.045, sx * 0.205, 0), (1.0, 0.04, 0.045, sx * 0.215, 0), (1.27, 0.05, 0.05, sx * 0.21, 0.005)]), 6)
        G.box(bm, sx * 0.1 * s - 0.05 * s, sx * 0.1 * s + 0.05 * s, -0.17 * s, -0.02 * s, 0, 0.06 * s)      # feet
    # head; the wig frames it: a cap and two lappets falling to the collar-bones
    loft(bm, S([(1.42, 0.05, 0.06, 0, -0.03), (1.47, 0.08, 0.095, 0, -0.035), (1.54, 0.088, 0.1, 0, -0.035), (1.6, 0.075, 0.09, 0, -0.03), (1.64, 0.03, 0.04, 0, -0.03)]), 10)
    w = wig
    loft(bm, S([(1.28, 0.15 * w, 0.075, 0, 0.05), (1.4, 0.155 * w, 0.085, 0, 0.045), (1.56, 0.14 * w, 0.1, 0, 0.03), (1.65, 0.11 * w, 0.095, 0, 0.01), (1.69, 0.05, 0.05, 0, 0.0)]), 10)
    for sx in (-1, 1):
        loft(bm, S([(1.24, 0.045, 0.05, sx * 0.105 * w, -0.035), (1.4, 0.05, 0.06, sx * 0.11 * w, -0.03), (1.58, 0.045, 0.07, sx * 0.1 * w, -0.02)]), 6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    ang = math.atan2(face[0], -face[1])
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-ang, 3, 'Z'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, z))
    return G.obj(bm, 'figure', 'statue')

# ten women along the north wall, graded in height (smaller, more worn at the west end)
heights = [1.05, 1.15, 1.3, 1.5, 1.5, 1.5, 1.5, 1.45, 1.4, 1.35]
for i, h in enumerate(heights):
    solids.append(figure(0.42 + i * 0.362, AY + 2.9, 0.22, h, wig=0.85 if i in (2, 8, 9) else 1.0))
# west room: two pairs of standing women (Hetepheres II and Mersyankh), short flaring wigs
for y0 in (BY0 + 1.13 + 0.33, BY0 + 1.13 + 0.8, BY1 - 2.26 + 0.33, BY1 - 2.26 + 0.8):
    solids.append(figure(BX0 - 0.03, y0, 0.25, 1.5, face=(1, 0), wig=0.9))

def scribe(x, y, z, h):
    """A rock-cut figure 'in scribal position': cross-legged, papyrus on the lap."""
    bm = bmesh.new(); s_ = h / 0.62
    S = lambda secs: [(zz * s_, rx * s_, ry * s_, cx * s_, cy * s_) for zz, rx, ry, cx, cy in secs]
    loft(bm, S([(0.0, 0.26, 0.17, 0, 0), (0.1, 0.27, 0.18, 0, 0), (0.17, 0.2, 0.15, 0, 0.02)]), 10)         # crossed legs
    loft(bm, S([(0.12, 0.14, 0.1, 0, 0.05), (0.3, 0.15, 0.1, 0, 0.05), (0.42, 0.17, 0.09, 0, 0.05), (0.47, 0.05, 0.05, 0, 0.04)]), 10)
    loft(bm, S([(0.46, 0.05, 0.055, 0, 0.03), (0.5, 0.07, 0.08, 0, 0.03), (0.56, 0.075, 0.085, 0, 0.03), (0.61, 0.04, 0.05, 0, 0.03)]), 8)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi, 3, 'Z'))        # facing +Y (north)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, z))
    return G.obj(bm, 'scribe', 'statue')
(ax, aw, ah, ad), (bx, bw, bh, bd), (cx, cw, ch, cd) = NICHES
solids.append(scribe(ax + aw / 2, -ad / 2, 0.3, ah * 0.9))               # A: Khemetnu the Elder (Reisner)
solids.append(scribe(bx + bw / 2, -bd / 2, 0.3, bh * 0.9))               # B: Khemetnu the Younger
for k in range(4):                                                        # C: four figures
    solids.append(scribe(cx + cw * (k + 0.5) / 4, -cd / 2, 0.3, ch * 0.92))
# false door at the centre of the west room's west wall
deco.append(G.box_obj('deco_falsedoor', 'dark', BX0 + 0.012, BX0 + 0.03, BY0 + 2.36, BY1 - 2.36, 0.1, 1.9))

# burial chamber: the black granite sarcophagus (2.16 x 0.87 x 0.795 m) near the west
# wall, its lid (0.175 m thick, 2.35 m with its lugs) propped up as it was found
SX, SY = -3.2 + 0.25 + 0.435, PY1 + 2.9
bm = bmesh.new(); G.box(bm, SX - 0.435, SX + 0.435, SY - 1.08, SY + 1.08, KZ, KZ + 0.795)
sarc = G.obj(bm, 'sarc', 'granite_black')
cav = G.box_obj('cav', None, SX - 0.3, SX + 0.3, SY - 0.93, SY + 0.93, KZ + 0.16, KZ + 1.0)
mod = sarc.modifiers.new('c', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cav; mod.solver = 'EXACT'
bpy.context.view_layer.objects.active = sarc; bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cav, do_unlink=True)
solids.append(sarc)
bm = bmesh.new(); G.box(bm, -0.435, 0.435, -1.175, 1.175, 0, 0.175)
bmesh.ops.rotate(bm, verts=bm.verts, cent=(0.435, 0, 0), matrix=Matrix.Rotation(math.radians(-24), 3, 'Y'))
bmesh.ops.translate(bm, verts=bm.verts, vec=(SX, SY, KZ + 0.8))
solids.append(G.obj(bm, 'lid', 'granite_black'))
G.empty('insc_meresankh_sarc', (SX + 0.447, SY, KZ + 0.4), (0, 1, 0), (0, 0, 1), 2.16, 0.78)

# modern fittings: rails round the pit, the timber stair that winds down it (visual
# only — use fast travel for the burial chamber), tube lights
bm = bmesh.new()
turns, n = 4, 40
for k in range(n):
    t = k / n * turns; side = int(t) % 4; u = t - int(t)
    z = PZ * (k + 1) / n
    w = 0.62
    if side == 0: G.box(bm, PX0, PX0 + w, PY1 - (u + 0.1) * 2.08, PY1 - u * 2.08, z, z + 0.04)
    elif side == 1: G.box(bm, PX0 + u * 2.08, PX0 + (u + 0.1) * 2.08, PY0, PY0 + w, z, z + 0.04)
    elif side == 2: G.box(bm, PX1 - w, PX1, PY0 + u * 2.08, PY0 + (u + 0.1) * 2.08, z, z + 0.04)
    else: G.box(bm, PX1 - (u + 0.1) * 2.08, PX1 - u * 2.08, PY1 - w, PY1, z, z + 0.04)
deco.append(G.obj(bm, 'deco_pitstair', 'wood'))
def rail(a, b):
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
rail((0.1, AY + 2.15, 0), (4.0, AY + 2.15, 0))
for a_, b_ in (((PX0 - 0.1, PY0 - 0.1), (PX1 + 0.1, PY0 - 0.1)), ((PX1 + 0.1, PY0 - 0.1), (PX1 + 0.1, PY1 + 0.1)),
               ((PX1 + 0.1, PY1 + 0.1), (PX0 - 0.1, PY1 + 0.1)), ((PX0 - 0.1, PY1 + 0.1), (PX0 - 0.1, PY0 - 0.1))):
    rail((*a_, 0), (*b_, 0))

# entrance stair up to the street (north along the stairwell), daylight at the top
bm = bmesh.new()
N, RISE, RUN = 12, 0.21, 0.36
for i in range(N):
    y0 = 3.0 + i * RUN
    G.box(bm, 4.85, 6.2, y0, y0 + RUN + 0.02, -0.2, (i + 1) * RISE)
G.box(bm, 4.85, 6.2, 3.0 + N * RUN, 7.6, -0.2, N * RISE)
solids.append(G.obj(bm, 'steps_entrance', 'rock'))
G.lights.append(G.box_obj('daylight', 'fixture', 5.0, 6.05, 7.52, 7.58, N * RISE, N * RISE + 2.1))
ld = bpy.data.lights.new('door', 'AREA'); ld.energy = 260; ld.size = 1.2; ld.color = (0.9, 0.95, 1.0)
lo = bpy.data.objects.new('bake_light', ld); lo.location = (5.5, 7.3, N * RISE + 1.2); lo.rotation_euler = (math.radians(90), 0, 0); G.col.objects.link(lo)

for loc in ((1.7, 1.2, 0.12), (2.9, 5.2, 0.12), (-0.7, 2.6, 0.12), (2.0, AY + 1.5, 0.12), (-1.7, 7.3, 0.12)):
    G.light(loc, 30, size=0.07)
G.light((-0.5, PY1 + 1.0, KZ + 0.12), 40, size=0.07); G.light((-0.5, KY1 - 0.6, KZ + 0.12), 40, size=0.07)
G.light((PX0 + 1.0, PY0 + 1.0, PZ + 0.12), 25, size=0.06)

# anchors and panels
G.empty('tp_meresankh', (2.4, 2.2, 0.25))
G.empty('tp_burial', (-1.2, PY1 + 1.2, KZ + 0.3))
G.empty('poi_chapel', (1.7, 3.6, 1.4))
G.empty('poi_statues', (2.0, AY + 1.6, 1.4))
G.empty('poi_offering', (-1.0, 3.0, 1.4))
G.empty('poi_scribes', (1.6, 0.9, 1.0))
G.empty('poi_burial', (-1.4, PY1 + 2.6, KZ + 1.2))
G.empty('insc_meresankh_architrave', (2.05, AY + 2.645, 1.9), (1, 0, 0), (0, 0, 1), 3.7, 0.2)
# palace-facade panels at either end of the west room's west wall (1.13 m each)
G.empty('insc_meresankh_palace', (BX0 + 0.012, BY0 + 0.565, 1.05), (0, 1, 0), (0, 0, 1), 1.05, 1.9)
G.empty('insc_meresankh_palace', (BX0 + 0.012, BY1 - 0.565, 1.05), (0, 1, 0), (0, 0, 1), 1.05, 1.9)
# Photographs (Richard Mortel, CC BY 2.0) as wall textures, placed after the report:
#  north wall: EAST pillar = the queen facing left, short wig, hand on breast, four columns
#  of text above (photo 55); WEST pillar = the queen facing right, four columns (photo 72,
#  head and text only); painted lintel above (57). West wall, north end: Hetepheres II,
#  Mersyankh and Nebemakhet (54). East wall north of the entrance (4.24 m): Kawab at full
#  height at the north end (56), registers with craftsmen (62). South door jamb: the queen
#  with Khemetnu presenting the document (47). West room south wall (2.62 m): offering
#  list (71).
G.empty('tex_mer_pillar', (2.4, AY - 0.262, 1.06), (1, 0, 0), (0, 0, 1), 0.66, 1.9)
G.empty('tex_mer_wpillar', (1.05, AY - 0.262, 1.62), (1, 0, 0), (0, 0, 1), 0.66, 0.84)
G.empty('tex_mer_west', (AX / 2, AY - 0.262, 2.35), (1, 0, 0), (0, 0, 1), 3.3, 0.4)
G.empty('tex_mer_north', (0.012, 6.15, 1.18), (0, 1, 0), (0, 0, 1), 1.3, 1.58)
G.empty('tex_mer_east', (AX - 0.012, 4.45, 1.0), (0, -1, 0), (0, 0, 1), 2.6, 1.7)
G.empty('tex_mer_kawab', (AX - 0.012, 6.5, 1.12), (0, -1, 0), (0, 0, 1), 0.95, 1.95)
G.empty('tex_mer_jamb', (4.1, 1.612, 1.0), (-1, 0, 0), (0, 0, 1), 1.2, 1.9)
G.empty('tex_mer_list', (BX0 + 1.31, BY0 + 0.012, 1.2), (-1, 0, 0), (0, 0, 1), 2.4, 1.8)

final = [room, G.join(solids, 'solids')]
G.join(deco, 'deco')
G.bake_and_export(final, 'meresankh.glb')
