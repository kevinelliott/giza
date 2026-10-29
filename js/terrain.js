// =====================================================================
//  Real plateau topography.
//  Heights come from the Copernicus 30 m elevation model (see geodata.js),
//  re-referenced so Y = 0 is the base of the Great Pyramid. The ancient
//  builders levelled platforms for the pyramids and quarried the Sphinx
//  out of the slope, so those footprints are flattened ("pads") on top of
//  the measured surface. Everything is baked once into a 10 m vertex grid
//  that is both the rendered mesh and the exact height lookup.
// =====================================================================
import { DEM, EXTENT } from './geodata.js';
import {
  PYRAMIDS, QUEENS_KHUFU, QUEENS_MENKAURE, SATELLITES, SPHINX, KHENTKAUS,
  KHAFRE_VALLEY, SPHINX_TEMPLE, MENKAURE_VALLEY, TELEPORTS, ARTIFACTS
} from './data.js';

// ---- the measured surface --------------------------------------------
const raw = (() => {
  const bin = atob(DEM.b64);
  const a = new Int16Array(bin.length / 2);
  for (let i = 0; i < a.length; i++) {
    const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    a[i] = v > 32767 ? v - 65536 : v;
  }
  return a;
})();
const demAt = (i, j) => {
  i = Math.min(DEM.nx - 1, Math.max(0, i)); j = Math.min(DEM.nz - 1, Math.max(0, j));
  return raw[j * DEM.nx + i] / 10;
};
const cr = (p0, p1, p2, p3, t) =>          // Catmull-Rom
  p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
export function demHeight(x, z) {
  const fx = (x - DEM.x0) / DEM.step, fz = (z - DEM.z0) / DEM.step;
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const row = jj => cr(demAt(i - 1, jj), demAt(i, jj), demAt(i + 1, jj), demAt(i + 2, jj), tx);
  return cr(row(j - 1), row(j), row(j + 1), row(j + 2), tz);
}

// ---- levelled platforms ----------------------------------------------
// { x, z, hx, hz (half sizes), y, m (blend margin) }
const PADS = [];
const pad = (c, hx, hz, y, m) => PADS.push({ x: c.x, z: c.z, hx, hz: hz ?? hx, y, m });
for (const p of Object.values(PYRAMIDS)) pad(p.center, p.base / 2 + 18, null, p.baseY, 55);
for (const q of [...QUEENS_KHUFU, ...QUEENS_MENKAURE, ...SATELLITES]) pad(q.center, q.base / 2 + 4, null, q.baseY, 14);
pad(KHENTKAUS.center, KHENTKAUS.base / 2 + 5, null, KHENTKAUS.baseY, 16);
pad(MENKAURE_VALLEY.center, 30, 30, MENKAURE_VALLEY.baseY, 18);
// The Sphinx sits in a pit quarried down to the level of the valley
// temples in front of it; the whole terrace is one level.
export const SPHINX_PIT = {
  x0: SPHINX.center.x - 50, x1: SPHINX.center.x + 46,
  z0: SPHINX.center.z - 27, z1: SPHINX.center.z + 27, y: SPHINX.floorY
};
PADS.push({ x: (SPHINX_PIT.x0 + SPHINX_PIT.x1) / 2, z: SPHINX.center.z,
  hx: (SPHINX_PIT.x1 - SPHINX_PIT.x0) / 2, hz: 27, y: SPHINX.floorY, m: 4 });
const tc = { x: (SPHINX_TEMPLE.center.x + KHAFRE_VALLEY.center.x) / 2, z: (SPHINX_TEMPLE.center.z + KHAFRE_VALLEY.center.z) / 2 };
PADS.push({ x: tc.x + 4, z: tc.z, hx: 34, hz: Math.abs(KHAFRE_VALLEY.center.z - SPHINX_TEMPLE.center.z) / 2 + 30, y: SPHINX.floorY, m: 30 });

const smooth = e => e * e * (3 - 2 * e);
function padWeight(pd, x, z) {
  const dx = Math.max(0, Math.abs(x - pd.x) - pd.hx), dz = Math.max(0, Math.abs(z - pd.z) - pd.hz);
  const d = Math.hypot(dx, dz);
  return d >= pd.m ? 0 : 1 - smooth(d / pd.m);
}

// Tiny value noise for wind-blown ripples/hummocks on top of the 30 m model.
function hash(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = smooth(fx), v = smooth(fz);
  return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v;
}

function surface(x, z) {
  let h = demHeight(x, z), wmax = 0;
  for (const pd of PADS) {
    const w = padWeight(pd, x, z);
    if (w > 0) { h += (pd.y - h) * w; wmax = Math.max(wmax, w); }
  }
  const relief = (vnoise(x * 0.018, z * 0.018) - 0.5) * 1.4 + (vnoise(x * 0.07 + 9, z * 0.07) - 0.5) * 0.35;
  return h + relief * (1 - wmax);
}

// ---- the baked grid (mesh vertices == height lookup) ------------------
export const GRID = (() => {
  const step = 10, x0 = EXTENT.x0, z0 = EXTENT.z0;
  const nx = Math.round((EXTENT.x1 - x0) / step) + 1, nz = Math.round((EXTENT.z1 - z0) / step) + 1;
  const h = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = surface(x0 + i * step, z0 + j * step);
  return { x0, z0, step, nx, nz, h };
})();

// Exact height of the rendered terrain (same two-triangle split per cell
// as the mesh: diagonal from (i, j) to (i+1, j+1)).
export function terrainHeight(x, z) {
  const g = GRID;
  let fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
  fx = Math.min(g.nx - 1.001, Math.max(0, fx)); fz = Math.min(g.nz - 1.001, Math.max(0, fz));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const k = j * g.nx + i;
  const h00 = g.h[k], h10 = g.h[k + 1], h01 = g.h[k + g.nx], h11 = g.h[k + g.nx + 1];
  return v >= u ? h00 + v * (h01 - h00) + u * (h11 - h01)
                : h00 + u * (h10 - h00) + v * (h11 - h10);
}

// Lowest ground under a footprint (so buildings never float on a slope).
export function groundUnder(x, z, hx, hz = hx) {
  let m = Infinity;
  for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]])
    m = Math.min(m, terrainHeight(x + a * hx, z + b * hz));
  return m;
}

// Holes cut in the terrain: under the pyramids (for the passages and
// chambers that run below their bases) and the Sphinx's quarried pit.
const PITS = Object.values(PYRAMIDS).map(p => ({ c: p.center, r: p.base / 2 - (p.id === 'menkaure' ? 2 : 15) }));
export function inPit(x, z) {
  for (const p of PITS) if (Math.hypot(x - p.c.x, z - p.c.z) < p.r) return true;
  const r = SPHINX_PIT;
  return x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
}

// Outdoor teleports/artifacts carry a height above ground; make it absolute.
for (const p of [...TELEPORTS.map(t => t.pos), ...ARTIFACTS.map(a => a.pos)]) {
  if (p.ground) { p.y += terrainHeight(p.x, p.z); delete p.ground; }
}
