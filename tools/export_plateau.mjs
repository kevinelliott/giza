// Export the open plateau the web build constructs — terrain, pyramids, the
// Sphinx, temples, tombs, town, roads, palms — as one GLB for the native
// (Godot) build, plus the data it needs: terrain heights, fast-travel points,
// landmarks, pyramid envelopes.
//   node tools/export_plateau.mjs   -> godot/models/plateau.glb, godot/data/world.json, godot/data/terrain.bin
// Meshes are merged per material; nodes are named "<material>__col" (walkable /
// solid) or "<material>__vis". Moving things (camels on routes, carriages,
// birds, visitors) are left out: the native build animates its own.
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';

const gradientStub = { addColorStop() {} };
const ctxStub = new Proxy({}, { get: (_t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => gradientStub
  : (k === 'createImageData' || k === 'getImageData') ? (w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w, height: h }) : () => {}, set: () => true });
globalThis.document = { createElement() { return { width: 0, height: 0, getContext: () => ctxStub }; } };

const { makeMaterials } = await import('../js/materials.js');
const { buildWorld } = await import('../js/world.js');
const { GRID, terrainHeight } = await import('../js/terrain.js');
const D = await import('../js/data.js');
const { GEO, EXTENT, ROUTES } = await import('../js/geodata.js');
const { ROADS, LAMPS, BUS_STOPS } = await import('../js/roadnet.js');

const scene = new THREE.Scene();
const mats = makeMaterials();
const world = buildWorld(scene, mats, { assumeModels: true });
scene.updateMatrixWorld(true);

const matName = new Map(Object.entries(mats).map(([k, m]) => [m, k]));
const nameOf = m => m.name || matName.get(m) || ('c_' + (m.color ? m.color.getHexString() : 'ffffff') + (m.transparent ? '_t' : ''));
const collidable = new Set(world.collidables);
const dynamic = o => { for (let n = o; n; n = n.parent) if (n.userData && n.userData.dynamic) return true; return false; };
const PALM = new Set(['6e4a26', '55732f']);

const buckets = new Map();
function bucket(name) {
  if (!buckets.has(name)) buckets.set(name, { pos: [], nrm: [], uv: [], col: [], info: [], idx: [], hasUv: false, hasCol: false, hasInfo: false, n: 0 });
  return buckets.get(name);
}
const v = new THREE.Vector3(), nm = new THREE.Matrix3();
function add(geo, matrix, material, col) {
  const g = geo.index ? geo : geo;                       // keep indices when present
  if (!g.attributes.normal) g.computeVertexNormals();
  const b = bucket(nameOf(material) + (col ? '__col' : '__vis'));
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color, I = g.attributes.aInfo;
  nm.getNormalMatrix(matrix);
  const base = b.n;
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i).applyMatrix4(matrix); b.pos.push(v.x, v.y, v.z);
    v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); if (material.side === THREE.BackSide) v.negate(); b.nrm.push(v.x, v.y, v.z);
    if (U) { b.uv.push(U.getX(i), U.getY(i)); b.hasUv = true; } else b.uv.push(0, 0);
    if (C) { b.col.push(C.getX(i), C.getY(i), C.getZ(i)); b.hasCol = true; } else b.col.push(1, 1, 1);
    if (I) { b.info.push(I.getX(i), I.getY(i), I.getZ(i), I.getW(i)); b.hasInfo = true; } else b.info.push(0, 0, 0, 0);
  }
  if (g.index) for (let i = 0; i < g.index.count; i++) b.idx.push(base + g.index.getX(i));
  else for (let i = 0; i < P.count; i++) b.idx.push(base + i);
  b.n += P.count;
}
const m4 = new THREE.Matrix4(), inst = new THREE.Matrix4();
let skipped = 0;
scene.traverse(o => {
  if (!o.isMesh || dynamic(o)) return;
  const mlist = Array.isArray(o.material) ? o.material : [o.material];
  if (mlist.some(m => !(m.isMeshStandardMaterial || m.isMeshBasicMaterial) || m.colorWrite === false)) { skipped++; return; }
  if (o.isInstancedMesh) {
    if (!PALM.has(o.material.color.getHexString())) { skipped++; return; }       // palms only; people are dynamic
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, inst); add(o.geometry, m4.multiplyMatrices(o.matrixWorld, inst), o.material, false); }
    return;
  }
  if (mlist.length > 1 && o.geometry.groups.length) {                          // multi-material: split by group
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    for (const gr of o.geometry.groups) {
      const sub = new THREE.BufferGeometry();
      for (const k of Object.keys(g.attributes)) {
        const a = g.attributes[k];
        sub.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize));
      }
      add(sub, o.matrixWorld, mlist[gr.materialIndex], collidable.has(o));
    }
  } else add(o.geometry, o.matrixWorld, mlist[0], collidable.has(o));
});

// ---- write a GLB by hand (one mesh per bucket) ---------------------------
const chunks = []; let off = 0;
const json = { asset: { version: '2.0', generator: 'giza export_plateau' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] };
function view(typed, target) {
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (buf.length % 4)) % 4;
  json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) });
  chunks.push(buf); if (pad) chunks.push(Buffer.alloc(pad)); off += buf.length + pad;
  return json.bufferViews.length - 1;
}
function accessor(arr, type, comp, n, minmax) {
  const a = { bufferView: view(arr, comp === 5125 ? 34963 : 34962), componentType: comp, count: n, type };
  if (minmax) { a.min = minmax[0]; a.max = minmax[1]; }
  json.accessors.push(a); return json.accessors.length - 1;
}
let tris = 0;
for (const [name, b] of buckets) {
  const pos = new Float32Array(b.pos);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i + k]); mx[k] = Math.max(mx[k], pos[i + k]); }
  const attributes = { POSITION: accessor(pos, 'VEC3', 5126, b.n, [mn, mx]), NORMAL: accessor(new Float32Array(b.nrm), 'VEC3', 5126, b.n) };
  if (b.hasInfo) {                                         // town: (style+4*part, seed) and (ground y, roof y)
    const a = new Float32Array(b.n * 2), c = new Float32Array(b.n * 2);
    for (let i = 0; i < b.n; i++) { a[i * 2] = b.info[i * 4]; a[i * 2 + 1] = b.info[i * 4 + 1]; c[i * 2] = b.info[i * 4 + 2]; c[i * 2 + 1] = b.info[i * 4 + 3]; }
    attributes.TEXCOORD_0 = accessor(a, 'VEC2', 5126, b.n); attributes.TEXCOORD_1 = accessor(c, 'VEC2', 5126, b.n);
  } else if (b.hasUv) attributes.TEXCOORD_0 = accessor(new Float32Array(b.uv), 'VEC2', 5126, b.n);
  if (b.hasCol) attributes.COLOR_0 = accessor(new Float32Array(b.col), 'VEC3', 5126, b.n);
  const indices = accessor(new Uint32Array(b.idx), 'SCALAR', 5125, b.idx.length);
  json.materials.push({ name: name.split('__')[0], pbrMetallicRoughness: { baseColorFactor: [0.7, 0.65, 0.55, 1], roughnessFactor: 0.9, metallicFactor: 0 }, doubleSided: true });
  json.meshes.push({ name, primitives: [{ attributes, indices, material: json.materials.length - 1 }] });
  json.nodes.push({ name, mesh: json.meshes.length - 1 }); json.scenes[0].nodes.push(json.nodes.length - 1);
  tris += b.idx.length / 3;
}
const bin = Buffer.concat(chunks);
json.buffers.push({ byteLength: bin.length });
let jb = Buffer.from(JSON.stringify(json)); jb = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bin.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jb.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(new URL('../godot/models/plateau.glb', import.meta.url), Buffer.concat([head, jh, jb, bh, bin]));

// ---- data ----------------------------------------------------------------
writeFileSync(new URL('../godot/data/terrain.bin', import.meta.url), Buffer.from(GRID.h.buffer));
const fromModels = /King's Chamber|Campbell|Meresankh|Panelled|Serapeum|Ma'mun|original entrance|Queen's Chamber|Subterranean|Khafre — (burial|lower)/;
const r = n => +n.toFixed(2);
const out = {
  note: 'AUTO-GENERATED by tools/export_plateau.mjs. World metres: x east, y up, z south.',
  geo: GEO, extent: EXTENT,
  grid: { x0: GRID.x0, z0: GRID.z0, step: GRID.step, nx: GRID.nx, nz: GRID.nz },
  pyramids: Object.values(D.PYRAMIDS).map(p => ({ id: p.id, x: p.center.x, z: p.center.z, baseY: p.baseY, base: p.base, height: p.height })),
  sphinx: { x: D.SPHINX.center.x, z: D.SPHINX.center.z, floorY: D.SPHINX.floorY },
  teleports: D.TELEPORTS.filter(t => !fromModels.test(t.label)).map(t => ({ label: t.label, pos: [r(t.pos.x), r(t.pos.y), r(t.pos.z)], ...(t.look ? { look: [r(t.look.x), r(t.look.z)] } : {}) })),
  landmarks: world.landmarks.map(l => ({ name: l.name, blurb: l.blurb, radius: l.radius, pos: [r(l.pos.x), r(l.pos.y), r(l.pos.z)] })),
  // life: site roads plied by carriages and camel rides, saddled camels to ride
  routes: ROUTES,
  // the drivable road graph (tools/geo/build_roadnet.py): [kind, rank, half width, speed, x, z, ...]; street lamps [x, z, heading]
  roads: ROADS, lamps: LAMPS, busStops: BUS_STOPS,
  rideables: world.rideables.map(c => ({ x: r(c.position.x), z: r(c.position.z), rot: r(c.rotation.y), saddle: c.userData.saddle })),
  // quest
  artifacts: D.ARTIFACTS.map(a => ({ id: a.id, type: a.type, name: a.name, blurb: a.blurb, pos: [r(a.pos.x), r(a.pos.y), r(a.pos.z)] })),
  // map
  map: {
    mastabas: world.mastabas.map(m => [r(m.x), r(m.z), r(m.w), r(m.d), r(m.rot || 0), m.modern ? 1 : 0]),
    small: [...D.QUEENS_KHUFU, ...D.QUEENS_MENKAURE, ...D.SATELLITES].map(q => [q.center.x, q.center.z, q.base]),
    causeways: world.causeways.map(c => c.map(r)),
    wall: [D.WALL_OF_CROW.a.x, D.WALL_OF_CROW.a.z, D.WALL_OF_CROW.b.x, D.WALL_OF_CROW.b.z]
  }
};
writeFileSync(new URL('../godot/data/world.json', import.meta.url), JSON.stringify(out));
console.log('plateau.glb', (bin.length / 1e6).toFixed(1), 'MB,', Math.round(tris), 'triangles,', buckets.size, 'meshes; skipped', skipped);
console.log([...buckets].map(([k, b]) => `${k}:${Math.round(b.idx.length / 3)}`).join('  '));
console.log('routes', out.routes.length, 'rideables', out.rideables.length, 'artifacts', out.artifacts.length, 'mastabas', out.map.mastabas.length, 'teleports', out.teleports.length, 'landmarks', out.landmarks.length);
