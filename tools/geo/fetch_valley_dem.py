#!/usr/bin/env python3
"""Fetch the Copernicus GLO-30 elevation model around the Valley of the Kings
and save it as a small grid for tools/blender/valley_kings.py.

    python3 tools/geo/fetch_valley_dem.py     -> tools/geo/cache/valley_dem.npz

Local metres: origin = the entrance of KV62 (lat/lon below), +X east, +Y north.
(c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided
under COPERNICUS by the European Union and ESA.
"""
import math, os, sys
import numpy as np
import rasterio
from rasterio.windows import from_bounds

LAT0, LON0 = 25.74035, 32.60137          # KV62 entrance (see research/sites/valley-of-the-kings.md)
HALF = 1300.0                             # metres each way
KY = 110780.0; KX = 111320.0 * math.cos(math.radians(LAT0))
URL = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N25_00_E032_00_DEM/Copernicus_DSM_COG_10_N25_00_E032_00_DEM.tif'
W, E = LON0 - HALF / KX - 0.001, LON0 + HALF / KX + 0.001
S, N = LAT0 - HALF / KY - 0.001, LAT0 + HALF / KY + 0.001
with rasterio.open('/vsicurl/' + URL) as r:
    w = from_bounds(W, S, E, N, r.transform)
    a = r.read(1, window=w).astype(np.float32); T = tuple(r.window_transform(w))[:6]
# resample to a 20 m local grid
step = 20.0; n = int(2 * HALF / step) + 1
xs = np.linspace(-HALF, HALF, n); ys = np.linspace(-HALF, HALF, n)
X, Y = np.meshgrid(xs, ys)
lon = LON0 + X / KX; lat = LAT0 + Y / KY
c = (lon - T[2]) / T[0] - 0.5; rr = (lat - T[5]) / T[4] - 0.5
c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(rr).astype(int), 0, a.shape[0] - 2)
fc = np.clip(c - c0, 0, 1); fr = np.clip(rr - r0, 0, 1)
h = a[r0, c0] * (1 - fc) * (1 - fr) + a[r0, c0 + 1] * fc * (1 - fr) + a[r0 + 1, c0] * (1 - fc) * fr + a[r0 + 1, c0 + 1] * fc * fr
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache', 'valley_dem.npz')
np.savez_compressed(out, h=h.astype(np.float32), step=step, half=HALF, lat0=LAT0, lon0=LON0)
i0 = n // 2
print('valley DEM', h.shape, 'min %.0f max %.0f, at KV62 %.0f m' % (h.min(), h.max(), h[i0, i0]), 'peak at x %.0f y %.0f' % (xs[np.unravel_index(h.argmax(), h.shape)[1]], ys[np.unravel_index(h.argmax(), h.shape)[0]]), file=sys.stderr)
