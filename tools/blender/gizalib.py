"""Shared helpers for the Blender (bpy) site builders in this folder.

Conventions: Blender X = east, Y = north, Z = up (exported Y-up, so the game
sees X east, Y up, Z south). Interiors are modelled as the *void* (union of
room volumes) turned inside out. Lighting is baked to vertex colours.
Empties: insc_<key> = inscription panel (local X = reading direction,
Y = up, scale = width/height in metres), poi_<key> = landmark, tp_<key> =
teleport/spawn point.
"""
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = {}
col = None
lights = []


def reset(materials):
    """Fresh scene; materials = {name: (r, g, b)} ('fixture' glows)."""
    global col
    bpy.ops.wm.read_factory_settings(use_empty=True)
    col = bpy.context.scene.collection
    M.clear(); lights.clear()
    for name, rgb in materials.items():
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*rgb, 1)
        b.inputs['Roughness'].default_value = 0.9
        if name == 'fixture':
            b.inputs['Emission Color'].default_value = (1.0, 0.9, 0.7, 1)
            b.inputs['Emission Strength'].default_value = 40.0
        M[name] = m


def obj(bm, name, material=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    if material: me.materials.append(M[material])
    return o


def box(bm, x0, x1, y0, y1, z0, z1):
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co.x = x0 + (v.co.x + 0.5) * (x1 - x0)
        v.co.y = y0 + (v.co.y + 0.5) * (y1 - y0)
        v.co.z = z0 + (v.co.z + 0.5) * (z1 - z0)
    return r['verts']


def box_obj(name, material, x0, x1, y0, y1, z0, z1):
    bm = bmesh.new(); box(bm, x0, x1, y0, y1, z0, z1)
    return obj(bm, name, material)


def prism(bm, profile, y0, y1, dz0=0.0, dz1=0.0):
    """Extrude an (x, z) polygon from y0 to y1, shifting z by dz0/dz1 at the
    two ends (a sheared prism: sloping passages with vertical end faces)."""
    a = [bm.verts.new((x, y0, z + dz0)) for x, z in profile]
    b = [bm.verts.new((x, y1, z + dz1)) for x, z in profile]
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(a[::-1]); bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)


def union(objs, name):
    base = objs[0]
    for v in objs[1:]:
        mod = base.modifiers.new('u', 'BOOLEAN'); mod.operation = 'UNION'; mod.object = v; mod.solver = 'EXACT'
        bpy.context.view_layer.objects.active = base
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(v, do_unlink=True)
    base.name = name
    return base


def void_to_room(o, cell=0.7, drop=None):
    """Turn a void solid inside out, slice it into a grid (so baked vertex
    light has resolution) and optionally drop faces (drop(center) -> bool)."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    lo = Vector((min(v.co.x for v in bm.verts), min(v.co.y for v in bm.verts), min(v.co.z for v in bm.verts)))
    hi = Vector((max(v.co.x for v in bm.verts), max(v.co.y for v in bm.verts), max(v.co.z for v in bm.verts)))
    for axis in range(3):
        n = Vector((0, 0, 0)); n[axis] = 1
        k = math.floor(lo[axis] / cell) * cell + cell
        while k < hi[axis]:
            co = Vector((0, 0, 0)); co[axis] = k
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=n, dist=1e-4)
            k += cell
    if drop:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if drop(f.calc_center_median())], context='FACES')
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.normal_update()
    bm.to_mesh(o.data); bm.free()
    return o


def empty(name, loc, right=(1, 0, 0), up=(0, 0, 1), w=1.0, h=1.0):
    right, up = Vector(right).normalized(), Vector(up).normalized()
    e = bpy.data.objects.new(name, None)
    m = Matrix((right, up, right.cross(up))).transposed().to_4x4()
    e.matrix_world = Matrix.Translation(Vector(loc)) @ m @ Matrix.Diagonal((w, h, 1, 1))
    col.objects.link(e)
    return e


def light(loc, energy=200, color=(1.0, 0.9, 0.75), fixture=True, size=0.12):
    """A lamp: a point light for the bake, plus (optionally) a small glowing fitting."""
    ld = bpy.data.lights.new('l', 'POINT'); ld.energy = energy; ld.color = color; ld.shadow_soft_size = 0.25
    lo = bpy.data.objects.new('bake_light', ld); lo.location = loc; col.objects.link(lo)
    if fixture:
        x, y, z = loc
        lights.append(box_obj('fixture', 'fixture', x - size, x + size, y - size, y + size, z - size * 0.6, z + size * 0.6))


def join(objs, name):
    objs = [o for o in objs if o is not None]
    if not objs: return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def bake_and_export(final, out_name, samples=48):
    """Bake diffuse light into vertex colours of `final` objects, export everything as GLB."""
    scene = bpy.context.scene
    if lights: join(list(lights), 'fixtures')
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
    scene.cycles.samples = int(os.environ.get('BAKE_SAMPLES', samples)); scene.cycles.max_bounces = 3
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
    if os.environ.get('NO_BAKE') != '1':
        scene.render.bake.target = 'VERTEX_COLORS'
        for o in final:
            if o is None: continue
            if not o.data.color_attributes: o.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')
    for o in list(bpy.data.objects):
        if o.type == 'LIGHT': bpy.data.objects.remove(o, do_unlink=True)
    out = os.path.join(ROOT, 'assets', 'models', out_name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True,
                              export_normals=True, export_texcoords=False, export_materials='EXPORT',
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_cameras=False, export_lights=False)
    tris = sum(len(o.data.polygons) for o in final if o is not None)
    print('wrote', out, '%.2f MB' % (os.path.getsize(out) / 1e6), 'faces', tris, file=sys.stderr)
