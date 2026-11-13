#!/usr/bin/env python3
"""Valley of the Kings: the tomb of Tutankhamun (KV62) and the valley around it.

    python3 tools/geo/fetch_valley_dem.py        (once: elevation model -> tools/geo/cache/valley_dem.npz)
    python3 tools/blender/valley_kings.py        -> assets/models/kv62.glb, assets/models/valley_kings.glb

Both share one origin: the head of KV62's entrance stair at ground level.
X east, Y north. Numbers: research/sites/valley-of-the-kings.md (Theban
Mapping Project figures for KV62). The tomb is drawn running due west from
its entrance; see the note for its true bearing.

kv62.glb (pre-lit interior):
  A  entrance stair   16 steps, 1.68 m wide
  B  corridor         8.08 x 1.68 x 2.0 m, descending
  I  antechamber      7.85 (N-S) x 3.55 x 2.68 m
  Ia annexe           4.35 (N-S) x 2.60 x 2.55 m, floor 0.9 m lower, low doorway
  J  burial chamber   6.37 (E-W) x 4.02 x 3.63 m, floor 0.94 m lower; painted walls
  Ja treasury         4.75 (N-S) x 3.80 x 2.33 m
  quartzite sarcophagus 2.74 x 1.47 x 1.47 m under its cracked granite lid; the
  king's mummy in a glass case in the antechamber; the visitors' timber platform
  and glass balustrade. Wall paintings are photographs (see CREDITS in
  research/photos/valley-of-the-kings/).
valley_kings.glb (sunlit): the ground from the Copernicus 30 m elevation model
  for 1.3 km around, the entrance enclosure of KV62 with its sign and gate, the
  entrances of the neighbouring tombs, shelters and paths.
"""
import math, os, random, sys
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix
import gizalib as G

random.seed(62)
# ---------------------------------------------------------------- dimensions (m)
# Scaled from the Theban Mapping Project survey sheet (research/sites/valley-of-the-kings.md, 2.1):
# TMP x (into the tomb) = -X here, TMP y - 0.42 = Y here, TMP z - 7.185 = Z here (Z = 0 at the entrance datum).
SW = 1.68 / 2                      # half width of the stair pit
CW = 1.66 / 2                      # ... of the corridor
NSTEP, RISE, TREAD = 16, 0.2378, 0.27
LAND = 5.61 - NSTEP * TREAD        # level landing before the first step
SX = -5.61; SZ = -NSTEP * RISE      # foot of the stair (166.745 m asl)
GBX, GBZ = -6.62, -4.135            # inner face of gate B = head of corridor B
BX, BZ = -14.25, -6.635             # foot of corridor B (18.0 deg)
GIX, GIZ = -15.2, -6.915            # inner face of gate I: one step of 0.27 down into the antechamber
BH = 2.05                           # (1.97 on the survey: 8 cm added so that a 1.8 m player's capsule clears the sloping roof)
F1 = -7.185                         # antechamber floor (163.365 m asl)
AH = 2.76
AX1, AX0 = GIX, GIX - 3.55          # antechamber east / west walls
AS, AN = -4.46, 3.44                # its south / north ends (7.90)
PART = 1.01                         # the dismantled partition between antechamber and burial chamber
JS, JN = AN + PART, AN + PART + 4.08
JE, JW0 = -15.4, -15.4 - 6.37       # burial chamber east / west walls
F2 = F1 - 0.94; JH = 3.70
TX0, TX1 = -14.87, -11.06           # treasury (3.80 E-W), east of the burial chamber
TY0, TY1 = 5.65, 10.44              # (4.75 N-S)
F4 = F1 - 1.10; TH = 2.36
TDY0, TDY1 = 7.21, 8.34             # its doorway (1.12 wide, lintel 1.55 above the burial-chamber floor)
NX1, NX0 = -19.4, -22.0             # annexe (2.60 E-W)
NY0, NY1 = -4.85, -0.43             # (4.35 N-S)
F3 = F1 - 1.07; NH = 2.61
NDY0, NDY1 = -3.48, -2.48           # its doorway (1.00 x 1.42), threshold at the antechamber floor
SAR = (-20.0, -17.33, 5.79, 7.14)   # sarcophagus footprint on the TMP plan (x0, x1, y0, y1); box 2.75 x 1.33 x 1.49


def interior():
    G.reset({
        'rock': (0.74, 0.68, 0.56), 'plaster': (0.80, 0.76, 0.66), 'paint_yellow': (0.72, 0.50, 0.12), 'quartzite': (0.55, 0.40, 0.24),
        'granite_red': (0.5, 0.33, 0.27), 'wood': (0.45, 0.30, 0.16), 'glass': (0.6, 0.75, 0.8), 'statue': (0.25, 0.2, 0.15), 'masonry': (0.78, 0.75, 0.68),
        'dark': (0.02, 0.02, 0.02), 'fixture': (1, 0.95, 0.8),
    })
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
    sec = lambda hw, h: [(-hw, 0), (hw, 0), (hw, h), (-hw, h)]
    void('stair_land', lambda bm: G.box(bm, -LAND - 0.02, 0.3, -SW, SW, -0.08, 3.4))
    void('stair_open', lambda bm: prism_x(bm, [(-SW, -0.02), (SW, -0.02), (SW, 3.6), (-SW, 3.6)], -LAND, SX * 0.72, 0.0, (SX * 0.72 + LAND) / TREAD * RISE))
    void('stair_roofed', lambda bm: prism_x(bm, sec(SW, 3.05), SX * 0.72 + 0.02, SX - 0.02, (SX * 0.72 + LAND) / TREAD * RISE, SZ))
    void('gate_b', lambda bm: prism_x(bm, sec(CW, 3.05), SX, GBX - 0.02, SZ, GBZ))
    void('corridor', lambda bm: prism_x(bm, sec(CW, BH), GBX, BX - 0.02, GBZ, BZ))
    void('gate_i', lambda bm: prism_x(bm, sec(CW, BH), BX, GIX - 0.02, BZ, GIZ))
    void('antechamber', lambda bm: G.box(bm, AX0, AX1, AS, AN + PART + 0.02, F1, F1 + AH))
    void('burial', lambda bm: G.box(bm, JW0, JE, JS, JN, F2, F2 + JH))
    void('treasury_door', lambda bm: G.box(bm, JE - 0.02, TX0 + 0.02, TDY0, TDY1, F2, F2 + 1.55))
    void('treasury', lambda bm: G.box(bm, TX0, TX1, TY0, TY1, F4, F4 + TH))
    void('annexe_door', lambda bm: G.box(bm, NX1 - 0.02, AX0 + 0.02, NDY0, NDY1, F1 + 0.0, F1 + 1.42))
    void('annexe', lambda bm: G.box(bm, NX0, NX1, NY0, NY1, F3, F3 + NH))
    # the four niches for the magic bricks, one in each wall of the burial chamber (0.18 x 0.25 m)
    for nm, (x0, x1, y0, y1) in (('n', (JW0 + 0.4, JW0 + 0.58, JN - 0.02, JN + 0.14)), ('s', (JW0 + 1.2, JW0 + 1.38, JS - 0.14, JS + 0.02)),
                                 ('w', (JW0 - 0.14, JW0 + 0.02, JS + 1.9, JS + 2.08)), ('e', (JE - 0.02, JE + 0.14, JS + 0.5, JS + 0.68))):
        void('niche_' + nm, lambda bm, a=(x0, x1, y0, y1): G.box(bm, a[0], a[1], a[2], a[3], F2 + 1.05, F2 + 1.3))
    room = G.union(voids, 'kv62')
    G.void_to_room(room, 0.5, drop=lambda c: c.z > -0.03 and c.x > SX * 0.72 - 0.1)
    # hand-cut rock: uneven everywhere except the plastered, painted burial chamber
    bm = bmesh.new(); bm.from_mesh(room.data)
    for v in bm.verts:
        c = v.co
        if JW0 - 0.3 < c.x < JE + 0.05 and JS - 0.05 < c.y < JN + 0.3 and c.z < F2 + JH + 0.1: continue
        if c.z > -0.2 and c.x > SX * 0.72: continue
        if GIX - 0.1 < c.x < SX + 0.1 and abs(c.y) < CW + 0.05: continue      # the corridor is left true, for headroom
        rnd = random.Random(hash((round(c.x, 2), round(c.y, 2), round(c.z, 2))))
        r = 0.03
        v.co += Vector((rnd.uniform(-r, r), rnd.uniform(-r, r), rnd.uniform(-r, r) * 0.5))
    bm.normal_update(); bm.to_mesh(room.data); bm.free()
    room.data.materials.clear()
    NAMES = ['rock', 'paint_yellow', 'plaster', 'masonry', 'dark']
    for m in NAMES: room.data.materials.append(G.M[m])
    for p in room.data.polygons:
        c = p.center; m = 'rock'
        in_j = JW0 - 0.05 < c.x < JE + 0.05 and JS - 0.05 < c.y < JN + 0.05
        if in_j and abs(p.normal.z) < 0.5 and c.z < F2 + JH:
            m = 'paint_yellow' if c.z > F2 + 0.95 else 'plaster'                       # painted walls over a white dado
        if c.x > SX - 0.3 and abs(p.normal.z) < 0.5: m = 'masonry'                     # the stair pit is lined with rubble masonry
        p.material_index = NAMES.index(m); p.use_smooth = False

    solids, deco = [], []
    # the sixteen steps (the lowest six were cut away for the burial, rebuilt, and removed again by Carter; restored since)
    bm = bmesh.new()
    for i in range(NSTEP):
        G.box(bm, -LAND - (i + 1) * TREAD, -LAND - i * TREAD, -SW, SW, -(i + 1) * RISE - 0.3, -(i + 1) * RISE + RISE)
    deco.append(G.obj(bm, 'deco_entrance_steps', 'masonry'))        # drawn only: the walkers use the unseen ramp below
    # an unseen smooth ramp along the step nosings carries the player (a capsule jams on real 24 cm risers)
    bm = bmesh.new(); prism_x(bm, [(-SW, -0.06), (SW, -0.06), (SW, 0.0), (-SW, 0.0)], -LAND + 0.05, SX, 0.0, SZ + 0.02)
    ramp = G.obj(bm, 'col_stair', 'dark'); ramp.hide_render = True
    solids.append(G.box_obj('gate_i_step', 'wood', GIX - 0.35, GIX + 0.02, -0.77, 0.77, F1, F1 + 0.14))
    # the visitors' timber ramp down the corridor with handrails, and the raised timber floor of the antechamber
    bm = bmesh.new()
    prism_x(bm, [(-CW + 0.12, 0.0), (CW - 0.12, 0.0), (CW - 0.12, 0.04), (-CW + 0.12, 0.04)], GBX, BX, GBZ, BZ)
    deco.append(G.obj(bm, 'deco_ramp_boards', 'wood'))
    bm = bmesh.new(); k = 0.0
    while GBX - k > BX + 0.2:
        x = GBX - k; z = GBZ + (BZ - GBZ) * k / (GBX - BX)
        G.box(bm, x - 0.025, x + 0.025, -CW + 0.15, CW - 0.15, z + 0.04, z + 0.07); k += 0.4
    for s_ in (-1, 1):
        prism_x(bm, [(s_ * (CW - 0.07) - 0.02, 0.9), (s_ * (CW - 0.07) + 0.02, 0.9), (s_ * (CW - 0.07) + 0.02, 0.95), (s_ * (CW - 0.07) - 0.02, 0.95)], GBX, BX, GBZ, BZ)
    deco.append(G.obj(bm, 'deco_rails', 'wood'))
    # the viewing edge where the partition stood: dark timber posts and top rail with glass infill, 1.1 m high.
    # (Departure: a gap and timber steps at the east end let the player go down; visitors may not.)
    GAP = 1.3; EDGE = JS
    bm = bmesh.new()
    G.box(bm, AX0 + 0.05, AX1 - GAP, EDGE - 0.1, EDGE - 0.02, F1 + 1.02, F1 + 1.1)
    for x in np.linspace(AX0 + 0.08, AX1 - GAP - 0.04, 4): G.box(bm, x - 0.04, x + 0.04, EDGE - 0.1, EDGE - 0.02, F1, F1 + 1.05)
    solids.append(G.obj(bm, 'balustrade', 'wood'))
    solids.append(G.box_obj('glass_panels', 'glass', AX0 + 0.12, AX1 - GAP - 0.08, EDGE - 0.07, EDGE - 0.05, F1 + 0.1, F1 + 1.0))
    # a boarded ramp with cleats down into the burial chamber (a ramp, because the web build's walker cannot take steps this steep)
    bm = bmesh.new()
    vs = [(AX1 - GAP + 0.04, EDGE - 0.02, F2 - 0.02), (JE - 0.02, EDGE - 0.02, F2 - 0.02), (JE - 0.02, EDGE + 1.95, F2 - 0.02), (AX1 - GAP + 0.04, EDGE + 1.95, F2 - 0.02),
          (AX1 - GAP + 0.04, EDGE - 0.02, F1), (JE - 0.02, EDGE - 0.02, F1)]
    V = [bm.verts.new(v) for v in vs]
    bm.faces.new((V[0], V[1], V[2], V[3])); bm.faces.new((V[4], V[5], V[2], V[3])); bm.faces.new((V[0], V[1], V[5], V[4])); bm.faces.new((V[0], V[4], V[3])); bm.faces.new((V[1], V[5], V[2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    solids.append(G.obj(bm, 'wramp_burial', 'wood'))
    bm = bmesh.new()
    for i in range(1, 6):
        y = EDGE + i * 0.32; z = F1 - 0.94 * (y - EDGE + 0.02) / 1.97
        G.box(bm, AX1 - GAP + 0.1, JE - 0.08, y - 0.025, y + 0.025, z, z + 0.035)
    deco.append(G.obj(bm, 'deco_ramp_cleats', 'wood'))
    # steel grilles across the annexe and treasury doorways (drawn standing open; the annexe floor is a straight 1.07 m drop)
    bm = bmesh.new()
    for i in range(6): G.box(bm, AX0 - 0.02, AX0 + 0.02, NDY1 + 0.05 + i * 0.16, NDY1 + 0.08 + i * 0.16, F1 + 0.05, F1 + 1.4)
    for i in range(6): G.box(bm, JE - 0.02, JE + 0.02, TDY0 - 0.1 - i * 0.16, TDY0 - 0.07 - i * 0.16, F2 + 0.05, F2 + 1.5)
    deco.append(G.obj(bm, 'deco_grilles', 'granite_red'))
    # the sarcophagus: a single block of quartzite, 2.75 x 1.33 x 1.49 m, head to the west; the red granite lid,
    # painted to match and cracked right across, is back on it (2022), sloping up towards the head
    cx, cy = (SAR[0] + SAR[1]) / 2, (SAR[2] + SAR[3]) / 2
    solids.append(G.box_obj('sarcophagus', 'quartzite', cx - 1.375, cx + 1.375, cy - 0.665, cy + 0.665, F2, F2 + 1.49))
    bm = bmesh.new()
    prism_x(bm, [(cy - 0.7, 0.0), (cy + 0.7, 0.0), (cy + 0.7, 0.2), (cy, 0.27), (cy - 0.7, 0.2)], cx - 1.41, cx - 0.06, F2 + 1.49 + 0.1, F2 + 1.49 + 0.05)
    prism_x(bm, [(cy - 0.7, 0.0), (cy + 0.7, 0.0), (cy + 0.7, 0.2), (cy, 0.27), (cy - 0.7, 0.2)], cx - 0.03, cx + 1.41, F2 + 1.49 + 0.05, F2 + 1.49)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    solids.append(G.obj(bm, 'lid', 'granite_red'))
    bm = bmesh.new()                                                            # cavetto cornice, black plinth, the four goddesses at the corners
    G.box(bm, cx - 1.4, cx + 1.4, cy - 0.69, cy + 0.69, F2 + 1.36, F2 + 1.48)
    for sx in (-1, 1):
        for sy in (-1, 1): G.box(bm, cx + sx * 1.375 - 0.07, cx + sx * 1.375 + 0.07, cy + sy * 0.665 - 0.07, cy + sy * 0.665 + 0.07, F2 + 0.12, F2 + 1.36)
    deco.append(G.obj(bm, 'deco_sarc_trim', 'quartzite'))
    deco.append(G.box_obj('deco_sarc_plinth', 'dark', cx - 1.39, cx + 1.39, cy - 0.68, cy + 0.68, F2, F2 + 0.12))
    # the king's mummy: since 2007 in a climate-controlled glass case in the antechamber (2.2 x 0.8 x 0.7 on a low dark plinth)
    mx, my = AX0 + 0.6, AS + 1.6
    solids.append(G.box_obj('mummy_plinth', 'wood', mx - 0.42, mx + 0.42, my - 1.12, my + 1.12, F1, F1 + 0.5))
    bm = bmesh.new(); G.box(bm, mx - 0.2, mx + 0.2, my - 0.85, my + 0.8, F1 + 0.51, F1 + 0.68); G.box(bm, mx - 0.1, mx + 0.1, my + 0.62, my + 0.86, F1 + 0.53, F1 + 0.74)
    deco.append(G.obj(bm, 'deco_mummy', 'statue'))
    deco.append(G.box_obj('deco_case', 'glass', mx - 0.4, mx + 0.4, my - 1.1, my + 1.1, F1 + 0.5, F1 + 1.2))
    # lighting: LED strips along the foot of the painted walls, lamps in the other rooms
    for x in np.linspace(JW0 + 0.5, JE - 0.5, 5):
        G.light((x, JN - 0.15, F2 + 0.12), 22, size=0.04); G.light((x, JS + 0.15, F2 + 0.12), 12, size=0.04)
    for y in np.linspace(JS + 0.6, JN - 0.6, 3):
        G.light((JW0 + 0.15, y, F2 + 0.12), 22, size=0.04); G.light((JE - 0.15, y, F2 + 0.12), 22, size=0.04)
    for loc, e in (((AX1 - 0.4, AS + 2.4, F1 + 2.5), 25), ((AX0 + 0.4, AN - 1.0, F1 + 2.5), 25), ((mx + 0.9, my, F1 + 2.5), 20),
                   ((-8.5, CW - 0.1, -4.75 + 1.75), 10), ((-12.0, -CW + 0.1, -5.9 + 1.75), 10), ((SX + 0.6, SW - 0.1, SZ + 1.9), 8),
                   (((TX0 + TX1) / 2, (TY0 + TY1) / 2, F4 + 0.15), 14), ((NX0 + 1.3, (NY0 + NY1) / 2, F3 + 0.15), 10)):
        G.light(loc, e, size=0.05)
    # anchors and the photographed paintings
    G.empty('tp_antechamber', (AX1 - 1.2, 0.4, F1 + 0.35))
    G.empty('tp_burial_chamber', (JE - 0.5, JS + 1.2, F2 + 0.3))
    G.empty('poi_stair', (SX / 2, 0, SZ / 2 + 1.0)); G.empty('poi_corridor', ((GBX + BX) / 2, 0, (GBZ + BZ) / 2 + 1.0))
    G.empty('poi_antechamber', ((AX0 + AX1) / 2, 1.0, F1 + 1.4)); G.empty('poi_mummy', (mx + 0.5, my, F1 + 1.2))
    G.empty('poi_annexe', (AX0 + 0.4, (NDY0 + NDY1) / 2, F1 + 1.0)); G.empty('poi_burial', ((AX0 + AX1) / 2, JS - 0.6, F1 + 1.5))
    G.empty('poi_sarcophagus', (cx, cy - 1.3, F2 + 1.2)); G.empty('poi_north', (cx, JN - 0.9, F2 + 1.7)); G.empty('poi_west', (JW0 + 0.9, cy, F2 + 1.7))
    G.empty('poi_east', (JE - 0.8, JS + 2.0, F2 + 1.6)); G.empty('poi_treasury', ((TX0 + TX1) / 2, (TY0 + TY1) / 2, F4 + 1.2))
    top = F2 + JH - 0.06; JL, JWD = JE - JW0, JN - JS
    hn = JL * 836 / 1920; hw = JWD * 1098 / 1920; he = JWD * 1062 / 1920
    G.empty('tex_kv62_north', ((JW0 + JE) / 2, JN - 0.012, top - hn / 2), (1, 0, 0), (0, 0, 1), JL, hn)
    G.empty('tex_kv62_west', (JW0 + 0.012, (JS + JN) / 2, top - hw / 2), (0, 1, 0), (0, 0, 1), JWD, hw)
    G.empty('tex_kv62_east', (JE - 0.012, (JS + JN) / 2, top - he / 2), (0, -1, 0), (0, 0, 1), JWD, he)
    # the surviving western 2.8 m of the south wall: a drawn reconstruction (tools/art/kv62_south_wall.py), not a photograph
    sw_ = AX0 - JW0
    G.empty('tex_kv62_south', ((JW0 + AX0) / 2, JS + 0.012, top - 1.3), (-1, 0, 0), (0, 0, 1), sw_, 2.6)
    G.empty('poi_south', ((JW0 + AX0) / 2, JS + 0.8, F2 + 1.7))
    final = [room, G.join(solids, 'solids')]
    G.join(deco, 'deco')
    G.bake_and_export(final, 'kv62.glb', samples=96)


# ------------------------------------------------------------------------------------ the valley
# Entrances of the other tombs, from the datums printed on the TMP sheets (note, table 1.2):
# (number, owner, metres east, metres north of KV62's datum, metres above it, true bearing walked going in)
NEIGHBOURS = [('KV9', 'Ramesses V and VI', -8.2, 0.0, 3.76, 290.3), ('KV17', 'Seti I', 51.8, -38.3, 7.47, 217.7), ('KV11', 'Ramesses III', -32.0, -19.9, 5.34, 178.7),
              ('KV2', 'Ramesses IV', 73.3, 132.7, -2.74, 291.5), ('KV6', 'Ramesses IX', 24.4, 34.9, 0.93, 123.0), ('KV8', 'Merenptah', -46.4, 54.1, 8.41, 280.9),
              ('KV14', 'Tausret and Setnakht', -161.5, -125.2, 16.28, 263.6), ('KV35', 'Amenhotep II', -122.7, -19.2, 14.95, 289.1), ('KV16', 'Ramesses I', 43.9, -30.6, 7.48, 240.4),
              ('KV47', 'Siptah', -138.2, -111.2, 14.61, 172.0), ('KV57', 'Horemheb', -62.4, -28.2, 2.69, 357.7), ('KV5', 'the sons of Ramesses II', 53.1, 46.6, -0.68, 134.2),
              ('KV1', 'Ramesses VII', 48.8, 235.0, 0.67, 327.7)]
# Shade shelters and the rest house from OpenStreetMap: (x east, y north, length, width, heading deg)
SHELTERS = [(-7, -29, 4.4, 3.2, 0), (94, 63, 11.1, 3.3, 40), (156, 157, 29.9, 4.7, 45)]
REST_HOUSE = (45, -4, 28.0, 9.0)


def valley():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    col = bpy.context.scene.collection
    mats = {}
    def mat(name):
        if name not in mats:
            m = bpy.data.materials.new(name); m.use_nodes = True
            if name.startswith('c_'):
                r, g, b = (int(name[2 + i:4 + i], 16) / 255 for i in (0, 2, 4))
                m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (r ** 2.2, g ** 2.2, b ** 2.2, 1)
            mats[name] = m
        return mats[name]
    def obj(bm, name, material, smooth=False):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = smooth
        me.materials.append(mat(material))
        o = bpy.data.objects.new(name, me); col.objects.link(o); return o
    def box(bm, x0, x1, y0, y1, z0, z1):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
        return r['verts']
    def empty(name, loc, right=(1, 0, 0), up=(0, 0, 1), w=1.0, h=1.0):
        right, up = Vector(right).normalized(), Vector(up).normalized()
        e = bpy.data.objects.new(name, None)
        m = Matrix((right, up, right.cross(up))).transposed().to_4x4()
        e.matrix_world = Matrix.Translation(Vector(loc)) @ m @ Matrix.Diagonal((w, h, 1, 1))
        col.objects.link(e); return e

    d = np.load(os.path.join(G.ROOT, 'tools', 'geo', 'cache', 'valley_dem.npz'))
    h0 = d['h'].astype(float); step0 = float(d['step']); half = float(d['half']); n0 = h0.shape[0]
    h0 -= h0[n0 // 2, n0 // 2]
    # resample the 20 m grid to 10 m, so that cliffs can be drawn into it
    step = 10.0; n = int(2 * half / step) + 1; c = n // 2
    xs = np.linspace(-half, half, n)
    X, Y = np.meshgrid(xs, xs)
    fx = (X + half) / step0; fy = (Y + half) / step0
    i0 = np.clip(fx.astype(int), 0, n0 - 2); j0 = np.clip(fy.astype(int), 0, n0 - 2); u = fx - i0; v = fy - j0
    h = h0[j0, i0] * (1 - u) * (1 - v) + h0[j0, i0 + 1] * u * (1 - v) + h0[j0 + 1, i0] * (1 - u) * v + h0[j0 + 1, i0 + 1] * u * v
    # al-Qurn: the pyramid-shaped peak, ~450 m asl (280 m above the valley floor), 780 m away on bearing ~233 deg.
    # The 30 m model rounds it off; give it back its point.
    qx, qy = 780 * math.sin(math.radians(233)), 780 * math.cos(math.radians(233))
    Rq = np.hypot(X - qx, Y - qy)
    h = np.maximum(h, 280.0 - 0.72 * Rq)
    # Cliffs. The elevation model smooths the Theban limestone into rolling hills; the real valley is walled by
    # near-vertical faces 10-30 m high standing on scree aprons. Redraw each ~28 m of rise as a scree slope
    # topped by a cliff, with the cliff line wandering a little, leaving the wadi floor and the summits alone.
    def vnoise(x, y):
        return (np.sin(x * 0.013 + 1.7 * np.sin(y * 0.009)) + np.sin(y * 0.017 + 1.3 * np.sin(x * 0.011)) + 0.5 * np.sin((x + y) * 0.041)) / 2.5
    HB = 30.0
    t = (h - 14.0) / HB + 0.22 * vnoise(X, Y)
    fl_ = np.floor(t); fr = t - fl_
    sc = np.where(fr < 0.58, fr * 0.3 / 0.58, 0.3 + (np.clip((fr - 0.58) / 0.07, 0, 1)) * 0.62 + np.clip((fr - 0.65) / 0.35, 0, 1) * 0.08)   # scree, cliff, ledge
    hc = (fl_ + sc - 0.22 * vnoise(X, Y)) * HB + 14.0
    w = np.clip((h - 16.0) / 20.0, 0, 1) * np.clip((Rq - 60.0) / 120.0, 0, 1)        # none on the valley floor, none on al-Qurn's own cone
    h = h * (1 - w * 0.92) + hc * (w * 0.92)
    # The 30 m model also reads the narrow wadi floor 5-35 m too high. Cut the floor back down along the way in,
    # from the visitor centre (149 m asl) up to the heads of the valley, through the surveyed entrance levels.
    FLOOR = [(345, 566, -21.5), (300, 470, -17.0), (240, 330, -10.5), (190, 222, -5.5), (156, 157, -2.7), (73, 60, -0.8), (4, 0, 0.0),
             (-60, -30, 2.7), (-122, -30, 12.0), (-161, -125, 16.3)]
    for (ax, ay, az), (bx2, by2, bz2) in zip(FLOOR, FLOOR[1:]):
        L = math.hypot(bx2 - ax, by2 - ay); m = max(2, int(L / 12))
        for q in range(m + 1):
            tq = q / m; px, py, pz = ax + (bx2 - ax) * tq, ay + (by2 - ay) * tq, az + (bz2 - az) * tq
            Rn = np.hypot(X - px, Y - py); kn = np.clip((Rn - 22.0) / 75.0, 0, 1); kn = kn * kn * (3 - 2 * kn)
            h[:] = np.minimum(h, h * kn + pz * (1 - kn) + (1 - kn) * 0.0 + kn * 0.0) if False else np.where(h > pz, h * kn + pz * (1 - kn), h)
    for (_n, _o, ex, ey, ez, _a) in NEIGHBOURS:                   # the 30 m model reads high on the wadi floor: pull it to the surveyed datums
        Rn = np.hypot(X - ex, Y - ey); kn = np.clip((Rn - 14.0) / 34.0, 0, 1); kn = kn * kn * (3 - 2 * kn)
        h[:] = h * kn + ez * (1 - kn)
    for (vx, vy, vz, vr) in ((345.0, 566.0, -21.5, 60.0), (156.0, 157.0, -2.7, 25.0)):       # level sites: visitor centre (149 m asl), drop-off
        Rn = np.hypot(X - vx, Y - vy); kn = np.clip((Rn - vr) / 50.0, 0, 1); kn = kn * kn * (3 - 2 * kn)
        h[:] = h * kn + vz * (1 - kn)
    R = np.hypot(X - 4.0, Y)                                     # level ground in front of KV62's own entrance (KV9 is on the slope just behind it)
    k = np.clip((R - 9.0) / 16.0, 0, 1); k = k * k * (3 - 2 * k)
    h *= k
    def ground(x, y):
        fx = (x + half) / step; fy = (y + half) / step
        i = min(n - 2, max(0, int(fx))); j = min(n - 2, max(0, int(fy))); u = fx - i; v = fy - j
        return h[j, i] * (1 - u) * (1 - v) + h[j, i + 1] * u * (1 - v) + h[j + 1, i] * (1 - u) * v + h[j + 1, i + 1] * u * v
    bm = bmesh.new()
    V = [[bm.verts.new((xs[i], xs[j], h[j, i])) for i in range(n)] for j in range(n)]
    for j in range(n - 1):
        for i in range(n - 1):
            if i in (c - 2, c - 1) and c - 2 <= j <= c + 1: continue          # the cells over the stair pit (x -20..0, y -20..20) are re-laid below
            bm.faces.new((V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]))
    obj(bm, 'terrain', 'theban', True)
    # the two cells round the pit, re-laid as a fine mesh that follows the ground, levels off at the pit and leaves the stair open
    x_in = SX * 0.72 - 0.05
    def pad_h(x, y):
        dx = max(x_in - x, 0.0, x - 0.3); dy = max(-SW - 0.3 - y, 0.0, y - SW - 0.3)
        t = min(1.0, math.hypot(dx, dy) / 2.5); t = t * t * (3 - 2 * t)
        return ground(x, y) * t
    bm = bmesh.new()
    xe = sorted(set([-20.0 + i for i in range(21)] + [x_in, 0.3])); ye = sorted(set([-20.0 + i for i in range(41)] + [-SW - 0.3, SW + 0.3]))
    xe = [x for x in xe if x <= 0.0 or x == 0.3]; xe = [x for x in xe if x <= 0.0]
    PV = {}
    def pv(x, y):
        if (x, y) not in PV: PV[(x, y)] = bm.verts.new((x, y, pad_h(x, y)))
        return PV[(x, y)]
    for xa, xb in zip(xe, xe[1:]):
        for ya, yb in zip(ye, ye[1:]):
            if xa >= x_in - 1e-6 and ya >= -SW - 0.3 - 1e-6 and yb <= SW + 0.3 + 1e-6: continue      # the stair pit
            bm.faces.new((pv(xa, ya), pv(xb, ya), pv(xb, yb), pv(xa, yb)))
    obj(bm, 'pad', 'theban', True)
    # the enclosure: whitewashed rubble walls round the pit, the roof slab over the lower flight, the open gate, the sign
    bm = bmesh.new()
    for (x0, x1, y0, y1, z1) in ((x_in - 0.6, 0.5, -SW - 0.9, -SW - 0.3, 1.25), (x_in - 0.6, 0.5, SW + 0.3, SW + 0.9, 1.25), (x_in - 0.6, x_in, -SW - 0.3, SW + 0.3, 1.9)):
        box(bm, x0, x1, y0, y1, 0.0 if abs(y0) > SW else 0.45, z1)
    box(bm, x_in - 0.6, x_in + 1.6, -SW - 0.9, SW + 0.9, 1.9, 2.1)
    box(bm, 0.5, 1.7, -SW - 0.9, -SW - 0.3, 0.0, 2.0)            # the pier that carries the sign
    obj(bm, 'enclosure', 'c_e4ddce')
    bm = bmesh.new()
    for i in range(9): box(bm, 0.55 + 0.0, 0.6, SW + 0.3 + i * 0.2, SW + 0.33 + i * 0.2, 0.05, 2.0)
    for z in (0.05, 0.7, 1.35, 1.97): box(bm, 0.55, 0.6, SW + 0.3, SW + 1.95, z, z + 0.04)
    obj(bm, 'deco_gate', 'c_efe9da')
    empty('tex_kv62_sign', (1.712, -SW - 0.6, 1.25), (0, 1, 0), (0, 0, 1), 0.52, 0.5)
    # the other tombs: a doorway in a low masonry enclosure, with its board, facing the way the tomb's axis comes out
    bw, bd, bs = bmesh.new(), bmesh.new(), bmesh.new()
    for i, (num, owner, x, y, ez, axis) in enumerate(NEIGHBOURS):
        z = ground(x, y); a = math.radians(-90.0 - axis); f = Vector((math.cos(a), math.sin(a), 0))
        def put(bm_, lo, hi):
            vs = box(bm_, lo[0], hi[0], lo[1], hi[1], lo[2], hi[2])
            bmesh.ops.transform(bm_, verts=vs, matrix=Matrix.Translation(Vector((x, y, z))) @ Matrix.Rotation(a, 4, 'Z'))
        put(bw, (-3.0, -2.2, -0.6), (-2.4, 2.2, 3.0)); put(bw, (-2.4, -2.2, -0.6), (2.5, -1.7, 1.1)); put(bw, (-2.4, 1.7, -0.6), (2.5, 2.2, 1.1))
        put(bd, (-2.42, -0.9, 0.0), (-2.38, 0.9, 2.2)); put(bs, (2.5, -2.2, 0.85), (2.56, -1.3, 1.5))
        empty('poi_n%d' % i, (x + f.x * 4, y + f.y * 4, z + 1.5))
    obj(bw, 'neighbours', 'c_e4ddce'); obj(bd, 'deco_doors', 'c_14110e'); obj(bs, 'deco_boards', 'c_d9a528')
    # shade shelters (posts, flat roofs, benches), the rest house, and the gravel path up from the drop-off
    bp, br = bmesh.new(), bmesh.new()
    for (x, y, L, W, hd) in SHELTERS:
        z = ground(x, y); M = Matrix.Translation(Vector((x, y, z))) @ Matrix.Rotation(math.radians(hd), 4, 'Z')
        npost = max(2, int(L / 4))                   # (not `n`: ground() uses that)
        for k in range(npost + 1):
            for dy in (-W / 2 + 0.2, W / 2 - 0.2):
                vs = box(bp, -L / 2 + k * L / npost - 0.06, -L / 2 + k * L / npost + 0.06, dy - 0.06, dy + 0.06, -0.3, 2.9); bmesh.ops.transform(bp, verts=vs, matrix=M)
        vs = box(br, -L / 2 - 0.3, L / 2 + 0.3, -W / 2 - 0.3, W / 2 + 0.3, 2.9, 3.02); bmesh.ops.transform(br, verts=vs, matrix=M)
        vs = box(bp, -L / 2 + 0.5, L / 2 - 0.5, -0.25, 0.25, 0.4, 0.48); bmesh.ops.transform(bp, verts=vs, matrix=M)
    obj(bp, 'shelter_posts', 'c_6a6f73'); obj(br, 'shelter_roofs', 'c_cfc7b4')
    bm = bmesh.new(); rx, ry, rl, rw_ = REST_HOUSE; rz = ground(rx, ry)
    box(bm, rx - rl / 2, rx + rl / 2, ry - rw_ / 2, ry + rw_ / 2, rz - 0.5, rz + 3.4)
    obj(bm, 'rest_house', 'c_dcd3bf')
    bm = bmesh.new()
    path = [(156, 157), (110, 105), (73, 60), (40, 22), (12, 4), (-20, -14), (-60, -30), (-122, -30), (-160, -120)]
    for (ax, ay), (bx_, by) in zip(path, path[1:]):
        L = math.hypot(bx_ - ax, by - ay); m = max(1, int(L / 8))
        for q in range(m):
            t0, t1 = q / m, (q + 1) / m
            p0 = Vector((ax + (bx_ - ax) * t0, ay + (by - ay) * t0, 0)); p1 = Vector((ax + (bx_ - ax) * t1, ay + (by - ay) * t1, 0))
            dd = (p1 - p0).normalized(); sd = Vector((-dd.y, dd.x, 0)) * 2.2
            vs = [bm.verts.new((p.x, p.y, ground(p.x, p.y) + 0.06)) for p in (p0 - sd, p0 + sd, p1 + sd, p1 - sd)]
            bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    obj(bm, 'deco_path', 'c_c9bda3')
    # the visitor centre (single storey; OSM footprint, size approximate), the ticket and road-train booths,
    # the asphalt road up the wadi to the drop-off, and the long shelter there
    vx, vy = 345.0, 566.0; vz = ground(vx, vy)
    bm = bmesh.new(); box(bm, vx - 32, vx + 32, vy - 16, vy + 16, vz - 0.5, vz + 5.2)
    obj(bm, 'visitor_centre', 'c_d8ccb4')
    bm = bmesh.new(); box(bm, vx - 36, vx + 36, vy - 22, vy - 16, vz + 4.2, vz + 4.5)
    for q in range(9): box(bm, vx - 34 + q * 8.5 - 0.15, vx - 34 + q * 8.5 + 0.15, vy - 21.6, vy - 21.3, vz, vz + 4.2)
    box(bm, vx - 44, vx - 40, vy - 30, vy - 27, vz, vz + 2.8); box(bm, vx - 52, vx - 48, vy - 30, vy - 27, vz, vz + 2.8)
    obj(bm, 'visitor_canopy', 'c_bfb39b')
    bm = bmesh.new()
    for q in range(8): box(bm, vx - 28 + q * 7.5, vx - 24 + q * 7.5, vy - 16.05, vy - 15.98, vz + 1.0, vz + 3.6)
    obj(bm, 'deco_vc_glass', 'c_27323a')
    bm = bmesh.new()
    road = [(vx - 46, vy - 34), (300, 470), (240, 330), (190, 222), (158, 162)]
    for (ax, ay), (bx_, by) in zip(road, road[1:]):
        L = math.hypot(bx_ - ax, by - ay); m = max(1, int(L / 6))
        for q in range(m):
            t0, t1 = q / m, (q + 1) / m
            p0 = Vector((ax + (bx_ - ax) * t0, ay + (by - ay) * t0, 0)); p1 = Vector((ax + (bx_ - ax) * t1, ay + (by - ay) * t1, 0))
            dd = (p1 - p0).normalized(); sd = Vector((-dd.y, dd.x, 0)) * 2.6
            bm.faces.new([bm.verts.new((p.x, p.y, ground(p.x, p.y) + 0.08)) for p in (p0 - sd, p0 + sd, p1 + sd, p1 - sd)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    obj(bm, 'deco_road', 'c_3d3c3b')
    # the "taf-taf" road train plies this road (the game runs one between these two points)
    empty('train_0_a', (road[0][0], road[0][1], ground(*road[0]) + 0.1)); empty('train_0_b', (road[-1][0], road[-1][1], ground(*road[-1]) + 0.1))
    empty('tp_visitor_centre', (vx - 20, vy - 30, vz + 0.4)); empty('poi_visitor_centre', (vx, vy - 20, vz + 2.0)); empty('poi_qurn', (qx * 0.5, qy * 0.5, ground(qx * 0.5, qy * 0.5) + 2.0))
    empty('tp_valley', (9.0, 3.0, 0.4)); empty('tp_valley_view', (120, 120, ground(120, 120) + 0.5))
    empty('poi_kv62', (4.0, 0.0, 1.5)); empty('poi_valley', (60, 40, ground(60, 40) + 2.0))
    out = os.path.join(G.ROOT, 'assets', 'models', 'valley_kings.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_normals=True,
                              export_texcoords=False, export_materials='EXPORT', export_cameras=False, export_lights=False)
    print('wrote', out, '%.0f kB' % (os.path.getsize(out) / 1e3), 'relief %.0f..%.0f m' % (h.min(), h.max()), file=sys.stderr)


if __name__ == '__main__':
    if 'valley' not in sys.argv: interior()
    if 'interior' not in sys.argv: valley()
