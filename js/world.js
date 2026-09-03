import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  PYRAMIDS, QUEENS_KHUFU, QUEENS_MENKAURE, SPHINX,
  KHUFU_INTERIOR, simpleInterior, DEG, KHENTKAUS, WORKERS_VILLAGE,
  WALL_OF_CROW, MENKAURE_VALLEY, KHAFRE_VALLEY,
  SATELLITES, BOAT_PITS, KHUFU_VALLEY,
  TRIAL_PASSAGES, KHENTKAUS_TOWN, WORKERS_CEMETERY, GIS_QUARRY
} from './data.js';
import {
  buildPyramidGeometry, buildInterior, buildStaircase
} from './builders.js';

// Terrain height: a gently undulating plateau, flattened to ~0 around the
// monuments so their bases sit cleanly on the rock.
const FLATTEN = [
  PYRAMIDS.khufu.center, PYRAMIDS.khafre.center, PYRAMIDS.menkaure.center,
  SPHINX.center
];
function smooth(e) { return e * e * (3 - 2 * e); }
function terrainHeight(x, z) {
  let amp = 1;
  let dmin = Infinity;
  for (const c of FLATTEN) dmin = Math.min(dmin, Math.hypot(x - c.x, z - c.z));
  const f = THREE.MathUtils.clamp((dmin - 140) / 200, 0, 1);
  amp = smooth(f);
  const h = 2.2 * Math.sin(x * 0.0016) * Math.cos(z * 0.0014)
    + 1.3 * Math.sin(x * 0.004 + 1.0)
    + 0.9 * Math.cos(z * 0.0052 - 0.5);
  return h * amp;
}

// Pits removed from the terrain mesh beneath the pyramids so the
// below-ground passages and chambers have somewhere to exist.
const PITS = [
  { c: PYRAMIDS.khufu.center, r: 100 },
  { c: PYRAMIDS.khafre.center, r: 105 },
  { c: PYRAMIDS.menkaure.center, r: 49 }
];
const SPHINX_FLOOR = -6;        // the Sphinx sits 6 m below grade in its enclosure
const SPHINX_RECT = {           // terrain removed here for the quarried enclosure
  x0: SPHINX.center.x - 52, x1: SPHINX.center.x + 56,
  z0: SPHINX.center.z - 33, z1: SPHINX.center.z + 33
};
function inPit(x, z) {
  for (const p of PITS) if (Math.hypot(x - p.c.x, z - p.c.z) < p.r) return true;
  const r = SPHINX_RECT;
  if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
  return false;
}

function buildTerrain(mat) {
  const x0 = -1500, x1 = 1100, z0 = -700, z1 = 1500;
  const nx = 150, nz = 130;
  const dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
  const positions = [];
  const uvs = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const ax = x0 + i * dx, az = z0 + j * dz;
      const bx = ax + dx, bz = az + dz;
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      if (inPit(cx, cz)) continue;                 // leave a hole
      const p = (X, Z) => positions.push(X, terrainHeight(X, Z), Z);
      // two triangles per cell
      p(ax, az); p(ax, bz); p(bx, bz);
      p(ax, az); p(bx, bz); p(bx, az);
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / nz, v1 = (j + 1) / nz;
      uvs.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.collidable = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildPyramid(p, mats, collidables, group) {
  const isKhufu = p.id === 'khufu';
  // Interior is computed first so the north-face entrance hole can be cut
  // exactly where the entrance passage begins.
  const def = isKhufu ? KHUFU_INTERIOR : simpleInterior(p);
  const e = def.entrance;
  // The Great Pyramid's doorway runs lower and wider so the entrance ramp can
  // pass cleanly through the face into the descending passage.
  const hole = isKhufu
    ? { s0: e.x - 1.5, s1: e.x + 1.5, y0: e.y - 6.5, y1: e.y + 2.8 }
    : { s0: e.x - 0.9, s1: e.x + 0.9, y0: Math.max(0.2, e.y - 2.4), y1: e.y + 2.4 };
  // Real current state: Khufu lost its capstone (flat top at ~138.8 m);
  // Menkaure's summit is damaged (~62 m); Khafre keeps a near-intact apex.
  const truncate = p.id === 'khufu' ? 138.8 : (p.id === 'menkaure' ? 62 : null);
  const core = buildPyramidGeometry(p.base, p.height,
    truncate ? { hole, truncate } : { hole });
  const mesh = new THREE.Mesh(core, mats.limestone);
  mesh.position.set(p.center.x, 0, p.center.z);
  mesh.userData.collidable = true;
  mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);

  // Surviving casing
  if (p.casing === 'cap') {
    const cap = new THREE.Mesh(
      buildPyramidGeometry(p.base, p.height, { yRange: [p.height * 0.78, p.height], scale: 1.004 }),
      mats.casing);
    cap.position.copy(mesh.position);
    cap.userData.collidable = true; cap.castShadow = true;
    group.add(cap); collidables.push(cap);
  }
  if (p.casing === 'lowerGranite') {
    const band = new THREE.Mesh(
      buildPyramidGeometry(p.base, p.height, { yRange: [0, 12], scale: 1.004 }),
      mats.granite);
    band.position.copy(mesh.position);
    band.userData.collidable = true; band.castShadow = true;
    group.add(band); collidables.push(band);
  }

  // Interior
  const interior = buildInterior(def, mats);
  interior.position.set(p.center.x, 0, p.center.z);
  interior.traverse(m => { if (m.userData.collidable) collidables.push(m); });
  group.add(interior);

  if (isKhufu) {
    // The interior's first corridor segment IS the (collidable) entrance ramp
    // floor; lay decorative stepped treads over it for looks.
    const path = def.corridors[0].path;       // [RAMP_BASE, DOOR, ...] (local)
    const a = path[0], b = path[1];
    const stair = new THREE.Mesh(buildStaircase(
      { x: p.center.x + a.x, y: a.y, z: p.center.z + a.z },
      { x: p.center.x + b.x, y: b.y, z: p.center.z + b.z }, 5.2), mats.wood);
    stair.castShadow = true; stair.receiveShadow = true;
    group.add(stair);
  }
  return def;
}

function buildSmallPyramid(q, mats, collidables, group) {
  const mesh = new THREE.Mesh(buildPyramidGeometry(q.base, q.height, {}), mats.limestone);
  mesh.position.set(q.center.x, 0, q.center.z);
  mesh.userData.collidable = true; mesh.castShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// A detailed Great Sphinx (recumbent lion, nemes headdress, outstretched
// paws, Dream Stele), sat with its base at `baseY` inside its enclosure.
function buildSphinx(mats, collidables, group, baseY) {
  const s = SPHINX;
  const g = new THREE.Group();
  const body = mats.limestone, head = mats.casing, gr = mats.granite;
  const add = (sx, sy, sz, x, y, z, mat, collide = true, rot = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat || body);
    m.position.set(x, y, z); if (rot) m.rotation.z = rot;
    m.castShadow = true; m.receiveShadow = true;
    if (collide) { m.userData.collidable = true; collidables.push(m); }
    g.add(m); return m;
  };
  // Faces east (+X). Coordinates: x east (front), y up from base, z = ±width.
  // — Recumbent lion body (rises toward the chest at the front) —
  add(46, 9, 13, -18, 4.5, 0);                 // torso
  add(17, 12.5, 13, -33, 6.2, 0);              // rear haunches (taller)
  for (const sz of [1, -1]) {                  // folded hind legs along the sides
    add(20, 3.5, 3.2, -28, 1.8, sz * 6.4);
    add(7, 5, 3, -41, 2.5, sz * 5.5);          // rear paws
  }
  // tail curling along the south flank to the right rear
  add(14, 2.2, 2.2, -34, 1.1, 7.2, body, true);
  // — Outstretched forepaws reaching east —
  for (const sz of [1, -1]) {
    add(30, 3.6, 4.4, 17, 1.8, sz * 4.6);      // foreleg
    for (let t = 0; t < 4; t++)                // four toes per paw
      add(1.7, 2.0, 0.9, 31.5, 1.0, sz * 4.6 + (t - 1.5) * 1.15, body, false);
  }
  // — Chest, neck, head —
  add(10, 15, 11, 2.5, 7.5, 0);                // chest below the head
  add(6, 5.5, 6.5, 8.5, 14.5, 0, head);        // neck
  add(7, 8.5, 7, 12.5, 17.5, 0, head);         // face
  add(1.2, 2.0, 4.5, 16.3, 18.5, 0, head, false); // brow ridge
  add(1.4, 1.4, 1.4, 16.4, 17.6, 0, body, false); // broken nose stub
  // nemes headdress: broad striped headcloth flaring at the sides + back
  add(10, 4.5, 13.5, 11, 21.5, 0, head);       // crown of the headcloth
  for (const sz of [1, -1])                    // side lappets (the flaps)
    add(5.5, 10, 3, 12, 14.5, sz * 5.3, head, true, sz * 0.12);
  add(5, 8, 6, 6.5, 16, 0, head);              // back of the headcloth
  add(1.3, 1.3, 1.3, 16.6, 21.0, 0, gr, false);// uraeus (cobra) on the brow
  add(2.0, 5.5, 2.4, 14.5, 11.5, 0, gr, false);// broken ceremonial beard stub
  // Dream Stele of Thutmose IV, standing between the front paws
  add(1.2, 9, 5, 30, 4.5, 0, gr);
  g.position.set(s.center.x, baseY || 0, s.center.z);
  group.add(g);
}

// The quarried enclosure the Sphinx sits in: a sunken floor with rock walls
// on the N, W and S sides (open to the east toward the temples), plus a ramp.
function buildSphinxEnclosure(mats, collidables, group) {
  const s = SPHINX, floorY = SPHINX_FLOOR;
  const x0 = s.center.x - 46, x1 = s.center.x + 50, z0 = s.center.z - 26, z1 = s.center.z + 26;
  const wallTop = 2, t = 5;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1, z1 - z0 + 2 * t), mats.bedrock);
  floor.position.set((x0 + x1) / 2, floorY - 0.5, s.center.z); floor.receiveShadow = true;
  floor.userData.collidable = true; group.add(floor); collidables.push(floor);
  const wallH = wallTop - floorY;
  const wall = (sx, sz, cx, cz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, wallH, sz), mats.bedrock);
    m.position.set(cx, floorY + wallH / 2, cz); m.castShadow = true; m.receiveShadow = true;
    m.userData.collidable = true; group.add(m); collidables.push(m);
  };
  wall(x1 - x0 + 2 * t, t, (x0 + x1) / 2, z0 - t / 2);   // north
  wall(x1 - x0 + 2 * t, t, (x0 + x1) / 2, z1 + t / 2);   // south
  wall(t, z1 - z0, x0 - t / 2, s.center.z);              // west (behind the tail)
  // ramp down into the enclosure from the north-west
  orientedBox({ x: x0 + 10, y: 0, z: z0 - 14 }, { x: x0 + 10, y: floorY + 0.3, z: z0 + 6 },
    6, 0.6, mats.bedrock, collidables, group);
}


// Low-walled stone enclosure (temple / mastaba), open-topped.
function buildEnclosure(cx, cz, sx, sz, height, mats, collidables, group) {
  const t = 2.0;
  const geoms = [
    boxAt(sx, height, t, 0, height / 2, -sz / 2),
    boxAt(sx, height, t, 0, height / 2, sz / 2),
    boxAt(t, height, sz, -sx / 2, height / 2, 0),
    boxAt(t, height, sz, sx / 2, height / 2, 0)
  ];
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mats.bedrock);
  mesh.position.set(cx, 0, cz);
  mesh.userData.collidable = true; mesh.castShadow = true;
  group.add(mesh); collidables.push(mesh);
}
function boxAt(sx, sy, sz, x, y, z) {
  const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g;
}

// An axis-arbitrary box spanning a→b with cross-section w×h (used for causeways).
function orientedBox(a, b, w, h, mat, collidables, group) {
  const A = new THREE.Vector3(a.x, a.y, a.z), B = new THREE.Vector3(b.x, b.y, b.z);
  const dir = new THREE.Vector3().subVectors(B, A); const len = dir.length(); dir.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  let right = new THREE.Vector3().crossVectors(up, dir);
  if (right.lengthSq() < 1e-4) right.set(1, 0, 0); right.normalize();
  const upv = new THREE.Vector3().crossVectors(dir, right).normalize();
  const m = new THREE.Matrix4().makeBasis(right, upv, dir);
  m.setPosition(new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5));
  const g = new THREE.BoxGeometry(w, h, len); g.applyMatrix4(m);
  const mesh = new THREE.Mesh(g, mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
  return mesh;
}

// A field of mastaba tombs (flat-topped, battered) in a regular street grid —
// the real plateau is densely covered with these around the Great Pyramid.
function buildMastabaField(cx, cz, cols, rows, dx, dz, mat, collidables, group, skip, out, prefix, baseNum) {
  const geoms = [];
  let n = 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = cx + i * dx + (Math.random() - 0.5) * 2;
      const z = cz + j * dz + (Math.random() - 0.5) * 2;
      if (skip && skip(x, z)) continue;
      const L = dx * 0.62 + Math.random() * 3;      // E–W length
      const W = dz * 0.6 + Math.random() * 2;       // N–S width
      const H = 4 + Math.random() * 3.5;
      const b = new THREE.BoxGeometry(L, H, W); b.translate(x, H / 2, z);
      geoms.push(b);
      const t = new THREE.BoxGeometry(L * 0.9, H * 0.18, W * 0.9);
      t.translate(x, H + H * 0.09 - 0.1, z);
      geoms.push(t);
      if (out) {
        const name = prefix ? `${prefix} ${(baseNum || 0) + n * 10}` : null;
        out.push({ x, z, w: L, d: W, name });
      }
      n++;
    }
  }
  if (!geoms.length) return;
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// The Central-Field quarry: irregular stepped benches of cut bedrock.
function buildQuarry(q, mat, collidables, group) {
  const c = q.center, geoms = [];
  for (let i = 0; i < 44; i++) {
    const x = c.x + (Math.random() - 0.5) * 120;
    const z = c.z + (Math.random() - 0.5) * 84;
    const w = 6 + Math.random() * 16, d = 5 + Math.random() * 12, h = 1.2 + Math.random() * 4;
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, h / 2, z);
    geoms.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// The Wall of the Crow: two thick wall segments leaving a central gateway,
// with a lintel over the gate (walk through the gap).
function buildWallOfCrow(wc, mats, collidables, group) {
  const a = wc.a, b = wc.b;
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L, gh = wc.height, th = wc.thickness, gw = wc.gate;
  const pt = d => ({ x: a.x + ux * d, y: gh / 2, z: a.z + uz * d });
  orientedBox(pt(0), pt(L / 2 - gw / 2), th, gh, mats.bedrock, collidables, group);
  orientedBox(pt(L / 2 + gw / 2), pt(L), th, gh, mats.bedrock, collidables, group);
  // lintel across the gateway, near the top
  const ly = gh - 1.5;
  orientedBox({ x: a.x + ux * (L / 2 - gw / 2), y: ly, z: a.z + uz * (L / 2 - gw / 2) },
    { x: a.x + ux * (L / 2 + gw / 2), y: ly, z: a.z + uz * (L / 2 + gw / 2) },
    th, 3, mats.bedrock, collidables, group);
}

// Two-tiered rock-cut monument (the tomb of Khentkaus I).
function buildKhentkaus(km, mats, collidables, group) {
  const c = km.center;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(km.base, km.height1, km.base + 2), mats.bedrock);
  lower.position.set(c.x, km.height1 / 2, c.z);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(km.base2, km.height2, km.base2), mats.limestone);
  upper.position.set(c.x, km.height1 + km.height2 / 2, c.z);
  for (const m of [lower, upper]) {
    m.userData.collidable = true; m.castShadow = true; m.receiveShadow = true;
    group.add(m); collidables.push(m);
  }
}

// A settlement: rows of low mud-brick buildings/galleries.
function buildVillage(v, mat, collidables, group, out) {
  const c = v.center, geoms = [];
  const cols = v.cols || 7, rows = v.rows || 5, dx = v.dx || 19, dz = v.dz || 17;
  const bw = v.bw || 13, bd = v.bd || 9;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = c.x - (cols - 1) * dx / 2 + i * dx + (Math.random() - 0.5) * 2;
      const z = c.z - (rows - 1) * dz / 2 + j * dz + (Math.random() - 0.5) * 2;
      const w = bw + Math.random() * 3, d = bd + Math.random() * 2, hh = 2.6 + Math.random();
      const g = new THREE.BoxGeometry(w, hh, d); g.translate(x, hh / 2, z);
      geoms.push(g);
      if (out) out.push({ x, z, w, d });
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// A stone-lined boat pit, optionally holding the reconstructed solar barque.
// `pit` = { x, z, ew (long axis east-west), boat }.
function buildBoatPit(pit, mats, collidables, group) {
  const cx = pit.x, cz = pit.z;
  // pit rim, oriented along the long axis
  if (pit.ew) buildEnclosure(cx, cz, 44, 9, 1.6, mats, collidables, group);
  else buildEnclosure(cx, cz, 9, 44, 1.6, mats, collidables, group);
  if (!pit.boat) return { x: cx, y: 3, z: cz };
  const boat = new THREE.Group();
  const wood = mats.wood;
  // hull: a scaled, capped half-cylinder
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 38, 16, 1, false, 0, Math.PI), wood);
  hull.rotation.z = Math.PI / 2;          // length along X
  hull.rotation.y = Math.PI;              // open side up
  hull.scale.set(1, 1, 0.5);              // narrow beam
  hull.position.y = 2.2;
  hull.userData.collidable = true; hull.castShadow = true;
  boat.add(hull);
  // upturned prow & stern
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 6, 8), wood);
    tip.position.set(sx * 19.5, 4.5, 0);
    tip.rotation.z = sx * -0.7;
    tip.castShadow = true; boat.add(tip);
  }
  // small deck cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 2.6), wood);
  cabin.position.set(3, 3.4, 0); cabin.castShadow = true;
  cabin.userData.collidable = true; boat.add(cabin);
  boat.position.set(cx, 0, cz);
  group.add(boat);
  collidables.push(hull, cabin);
  return { x: cx, y: 4, z: cz };
}

// A single palm tree (trunk collidable, fronds decorative).
function buildPalm(deco, x, z, scale) {
  const g = new THREE.Group();
  const h = 6 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, h, 6), deco.trunk);
  trunk.position.y = h / 2; trunk.castShadow = true; trunk.userData.collidable = true;
  g.add(trunk);
  for (let i = 0; i < 8; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5 * scale, 4.2 * scale, 4), deco.frond);
    const a = (i / 8) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.6 * scale, h - 0.3, Math.sin(a) * 1.6 * scale);
    frond.rotation.set(Math.PI / 2.4 * Math.cos(a), -a, Math.PI / 2.4 * Math.sin(a));
    frond.castShadow = true;
    g.add(frond);
  }
  g.position.set(x, 0, z);
  return g;
}

// A simple resting/standing camel.
function buildCamel(deco, x, z, rot, collidables) {
  const g = new THREE.Group();
  const part = (sx, sy, sz, px, py, pz, collide) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), deco.camel);
    m.position.set(px, py, pz); m.castShadow = true;
    if (collide) { m.userData.collidable = true; }
    g.add(m); return m;
  };
  const body = part(3.4, 1.6, 1.4, 0, 2.0, 0, true);     // torso (collidable)
  part(1.1, 1.0, 1.1, -0.5, 3.0, 0);                     // hump 1
  part(1.0, 0.8, 1.0, 0.7, 2.9, 0);                      // hump 2
  part(0.7, 2.0, 0.7, 2.0, 2.6, 0);                      // neck
  part(0.9, 0.7, 0.6, 2.4, 3.6, 0);                      // head
  for (const [lx, lz] of [[-1.2, 0.5], [-1.2, -0.5], [1.2, 0.5], [1.2, -0.5]])
    part(0.35, 2.0, 0.35, lx, 1.0, lz);                  // legs
  g.position.set(x, 0, z); g.rotation.y = rot;
  g.updateMatrixWorld(true);
  collidables.push(body);
  return g;
}

// A flock of birds slowly circling overhead; returns an updater.
function buildBirds(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2218, roughness: 1 });
  const birds = [];
  const flock = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.7), mat);
      wing.position.x = s * 1.2; wing.rotation.z = s * 0.5;
      b.add(wing);
    }
    flock.add(b);
    birds.push({
      g: b, cx: -150 + Math.random() * 400, cz: -100 + Math.random() * 600,
      r: 40 + Math.random() * 120, y: 70 + Math.random() * 90,
      sp: 0.05 + Math.random() * 0.08, ph: Math.random() * 7
    });
  }
  group.add(flock);
  return t => {
    for (const b of birds) {
      const a = b.ph + t * b.sp;
      b.g.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2) * 4, b.cz + Math.sin(a) * b.r);
      b.g.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 6 + b.ph) * 0.35;
      b.g.children[0].rotation.z = 0.5 + flap;
      b.g.children[1].rotation.z = -0.5 - flap;
    }
  };
}

// Surviving casing stones clustered at the base of the Great Pyramid's
// north face (a real, much-photographed detail).
function buildCasingRemnants(p, mats, collidables, group) {
  const half = p.base / 2;
  const geoms = [];
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const y = r * 1.2;
    const inset = r * 0.95;                 // follow the casing slope inward
    const count = 9 - r;
    for (let i = 0; i < count; i++) {
      const w = 2.1, hgt = 1.2, d = 1.8;
      const x = (i - (count - 1) / 2) * (w + 0.05) + 7;
      const z = -half + 0.6 + inset;
      const g = new THREE.BoxGeometry(w, hgt, d);
      g.translate(x, y + hgt / 2, z);
      geoms.push(g);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mats.casing);
  mesh.position.set(p.center.x, 0, p.center.z);
  mesh.userData.collidable = true; mesh.castShadow = true;
  group.add(mesh); collidables.push(mesh);
}

function buildSky(scene) {
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  const u = sky.material.uniforms;
  u.turbidity.value = 8;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.8;
  // Sun: late-afternoon, low in the west-south-west.
  const elev = 28 * DEG, azim = 235 * DEG;
  const sun = new THREE.Vector3();
  sun.setFromSphericalCoords(1, Math.PI / 2 - elev, azim);
  u.sunPosition.value.copy(sun);
  return sun;
}

export function buildWorld(scene, mats) {
  const group = new THREE.Group();
  scene.add(group);
  const collidables = [];
  const landmarks = [];

  // Sky + lighting
  const sunDir = buildSky(scene);
  const sun = new THREE.DirectionalLight(0xfff0d2, 3.1);
  sun.position.copy(sunDir).multiplyScalar(900);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 1.2;
  const sc = sun.shadow.camera;
  sc.near = 1; sc.far = 3600; sc.left = -1000; sc.right = 1000; sc.top = 1000; sc.bottom = -1000;
  scene.add(sun);
  // Sky fill + warm bounce off the sand so shadowed faces aren't black.
  scene.add(new THREE.HemisphereLight(0xbcd3ff, 0xcaa56a, 0.95));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  // Cool fill from the opposite side to model skylight on the shadow faces.
  const fill = new THREE.DirectionalLight(0x9fb6e0, 0.5);
  fill.position.set(-sunDir.x, 0.4, -sunDir.z).multiplyScalar(900);
  scene.add(fill);
  scene.fog = new THREE.FogExp2(0xcdb98a, 0.00016);

  // Terrain
  const terrain = buildTerrain(mats.sand);
  group.add(terrain); collidables.push(terrain);

  // Main pyramids (+ interiors)
  const defs = {};
  for (const key of ['khufu', 'khafre', 'menkaure']) {
    const p = PYRAMIDS[key];
    const def = buildPyramid(p, mats, collidables, group);
    defs[key] = def;
    landmarks.push({ name: p.name, blurb: p.blurb, pos: pyrApex(p), radius: 130 });
    // chamber landmarks
    for (const c of def.chambers) {
      landmarks.push({
        name: c.name, blurb: c.blurb, radius: 9,
        pos: { x: p.center.x + c.center.x, y: c.center.y, z: p.center.z + c.center.z }
      });
    }
  }

  // Subsidiary pyramids
  for (const q of QUEENS_KHUFU) buildSmallPyramid(q, mats, collidables, group);
  for (const q of QUEENS_MENKAURE) buildSmallPyramid(q, mats, collidables, group);

  // Sphinx, sunk into its quarried enclosure, + the temples in front (east)
  buildSphinxEnclosure(mats, collidables, group);
  buildSphinx(mats, collidables, group, SPHINX_FLOOR);
  landmarks.push({ name: SPHINX.name, blurb: SPHINX.blurb, radius: 70,
    pos: { x: SPHINX.center.x, y: 12, z: SPHINX.center.z } });
  buildEnclosure(SPHINX.center.x + 60, SPHINX.center.z, 38, 50, 9, mats, collidables, group); // Sphinx Temple, in front (east)
  // Khafre's valley temple, just south of the Sphinx Temple
  buildEnclosure(KHAFRE_VALLEY.center.x, KHAFRE_VALLEY.center.z, 45, 45, 9, mats, collidables, group);
  landmarks.push({ name: KHAFRE_VALLEY.name, blurb: KHAFRE_VALLEY.blurb, radius: 34,
    pos: { x: KHAFRE_VALLEY.center.x, y: 5, z: KHAFRE_VALLEY.center.z } });

  // Mortuary temples on the east faces (kept clear of the queens' pyramids).
  buildEnclosure(PYRAMIDS.khufu.center.x + 150, PYRAMIDS.khufu.center.z, 50, 26, 7, mats, collidables, group);
  buildEnclosure(PYRAMIDS.khafre.center.x + 145, PYRAMIDS.khafre.center.z, 56, 42, 8, mats, collidables, group);
  buildEnclosure(PYRAMIDS.menkaure.center.x + 78, PYRAMIDS.menkaure.center.z, 44, 36, 7, mats, collidables, group);

  // A scatter of fallen casing blocks north of the Great Pyramid (kept off the
  // entrance stair/ramp corridor so they never block the way in).
  const blockGeoms = [];
  for (let i = 0; i < 60; i++) {
    const r = 135 + Math.random() * 95, a = (-0.7 + Math.random() * 1.4);
    const x = Math.sin(a) * r, z = -Math.cos(a) * r;
    if (Math.abs(x - 7) < 11 && z < -95) continue;     // leave the entrance path clear
    const s = 0.9 + Math.random() * 1.8;
    const g = new THREE.BoxGeometry(s * 1.4, s, s * 1.2);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.random() * Math.PI));
    g.translate(x, s / 2, z);
    blockGeoms.push(g);
  }
  const blocks = new THREE.Mesh(mergeGeometries(blockGeoms, false), mats.limestone);
  blocks.userData.collidable = true; blocks.castShadow = true;
  group.add(blocks); collidables.push(blocks);

  // ---- Added outdoor detail ----------------------------------------
  const deco = {
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e4a26, roughness: 0.9 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x55732f, roughness: 0.8, side: THREE.DoubleSide }),
    camel: new THREE.MeshStandardMaterial({ color: 0xb18752, roughness: 0.85 }),
    mud: new THREE.MeshStandardMaterial({ color: 0x9a7850, roughness: 0.98 })
  };
  const kc = PYRAMIDS.khufu.center;
  const mastabas = [], buildings = [];

  // Cemeteries of mastaba tombs — Eastern field sits well east of the queens'
  // pyramids; Western field is set back from the west face. Both in tidy rows.
  buildMastabaField(kc.x + 205, kc.z - 120, 6, 13, 24, 21, mats.bedrock, collidables, group, null, mastabas, 'Mastaba G', 7110);
  buildMastabaField(kc.x - 395, kc.z - 120, 9, 13, 23, 20, mats.bedrock, collidables, group, null, mastabas, 'Mastaba G', 1200);

  // Central-Field quarry south of the Great Pyramid
  buildQuarry(GIS_QUARRY, mats.bedrock, collidables, group);
  landmarks.push({ name: GIS_QUARRY.name, blurb: GIS_QUARRY.blurb, radius: 80,
    pos: { x: GIS_QUARRY.center.x, y: 3, z: GIS_QUARRY.center.z } });

  // Tomb of Khentkaus I + the workers' town
  buildKhentkaus(KHENTKAUS, mats, collidables, group);
  landmarks.push({ name: KHENTKAUS.name, blurb: KHENTKAUS.blurb, radius: 40,
    pos: { x: KHENTKAUS.center.x, y: 8, z: KHENTKAUS.center.z } });
  buildVillage(WORKERS_VILLAGE, deco.mud, collidables, group, buildings);
  landmarks.push({ name: WORKERS_VILLAGE.name, blurb: WORKERS_VILLAGE.blurb, radius: 90,
    pos: { x: WORKERS_VILLAGE.center.x, y: 4, z: WORKERS_VILLAGE.center.z } });
  buildWallOfCrow(WALL_OF_CROW, mats, collidables, group);
  landmarks.push({ name: WALL_OF_CROW.name, blurb: WALL_OF_CROW.blurb, radius: 60,
    pos: { x: 266, y: 6, z: 767 } });
  buildEnclosure(MENKAURE_VALLEY.center.x, MENKAURE_VALLEY.center.z, 42, 34, 7, mats, collidables, group);
  landmarks.push({ name: MENKAURE_VALLEY.name, blurb: MENKAURE_VALLEY.blurb, radius: 32,
    pos: { x: MENKAURE_VALLEY.center.x, y: 5, z: MENKAURE_VALLEY.center.z } });

  // Causeways from the mortuary temples down to the valley temples
  orientedBox({ x: PYRAMIDS.khafre.center.x + 175, y: 3, z: PYRAMIDS.khafre.center.z + 6 },
    { x: KHAFRE_VALLEY.center.x - 12, y: 1.5, z: KHAFRE_VALLEY.center.z - 14 }, 8, 3, mats.bedrock, collidables, group);
  orientedBox({ x: PYRAMIDS.menkaure.center.x + 100, y: 2.5, z: PYRAMIDS.menkaure.center.z + 4 },
    { x: PYRAMIDS.menkaure.center.x + 360, y: 1.2, z: PYRAMIDS.menkaure.center.z + 120 },
    7, 2.5, mats.bedrock, collidables, group);
  // Khufu's causeway, running east to his (buried) valley temple
  orientedBox({ x: kc.x + 180, y: 3, z: kc.z + 6 },
    { x: KHUFU_VALLEY.center.x - 20, y: 1.5, z: KHUFU_VALLEY.center.z - 6 }, 9, 3, mats.bedrock, collidables, group);
  buildEnclosure(KHUFU_VALLEY.center.x, KHUFU_VALLEY.center.z, 48, 40, 6, mats, collidables, group);
  landmarks.push({ name: KHUFU_VALLEY.name, blurb: KHUFU_VALLEY.blurb, radius: 36,
    pos: { x: KHUFU_VALLEY.center.x, y: 5, z: KHUFU_VALLEY.center.z } });

  // Satellite / cult pyramids
  for (const s of SATELLITES) {
    buildSmallPyramid(s, mats, collidables, group);
    landmarks.push({ name: s.name, radius: s.base * 0.8 + 8,
      pos: { x: s.center.x, y: s.height, z: s.center.z },
      blurb: 'A small satellite (cult) pyramid for the king\'s ka.' });
  }

  // Khufu's boat pits (two south, two east) — one holds the reconstructed ship
  for (const pit of BOAT_PITS) {
    const bp = buildBoatPit(pit, mats, collidables, group);
    if (pit.boat) landmarks.push({
      name: "Khufu's Solar Boat", radius: 26, pos: { x: bp.x, y: 5, z: bp.z },
      blurb: 'A nod to the 43 m cedar "solar barque" found dismantled in a sealed ' +
        'pit beside the Great Pyramid in 1954 and painstakingly reassembled.'
    });
  }

  // Basalt pavement of Khufu's mortuary temple (the real floor was black basalt)
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.55, metalness: 0.1 });
  const basalt = new THREE.Mesh(new THREE.BoxGeometry(48, 0.4, 24), basaltMat);
  basalt.position.set(kc.x + 150, 0.2, kc.z); basalt.receiveShadow = true;
  group.add(basalt);

  // Trial Passages — a low rock-cut block with grooved corridor lines
  const tp = TRIAL_PASSAGES.center, tpg = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 9), mats.bedrock);
  slab.position.y = 0.7; slab.userData.collidable = true; slab.castShadow = true; tpg.add(slab);
  for (const off of [-1.5, 1.5]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 1 }));
    groove.position.set(off, 1.45, off);
    tpg.add(groove);
  }
  tpg.position.set(tp.x, 0, tp.z); group.add(tpg); collidables.push(slab);
  landmarks.push({ name: TRIAL_PASSAGES.name, blurb: TRIAL_PASSAGES.blurb, radius: 22,
    pos: { x: tp.x, y: 3, z: tp.z } });

  // Khentkaus town (priests' settlement) + workers' cemetery on the slope
  buildVillage({ center: KHENTKAUS_TOWN.center, cols: 4, rows: 3, dx: 15, dz: 13, bw: 9, bd: 7 },
    deco.mud, collidables, group, buildings);
  landmarks.push({ name: KHENTKAUS_TOWN.name, blurb: KHENTKAUS_TOWN.blurb, radius: 45,
    pos: { x: KHENTKAUS_TOWN.center.x, y: 3, z: KHENTKAUS_TOWN.center.z } });
  buildMastabaField(WORKERS_CEMETERY.center.x - 32, WORKERS_CEMETERY.center.z - 22, 8, 6, 8, 7,
    deco.mud, collidables, group, null, mastabas, "Worker's tomb", 1);
  landmarks.push({ name: WORKERS_CEMETERY.name, blurb: WORKERS_CEMETERY.blurb, radius: 55,
    pos: { x: WORKERS_CEMETERY.center.x, y: 2, z: WORKERS_CEMETERY.center.z } });

  // Palm groves near the valley temples and the plateau edge
  const palmSpots = [[380, 500], [392, 512], [372, 520], [405, 495], [360, 508],
    [-650, 790], [-665, 805], [-635, 800]];
  for (const [px, pz] of palmSpots) {
    const t = buildPalm(deco, px + Math.random() * 6, pz + Math.random() * 6, 0.85 + Math.random() * 0.5);
    t.traverse(m => { if (m.userData.collidable) collidables.push(m); });
    group.add(t);
  }

  // Camels in the open viewing area north of the Sphinx
  group.add(buildCamel(deco, SPHINX.center.x + 6, SPHINX.center.z - 52, 1.0, collidables));
  group.add(buildCamel(deco, SPHINX.center.x + 24, SPHINX.center.z - 60, 1.4, collidables));

  // Surviving casing at the Great Pyramid base + circling birds
  buildCasingRemnants(PYRAMIDS.khufu, mats, collidables, group);
  const tick = buildBirds(group);

  return { group, collidables, landmarks, sunDir, tick, mastabas, buildings };
}

function pyrApex(p) {
  return { x: p.center.x, y: p.height, z: p.center.z };
}

export { terrainHeight, inPit };
