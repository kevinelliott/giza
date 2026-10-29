// =====================================================================
//  The Great Sphinx, sculpted.
//  The monument is described as a signed-distance field (smoothly blended
//  lion body, forelegs and paws, haunches, the king's head in its nemes
//  headdress) carved by the real weathering pattern — deep horizontal
//  erosion bands in the soft Member II limestone of the body, a harder,
//  better-kept head — then polygonised once at load with surface nets.
//  Local frame: +X = east (the way it faces), +Y up from the enclosure
//  floor, +Z = south. 73 m paw to tail, 20 m to the top of the head,
//  19 m across the haunches.
// =====================================================================
import * as THREE from 'three';

// ---- SDF primitives ----------------------------------------------------
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
function sdEllipsoid(px, py, pz, rx, ry, rz) {            // cheap, good near the surface
  const k0 = len3(px / rx, py / ry, pz / rz), k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k0 * (k0 - 1) / (k1 || 1e-6);
}
function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r, qz = Math.abs(pz) - bz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h);
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

// ---- value noise -------------------------------------------------------
function hash3(i, j, k) { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash3(i, j, k), hash3(i + 1, j, k), u), l(hash3(i, j + 1, k), hash3(i + 1, j + 1, k), u), v),
    l(l(hash3(i, j, k + 1), hash3(i + 1, j, k + 1), u), l(hash3(i, j + 1, k + 1), hash3(i + 1, j + 1, k + 1), u), v), w);
}

// ---- the figure ----------------------------------------------------------
function sphinxShape(x, y, z) {
  const az = Math.abs(z);                                        // bilateral symmetry
  // long lion body: back rising gently from the haunches to the shoulders
  let d = sdRoundBox(x + 13, y - 5.8 - 0.06 * (x + 13), z, 18, 5.8, 6.4, 3.2);
  d = smin(d, sdEllipsoid(x + 29, y - 5.4, z, 8.6, 6.4, 8.2), 3);           // haunches
  d = smin(d, sdEllipsoid(x - 3.4, y - 6.6, z, 6.4, 6.6, 6.6), 3.0);        // deep chest
  // folded hind legs along the flanks, hind paws tucked forward
  d = smin(d, sdCapsule(x, y, az, -33, 3.2, 7.0, -17, 1.5, 8.0, 2.6, 1.6), 1.6);
  d = smin(d, sdEllipsoid(x + 15, y - 1.2, az - 8.0, 2.8, 1.3, 1.9), 1.0);
  // tail curled along the south (right) flank
  if (z > 0) d = smin(d, Math.min(
    sdCapsule(x, y, z, -37.2, 0.9, 2.5, -33, 0.8, 8.4, 0.75, 0.7),
    sdCapsule(x, y, z, -33, 0.8, 8.4, -24, 0.7, 9.5, 0.7, 0.6)), 0.6);
  // forelegs: shoulder down to the elbow, then the long, low, squared-off
  // outstretched forearms (re-cased in masonry) ending in the paws
  d = smin(d, sdCapsule(x, y, az, 2.5, 8.0, 5.2, 9.0, 2.4, 4.9, 3.0, 2.1), 2.0);
  d = smin(d, sdRoundBox(x - 21.5, y - 1.85 + 0.012 * (x - 21.5), az - 4.75, 12.2, 1.85, 2.15, 0.75), 1.4);
  d = smin(d, sdRoundBox(x - 33.6, y - 1.25, az - 4.75, 1.5, 1.25, 2.35, 0.6), 0.5);     // paws
  for (const t of [-1.5, -0.5, 0.5, 1.5])                                              // toes
    d = smin(d, sdEllipsoid(x - 35.2, y - 0.75, az - 4.75 - t * 1.05, 0.55, 0.7, 0.48), 0.25);
  // neck
  d = smin(d, sdCapsule(x, y, z, 6.0, 10.0, 0, 9.4, 14.0, 0, 3.0, 2.4), 1.6);
  // the royal head: face 4.1 m wide and ~5 m chin to brow
  let head = sdRoundBox(x - 11.4, y - 16.5, z, 2.2, 2.6, 2.0, 1.1);
  head = smin(head, sdEllipsoid(x - 13.4, y - 17.9, z, 0.45, 0.4, 1.75), 0.35);          // brow ridge
  head = smin(head, sdEllipsoid(x - 13.45, y - 14.75, z, 0.4, 0.32, 1.0), 0.25);         // lips
  head = smin(head, sdEllipsoid(x - 13.0, y - 14.15, z, 0.7, 0.55, 1.15), 0.4);          // chin
  // nemes headcloth: narrow over the crown, flaring to ~8.8 m across at the
  // shoulders; its flat front stands ~1.6 m behind the face, with the band
  // across the brow
  const t = Math.min(1, Math.max(0, (19.3 - y) / 7.3));
  const fw = 2.45 + 1.95 * t * t * (3 - 2 * t);
  let nemes = sdRoundBox(x - 9.9 + 0.1 * (16 - y), y - 15.85, 0, 2.15, 4.05, 1, 0.7);
  nemes = smax(nemes, az - fw, 0.5);
  nemes = smin(nemes, sdRoundBox(x - 13.0, y - 18.55, z, 0.8, 0.4, 2.15, 0.25), 0.3);    // brow band
  nemes = smin(nemes, sdCapsule(x, y, z, 7.9, 18.6, 0, 6.6, 12.6, 0, 1.4, 1.8), 0.8);    // cloth tail behind
  d = smin(d, smin(head, nemes, 0.3), 0.6);
  // ears, in front of the flaps
  d = smin(d, sdEllipsoid(x - 12.3, y - 16.6, az - 2.25, 0.5, 0.95, 0.4), 0.25);
  // carve: the lost nose, eye sockets, mouth line, the ridges of the headcloth stripes
  d = smax(d, -sdRoundBox(x - 13.95, y - 16.35, z, 0.8, 0.95, 0.65, 0.3), 0.3);
  d = smax(d, -sdEllipsoid(x - 13.6, y - 17.35, az - 1.0, 0.42, 0.3, 0.6), 0.15);
  d = smax(d, -sdRoundBox(x - 13.75, y - 14.95, z, 0.5, 0.06, 0.95, 0.04), 0.06);
  if (y > 12 && y < 20.3) {
    const stripe = Math.abs(((y * 2.6) % 1 + 1) % 1 - 0.5);                             // horizontal nemes pleats
    const onCloth = (az > 2.3 || x < 10.6 || y > 18.95) ? 1 : 0;
    d += onCloth * Math.max(0, 0.12 - stripe * 0.5);
  }
  // the space between the forelegs is open down to the floor in front of the chest
  d = smax(d, -sdRoundBox(x - 21, y - 2.6, z, 12.5, 3.2, 2.25, 1.0), 1.0);
  return d;
}

// Weathering: deep, wavy horizontal recesses in the body's soft layers,
// a pitted surface everywhere, and much less damage on the head.
function erosion(x, y, z) {
  const head = Math.min(1, Math.max(0, (y - 12.5) / 2.5));
  const band = Math.pow(Math.abs(Math.sin((y + 0.35 * noise3(x * 0.15, y * 0.3, z * 0.15)) * Math.PI / 1.35)), 6);
  const memberII = Math.min(1, Math.max(0, (11.5 - y) / 3)) * Math.min(1, Math.max(0, (y - 2.3) / 1.2)) *
    Math.min(1, Math.max(0, (10 - x) / 3 + (y - 5) / 2));          // not the re-cased forelegs
  const pits = noise3(x * 0.9, y * 0.9, z * 0.9) * 0.35 + noise3(x * 2.3, y * 2.3, z * 2.3) * 0.12;
  const depth = 0.35 + 0.45 * noise3(x * 0.06 + 3, y * 0.4, z * 0.06);
  return band * depth * 1.2 * memberII + (pits - 0.2) * (1 - 0.6 * head);
}

export const SPHINX_BOUNDS = { x0: -38.5, x1: 36.5, y0: 0, y1: 21, z0: -10.5, z1: 10.5 };
const sdf = (x, y, z) => Math.max(sphinxShape(x, y, z) + erosion(x, y, z), -y);

// ---- surface nets ------------------------------------------------------
export function buildSphinxGeometry(cell = 0.42) {
  const B = SPHINX_BOUNDS;
  const nx = Math.ceil((B.x1 - B.x0) / cell) + 1, ny = Math.ceil((B.y1 - B.y0 + 1) / cell) + 1, nz = Math.ceil((B.z1 - B.z0) / cell) + 1;
  const ox = B.x0, oy = B.y0 - 0.6, oz = B.z0;
  const F = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = ox + i * cell, y = oy + j * cell, z = oz + k * cell;
    // cheap reject far outside the figure
    const far = sdRoundBox(x + 1, y - 10, z, 37, 11, 10, 2);
    F[id(i, j, k)] = far > 2.5 ? far : sdf(x, y, z);
  }
  const vIndex = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = F[id(i + corner[c][0], j + corner[c][1], k + corner[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
      sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
      sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
      n++;
    }
    vIndex[id(i, j, k)] = pos.length / 3;
    pos.push(ox + (i + sx / n) * cell, oy + (j + sy / n) * cell, oz + (k + sz / n) * cell);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const f0 = F[id(i, j, k)] < 0;
    if (f0 !== (F[id(i + 1, j, k)] < 0))        // x edge -> cells sharing it in y/z
      quad(vIndex[id(i, j - 1, k - 1)], vIndex[id(i, j, k - 1)], vIndex[id(i, j, k)], vIndex[id(i, j - 1, k)], !f0);
    if (f0 !== (F[id(i, j + 1, k)] < 0))
      quad(vIndex[id(i - 1, j, k - 1)], vIndex[id(i - 1, j, k)], vIndex[id(i, j, k)], vIndex[id(i, j, k - 1)], !f0);
    if (f0 !== (F[id(i, j, k + 1)] < 0))
      quad(vIndex[id(i - 1, j - 1, k)], vIndex[id(i, j - 1, k)], vIndex[id(i, j, k)], vIndex[id(i - 1, j, k)], !f0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // Colour: the strata of the carved rock (greyer, harder bands low down,
  // the yellower Member II body, a paler head), the pale restoration
  // masonry wrapped round the base and paws, and baked occlusion.
  const nrm = geo.attributes.normal, col = new Float32Array(pos.length);
  for (let i = 0; i < pos.length / 3; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const s = noise3(x * 0.3, y * 2.2, z * 0.3);
    let r = 0.74, g = 0.6, b = 0.42;
    const strat = 0.86 + 0.14 * Math.sin(y * 4.4 + s * 2.5);
    r *= strat; g *= strat; b *= strat * 0.97;
    if (y > 12.5) { r *= 1.06; g *= 1.05; b *= 1.02; }                       // the head
    const restored = y < 2.6 + 0.4 * s || (x > 9 && y < 4.2 && Math.abs(z) > 2.5);
    if (restored) { r = 0.82 + 0.06 * s; g = 0.74 + 0.05 * s; b = 0.6 + 0.04 * s; }
    const nx_ = nrm.getX(i), ny_ = nrm.getY(i), nz_ = nrm.getZ(i);
    const ao = Math.min(1, Math.max(0.35, sdf(x + nx_ * 1.4, y + ny_ * 1.4, z + nz_ * 1.4) / 1.4));
    const k = (0.45 + 0.55 * ao) * (0.94 + 0.12 * noise3(x * 1.7, y * 1.7, z * 1.7));
    col[i * 3] = Math.pow(r * k, 2.2); col[i * 3 + 1] = Math.pow(g * k, 2.2); col[i * 3 + 2] = Math.pow(b * k, 2.2);   // sRGB -> linear
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Material: vertex-coloured rock with a fine pitted bump and the joints of
// the restoration blocks drawn on the lowest band.
export function sphinxMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, envMapIntensity: 0.3 });
  m.userData.shaderPatch = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLp;
        float sxH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float sxN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(sxH(i), sxH(i + vec3(1,0,0)), f.x), mix(sxH(i + vec3(0,1,0)), sxH(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(sxH(i + vec3(0,0,1)), sxH(i + vec3(1,0,1)), f.x), mix(sxH(i + vec3(0,1,1)), sxH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sxR = step(vLp.y, 2.7) + step(9.0, vLp.x) * step(vLp.y, 4.2) * step(2.5, abs(vLp.z));
        if (sxR > 0.5) {                                   // restoration block joints
          float row = floor(vLp.y / 0.55);
          float u = (abs(vLp.z) > 4.0 ? vLp.x : vLp.z + vLp.x * 0.0) + row * 0.45;
          float jv = smoothstep(0.035, 0.0, abs(fract(vLp.y / 0.55) - 0.5) - 0.465);
          float ju = smoothstep(0.03, 0.0, abs(fract(u / 0.9) - 0.5) - 0.47);
          diffuseColor.rgb *= 1.0 - 0.35 * max(jv, ju);
        }
        diffuseColor.rgb *= 0.9 + 0.2 * sxN(vLp * 3.1);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 sxP = vLp * 2.6;
        float sx0 = sxN(sxP), sxX = sxN(sxP + vec3(0.07, 0.0, 0.0)), sxY = sxN(sxP + vec3(0.0, 0.07, 0.0));
        normal = normalize(normal + vec3(sx0 - sxX, sx0 - sxY, 0.0) * 2.2);`);
  };
  m.customProgramCacheKey = () => 'giza-sphinx';
  return m;
}
