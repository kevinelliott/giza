#!/usr/bin/env python3
"""Turn the published plan of Khafre's valley temple and the Sphinx Temple
into wall/pillar grids the game builds from (js/templedata.js).

Source: research/plans/khafre_valley_sphinx_plan.png — "Kahfre valley
sphinx.svg" by HoremWeb (Wikimedia Commons, public domain), based on Lehner
and Verner. In it north is to the right and the Sphinx is drawn to the same
scale, which fixes scale and position: the Sphinx is 73.5 m paw to rump
(850 px -> 11.56 px/m) and its centre is the game's SPHINX centre.
Solid masonry is the light tan fill; everything else is open.

    python3 tools/geo/temple_plans.py
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)
im = np.asarray(Image.open(os.path.join(ROOT, 'research', 'plans', 'khafre_valley_sphinx_plan.png')).convert('RGBA')).astype(int)
S = 850 / 73.5                      # px per metre
SPX, SPY = 995, 540                 # the Sphinx's centre in the drawing
geo = open(os.path.join(ROOT, 'js', 'geodata.js')).read()
sph = json.loads(geo.split('export const SITES = ')[1].split(';\n')[0])['sphinx']
CX, CZ = sph['x'], sph['z']
CELL = 0.25
X0, X1 = CX + (1045 - SPY) / S, CX + (1640 - SPY) / S        # east extent (image y)
Z0, Z1 = CZ - (1232 - SPX) / S, CZ - (0 - SPX) / S            # north..south (image x, flipped)
nx, nz = int((X1 - X0) / CELL), int((Z1 - Z0) / CELL)
solid = np.zeros((nz, nx), bool)
tan = np.array([233, 214, 182])
for j in range(nz):
    for i in range(nx):
        hits = 0
        for dx, dz in ((0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)):       # 4 samples per cell
            X, Z = X0 + (i + dx) * CELL, Z0 + (j + dz) * CELL
            px, py = int(round(SPX - (Z - CZ) * S)), int(round(SPY + (X - CX) * S))
            if 0 <= px < im.shape[1] and 0 <= py < im.shape[0]:
                p = im[py, px]
                if p[3] > 128 and np.abs(p[:3] - tan).sum() < 40: hits += 1
        solid[j, i] = hits >= 2
# connected components: small free-standing ones are pillars / piers
lab = -np.ones(solid.shape, int); sizes = []
for j in range(nz):
    for i in range(nx):
        if solid[j, i] and lab[j, i] < 0:
            k = len(sizes); q = deque([(j, i)]); lab[j, i] = k; n = 0
            while q:
                a, b = q.popleft(); n += 1
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    c, d = a + da, b + db
                    if 0 <= c < nz and 0 <= d < nx and solid[c, d] and lab[c, d] < 0:
                        lab[c, d] = k; q.append((c, d))
            sizes.append(n)
# the two temples are split by the open strip between them (image x ~ 628)
ZSPLIT = CZ - (628 - SPX) / S
# Valley-temple pillars are exported as points, not cells: Petrie measured them —
# monoliths 41 in (1.04 m) square and 174.2 in (4.425 m) high, the two at the
# junction of the hall's arms 58 in (1.47 m) wide — so the game builds them exactly.
pillars = []
comp_cells = {}
for j in range(nz):
    for i in range(nx):
        k = lab[j, i]
        if k >= 0 and sizes[k] * CELL * CELL < 12: comp_cells.setdefault(k, []).append((i, j))
pillar_comp = set()
for k, cells in comp_cells.items():
    cz_ = Z0 + (np.mean([c[1] for c in cells]) + 0.5) * CELL
    if cz_ > ZSPLIT and len(cells) * CELL * CELL < 3.2:                       # in the valley temple, pillar-sized
        cx_ = X0 + (np.mean([c[0] for c in cells]) + 0.5) * CELL
        pillars.append([round(cx_, 2), round(cz_, 2), 1 if len(cells) * CELL * CELL > 1.75 else 0])
        pillar_comp.add(k)
# Regularise them to Petrie's spacings (the plan draws them evenly): the N-S row of
# six in the hall's crossbar stands at 145 in (3.683 m) centres, the two E-W rows of
# five in the stem at 128 in (3.251 m), starting from the two wider junction pillars.
pillars = [p_ for p_ in pillars if p_[0] < 400]
cross_x = float(np.median([p_[0] for p_ in pillars if abs(p_[0] - max(q[0] for q in pillars)) < 1]))
zs = sorted(p_[1] for p_ in pillars if abs(p_[0] - cross_x) < 1)
axis_z = (zs[0] + zs[-1]) / 2
row_dz = float(np.mean([abs(p_[1] - axis_z) for p_ in pillars if p_[0] < cross_x - 1]))
assert len(zs) == 6 and len(pillars) == 16, (len(zs), len(pillars))
pillars = [[round(cross_x, 2), round(axis_z + (k - 2.5) * 3.683, 2), 1 if k in (2, 3) else 0] for k in range(6)]
for sgn in (-1, 1):
    pillars += [[round(cross_x - 3.251 * k, 2), round(axis_z + sgn * 3.683 / 2, 2), 0] for k in range(1, 6)]
print('hall axis z', round(axis_z, 2), 'stem rows were +-', round(row_dz, 2), 'now +-1.84', file=sys.stderr)
rows = []
count = [0, 0, 0, 0]
def typ(j, i, z):
    return (0 if z > ZSPLIT else 1) + (2 if sizes[lab[j, i]] * CELL * CELL < 12 else 0)
for j in range(nz):
    z = Z0 + (j + 0.5) * CELL
    row = []; i = 0
    while i < nx:
        if not solid[j, i] or lab[j, i] in pillar_comp: i += 1; continue
        t = typ(j, i, z)
        k = i
        while k < nx and solid[j, k] and lab[j, k] not in pillar_comp and typ(j, k, z) == t: k += 1
        row += [i, k, t]; count[t] += k - i; i = k
    rows.append(row)
out = dict(x0=round(X0, 2), z0=round(Z0, 2), cell=CELL, nx=nx, nz=nz, zSplit=round(ZSPLIT, 2), rows=rows, pillars=pillars)
with open(os.path.join(ROOT, 'js', 'templedata.js'), 'w') as f:
    f.write('// AUTO-GENERATED by tools/geo/temple_plans.py from the published plan of\n'
            "// Khafre's valley temple and the Sphinx Temple (HoremWeb, public domain,\n"
            '// after Lehner and Verner) — do not edit by hand. rows[j] = flat\n'
            '// [i0, i1, type, ...] runs of solid cells along +X (east) at z0 + j*cell;\n'
            '// type 0 valley-temple wall, 1 Sphinx-Temple wall, 2 (unused), 3 Sphinx-Temple pier.\n'
            '// pillars = [x, z, big] centres of the valley temple\'s granite monoliths.\n'
            f'export const TEMPLE_PLAN = {json.dumps(out, separators=(",", ":"))};\n')
print('grid', nx, 'x', nz, 'X', round(X0, 1), round(X1, 1), 'Z', round(Z0, 1), round(Z1, 1), 'cells by type', count,
      'valley pillars', len(pillars), file=sys.stderr)
# preview for checking by eye
Image.fromarray((np.where(solid, 60, 235)).astype(np.uint8)).resize((nx * 4, nz * 4), Image.NEAREST).save('/tmp/claude-0/research/plans/grid.png')
