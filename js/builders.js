import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DEG } from './data.js';

// ---------------------------------------------------------------------
//  Low-level helpers
// ---------------------------------------------------------------------

// Triangulate a 2D outline (with optional rectangular holes) into a
// ShapeGeometry, then lift each (s,y) vertex onto a pyramid face plane.
// `map(s,y) -> [x,y,z]` and `uv(s,y) -> [u,v]`.
function facePiece(outline, holes, map, uv, normal) {
  const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
  for (const h of holes || []) {
    const path = new THREE.Path(h.map(p => new THREE.Vector2(p.x, p.y)));
    shape.holes.push(path);
  }
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  const uvs = [];
  const nrm = [];
  const n = normal.clone().normalize();
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getX(i), y = pos.getY(i);
    const [X, Y, Z] = map(s, y);
    pos.setXYZ(i, X, Y, Z);
    const [u, v] = uv(s, y);
    uvs.push(u, v);
    nrm.push(n.x, n.y, n.z);              // flat outward normal for the face
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return geo;
}

// Build the four sloped faces of a (possibly truncated) pyramid.
// opts: { yRange:[y0,y1], hole:{s0,s1,y0,y1}, scale }
export function buildPyramidGeometry(b, h, opts = {}) {
  // `truncate` lops the apex off at that height and adds a flat top platform
  // (the Great Pyramid lost its capstone, leaving a flat ~10 m top).
  const [y0, y1] = opts.yRange || [0, opts.truncate || h];
  const k = opts.scale || 1;
  const W = y => (b / 2) * (1 - y / h);          // half-width at height y
  const z0 = -b / 2, dzdy = (b / 2) / h;          // north plane: z = z0 + dzdy*y

  // outline of one face in (s = horizontal param, y) space
  const outline = [
    { x: -W(y0), y: y0 }, { x: W(y0), y: y0 },
    { x: W(y1), y: y1 }, { x: -W(y1), y: y1 }
  ];
  const uv = (s, y) => [(s + b / 2) / b, y / h];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const north = facePiece(outline, opts.hole ? [[
    { x: opts.hole.s0, y: opts.hole.y0 }, { x: opts.hole.s1, y: opts.hole.y0 },
    { x: opts.hole.s1, y: opts.hole.y1 }, { x: opts.hole.s0, y: opts.hole.y1 }
  ]] : null,
    (s, y) => [s * k, y, (z0 + dzdy * y) * k], uv, V(0, dzdy, -1));
  const south = facePiece(outline, null,
    (s, y) => [s * k, y, -(z0 + dzdy * y) * k], uv, V(0, dzdy, 1));
  const east = facePiece(outline, null,
    (s, y) => [-(z0 + dzdy * y) * k, y, s * k], uv, V(1, dzdy, 0));
  const west = facePiece(outline, null,
    (s, y) => [(z0 + dzdy * y) * k, y, s * k], uv, V(-1, dzdy, 0));

  const faces = [north, south, east, west];
  if (opts.truncate && !opts.yRange) {
    // Flat top platform at the truncation height.
    const Wt = W(y1) * k, ty = y1;
    const top = new THREE.PlaneGeometry(Wt * 2, Wt * 2);
    top.rotateX(-Math.PI / 2);
    top.translate(0, ty, 0);
    faces.push(top);
  }
  return mergeGeometries(faces, false);
}

// ---------------------------------------------------------------------
//  Stepped pyramid: the casing-stripped core as it stands today — real
//  courses of blocks, each a vertical riser with a horizontal tread, thick
//  at the base and thinning upward with the occasional thick course. The
//  stepped solid is inscribed in the smooth pyramid (the outer top edge of
//  every course lies on the original face plane), so the smooth geometry
//  can stay as the collider. Group 0 = risers, group 1 = treads.
//  opts: { truncate, yRange:[y0,y1], hole:{s0,s1,y0,y1}, courseScale, seed }
// ---------------------------------------------------------------------
export function buildSteppedPyramidGeometry(b, h, opts = {}) {
  const top = opts.yRange ? opts.yRange[1] : (opts.truncate || h);
  const bottom = opts.yRange ? opts.yRange[0] : 0;
  const W = y => Math.max(0, (b / 2) * (1 - y / h));
  let seed = (opts.seed || 1) | 0;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const k = opts.courseScale || 1;
  const courses = [];
  let y = bottom, i = 0;
  while (y < top - 0.02 && W(y) > 0.3) {
    let ch = k * (0.6 + 0.9 * Math.exp(-i / 40) + (rand() < 0.07 ? 0.45 : 0) + (rand() - 0.5) * 0.14);
    if (y + ch > top) ch = top - y;
    courses.push({ y0: y, y1: y + ch, uoff: rand() * 8 });
    y += ch; i++;
  }
  const rp = [], ru = [], rn = [];          // risers
  const tp = [], tu = [], tn = [];          // treads
  // Push a quad (a,b,c,d in order) with a required outward normal; flips winding if needed.
  const quad = (P, U, N, a, b2, c, d, uva, uvb, uvc, uvd, n) => {
    const ab = [b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const flip = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0;
    const tri = (p, q, r, up, uq, ur) => {
      if (flip) { P.push(...p, ...r, ...q); U.push(...up, ...ur, ...uq); }
      else { P.push(...p, ...q, ...r); U.push(...up, ...uq, ...ur); }
      for (let j = 0; j < 3; j++) N.push(...n);
    };
    tri(a, b2, c, uva, uvb, uvc); tri(a, c, d, uva, uvc, uvd);
  };
  // Face frames: pos(s, d, y) with s along the face and d the outward distance.
  const faces = [
    { pos: (s, d, yy) => [s, yy, -d], n: [0, 0, -1], north: true },
    { pos: (s, d, yy) => [s, yy, d], n: [0, 0, 1] },
    { pos: (s, d, yy) => [d, yy, s], n: [1, 0, 0] },
    { pos: (s, d, yy) => [-d, yy, s], n: [-1, 0, 0] }
  ];
  const hole = opts.hole;
  for (let c = 0; c < courses.length; c++) {
    const co = courses[c], Wr = W(co.y1), Wn = c + 1 < courses.length ? W(courses[c + 1].y1) : W(top);
    const ch = co.y1 - co.y0, blockW = Math.max(1.0, 1.15 * ch);
    for (const f of faces) {
      // riser: [-Wr, Wr] at distance Wr, possibly split around the entrance hole
      const spans = [[-Wr, Wr]];
      const cut = f.north && hole && co.y1 > hole.y0 && co.y0 < hole.y1;
      if (cut) { spans.length = 0; if (hole.s0 > -Wr) spans.push([-Wr, Math.min(hole.s0, Wr)]); if (hole.s1 < Wr) spans.push([Math.max(hole.s1, -Wr), Wr]); }
      for (const [s0, s1] of spans) {
        if (s1 - s0 < 0.01) continue;
        const u0 = (s0 + Wr) / blockW + co.uoff, u1 = (s1 + Wr) / blockW + co.uoff;
        // v carries the course index in its integer part (the texture wraps
        // per unit, and the shader uses floor(v) to vary each course).
        quad(rp, ru, rn, f.pos(s0, Wr, co.y0), f.pos(s1, Wr, co.y0), f.pos(s1, Wr, co.y1), f.pos(s0, Wr, co.y1),
          [u0, c], [u1, c], [u1, c + 1], [u0, c + 1], f.n);
      }
      // tread: ring segment at y1 from d=Wr (outer) to d=Wn (inner)
      if (Wr - Wn < 0.005) continue;
      const tspans = [[-1, 1]];
      const tcut = f.north && hole && co.y1 > hole.y0 && co.y1 < hole.y1;
      if (tcut) { tspans.length = 0; tspans.push([-1, Math.max(-1, hole.s0 / Wr)]); tspans.push([Math.min(1, hole.s1 / Wr), 1]); }
      for (const [k0, k1] of tspans) {
        if (k1 - k0 < 0.001) continue;
        const o0 = f.pos(k0 * Wr, Wr, co.y1), o1 = f.pos(k1 * Wr, Wr, co.y1);
        const i1 = f.pos(k1 * Wn, Wn, co.y1), i0 = f.pos(k0 * Wn, Wn, co.y1);
        const uv = p => [p[0] / 1.7, p[2] / 1.7];
        quad(tp, tu, tn, o0, o1, i1, i0, uv(o0), uv(o1), uv(i1), uv(i0), [0, 1, 0]);
      }
    }
  }
  // Top platform (truncated summit) — or a small cap where the courses stop.
  if (!opts.yRange || opts.truncate) {
    const Wt = W(courses.length ? courses[courses.length - 1].y1 : top), yt = courses.length ? courses[courses.length - 1].y1 : top;
    if (Wt > 0.05) {
      const uv = p => [p[0] / 1.7, p[2] / 1.7];
      const a = [-Wt, yt, -Wt], b2 = [Wt, yt, -Wt], c = [Wt, yt, Wt], d = [-Wt, yt, Wt];
      quad(tp, tu, tn, a, b2, c, d, uv(a), uv(b2), uv(c), uv(d), [0, 1, 0]);
    }
  }
  const mk = (P, U, N) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    return g;
  };
  const merged = mergeGeometries([mk(rp, ru, rn), mk(tp, tu, tn)], true);
  return merged;
}

// A box slab oriented along an arbitrary direction, returned in world/local
// coords. `localOffset` shifts the box within the segment's frame.
function slab(mid, basis, sx, sy, sz, ox, oy, oz) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(ox, oy, oz);
  const m = new THREE.Matrix4().makeBasis(basis.right, basis.up, basis.dir);
  m.setPosition(mid.x, mid.y, mid.z);
  g.applyMatrix4(m);
  return g;
}

// A hollow rectangular tube from a to b (open at both ends).
export function buildTube(a, b, w, h, overlap = 0.4, t = 0.5) {
  const A = new THREE.Vector3(a.x, a.y, a.z);
  const B = new THREE.Vector3(b.x, b.y, b.z);
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length() + overlap;
  dir.normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  let right = new THREE.Vector3().crossVectors(worldUp, dir);
  if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(dir, right).normalize();
  const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
  const basis = { right, up, dir };

  const parts = [
    slab(mid, basis, w + 2 * t, t, len, 0, -h / 2 - t / 2, 0),   // floor
    slab(mid, basis, w + 2 * t, t, len, 0, h / 2 + t / 2, 0),    // ceiling
    slab(mid, basis, t, h, len, -w / 2 - t / 2, 0, 0),           // left wall
    slab(mid, basis, t, h, len, w / 2 + t / 2, 0, 0)             // right wall
  ];
  return mergeGeometries(parts, false);
}

// A flat panel (thickness t in local Z) with a centred rectangular hole.
function panelWithHole(width, height, t, holeW, holeH) {
  const hx = holeW / 2, hy = holeH / 2;
  const left = new THREE.BoxGeometry(width / 2 - hx, height, t);
  left.translate(-(hx + (width / 2 - hx) / 2), 0, 0);
  const right = new THREE.BoxGeometry(width / 2 - hx, height, t);
  right.translate(hx + (width / 2 - hx) / 2, 0, 0);
  const bottom = new THREE.BoxGeometry(holeW, height / 2 - hy, t);
  bottom.translate(0, -(hy + (height / 2 - hy) / 2), 0);
  const top = new THREE.BoxGeometry(holeW, height / 2 - hy, t);
  top.translate(0, hy + (height / 2 - hy) / 2, 0);
  return mergeGeometries([left, right, bottom, top], false);
}

// Build a sealed rectangular room. `doors` = ['north', ...] cut openings.
// opts: { gabled:true } for a peaked ceiling.
export function buildRoom(center, sx, sy, sz, doors = [], opts = {}) {
  const t = 0.6, dw = opts.doorW || 1.8, dh = opts.doorH || 2.2;
  const has = f => doors.includes(f);
  const geoms = [];
  const place = (geo, rot, px, py, pz) => {
    if (rot) geo.applyMatrix4(rot);
    geo.translate(px, py, pz);
    geoms.push(geo);
  };
  const rotY = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const rotX = new THREE.Matrix4().makeRotationX(Math.PI / 2);

  // North / South walls (span X x Y, thickness Z)
  place(has('north') ? panelWithHole(sx, sy, t, dw, dh) : new THREE.BoxGeometry(sx, sy, t),
    null, 0, 0, -sz / 2);
  place(has('south') ? panelWithHole(sx, sy, t, dw, dh) : new THREE.BoxGeometry(sx, sy, t),
    null, 0, 0, sz / 2);
  // East / West walls (span Z x Y, thickness X)
  place(has('east') ? panelWithHole(sz, sy, t, dw, dh) : new THREE.BoxGeometry(sz, sy, t),
    rotY, sx / 2, 0, 0);
  place(has('west') ? panelWithHole(sz, sy, t, dw, dh) : new THREE.BoxGeometry(sz, sy, t),
    rotY, -sx / 2, 0, 0);
  // Floor
  place(new THREE.BoxGeometry(sx, sz, t), rotX, 0, -sy / 2, 0);
  // Ceiling — flat or gabled
  if (opts.gabled) {
    const ridge = sy * 0.45;
    const slantLen = Math.hypot(sz / 2, ridge);
    const angle = Math.atan2(ridge, sz / 2);
    const north = new THREE.BoxGeometry(sx, t, slantLen);
    north.applyMatrix4(new THREE.Matrix4().makeRotationX(-angle));
    north.translate(0, sy / 2 + ridge / 2, -sz / 4);
    geoms.push(north);
    const south = new THREE.BoxGeometry(sx, t, slantLen);
    south.applyMatrix4(new THREE.Matrix4().makeRotationX(angle));
    south.translate(0, sy / 2 + ridge / 2, sz / 4);
    geoms.push(south);
  } else {
    place(new THREE.BoxGeometry(sx, sz, t), rotX, 0, sy / 2, 0);
  }

  const merged = mergeGeometries(geoms, false);
  merged.translate(center.x, center.y, center.z);
  return merged;
}

// A simple granite sarcophagus (open box) at a local position.
export function buildSarcophagus(center) {
  const g = new THREE.Group();
  const W = 2.28, H = 1.05, L = 0.98, wall = 0.16;
  const make = (sx, sy, sz, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz));
    m.position.set(x, y, z);
    return m;
  };
  // floor + 4 walls (lidless)
  g.add(make(W, 0.18, L, 0, 0.09, 0));
  g.add(make(W, H, wall, 0, H / 2, L / 2 - wall / 2));
  g.add(make(W, H, wall, 0, H / 2, -L / 2 + wall / 2));
  g.add(make(wall, H, L, W / 2 - wall / 2, H / 2, 0));
  g.add(make(wall, H, L, -W / 2 + wall / 2, H / 2, 0));
  g.position.set(center.x, center.y + 0.01, center.z);
  return g;
}

// External staircase of steps climbing a face up to an entrance point.
export function buildStaircase(from, to, width = 2.4) {
  const A = new THREE.Vector3(from.x, from.y, from.z);
  const B = new THREE.Vector3(to.x, to.y, to.z);
  const horiz = Math.hypot(B.x - A.x, B.z - A.z);
  const rise = B.y - A.y;
  const steps = Math.max(4, Math.round(rise / 0.25));
  const geoms = [];
  for (let i = 0; i < steps; i++) {
    const f = i / steps, f2 = (i + 1) / steps;
    const x = A.x + (B.x - A.x) * f, z = A.z + (B.z - A.z) * f;
    const y = A.y + rise * f2;                       // top of this step
    const depthDir = new THREE.Vector3(B.x - A.x, 0, B.z - A.z).normalize();
    const stepDepth = horiz / steps + 0.15;
    const g = new THREE.BoxGeometry(width, y - A.y + 0.2, stepDepth);
    // orient depth along travel direction
    const ang = Math.atan2(depthDir.x, depthDir.z);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(ang));
    g.translate(x, (y + A.y) / 2 - 0.1, z);
    geoms.push(g);
  }
  return mergeGeometries(geoms, false);
}

// ---------------------------------------------------------------------
//  Continuous swept corridor along a polyline path. The floor is the path
//  itself; the ceiling/walls are offset by the (per-point) height/width.
//  Consecutive cross-sections share vertex positions, so there are NO lips
//  or end-cap walls at the internal bends — the whole run is one smooth,
//  walkable surface. `wallFrom` lets early segments be floor-only (the
//  open outdoor entrance ramp).
// ---------------------------------------------------------------------
export function buildSweptCorridor(path, width, height, wallFrom = 0) {
  const pts = path.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const n = pts.length;
  const W = i => (Array.isArray(width) ? width[i] : width);
  const H = i => (Array.isArray(height) ? height[i] : height);
  const worldUp = new THREE.Vector3(0, 1, 0);
  const sec = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tan = new THREE.Vector3().subVectors(b, a).normalize();
    let r = new THREE.Vector3().crossVectors(worldUp, tan);
    if (r.lengthSq() < 1e-6) r.set(1, 0, 0);
    r.normalize();
    // Vertical walls + a ceiling a fixed VERTICAL height above the floor, so
    // head-room never pinches where the floor changes slope.
    const P = pts[i], w = W(i) / 2, h = H(i);
    const bl = P.clone().addScaledVector(r, -w);
    const br = P.clone().addScaledVector(r, w);
    sec.push({
      bl, br,
      tl: bl.clone().addScaledVector(worldUp, h),
      tr: br.clone().addScaledVector(worldUp, h)
    });
  }
  const pos = [];
  const quad = (a, b, c, d) => pos.push(
    a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
    a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
  for (let i = 0; i < n - 1; i++) {
    const A = sec[i], B = sec[i + 1];
    quad(A.bl, A.br, B.br, B.bl);                 // floor (always)
    if (i >= wallFrom) {
      quad(A.tr, A.tl, B.tl, B.tr);               // ceiling
      quad(A.tl, A.bl, B.bl, B.tl);               // left wall
      quad(A.br, A.tr, B.tr, B.br);               // right wall
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------
//  Assembled interior (corridors + chambers + sarcophagi) in local coords
// ---------------------------------------------------------------------
export function buildInterior(def, mats) {
  const group = new THREE.Group();
  const stoneGeoms = [];
  const graniteGeoms = [];

  for (const c of def.corridors || []) {
    stoneGeoms.push(buildSweptCorridor(c.path, c.w, c.h, c.wallFrom || 0));
  }
  for (const c of def.chambers) {
    const doors = (def.doors || []).filter(d => d.chamberId === c.id).map(d => d.face);
    const room = buildRoom(c.center, c.sx, c.sy, c.sz, doors,
      { gabled: !!c.gabled, doorW: 2.2, doorH: 2.6 });
    (c.id === 'king' ? graniteGeoms : stoneGeoms).push(room);
    if (c.sarcophagus) {
      const sarc = buildSarcophagus({
        x: c.center.x + (c.sarcOffsetX || 0), y: c.center.y - c.sy / 2, z: c.center.z
      });
      sarc.traverse(m => {
        if (m.isMesh) { m.material = mats.interiorGranite; m.userData.collidable = true; }
      });
      group.add(sarc);
    }
  }

  const finish = (geoms, mat) => {
    if (!geoms.length) return;
    // Normalise to non-indexed with position+normal+uv (a zero uv is added
    // where missing) so the merge succeeds and every vertex attribute the
    // shader expects is present.
    const prepared = geoms.map(g => {
      const x = g.index ? g.toNonIndexed() : g;
      if (!x.getAttribute('normal')) x.computeVertexNormals();
      if (!x.getAttribute('uv')) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
      for (const name of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(name)) x.deleteAttribute(name);
      return x;
    });
    const mesh = new THREE.Mesh(mergeGeometries(prepared, false), mat);
    mesh.userData.collidable = true;
    group.add(mesh);
  };
  finish(stoneGeoms, mats.interior);
  finish(graniteGeoms, mats.interiorGranite);
  return group;
}
