#!/usr/bin/env python3
"""Tomb of Queen Meresankh III (G 7530-sub) — the rock-cut chapel.

    python3 tools/blender/meresankh.py      ->  assets/models/meresankh.glb

Plan and heights scaled off Reisner's published plan and section (scale bar
on the drawing; see research/sites/meresankh.md): main room (a) 7.1 x 3.4 m,
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
G.reset({'plaster': (0.66, 0.6, 0.5), 'ceiling_red': (0.5, 0.3, 0.27), 'statue': (0.7, 0.66, 0.58),
         'wood': (0.4, 0.27, 0.15), 'dark': (0.02, 0.02, 0.02), 'fixture': (1, 0.95, 0.8), 'rock': (0.6, 0.52, 0.4)})

voids = []
def void(name, *b):
    bm = bmesh.new(); G.box(bm, *b); voids.append(G.obj(bm, name))

void('a', 0, 3.4, 0, 7.12, 0, 2.6)
void('c', -0.4, 4.3, 7.1, 9.8, 0, 2.1)
void('b', -3.0, -0.3, 2.4, 7.7, 0, 2.6)
void('ab1', -0.35, 0.05, 2.4, 3.65, 0, 2.2)                 # two openings a -> b, a painted pillar between
void('ab2', -0.35, 0.05, 4.4, 5.4, 0, 2.2)
void('door', 3.35, 4.9, 1.1, 2.1, 0, 2.0)                   # entrance passage (east)
void('stairwell', 4.85, 6.2, 1.1, 7.6, 0, 5.0)
void('niche_n', 0.2, 3.9, 9.75, 10.2, 0.22, 1.78)           # the ten statues
void('niche_w1', -3.38, -2.95, 2.85, 3.85, 0.3, 2.0)        # statue pairs, west wall of (b)
void('niche_w2', -3.38, -2.95, 6.3, 7.3, 0.3, 2.0)
void('niche_s', 1.0, 2.5, -0.4, 0.05, 0.5, 1.35)            # small figures, south wall of (a)
void('shaft', -2.7, -0.7, 4.4, 6.2, -4.5, 0.02)             # burial shaft (covered by a grating today)
room = G.union(voids, 'chapel')
G.void_to_room(room, 0.45)
room.data.materials.clear()
for m in ('plaster', 'ceiling_red', 'dark', 'wood'): room.data.materials.append(G.M[m])
for p in room.data.polygons:
    c, n = p.center, p.normal
    if c.z < -0.05: p.material_index = 2                                   # down the shaft
    elif n.z < -0.7 and c.z > 1.9 and c.x < 4.8: p.material_index = 1      # painted ceilings
    elif n.z > 0.7 and c.z < 0.05 and c.x < 4.8: p.material_index = 3      # modern plank floor
    else: p.material_index = 0
    p.use_smooth = False

solids, deco = [], []
# pillars between (a) and (c), carrying an architrave
for x in (1.15, 2.55):
    solids.append(G.box_obj('pillar', 'plaster', x - 0.27, x + 0.27, 6.85, 7.35, 0, 2.1))
solids.append(G.box_obj('architrave', 'plaster', 0, 3.4, 6.85, 7.35, 2.1, 2.6))

def figure(x, y, z, h, face=(0, -1), seated=False):
    """A rock-cut statue, engaged in the wall behind it; `face` = direction it looks."""
    bm = bmesh.new()
    s = h / 1.5
    if seated:
        G.box(bm, -0.16 * s, 0.16 * s, -0.12 * s, 0.14 * s, 0, 0.42 * s)
        G.box(bm, -0.14 * s, 0.14 * s, 0.0, 0.14 * s, 0.42 * s, 0.8 * s)
    else:
        v = G.box(bm, -0.17 * s, 0.17 * s, -0.09 * s, 0.14 * s, 0, 1.18 * s)       # long sheath dress
        for vt in v:
            if vt.co.z > 0.5 * s: vt.co.x *= 1.22                                    # shoulders
            else: vt.co.x *= 0.8                                                    # narrow at the ankles
        for sx in (-1, 1):                                                           # arms at the sides
            G.box(bm, sx * 0.21 * s, sx * 0.27 * s, -0.05 * s, 0.08 * s, 0.5 * s, 1.14 * s)
    hz = (0.8 if seated else 1.18) * s
    bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=7, radius=0.095 * s, matrix=Matrix.Translation((0, -0.03 * s, hz + 0.13 * s)))
    # tripartite wig: a cap over the crown and a lappet falling either side of the face
    G.box(bm, -0.15 * s, 0.15 * s, -0.09 * s, 0.13 * s, hz + 0.2 * s, hz + 0.27 * s)
    for sx in (-1, 1):
        G.box(bm, sx * 0.095 * s, sx * 0.16 * s, -0.07 * s, 0.13 * s, hz - 0.06 * s, hz + 0.22 * s)
    G.box(bm, -0.1 * s, 0.1 * s, 0.04 * s, 0.13 * s, hz - 0.02 * s, hz + 0.22 * s)       # back of the wig, in the wall
    ang = math.atan2(face[0], -face[1]) if True else 0
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-ang, 3, 'Z'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, z))
    return G.obj(bm, 'figure', 'statue')

# ten women along the north wall, graded in height (smaller, more worn at the west end)
heights = [1.05, 1.15, 1.3, 1.5, 1.5, 1.5, 1.5, 1.45, 1.4, 1.35]
for i, h in enumerate(heights):
    solids.append(figure(0.42 + i * 0.362, 10.02, 0.22, h))
for y0 in (3.1, 3.6):  solids.append(figure(-3.2, y0, 0.3, 1.5, face=(1, 0)))
for y0 in (6.55, 7.05): solids.append(figure(-3.2, y0, 0.3, 1.5, face=(1, 0)))
for x0 in (1.3, 1.75, 2.2): solids.append(figure(x0, -0.22, 0.5, 1.1, face=(0, 1), seated=True))
# false door between the two west niches
deco.append(G.box_obj('deco_falsedoor', 'dark', -3.02, -2.985, 4.5, 5.5, 0.1, 1.9))

# modern fittings: grating over the shaft, rails, tube lights
bm = bmesh.new()
for k in range(9):
    y = 4.4 + k * 0.22
    G.box(bm, -2.72, -0.68, y, y + 0.12, 0.0, 0.05)
solids.append(G.obj(bm, 'grate', 'wood'))
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
rail((0.1, 9.25, 0), (4.0, 9.25, 0))
rail((-2.8, 4.25, 0), (-0.6, 4.25, 0)); rail((-2.8, 6.35, 0), (-0.6, 6.35, 0))

# entrance stair up to the street (north along the stairwell), daylight at the top
bm = bmesh.new()
N, RISE, RUN = 12, 0.21, 0.36
for i in range(N):
    y0 = 2.3 + i * RUN
    G.box(bm, 4.85, 6.2, y0, y0 + RUN + 0.02, -0.2, (i + 1) * RISE)
G.box(bm, 4.85, 6.2, 2.3 + N * RUN, 7.6, -0.2, N * RISE)
solids.append(G.obj(bm, 'steps_entrance', 'rock'))
G.lights.append(G.box_obj('daylight', 'fixture', 5.0, 6.05, 7.52, 7.58, N * RISE, N * RISE + 2.1))
ld = bpy.data.lights.new('door', 'AREA'); ld.energy = 260; ld.size = 1.2; ld.color = (0.9, 0.95, 1.0)
lo = bpy.data.objects.new('bake_light', ld); lo.location = (5.5, 7.3, N * RISE + 1.2); lo.rotation_euler = (math.radians(90), 0, 0); G.col.objects.link(lo)

for loc in ((1.7, 1.2, 0.12), (2.9, 5.2, 0.12), (-1.6, 3.2, 0.12), (2.0, 8.6, 0.12), (-1.7, 7.2, 0.12)):
    G.light(loc, 30, size=0.07)

# anchors and panels
G.empty('tp_meresankh', (2.6, 1.6, 0.25))
G.empty('poi_chapel', (1.7, 3.4, 1.4))
G.empty('poi_statues', (2.0, 8.7, 1.4))
G.empty('poi_offering', (-1.7, 3.3, 1.4))
G.empty('insc_meresankh_architrave', (2.05, 9.745, 1.9), (1, 0, 0), (0, 0, 1), 3.7, 0.2)
G.empty('tex_mer_pillar', (0.012, 4.025, 1.1), (0, 1, 0), (0, 0, 1), 0.72, 1.95)
G.empty('tex_mer_east', (3.388, 4.7, 1.25), (0, -1, 0), (0, 0, 1), 2.4, 1.8)
G.empty('tex_mer_north', (0.012, 6.1, 1.18), (0, 1, 0), (0, 0, 1), 1.3, 1.58)
G.empty('tex_mer_west', (0.014, 3.9, 2.4), (0, 1, 0), (0, 0, 1), 3.0, 0.36)

final = [room, G.join(solids, 'solids')]
G.join(deco, 'deco')
G.bake_and_export(final, 'meresankh.glb')
