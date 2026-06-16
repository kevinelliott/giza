import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  PYRAMIDS, QUEENS_KHUFU, QUEENS_MENKAURE, SPHINX,
  KHUFU_INTERIOR, simpleInterior, DEG
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
function inPit(x, z) {
  for (const p of PITS) if (Math.hypot(x - p.c.x, z - p.c.z) < p.r) return true;
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
  const hole = {
    s0: e.x - 0.9, s1: e.x + 0.9,
    y0: Math.max(0.2, e.y - 2.4), y1: e.y + 2.4
  };
  const core = buildPyramidGeometry(p.base, p.height, { hole });
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
    const half = p.base / 2;
    const stair = new THREE.Mesh(
      buildStaircase(
        { x: def.entrance.x, y: 0, z: -half - 6 },
        { x: def.entrance.x, y: def.entrance.y, z: def.entrance.z + 0.5 }, 3.0),
      mats.wood);
    stair.position.set(p.center.x, 0, p.center.z);
    stair.userData.collidable = true;
    group.add(stair); collidables.push(stair);
  }
  return def;
}

function buildSmallPyramid(q, mats, collidables, group) {
  const mesh = new THREE.Mesh(buildPyramidGeometry(q.base, q.height, {}), mats.limestone);
  mesh.position.set(q.center.x, 0, q.center.z);
  mesh.userData.collidable = true; mesh.castShadow = true;
  group.add(mesh); collidables.push(mesh);
}

function buildSphinx(mats, collidables, group) {
  const s = SPHINX;
  const L = s.length, H = s.height, W = s.width;
  const g = new THREE.Group();
  const add = (sx, sy, sz, x, y, z, mat, collide = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat || mats.bedrock);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    if (collide) { m.userData.collidable = true; collidables.push(m); }
    g.add(m); return m;
  };
  // Faces east (+X): head and outstretched paws at the front (+X), the
  // crouching lion body and haunches behind (−X).
  add(L * 0.55, H * 0.5, W * 0.72, -L * 0.16, H * 0.25, 0);          // body
  add(L * 0.2, H * 0.62, W * 0.72, -L * 0.4, H * 0.31, 0);           // rear haunches (taller)
  // forelegs + outstretched paws reaching east
  for (const sz of [1, -1]) {
    add(L * 0.46, H * 0.22, W * 0.22, L * 0.2, H * 0.11, sz * W * 0.24); // leg
    add(W * 0.12, H * 0.16, W * 0.18, L * 0.45, H * 0.08, sz * W * 0.24); // paw toes
  }
  add(L * 0.14, H * 0.62, W * 0.55, L * 0.05, H * 0.4, 0);           // chest below the head
  // head, neck and the striped nemes headdress, looking east
  add(W * 0.34, H * 0.34, W * 0.36, L * 0.16, H * 0.78, 0);          // head/face
  add(W * 0.6, H * 0.34, W * 0.6, L * 0.12, H * 0.82, 0);            // nemes headdress (broad)
  add(W * 0.22, H * 0.12, W * 0.5, L * 0.2, H * 0.62, 0, mats.granite); // ceremonial beard stub
  // Dream Stele standing between the paws (Thutmose IV)
  add(W * 0.12, H * 0.5, W * 0.34, L * 0.5, H * 0.25, 0, mats.granite);
  g.position.set(s.center.x, 0, s.center.z);
  group.add(g);
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
function buildMastabaField(cx, cz, cols, rows, dx, dz, mat, collidables, group, skip) {
  const geoms = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = cx + i * dx + (Math.random() - 0.5) * 2;
      const z = cz + j * dz + (Math.random() - 0.5) * 2;
      if (skip && skip(x, z)) continue;
      const L = dx * 0.62 + Math.random() * 3;      // E–W length
      const W = dz * 0.6 + Math.random() * 2;       // N–S width
      const H = 4 + Math.random() * 3.5;
      // base course
      const b = new THREE.BoxGeometry(L, H, W); b.translate(x, H / 2, z);
      geoms.push(b);
      // slightly inset top course = battered profile
      const t = new THREE.BoxGeometry(L * 0.9, H * 0.18, W * 0.9);
      t.translate(x, H + H * 0.09 - 0.1, z);
      geoms.push(t);
    }
  }
  if (!geoms.length) return;
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// A reconstructed wooden boat (like Khufu's solar barque) inside a stone pit.
function buildBoatPit(cx, cz, mats, collidables, group) {
  // pit rim
  buildEnclosure(cx, cz, 46, 9, 1.6, mats, collidables, group);
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
  sun.shadow.mapSize.set(4096, 4096);
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

  // Sphinx + its valley temple
  buildSphinx(mats, collidables, group);
  landmarks.push({ name: SPHINX.name, blurb: SPHINX.blurb, radius: 60,
    pos: { x: SPHINX.center.x, y: 12, z: SPHINX.center.z } });
  buildEnclosure(SPHINX.center.x - 8, SPHINX.center.z + 2, 47, 45, 9, mats, collidables, group); // Sphinx (Valley) Temple

  // Mortuary temples on the east faces + Khafre valley temple
  buildEnclosure(PYRAMIDS.khufu.center.x + 150, PYRAMIDS.khufu.center.z, 52, 40, 7, mats, collidables, group);
  buildEnclosure(PYRAMIDS.khafre.center.x + 145, PYRAMIDS.khafre.center.z, 60, 45, 8, mats, collidables, group);
  buildEnclosure(PYRAMIDS.menkaure.center.x + 78, PYRAMIDS.menkaure.center.z, 45, 38, 7, mats, collidables, group);

  // A scatter of fallen casing blocks north of the Great Pyramid
  const blockGeoms = [];
  for (let i = 0; i < 60; i++) {
    const r = 130 + Math.random() * 90, a = (-0.6 + Math.random() * 1.2);
    const x = Math.sin(a) * r, z = -Math.cos(a) * r;
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
    camel: new THREE.MeshStandardMaterial({ color: 0xb18752, roughness: 0.85 })
  };
  const kc = PYRAMIDS.khufu.center;

  // Cemeteries of mastaba tombs (Eastern + Western fields)
  buildMastabaField(kc.x + 150, kc.z - 70, 7, 9, 22, 16, mats.bedrock, collidables, group);
  buildMastabaField(kc.x - 360, kc.z - 110, 10, 13, 22, 17, mats.bedrock, collidables, group);

  // Causeways from the mortuary temples toward the valley temples
  orientedBox({ x: PYRAMIDS.khafre.center.x + 175, y: 3, z: PYRAMIDS.khafre.center.z + 6 },
    { x: SPHINX.center.x - 20, y: 1.5, z: SPHINX.center.z }, 8, 3, mats.bedrock, collidables, group);
  orientedBox({ x: PYRAMIDS.menkaure.center.x + 100, y: 2.5, z: PYRAMIDS.menkaure.center.z + 4 },
    { x: PYRAMIDS.menkaure.center.x + 360, y: 1.2, z: PYRAMIDS.menkaure.center.z + 120 },
    7, 2.5, mats.bedrock, collidables, group);

  // Khufu's reconstructed solar boat in a pit on the south side
  const boatPos = buildBoatPit(kc.x + 10, kc.z + 150, mats, collidables, group);
  landmarks.push({
    name: "Khufu's Solar Boat", radius: 26, pos: { x: boatPos.x, y: 5, z: boatPos.z },
    blurb: 'A nod to the 43 m cedar "solar barque" found dismantled in a sealed ' +
      'pit beside the Great Pyramid in 1954 and painstakingly reassembled.'
  });

  // Palm groves near the valley temples and the plateau edge
  const palmSpots = [[380, 500], [392, 512], [372, 520], [405, 495], [360, 508],
    [-650, 790], [-665, 805], [-635, 800]];
  for (const [px, pz] of palmSpots) {
    const t = buildPalm(deco, px + Math.random() * 6, pz + Math.random() * 6, 0.85 + Math.random() * 0.5);
    t.traverse(m => { if (m.userData.collidable) collidables.push(m); });
    group.add(t);
  }

  // Camels near the Sphinx viewing area
  group.add(buildCamel(deco, SPHINX.center.x + 70, SPHINX.center.z + 18, -2.2, collidables));
  group.add(buildCamel(deco, SPHINX.center.x + 80, SPHINX.center.z + 4, -1.9, collidables));

  // Surviving casing at the Great Pyramid base + circling birds
  buildCasingRemnants(PYRAMIDS.khufu, mats, collidables, group);
  const tick = buildBirds(group);

  return { group, collidables, landmarks, sunDir, tick };
}

function pyrApex(p) {
  return { x: p.center.x, y: p.height, z: p.center.z };
}

export { terrainHeight };
