#!/usr/bin/env python3
"""Drivable road network for traffic, from the cached Overture/OSM segments.

    python3 tools/geo/build_roadnet.py     -> js/roadnet.js

Every mapped road inside the game extent, noded at its junctions, with who may
use it:
  kind 0  public street outside the antiquities fence — cars, taxis,
          microbuses, tuk-tuks, city buses
  kind 1  paved road inside the fence (service / unclassified / tertiary) —
          site shuttle buses and tour coaches only
Footways, paths, tracks, steps and pedestrian areas carry no vehicles and are
left out. Also written: street-lamp positions along the larger streets, and
the mapped bus stops.
Local metres as in js/geodata.js: +X east, +Z south, origin = Khufu's centre.
"""
import json, math, os, pickle, re, sys
import numpy as np
import shapely
from shapely import wkb
from shapely.geometry import LineString, Point
from shapely.ops import unary_union, linemerge

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
geo = json.loads(re.search(r'export const GEO = (\{.*?\});', open(os.path.join(ROOT, 'js', 'geodata.js')).read()).group(1))
ov = pickle.load(open(os.path.join(ROOT, 'tools', 'geo', 'cache', 'overture.pkl'), 'rb'))
TX0, TX1, TZ0, TZ1 = -1500, 1100, -700, 1500


def local(g):
    return shapely.transform(g, lambda c: np.stack(((c[:, 0] - geo['lon0']) * geo['mPerDegLon'], -(c[:, 1] - geo['lat0']) * geo['mPerDegLat']), -1))


def geom(r):
    g = r.get('g') or r['geometry']
    return wkb.loads(g) if isinstance(g, (bytes, bytearray)) else g


fences = [local(geom(r)) for r in ov['infrastructure'] if r['class'] == 'fence' and geom(r).geom_type == 'Polygon']
fence = max(fences, key=lambda g: g.area)                       # the antiquities-zone fence
box = shapely.box(TX0 + 25, TZ0 + 25, TX1 - 25, TZ1 - 25)

# class -> (rank, half carriageway width, speed m/s)
CLS = {'motorway': (5, 7.0, 16), 'trunk': (5, 7.0, 15), 'primary': (4, 6.0, 13), 'secondary': (3, 4.6, 11), 'tertiary': (2, 3.6, 9),
       'residential': (1, 2.6, 6), 'unclassified': (1, 2.8, 7), 'living_street': (1, 2.4, 5), 'service': (0, 2.4, 5)}
lines = {0: {}, 1: {}}
for r in ov['segment']:
    if r['subtype'] != 'road' or r['class'] not in CLS: continue
    g = local(geom(r)).intersection(box)
    if g.is_empty: continue
    for part in getattr(g, 'geoms', [g]):
        if part.geom_type != 'LineString' or part.length < 8: continue
        inside = fence.contains(part.interpolate(0.5, normalized=True))
        if inside and r['class'] not in ('service', 'unclassified', 'tertiary', 'residential'): continue
        if not inside and r['class'] == 'service' and part.length < 40: continue         # driveways and yards
        lines[1 if inside else 0].setdefault(r['class'], []).append(part)

edges = []
for kind in (0, 1):
    for cls, parts in lines[kind].items():
        noded = unary_union(parts)                               # split at junctions within the class
        merged = linemerge(noded) if noded.geom_type != 'LineString' else noded
        for part in getattr(merged, 'geoms', [merged]):
            edges.append((kind, cls, part))
# node everything together so that streets of different classes join
allu = unary_union([e[2] for e in edges])
pieces = list(getattr(allu, 'geoms', [allu]))
tree = shapely.STRtree([e[2] for e in edges])
out = []
for p in pieces:
    if p.length < 4: continue
    mid = p.interpolate(0.5, normalized=True)
    i = tree.nearest(mid)
    kind, cls, _ = edges[i]
    rank, hw, sp = CLS[cls]
    pts = np.round(np.array(p.simplify(1.0).coords) * 2) / 2
    out.append([kind, rank, hw, sp] + pts.ravel().tolist())

# keep the big connected pieces of each kind (drop stubs nobody could drive to)
def key(x, z): return (round(x * 2), round(z * 2))
parent = {}
def find(a):
    while parent.setdefault(a, a) != a:
        parent[a] = parent[parent[a]]; a = parent[a]
    return a
for e in out:
    a, b = key(e[4], e[5]), key(e[-2], e[-1])
    parent[find(a)] = find(b)
comp = {}
for e in out:
    comp.setdefault(find(key(e[4], e[5])), []).append(e)
keep = []
for c in comp.values():
    L = sum(LineString(np.array(e[4:]).reshape(-1, 2)).length for e in c)
    if L > 400: keep += c
out = keep

# street lamps: every ~32 m along both sides of secondary and larger streets, one side of tertiary
lamps = []
for e in out:
    if e[0] != 0 or e[1] < 2: continue
    ls = LineString(np.array(e[4:]).reshape(-1, 2))
    d = 12.0
    k = 0
    while d < ls.length - 6:
        p = ls.interpolate(d); q = ls.interpolate(d + 1.0)
        tx, tz = q.x - p.x, q.y - p.y; n = math.hypot(tx, tz) or 1.0
        sides = (1, -1) if e[1] >= 3 else ((1,) if k % 2 == 0 else (-1,))
        for s in sides:
            lamps.append([round(p.x - tz / n * s * (e[2] + 1.2), 1), round(p.y + tx / n * s * (e[2] + 1.2), 1), round(math.degrees(math.atan2(-tx * s, tz * s)), 0)])      # heading (atan2(z, x)) of the arm, towards the road
        d += 32.0; k += 1
stops = []
for r in ov['infrastructure']:
    if r['class'] in ('bus_stop', 'bus_station', 'stop_position'):
        g = local(geom(r)); c = g.centroid
        if box.contains(c): stops.append([round(c.x, 1), round(c.y, 1)])

fl = lambda v: json.dumps(v, separators=(',', ':'))
with open(os.path.join(ROOT, 'js', 'roadnet.js'), 'w') as f:
    f.write('// AUTO-GENERATED by tools/geo/build_roadnet.py from (c) OpenStreetMap contributors (ODbL), via Overture Maps.\n')
    f.write('// ROADS: [kind (0 public street, 1 site road: shuttles and coaches only), rank, half width m, speed m/s, x, z, x, z, ...]\n')
    f.write(f'export const ROADS = {fl(out)};\n')
    f.write('// street lamps [x, z, heading deg], bus stops [x, z]\n')
    f.write(f'export const LAMPS = {fl(lamps)};\nexport const BUS_STOPS = {fl(stops)};\n')
km = lambda k: sum(LineString(np.array(e[4:]).reshape(-1, 2)).length for e in out if e[0] == k) / 1000
print('edges', len(out), 'public %.1f km' % km(0), 'site %.1f km' % km(1), 'lamps', len(lamps), 'stops', len(stops), 'bytes', os.path.getsize(os.path.join(ROOT, 'js', 'roadnet.js')), file=sys.stderr)
