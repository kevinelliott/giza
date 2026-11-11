import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { CSM } from 'three/addons/csm/CSM.js';
import {
  PYRAMIDS, QUEENS_KHUFU, QUEENS_MENKAURE, SPHINX,
  KHUFU_INTERIOR, simpleInterior, DEG, KHENTKAUS, WORKERS_VILLAGE,
  WALL_OF_CROW, MENKAURE_VALLEY, KHAFRE_VALLEY, SPHINX_TEMPLE, AMENHOTEP_TEMPLE,
  KHAFRE_MORTUARY, MENKAURE_QUARRY, KHUFU_MORTUARY, KHUFU_CAUSEWAY,
  SATELLITES, BOAT_PITS, KHUFU_VALLEY,
  TRIAL_PASSAGES, KHENTKAUS_TOWN, WORKERS_CEMETERY, GIS_QUARRY, SERAPEUM,
  KHUFU_UPPER, khufuLowerInterior, MENKAURE_INTERIOR, MENKAURE_ENTRY, MENKAURE_SUB, MERESANKH
} from './data.js';
import {
  buildPyramidGeometry, buildSteppedPyramidGeometry, buildInterior, buildStaircase
} from './builders.js';
import { terrainHeight, inPit, groundUnder, GRID, SPHINX_PIT } from './terrain.js';
import { TOMBS, TOWN, TREES, TEMPLES, EXTENT, PARKING, SITES as GEO_SITES } from './geodata.js';
import { buildSphinxGeometry, rockify } from './sphinx.js';
import { placeModel } from './models.js';
import { TEMPLE_PLAN } from './templedata.js';
import { inscriptionTexture } from './inscriptions.js';
import { buildCamel, animateCamelLegs, buildTraffic, buildVisitors, buildSummitMast, buildLightShow } from './life.js';
const SITES_SPHINX_ROT = GEO_SITES.sphinx.rot;

// The ground: the real 30 m elevation model baked into a 10 m grid (see
// terrain.js). Indexed so normals are smooth; cells are dropped where the
// pyramids' passages and the Sphinx's pit go below grade.
function buildTerrain(mat) {
  const { x0, z0, step, nx, nz, h } = GRID;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  const W = EXTENT.x1 - EXTENT.x0, D = EXTENT.z1 - EXTENT.z0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = x0 + i * step, z = z0 + j * step;
    pos[k * 3] = x; pos[k * 3 + 1] = h[k]; pos[k * 3 + 2] = z;
    uv[k * 2] = (x - EXTENT.x0) / W; uv[k * 2 + 1] = (z - EXTENT.z0) / D;
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (inPit(x0 + (i + 0.5) * step, z0 + (j + 0.5) * step)) continue;
    const a = j * nx + i, b = a + nx, c = b + 1, d = a + 1;      // same split as terrainHeight()
    idx.push(a, b, c, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.collidable = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildPyramid(p, mats, collidables, group, opts = {}) {
  const isKhufu = p.id === 'khufu';
  // Interior is computed first so the north-face entrance hole can be cut
  // exactly where the entrance passage begins.
  const def = isKhufu ? (opts.upper ? khufuLowerInterior() : KHUFU_INTERIOR)
    : (p.id === 'menkaure' ? (opts.sub ? MENKAURE_ENTRY : MENKAURE_INTERIOR) : simpleInterior(p));
  const e = def.entrance;
  // The Great Pyramid's doorway runs lower and wider so the entrance ramp can
  // pass cleanly through the face into the descending passage.
  const hole = isKhufu
    ? { s0: e.x - 1.5, s1: e.x + 1.5, y0: e.y - 6.5, y1: e.y + 2.8 }
    : { s0: e.x - 1.25, s1: e.x + 1.25, y0: Math.max(0.2, e.y - 2.6), y1: e.y + 2.8 };
  // Real current state: Khufu lost its capstone (flat top at ~138.8 m);
  // Menkaure's summit is damaged (~62 m); Khafre keeps a near-intact apex.
  const truncate = p.id === 'khufu' ? 138.8 : (p.id === 'menkaure' ? 62 : null);
  const core = buildPyramidGeometry(p.base, p.height,
    truncate ? { hole, truncate } : { hole });
  // The visible body is the stepped core of real block courses, and it is
  // also the collider — so the pyramids can be climbed course by course.
  const mesh = new THREE.Mesh(core, mats.limestone);   // smooth reference solid (unused visually)
  mesh.position.set(p.center.x, p.baseY, p.center.z);
  const stepped = new THREE.Mesh(buildSteppedPyramidGeometry(p.base, p.height, {
    truncate, hole,
    yRange: p.casing === 'cap' ? [0, p.height * 0.78 + 0.6] : null,
    seed: p.id.length * 131 + p.base | 0
  }), [mats.course, mats.courseTop]);
  stepped.position.copy(mesh.position);
  stepped.castShadow = true; stepped.receiveShadow = true;
  stepped.userData.collidable = true;
  group.add(stepped); collidables.push(stepped);

  // Surviving casing
  if (p.casing === 'cap') {
    const cap = new THREE.Mesh(
      buildPyramidGeometry(p.base, p.height, { yRange: [p.height * 0.78, p.height], scale: 1.004 }),
      Object.assign(mats.casing.clone(), { side: THREE.BackSide }));     // faces wind inward (see below)
    cap.position.copy(mesh.position);
    cap.userData.collidable = true; cap.castShadow = true;
    group.add(cap); collidables.push(cap);
  }
  if (p.casing === 'lowerGranite') {
    const band = new THREE.Mesh(
      buildPyramidGeometry(p.base, p.height, { yRange: [0, 12], scale: 1.004, hole }),
      // weathered red Aswan granite: matte, and without the normal map (the
      // smooth band geometry has no usable tangent frame for it)
      // (its faces wind inward, so render the back side, whose flipped normals face out)
      new THREE.MeshStandardMaterial({ map: mats.granite.map, color: 0xffffff, roughness: 0.85, envMapIntensity: 0.15, side: THREE.BackSide }));
    band.position.copy(mesh.position);
    band.userData.collidable = true; band.castShadow = true;
    group.add(band); collidables.push(band);
  }

  // Interior
  const interior = buildInterior(def, mats);
  interior.position.set(p.center.x, p.baseY, p.center.z);
  interior.traverse(m => { if (m.userData.collidable) collidables.push(m); });
  group.add(interior);

  // Menkaure: a timber stair up to the entrance 4 m above the base, and the
  // palace-facade panelling on the walls of the first chamber
  if (def.rampBase) {
    const a = def.rampBase, b = def.entrance;
    const stair = new THREE.Mesh(buildStaircase(
      { x: p.center.x + a.x, y: p.baseY + a.y, z: p.center.z + a.z },
      { x: p.center.x + b.x, y: p.baseY + b.y, z: p.center.z + b.z }, 3.0), mats.wood);
    stair.castShadow = true; stair.receiveShadow = true; group.add(stair);
    const pc = def.chambers.find(c => c.panelled);
    if (pc && typeof document !== 'undefined') {
      const mk = (key, w, h, x, z, ry) => {
        const tex = inscriptionTexture(key, w, h); if (!tex) return;
        const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
          map: tex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        q.position.set(p.center.x + pc.center.x + x, p.baseY + pc.center.y, p.center.z + pc.center.z + z); q.rotation.y = ry;
        group.add(q);
      };
      mk('menkaure_panel_long', pc.sz - 0.2, pc.sy - 0.3, -pc.sx / 2 + 0.02, 0, Math.PI / 2);
      mk('menkaure_panel_long', pc.sz - 0.2, pc.sy - 0.3, pc.sx / 2 - 0.02, 0, -Math.PI / 2);
    }
  }

  if (isKhufu) {
    // The interior's first corridor segment IS the (collidable) entrance ramp
    // floor; lay decorative stepped treads over it for looks.
    const path = def.corridors[0].path;       // [RAMP_BASE, DOOR, ...] (local)
    const a = path[0], b = path[1];
    const stair = new THREE.Mesh(buildStaircase(
      { x: p.center.x + a.x, y: p.baseY + a.y, z: p.center.z + a.z },
      { x: p.center.x + b.x, y: p.baseY + b.y, z: p.center.z + b.z }, 5.2), mats.wood);
    stair.castShadow = true; stair.receiveShadow = true;
    group.add(stair);
  }
  return def;
}

let smallSeed = 17;
function buildSmallPyramid(q, mats, collidables, group) {
  // Ruined stepped cores (all the subsidiary pyramids have lost their casing).
  const stepped = new THREE.Mesh(buildSteppedPyramidGeometry(q.base, q.height,
    { courseScale: 0.8, seed: smallSeed++ }), [mats.course, mats.courseTop]);
  stepped.position.set(q.center.x, q.baseY ?? terrainHeight(q.center.x, q.center.z), q.center.z);
  stepped.castShadow = true; stepped.receiveShadow = true;
  stepped.userData.collidable = true;
  group.add(stepped); collidables.push(stepped);
}

// The Great Sphinx: a sculpted, weathered surface (see sphinx.js) sat on
// its enclosure floor, plus the granite Dream Stele of Thutmose IV standing
// against its chest between the forelegs.
function buildSphinx(mats, collidables, group, baseY, steleTex) {
  const s = SPHINX;
  const g = new THREE.Group();
  const body = new THREE.Mesh(buildSphinxGeometry(), mats.sphinx);
  body.castShadow = true; body.receiveShadow = true; body.userData.collidable = true;
  g.add(body); collidables.push(body);
  const stele = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.6, 2.2), mats.granite);
  stele.position.set(9.9, 1.8, 0); stele.castShadow = true; stele.userData.collidable = true;
  g.add(stele); collidables.push(stele);
  if (steleTex) {
    // Lepsius' 1849 record of the stele (public domain): the lunette with
    // Thutmose IV offering to the Sphinx twice over, and the text below. The
    // lower third of the real stone has flaked away, as here.
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.58), new THREE.MeshStandardMaterial({
      map: steleTex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    face.rotation.y = Math.PI / 2; face.position.set(9.9 + 0.36, 3.6 - 1.33, 0);
    g.add(face);
  }
  g.position.set(s.center.x, baseY || 0, s.center.z);
  g.rotation.y = -(SITES_SPHINX_ROT || 0) * DEG;
  group.add(g); g.updateMatrixWorld(true);
}

// The quarried enclosure the Sphinx sits in: cut down into the slope to the
// level of the temples in front of it, so its rock walls on the N, W and S
// stand as high as the surrounding ground (open to the east).
function buildSphinxEnclosure(mats, collidables, group) {
  const { x0, x1, z0, z1, y: floorY } = SPHINX_PIT;
  const t = 5;
  const fw = x1 - x0 + 2 * t, fd = z1 - z0 + 2 * t;
  const floorG = new THREE.PlaneGeometry(fw, fd, Math.round(fw / 1.5), Math.round(fd / 1.5)).rotateX(-Math.PI / 2)
    .translate((x0 + x1) / 2, floorY + 0.05, (z0 + z1) / 2);
  const floor = new THREE.Mesh(rockify(floorG, 0.35), mats.rock);
  floor.receiveShadow = true;
  floor.userData.collidable = true; group.add(floor); collidables.push(floor);
  const geoms = [];
  // wall pieces whose tops follow the ground just outside the pit
  const piece = (ax, az, bx, bz, ox, oz) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 6));
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const px0 = ax + (bx - ax) * u0, pz0 = az + (bz - az) * u0, px1 = ax + (bx - ax) * u1, pz1 = az + (bz - az) * u1;
      const top = Math.max(terrainHeight(px0 + ox, pz0 + oz), terrainHeight(px1 + ox, pz1 + oz),
        terrainHeight((px0 + px1) / 2 + ox, (pz0 + pz1) / 2 + oz)) + 0.4;
      const hgt = Math.max(0.6, top - floorY);
      const sx = Math.abs(px1 - px0) || t, sz = Math.abs(pz1 - pz0) || t;
      const g = new THREE.BoxGeometry(sx, hgt, sz, Math.ceil(sx / 1.1), Math.ceil(hgt / 1.1), Math.ceil(sz / 1.1));
      g.translate((px0 + px1) / 2 + ox / 2, floorY + hgt / 2, (pz0 + pz1) / 2 + oz / 2);
      geoms.push(rockify(g, 0.75));
    }
  };
  const rx = x0 + 10, rz = z0 - 18;                        // ramp gap in the north wall
  piece(x0 - t, z0 - t / 2, rx - 3.5, z0 - t / 2, 0, -t);  // north
  piece(rx + 3.5, z0 - t / 2, x1 + t, z0 - t / 2, 0, -t);
  piece(x0 - t, z1 + t / 2, x1 + t, z1 + t / 2, 0, t);    // south
  piece(x0 - t / 2, z0, x0 - t / 2, z1, -t, 0);           // west (behind the tail)
  const walls = new THREE.Mesh(mergeGeometries(geoms, false), mats.rock);
  walls.castShadow = true; walls.receiveShadow = true; walls.userData.collidable = true;
  group.add(walls); collidables.push(walls);
  // rock-cut ramp down into the enclosure from the north-west
  orientedBox({ x: rx, y: terrainHeight(rx, rz) - 0.2, z: rz }, { x: rx, y: floorY + 0.3, z: z0 + 8 },
    6, 0.6, mats.bedrock, collidables, group);
}
// Low-walled stone enclosure (temple / mastaba), open-topped, seated on the
// lowest ground under it with walls tall enough to clear any slope.
function buildEnclosure(cx, cz, sx, sz, height, mats, collidables, group, mat) {
  const t = 2.0;
  const y0 = groundUnder(cx, cz, sx / 2, sz / 2) - 0.3;
  let top = -Infinity;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) top = Math.max(top, terrainHeight(cx + a * sx / 2, cz + b * sz / 2));
  const hh = height + (top - y0);
  const geoms = [
    boxAt(sx, hh, t, 0, hh / 2, -sz / 2),
    boxAt(sx, hh, t, 0, hh / 2, sz / 2),
    boxAt(t, hh, sz, -sx / 2, hh / 2, 0),
    boxAt(t, hh, sz, sx / 2, hh / 2, 0)
  ];
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat || mats.bedrock);
  mesh.position.set(cx, y0, cz);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
  return y0;
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

// A temple ruin following a mapped outline: thick walls along every edge.
function buildOutlineWalls(flat, height, thick, mat, collidables, group) {
  const geoms = [];
  const n = flat.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = flat[i * 2], az = flat[i * 2 + 1], bx = flat[((i + 1) % n) * 2], bz = flat[((i + 1) % n) * 2 + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1) continue;
    const y0 = Math.min(terrainHeight(ax, az), terrainHeight(bx, bz)) - 0.4;
    const top = Math.max(terrainHeight(ax, az), terrainHeight(bx, bz)) + height;
    const g = new THREE.BoxGeometry(len + thick, top - y0, thick);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, (y0 + top) / 2, (az + bz) / 2);
    geoms.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// Walls and piers from a rasterised plan: rows of [i0, i1, type] runs, merged
// down the rows into as few boxes as possible. The valley temple's sixteen
// granite monoliths and the beams they carry are built to Petrie's
// measurements: pillars 1.04 m square (the two at the junction 1.47 m) and
// 4.425 m high; beams 1.04 m deep over the double colonnade, 1.22 m over the
// single one, so the colonnades stand 5.65 m (222.4 in) high.
function buildTemplePlan(mats, collidables, group, floorY) {
  const P = TEMPLE_PLAN, c = P.cell;
  const H = [6.2, 4.6, 0, 4.4];                      // valley wall (hall roof level), Sphinx-Temple wall, -, Sphinx-Temple pier
  const geoms = [[], [], [], []];
  let prev = new Map();
  for (let j = 0; j <= P.nz; j++) {
    const cur = new Map(), row = j < P.nz ? P.rows[j] : [];
    for (let k = 0; k < row.length; k += 3) {
      const key = row[k] + ':' + row[k + 1] + ':' + row[k + 2];
      cur.set(key, prev.has(key) ? prev.get(key) : j); prev.delete(key);
    }
    for (const [key, j0] of prev) {
      const [i0, i1, t] = key.split(':').map(Number), h = H[t] + 0.3;
      geoms[t].push(boxAt((i1 - i0) * c, h, (j - j0) * c, P.x0 + (i0 + i1) / 2 * c, floorY - 0.3 + h / 2, P.z0 + (j0 + j) / 2 * c));
    }
    prev = cur;
  }
  const PH = 4.425, top = floorY + 5.65;
  const cross = P.pillars.filter(p => p[0] === P.pillars[0][0]).sort((a, b) => a[1] - b[1]);
  for (const [x, z, big] of P.pillars) { const w = big ? 1.47 : 1.04; geoms[2].push(boxAt(w, PH + 0.2, w, x, floorY - 0.2 + (PH + 0.2) / 2, z)); }
  // single colonnade (N-S): beams 1.22 m deep from wall to wall
  const cx = cross[0][0], span = cross[1][1] - cross[0][1];
  geoms[2].push(boxAt(1.04, 1.22, cross[cross.length - 1][1] - cross[0][1] + 2 * span, cx, top - 0.61, (cross[0][1] + cross[cross.length - 1][1]) / 2));
  // double colonnade (E-W): two lines of beams 1.04 m deep from the junction pillars to the west wall
  for (const zr of [cross[2][1], cross[3][1]]) {
    const xs = P.pillars.filter(p => p[1] === zr).map(p => p[0]), x0 = Math.min(...xs) - 3.251;
    geoms[2].push(boxAt(cx - x0, 1.04, 1.04, (cx + x0) / 2, floorY + PH + 0.52, zr));
  }
  [mats.granite, mats.bedrock, mats.granite, mats.granite].forEach((mat, t) => {
    if (!geoms[t].length) return;
    const mesh = new THREE.Mesh(mergeGeometries(geoms[t], false), mat);
    mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); collidables.push(mesh);
  });
}

// Rows of square pillars (the granite-pillared halls of the temples).
function buildPillars(cx, cz, cols, rows, dx, dz, size, height, mat, collidables, group, arch = 0) {
  const geoms = [];
  if (arch) {                                   // architrave beams along the longer run of pillars
    const yb = terrainHeight(cx, cz) - 0.2 + height + 0.5;
    if (rows > cols) for (let i = 0; i < cols; i++) geoms.push(boxAt(size, arch, (rows - 1) * dz + size * 1.3, cx + (i - (cols - 1) / 2) * dx, yb + arch / 2, cz));
    else for (let j = 0; j < rows; j++) geoms.push(boxAt((cols - 1) * dx + size * 1.3, arch, size, cx, yb + arch / 2, cz + (j - (rows - 1) / 2) * dz));
  }
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = cx + (i - (cols - 1) / 2) * dx, z = cz + (j - (rows - 1) / 2) * dz;
    const y = terrainHeight(x, z) - 0.2;
    geoms.push(boxAt(size, height, size, x, y + height / 2, z));
    geoms.push(boxAt(size * 1.15, 0.5, size * 1.15, x, y + height + 0.25, z));   // abacus
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// A causeway: a raised, levelled ramp that follows the ground between two
// points (heights smoothed so it reads as a built incline, not a bumpy road).
function buildCauseway(a, b, w, mat, collidables, group, rise = 1.4) {
  const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.round(len / 12));
  const ys = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
    ys.push(Math.max(terrainHeight(x, z), terrainHeight(x + 3, z + 3), terrainHeight(x - 3, z - 3)) + rise);
  }
  for (let k = 0; k < 3; k++) for (let i = 1; i < n; i++) ys[i] = (ys[i - 1] + ys[i] * 2 + ys[i + 1]) / 4;
  const geoms = [];
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, depth = 5;
    const A = { x: a.x + (b.x - a.x) * u0, y: ys[i] - depth / 2, z: a.z + (b.z - a.z) * u0 };
    const B = { x: a.x + (b.x - a.x) * u1, y: ys[i + 1] - depth / 2, z: a.z + (b.z - a.z) * u1 };
    const seg = orientedBox(A, B, w, depth, mat, [], group);
    group.remove(seg); seg.updateMatrix();
    geoms.push(seg.geometry);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// Tombs mapped from their real footprints: battered (inward-leaning) stone
// mastabas, or the small whitewashed family tombs of the modern cemetery.
// Each mastaba also gets the open mouths of its burial shafts in a row along
// the roof, a false-door niche on its east face, a broken top and rubble.
function buildTombs(mats, collidables, group, out) {
  const ruined = [], kept = [], white = [], dark = [], rubble = [];
  const hash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  const place = (g, rot, x, y, z) => { g.rotateY(-rot * DEG); g.translate(x, y, z); return g; };
  for (const [x, z, L, W, rot, h, kind, name] of TOMBS) {
    const y0 = groundUnder(x, z, L / 2, W / 2) - 0.4;
    const top = Math.max(terrainHeight(x, z), terrainHeight(x + L / 2, z), terrainHeight(x - L / 2, z)) + h;
    const H = top - y0, r1 = hash(x, z), r2 = hash(z, x);
    const g = new THREE.BoxGeometry(L, H, W, 1, 1, 1);
    const p = g.attributes.position;
    const batter = kind ? 1 : Math.max(0.86, 1 - 0.07 * h / Math.min(L, W) * 2);
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * batter); p.setZ(i, p.getZ(i) * (1 - (1 - batter) * L / W * 0.5)); }
    g.computeVertexNormals();
    place(g, rot, x, y0 + H / 2, z);
    if (kind) { white.push(g); out.push({ x, z, w: L, d: W, rot, name: null, modern: true }); continue; }
    (L > 18 && r1 < 0.45 ? kept : ruined).push(g);
    out.push({ x, z, w: L, d: W, rot, name: name || null, modern: false });
    const tl = L * batter, tw = W * (1 - (1 - batter) * L / W * 0.5);
    // burial shafts: dark square mouths in a row along the long axis
    const shafts = Math.max(1, Math.min(5, Math.round(L * W / 140)));
    for (let k = 0; k < shafts; k++) {
      const u = shafts === 1 ? 0 : (k / (shafts - 1) - 0.5) * tl * 0.6, sz = Math.min(2.0, tw * 0.3);
      dark.push(place(new THREE.BoxGeometry(sz, 0.08, sz), rot, 0, 0, 0).translate(x + Math.cos(rot * DEG) * u, top + 0.03, z + Math.sin(rot * DEG) * u));
    }
    // false-door niche toward the south end of the east face
    const nx = -Math.sin(rot * DEG), nz = Math.cos(rot * DEG), s = nx >= 0 ? 1 : -1;
    const ax = Math.cos(rot * DEG), az = Math.sin(rot * DEG), along = (az >= 0 ? 1 : -1) * tl * 0.32;
    if (L > 8 && H > 2.5) {
      const fd = new THREE.BoxGeometry(1.4, Math.min(3, H - 0.6), 0.12);
      dark.push(place(fd, rot, 0, 0, 0).translate(x + ax * along + nx * s * (W / 2 - 0.03), y0 + 0.4 + Math.min(3, H - 0.6) / 2, z + az * along + nz * s * (W / 2 - 0.03)));
    }
    // broken top: a few displaced blocks; rubble at the foot
    const nTop = r2 < 0.6 ? 1 + Math.floor(r2 * 5) : 0;
    for (let k = 0; k < nTop; k++) {
      const bx = (hash(x + k, z) - 0.5) * tl * 0.7, bz = (hash(z, x + k) - 0.5) * tw * 0.6, bs = 0.9 + hash(k, x) * 1.2;
      rubble.push(place(new THREE.BoxGeometry(bs * 1.4, bs * 0.8, bs), rot + k * 17, 0, 0, 0).translate(x + ax * bx - az * bz, top + bs * 0.35, z + az * bx + ax * bz));
    }
    for (let k = 0; k < 3 + Math.floor(r1 * 4); k++) {
      const ang = hash(k, z) * Math.PI * 2, rr = Math.max(L, W) / 2 + 0.6 + hash(x, k) * 2.5, bs = 0.5 + hash(z + k, x) * 1.1;
      const bx = x + Math.cos(ang) * rr * (L / Math.max(L, W)), bz = z + Math.sin(ang) * rr * (W / Math.max(L, W));
      rubble.push(new THREE.BoxGeometry(bs * 1.3, bs * 0.7, bs).rotateY(ang * 3).translate(bx, terrainHeight(bx, bz) + bs * 0.25, bz));
    }
  }
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x241e17, roughness: 1 });
  for (const [list, mat, col] of [[ruined, mats.bedrock, true], [kept, mats.limestone, true], [white, mats.plaster, true],
    [rubble, mats.bedrock, true], [dark, darkMat, false]]) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
    mesh.castShadow = col; mesh.receiveShadow = true;
    if (col) { mesh.userData.collidable = true; collidables.push(mesh); }
    group.add(mesh);
  }
}

// The modern town (Nazlet el-Samman and the Pyramids-road districts) from
// mapped building outlines: heights from the surface model, roofs in the
// colour the satellite sees, and a facade style to match (see townPatch).
const FACADE = {
  0: [[0.58, 0.31, 0.22], [0.64, 0.36, 0.25], [0.53, 0.29, 0.21], [0.62, 0.40, 0.29]],            // red brick
  1: [[0.86, 0.80, 0.68], [0.80, 0.70, 0.54], [0.88, 0.76, 0.66], [0.84, 0.82, 0.74], [0.74, 0.62, 0.46],
      [0.90, 0.86, 0.78], [0.70, 0.74, 0.72], [0.82, 0.66, 0.50]],                                 // plaster / paint
  2: [[0.64, 0.63, 0.60], [0.70, 0.69, 0.66], [0.58, 0.58, 0.57]]                                   // concrete
};
const toLin = c => c.map(v => Math.pow(v, 2.2));       // colours below are sRGB
function buildTown(mats, collidables, group, out, clearings) {
  const pos = [], col = [], info = [], idx = [];
  const hash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  // one box (props on roofs) appended to the buffers
  const box = (cx, y0, cz, sx, sy, sz, rot, c, style, seed, base, top) => {
    const g = new THREE.BoxGeometry(sx, sy, sz); g.rotateY(rot); g.translate(cx, y0 + sy / 2, cz);
    const k = pos.length / 3, p = g.attributes.position;
    const cl = toLin(c);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); col.push(...cl); info.push(style + 8, seed, base, top); }
    for (const i of g.index.array) idx.push(k + i);
  };
  let o = 0;
  for (let b = 0; b < TOWN.n.length; b++) {
    const n = TOWN.n[b], h = TOWN.h[b], style = TOWN.s[b];
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(TOWN.p[o + i * 2], TOWN.p[o + i * 2 + 1]));
    o += n * 2;
    let cx = 0, cz = 0, gmin = Infinity, gmax = -Infinity;
    for (const v of pts) { cx += v.x / n; cz += v.y / n; const g = terrainHeight(v.x, v.y); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
    if (clearings.some(c => Math.hypot(cx - c.x, cz - c.z) < c.r)) continue;
    const seed = hash(cx, cz), seed2 = hash(cz * 1.3, cx * 0.7);
    const ground = gmin, y0 = gmin - 0.6, roofY = gmax + h;
    const parapet = (style === 0 && seed2 < 0.3) ? 0 : 1.0;           // some brick blocks are left open-topped
    const top = roofY + parapet;
    const pal = FACADE[style], fcS = pal[Math.floor(seed * pal.length) % pal.length], fc = toLin(fcS);
    const rc = TOWN.c[b], roofC = [((rc >> 16) & 255) / 255, ((rc >> 8) & 255) / 255, (rc & 255) / 255];
    // walls (outline is clockwise in x/z, so these face outward)
    for (let i = 0; i < n; i++) {
      const a = pts[i], d = pts[(i + 1) % n], k = pos.length / 3;
      pos.push(a.x, y0, a.y, d.x, y0, d.y, d.x, top, d.y, a.x, top, a.y);
      for (let q = 0; q < 4; q++) { col.push(...fc); info.push(style, seed, ground, roofY); }
      idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
    }
    // flat roof, in the satellite's colour (slightly mixed with the facade)
    const tri = THREE.ShapeUtils.triangulateShape(pts, []);
    const k = pos.length / 3;
    const rr = toLin(roofC.map((v, i) => v * 0.75 + fcS[i] * 0.25));
    for (const v of pts) { pos.push(v.x, roofY, v.y); col.push(...rr); info.push(style + 4, seed, ground, roofY); }
    for (const [a, bb, cc] of tri) idx.push(k + a, k + cc, k + bb);
    // roof clutter: stair hut, water tanks, rebar left for the next storey
    const area = Math.abs(THREE.ShapeUtils.area(pts));
    if (area > 45 && h > 4) {
      const e = pts[0].clone().sub(new THREE.Vector2(cx, cz)), rot = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const hx = cx + e.x * 0.45, hz = cz + e.y * 0.45;
      if (seed2 > 0.25) box(hx, roofY, hz, 2.6, 2.7, 3.2, -rot, fcS, style, seed, roofY, roofY + 2.7);
      const tanks = Math.floor(seed2 * 4);
      for (let t = 0; t < tanks; t++) {
        const tx = cx - e.x * (0.2 + 0.15 * t), tz = cz - e.y * (0.2 + 0.15 * t) + (t % 2) * 1.6;
        box(tx, roofY, tz, 1.1, 1.3, 1.1, -rot, (seed + t * 0.3) % 1 > 0.5 ? [0.12, 0.12, 0.13] : [0.85, 0.85, 0.82], 3, seed, roofY, roofY);
      }
      if (style === 0 && seed2 < 0.55) {
        for (let i = 0; i < Math.min(n, 6); i++) {
          const v = pts[i], dx = cx - v.x, dz = cz - v.y, dl = Math.hypot(dx, dz) || 1;
          box(v.x + dx / dl * 0.4, top, v.y + dz / dl * 0.4, 0.3, 1.2 + seed * 0.8, 0.3, 0, [0.5, 0.36, 0.28], 3, seed, top, top);
        }
      }
    }
    out.push({ pts, h });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aInfo', new THREE.Float32BufferAttribute(info, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.town);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true;
  group.add(mesh); collidables.push(mesh);
}

// Date palms wherever Sentinel-2 sees vegetation (instanced, decorative).
function buildPalms(deco, group) {
  const n = TREES.length / 3;
  if (!n) return;
  // kept very low-poly: there are thousands of them
  const trunkG = new THREE.CylinderGeometry(0.2, 0.32, 1, 5, 1, true); trunkG.translate(0, 0.5, 0);
  const frondGs = [];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.PlaneGeometry(3.8, 0.9, 2, 1);           // a drooping leaf blade
    f.rotateX(-Math.PI / 2); f.translate(1.9, 0, 0);
    const fp = f.attributes.position;
    for (let k = 0; k < fp.count; k++) fp.setY(k, 0.25 - 0.07 * fp.getX(k) * fp.getX(k));
    f.rotateY(i / 7 * Math.PI * 2 + i * 0.3);
    frondGs.push(f);
  }
  const crownG = mergeGeometries(frondGs, false);
  const trunks = new THREE.InstancedMesh(trunkG, deco.trunk, n), crowns = new THREE.InstancedMesh(crownG, deco.frond, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const x = TREES[i * 3], z = TREES[i * 3 + 1], sc = TREES[i * 3 + 2], y = terrainHeight(x, z);
    const h = 7 * sc + (i % 5);
    e.set((i % 7 - 3) * 0.015, 0, (i % 5 - 2) * 0.02); q.setFromEuler(e);
    m.compose(v.set(x, y - 0.2, z), q, s.set(sc, h, sc)); trunks.setMatrixAt(i, m);
    e.set(0, i * 2.4, 0); q.setFromEuler(e);
    m.compose(v.set(x, y + h - 0.2, z), q, s.set(sc, sc, sc)); crowns.setMatrixAt(i, m);
  }
  crowns.castShadow = true;
  group.add(trunks, crowns);
}

// The Central-Field quarry: irregular stepped benches of cut bedrock.
function buildQuarry(q, mat, collidables, group, sx = 120, sz = 84, count = 44) {
  const c = q.center, geoms = [];
  for (let i = 0; i < count; i++) {
    const x = c.x + (Math.random() - 0.5) * sx;
    const z = c.z + (Math.random() - 0.5) * sz;
    const w = 6 + Math.random() * 16, d = 5 + Math.random() * 12, h = 1.2 + Math.random() * 4;
    const y = groundUnder(x, z, w / 2, d / 2) - 0.5;
    const g = new THREE.BoxGeometry(w, h + 0.5, d); g.translate(x, y + (h + 0.5) / 2, z);
    geoms.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// The Wall of the Crow (mapped line): two thick wall segments leaving a
// central gateway, with a lintel over the gate (walk through the gap).
function buildWallOfCrow(wc, mats, collidables, group) {
  const a = wc.a, b = wc.b;
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L, gh = wc.height, th = wc.thickness, gw = wc.gate;
  const gy = (d0, d1) => {
    let lo = Infinity;
    for (let d = d0; d <= d1; d += 4) lo = Math.min(lo, terrainHeight(a.x + ux * d, a.z + uz * d));
    return lo - 1;
  };
  const span = (d0, d1) => {
    const y = gy(d0, d1), hh = gh + 1;
    orientedBox({ x: a.x + ux * d0, y: y + hh / 2, z: a.z + uz * d0 }, { x: a.x + ux * d1, y: y + hh / 2, z: a.z + uz * d1 },
      th, hh, mats.bedrock, collidables, group);
  };
  span(0, L / 2 - gw / 2); span(L / 2 + gw / 2, L);
  const ly = gy(L / 2 - gw / 2, L / 2 + gw / 2) + gh - 0.5;
  orientedBox({ x: a.x + ux * (L / 2 - gw / 2), y: ly, z: a.z + uz * (L / 2 - gw / 2) },
    { x: a.x + ux * (L / 2 + gw / 2), y: ly, z: a.z + uz * (L / 2 + gw / 2) },
    th, 3, mats.bedrock, collidables, group);
}

// Two-tiered rock-cut monument (the tomb of Khentkaus I).
function buildKhentkaus(km, mats, collidables, group) {
  const c = km.center, y = km.baseY - 1;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(km.base, km.height1 + 1, km.base + 2), mats.bedrock);
  lower.position.set(c.x, y + (km.height1 + 1) / 2, c.z);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(km.base2, km.height2, km.base2), mats.limestone);
  upper.position.set(c.x, y + km.height1 + 1 + km.height2 / 2, c.z);
  for (const m of [lower, upper]) {
    m.userData.collidable = true; m.castShadow = true; m.receiveShadow = true;
    group.add(m); collidables.push(m);
  }
}

// A settlement: rows of low mud-brick buildings/galleries, each set on the
// ground beneath it. `gallery` lays them out as the long N–S galleries of
// the workers' town (Heit el-Ghurab).
function buildVillage(v, mat, collidables, group, out) {
  const c = v.center, geoms = [];
  const cols = v.cols || 7, rows = v.rows || 5, dx = v.dx || 19, dz = v.dz || 17;
  const bw = v.bw || 13, bd = v.bd || 9;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = c.x - (cols - 1) * dx / 2 + i * dx + (Math.random() - 0.5) * (v.jitter ?? 2);
      const z = c.z - (rows - 1) * dz / 2 + j * dz + (Math.random() - 0.5) * (v.jitter ?? 2);
      const w = bw + Math.random() * (v.jw ?? 3), d = bd + Math.random() * (v.jd ?? 2), hh = 2.6 + Math.random();
      const y = groundUnder(x, z, w / 2, d / 2) - 0.4;
      const g = new THREE.BoxGeometry(w, hh + 0.4, d); g.translate(x, y + (hh + 0.4) / 2, z);
      geoms.push(g);
      if (out) out.push({ x, z, w, d });
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); collidables.push(mesh);
}

// A stone-lined boat pit (oriented along its mapped long axis), optionally
// holding the reconstructed solar barque.
function buildBoatPit(pit, mats, collidables, group) {
  const cx = pit.x, cz = pit.z, y = terrainHeight(cx, cz);
  const rim = new THREE.Group();
  rim.position.set(cx, 0, cz); rim.rotation.y = -pit.rot * DEG;
  const t = 1.2, L = pit.len, Wd = pit.wid, h = 1.4;
  const geoms = [
    boxAt(L, h, t, 0, y + h / 2 - 0.4, -Wd / 2), boxAt(L, h, t, 0, y + h / 2 - 0.4, Wd / 2),
    boxAt(t, h, Wd, -L / 2, y + h / 2 - 0.4, 0), boxAt(t, h, Wd, L / 2, y + h / 2 - 0.4, 0),
    boxAt(L - t, 0.3, Wd - t, 0, y - 0.15, 0)                       // dark pit floor just below grade
  ];
  const mesh = new THREE.Mesh(mergeGeometries(geoms.slice(0, 4), false), mats.bedrock);
  const floorM = new THREE.Mesh(geoms[4], new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 1 }));
  mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true; floorM.receiveShadow = true;
  rim.add(mesh, floorM); group.add(rim); rim.updateMatrixWorld(true);
  collidables.push(mesh);
  if (!pit.boat) return { x: cx, y: y + 3, z: cz };
  const boat = new THREE.Group();
  const wood = mats.wood;
  // hull: a scaled, capped half-cylinder
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, Math.min(38, L - 2), 16, 1, false, 0, Math.PI), wood);
  hull.rotation.z = Math.PI / 2;          // length along X
  hull.rotation.y = Math.PI;              // open side up
  hull.scale.set(1, 1, 0.5);              // narrow beam
  hull.position.y = 2.2;
  hull.userData.collidable = true; hull.castShadow = true;
  boat.add(hull);
  // upturned prow & stern
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 6, 8), wood);
    tip.position.set(sx * Math.min(19.5, L / 2), 4.5, 0);
    tip.rotation.z = sx * -0.7;
    tip.castShadow = true; boat.add(tip);
  }
  // small deck cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 2.6), wood);
  cabin.position.set(3, 3.4, 0); cabin.castShadow = true;
  cabin.userData.collidable = true; boat.add(cabin);
  boat.position.set(cx, y, cz); boat.rotation.y = -pit.rot * DEG;
  group.add(boat); boat.updateMatrixWorld(true);
  collidables.push(hull, cabin);
  return { x: cx, y: y + 4, z: cz };
}

// Surface details of the pyramids as they stand today: the great gabled
// (chevron) blocks over Khufu's original entrance and al-Ma'mun's robbers'
// tunnel below it, the vertical gash torn into Menkaure's north face in
// 1196, and aprons of fallen casing and core rubble around every base.
function buildPyramidDetails(mats, collidables, group) {
  const kh = PYRAMIDS.khufu, half = kh.base / 2, zf = y => kh.center.z - half * (1 - y / kh.height);
  const geoms = [];
  for (const [yApex, out] of [[24.2, 1.6], [22.6, 0.6]]) {               // two pairs of gabled beams
    for (const sgn of [-1, 1]) {
      const g = new THREE.BoxGeometry(5.6, 1.5, 2.2);
      g.rotateZ(sgn * 0.68);
      g.translate(7 + sgn * 2.0, yApex - 1.5, zf(yApex - 1.5) - out);
      geoms.push(g);
    }
  }
  const chev = new THREE.Mesh(mergeGeometries(geoms, false), mats.casing);
  chev.castShadow = true; chev.receiveShadow = true; chev.userData.collidable = true;
  group.add(chev); collidables.push(chev);
  const hole = new THREE.MeshStandardMaterial({ color: 0x17120d, roughness: 1 });
  const mamun = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 4), hole);
  mamun.position.set(kh.center.x - 0.5, 7.4, zf(7.4) + 0.6); group.add(mamun);
  // Menkaure's north-face gash (a dark, rough-edged recess up the centre)
  const mk = PYRAMIDS.menkaure, mh = mk.base / 2, mzf = y => mk.center.z - mh * (1 - y / mk.height);
  const slope = Math.atan2(mk.height, mh);
  const gash = new THREE.Mesh(new THREE.BoxGeometry(5.2, 30, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x5e4c36, roughness: 1 }));
  gash.rotation.x = Math.PI / 2 - slope;            // lean back with the face
  const gy = 24;                                   // above the entrance and the granite
  gash.position.set(mk.center.x, mk.baseY + gy, mzf(gy) - 0.15);
  group.add(gash);
  // rubble aprons
  const rub = [];
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const p of Object.values(PYRAMIDS)) {
    const hb = p.base / 2, n = Math.round(p.base * 0.9);
    for (let i = 0; i < n; i++) {
      const side = Math.floor(rnd() * 4), t = (rnd() - 0.5) * 2 * hb, d = hb + 0.5 + Math.pow(rnd(), 2) * 9;
      const x = p.center.x + (side === 0 ? t : side === 1 ? d : side === 2 ? -t : -d);
      const z = p.center.z + (side === 0 ? -d : side === 1 ? t : side === 2 ? d : -t);
      if (p.id === 'khufu' && Math.abs(x - 7) < 9 && z < p.center.z - hb + 2) continue;   // keep the entrance stair clear
      const s = 0.35 + Math.pow(rnd(), 2.2) * 1.4;
      rub.push(new THREE.BoxGeometry(s * (1 + rnd()), s * 0.7, s).rotateY(rnd() * 3).translate(x, terrainHeight(x, z) + s * 0.2, z));
    }
  }
  const apron = new THREE.Mesh(mergeGeometries(rub, false), mats.limestone);
  apron.castShadow = true; apron.receiveShadow = true;
  group.add(apron);
}

// Tour buses lined up in the mapped car parks.
function buildBuses(collidables, group) {
  const geoms = [];
  const liveries = [[0.92, 0.92, 0.9], [0.95, 0.95, 0.95], [0.85, 0.2, 0.18], [0.2, 0.35, 0.65], [0.95, 0.75, 0.2], [0.88, 0.88, 0.86]];
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(toLin(c), i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
  for (const [px, pz, L, W, rot] of PARKING) {
    if (Math.hypot(px, pz) > 1100) continue;
    const ax = Math.cos(rot * DEG), az = Math.sin(rot * DEG);
    const cols = Math.floor((L - 6) / 4.2), rows = Math.max(1, Math.floor((W - 4) / 16));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (rnd() < 0.45) continue;
      const u = (c - (cols - 1) / 2) * 4.2, v = (r - (rows - 1) / 2) * 16;
      const x = px + ax * u - az * v, z = pz + az * u + ax * v, y = terrainHeight(x, z);
      const liv = liveries[Math.floor(rnd() * liveries.length)], yaw = -(rot * DEG) + Math.PI / 2;
      const body = paint(new THREE.BoxGeometry(12, 3.0, 2.55), liv).rotateY(yaw).translate(x, y + 1.75, z);
      const glass = paint(new THREE.BoxGeometry(11.6, 1.1, 2.6), [0.08, 0.1, 0.12]).rotateY(yaw).translate(x, y + 2.35, z);
      const wheels = paint(new THREE.BoxGeometry(9.5, 0.7, 2.3), [0.06, 0.06, 0.06]).rotateY(yaw).translate(x, y + 0.35, z);
      geoms.push(body, glass, wheels);
    }
  }
  if (!geoms.length) return;
  const mesh = new THREE.Mesh(mergeGeometries(geoms, false),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.8 }));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true;
  group.add(mesh); collidables.push(mesh);
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

// Physical sky (Preetham) that also becomes the image-based lighting for
// every PBR material via a PMREM environment map.
function buildSky(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(450000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 2.0;
  u.mieCoefficient.value = 0.003;
  u.mieDirectionalG.value = 0.9;
  // Sun: late-afternoon, low in the west-south-west.
  const elev = 28 * DEG, azim = 235 * DEG;
  const sun = new THREE.Vector3();
  sun.setFromSphericalCoords(1, Math.PI / 2 - elev, azim);
  u.sunPosition.value.copy(sun);
  if (renderer) {
    // Capture the skylight WITHOUT the sun disc/aureole (the mie term), so
    // the environment map only carries diffuse sky — the sun itself comes
    // from the shadow-casting directional cascades.
    const mie = u.mieCoefficient.value;
    u.mieCoefficient.value = 0.0;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    scene.environment = pmrem.fromScene(skyScene, 0.04).texture;
    pmrem.dispose();
    u.mieCoefficient.value = mie;
  }
  scene.add(sky);
  return { sun, sky };
}

export function buildWorld(scene, mats, { renderer, camera, models = {} } = {}) {
  const group = new THREE.Group();
  scene.add(group);
  const collidables = [];
  const landmarks = [];

  // Sky + lighting: sun via cascaded shadow maps (crisp shadows from the
  // horizon to your feet), skylight from the environment map, plus a little
  // warm bounce off the sand.
  const { sun: sunDir, sky } = buildSky(scene, renderer);
  let csm = null;
  const csmMaterials = new Set();
  if (camera) {
    csm = new CSM({
      camera, parent: scene, cascades: 3, maxFar: 1100, mode: 'practical',
      shadowMapSize: 2048, lightDirection: sunDir.clone().negate(), lightIntensity: 3.4,
      lightMargin: 400, lightFar: 4000, shadowBias: -0.00015
    });
    csm.fade = true;
    csm.updateFrustums();
    for (const l of csm.lights) { l.color.set(0xfff0d2); l.shadow.normalBias = 0.9; }
  } else {
    const sun = new THREE.DirectionalLight(0xfff0d2, 3.0);
    sun.position.copy(sunDir).multiplyScalar(900);
    scene.add(sun);
  }
  const hemi = new THREE.HemisphereLight(0xc4d6ff, 0xcaa56a, 0.25);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xd7c7a6, 0.00013);
  // Hook a material into the cascade shader (and re-apply any custom
  // shader patch the material carries, since CSM replaces onBeforeCompile).
  const setupMaterial = m => {
    if (!m || !m.isMeshStandardMaterial || csmMaterials.has(m)) return;
    csmMaterials.add(m);
    if (!csm) return;
    csm.setupMaterial(m);
    const patch = m.userData.shaderPatch;
    if (patch) { const prev = m.onBeforeCompile; m.onBeforeCompile = (s, r) => { prev(s, r); patch(s); }; }
    m.needsUpdate = true;
  };
  const applyCSM = root => root.traverse(o => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(setupMaterial);
  });

  // Terrain
  const terrain = buildTerrain(mats.sand);
  group.add(terrain); collidables.push(terrain);

  const deco0 = {
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e4a26, roughness: 0.9 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x55732f, roughness: 0.8, side: THREE.DoubleSide }),
    camel: new THREE.MeshStandardMaterial({ color: 0xb18752, roughness: 0.85 }),
    mud: new THREE.MeshStandardMaterial({ color: 0x9a7850, roughness: 0.98 })
  };

  // Main pyramids (+ interiors)
  const defs = {};
  for (const key of ['khufu', 'khafre', 'menkaure']) {
    const p = PYRAMIDS[key];
    const def = buildPyramid(p, mats, collidables, group, { upper: key === 'khufu' && !!models.khufuUpper, sub: key === 'menkaure' && !!models.menkaure });
    defs[key] = def;
    landmarks.push({ name: p.name, blurb: p.blurb, pos: pyrApex(p), radius: 130 });
    // chamber landmarks
    for (const c of def.chambers) {
      landmarks.push({
        name: c.name, blurb: c.blurb, radius: 9,
        pos: { x: p.center.x + c.center.x, y: p.baseY + c.center.y, z: p.center.z + c.center.z }
      });
    }
  }

  // Subsidiary pyramids
  for (const q of QUEENS_KHUFU) buildSmallPyramid(q, mats, collidables, group);
  for (const q of QUEENS_MENKAURE) buildSmallPyramid(q, mats, collidables, group);

  // Sphinx, sunk into its quarried enclosure, + the temples in front (east),
  // all down on the valley-edge terrace ~42 m below the Great Pyramid.
  buildSphinxEnclosure(mats, collidables, group);
  buildSphinx(mats, collidables, group, SPHINX.floorY, models.textures && models.textures.dream_stele);
  landmarks.push({ name: SPHINX.name, blurb: SPHINX.blurb, radius: 70,
    pos: { x: SPHINX.center.x, y: SPHINX.floorY + 12, z: SPHINX.center.z } });
  const st = SPHINX_TEMPLE.center, kv = KHAFRE_VALLEY.center;
  // The Sphinx Temple and Khafre's valley temple, built cell by cell from the
  // published plan (js/templedata.js): core walls, the Sphinx Temple's court
  // and piers, the valley temple's antechamber, T-shaped hall of sixteen
  // granite pillars, magazines and the passage out to the causeway.
  buildTemplePlan(mats, collidables, group, SPHINX.floorY);
  { const fl = new THREE.Mesh(new THREE.BoxGeometry(38, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.35 }));
    fl.position.set(kv.x - 4, SPHINX.floorY + 0.06, kv.z + 2.5); fl.receiveShadow = true; group.add(fl); }      // alabaster paving
  landmarks.push({ name: SPHINX_TEMPLE.name, blurb: SPHINX_TEMPLE.blurb, radius: 30,
    pos: { x: st.x, y: SPHINX_TEMPLE.baseY + 4, z: st.z } });
  landmarks.push({ name: KHAFRE_VALLEY.name, blurb: KHAFRE_VALLEY.blurb, radius: 34,
    pos: { x: kv.x, y: KHAFRE_VALLEY.baseY + 5, z: kv.z } });
  // Amenhotep II's temple: ~22 m square and turned ~33 deg off the grid (satellite)
  const am = AMENHOTEP_TEMPLE.center;
  { const r = 11 * Math.SQRT2, a0 = 33 * DEG + Math.PI / 4, flat = [];
    for (let k = 0; k < 4; k++) flat.push(am.x + Math.cos(a0 + k * Math.PI / 2) * r, am.z + Math.sin(a0 + k * Math.PI / 2) * r);
    buildOutlineWalls(flat, 2.6, 1.6, deco0.mud, collidables, group); }
  landmarks.push({ name: AMENHOTEP_TEMPLE.name, blurb: AMENHOTEP_TEMPLE.blurb, radius: 20,
    pos: { x: am.x, y: AMENHOTEP_TEMPLE.baseY + 3, z: am.z } });

  // Mortuary temples on the east faces. Khufu's keeps its black basalt floor;
  // Khafre's follows its mapped outline.
  const km = KHUFU_MORTUARY;
  const kmY = buildEnclosure(km.center.x, km.center.z, km.sx, km.sz, 1.6, mats, collidables, group);
  const basalt = new THREE.Mesh(new THREE.BoxGeometry(km.sx - 3, 0.5, km.sz - 3),
    new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.55, metalness: 0.1 }));
  basalt.position.set(km.center.x, Math.max(kmY + 0.25, terrainHeight(km.center.x, km.center.z) + 0.1), km.center.z);
  basalt.receiveShadow = true; group.add(basalt);
  landmarks.push({ name: 'Khufu Mortuary Temple', radius: 30, pos: { x: km.center.x, y: 3, z: km.center.z },
    blurb: 'Only the black basalt pavement of Khufu\'s mortuary temple survives — its ' +
      'limestone walls were carried off as building stone.' });
  buildOutlineWalls(TEMPLES.khafreMortuary, 5.5, 3, mats.bedrock, collidables, group);
  const kmt = KHAFRE_MORTUARY.center;
  buildPillars(kmt.x + 8, kmt.z, 5, 2, 5.4, 22, 1.2, 4.5, mats.granite, collidables, group);
  landmarks.push({ name: KHAFRE_MORTUARY.name, blurb: KHAFRE_MORTUARY.blurb, radius: 40,
    pos: { x: kmt.x, y: terrainHeight(kmt.x, kmt.z) + 4, z: kmt.z } });
  const menk = PYRAMIDS.menkaure;
  const mmt = { x: menk.center.x + menk.base / 2 + 30, z: menk.center.z };
  buildEnclosure(mmt.x, mmt.z, 56, 45, 4.5, mats, collidables, group);
  buildOutlineWalls(TEMPLES.menkaureValley, 3.5, 2.5, deco0.mud, collidables, group);
  landmarks.push({ name: MENKAURE_VALLEY.name, blurb: MENKAURE_VALLEY.blurb, radius: 32,
    pos: { x: MENKAURE_VALLEY.center.x, y: MENKAURE_VALLEY.baseY + 4, z: MENKAURE_VALLEY.center.z } });

  // Causeways from the mortuary temples down to the valley temples — they
  // really do descend 40-50 m from the plateau to the edge of the valley.
  const causeways = [];
  const cause = (a, b, w) => { buildCauseway(a, b, w, mats.bedrock, collidables, group); causeways.push([a.x, a.z, b.x, b.z]); };
  cause({ x: kmt.x + 34, z: kmt.z + 2 }, { x: TEMPLE_PLAN.x0 - 1, z: SPHINX.center.z + 43 }, 8);     // meets the valley temple's NW corner (plan)
  cause({ x: mmt.x + 29, z: mmt.z }, { x: MENKAURE_VALLEY.center.x - 28, z: MENKAURE_VALLEY.center.z }, 7);
  // Khufu's runs ENE off the escarpment; past its foot it lies buried under
  // the village, where only the excavated valley-temple pit is shown.
  const kcw = KHUFU_CAUSEWAY;
  let kcLen = 40;
  while (kcLen < kcw.len - 60 && terrainHeight(kcw.a.x + kcw.dir.x * kcLen, kcw.a.z + kcw.dir.z * kcLen) > -32) kcLen += 10;
  cause(kcw.a, { x: kcw.a.x + kcw.dir.x * kcLen, z: kcw.a.z + kcw.dir.z * kcLen }, 9);
  const kvt = KHUFU_VALLEY.center;
  buildEnclosure(kvt.x, kvt.z, 30, 24, 0.8, mats, collidables, group);
  const kvb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 20), basalt.material);
  kvb.position.set(kvt.x, terrainHeight(kvt.x, kvt.z) - 0.5, kvt.z); kvb.receiveShadow = true; group.add(kvb);
  landmarks.push({ name: KHUFU_VALLEY.name, blurb: KHUFU_VALLEY.blurb, radius: 30,
    pos: { x: kvt.x, y: terrainHeight(kvt.x, kvt.z) + 3, z: kvt.z } });

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
    g.translate(x, terrainHeight(x, z) + s / 2 - 0.15, z);
    blockGeoms.push(g);
  }
  const blocks = new THREE.Mesh(mergeGeometries(blockGeoms, false), mats.limestone);
  blocks.userData.collidable = true; blocks.castShadow = true;
  group.add(blocks); collidables.push(blocks);

  // ---- Mapped cemeteries, the modern town, palms (roads are painted into
  // the ground shader from the mapped road network) ------------------
  const deco = deco0;
  const mastabas = [], buildings = [], town = [];
  buildTombs(mats, collidables, group, mastabas);
  buildTown(mats, collidables, group, town, [{ ...KHUFU_VALLEY.center, r: 36 }]);
  buildPalms(deco, group);

  // Quarries: the Central Field south of Khafre's causeway, and Menkaure's
  buildQuarry(GIS_QUARRY, mats.bedrock, collidables, group);
  landmarks.push({ name: GIS_QUARRY.name, blurb: GIS_QUARRY.blurb, radius: 80,
    pos: { x: GIS_QUARRY.center.x, y: terrainHeight(GIS_QUARRY.center.x, GIS_QUARRY.center.z) + 3, z: GIS_QUARRY.center.z } });
  buildQuarry(MENKAURE_QUARRY, mats.bedrock, collidables, group, 150, 130, 50);
  landmarks.push({ name: MENKAURE_QUARRY.name, blurb: MENKAURE_QUARRY.blurb, radius: 90,
    pos: { x: MENKAURE_QUARRY.center.x, y: terrainHeight(MENKAURE_QUARRY.center.x, MENKAURE_QUARRY.center.z) + 3, z: MENKAURE_QUARRY.center.z } });

  // Tomb of Khentkaus I + the workers' town south of the Wall of the Crow
  buildKhentkaus(KHENTKAUS, mats, collidables, group);
  landmarks.push({ name: KHENTKAUS.name, blurb: KHENTKAUS.blurb, radius: 40,
    pos: { x: KHENTKAUS.center.x, y: KHENTKAUS.baseY + 8, z: KHENTKAUS.center.z } });
  // Heit el-Ghurab's gallery blocks: long, narrow N–S barracks in rows
  buildVillage({ center: WORKERS_VILLAGE.center, cols: 12, rows: 3, dx: 6.2, dz: 40, bw: 4.6, bd: 33, jw: 0.4, jd: 2, jitter: 0.4 },
    deco.mud, collidables, group, buildings);
  buildVillage({ center: { x: WORKERS_VILLAGE.center.x + 95, z: WORKERS_VILLAGE.center.z + 10 }, cols: 4, rows: 4, dx: 17, dz: 15 },
    deco.mud, collidables, group, buildings);
  landmarks.push({ name: WORKERS_VILLAGE.name, blurb: WORKERS_VILLAGE.blurb, radius: 110,
    pos: { x: WORKERS_VILLAGE.center.x, y: terrainHeight(WORKERS_VILLAGE.center.x, WORKERS_VILLAGE.center.z) + 4, z: WORKERS_VILLAGE.center.z } });
  buildWallOfCrow(WALL_OF_CROW, mats, collidables, group);
  const crowMid = { x: (WALL_OF_CROW.a.x + WALL_OF_CROW.b.x) / 2, z: (WALL_OF_CROW.a.z + WALL_OF_CROW.b.z) / 2 };
  landmarks.push({ name: WALL_OF_CROW.name, blurb: WALL_OF_CROW.blurb, radius: 60,
    pos: { x: crowMid.x, y: terrainHeight(crowMid.x, crowMid.z) + 6, z: crowMid.z } });

  // Satellite / cult pyramids
  for (const s of SATELLITES) {
    buildSmallPyramid(s, mats, collidables, group);
    landmarks.push({ name: s.name, radius: s.base * 0.8 + 8,
      pos: { x: s.center.x, y: s.baseY + s.height, z: s.center.z },
      blurb: 'A small satellite (cult) pyramid for the king\'s ka.' });
  }

  // Khufu's boat pits — one holds the reconstructed ship
  for (const pit of BOAT_PITS) {
    const bp = buildBoatPit(pit, mats, collidables, group);
    if (pit.boat) landmarks.push({
      name: "Khufu's Solar Boat", radius: 26, pos: { x: bp.x, y: 5, z: bp.z },
      blurb: 'A nod to the 43 m cedar "solar barque" found dismantled in a sealed ' +
        'pit beside the Great Pyramid in 1954 and painstakingly reassembled.'
    });
  }

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
  tpg.position.set(tp.x, groundUnder(tp.x, tp.z, 8, 4.5) - 0.3, tp.z); group.add(tpg); tpg.updateMatrixWorld(true);
  collidables.push(slab);
  landmarks.push({ name: TRIAL_PASSAGES.name, blurb: TRIAL_PASSAGES.blurb, radius: 22,
    pos: { x: tp.x, y: tpg.position.y + 3, z: tp.z } });

  // Khentkaus town (priests' settlement) + workers' cemetery on the slope
  buildVillage({ center: KHENTKAUS_TOWN.center, cols: 6, rows: 2, dx: 14, dz: 13, bw: 9, bd: 7 },
    deco.mud, collidables, group, buildings);
  landmarks.push({ name: KHENTKAUS_TOWN.name, blurb: KHENTKAUS_TOWN.blurb, radius: 45,
    pos: { x: KHENTKAUS_TOWN.center.x, y: terrainHeight(KHENTKAUS_TOWN.center.x, KHENTKAUS_TOWN.center.z) + 3, z: KHENTKAUS_TOWN.center.z } });
  buildVillage({ center: WORKERS_CEMETERY.center, cols: 8, rows: 6, dx: 8, dz: 7, bw: 4.5, bd: 3.5, jitter: 2.5 },
    deco.mud, collidables, group, mastabas);
  landmarks.push({ name: WORKERS_CEMETERY.name, blurb: WORKERS_CEMETERY.blurb, radius: 55,
    pos: { x: WORKERS_CEMETERY.center.x, y: terrainHeight(WORKERS_CEMETERY.center.x, WORKERS_CEMETERY.center.z) + 2, z: WORKERS_CEMETERY.center.z } });

  // Saddled camels waiting for riders (walk up and press E): on the terrace
  // by the Sphinx, at the Great Pyramid's north side and at the panorama
  const rideables = [];
  for (const [x, z, rot, col] of [[SPHINX.center.x + 30, SPHINX.center.z - 48, 1.0, 0xb03030], [SPHINX.center.x + 46, SPHINX.center.z - 56, 1.4, 0x2d5aa0],
    [40, -165, 0.4, 0xd8a030], [52, -172, 0.9, 0x3f7f3f], [-725, 1140, 2.2, 0xb03030], [-740, 1132, 2.6, 0x8a3fa0]]) {
    const c = buildCamel(deco.camel, x, z, rot, { saddle: col });
    group.add(c); rideables.push(c);
  }

  // A small camel caravan plodding a loop on the open desert south of
  // Khafre (not collidable — it moves).
  const caravan = [];
  for (let i = 0; i < 4; i++) { const c = buildCamel(deco.camel, 0, 0, 0); group.add(c); caravan.push({ g: c, off: i * 8.5, ph: i * 1.3 }); }
  const cc = { x: -180, z: 640 }, cr = 55;

  // Blender-built sites (tools/blender/ -> assets/models/)
  const place = (model, position, pois) => placeModel(model, { position, mats, group, collidables, landmarks, pois, textures: models.textures });
  const shell = (x, y, z, sx, sy, sz) => {          // unseen overburden that keeps the sun out
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.castShadow = true; group.add(m);
  };
  if (models.serapeum) {
    const o = SERAPEUM.origin;
    const { anchors } = place(models.serapeum, o, SERAPEUM.pois);
    if (anchors.spawn) Object.assign(SERAPEUM.spawn, { x: anchors.spawn.x, y: anchors.spawn.y, z: anchors.spawn.z });
    shell(o.x - 120, o.y + 4, o.z - 8, 340, 40, 160);
  }
  if (models.khufuUpper) {
    const kc = PYRAMIDS.khufu.center, o = KHUFU_UPPER.origin;
    const { anchors } = place(models.khufuUpper, { x: kc.x + o.x, y: o.y, z: kc.z + o.z }, KHUFU_UPPER.pois);
    const set = (dst, a) => a && Object.assign(dst, { x: a.x, y: a.y, z: a.z });
    set(KHUFU_UPPER.tpKing, anchors.tp_king); set(KHUFU_UPPER.tpCampbell, anchors.tp_campbell);
  }
  if (models.menkaure) {
    const m = PYRAMIDS.menkaure;
    const { anchors } = place(models.menkaure, { x: m.center.x, y: m.baseY, z: m.center.z }, MENKAURE_SUB.pois);
    const a = anchors.tp_menkaure; if (a) Object.assign(MENKAURE_SUB.tp, { x: a.x, y: a.y, z: a.z });
  }
  if (models.meresankh) {
    const c = MERESANKH.center, y = terrainHeight(c.x, c.z) - 7.5;
    const { anchors } = place(models.meresankh, { x: c.x - 1.7, y, z: c.z + 3.55 }, MERESANKH.pois);
    if (anchors.tp_meresankh) Object.assign(MERESANKH.tp, { x: anchors.tp_meresankh.x, y: anchors.tp_meresankh.y, z: anchors.tp_meresankh.z });
    if (anchors.tp_burial) Object.assign(MERESANKH.tpBurial, { x: anchors.tp_burial.x, y: anchors.tp_burial.y, z: anchors.tp_burial.z });
    shell(c.x, y - 1, c.z, 34, 20, 36);
  }
  buildPyramidDetails(mats, collidables, group);
  buildBuses(collidables, group);
  const touristTick = buildVisitors(group);
  const trafficTick = buildTraffic(group, deco.camel);
  buildSummitMast(group);
  const lightShow = buildLightShow(scene);

  // Surviving casing at the Great Pyramid base + circling birds
  buildCasingRemnants(PYRAMIDS.khufu, mats, collidables, group);
  const birdTick = buildBirds(group);
  const tick = t => {
    birdTick(t);
    touristTick(t);
    trafficTick(t);
    for (const c of caravan) {
      const s = (t * 1.1 + c.off) / cr;
      const x = cc.x + Math.cos(s) * cr, z = cc.z + Math.sin(s) * cr;
      c.g.position.set(x, terrainHeight(x, z), z);
      c.g.rotation.y = -s - Math.PI / 2;
      const legs = c.g.children;
      for (let k = 5; k < 9; k++) legs[k].rotation.z = Math.sin(t * 3.2 + c.ph + (k % 2 ? Math.PI : 0) + (k > 6 ? 0.6 : 0)) * 0.28;
      legs[4].rotation.z = Math.sin(t * 1.6 + c.ph) * 0.08;   // head bob
    }
  };

  return { group, collidables, landmarks, sunDir, sky, hemi, tick, mastabas, buildings, town, causeways, csm, setupMaterial, applyCSM, rideables, lightShow };
}

function pyrApex(p) {
  return { x: p.center.x, y: p.baseY + p.height, z: p.center.z };
}

export { terrainHeight, inPit };

