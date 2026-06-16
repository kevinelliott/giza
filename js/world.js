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
  const g = new THREE.Group();
  const add = (sx, sy, sz, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat || mats.bedrock);
    m.position.set(x, y, z);
    m.userData.collidable = true; m.castShadow = true; m.receiveShadow = true;
    g.add(m); collidables.push(m);
    return m;
  };
  // Faces east (+X). Body lies along X, paws extend forward (+X).
  const bodyL = s.length * 0.62, bodyH = s.height * 0.55, bodyW = s.width * 0.7;
  add(bodyL, bodyH, bodyW, -s.length * 0.05, bodyH / 2, 0);              // haunches/body
  add(s.length * 0.5, bodyH * 0.55, bodyW * 0.95, s.length * 0.22, bodyH * 0.3, 0); // forelegs base
  // outstretched paws
  add(s.length * 0.5, bodyH * 0.28, bodyW * 0.32, s.length * 0.3, bodyH * 0.18, bodyW * 0.28);
  add(s.length * 0.5, bodyH * 0.28, bodyW * 0.32, s.length * 0.3, bodyH * 0.18, -bodyW * 0.28);
  // chest rising to the head
  add(bodyL * 0.35, s.height * 0.85, bodyW * 0.85, -s.length * 0.18, s.height * 0.42, 0);
  // head + nemes headdress
  const head = add(s.width * 0.55, s.height * 0.5, s.width * 0.55,
    -s.length * 0.3, s.height * 0.78, 0);
  add(s.width * 0.75, s.height * 0.28, s.width * 0.8,
    -s.length * 0.31, s.height * 1.0, 0);                                // headdress top
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

  return { group, collidables, landmarks, sunDir };
}

function pyrApex(p) {
  return { x: p.center.x, y: p.height, z: p.center.z };
}

export { terrainHeight };
