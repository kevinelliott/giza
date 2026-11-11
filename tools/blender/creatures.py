"""Camel, horse and person for the plateau: organic bodies grown from a
skeleton (Skin + Subdivision modifiers), rigged with the armature Blender
derives from that skeleton, with walk / idle / sit cycles.

    python3 tools/blender/creatures.py     -> assets/models/{camel,horse,person}.glb

All face +X (Blender X east), stand on Z = 0, real sizes in metres:
a dromedary 2.1 m at the hump, a carriage horse 1.55 m at the withers, a
1.72 m person. Material names are slots the game recolours: camel "coat",
"dark", "saddle", "wood"; horse "coat", "dark", "harness"; person "skin",
"shirt", "trousers", "hair", "shoes", "robe", "scarf".
Objects named "opt_*" are optional dress the game shows or hides.
"""
import math, os, sys
import bpy, bmesh
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FPS = 24


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS


def material(name, rgb, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    return m


def grow(name, joints, bones, root):
    """joints: {key: (x, y, z, radius)}; bones: [(from, to)] -> (mesh object, armature object, {(from,to): bone name})."""
    keys = list(joints)
    me = bpy.data.meshes.new(name)
    me.from_pydata([joints[k][:3] for k in keys], [(keys.index(a), keys.index(b)) for a, b in bones], [])
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    o.modifiers.new('skin', 'SKIN')
    for i, k in enumerate(keys):
        sv = me.skin_vertices[0].data[i]
        r = joints[k][3]
        sv.radius = (r, r) if not isinstance(r, tuple) else r
        sv.use_root = (k == root)
    bpy.ops.object.skin_armature_create(modifier='skin')
    arm = bpy.context.view_layer.objects.active if bpy.context.view_layer.objects.active.type == 'ARMATURE' else \
        next(x for x in bpy.context.scene.objects if x.type == 'ARMATURE')
    arm.name = name + '_rig'
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
    bpy.context.view_layer.objects.active = o
    for mod in ('skin', 'sub'):
        bpy.ops.object.modifier_apply(modifier=mod)
    for p in o.data.polygons: p.use_smooth = True
    o.parent = arm
    names = {}
    for a, b in bones:
        pa, pb = Vector(joints[a][:3]), Vector(joints[b][:3])
        best = min(arm.data.bones, key=lambda bn: min((bn.head_local - pa).length + (bn.tail_local - pb).length,
                                                      (bn.head_local - pb).length + (bn.tail_local - pa).length))
        names[(a, b)] = best.name
    return o, arm, names


def paint(o, mats, rule):
    """Assign material slots by face position: rule(centre, normal) -> material name."""
    idx = {}
    for m in mats:
        o.data.materials.append(mats[m]); idx[m] = len(o.data.materials) - 1
    for p in o.data.polygons:
        p.material_index = idx[rule(p.center, p.normal)]


def swing(arm, bone, angle):
    """Rotate a pose bone about the world Y axis (the sagittal plane)."""
    pb = arm.pose.bones[bone]
    axis = arm.data.bones[bone].matrix_local.to_3x3().inverted() @ Vector((0, 1, 0))
    pb.rotation_mode = 'AXIS_ANGLE'
    pb.rotation_axis_angle = (angle, axis.x, axis.y, axis.z)


def action(arm, name, frames, pose):
    """pose(u) -> {bone: angle} for u in [0, 1); keyed every other frame, first = last."""
    arm.animation_data_create()
    act = bpy.data.actions.new(name)
    arm.animation_data.action = act
    used = set()
    for f in range(0, frames + 1, 2):
        p = pose((f % frames) / frames)
        for b, a in p.items():
            swing(arm, b, a)
            arm.pose.bones[b].keyframe_insert('rotation_axis_angle', frame=f)
            used.add(b)
    act.use_fake_user = True
    track = arm.animation_data.nla_tracks.new(); track.name = name
    track.strips.new(name, 0, act)
    arm.animation_data.action = None
    for b in used:
        swing(arm, b, 0.0)


def lathe(name, profile, mat, segs=14, squash=1.0, origin=(0, 0, 0)):
    """Surface of revolution about Z from [(r, z)]; squash flattens it along X."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        rings.append([bm.verts.new((math.cos(k * 2 * math.pi / segs) * r * squash + origin[0], math.sin(k * 2 * math.pi / segs) * r + origin[1], z + origin[2]))
                      for k in range(segs)])
    for a, b in zip(rings, rings[1:]):
        for k in range(segs):
            bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def box(name, mat, x0, x1, y0, y1, z0, z1, bevel=0.0):
    bm = bmesh.new()
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
    if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES')
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = bool(bevel)
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def export(file):
    out = os.path.join(ROOT, 'assets', 'models', file)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=False,
                              export_normals=True, export_texcoords=False, export_materials='EXPORT',
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True,
                              export_cameras=False, export_lights=False)
    faces = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    print('wrote', out, '%.0f kB' % (os.path.getsize(out) / 1e3), 'faces', faces, file=sys.stderr)


def quadruped(name, J, extra_bones=()):
    legs = []
    B = [('hip', 'belly'), ('belly', 'chest'), ('chest', 'neck0'), ('neck0', 'neck1'), ('neck1', 'neck2'), ('neck2', 'head'), ('head', 'muzzle'),
         ('hip', 'tail0'), ('tail0', 'tail1')] + list(extra_bones)
    for side in 'LR':
        B += [('chest', 'sh' + side), ('sh' + side, 'kn' + side), ('kn' + side, 'fe' + side), ('fe' + side, 'ft' + side),
              ('hip', 'th' + side), ('th' + side, 'hk' + side), ('hk' + side, 'pa' + side), ('pa' + side, 'hf' + side)]
    return grow(name, J, B, 'belly') + (B,)


def gait(n, pace, amp_f, amp_h, knee, hock, neck_bones, bob):
    """Four-legged walk. pace=True: both legs of a side move together (camel)."""
    def pose(u):
        p = {}
        for side, s0 in (('L', 0.0), ('R', 0.5)):
            for front in (True, False):
                ph = 2 * math.pi * (u + s0 + (0.0 if (front or pace) else 0.25))
                lift = max(0.0, math.cos(ph))                       # swing phase: leg travelling forward
                if front:
                    p[n[('sh' + side, 'kn' + side)]] = -amp_f * math.sin(ph)
                    p[n[('kn' + side, 'fe' + side)]] = knee * lift
                    p[n[('fe' + side, 'ft' + side)]] = 0.5 * knee * lift
                else:
                    p[n[('th' + side, 'hk' + side)]] = -amp_h * math.sin(ph)
                    p[n[('hk' + side, 'pa' + side)]] = -hock * lift
                    p[n[('pa' + side, 'hf' + side)]] = 0.6 * hock * lift
        for k, b in enumerate(neck_bones):
            p[n[b]] = bob * math.sin(4 * math.pi * u + k * 0.5)
        p[n[('hip', 'tail0')]] = 0.08 * math.sin(2 * math.pi * u)
        return p
    return pose


# =====================================================================  camel
def camel():
    reset()
    J = {  # a dromedary: long legs, deep chest, one hump, S-curved neck
        'hip': (-0.72, 0, 1.50, 0.31), 'belly': (0.0, 0, 1.46, 0.43), 'chest': (0.62, 0, 1.40, 0.37),
        'hump': (-0.1, 0, 2.02, 0.24),
        'neck0': (0.98, 0, 1.38, 0.2), 'neck1': (1.3, 0, 1.6, 0.14), 'neck2': (1.42, 0, 2.12, 0.115),
        'head': (1.56, 0, 2.38, 0.135), 'muzzle': (1.88, 0, 2.24, 0.085),
        'tail0': (-1.02, 0, 1.50, 0.05), 'tail1': (-1.10, 0, 0.95, 0.03),
    }
    for side, y in (('L', 0.2), ('R', -0.2)):
        J['sh' + side] = (0.62, y, 1.2, 0.15); J['kn' + side] = (0.64, y, 0.72, 0.075)
        J['fe' + side] = (0.62, y, 0.13, 0.05); J['ft' + side] = (0.72, y, 0.05, 0.085)
        J['th' + side] = (-0.70, y, 1.22, 0.19); J['hk' + side] = (-0.86, y, 0.74, 0.07)
        J['pa' + side] = (-0.76, y, 0.13, 0.05); J['hf' + side] = (-0.67, y, 0.05, 0.085)
    o, arm, n, B = quadruped('camel', J, [('belly', 'hump')])
    mats = {'coat': material('coat', (0.62, 0.47, 0.29)), 'dark': material('dark', (0.2, 0.15, 0.1))}
    paint(o, mats, lambda c, nn: 'dark' if (c.z < 0.1 or (c.x > 1.74 and c.z < 2.33)) else 'coat')
    neck = [('chest', 'neck0'), ('neck0', 'neck1'), ('neck1', 'neck2')]
    action(arm, 'walk', 32, gait(n, True, 0.3, 0.27, 0.55, 0.5, neck, 0.035))
    action(arm, 'idle', 96, lambda u: {n[('neck1', 'neck2')]: 0.05 * math.sin(2 * math.pi * u), n[('neck2', 'head')]: 0.06 * math.sin(4 * math.pi * u + 1),
                                       n[('hip', 'tail0')]: 0.25 * max(0.0, math.sin(6 * math.pi * u)) ** 4})
    # tourist saddle: a woven blanket draped over the hump, a padded seat and two wooden horns
    sad = material('saddle', (0.69, 0.19, 0.19), 0.9); wood = material('wood', (0.3, 0.2, 0.12), 0.7)
    parts = []
    bm = bmesh.new()
    segs, rows = 16, 7
    grid = []
    for i in range(rows + 1):
        x = -0.62 + 1.0 * i / rows
        ring = []
        for k in range(segs + 1):
            a = math.pi * (k / segs - 0.5) * 1.05                      # hangs part-way down both flanks
            lift = 0.36 * math.exp(-((x + 0.1) / 0.27) ** 2) * max(0.0, math.cos(a * 1.35)) ** 1.5       # rises over the hump
            ring.append(bm.verts.new((x, math.sin(a) * 0.46, 1.46 + math.cos(a) * 0.46 + lift)))
        grid.append(ring)
    for a, b in zip(grid, grid[1:]):
        for k in range(segs): bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('blanket'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(sad)
    blanket = bpy.data.objects.new('opt_saddle', me); bpy.context.scene.collection.objects.link(blanket)
    sol = blanket.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.03; sol.offset = 1
    bpy.context.view_layer.objects.active = blanket
    bpy.ops.object.modifier_apply(modifier='s')
    parts.append(box('seat', material('seat', (0.25, 0.18, 0.12), 0.8), -0.4, 0.2, -0.2, 0.2, 2.27, 2.35, 0.035))
    for x in (-0.46, 0.26): parts.append(lathe('horn', [(0.035, 2.0), (0.03, 2.55), (0.045, 2.6), (0.0, 2.63)], wood, 8, 1.0, (x, 0, 0)))
    for p in parts: p.parent = blanket
    blanket.parent = arm
    # halter and lead rope
    export('camel.glb')


# =====================================================================  horse
def horse():
    reset()
    J = {
        'hip': (-0.62, 0, 1.36, 0.3), 'belly': (0.0, 0, 1.26, 0.35), 'chest': (0.55, 0, 1.3, 0.33),
        'neck0': (0.78, 0, 1.5, 0.22), 'neck1': (0.94, 0, 1.7, 0.17), 'neck2': (1.06, 0, 1.88, 0.14),
        'head': (1.16, 0, 1.96, 0.13), 'muzzle': (1.5, 0, 1.62, 0.085),
        'tail0': (-0.88, 0, 1.36, 0.06), 'tail1': (-1.02, 0, 0.62, 0.075),
    }
    for side, y in (('L', 0.17), ('R', -0.17)):
        J['sh' + side] = (0.55, y, 1.1, 0.12); J['kn' + side] = (0.57, y, 0.66, 0.055)
        J['fe' + side] = (0.56, y, 0.14, 0.045); J['ft' + side] = (0.64, y, 0.045, 0.07)
        J['th' + side] = (-0.6, y, 1.1, 0.16); J['hk' + side] = (-0.76, y, 0.66, 0.055)
        J['pa' + side] = (-0.68, y, 0.14, 0.045); J['hf' + side] = (-0.6, y, 0.045, 0.07)
    o, arm, n, B = quadruped('horse', J)
    mats = {'coat': material('coat', (0.25, 0.16, 0.1)), 'dark': material('dark', (0.06, 0.05, 0.04))}
    paint(o, mats, lambda c, nn: 'dark' if (c.z < 0.1 or c.x < -0.84 or (0.8 < c.x < 1.2 and c.z > 1.55 and abs(c.y) < 0.05 and nn.z > 0.3)) else 'coat')
    neck = [('chest', 'neck0'), ('neck0', 'neck1'), ('neck1', 'neck2')]
    action(arm, 'walk', 24, gait(n, False, 0.42, 0.36, 0.75, 0.6, neck, 0.03))
    action(arm, 'idle', 96, lambda u: {n[('neck2', 'head')]: 0.05 * math.sin(4 * math.pi * u), n[('hip', 'tail0')]: 0.3 * max(0.0, math.sin(6 * math.pi * u)) ** 4})
    har = material('harness', (0.82, 0.24, 0.24), 0.8)
    pad = box('opt_harness', har, -0.1, 0.38, -0.37, 0.37, 1.15, 1.66, 0.05)
    collar = lathe('collar', [(0.25, -0.05), (0.3, 0.0), (0.25, 0.05)], har, 14, 1.0, (0, 0, 0))
    collar.rotation_euler = (0, math.radians(62), 0); collar.location = (0.74, 0, 1.44); collar.parent = pad
    pad.parent = arm
    export('horse.glb')


# =====================================================================  person
def person():
    reset()
    J = {
        'pelvis': (0, 0, 0.95, 0.125), 'waist': (0, 0, 1.12, 0.115), 'chest': (0, 0, 1.36, 0.145),
        'neck': (0, 0, 1.52, 0.055), 'head': (0.01, 0, 1.62, 0.1), 'crown': (0.0, 0, 1.69, 0.085),
    }
    B = [('pelvis', 'waist'), ('waist', 'chest'), ('chest', 'neck'), ('neck', 'head'), ('head', 'crown')]
    for side, s in (('L', 1), ('R', -1)):
        J['hip' + side] = (0, 0.09 * s, 0.9, 0.092); J['knee' + side] = (0.01, 0.1 * s, 0.5, 0.06)
        J['ankle' + side] = (0, 0.1 * s, 0.09, 0.042); J['toe' + side] = (0.14, 0.1 * s, 0.04, 0.04)
        J['sho' + side] = (0, 0.2 * s, 1.43, 0.062); J['elb' + side] = (0, 0.25 * s, 1.15, 0.043)
        J['wri' + side] = (0.03, 0.27 * s, 0.9, 0.033); J['hand' + side] = (0.04, 0.27 * s, 0.81, 0.04)
        B += [('pelvis', 'hip' + side), ('hip' + side, 'knee' + side), ('knee' + side, 'ankle' + side), ('ankle' + side, 'toe' + side),
              ('chest', 'sho' + side), ('sho' + side, 'elb' + side), ('elb' + side, 'wri' + side), ('wri' + side, 'hand' + side)]
    o, arm, n = grow('person', J, B, 'pelvis')
    for v in o.data.vertices:                                  # a torso is wider than it is deep
        if 0.9 < v.co.z < 1.5 and abs(v.co.y) < 0.2: v.co.x *= 0.78
    mats = {'skin': material('skin', (0.72, 0.52, 0.38), 0.7), 'shirt': material('shirt', (0.85, 0.85, 0.85)),
            'trousers': material('trousers', (0.16, 0.2, 0.3)), 'hair': material('hair', (0.08, 0.06, 0.05)),
            'shoes': material('shoes', (0.1, 0.09, 0.08))}

    def rule(c, nn):
        if c.z < 0.085: return 'shoes'
        if c.z < 0.98 and abs(c.y) < 0.2: return 'trousers'
        if c.z > 1.6 and (c.x < -0.02 or c.z > 1.685): return 'hair'
        if c.z > 1.49 and abs(c.y) < 0.15: return 'skin'
        if abs(c.y) > 0.215 and c.z < 1.22: return 'skin'        # forearms and hands
        return 'shirt'
    paint(o, mats, rule)

    def walk(u):
        p = {}
        for side, s0 in (('L', 0.0), ('R', 0.5)):
            ph = 2 * math.pi * (u + s0)
            lift = max(0.0, math.cos(ph))
            p[n[('hip' + side, 'knee' + side)]] = -0.42 * math.sin(ph)
            p[n[('knee' + side, 'ankle' + side)]] = 0.15 + 0.75 * lift
            p[n[('ankle' + side, 'toe' + side)]] = -0.2 * math.sin(ph)
            p[n[('sho' + side, 'elb' + side)]] = 0.34 * math.sin(ph)
            p[n[('elb' + side, 'wri' + side)]] = -0.25 - 0.15 * math.sin(ph)
        return p

    def idle(u):
        p = {n[('neck', 'head')]: 0.04 * math.sin(2 * math.pi * u), n[('waist', 'chest')]: 0.015 * math.sin(4 * math.pi * u)}
        for side in 'LR':
            p[n[('elb' + side, 'wri' + side)]] = -0.12 - 0.03 * math.sin(2 * math.pi * u)
        return p

    def sit(u):                                               # astride a saddle or on a carriage bench
        p = {n[('waist', 'chest')]: 0.02 * math.sin(4 * math.pi * u)}
        for side in 'LR':
            p[n[('hip' + side, 'knee' + side)]] = -1.25
            p[n[('knee' + side, 'ankle' + side)]] = 1.1
            p[n[('sho' + side, 'elb' + side)]] = -0.35
            p[n[('elb' + side, 'wri' + side)]] = -0.9 + 0.03 * math.sin(4 * math.pi * u)
        return p
    action(arm, 'walk', 24, walk)
    action(arm, 'idle', 96, idle)
    action(arm, 'sit', 48, sit)
    # optional dress: a galabiya (long robe) and a wound headscarf, as worn by cameleers and drivers
    robe = lathe('opt_robe', [(0.15, 0.3), (0.2, 0.34), (0.19, 0.9), (0.17, 1.15), (0.2, 1.38), (0.12, 1.5), (0.07, 1.53)],
                 material('robe', (0.9, 0.88, 0.82)), 14, 0.72)
    scarf = lathe('opt_scarf', [(0.085, 1.63), (0.125, 1.66), (0.13, 1.72), (0.09, 1.77), (0.0, 1.78)], material('scarf', (0.94, 0.93, 0.9)), 12, 1.0)
    hatm = material('hat', (0.85, 0.78, 0.6))
    hat = lathe('opt_hat', [(0.2, 1.7), (0.2, 1.715), (0.105, 1.72), (0.095, 1.79), (0.0, 1.8)], hatm, 14, 1.0)
    pack = box('opt_pack', material('pack', (0.2, 0.3, 0.25)), -0.22, -0.09, -0.13, 0.13, 1.08, 1.45, 0.03)
    for x in (robe, scarf, hat, pack): x.parent = arm
    export('person.glb')


if __name__ == '__main__':
    camel(); horse(); person()
