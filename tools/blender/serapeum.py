#!/usr/bin/env python3
"""Serapeum of Saqqara — Greater Vaults. Built with Blender (bpy), exported as GLB.

    pip install bpy            # Blender as a Python module (5.x)
    python3 tools/blender/serapeum.py

Dimensions and features follow research/sites/serapeum.md (sources there):
  * sarcophagus body 3.85 x 2.32 x 2.32 m, cavity 3.17 x 1.46 x 1.73 m,
    lid 3.85 x 2.32 x 0.98 m (Linant de Bellefonds, via Mariette);
  * burial-chamber floors 2-3 m below the gallery floor, each box let ~1 m
    into a recess; vaulted, masonry-lined chambers (photos);
  * 24 boxes: Amasis II (red granite, panelled, lid moved to the entrance),
    Cambyses II (grey granite, blocking the original entrance), Khabash
    (smaller, in an unused tunnel, lid ajar), one inscribed Ptolemaic box;
  * visitor fittings seen in the photos: floor tube lights, timber rails.
The gallery PLAN is schematic (straight main gallery + transverse Saite
passage, ~360 m in all): Mariette's plan has not been traced yet.

Blender axes: X east, Y north, Z up (exported Y-up: X east, Y up, Z south).
Gallery floor is Z = 0. Lighting is baked into vertex colours with Cycles.
"""
import math, os, random, sys
import bpy, bmesh
from mathutils import Vector, Matrix, noise

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'models', 'serapeum.glb')
random.seed(24)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


def mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    return m

M = {
    'rock': mat('rock', (0.62, 0.52, 0.36)),
    'masonry': mat('masonry', (0.70, 0.62, 0.46)),
    'granite_black': mat('granite_black', (0.07, 0.07, 0.08)),
    'granite_red': mat('granite_red', (0.45, 0.30, 0.26)),
    'granite_grey': mat('granite_grey', (0.25, 0.25, 0.26)),
    'wood': mat('wood', (0.35, 0.22, 0.12)),
    'fixture': mat('fixture', (1.0, 0.95, 0.8)),
}
em = M['fixture'].node_tree.nodes['Principled BSDF']
em.inputs['Emission Color'].default_value = (1.0, 0.85, 0.6, 1)
em.inputs['Emission Strength'].default_value = 60.0


def obj_from_bm(bm, name, material=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    if material: me.materials.append(M[material])
    return o


def box_bm(bm, x0, x1, y0, y1, z0, z1):
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co.x = x0 + (v.co.x + 0.5) * (x1 - x0)
        v.co.y = y0 + (v.co.y + 0.5) * (y1 - y0)
        v.co.z = z0 + (v.co.z + 0.5) * (z1 - z0)
    return r['verts']


def vault_bm(bm, x0, x1, y0, y1, z0, spring, rise, axis='x', seg=10):
    """Room with a barrel vault: axis = direction the vault runs along."""
    prof = [(-0.5, 0.0), (0.5, 0.0)]                       # across-span (t), height above z0
    pts = [(-0.5, 0.0), (0.5, 0.0)]
    arch = [(0.5 * math.cos(a), spring + rise * math.sin(a)) for a in [math.pi * i / seg for i in range(seg + 1)]]
    outline = [(-0.5, 0.0), (0.5, 0.0)] + [(t, h) for t, h in arch]   # bottom L->R then arch R->L
    span0, span1 = (y0, y1) if axis == 'x' else (x0, x1)
    run0, run1 = (x0, x1) if axis == 'x' else (y0, y1)
    rings = []
    for run in (run0, run1):
        ring = []
        for t, h in outline:
            s = span0 + (t + 0.5) * (span1 - span0)
            co = (run, s, z0 + h) if axis == 'x' else (s, run, z0 + h)
            ring.append(bm.verts.new(co))
        rings.append(ring)
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)


def new_void(name, build):
    bm = bmesh.new(); build(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name)


# ---------------------------------------------------------------- layout
GW, GH_SPRING, GH_RISE = 3.2, 4.0, 1.4            # gallery width, wall height, vault rise
GALLERY_LEN = 250.0
N_CH = 21
CH_PITCH = 11.0
CH_W, CH_D, CH_FLOOR, CH_SPRING, CH_RISE = 5.6, 8.6, -2.2, 4.6, 1.8
TRANS_Y0, TRANS_Y1 = -30.0, 46.0                   # transverse (Saite) passage along Y at x in [0, 3.2]
voids = []

voids.append(new_void('gallery', lambda bm: vault_bm(bm, -GALLERY_LEN, 1.0, -GW / 2, GW / 2, 0, GH_SPRING, GH_RISE, 'x')))
voids.append(new_void('transverse', lambda bm: vault_bm(bm, 0.0, GW, TRANS_Y0, TRANS_Y1, 0, GH_SPRING, GH_RISE, 'y')))
# entrance stair hall rising north from the transverse passage's north end
voids.append(new_void('stairhall', lambda bm: box_bm(bm, -0.4, GW + 0.4, TRANS_Y1 - 0.5, TRANS_Y1 + 16, 0, 10.5)))
# Khabash's unused tunnel: narrow, low, off the west end heading north
voids.append(new_void('khabash_tunnel', lambda bm: vault_bm(bm, -GALLERY_LEN, -GALLERY_LEN + 2.8, 0, 34, 0, 2.4, 0.9, 'y')))

chambers = []          # (cx, side, kind)
for i in range(N_CH):
    cx = -14.0 - i * CH_PITCH
    side = 1 if i % 2 == 0 else -1
    chambers.append((cx, side, 'ptolemaic_inscribed' if i == 18 else 'plain'))
    y0 = side * GW / 2 - (0.3 if side > 0 else -0.3)
    ya, yb = sorted((y0, side * (GW / 2 + CH_D)))
    voids.append(new_void(f'ch{i}', lambda bm, cx=cx, ya=ya, yb=yb: vault_bm(
        bm, cx - CH_W / 2, cx + CH_W / 2, ya, yb, CH_FLOOR, CH_SPRING, CH_RISE, 'y')))
# Amasis II's chamber, off the west side of the transverse passage
AM_Y = 22.0
voids.append(new_void('ch_amasis', lambda bm: vault_bm(bm, -CH_D + 0.3, 0.3, AM_Y - CH_W / 2, AM_Y + CH_W / 2, CH_FLOOR, CH_SPRING, CH_RISE, 'x')))

# union all voids, then turn the result inside out: that is the rock surface
bpy.ops.object.select_all(action='DESELECT')
base = voids[0]
for v in voids[1:]:
    mod = base.modifiers.new('u', 'BOOLEAN'); mod.operation = 'UNION'; mod.object = v; mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(v, do_unlink=True)
rock = base; rock.name = 'rock'
rm = rock.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.42; rm.use_smooth_shade = True
bpy.context.view_layer.objects.active = rock
bpy.ops.object.modifier_apply(modifier=rm.name)

bm = bmesh.new(); bm.from_mesh(rock.data)
bmesh.ops.reverse_faces(bm, faces=bm.faces)
# hewn-rock roughness (floors kept nearly flat so walking is smooth)
for v in bm.verts:
    n = v.normal
    k = 1.0 - min(1.0, abs(n.z) * (1.6 if n.z < 0 else 0.5))      # after the flip, floors have n.z > 0... handled below
    d = noise.noise(v.co * 0.9) * 0.22 + noise.noise(v.co * 2.7) * 0.08 + noise.noise(v.co * 0.25) * 0.25
    v.co += n * d * (0.25 + 0.75 * k)
bm.normal_update()
rock.data.materials.append(M['rock']); rock.data.materials.append(M['masonry'])
for f in bm.faces:
    c = f.calc_center_median()
    in_main_ch = c.x < -8 and abs(c.y) > GW / 2 + 0.5 and c.x > -GALLERY_LEN + 3.5
    in_amasis = c.x < -0.6 and c.x > -CH_D and abs(c.y - AM_Y) < CH_W / 2 + 0.6
    # chambers are lined with limestone masonry up to the vault springing; rock above and everywhere else
    f.material_index = 1 if (in_main_ch or in_amasis) and c.z < CH_FLOOR + CH_SPRING + 0.2 else 0
    f.smooth = True
bm.to_mesh(rock.data); bm.free()

# ---------------------------------------------------------------- sarcophagi
BODY = (3.85, 2.32, 2.32)       # length, width, height
CAV = (3.17, 1.46, 1.73)
LID_T = 0.98
empties = []


def empty(name, loc, right, up, w, h):
    """Inscription panel anchor: local X = right (reading direction), Y = up, Z = outward normal."""
    right, up = Vector(right).normalized(), Vector(up).normalized()
    nrm = right.cross(up)
    e = bpy.data.objects.new(name, None)
    m = Matrix((right, up, nrm)).transposed().to_4x4()
    e.matrix_world = Matrix.Translation(Vector(loc)) @ m @ Matrix.Diagonal((w, h, 1, 1))
    col.objects.link(e); empties.append(e)
    return e


def sarcophagus(name, center, yaw, material, lid='on', scale=1.0, cav_round=False):
    """center = centre of the body's base. Returns the body's world matrix."""
    L, W, H = (d * scale for d in BODY)
    bm = bmesh.new()
    box_bm(bm, -L / 2, L / 2, -W / 2, W / 2, 0, H)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges], offset=0.035, segments=1, affect='EDGES')
    body = obj_from_bm(bm, name + '_body', material)
    cav = bmesh.new()
    box_bm(cav, -CAV[0] * scale / 2, CAV[0] * scale / 2, -CAV[1] * scale / 2, CAV[1] * scale / 2, H - CAV[2] * scale, H + 0.3)
    if cav_round:
        bmesh.ops.bevel(cav, geom=[e for e in cav.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 0.5], offset=0.5, segments=5, affect='EDGES')
    cavo = obj_from_bm(cav, name + '_cav')
    mod = body.modifiers.new('c', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cavo; mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cavo, do_unlink=True)
    world = Matrix.Translation(Vector(center)) @ Matrix.Rotation(yaw, 4, 'Z')
    body.matrix_world = world
    parts = [body]
    if lid != 'off':
        lb = bmesh.new()
        box_bm(lb, -L / 2, L / 2, -W / 2, W / 2, 0, LID_T * scale)
        top = [e for e in lb.edges if e.verts[0].co.z > 0.5 * scale and e.verts[1].co.z > 0.5 * scale]
        bmesh.ops.bevel(lb, geom=top, offset=0.36 * scale, segments=1, affect='EDGES')   # chamfered top (photos)
        lo = obj_from_bm(lb, name + '_lid', material)
        if lid == 'on':
            lm = Matrix.Translation((0, 0, H + 0.005))
        else:                                    # pushed ajar by the ancient robbers
            lm = Matrix.Translation((lid[0], lid[1], H + 0.005)) @ Matrix.Rotation(lid[2], 4, 'Z')
        lo.matrix_world = world @ lm
        parts.append(lo)
        lo['lid_matrix'] = [list(r) for r in (world @ lm)]
    return world, parts, (L, W, H)


granite = {'granite_black': [], 'granite_red': [], 'granite_grey': []}
lamps, rails, steps = [], [], []
tube_specs = []


def tube(loc, along):
    """A fluorescent tube lying on the floor (as in the photos)."""
    bm = bmesh.new()
    a = Vector(along).normalized()
    side = Vector((-a.y, a.x, 0))
    c = Vector(loc)
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        p = v.co.copy()
        v.co = c + a * p.x * 1.2 + side * p.y * 0.07 + Vector((0, 0, 0.05 + p.z * 0.07))
    lamps.append(obj_from_bm(bm, 'tube', 'fixture'))
    tube_specs.append((c + Vector((0, 0, 0.25)), 1.0))


def rail(a, b, z):
    """Timber visitor rail between two points at gallery level."""
    a, b = Vector(a), Vector(b)
    d = (b - a); L = d.length; d.normalize(); side = Vector((-d.y, d.x, 0))
    bm = bmesh.new()
    for h in (0.55, 1.05):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            p = v.co.copy(); v.co = a + d * (p.x + 0.5) * L + side * p.y * 0.07 + Vector((0, 0, z + h + p.z * 0.1))
    for t in (0.02, 0.5, 0.98):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            p = v.co.copy(); v.co = a + d * t * L + d * p.x * 0.09 + side * p.y * 0.09 + Vector((0, 0, z + (p.z + 0.5) * 1.1))
    rails.append(obj_from_bm(bm, 'rail', 'wood'))


def stair(origin, direction, n, rise, run, width):
    """Solid steps descending from `origin` along `direction`."""
    o, d = Vector(origin), Vector(direction).normalized(); side = Vector((-d.y, d.x, 0))
    bm = bmesh.new()
    for i in range(n):
        top = o.z - rise * (i + 1)
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            p = v.co.copy()
            v.co = o + d * (i + p.x + 0.5) * run + side * p.y * width + Vector((0, 0, 0))
            v.co.z = (top if p.z > 0 else o.z - rise * n - 0.3)
    steps.append(obj_from_bm(bm, 'steps', 'masonry'))


mats_cycle = ['granite_black', 'granite_black', 'granite_grey', 'granite_black', 'granite_red', 'granite_grey']
for i, (cx, side, kind) in enumerate(chambers):
    cy = side * (GW / 2 + CH_D * 0.56)
    mname = 'granite_black' if kind != 'plain' else mats_cycle[i % len(mats_cycle)]
    r = random.random()
    lid = 'on' if r < 0.45 else (random.uniform(0.5, 1.0) * random.choice((-1, 1)), random.uniform(-0.25, 0.25), random.uniform(-0.06, 0.06))
    world, parts, (L, W, H) = sarcophagus(f'box{i}', (cx, cy, CH_FLOOR - 0.6), math.pi / 2, mname, lid, random.uniform(0.94, 1.03))
    granite[mname] += parts
    # tube lights on the chamber floor beside the box, timber rail across the mouth, steps down
    tube((cx + side * 0 + 2.0, cy - side * 1.0, CH_FLOOR), (0, 1, 0))
    tube((cx - 2.0, cy + side * 1.5, CH_FLOOR), (0, 1, 0))
    ym = side * (GW / 2 + 0.25)
    rail((cx - CH_W / 2 + 1.5, ym, 0), (cx + CH_W / 2 - 0.1, ym, 0), 0)
    stair((cx - CH_W / 2 + 0.75, side * (GW / 2 + 0.1), 0), (0, side, 0), 5, 0.44, 0.62, 1.3)
    if i == 2: empty('poi_typical', (cx, side * 1.0, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)
    if kind == 'ptolemaic_inscribed':
        zc = CH_FLOOR - 0.6 + H / 2
        # long sides face +-X here (box yawed 90 deg); the gallery-facing end faces -side*Y
        empty('insc_ptolemaic_end', (cx, cy - side * (L / 2 + 0.012), zc), (side * 1.0, 0, 0), (0, 0, 1), W, H)
        empty('insc_ptolemaic_side_a', (cx + W / 2 + 0.012, cy, zc), (0, side * 1.0, 0) if False else (0, 1, 0), (0, 0, 1), L, H)
        empty('insc_ptolemaic_side_b', (cx - W / 2 - 0.012, cy, zc), (0, -1, 0), (0, 0, 1), L, H)
        empty('poi_ptolemaic', (cx, side * 1.0, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)

# Amasis II: red granite, panelled, no lid (the lid lies at the entrance)
world, parts, (L, W, H) = sarcophagus('box_amasis', (-CH_D * 0.56, AM_Y, CH_FLOOR - 0.6), 0.0, 'granite_red', 'off')
granite['granite_red'] += parts
zc = CH_FLOOR - 0.6 + H / 2
empty('insc_amasis_end', (-CH_D * 0.56 + L / 2 + 0.012, AM_Y, zc), (0, 1, 0), (0, 0, 1), W, H)
empty('insc_amasis_side_a', (-CH_D * 0.56, AM_Y + W / 2 + 0.012, zc), (-1, 0, 0), (0, 0, 1), L, H)
empty('insc_amasis_side_b', (-CH_D * 0.56, AM_Y - W / 2 - 0.012, zc), (1, 0, 0), (0, 0, 1), L, H)
empty('poi_amasis', (1.2, AM_Y, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)
tube((-CH_D * 0.56 + 2.6, AM_Y + 1.9, CH_FLOOR), (1, 0, 0)); tube((-CH_D * 0.56 - 2.4, AM_Y - 1.9, CH_FLOOR), (1, 0, 0))
rail((-0.2, AM_Y - CH_W / 2 + 1.5, 0), (-0.2, AM_Y + CH_W / 2 - 0.1, 0), 0)
stair((-0.1, AM_Y - CH_W / 2 + 0.75, 0), (-1, 0, 0), 5, 0.44, 0.62, 1.3)
# ...its lid, displayed on blocks at the foot of the entrance stair
lb = bmesh.new(); box_bm(lb, -BODY[0] / 2, BODY[0] / 2, -BODY[1] / 2, BODY[1] / 2, 0, LID_T)
bmesh.ops.bevel(lb, geom=[e for e in lb.edges if e.verts[0].co.z > 0.5 and e.verts[1].co.z > 0.5], offset=0.36, segments=1, affect='EDGES')
alid = obj_from_bm(lb, 'amasis_lid', 'granite_red')
ALID = Vector((GW / 2 + 0.2, TRANS_Y1 + 9.5, 0.45))
alid.matrix_world = Matrix.Translation(ALID) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
granite['granite_red'].append(alid)
empty('insc_amasis_lid', (ALID.x - BODY[1] / 2 - 0.012, ALID.y, ALID.z + (LID_T - 0.36) / 2), (0, -1, 0), (0, 0, 1), BODY[0] * 0.9, (LID_T - 0.36) * 0.9)
empty('poi_amasis_lid', (ALID.x, ALID.y - 3, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)
for dx in (-0.7, 0.7):
    bmb = bmesh.new(); box_bm(bmb, ALID.x + dx - 0.25, ALID.x + dx + 0.25, ALID.y - 1.6, ALID.y + 1.6, 0, 0.45)
    steps.append(obj_from_bm(bmb, 'plinth', 'masonry'))

# Cambyses II: grey granite, standing in the passage where it blocks the original (south) entrance
CAM = Vector((GW / 2, TRANS_Y0 + 5.0, 0))
world, parts, (L, W, H) = sarcophagus('box_cambyses', CAM, math.pi / 2, 'granite_grey', 'on')
granite['granite_grey'] += parts
empty('insc_cambyses_lid', (CAM.x, CAM.y + L / 2 + 0.012, H + (LID_T - 0.36) / 2), (-1, 0, 0), (0, 0, 1), W * 0.9, (LID_T - 0.36) * 0.9)
empty('poi_cambyses', (CAM.x, CAM.y + 5, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)
tube((GW - 0.3, CAM.y + 3.2, 0), (0, 1, 0))

# Khabash: a smaller box at the mouth of the unused tunnel, lid shoved aside (round-ended cavity in the photo)
KH = Vector((-GALLERY_LEN + 1.4, 9.0, 0))
world, parts, (L, W, H) = sarcophagus('box_khabash', KH, math.pi / 2, 'granite_grey', (0.75, 0.12, 0.05), 0.72, cav_round=True)
granite['granite_grey'] += parts
empty('insc_khabash_lid', (KH.x + 0.12 * 0, KH.y - L / 2 + 0.75 - 0.012 - 0.0, H + (LID_T * 0.72 - 0.26) / 2 + 0.01), (1, 0, 0), (0, 0, 1), W * 0.8, (LID_T * 0.72 - 0.26) * 0.85)
empty('poi_khabash', (KH.x, KH.y - 4, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)
tube((KH.x - 1.0, KH.y - 3.0, 0), (0, 1, 0))

# gallery floor lights every ~11 m (between the chamber mouths) and along the passage
for i in range(N_CH + 1):
    x = -8.5 - i * CH_PITCH
    tube((x, (GW / 2 - 0.25) * (1 if i % 2 else -1), 0), (1, 0, 0))
for y in (-14, 0, 10, 34):
    tube((GW - 0.25, y, 0), (0, 1, 0))
tube((0.3, TRANS_Y1 + 4, 0), (0, 1, 0))

# entrance stair: up to the north from the passage end, with a bright doorway at the top
ST_N, ST_RISE, ST_RUN = 22, 0.36, 0.5
bm = bmesh.new()
for i in range(ST_N):
    y0 = TRANS_Y1 + 13.5 - ST_N * ST_RUN + i * ST_RUN
    box_bm(bm, -0.4, GW + 0.4, y0, y0 + ST_RUN + 0.02, -0.3, (i + 1) * ST_RISE)
box_bm(bm, -0.4, GW + 0.4, TRANS_Y1 + 13.5, TRANS_Y1 + 16.2, -0.3, ST_N * ST_RISE)       # top landing
steps.append(obj_from_bm(bm, 'entrance_stair', 'masonry'))
bm = bmesh.new(); box_bm(bm, 0.5, GW - 0.5, TRANS_Y1 + 15.85, TRANS_Y1 + 15.95, ST_N * ST_RISE, ST_N * ST_RISE + 2.4)
door = obj_from_bm(bm, 'daylight', 'fixture'); lamps.append(door)
empty('poi_entrance', (GW / 2, TRANS_Y1 + 2, 1.5), (1, 0, 0), (0, 0, 1), 1, 1)
empty('spawn', (GW / 2, TRANS_Y1 + 3.0, 0.2), (1, 0, 0), (0, 0, 1), 1, 1)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

final = [rock]
for k, lst in granite.items():
    if lst: final.append(join(lst, k))
final.append(join(rails, 'wood'))
final.append(join(steps, 'steps'))
fixtures = join(lamps, 'fixtures')

# ---------------------------------------------------------------- bake the lighting
# Lit the way it is today: tube lights on the floors, daylight at the door.
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(os.environ.get('BAKE_SAMPLES', '24'))
scene.cycles.max_bounces = 3
world_ = bpy.data.worlds.new('w'); scene.world = world_
world_.use_nodes = True
world_.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
for loc, power in tube_specs:
    ld = bpy.data.lights.new('tube', 'POINT'); ld.energy = 260 * power; ld.color = (1.0, 0.92, 0.78); ld.shadow_soft_size = 0.35
    lo = bpy.data.objects.new('tube_light', ld); lo.location = loc; col.objects.link(lo)
ld = bpy.data.lights.new('door', 'AREA'); ld.energy = 700; ld.size = 2.2; ld.color = (0.9, 0.95, 1.0)
lo = bpy.data.objects.new('door_light', ld); lo.location = (GW / 2, TRANS_Y1 + 15.6, ST_N * ST_RISE + 1.3)
lo.rotation_euler = (math.radians(90), 0, 0); col.objects.link(lo)

if os.environ.get('NO_BAKE') != '1':
    for o in final:
        if not o.data.color_attributes: o.data.color_attributes.new('Col', 'BYTE_COLOR', 'POINT' if o.name == 'rock' else 'CORNER')
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        scene.render.bake.target = 'VERTEX_COLORS'
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')
        print('baked', o.name, len(o.data.polygons), file=sys.stderr)

for o in list(bpy.data.objects):
    if o.type == 'LIGHT': bpy.data.objects.remove(o, do_unlink=True)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True,
                          export_normals=True, export_texcoords=False, export_materials='EXPORT',
                          export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_extras=True, export_cameras=False, export_lights=False)
print('wrote', OUT, '%.1f MB' % (os.path.getsize(OUT) / 1e6), 'tris', sum(len(o.data.polygons) for o in final), file=sys.stderr)
