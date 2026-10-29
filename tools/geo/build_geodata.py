#!/usr/bin/env python3
"""Build the game's real-world layout data from open satellite/aerial/map data.

Fetches (and caches under tools/geo/cache/):
  * Copernicus GLO-30 DEM tile N29 E031           -> plateau topography
  * Sentinel-2 L2A July 2025 scenes (tile 36RUU)   -> ground colour, vegetation
  * Overture Maps (OpenStreetMap-derived) features -> monuments, tombs, roads, town

Writes:
  js/geodata.js            compact module the game imports
  assets/geo/ground.jpg    macro ground-colour modulation for the sand shader
  assets/geo/roads.png     road (R) / track (G) mask painted by the sand shader
  assets/geo/satellite.jpg true-colour image for the full map
"""
import base64, json, math, os, pickle, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, 'tools', 'geo', 'cache')
os.makedirs(CACHE, exist_ok=True)

# Fetch window (lon/lat) and the game's terrain extent (local metres).
W, S, E, N = 31.105, 29.955, 31.160, 29.995
TX0, TX1, TZ0, TZ1 = -1500, 1100, -700, 1500
DEM_STEP = 20.0          # exported DEM grid spacing (m)
GROUND_PX = 4.0          # ground texture resolution (m / px)
SAT_PX = 2.0             # map image resolution (m / px)
OVERTURE = 'overturemaps-us-west-2/release/2026-10-21.0'
S2_BASE = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/R/UU/2025/7/'
S2_SCENES = ['S2A_36RUU_20250703_0_L2A', 'S2A_36RUU_20250713_0_L2A', 'S2A_36RUU_20250723_0_L2A',
             'S2B_36RUU_20250706_0_L2A', 'S2B_36RUU_20250716_1_L2A', 'S2B_36RUU_20250726_0_L2A',
             'S2C_36RUU_20250701_0_L2A', 'S2C_36RUU_20250711_0_L2A', 'S2C_36RUU_20250721_0_L2A',
             'S2C_36RUU_20250731_0_L2A']
DEM_URL = ('https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N29_00_E031_00_DEM/'
           'Copernicus_DSM_COG_10_N29_00_E031_00_DEM.tif')


def cached(name, fn):
    path = os.path.join(CACHE, name)
    if os.path.exists(path):
        with open(path, 'rb') as f: return pickle.load(f)
    print('fetching', name, file=sys.stderr)
    v = fn()
    with open(path, 'wb') as f: pickle.dump(v, f)
    return v


# ---------------------------------------------------------------- fetch
def fetch_overture():
    import pyarrow.dataset as ds, pyarrow.fs as pfs, pyarrow.compute as pc
    fs = pfs.S3FileSystem(anonymous=True, region='us-west-2')
    out = {}
    for theme, typ in [('buildings', 'building'), ('base', 'land_use'), ('base', 'infrastructure'),
                       ('transportation', 'segment'), ('base', 'land')]:
        d = ds.dataset(f'{OVERTURE}/theme={theme}/type={typ}/', filesystem=fs, format='parquet')
        f = ((pc.field('bbox', 'xmin') < E) & (pc.field('bbox', 'xmax') > W) &
             (pc.field('bbox', 'ymin') < N) & (pc.field('bbox', 'ymax') > S))
        cols = [c for c in ['id', 'geometry', 'names', 'class', 'subtype', 'height', 'num_floors', 'sources']
                if c in d.schema.names]
        t = d.to_table(filter=f, columns=cols).to_pylist()
        for r in t:
            r['src'] = (r.pop('sources') or [{}])[0].get('dataset')
            r['name'] = (r.pop('names') or {}).get('primary')
        out[typ] = t
    return out


def fetch_dem():
    import rasterio
    from rasterio.windows import from_bounds
    with rasterio.open('/vsicurl/' + DEM_URL) as r:
        w = from_bounds(W, S, E, N, r.transform)
        return r.read(1, window=w).astype(np.float32), tuple(r.window_transform(w))[:6]


def fetch_s2():
    import rasterio
    from rasterio.windows import from_bounds
    from pyproj import Transformer
    tr = Transformer.from_crs(4326, 32636, always_xy=True)
    x0, y0 = tr.transform(W, S); x1, y1 = tr.transform(E, N)
    stack, T = [], None
    for s in S2_SCENES:
        bands = []
        for b in ['B04', 'B03', 'B02', 'B08']:
            with rasterio.open('/vsicurl/' + S2_BASE + s + '/' + b + '.tif') as r:
                w = from_bounds(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), r.transform)
                bands.append(r.read(1, window=w, boundless=True, fill_value=0).astype(np.float32))
                if b == 'B04': T = tuple(r.window_transform(w))[:6]
                else: bands[-1] = bands[-1][:bands[0].shape[0], :bands[0].shape[1]]
        a = np.stack(bands, -1)
        if (a[..., :3] == 0).mean() < 0.01: stack.append(a)
    return np.median(np.stack(stack), 0), T


# ---------------------------------------------------------------- geometry
import shapely
from shapely.geometry import Polygon, Point, LineString

ov = cached('overture.pkl', fetch_overture)
dem_raw, dem_T = cached('dem.pkl', fetch_dem)
s2, s2_T = cached('s2.pkl', fetch_s2)

for k in ov:
    for r in ov[k]: r['g'] = shapely.from_wkb(r['geometry'])

# Origin: centroid of the Great Pyramid's footprint.
khufu = max((r for r in ov['building'] if r['name'] == 'هرم خوفو'), key=lambda r: r['g'].area)
LON0, LAT0 = khufu['g'].centroid.x, khufu['g'].centroid.y
KX = 111320.0 * math.cos(math.radians(LAT0))      # m per degree longitude
KZ = 110852.0                                      # m per degree latitude (~30 N)


def xz(lon, lat):
    return (np.asarray(lon) - LON0) * KX, -(np.asarray(lat) - LAT0) * KZ


def ll(x, z):
    return LON0 + np.asarray(x) / KX, LAT0 - np.asarray(z) / KZ


def local(g):
    """shapely geometry in lon/lat -> same geometry in local metres"""
    return shapely.transform(g, lambda c: np.stack(xz(c[:, 0], c[:, 1]), -1))


for k in ov:
    for r in ov[k]: r['L'] = local(r['g'])

blds = ov['building']
by_name = lambda n: [r for r in blds if r['name'] == n]


def centre(g):
    c = g.centroid; return round(c.x, 1), round(c.y, 1)


def side(g):
    return round(math.sqrt(g.area), 1)


def orient(g):
    """min-area rectangle -> (cx, cz, length, width, rotation deg about +Y)"""
    rr = g.minimum_rotated_rectangle
    c = np.array(rr.exterior.coords)[:4]
    e1, e2 = c[1] - c[0], c[2] - c[1]
    l1, l2 = np.hypot(*e1), np.hypot(*e2)
    if l1 < l2: e1, l1, l2 = e2, l2, l1
    ang = math.degrees(math.atan2(e1[1], e1[0]))      # angle of long side from +X toward +Z
    ang = (ang + 90) % 180 - 90
    cx, cz = rr.centroid.x, rr.centroid.y
    return cx, cz, l1, l2, ang


# ---------------------------------------------------------------- DEM
def sample(arr, T, X, Z, to_px):
    c, r = to_px(X, Z, T)
    c0 = np.clip(np.floor(c).astype(int), 0, arr.shape[1] - 2)
    r0 = np.clip(np.floor(r).astype(int), 0, arr.shape[0] - 2)
    fc = np.clip(c - c0, 0, 1); fr = np.clip(r - r0, 0, 1)
    if arr.ndim == 3: fc, fr = fc[..., None], fr[..., None]
    return (arr[r0, c0] * (1 - fc) * (1 - fr) + arr[r0, c0 + 1] * fc * (1 - fr) +
            arr[r0 + 1, c0] * (1 - fc) * fr + arr[r0 + 1, c0 + 1] * fc * fr)


def dem_px(X, Z, T):
    lon, lat = ll(X, Z)
    return (lon - T[2]) / T[0] - 0.5, (lat - T[5]) / T[4] - 0.5




class ndimage:
    """tiny numpy stand-ins for the few scipy.ndimage filters used here"""
    @staticmethod
    def _shifts(a, size):
        r = size // 2
        p = np.pad(a, r, mode='edge')
        for dy in range(size):
            for dx in range(size):
                yield p[dy:dy + a.shape[0], dx:dx + a.shape[1]]

    @staticmethod
    def minimum_filter(a, size):
        return np.min(np.stack(list(ndimage._shifts(a, size))), 0)

    @staticmethod
    def uniform_filter(a, size, mode='nearest'):
        r = size // 2
        c = np.cumsum(np.cumsum(np.pad(a, ((r + 1, r), (r + 1, r)), mode='edge'), 0), 1)
        return (c[size:, size:] - c[:-size, size:] - c[size:, :-size] + c[:-size, :-size]) / (size * size)

    @staticmethod
    def gaussian_filter(a, sigma):
        r = max(1, int(3 * sigma))
        k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
        p = np.pad(a, r, mode='edge')
        p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
        return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)

# 1. Remove buildings/monuments from the surface model (it is a DSM): rasterise
#    footprints onto the DEM grid, take a local minimum there, then fill the
#    big monuments by harmonic (Laplace) inpainting from their surroundings.
H, Wd = dem_raw.shape
lonc = dem_T[2] + (np.arange(Wd) + 0.5) * dem_T[0]
latc = dem_T[5] + (np.arange(H) + 0.5) * dem_T[4]
GX, GZ = xz(*np.meshgrid(lonc, latc))
bmask = np.zeros(dem_raw.shape, bool)
from shapely import prepared
pts = shapely.points(GX.ravel(), GZ.ravel())
big = []
for r in blds:
    g = r['L']
    if g.area > 6000 or r['name'] in ('هرم الملكة',) or 'Pyramid' in (r['name'] or '') or \
            r['name'] in ('Tombe de la Reine Hétep-Hérès Ire', 'هرم خنت كاوس 1'):
        big.append(g.buffer(18))
    elif g.area > 25:
        bmask |= shapely.contains(g.buffer(12), pts).reshape(dem_raw.shape)
dem = dem_raw.copy()
dem_min = ndimage.minimum_filter(dem_raw, size=5)
dem[bmask] = np.minimum(dem[bmask], dem_min[bmask] + 1.0)
mmask = np.zeros(dem.shape, bool)
for g in big: mmask |= shapely.contains(g, pts).reshape(dem.shape)
# Sphinx (a 20 m rock sculpture) also out of the bare-earth model
sph = next(r for r in ov['infrastructure'] if r['name'] == 'أبو الهول' and r['g'].geom_type == 'Polygon')
mmask |= shapely.contains(sph['L'].buffer(15), pts).reshape(dem.shape)
fill = dem.copy()
fill[mmask] = np.median(dem[~mmask])
for _ in range(1500):
    avg = ndimage.uniform_filter(fill, size=3, mode='nearest')
    fill[mmask] = avg[mmask]
dem = ndimage.gaussian_filter(fill, 0.6)

# Datum: Y = 0 at the Great Pyramid's base (median of a ring just outside it).
def ring_elev(cx, cz, half, pad=22):
    a = np.linspace(0, 2 * np.pi, 48, endpoint=False)
    r = half + pad
    v = sample(dem, dem_T, cx + r * np.cos(a), cz + r * np.sin(a), dem_px)
    return float(np.percentile(v, 35))

DATUM = ring_elev(0, 0, 115.2)
print('datum (Khufu base) %.1f m ASL' % DATUM, file=sys.stderr)

# ---------------------------------------------------------------- sites
def poly_by(name, pick=0, key=None):
    c = by_name(name)
    if key: c = sorted(c, key=key)
    return c[pick]['L']

sites = {}
def site(k, g, half=None, **extra):
    x, z = centre(g)
    y = ring_elev(x, z, half or side(g) / 2, 12) - DATUM
    sites[k] = dict(x=x, z=z, y=round(y, 1), **extra)

kh = khufu['L']
site('khufu', kh, 115.2, side=side(kh))
sites['khufu']['y'] = 0.0
site('khafre', poly_by('هرم خفرع'), 107.6)
site('menkaure', poly_by('هرم منقرع'), 51.1)
site('g1a', poly_by('Tombe de la Reine Hétep-Hérès Ire'), 25)
site('g1b', poly_by('Pyramid of Meritites I'), 25)
site('g1c', poly_by('Pyramid of Henutsen princess'), 23)
for i, k in enumerate(['g3a', 'g3b', 'g3c']):                       # east -> west
    site(k, poly_by('هرم الملكة', i, key=lambda r: -r['L'].centroid.x), 20)
site('khafreSat', poly_by('Subsidiary pyramid'), 10)
site('khentkaus', poly_by('هرم خنت كاوس 1'), 23)
site('khafreMortuary', poly_by('المعبد الجنائزي للخفر'), 30)
site('menkaureValley', poly_by('معبد وادي منقرع'), 26)
# Sphinx: the carved body outline; temples: the excavated platforms in front
sx, sz, sl, sw, sa = orient(sph['L'])
sites['sphinx'] = dict(x=round(sx, 1), z=round(sz, 1), len=round(sl, 1), rot=round(sa, 1))
lu = ov['land_use']
def lu_near(x, z, cls):
    return min((r for r in lu if r['class'] == cls), key=lambda r: r['L'].centroid.distance(Point(x, z)))['L']
site('sphinxTemple', lu_near(393, 437, 'pedestrian'), 22)
site('khafreValley', lu_near(395, 492, 'pedestrian'), 22)
amen = min((r for r in blds if r['class'] == 'temple'), key=lambda r: r['L'].centroid.distance(Point(376, 396)))
site('amenhotepTemple', amen['L'], 10)
# Sphinx enclosure floor: the lowest bare ground right around it
a = np.linspace(0, 2 * np.pi, 64, endpoint=False)
sites['sphinx']['floor'] = round(float(np.percentile(
    sample(dem, dem_T, sx + 70 * np.cos(a), sz + 50 * np.sin(a), dem_px), 10)) - DATUM, 1)
crow = next(r for r in ov['infrastructure'] if r['name'] == 'جدار الغراب')['L']
cc = np.array(crow.coords)
sites['wallOfCrow'] = dict(a=[round(cc[0][0], 1), round(cc[0][1], 1)], b=[round(cc[-1][0], 1), round(cc[-1][1], 1)])
quarry = next(r for r in lu if r['class'] == 'quarry')['L']
site('menkaureQuarry', quarry, 60)
cem = min((r for r in lu if r['class'] == 'cemetery'), key=lambda r: r['L'].centroid.distance(Point(389, 761)))['L']
golf = [r['L'] for r in lu if r['subtype'] == 'golf']

# Boat pits: the solar-boat pits flanking Khufu's mortuary temple (+ the one
# beside the causeway), as oriented rectangles.
pits = []
for r in blds:
    if r['name'] == 'مراكب الشمس' or (r['L'].area > 150 and r['L'].centroid.distance(Point(198, -20)) < 20):
        x, z, l, w, ang = orient(r['L'])
        pits.append([round(x, 1), round(z, 1), round(l, 1), round(w, 1), round(ang, 1)])
sites['boatPits'] = pits
sites['cemetery'] = (np.round(np.array(cem.exterior.coords)[:-1]) ).ravel().tolist()
temple_polys = {
    'khafreMortuary': poly_by('المعبد الجنائزي للخفر'),
    'menkaureValley': poly_by('معبد وادي منقرع'),
}

# ---------------------------------------------------------------- tombs & town
fence = next(r for r in ov['infrastructure'] if r['class'] == 'fence' and r['g'].geom_type == 'Polygon'
             and r['g'].area > 1e-5)['L']

def ancient_zone(x, z):
    if -800 < x < -130 and -420 < z < 110: return not (z < -330 and x > -450)   # Western Cemetery
    if 150 < x < 420 and -120 < z < 260: return True                        # Eastern Cemetery
    if -120 < x < 150 and 115 < z < 240: return True                        # south of Khufu
    if -250 < x < 340 and 330 < z < 720: return True                        # Central Field
    if -700 < x < -300 and 600 < z < 1000: return True                      # Menkaure / quarry
    return False

skip_names = {'هرم خوفو', 'هرم خفرع', 'هرم منقرع', 'هرم الملكة', 'Pyramid of Meritites I',
              'Pyramid of Henutsen princess', 'Tombe de la Reine Hétep-Hérès Ire', 'هرم خنت كاوس 1',
              'Subsidiary pyramid', 'مراكب الشمس', 'أبو الهول', 'Boat Pits', 'Osirion', 'mine'}
tombs, town = [], []
def hsh(x, z):
    v = math.sin(x * 12.9898 + z * 78.233) * 43758.5453
    return v - math.floor(v)

def in_extent(g, m=0):
    b = g.bounds
    return b[0] > TX0 + m and b[2] < TX1 - m and b[1] > TZ0 + m and b[3] < TZ1 - m

for r in blds:
    g = r['L']
    if r['name'] in skip_names or r['class'] == 'temple' or g.area < 10 or not in_extent(g, 5): continue
    if g.geom_type != 'Polygon': g = max(g.geoms, key=lambda p: p.area)
    if any(g.distance(Point(p[0], p[1])) < 2 for p in pits): continue
    c = g.centroid
    inside = fence.contains(c)
    if cem.contains(c):
        x, z, l, w, ang = orient(g)                  # modern family tombs in the cemetery
        tombs.append([round(x, 1), round(z, 1), round(l, 1), round(w, 1), round(ang, 1),
                      round(2.4 + 1.2 * hsh(x, z), 1), 1, None])
    elif inside and r['src'] == 'OpenStreetMap' and ancient_zone(c.x, c.y):
        x, z, l, w, ang = orient(g)
        h = min(7.5, max(2.2, 1.6 + math.sqrt(l * w) * 0.22)) * (0.85 + 0.3 * hsh(x, z))
        nm = r['name'] if r['name'] and not r['name'].startswith('هرم') else None
        tombs.append([round(x, 1), round(z, 1), round(l, 1), round(w, 1), round(ang, 1), round(h, 1), 0, nm])
    else:
        gs = g.simplify(0.8, preserve_topology=True)
        if gs.geom_type != 'Polygon' or len(gs.exterior.coords) < 4: continue
        # Height: mapped height/floors if any; otherwise from the surface
        # model — DSM minus the bare-earth model at the footprint gives the
        # local built height (smoothed by the 30 m grid, so it sets the
        # neighbourhood's storey count; a hash varies buildings within it).
        hv = hsh(c.x, c.y)
        nd = float(sample(dem_raw, dem_T, c.x, c.y, dem_px) - sample(dem, dem_T, c.x, c.y, dem_px))
        if r['height'] and r['height'] == r['height']: h = float(r['height'])
        elif r['num_floors']: h = 3.1 * r['num_floors']
        elif g.area < 40: h = 3.1
        else:
            floors = max(1, min(10, round(1.6 + max(0.0, nd) * 0.75 + (hv - 0.5) * 2.2)))
            h = 3.1 * floors
        if inside: h = min(h, 6.5)                   # low site buildings (ticket offices etc.)
        pts_ = np.array(gs.exterior.coords)[:-1]
        if shapely.is_ccw(gs.exterior): pts_ = pts_[::-1]          # consistent winding
        town.append((np.round(pts_ * 2) / 2, round(h, 1), c.x, c.y, nd))
print('tombs', len(tombs), 'town', len(town), file=sys.stderr)
nds = np.array([t[4] for t in town]); hs = np.array([t[1] for t in town])
print('nDSM pct 10/50/90/99: %.1f %.1f %.1f %.1f' % tuple(np.percentile(nds, [10, 50, 90, 99])), file=sys.stderr)
print('height pct 10/50/90/99: %.1f %.1f %.1f %.1f' % tuple(np.percentile(hs, [10, 50, 90, 99])), file=sys.stderr)

# Car/bus parks (where the tour buses gather), as oriented rectangles
parking = []
for r in ov['infrastructure']:
    if r['class'] == 'parking' and r['L'].geom_type == 'Polygon' and in_extent(r['L'], 10) and r['L'].area > 600:
        x, z, l, w, ang = orient(r['L'])
        parking.append([round(x, 1), round(z, 1), round(l, 1), round(w, 1), round(ang, 1)])
print('parking', len(parking), file=sys.stderr)

# ---------------------------------------------------------------- roads
ROAD_W = {'motorway': 20, 'trunk': 16, 'primary': 13, 'secondary': 10, 'tertiary': 8,
          'residential': 6, 'unclassified': 6, 'living_street': 5, 'service': 5,
          'pedestrian': 5, 'footway': 2.4, 'path': 2.2, 'track': 3.5, 'steps': 2.4, 'cycleway': 2.5}
roads = []
for r in ov['segment']:
    if r['subtype'] != 'road' or r['class'] not in ROAD_W: continue
    g = r['L'].intersection(shapely.box(TX0 + 20, TZ0 + 20, TX1 - 20, TZ1 - 20))
    if g.is_empty: continue
    for part in getattr(g, 'geoms', [g]):
        if part.geom_type != 'LineString' or part.length < 6: continue
        p = np.round(np.array(part.simplify(1.2).coords) * 2) / 2
        kind = 1 if r['class'] in ('footway', 'path', 'track', 'steps', 'cycleway') else 0
        roads.append(dict(w=ROAD_W[r['class']], k=kind, p=p.ravel().tolist()))
print('roads', len(roads), file=sys.stderr)

# ---------------------------------------------------------------- imagery
from pyproj import Transformer
_tr = Transformer.from_crs(4326, 32636, always_xy=True)
def s2_px(X, Z, T):
    e, n = _tr.transform(*ll(X, Z))
    return (e - T[2]) / T[0] - 0.5, (n - T[5]) / T[4] - 0.5

def grid(step):
    xs = np.arange(TX0 + step / 2, TX1, step); zs = np.arange(TZ0 + step / 2, TZ1, step)
    return np.meshgrid(xs, zs)

from PIL import Image
# Mask the monuments + their morning shadows (Sentinel-2 passes ~10:30 local:
# shadows fall W-NW) and refill from the surrounding ground.
def monument_mask(X, Z):
    m = np.zeros(X.shape, bool)
    for k, half, hgt in [('khufu', 115, 139), ('khafre', 108, 143), ('menkaure', 51, 62),
                         ('g1a', 25, 30), ('g1b', 25, 30), ('g1c', 23, 28), ('g3a', 22, 28), ('g3b', 16, 21), ('g3c', 16, 21)]:
        s = sites[k]
        dx, dz = X - s['x'], Z - s['z']
        sh = hgt * 0.55
        m |= (dx > -half - 6 - sh) & (dx < half + 6) & (dz > -half - 6 - sh * 0.5) & (dz < half + 6)
    return m

def inpaint_img(img, mask, iters=300):
    out = img.copy()
    out[mask] = np.median(img[~mask], 0)
    for _ in range(iters):
        avg = np.stack([ndimage.uniform_filter(out[..., i], size=5, mode='nearest') for i in range(out.shape[-1])], -1)
        out[mask] = avg[mask]
    # add back a little texture so filled areas are not flat
    return out

Xg, Zg = grid(GROUND_PX)
rgbn = sample(s2, s2_T, Xg, Zg, s2_px)
mask = monument_mask(Xg, Zg)
rgbn = inpaint_img(rgbn, mask, 250)
rgb = rgbn[..., :3]
# Reference: median open-desert colour inside the archaeological site
desert = rgb[(Zg > 150) & (Zg < 1100) & (Xg > -1300) & (Xg < 0) & ~mask]
ref = np.median(desert, 0)
ratio = np.clip(rgb / ref, 0.25, 1.75)
Image.fromarray(np.clip(ratio * 0.5 * 255 + 0.5, 0, 255).astype(np.uint8)).save(
    os.path.join(ROOT, 'assets', 'geo', 'ground.jpg'), quality=88)

Xs, Zs = grid(SAT_PX)
sat = sample(s2, s2_T, Xs, Zs, s2_px)[..., :3]
sat = np.clip(sat / 3600, 0, 1) ** (1 / 1.9)
sat = np.clip((sat - 0.12) * 1.25, 0, 1)
Image.fromarray((sat * 255).astype(np.uint8)).save(os.path.join(ROOT, 'assets', 'geo', 'satellite.jpg'), quality=82)

# Roof colour of every town building straight from the satellite pixel at
# its centre, and a facade style chosen to match it: reddish roofs are the
# unfinished red-brick-and-concrete-frame blocks typical of Nazlet
# el-Samman, pale ones plastered/painted, grey ones bare concrete.
cx_ = np.array([t[2] for t in town]); cz_ = np.array([t[3] for t in town])
roof = sample(s2, s2_T, cx_, cz_, s2_px)[:, :3]
roof = np.clip(roof / 3300, 0, 1) ** (1 / 2.2)
town_roof, town_style = [], []
for (pts_, h, x_, z_, nd), rc in zip(town, roof):
    r_, g_, b_ = rc
    hv = hsh(x_ * 1.7, z_ * 0.3)
    warm = r_ / max(1e-3, b_)
    style = 2 if hv > 0.88 else (0 if warm > 1.32 or hv < 0.35 else 1)
    town_style.append(style)
    town_roof.append(int(min(255, r_ * 255)) << 16 | int(min(255, g_ * 255)) << 8 | int(min(255, b_ * 255)))
print('styles', np.bincount(town_style), file=sys.stderr)

# Vegetation (palms) from NDVI, outside golf fairways and monument pads
X10, Z10 = grid(7.0)
v = sample(s2, s2_T, X10, Z10, s2_px)
ndvi = (v[..., 3] - v[..., 0]) / (v[..., 3] + v[..., 0] + 1e-6)
trees = []
rng = np.random.default_rng(7)
for (i, j) in zip(*np.nonzero(ndvi > 0.28)):
    x, z = X10[i, j] + rng.uniform(-3, 3), Z10[i, j] + rng.uniform(-3, 3)
    if any(gp.contains(Point(x, z)) for gp in golf): continue
    if rng.random() > min(1, (ndvi[i, j] - 0.22) * 2.2): continue
    trees += [round(x, 1), round(z, 1), round(0.75 + rng.random() * 0.6, 2)]
print('trees', len(trees) // 3, file=sys.stderr)

# Roads/tracks rasterised into a mask the ground shader paints from
# (R = paved, G = track) — crisp at any distance, no z-fighting.
from PIL import ImageDraw, ImageFilter
RPX = 1.25
rw, rh = int((TX1 - TX0) / RPX), int((TZ1 - TZ0) / RPX)
layers = [Image.new('L', (rw, rh), 0), Image.new('L', (rw, rh), 0)]
draws = [ImageDraw.Draw(l) for l in layers]
for r in roads:
    pts_ = [((r['p'][i] - TX0) / RPX, (r['p'][i + 1] - TZ0) / RPX) for i in range(0, len(r['p']), 2)]
    wpx = max(1, int(round(r['w'] / RPX)))
    draws[r['k']].line(pts_, fill=255, width=wpx, joint='curve')
    for x_, z_ in pts_:                                   # round the joints/ends
        draws[r['k']].ellipse([x_ - wpx / 2, z_ - wpx / 2, x_ + wpx / 2, z_ + wpx / 2], fill=255)
layers = [l.filter(ImageFilter.GaussianBlur(0.8)) for l in layers]
Image.merge('RGB', [layers[0], layers[1], Image.new('L', (rw, rh), 0)]).save(
    os.path.join(ROOT, 'assets', 'geo', 'roads.png'), optimize=True)

# ---------------------------------------------------------------- DEM export
Xd, Zd = np.meshgrid(np.arange(TX0, TX1 + 0.1, DEM_STEP), np.arange(TZ0, TZ1 + 0.1, DEM_STEP))
hd = sample(dem, dem_T, Xd, Zd, dem_px) - DATUM
dm = np.round(hd * 10).astype('<i2')
dem_b64 = base64.b64encode(dm.tobytes()).decode()

# ---------------------------------------------------------------- write module
def fl(v): return json.dumps(v, separators=(',', ':'), ensure_ascii=False)
town_counts = [len(t[0]) for t in town]
town_pts = np.concatenate([t[0] for t in town]).ravel()
town_pts = [int(v) if v == int(v) else float(v) for v in town_pts]
lines = [
    '// AUTO-GENERATED by tools/geo/build_geodata.py from open satellite, aerial',
    '// and map data — do not edit by hand. Local metres: +X east, +Z south,',
    "// origin = centre of the Great Pyramid's footprint, Y = 0 at its base.",
    '// Sources: Copernicus GLO-30 DEM (© DLR e.V. 2010-2014 and © Airbus Defence',
    '// and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA);',
    '// Sentinel-2 L2A (contains modified Copernicus Sentinel data 2025);',
    '// © OpenStreetMap contributors (ODbL), via Overture Maps.',
    f'export const GEO = {fl(dict(lat0=round(LAT0, 7), lon0=round(LON0, 7), mPerDegLon=round(KX, 1), mPerDegLat=KZ, datumASL=round(DATUM, 1)))};',
    f'export const DEM = {fl(dict(x0=TX0, z0=TZ0, step=DEM_STEP, nx=int(Xd.shape[1]), nz=int(Xd.shape[0])))};',
    f"DEM.b64 = '{dem_b64}';",
    f'export const EXTENT = {fl(dict(x0=TX0, x1=TX1, z0=TZ0, z1=TZ1))};',
    f'export const SITES = {fl(sites)};',
    '// [x, z, length, width, rotationDeg, height, kind(0 ancient, 1 modern cemetery), name]',
    f'export const TOMBS = {fl(tombs)};',
    '// polygon outlines of excavated temples',
    f'export const TEMPLES = {fl({k: (np.round(np.array(g.exterior.coords)[:-1] * 2) / 2).ravel().tolist() for k, g in temple_polys.items()})};',
    '// modern buildings: per-building vertex counts, flat [x,z,...] outline, heights',
    '// (+ roof colour sampled from Sentinel-2, facade style 0 brick-frame / 1 plaster / 2 concrete)',
    f'export const TOWN = {{ n: {fl(town_counts)}, p: {fl(town_pts)}, h: {fl([t[1] for t in town])}, c: {fl(town_roof)}, s: {fl(town_style)} }};',
    '// car/bus parks: [x, z, length, width, rotationDeg]',
    f'export const PARKING = {fl(parking)};',
    '// palms where Sentinel-2 NDVI shows vegetation: flat [x, z, scale, ...]',
    f'export const TREES = {fl(trees)};',
]
with open(os.path.join(ROOT, 'js', 'geodata.js'), 'w') as f:
    f.write('\n'.join(lines) + '\n')
print(json.dumps(sites, indent=1, ensure_ascii=False), file=sys.stderr)
print('geodata.js %.0f KB' % (os.path.getsize(os.path.join(ROOT, 'js', 'geodata.js')) / 1024), file=sys.stderr)
