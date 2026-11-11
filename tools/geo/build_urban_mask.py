#!/usr/bin/env python3
"""Add the built-up area to the ground mask: assets/geo/roads.png gets a blue
channel that is 1 between and around the town's buildings (their footprints,
grown by ~16 m and softened), so the ground shaders can lay packed earth and
worn asphalt there instead of open desert sand.

    python3 tools/geo/build_urban_mask.py     (after tools/geo/build_geodata.py)
"""
import json, os, re, shutil
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(ROOT, 'js', 'geodata.js')).read()
ext = json.loads(re.search(r'export const EXTENT = (\{.*?\});', src).group(1))
town = re.search(r'export const TOWN = \{ n: (\[.*?\]), p: (\[.*?\]), h: (\[.*?\])', src)
n, p, h = (json.loads(town.group(i)) for i in (1, 2, 3))
path = os.path.join(ROOT, 'assets', 'geo', 'roads.png')
im = Image.open(path).convert('RGB')
W, H = im.size
sx, sz = W / (ext['x1'] - ext['x0']), H / (ext['z1'] - ext['z0'])
mask = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mask)
o = 0
for k, cnt in enumerate(n):
    pts = [((p[o + i * 2] - ext['x0']) * sx, (p[o + i * 2 + 1] - ext['z0']) * sz) for i in range(cnt)]
    o += cnt * 2
    if h[k] > 3.5: d.polygon(pts, fill=255)                       # (not the low huts inside the site)
grow = int(round(16 * sx)) | 1
mask = mask.filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(7 * sx))
# only where buildings are dense: a lone building in the desert keeps its sand
dens = mask.filter(ImageFilter.GaussianBlur(40 * sx)).point(lambda v: 0 if v < 70 else min(255, int((v - 70) * 3.2)))
from PIL import ImageChops
mask = ImageChops.multiply(mask, dens)
r, g, _ = im.split()
Image.merge('RGB', (r, g, mask)).save(path, optimize=True)
shutil.copy(path, os.path.join(ROOT, 'godot', 'textures', 'roads.png'))
print('urban mask written to', path, 'coverage %.1f%%' % (100.0 * sum(mask.histogram()[128:]) / (W * H)))
