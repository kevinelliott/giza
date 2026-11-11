#!/usr/bin/env python3
"""Boats of the Nile, old and modern.

    python3 tools/blender/boats.py     -> assets/models/boats.glb

One mesh per boat, bow towards +X, waterline at Z = 0. Sizes and forms follow
research/sites/nile-and-boats.md:
  felucca   open lateen-rigged passenger boat
  dahabiya  two-masted lateen houseboat
  cruiser   the standard Luxor-Aswan "floating hotel"
  ferry     the Luxor national (baladi) ferry
  launch    covered motor launch that crosses to the West Bank
  khufu     the Khufu ship (the "solar boat"), as reassembled
  skiff     a papyrus skiff
Materials are plain colours named c_RRGGBB (the game makes a material per name).
"""
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.context.scene.collection
MATS = {}


def mat(hexcol):
    name = 'c_' + hexcol
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        r, g, b = (int(hexcol[i:i + 2], 16) / 255 for i in (0, 2, 4))
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (r ** 2.2, g ** 2.2, b ** 2.2, 1); bs.inputs['Roughness'].default_value = 0.7
        MATS[name] = m
    return name


class Boat:
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.slots = []

    def _idx(self, hexcol):
        n = mat(hexcol)
        if n not in self.slots: self.slots.append(n)
        return self.slots.index(n)

    def _take(self, bm, hexcol):
        me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free()
        n0 = len(self.bm.faces); self.bm.from_mesh(me); bpy.data.meshes.remove(me)
        self.bm.faces.ensure_lookup_table()
        k = self._idx(hexcol)
        for f in self.bm.faces[n0:]: f.material_index = k

    def hull(self, L, B, depth, free, hexcol, deck=None, bow=0.5, stern=0.35, sheer=0.0, flat=0.0, n=22, band=None, band_h=0.25):
        """A displacement hull: length L, beam B, draught `depth`, freeboard `free` amidships.
        bow / stern: how long the taper is (fraction of L). sheer: how much the ends rise. flat: 0 round bilge .. 1 box."""
        bm = bmesh.new(); rings = []; M = 9
        for i in range(n + 1):
            t = i / n; x = -L / 2 + L * t
            wb = 1.0
            if t > 1 - bow: wb = max(0.0, math.cos((t - (1 - bow)) / bow * math.pi / 2)) ** 0.75
            if t < stern: wb = min(wb, 0.45 + 0.55 * max(0.0, math.sin(t / stern * math.pi / 2)) ** 0.8)
            hb = B / 2 * max(wb, 0.02)
            top = free + sheer * (2 * t - 1) ** 2
            keel = -depth * (0.35 + 0.65 * min(1.0, wb * 1.2))
            ring = []
            for k in range(M + 1):
                a = math.pi * k / M                      # port gunwale -> keel -> starboard gunwale
                c, s = math.cos(a), math.sin(a)
                p = 2.0 + flat * 6.0                      # superellipse: boxier for barges
                y = -hb * (abs(c) ** (2 / p)) * (1 if c > 0 else -1)
                z = top + (keel - top) * (abs(s) ** (2 / p))
                ring.append(bm.verts.new((x, y, z)))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for k in range(M): bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
        bm.faces.new(rings[0]); bm.faces.new(rings[-1][::-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces: f.smooth = True
        rings = [[v.co.copy() for v in ring] for ring in rings]        # (the vertices die with the temporary mesh)
        self._take(bm, hexcol)
        if deck:                                           # deck: a lid a little below the gunwale
            bm = bmesh.new()
            port = [bm.verts.new((r[0].x, r[0].y * 0.97, r[0].z - 0.12)) for r in rings]
            star = [bm.verts.new((r[-1].x, r[-1].y * 0.97, r[-1].z - 0.12)) for r in rings]
            for i in range(n): bm.faces.new((port[i], star[i], star[i + 1], port[i + 1]))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            self._take(bm, deck)
        if band:                                           # a painted strake under the gunwale
            bm = bmesh.new()
            for side in (0, -1):
                a = [bm.verts.new((r[side].x, r[side].y * 1.012, r[side].z)) for r in rings]
                b = [bm.verts.new((r[side].x, r[side].y * 1.0, r[side].z - band_h)) for r in rings]
                for i in range(n): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
            self._take(bm, band)
        return rings

    def box(self, x0, x1, y0, y1, z0, z1, hexcol, bevel=0.0):
        bm = bmesh.new(); r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
        if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES')
        self._take(bm, hexcol)

    def spar(self, a, b, r0, r1, hexcol, seg=7):
        a, b = Vector(a), Vector(b); d = b - a
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=d.length)
        bmesh.ops.transform(bm, verts=bm.verts, matrix=Matrix.Translation((a + b) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4())
        for f in bm.faces: f.smooth = True
        self._take(bm, hexcol)

    def sheet(self, pts, hexcol, belly=0.0, n=6):
        """A sail or awning through 3 or 4 corner points, bulged by `belly` along its normal."""
        P = [Vector(p) for p in pts]
        if len(P) == 3: P = [P[0], P[1], P[2], P[2]]
        nrm = (P[1] - P[0]).cross(P[3] - P[0]); nrm = nrm.normalized() if nrm.length else Vector((0, 1, 0))
        bm = bmesh.new(); g = []
        for i in range(n + 1):
            row = []
            for j in range(n + 1):
                u, v = i / n, j / n
                p = (P[0] * (1 - u) + P[1] * u) * (1 - v) + (P[3] * (1 - u) + P[2] * u) * v
                row.append(bm.verts.new(p + nrm * belly * math.sin(math.pi * u) * math.sin(math.pi * min(1.0, v * 1.15))))
            g.append(row)
        for i in range(n):
            for j in range(n):
                q = (g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1])
                if len({tuple(round(c, 4) for c in v.co) for v in q}) == 4: bm.faces.new(q)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        for f in bm.faces: f.smooth = True
        self._take(bm, hexcol)

    def windows(self, x0, x1, y, z0, z1, n, hexcol='1b2a38', gap=0.35):
        w = (x1 - x0) / n
        for i in range(n):
            for s in (-1, 1):
                self.box(x0 + i * w + gap / 2, x0 + (i + 1) * w - gap / 2, s * y - 0.02, s * y + 0.02, z0, z1, hexcol)

    def rail(self, x0, x1, y, z, h, hexcol, posts=8):
        for s in (-1, 1):
            self.box(x0, x1, s * y - 0.02, s * y + 0.02, z + h - 0.04, z + h, hexcol)
            for i in range(posts + 1):
                x = x0 + (x1 - x0) * i / posts
                self.box(x - 0.02, x + 0.02, s * y - 0.02, s * y + 0.02, z, z + h, hexcol)

    def done(self):
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for n in self.slots: me.materials.append(MATS[n])
        o = bpy.data.objects.new(self.name, me); COL.objects.link(o)
        mod = o.modifiers.new('e', 'EDGE_SPLIT'); mod.split_angle = math.radians(45)
        return o


WHITE, CANVAS, WOOD, DARKWOOD, GLASS, STEEL = 'f2f0ea', 'ece4d0', '8a5a32', '5a3a22', '1b2a38', '9aa0a4'


def felucca(P):
    b = Boat('felucca'); L, B = P['L'], P['B']
    b.hull(L, B, 0.55, 0.75, WHITE, deck='b89468', bow=0.55, stern=0.3, sheer=0.35, band=P['trim'], band_h=0.16)
    for x in (-L * 0.28, -L * 0.05, L * 0.16):                               # thwarts / cushioned benches along the sides
        b.box(x - 0.2, x + 0.2, -B * 0.4, B * 0.4, 0.5, 0.58, WOOD)
    for s in (-1, 1): b.box(-L * 0.36, L * 0.2, s * B * 0.36 - 0.22, s * B * 0.36 + 0.22, 0.5, 0.62, P['cushion'])
    mx = L * 0.22; mh = P['mast']
    b.spar((mx, 0, 0.3), (mx + 0.25, 0, mh), 0.11, 0.07, WOOD)
    # the lateen yard: very long, slung from the masthead, its foot tacked down at the bow
    y0 = Vector((L * 0.5 - 0.3, 0.15, 1.0)); y1 = Vector((mx - P['yard'] * 0.62, 0.15, mh + P['yard'] * 0.52))
    yard_dir = (y1 - y0).normalized(); y1 = y0 + yard_dir * P['yard']
    b.spar(y0, y1, 0.07, 0.035, WOOD)
    clew = Vector((-L * 0.42, 0.6, 1.5))
    b.sheet([y0, y1, clew], CANVAS, belly=0.55)
    b.spar((mx, 0, 2.0), clew + Vector((0.3, 0, 0)), 0.045, 0.04, WOOD)        # boom
    # awning on four posts over the passengers, and the rudder
    for x in (-L * 0.36, L * 0.05):
        for s in (-1, 1): b.spar((x, s * B * 0.4, 0.6), (x, s * B * 0.4, 2.15), 0.03, 0.03, WHITE)
    b.sheet([(-L * 0.38, -B * 0.45, 2.15), (L * 0.07, -B * 0.45, 2.15), (L * 0.07, B * 0.45, 2.15), (-L * 0.38, B * 0.45, 2.15)], P['awning'], belly=0.12)
    b.box(-L * 0.5 - 0.5, -L * 0.5 + 0.05, -0.03, 0.03, -0.55, 0.7, WOOD); b.spar((-L * 0.5 - 0.1, 0, 0.75), (-L * 0.5 + 1.3, 0, 1.0), 0.035, 0.03, WOOD)
    return b.done()


def dahabiya(P):
    b = Boat('dahabiya'); L, B = P['L'], P['B']
    b.hull(L, B, 0.9, 1.3, WHITE, deck='a8845c', bow=0.3, stern=0.22, sheer=0.3, flat=0.25, band='1f3f6a', band_h=0.22)
    c0, c1 = -L * 0.42, L * 0.18                                               # the cabin block aft, open foredeck forward
    b.box(c0, c1, -B * 0.43, B * 0.43, 1.2, 3.5, WHITE, 0.05)
    b.windows(c0 + 0.6, c1 - 0.6, B * 0.43, 2.0, 2.95, P['cabins'], gap=1.1)
    for i in range(P['cabins']):                                               # louvred shutters, painted
        w = (c1 - c0 - 1.2) / P['cabins']; x = c0 + 0.6 + i * w
        for s in (-1, 1):
            b.box(x + 0.25, x + 0.5, s * B * 0.43 - 0.03, s * B * 0.43 + 0.03, 2.0, 2.95, '2f6a4a'); b.box(x + w - 0.5, x + w - 0.25, s * B * 0.43 - 0.03, s * B * 0.43 + 0.03, 2.0, 2.95, '2f6a4a')
    b.box(c0 - 0.2, c1 + 0.2, -B * 0.46, B * 0.46, 3.5, 3.62, 'a8845c')       # the sun deck
    b.rail(c0, c1, B * 0.45, 3.62, 1.0, WHITE, posts=14)
    for x in (c0 + 1.0, (c0 + c1) / 2, c1 - 1.0):
        for s in (-1, 1): b.spar((x, s * B * 0.42, 3.62), (x, s * B * 0.42, 5.9), 0.035, 0.035, WHITE)
    b.sheet([(c0 + 0.6, -B * 0.46, 5.9), (c1 - 0.6, -B * 0.46, 5.9), (c1 - 0.6, B * 0.46, 5.9), (c0 + 0.6, B * 0.46, 5.9)], CANVAS, belly=0.2)
    # the great lateen forward, the small one right aft
    for mx, mh, yl, tack, clew in ((L * 0.3, P['mast'], P['yard'], L * 0.5 - 0.4, c1 + 1.0), (-L * 0.46, P['mast'] * 0.5, P['yard'] * 0.42, -L * 0.36, -L * 0.5 - 0.6)):
        b.spar((mx, 0, 1.2), (mx, 0, 1.2 + mh), 0.16, 0.1, WOOD)
        y0 = Vector((tack, 0.2, 2.0 if mx > 0 else 4.2)); d = Vector((mx - yl * 0.7 - tack, 0, 1.2 + mh + yl * 0.45 - y0.z)).normalized(); y1 = y0 + d * yl
        b.spar(y0, y1, 0.09, 0.04, WOOD)
        b.sheet([y0, y1, Vector((clew, 0.8, 4.4 if mx > 0 else 4.6))], CANVAS, belly=0.9 if mx > 0 else 0.4)
    b.spar((-L * 0.5 + 0.3, 0, 1.0), (-L * 0.5 + 0.3, 0, 6.3), 0.03, 0.02, WOOD)   # ensign staff
    b.box(-L * 0.5 + 0.32, -L * 0.5 + 1.5, -0.01, 0.01, 5.5, 6.25, 'c8102e'); b.box(-L * 0.5 + 0.32, -L * 0.5 + 1.5, -0.012, 0.012, 5.75, 6.0, 'ffffff'); b.box(-L * 0.5 + 0.32, -L * 0.5 + 1.5, -0.011, 0.011, 5.5, 5.75, '111111')
    return b.done()


def cruiser(P):
    b = Boat('cruiser'); L, B = P['L'], P['B']; dh = P['deck_h']
    b.hull(L, B, 1.5, 1.6, WHITE, bow=0.14, stern=0.06, flat=0.85, band='1c3d6e', band_h=0.5, n=26)
    z = 1.6
    x0, x1 = -L * 0.47, L * 0.40
    for d in range(P['decks']):
        inset = 0.25 if d else 0.0
        b.box(x0, x1 - d * 1.2, -B / 2 + inset, B / 2 - inset, z, z + dh, WHITE, 0.03)
        n = int((x1 - x0 - d * 1.2 - 2) / 3.6)
        b.windows(x0 + 1.0, x1 - d * 1.2 - 1.0, B / 2 - inset, z + 0.85, z + 2.25, n, gap=1.0)
        b.box(x0 - 0.3, x1 - d * 1.2 + 0.6, -B / 2 - 0.15, B / 2 + 0.15, z + dh - 0.1, z + dh + 0.02, 'd8d6d0')    # deck edge / promenade
        z += dh
    # sun deck: rails, awnings fore and aft, the pool, loungers, the wheelhouse forward, twin funnels aft
    b.rail(x0, x1 - P['decks'] * 1.2, B / 2 + 0.1, z, 1.05, WHITE, posts=26)
    b.box(L * 0.2, L * 0.3, -B * 0.3, B * 0.3, z, z + 2.5, WHITE, 0.05); b.windows(L * 0.2, L * 0.3, B * 0.3, z + 1.2, z + 2.1, 3, gap=0.3)
    b.box(L * 0.3 - 0.02, L * 0.3 + 0.03, -B * 0.27, B * 0.27, z + 1.2, z + 2.1, GLASS)
    for xa, xb in ((-L * 0.4, -L * 0.2), (-L * 0.02, L * 0.14)):
        for x in (xa, xb):
            for s in (-1, 1): b.spar((x, s * B * 0.42, z), (x, s * B * 0.42, z + 2.5), 0.04, 0.04, WHITE)
        b.sheet([(xa, -B * 0.45, z + 2.5), (xb, -B * 0.45, z + 2.5), (xb, B * 0.45, z + 2.5), (xa, B * 0.45, z + 2.5)], P['awning'], belly=0.15)
    b.box(-L * 0.17, -L * 0.06, -B * 0.22, B * 0.22, z, z + 0.25, 'e8e4da'); b.box(-L * 0.165, -L * 0.065, -B * 0.2, B * 0.2, z + 0.2, z + 0.27, '3aa7c9')
    for i in range(6):
        for s in (-1, 1): b.box(-L * 0.36 + i * 1.7, -L * 0.36 + i * 1.7 + 1.9 * 0.35, s * B * 0.3 - 0.9, s * B * 0.3 + 0.9, z + 0.05, z + 0.32, 'f4f1e8')
    for s in (-1, 1): b.box(-L * 0.455, -L * 0.43, s * B * 0.25 - 0.5, s * B * 0.25 + 0.5, z, z + 2.2, '1c3d6e', 0.08)
    b.box(x0 + 0.5, x0 + 0.56, -3.5, 3.5, 1.6 + dh * 1.3, 1.6 + dh * 1.3 + 0.7, '1c3d6e')                         # the name board across the stern
    return b.done()


def ferry(P):
    b = Boat('ferry'); L, B = P['L'], P['B']
    b.hull(L, B, 0.9, 1.1, '2a5d9f', bow=0.22, stern=0.12, flat=0.6, band=WHITE, band_h=0.25)
    b.box(-L * 0.44, L * 0.36, -B * 0.47, B * 0.47, 1.05, 1.15, '8a8f94')                                         # main deck
    for x in [(-L * 0.42 + i * (L * 0.76) / 7) for i in range(8)]:
        for s in (-1, 1): b.spar((x, s * B * 0.45, 1.15), (x, s * B * 0.45, 3.4), 0.05, 0.05, WHITE)
    b.rail(-L * 0.42, L * 0.34, B * 0.46, 1.15, 0.95, WHITE, posts=14)
    b.box(-L * 0.44, L * 0.36, -B * 0.49, B * 0.49, 3.4, 3.52, WHITE)                                             # upper deck
    b.rail(-L * 0.42, L * 0.2, B * 0.47, 3.52, 0.95, '2a5d9f', posts=12)
    for i in range(5):                                                                                             # bench rows on both decks
        for zz in (1.15, 3.52):
            b.box(-L * 0.36 + i * 3.0, -L * 0.36 + i * 3.0 + 0.45, -B * 0.3, B * 0.3, zz + 0.38, zz + 0.46, '2f7a4a')
    b.box(L * 0.2, L * 0.34, -B * 0.25, B * 0.25, 3.52, 5.7, WHITE, 0.05); b.windows(L * 0.2, L * 0.34, B * 0.25, 4.5, 5.3, 2, gap=0.3)
    b.box(L * 0.34 - 0.02, L * 0.34 + 0.03, -B * 0.22, B * 0.22, 4.5, 5.3, GLASS)
    for x in (-L * 0.4, L * 0.18):
        for s in (-1, 1): b.spar((x, s * B * 0.44, 3.52), (x, s * B * 0.44, 5.6), 0.04, 0.04, WHITE)
    b.sheet([(-L * 0.42, -B * 0.47, 5.6), (L * 0.19, -B * 0.47, 5.6), (L * 0.19, B * 0.47, 5.6), (-L * 0.42, B * 0.47, 5.6)], 'e8e4d8', belly=0.1)
    b.box(-L * 0.2, -L * 0.15, -0.4, 0.4, 5.6, 6.9, '222426', 0.05)
    return b.done()


def launch(P):
    b = Boat('launch'); L, B = P['L'], P['B']
    b.hull(L, B, 0.4, 0.7, P['hull'], deck='b89468', bow=0.45, stern=0.18, sheer=0.25, band=P['trim'], band_h=0.14)
    for s in (-1, 1): b.box(-L * 0.36, L * 0.18, s * B * 0.36 - 0.2, s * B * 0.36 + 0.2, 0.42, 0.55, P['cushion'])
    for x in (-L * 0.4, -L * 0.12, L * 0.2):
        for s in (-1, 1): b.spar((x, s * B * 0.42, 0.6), (x, s * B * 0.42, 2.25), 0.03, 0.03, WHITE)
    b.box(-L * 0.43, L * 0.24, -B * 0.5, B * 0.5, 2.25, 2.33, P['roof'], 0.03)
    for s in (-1, 1): b.box(-L * 0.43, L * 0.24, s * B * 0.5 - 0.015, s * B * 0.5 + 0.015, 1.95, 2.25, P['trim'])   # scalloped valance
    b.box(-L * 0.47, -L * 0.4, -0.2, 0.2, 0.3, 1.0, '2a2a2c')                                                     # outboard motor
    b.spar((L * 0.26, 0, 0.7), (L * 0.26, 0, 2.9), 0.02, 0.015, WOOD); b.box(L * 0.26 - 0.7, L * 0.26, -0.008, 0.008, 2.45, 2.9, 'c8102e')
    return b.done()


def khufu(P):
    b = Boat('khufu'); L, B = P['L'], P['B']
    rings = b.hull(L * 0.86, B, 0.7, 1.0, 'a0683a', deck='8a5a32', bow=0.42, stern=0.42, sheer=1.2, flat=0.15, n=28)
    # papyriform ends: the stem rises upright, the stern post curves forward over the deck
    def post(x, top, lean, n=10):
        pts = [Vector((x + lean * (t ** 2), 0, 1.6 + (top - 1.6) * t)) for t in [i / n for i in range(n + 1)]]
        for a, c, t in zip(pts, pts[1:], range(n)):
            b.spar(a, c, 0.42 - 0.2 * t / n, 0.42 - 0.2 * (t + 1) / n, 'a0683a')
        b.spar(pts[-1], pts[-1] + Vector((lean * 0.02, 0, 0.35)), 0.3, 0.38, 'a0683a')       # the bound-papyrus finial
    post(L * 0.43 - 0.3, P['stem'], 0.8)
    post(-L * 0.43 + 0.3, P['stern'], 2.6)
    # the deckhouse aft of amidships (panelled cabin under a canopy frame) and the small canopy forward
    c0, c1 = -L * 0.2, -L * 0.2 + P['cabin']
    b.box(c0, c1, -1.2, 1.2, 1.0, 2.75, '9a6a3e', 0.03)
    for x in [c0 + i * (c1 - c0) / 6 for i in range(7)]:
        for s in (-1, 1): b.spar((x, s * 1.55, 0.95), (x, s * 1.55, 3.05), 0.045, 0.035, WOOD)       # the palmiform columns of the canopy
    b.box(c0 - 0.3, c1 + 0.3, -1.65, 1.65, 3.05, 3.12, '8a5a32')
    f0 = L * 0.26
    for x in (f0, f0 + 2.2):
        for s in (-1, 1): b.spar((x, s * 0.8, 1.15), (x, s * 0.8, 2.7), 0.04, 0.03, WOOD)
    b.box(f0 - 0.15, f0 + 2.35, -0.95, 0.95, 2.7, 2.76, '8a5a32')
    # five pairs of oars lashed along the sides, two steering oars over the quarters
    for i in range(5):
        x = L * 0.02 + i * 2.3
        for s in (-1, 1):
            b.spar((x, s * (B / 2 - 0.2), 1.25), (x - 4.2, s * (B / 2 + 2.6), -0.3), 0.045, 0.04, WOOD)
            b.box(x - 4.9, x - 4.1, s * (B / 2 + 2.6) - 0.16, s * (B / 2 + 2.6) + 0.16, -0.75, -0.25, WOOD, 0.02)
    for s in (-1, 1):
        b.spar((-L * 0.3, s * 1.6, 2.4), (-L * 0.41, s * 2.3, -0.9), 0.06, 0.05, WOOD)
        b.box(-L * 0.42 - 0.2, -L * 0.42 + 0.3, s * 2.3 - 0.03, s * 2.3 + 0.03, -1.8, -0.6, WOOD)
    return b.done()


def skiff(P):
    b = Boat('skiff'); L = P['L']
    b.hull(L, P['B'], 0.12, 0.25, 'b7a060', deck='a8924e', bow=0.5, stern=0.5, sheer=0.55, n=16)
    for i in range(9):                                                         # the lashings round the papyrus bundles
        x = -L * 0.42 + i * L * 0.105
        b.box(x - 0.02, x + 0.02, -P['B'] * 0.52, P['B'] * 0.52, -0.1, 0.33 + 0.5 * (2 * (i / 8) - 1) ** 2, '6a5a2e')
    b.spar((-0.3, 0.2, 0.3), (2.6, 0.5, 1.5), 0.02, 0.018, WOOD)                # the punting pole
    return b.done()


def taftaf():
    """The Valley of the Kings road train ("taf-taf"): a small tractor unit and three open-sided, roofed
    carriages with bench seats, on rubber tyres. Built here because it uses the same plain-colour kit;
    its livery varies by year (unverified): drawn yellow and white."""
    b = Boat('taftaf')
    def wheels(x, hw, r=0.3):
        for s_ in (-1, 1): b.spar((x, s_ * hw, r), (x, s_ * (hw + 0.18), r), r, r, '1a1a1a', 12)
    b.box(4.6, 7.2, -0.75, 0.75, 0.35, 1.25, 'e2b21f', 0.06); b.box(4.6, 5.9, -0.72, 0.72, 1.25, 2.05, '27323a'); b.box(4.5, 6.0, -0.78, 0.78, 2.05, 2.15, 'e2b21f', 0.03)
    wheels(5.1, 0.72); wheels(6.7, 0.72)
    for k in range(3):
        x0 = 0.9 - k * 3.6
        b.box(x0, x0 + 3.2, -0.8, 0.8, 0.45, 0.6, 'f2f0ea', 0.03)
        for xx in (x0 + 0.08, x0 + 1.6, x0 + 3.12):
            for s_ in (-1, 1): b.spar((xx, s_ * 0.76, 0.6), (xx, s_ * 0.76, 2.2), 0.03, 0.03, 'f2f0ea')
        b.box(x0 - 0.1, x0 + 3.3, -0.88, 0.88, 2.2, 2.3, 'e2b21f', 0.03)
        for q in range(3): b.box(x0 + 0.3 + q * 1.0, x0 + 0.75 + q * 1.0, -0.7, 0.7, 0.95, 1.02, '8a5a32'); 
        wheels(x0 + 0.6, 0.74, 0.26); wheels(x0 + 2.6, 0.74, 0.26)
        b.box(x0 + 3.2, x0 + 3.6, -0.05, 0.05, 0.5, 0.56, '333333')
    return b.done()


# Sizes: research/sites/nile-and-boats.md
PARAMS = {
    # tourist felucca: hull 8-10 m, mast ~0.9 x and yard ~1.9 x the hull length (scaled from photos); white hull, red-orange bottom
    'felucca': dict(L=9.0, B=3.0, mast=8.1, yard=17.0, trim='c8452a', cushion='b0302a', awning='f0ece0'),
    'dahabiya': dict(L=40.0, B=7.2, mast=13.0, yard=30.0, cabins=8),            # 38-42 x 7-7.5 m typical, draught 1.0-1.5
    'cruiser': dict(L=72.0, B=14.0, decks=3, deck_h=2.7, awning='f2efe6'),      # 72 x 14 m, 11 m above water, draught 1.5
    'ferry': dict(L=23.5, B=6.4),                                               # 23-24 x 6.4 m measured on satellite, two decks
    'launch': dict(L=10.5, B=2.7, hull='f2f0ea', trim='c23b2f', cushion='c23b2f', roof='f2f0ea'),   # 9.5-11.5 x 2.4-3.0 m, white over red
    'khufu': dict(L=43.4, B=5.9, stem=6.0, stern=7.0, cabin=9.0),               # Jenkins 1980: 43.4 x 5.9 m; posts 5.5-7 m (approximate)
    'skiff': dict(L=4.6, B=1.0),                                                # entirely estimated
}
if __name__ == '__main__':
    built = [felucca(PARAMS['felucca']), dahabiya(PARAMS['dahabiya']), cruiser(PARAMS['cruiser']), ferry(PARAMS['ferry']),
             launch(PARAMS['launch']), khufu(PARAMS['khufu']), skiff(PARAMS['skiff']), taftaf()]
    for i, o in enumerate(built): o.location.y = i * 30.0
    out = os.path.join(ROOT, 'assets', 'models', 'boats.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_normals=True,
                              export_texcoords=False, export_materials='EXPORT', export_cameras=False, export_lights=False)
    print('wrote', out, '%.0f kB' % (os.path.getsize(out) / 1e3), {o.name: len(o.data.polygons) for o in built}, file=sys.stderr)
