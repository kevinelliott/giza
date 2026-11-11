#!/usr/bin/env python3
"""The Nile at Luxor: the East Bank corniche and its landings, the channel,
the West Bank ferry landing and fields.

    python3 tools/blender/luxor_nile.py     -> assets/models/luxor_nile.glb

A sunlit, outdoor model (no baked light). Origin = the East Bank ferry
landing at water level; X east, Y north; the river runs north along -X.. see
research/sites/nile-and-boats.md for the numbers (WIDTH etc. below).
Empties tell the game where boats go:
  moor_<boat>_<n>    a moored boat (heading = the empty's local +X)
  lane_<n>_a / _b    the two ends of a sailing lane (boats go back and forth)
  ferry_a / ferry_b  the two ferry landings
  board_<boat>_<n>   a boat the player can board (E)
  tp_* / poi_*       fast-travel points and captions
Materials: "water", "silt", "desert", "limestone" and plain colours c_RRGGBB.
"""
import math, os, random, sys
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
random.seed(9)
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.context.scene.collection
MATS = {}

WIDTH = 500.0        # channel 490-515 m opposite Luxor Temple (OpenStreetMap)
NORTH, SOUTH = 900.0, -900.0
QUAY = 6.5           # upper corniche 6-7 m above the water; the lower promenade ~2 m (photo estimates)
DEPTH = 8.0          # deepest ~10 m (published); mean 4-6 m is an estimate


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        if name.startswith('c_'):
            r, g, b = (int(name[2 + i:4 + i], 16) / 255 for i in (0, 2, 4))
            m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (r ** 2.2, g ** 2.2, b ** 2.2, 1)
        MATS[name] = m
    return MATS[name]


def obj(bm, name, material, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    me.materials.append(mat(material))
    o = bpy.data.objects.new(name, me); COL.objects.link(o)
    return o


def box(bm, x0, x1, y0, y1, z0, z1):
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
    return r['verts']


def grid(name, material, x0, x1, y0, y1, nx, ny, height):
    bm = bmesh.new(); g = []
    for i in range(nx + 1):
        row = []
        for j in range(ny + 1):
            x = x0 + (x1 - x0) * i / nx; y = y0 + (y1 - y0) * j / ny
            row.append(bm.verts.new((x, y, height(x, y))))
        g.append(row)
    for i in range(nx):
        for j in range(ny): bm.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    return obj(bm, name, material, True)


def empty(name, loc, heading_deg=0.0):
    e = bpy.data.objects.new(name, None)
    e.matrix_world = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(math.radians(heading_deg), 4, 'Z')
    COL.objects.link(e); return e


# ---- the river ------------------------------------------------------------------------------------
bm = bmesh.new()
vs = [bm.verts.new(p) for p in ((-WIDTH - 60, SOUTH, 0), (30, SOUTH, 0), (30, NORTH, 0), (-WIDTH - 60, NORTH, 0))]
bm.faces.new(vs)
obj(bm, 'deco_water', 'water')
def bed(x, y):
    t = (x + WIDTH) / WIDTH                                   # 0 at the west bank, 1 at the east quay
    if x > 0: return -DEPTH * 0.6
    if x < -WIDTH: return min(1.6, (-WIDTH - x) * 0.06 - 0.2)     # the west bank shelves up gently
    return -DEPTH * (0.25 + 0.75 * math.sin(math.pi * min(1.0, max(0.0, t)) ** 0.8)) - 0.2
grid('riverbed', 'silt', -WIDTH - 60, 30, SOUTH, NORTH, 40, 40, bed)

# ---- East Bank: the stone corniche wall, promenade, road, the upper town edge -----------------------
bm = bmesh.new()
box(bm, 0, 3.0, SOUTH, NORTH, -DEPTH, 2.0)               # lower quay (where the boats lie)
box(bm, 3.0, 4.2, SOUTH, NORTH, -DEPTH, QUAY)                   # the battered wall up to the promenade
obj(bm, 'corniche_wall', 'limestone')
bm = bmesh.new(); box(bm, 4.2, 16.0, SOUTH, NORTH, QUAY - 0.4, QUAY)
obj(bm, 'promenade', 'c_c9b99a')
bm = bmesh.new(); box(bm, 16.0, 34.0, SOUTH, NORTH, QUAY - 0.5, QUAY - 0.1)
obj(bm, 'corniche_road', 'c_3a3a3c')
bm = bmesh.new(); box(bm, 34.0, 260.0, SOUTH, NORTH, QUAY - 0.5, QUAY)
obj(bm, 'east_ground', 'c_b9a98a')
# flights of steps down from the promenade to the lower quay, every 120 m, and at the ferry landing
bm = bmesh.new()
for y in [k * 120.0 for k in range(-7, 8)]:
    n = 20
    for i in range(n):
        z = QUAY - (i + 1) * (QUAY - 2.0) / n
        box(bm, 3.0 - 0.02, 4.4, y + 2.0 + i * 0.32, y + 2.0 + (i + 1) * 0.32 + 0.02, z - 0.6, z)   # steps run north along the wall face
    box(bm, 1.2, 3.0, y + 2.0 + n * 0.32, y + 9.5, 1.8, 2.0)
obj(bm, 'steps_quay', 'limestone')
# cut the wall back where the steps descend is not needed: the steps stand in front of the upper wall on the lower quay
# promenade parapet and lamp standards
bm = bmesh.new()
box(bm, 4.2, 4.5, SOUTH, NORTH, QUAY, QUAY + 0.45)
for y in range(int(SOUTH) + 10, int(NORTH), 25):
    box(bm, 4.25, 4.45, y - 0.25, y + 0.25, QUAY + 0.45, QUAY + 0.95)
obj(bm, 'parapet', 'limestone')
bm = bmesh.new()
for y in range(int(SOUTH) + 20, int(NORTH), 40):
    box(bm, 5.2, 5.36, y - 0.08, y + 0.08, QUAY, QUAY + 5.0); box(bm, 5.0, 5.56, y - 0.28, y + 0.28, QUAY + 5.0, QUAY + 5.5)
    box(bm, 15.2, 15.36, y + 20 - 0.08, y + 20 + 0.08, QUAY, QUAY + 7.0); box(bm, 15.3, 17.0, y + 20 - 0.05, y + 20 + 0.05, QUAY + 6.9, QUAY + 7.0)
obj(bm, 'deco_lamps', 'c_2b3a34')
# palms and trees along the promenade; buildings of the town front (hotels 4-6 storeys) as plain blocks
def palm(bm_t, bm_f, x, y, z, h):
    r = bmesh.ops.create_cone(bm_t, cap_ends=False, segments=6, radius1=0.22, radius2=0.14, depth=h)
    bmesh.ops.translate(bm_t, verts=r['verts'], vec=(x, y, z + h / 2))
    for k in range(8):
        a = k * math.pi / 4 + random.uniform(-0.2, 0.2); L = random.uniform(2.6, 3.6)
        d = Vector((math.cos(a), math.sin(a), 0)); side = Vector((-d.y, d.x, 0)) * 0.45
        top = Vector((x, y, z + h))
        p1 = top + d * L * 0.5 + Vector((0, 0, 0.5)); p2 = top + d * L + Vector((0, 0, -0.9))
        vs = [bm_f.verts.new(top - side * 0.3), bm_f.verts.new(top + side * 0.3), bm_f.verts.new(p1 + side), bm_f.verts.new(p1 - side)]
        bm_f.faces.new(vs)
        vs = [bm_f.verts.new(p1 - side), bm_f.verts.new(p1 + side), bm_f.verts.new(p2)]
        bm_f.faces.new(vs)
bt, bf = bmesh.new(), bmesh.new()
for y in range(int(SOUTH) + 15, int(NORTH), 18):
    if random.random() < 0.8: palm(bt, bf, 13.0 + random.uniform(-1, 1), y + random.uniform(-3, 3), QUAY, random.uniform(7, 11))
# ---- West Bank: mud bank, landing ramp, fields, palms, the road inland --------------------------------
def west(x, y):
    d = -WIDTH - x
    return 1.6 + min(2.2, max(0.0, d - 30) * 0.03) + 0.25 * math.sin(x * 0.05) * math.cos(y * 0.04)
grid('west_bank', 'c_6f8a45', -WIDTH - 700, -WIDTH - 58, SOUTH, NORTH, 30, 40, west)
bm = bmesh.new()
box(bm, -WIDTH - 40, -WIDTH + 14, -9, 9, -1.2, 0.9)             # the concrete ferry ramp, running into the water
box(bm, -WIDTH - 130, -WIDTH - 40, -7, 7, 0.9, 1.75)
obj(bm, 'west_ramp', 'c_9a968c')
bm = bmesh.new(); box(bm, -WIDTH - 700, -WIDTH - 130, -5, 5, 1.6, 4.05)
obj(bm, 'deco_west_road', 'c_3a3a3c')
for y in range(int(SOUTH) + 20, int(NORTH), 14):
    for k in range(2):
        x = -WIDTH - 62 - random.uniform(0, 240)
        if abs(y) < 16 and x > -WIDTH - 140: continue
        palm(bt, bf, x, y + random.uniform(-5, 5), west(x, y), random.uniform(8, 13))
obj(bt, 'deco_palm_trunks', 'c_6e4a26', True); obj(bf, 'deco_palm_fronds', 'c_55732f')
# East Bank ferry landing: a floating pontoon with a gangway
bm = bmesh.new()
box(bm, -14.0, 0.0, -6.0, 6.0, -0.4, 0.55)
obj(bm, 'pontoon', 'c_7d8288')
bm = bmesh.new(); box(bm, -1.0, 3.2, -1.2, 1.2, 0.5, 2.05)
obj(bm, 'gangway', 'c_8a8f94')
# the town front: hotel and apartment blocks behind the corniche road
bm = bmesh.new(); bw = bmesh.new()
y = SOUTH + 20
while y < NORTH - 40:
    w = random.uniform(22, 60); d = random.uniform(16, 30); h = random.choice((3, 4, 4, 5, 6)) * 3.3
    x0 = 40 + random.uniform(0, 8)
    box(bm, x0, x0 + d, y, y + w, QUAY, QUAY + h)
    for f in range(int(h / 3.3)):
        n = int(w / 3.6)
        for i in range(n):
            ya = y + 1.0 + i * (w - 2.0) / n
            box(bw, x0 - 0.03, x0 + 0.02, ya + 0.5, ya + (w - 2.0) / n - 0.5, QUAY + f * 3.3 + 1.0, QUAY + f * 3.3 + 2.5)
    y += w + random.uniform(4, 16)
obj(bm, 'town_front', 'c_d9c7a3'); obj(bw, 'deco_town_windows', 'c_27323a')

# ---- where the boats are ------------------------------------------------------------------------------
# cruise ships lie along the East Bank only, parallel to the bank with their bows upstream (south),
# rafted three to five abreast at 14.2 m centres (measured on satellite)
k = 0
for y in (160, 250, 340, 440, 530, 650):
    for abreast in range(random.choice((3, 3, 4, 5))):
        empty('moor_cruiser_%d' % k, (-7.4 - abreast * 14.2, y, 0), -90); k += 1
empty('moor_dahabiya_0', (-4.0, -210, 0), 90); empty('moor_dahabiya_1', (-4.0, -300, 0), 90)
for i in range(7): empty('moor_felucca_%d' % i, (-2.2 - (i % 2) * 3.4, -60 - i * 7.0, 0), 90 + random.uniform(-8, 8))
for i in range(9): empty('moor_launch_%d' % i, (-2.0 - (i % 3) * 3.0, 30 + (i // 3) * 11.0, 0), 90 + random.uniform(-6, 6))
for i in range(6): empty('moor_launch_w%d' % i, (-WIDTH + 16 + (i % 2) * 3.2, 22 + i * 6.0, 0), random.uniform(-10, 10))
empty('moor_skiff_0', (-WIDTH + 10, -60, 0), 20)
empty('board_felucca_0', (-3.0, -36, 0), 90)
empty('board_launch_0', (-15.2, 3.0, 0), 180)
empty('ferry_a', (-27.0, 0, 0), 180); empty('ferry_b', (-WIDTH + 28, 0, 0), 180)
for i, x in enumerate((-110, -200, -290, -380)):
    empty('lane_%d_a' % i, (x, SOUTH + 60, 0)); empty('lane_%d_b' % i, (x, NORTH - 60, 0))
empty('tp_corniche', (9.0, -8.0, QUAY + 0.3)); empty('tp_east_landing', (-6.0, 0.0, 0.9)); empty('tp_west_landing', (-WIDTH - 60, 0.0, 2.1))
empty('poi_corniche', (9.0, 0, QUAY + 1.5)); empty('poi_river', (-WIDTH / 2, 0, 2.0)); empty('poi_cruisers', (-10, 330, 4.0))
empty('poi_feluccas', (-4, -80, 2.0)); empty('poi_ferry', (-8, 0, 2.0)); empty('poi_west', (-WIDTH - 70, 0, 3.0)); empty('poi_dahabiya', (-6, -250, 3.0))

out = os.path.join(ROOT, 'assets', 'models', 'luxor_nile.glb')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_normals=True,
                          export_texcoords=False, export_materials='EXPORT', export_cameras=False, export_lights=False)
print('wrote', out, '%.0f kB' % (os.path.getsize(out) / 1e3), file=sys.stderr)
