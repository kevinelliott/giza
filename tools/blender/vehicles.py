#!/usr/bin/env python3
"""Road vehicles seen around Giza, as light models the game recolours.

    python3 tools/blender/vehicles.py     -> assets/models/vehicles.glb

One mesh per vehicle, facing +X, wheels on Z = 0, real sizes:
  car       saloon, 4.4 x 1.72 x 1.45 m
  taxi      the same saloon as a Cairo taxi: white with black chequer band and roof sign
  microbus  14-seat van (the ubiquitous white microbus), 4.9 x 1.75 x 2.0 m
  tuktuk    three-wheeled auto-rickshaw, 2.65 x 1.3 x 1.75 m
  pickup    light truck, 5.0 x 1.75 x 1.75 m
  bus       city bus, 11.8 x 2.5 x 3.1 m
  coach     tour coach, 12.2 x 2.55 x 3.6 m
  shuttle   the plateau's electric visitor shuttle, 7.6 x 2.3 x 2.9 m
Material slots: "paint" (recoloured per vehicle), "paint2" (second colour),
"glass", "tyre", "trim", "lamp_f", "lamp_r".
"""
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.context.scene.collection
MATS = {}
for name, rgb, rough, metal in (('paint', (0.8, 0.8, 0.8), 0.35, 0.3), ('paint2', (0.1, 0.1, 0.1), 0.4, 0.2), ('glass', (0.05, 0.07, 0.09), 0.08, 0.6),
                                ('tyre', (0.03, 0.03, 0.03), 0.9, 0.0), ('trim', (0.12, 0.12, 0.13), 0.6, 0.2),
                                ('lamp_f', (1.0, 0.97, 0.85), 0.2, 0.0), ('lamp_r', (0.75, 0.05, 0.04), 0.3, 0.0)):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    MATS[name] = m
ORDER = list(MATS)


class Build:
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.layer = None
        self.mat = {}

    def _tag(self, faces, mat):
        for f in faces: f.material_index = ORDER.index(mat)

    def prism(self, profile, y0, y1, mat, bevel=0.0, taper=0.0):
        """Side profile [(x, z)] extruded from y0 to y1; taper narrows the top edge (tumblehome)."""
        zmax = max(z for _, z in profile); zmin = min(z for _, z in profile)
        def yy(y, z):
            k = (z - zmin) / max(1e-6, zmax - zmin)
            return y * (1.0 - taper * k)
        bm = bmesh.new()
        a = [bm.verts.new((x, yy(y0, z), z)) for x, z in profile]
        b = [bm.verts.new((x, yy(y1, z), z)) for x, z in profile]
        n = len(profile)
        for i in range(n):
            j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
        bm.faces.new(a[::-1]); bm.faces.new(b)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES', clamp_overlap=True)
        self._merge(bm, mat)

    def box(self, x0, x1, y0, y1, z0, z1, mat, bevel=0.0):
        self.prism([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], y0, y1, mat, bevel)

    def wheel(self, x, y, r, w=0.2):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=r, radius2=r, depth=w)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
        bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, r))
        self._merge(bm, 'tyre')
        bm = bmesh.new()                                        # hub
        bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=r * 0.55, radius2=r * 0.55, depth=w + 0.02)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
        bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, r))
        self._merge(bm, 'trim')

    def _merge(self, bm, mat):
        me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free()
        n0 = len(self.bm.faces)
        self.bm.from_mesh(me); bpy.data.meshes.remove(me)
        self.bm.faces.ensure_lookup_table()
        self._tag(self.bm.faces[n0:], mat)

    def done(self):
        me = bpy.data.meshes.new(self.name)
        for f in self.bm.faces: f.smooth = False
        self.bm.to_mesh(me); self.bm.free()
        for m in ORDER: me.materials.append(MATS[m])
        o = bpy.data.objects.new(self.name, me); COL.objects.link(o)
        mod = o.modifiers.new('e', 'EDGE_SPLIT'); mod.split_angle = math.radians(40)
        return o


def saloon(name, taxi=False):
    b = Build(name); hw = 0.86
    # body shell, then the glasshouse with tumblehome, roof and pillars
    b.prism([(-2.2, 0.32), (2.15, 0.32), (2.2, 0.5), (2.18, 0.72), (1.25, 0.9), (-1.75, 0.92), (-2.2, 0.85)], -hw, hw, 'paint', 0.05)
    b.prism([(1.2, 0.88), (0.55, 1.4), (-1.0, 1.4), (-1.7, 0.9)], -hw + 0.04, hw - 0.04, 'glass', 0.02, taper=0.12)
    b.prism([(0.58, 1.38), (0.5, 1.45), (-0.95, 1.45), (-1.03, 1.38)], -hw * 0.86, hw * 0.86, 'paint', 0.02)
    for x0, x1 in ((0.3, 0.38), (-0.42, -0.34)):               # door pillars
        b.prism([(x0, 0.9), (x1, 0.9), (x1, 1.4), (x0, 1.4)], -hw + 0.03, hw - 0.03, 'paint', taper=0.12)
    b.box(2.12, 2.24, -hw + 0.05, hw - 0.05, 0.28, 0.46, 'trim', 0.03); b.box(-2.26, -2.14, -hw + 0.05, hw - 0.05, 0.3, 0.48, 'trim', 0.03)
    for s in (-1, 1):
        b.box(2.14, 2.21, s * 0.5, s * 0.8, 0.58, 0.7, 'lamp_f'); b.box(-2.22, -2.16, s * 0.5, s * 0.8, 0.66, 0.8, 'lamp_r')
        for x in (1.38, -1.3): b.wheel(x, s * (hw - 0.09), 0.31)
    if taxi:
        b.box(-0.35, 0.05, -0.28, 0.28, 1.45, 1.57, 'lamp_f', 0.02)          # roof sign
        for s in (-1, 1):                                                   # the black chequer band along each flank
            for k in range(14):
                x = -1.9 + k * 0.27
                b.box(x, x + 0.135, s * (hw + 0.004), s * (hw + 0.008), 0.62 + (0.07 if k % 2 else 0.0), 0.69 + (0.07 if k % 2 else 0.0), 'paint2')
    return b.done()


def microbus():
    b = Build('microbus'); hw = 0.87
    b.prism([(-2.45, 0.35), (2.35, 0.35), (2.45, 0.6), (2.42, 1.0), (2.05, 1.9), (1.9, 1.98), (-2.38, 1.98), (-2.45, 1.85)], -hw, hw, 'paint', 0.06)
    b.prism([(2.3, 1.08), (2.02, 1.78), (1.4, 1.78), (1.4, 1.08)], -hw - 0.006, hw + 0.006, 'glass')        # cab side glass + screen
    b.box(2.0, 2.42, -hw + 0.1, hw - 0.1, 1.08, 1.8, 'glass')
    for x0, x1 in ((0.35, 1.3), (-0.75, 0.25), (-1.85, -0.85)):
        b.box(x0, x1, -hw - 0.006, hw + 0.006, 1.15, 1.75, 'glass')
    b.box(-2.47, -2.4, -hw + 0.2, hw - 0.2, 1.2, 1.75, 'glass')
    b.box(2.38, 2.5, -hw + 0.05, hw - 0.05, 0.3, 0.5, 'trim', 0.03); b.box(-2.5, -2.4, -hw + 0.05, hw - 0.05, 0.3, 0.5, 'trim', 0.03)
    for s in (-1, 1):
        b.box(2.4, 2.47, s * 0.5, s * 0.8, 0.68, 0.84, 'lamp_f'); b.box(-2.47, -2.42, s * 0.62, s * 0.82, 0.7, 1.1, 'lamp_r')
        for x in (1.55, -1.35): b.wheel(x, s * (hw - 0.1), 0.33)
    return b.done()


def tuktuk():
    b = Build('tuktuk'); hw = 0.62
    b.prism([(-1.2, 0.3), (0.55, 0.3), (0.95, 0.42), (1.2, 0.6), (1.15, 0.95), (0.6, 1.0), (-1.2, 1.0)], -hw, hw, 'paint', 0.04)
    b.prism([(1.1, 0.98), (0.75, 1.62), (0.7, 1.62), (1.02, 0.98)], -hw * 0.8, hw * 0.8, 'glass')               # windscreen
    b.prism([(0.8, 1.6), (0.55, 1.75), (-1.15, 1.72), (-1.25, 1.55), (-1.25, 1.5), (0.8, 1.52)], -hw - 0.02, hw + 0.02, 'paint2', 0.03)   # canvas hood
    for x in (0.72, -1.18):
        for s in (-1, 1): b.box(x - 0.025, x + 0.025, s * hw - 0.025, s * hw + 0.025, 1.0, 1.55, 'trim')
    b.box(-0.9, -0.2, -hw + 0.08, hw - 0.08, 1.0, 1.08, 'trim'); b.box(-1.15, -0.95, -hw + 0.08, hw - 0.08, 1.0, 1.45, 'trim')    # bench
    b.box(1.16, 1.22, -0.1, 0.1, 0.72, 0.88, 'lamp_f')
    b.wheel(0.95, 0.0, 0.2, 0.12)
    for s in (-1, 1):
        b.wheel(-0.8, s * (hw - 0.02), 0.2, 0.12); b.box(-1.22, -1.18, s * 0.35, s * 0.5, 0.6, 0.72, 'lamp_r')
    return b.done()


def pickup():
    b = Build('pickup'); hw = 0.87
    b.prism([(-2.5, 0.42), (2.4, 0.42), (2.5, 0.62), (2.46, 0.95), (1.3, 1.05), (-2.5, 1.05)], -hw, hw, 'paint', 0.05)
    b.prism([(1.25, 1.02), (0.85, 1.68), (-0.3, 1.68), (-0.4, 1.02)], -hw + 0.04, hw - 0.04, 'glass', 0.02, taper=0.08)
    b.prism([(0.88, 1.66), (0.8, 1.74), (-0.28, 1.74), (-0.36, 1.66)], -hw * 0.9, hw * 0.9, 'paint', 0.02)
    b.box(-2.42, -0.5, -hw + 0.07, hw - 0.07, 0.75, 1.07, 'trim')                 # the open load bed
    b.box(2.4, 2.56, -hw + 0.05, hw - 0.05, 0.38, 0.58, 'trim', 0.03)
    for s in (-1, 1):
        b.box(2.42, 2.5, s * 0.5, s * 0.8, 0.72, 0.88, 'lamp_f'); b.box(-2.52, -2.47, s * 0.62, s * 0.8, 0.7, 0.95, 'lamp_r')
        for x in (1.55, -1.5): b.wheel(x, s * (hw - 0.1), 0.36, 0.24)
    return b.done()


def bus(name, L, W, H, floor=0.38, band=None, doors=2):
    b = Build(name); hw = W / 2; x0, x1 = -L / 2, L / 2
    b.prism([(x0, floor), (x1 - 0.1, floor), (x1, floor + 0.3), (x1, H - 0.25), (x1 - 0.25, H), (x0 + 0.15, H), (x0, H - 0.15)], -hw, hw, 'paint', 0.08)
    wz0, wz1 = floor + 0.95, H - 0.5
    n = int((L - 2.4) / 1.45)
    for i in range(n):                                                           # side windows
        xa = x0 + 1.0 + i * (L - 2.4) / n
        b.box(xa + 0.06, xa + (L - 2.4) / n - 0.06, -hw - 0.008, hw + 0.008, wz0, wz1, 'glass')
    b.box(x1 - 0.05, x1 + 0.012, -hw + 0.12, hw - 0.12, wz0 - 0.25, H - 0.4, 'glass')          # windscreen
    b.box(x0 - 0.012, x0 + 0.05, -hw + 0.3, hw - 0.3, wz0 + 0.1, wz1, 'glass')
    if band:                                                                    # a coloured waistband
        b.box(x0 + 0.05, x1 - 0.05, -hw - 0.006, hw + 0.006, floor + 0.45, floor + 0.85, 'paint2')
    for k in range(doors):                                                      # doors on the right-hand (kerb) side: Egypt drives on the right
        xd = x1 - 1.9 - k * (L * 0.42)
        b.box(xd, xd + 1.0, -hw - 0.012, -hw + 0.02, floor + 0.05, H - 0.55, 'glass')
        b.box(xd + 0.48, xd + 0.52, -hw - 0.016, -hw + 0.02, floor + 0.05, H - 0.55, 'trim')
    b.box(x1 - 0.02, x1 + 0.1, -hw + 0.05, hw - 0.05, floor - 0.05, floor + 0.22, 'trim', 0.03); b.box(x0 - 0.1, x0 + 0.02, -hw + 0.05, hw - 0.05, floor - 0.05, floor + 0.22, 'trim', 0.03)
    for s in (-1, 1):
        b.box(x1 - 0.02, x1 + 0.03, s * (hw - 0.55), s * (hw - 0.2), floor + 0.35, floor + 0.52, 'lamp_f')
        b.box(x0 - 0.03, x0 + 0.02, s * (hw - 0.45), s * (hw - 0.2), floor + 0.4, floor + 0.85, 'lamp_r')
        for x in ((x1 - 2.4, x0 + 2.6) if L < 9 else (x1 - 2.7, x0 + 3.3, x0 + 2.2) if H > 3.3 else (x1 - 2.7, x0 + 3.0)):
            b.wheel(x, s * (hw - 0.16), 0.5 if L > 9 else 0.4, 0.3)
    return b.done()


saloon('car'); saloon('taxi', True); microbus(); tuktuk(); pickup()
bus('bus', 11.8, 2.5, 3.1, band=True, doors=2)
bus('coach', 12.2, 2.55, 3.6, floor=0.42, band=True, doors=1)
bus('shuttle', 7.6, 2.3, 2.9, floor=0.36, band=True, doors=1)
for i, o in enumerate(o for o in COL.objects):
    o.location.y = i * 5.0                                    # spread out (the game reads the meshes, not the placement)
out = os.path.join(ROOT, 'assets', 'models', 'vehicles.glb')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_normals=True,
                          export_texcoords=False, export_materials='EXPORT', export_cameras=False, export_lights=False)
print('wrote', out, '%.0f kB' % (os.path.getsize(out) / 1e3), {o.name: len(o.data.polygons) for o in COL.objects}, file=sys.stderr)
