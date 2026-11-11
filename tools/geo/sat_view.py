#!/usr/bin/env python3
"""Stitch high-resolution satellite tiles around a point, for MEASURING only.

    python3 tools/geo/sat_view.py 29.97527 31.13757 19 out.jpg [cols rows]

Uses Esri World Imagery (~0.26 m/px at zoom 19 here). The imagery is for
looking at and measuring from — do not commit or redistribute the output.
Record what you measured in research/sites/<site>.md.
"""
import io, math, sys, urllib.request
from PIL import Image

lat, lon, z, out = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
cols, rows = (int(sys.argv[5]), int(sys.argv[6])) if len(sys.argv) > 6 else (5, 3)
n = 2 ** z
x = (lon + 180) / 360 * n
y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
x0, y0 = int(x) - cols // 2, int(y) - rows // 2
img = Image.new('RGB', (256 * cols, 256 * rows))
for i in range(cols):
    for j in range(rows):
        u = f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y0 + j}/{x0 + i}'
        req = urllib.request.Request(u, headers={'User-Agent': 'GizaPlateauSim/1.0 research'})
        img.paste(Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())), (i * 256, j * 256))
img.save(out, quality=90)
mpp = 156543.03392 * math.cos(math.radians(lat)) / n
print(f'{mpp:.4f} m/px; image covers {256 * cols * mpp:.0f} x {256 * rows * mpp:.0f} m; centre pixel = ({(x - x0) * 256:.0f}, {(y - y0) * 256:.0f})')
