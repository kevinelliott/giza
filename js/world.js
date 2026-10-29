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
  TRIAL_PASSAGES, KHENTKAUS_TOWN, WORKERS_CEMETERY, GIS_QUARRY
} from './data.js';
import {
  buildPyramidGeometry, buildSteppedPyramidGeometry, buildInterior, buildStaircase
} from './builders.js';
import { terrainHeight, inPit, groundUnder, GRID, SPHINX_PIT } from './terrain.js';
import { TOMBS, TOWN, TREES, TEMPLES, EXTENT } from './geodata.js';

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
  interior.position.set(p.center.x, p.baseY, p.center.z);
  interior.traverse(m => { if (m.userData.collidable) collidables.push(m); });
  group.add(interior);

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

// A detailed Great Sphinx (recumbent lion, nemes headdress, outstretched
// paws, Dream Stele), sat with its base at `baseY` inside its enclosure.
function buildSphinx(mats, collidables, group, baseY) {
  const s = SPHINX;
  const g = new THREE.Group();
  const body = mats.limestone, head = mats.limestone, gr = mats.granite;   // one outcrop: head and body are the same stone
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

// The quarried enclosure the Sphinx sits in: cut down into the slope to the
// level of the temples in front of it, so its rock walls on the N, W and S
// stand as high as the surrounding ground (open to the east).
function buildSphinxEnclosure(mats, collidables, group) {
  const { x0, x1, z0, z1, y: floorY } = SPHINX_PIT;
  const t = 5;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 2 * t, 1, z1 - z0 + 2 * t), mats.bedrock);
  floor.position.set((x0 + x1) / 2, floorY - 0.5, (z0 + z1) / 2); floor.receiveShadow = true;
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
      const g = new THREE.BoxGeometry(Math.abs(px1 - px0) || t, hgt, Math.abs(pz1 - pz0) || t);
      g.translate((px0 + px1) / 2 + ox / 2, floorY + hgt / 2, (pz0 + pz1) / 2 + oz / 2);
      geoms.push(g);
    }
  };
  const rx = x0 + 10, rz = z0 - 18;                        // ramp gap in the north wall
  piece(x0 - t, z0 - t / 2, rx - 3.5, z0 - t / 2, 0, -t);  // north
  piece(rx + 3.5, z0 - t / 2, x1 + t, z0 - t / 2, 0, -t);
  piece(x0 - t, z1 + t / 2, x1 + t, z1 + t / 2, 0, t);    // south
  piece(x0 - t / 2, z0, x0 - t / 2, z1, -t, 0);           // west (behind the tail)
  const walls = new THREE.Mesh(mergeGeometries(geoms, false), mats.bedrock);
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

// Rows of square pillars (the granite-pillared halls of the temples).
function buildPillars(cx, cz, cols, rows, dx, dz, size, height, mat, collidables, group) {
  const geoms = [];
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
function buildTombs(mats, collidables, group, out) {
  const stone = [], white = [];
  for (const [x, z, L, W, rot, h, kind, name] of TOMBS) {
    const y0 = groundUnder(x, z, L / 2, W / 2) - 0.4;
    const top = Math.max(terrainHeight(x, z), terrainHeight(x + L / 2, z), terrainHeight(x - L / 2, z)) + h;
    const H = top - y0;
    const g = new THREE.BoxGeometry(L, H, W, 1, 1, 1);
    const p = g.attributes.position;
    const batter = kind ? 1 : Math.max(0.86, 1 - 0.07 * h / Math.min(L, W) * 2);
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * batter); p.setZ(i, p.getZ(i) * (1 - (1 - batter) * L / W * 0.5)); }
    g.computeVertexNormals();
    g.rotateY(-rot * DEG);
    g.translate(x, y0 + H / 2, z);
    (kind ? white : stone).push(g);
    out.push({ x, z, w: L, d: W, rot, name: name || null, modern: !!kind });
  }
  for (const [list, mat] of [[stone, mats.bedrock], [white, mats.plaster]]) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
    mesh.userData.collidable = true; mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); collidables.push(mesh);
  }
}

// The modern town (Nazlet el-Samman and the Pyramids-road districts) from
// mapped building outlines: extruded, vertex-coloured brick and plaster.
function buildTown(mats, collidables, group, out, clearings) {
  const pos = [], col = [], idx = [];
  const palette = [[0.62, 0.38, 0.27], [0.70, 0.45, 0.33], [0.80, 0.70, 0.55], [0.86, 0.80, 0.68],
    [0.74, 0.66, 0.56], [0.90, 0.86, 0.78], [0.66, 0.55, 0.42], [0.58, 0.34, 0.24]];
  let o = 0;
  for (let b = 0; b < TOWN.n.length; b++) {
    const n = TOWN.n[b], h = TOWN.h[b];
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(TOWN.p[o + i * 2], TOWN.p[o + i * 2 + 1]));
    o += n * 2;
    let cx = 0, cz = 0, gmin = Infinity, gmax = -Infinity;
    for (const v of pts) { cx += v.x / n; cz += v.y / n; const g = terrainHeight(v.x, v.y); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
    if (clearings.some(c => Math.hypot(cx - c.x, cz - c.z) < c.r)) continue;
    const y0 = gmin - 0.6, y1 = gmax + h;
    const hv = Math.abs(Math.sin(cx * 12.99 + cz * 78.23) * 43758.5) % 1;
    const c = palette[Math.floor(hv * palette.length)], shade = 0.92 + 0.16 * ((hv * 7.3) % 1);
    const base = pos.length / 3;
    // walls (outline is clockwise in x/z, so outward normals face away from the centre)
    for (let i = 0; i < n; i++) {
      const a = pts[i], d = pts[(i + 1) % n], k = pos.length / 3;
      pos.push(a.x, y0, a.y, d.x, y0, d.y, d.x, y1, d.y, a.x, y1, a.y);
      for (let q = 0; q < 4; q++) col.push(c[0] * shade, c[1] * shade, c[2] * shade);
      idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
    }
    // flat roof
    const tri = THREE.ShapeUtils.triangulateShape(pts, []);
    const k = pos.length / 3;
    for (const v of pts) { pos.push(v.x, y1, v.y); col.push(c[0] * shade * 0.9, c[1] * shade * 0.9, c[2] * shade * 0.9); }
    for (const [a, bb, cc] of tri) idx.push(k + a, k + cc, k + bb);
    out.push({ pts, h });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
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
  for (const [lx, lz] of [[-1.2, 0.5], [-1.2, -0.5], [1.2, 0.5], [1.2, -0.5]]) {
    const leg = part(0.35, 2.0, 0.35, lx, 2.0, lz);      // legs, pivoted at the hip
    leg.geometry.translate(0, -1.0, 0);
  }
  g.position.set(x, terrainHeight(x, z), z); g.rotation.y = rot;
  g.updateMatrixWorld(true);
  if (collidables) collidables.push(body);
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

export function buildWorld(scene, mats, { renderer, camera } = {}) {
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
    const def = buildPyramid(p, mats, collidables, group);
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
  buildSphinx(mats, collidables, group, SPHINX.floorY);
  landmarks.push({ name: SPHINX.name, blurb: SPHINX.blurb, radius: 70,
    pos: { x: SPHINX.center.x, y: SPHINX.floorY + 12, z: SPHINX.center.z } });
  const st = SPHINX_TEMPLE.center, kv = KHAFRE_VALLEY.center;
  buildEnclosure(st.x, st.z, 46, 43, 5, mats, collidables, group);
  buildPillars(st.x, st.z, 6, 2, 6.5, 26, 1.3, 5.5, mats.granite, collidables, group);   // colonnade around the court
  landmarks.push({ name: SPHINX_TEMPLE.name, blurb: SPHINX_TEMPLE.blurb, radius: 30,
    pos: { x: st.x, y: SPHINX_TEMPLE.baseY + 4, z: st.z } });
  // Khafre's valley temple: granite-cased walls, T-shaped hall of 16 pillars
  buildEnclosure(kv.x, kv.z, 45, 45, 9, mats, collidables, group, mats.granite);
  buildPillars(kv.x - 4, kv.z, 6, 2, 4.6, 5.2, 1.05, 4.2, mats.granite, collidables, group);
  buildPillars(kv.x + 6, kv.z, 2, 2, 4.6, 5.2, 1.05, 4.2, mats.granite, collidables, group);
  landmarks.push({ name: KHAFRE_VALLEY.name, blurb: KHAFRE_VALLEY.blurb, radius: 34,
    pos: { x: kv.x, y: KHAFRE_VALLEY.baseY + 5, z: kv.z } });
  const am = AMENHOTEP_TEMPLE.center;
  buildEnclosure(am.x, am.z, 20, 14, 2.6, mats, collidables, group, deco0.mud);
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
  cause({ x: kmt.x + 34, z: kmt.z + 2 }, { x: kv.x - 24, z: kv.z - 12 }, 8);
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

  // Camels waiting on the terrace north of the Sphinx
  group.add(buildCamel(deco, SPHINX.center.x + 30, SPHINX.center.z - 48, 1.0, collidables));
  group.add(buildCamel(deco, SPHINX.center.x + 46, SPHINX.center.z - 56, 1.4, collidables));

  // A small camel caravan plodding a loop on the open desert south of
  // Khafre (not collidable — it moves).
  const caravan = [];
  for (let i = 0; i < 4; i++) { const c = buildCamel(deco, 0, 0, 0, null); group.add(c); caravan.push({ g: c, off: i * 8.5, ph: i * 1.3 }); }
  const cc = { x: -180, z: 640 }, cr = 55;

  // Surviving casing at the Great Pyramid base + circling birds
  buildCasingRemnants(PYRAMIDS.khufu, mats, collidables, group);
  const birdTick = buildBirds(group);
  const tick = t => {
    birdTick(t);
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

  return { group, collidables, landmarks, sunDir, sky, hemi, tick, mastabas, buildings, town, causeways, csm, setupMaterial, applyCSM };
}

function pyrApex(p) {
  return { x: p.center.x, y: p.baseY + p.height, z: p.center.z };
}

export { terrainHeight, inPit };

