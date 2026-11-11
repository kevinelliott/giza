// Headless smoke test: exercises all geometry/physics building code paths
// (everything except the WebGL renderer) to catch runtime errors.
import * as THREE from 'three';

// --- Minimal DOM stubs so CanvasTexture etc. work under Node ----------
const gradientStub = { addColorStop() {} };
const ctxStub = new Proxy({}, {
  get: (_t, k) => {
    if (k === 'createLinearGradient' || k === 'createRadialGradient' ||
        k === 'createPattern') return () => gradientStub;
    if (k === 'createImageData' || k === 'getImageData')
      return (w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w, height: h });
    return () => {};
  },
  set: () => true
});
globalThis.document = {
  createElement() {
    return { width: 0, height: 0, getContext: () => ctxStub };
  }
};

const { makeMaterials } = await import('../js/materials.js');
const { buildWorld } = await import('../js/world.js');
const { buildCollider, Player } = await import('../js/player.js');
const { TELEPORTS, PYRAMIDS, SPHINX } = await import('../js/data.js');

// Layout accuracy: centre-to-centre offsets from the Great Pyramid against
// Petrie's 1880-82 triangulation, and the Sphinx against its mapped outline.
{
  const check = (name, got, want, tol) => {
    const err = Math.hypot(got.x - want.x, got.z - want.z);
    if (err > tol) throw new Error(`${name} is ${err.toFixed(2)} m from its surveyed position`);
    console.log(`layout OK — ${name}: ${Math.hypot(got.x, got.z).toFixed(1)} m from Khufu (error ${err.toFixed(2)} m)`);
  };
  check('Khafre', PYRAMIDS.khafre.center, { x: -334.41, z: 353.86 }, 0.05);
  check('Menkaure', PYRAMIDS.menkaure.center, { x: -574.45, z: 739.19 }, 0.05);
  check('Sphinx', SPHINX.center, { x: 326.1, z: 431.0 }, 2);
  const d = Math.hypot(PYRAMIDS.khafre.center.x - PYRAMIDS.khufu.center.x, PYRAMIDS.khafre.center.z - PYRAMIDS.khufu.center.z);
  if (Math.abs(d - 486.9) > 0.5) throw new Error('Khufu–Khafre spacing off: ' + d);
}

// Blender-built model: check the GLB carries what the loader expects.
{
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(new URL('../assets/models/serapeum.glb', import.meta.url));
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('serapeum.glb is not a GLB');
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  const names = json.nodes.map(n => n.name);
  for (const [file, needs] of [['khufu_lower.glb', ['tp_mamun', 'tp_entrance', 'tp_queen', 'tp_subterranean', 'poi_niche', 'poi_pit']], ['khafre.glb', ['tp_burial_chamber', 'tp_lower_chamber', 'poi_coffer', 'tex_belzoni']], ['khufu_upper.glb', ['tp_king', 'tp_campbell', 'poi_gallery', 'insc_campbell_khufu']], ['meresankh.glb', ['tp_meresankh', 'tp_burial', 'poi_statues', 'poi_scribes', 'tex_mer_pillar', 'tex_mer_kawab', 'tex_mer_jamb', 'insc_meresankh_sarc']], ['menkaure.glb', ['tp_menkaure', 'poi_burial', 'poi_niches', 'insc_menkaure_panel_long', 'insc_menkaure_panel_short']]]) {
    const b = readFileSync(new URL('../assets/models/' + file, import.meta.url));
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
    const nn = j.nodes.map(n => n.name);
    for (const need of needs) if (!nn.includes(need)) throw new Error(file + ' is missing node ' + need);
    console.log(file, 'OK —', j.meshes.length, 'meshes');
  }
  for (const need of ['rock', 'spawn', 'insc_amasis_lid', 'insc_cambyses_lid', 'insc_khabash_lid', 'insc_ptolemaic_end', 'poi_entrance'])
    if (!names.includes(need)) throw new Error('serapeum.glb is missing node ' + need);
  const { INSCRIPTIONS } = await import('../js/inscriptions.js');
  for (const n of names.filter(n => n.startsWith('insc_')))
    if (!INSCRIPTIONS[n.slice(5)]) throw new Error('no inscription defined for panel ' + n);
  console.log('serapeum.glb OK —', json.meshes.length, 'meshes,', names.filter(n => n.startsWith('insc_')).length, 'inscription panels');
}

const scene = new THREE.Scene();
const mats = makeMaterials();
console.log('materials OK');

const world = buildWorld(scene, mats);
console.log('world OK — collidables:', world.collidables.length,
  'landmarks:', world.landmarks.length);

// Verify every collidable has a real, non-empty geometry.
let triTotal = 0;
for (const m of world.collidables) {
  const pos = m.geometry.getAttribute('position');
  if (!pos || pos.count === 0) throw new Error('empty collidable geometry');
  triTotal += pos.count / 3;
}
console.log('collision triangles ~', Math.round(triTotal));

const collider = buildCollider(scene, world.collidables);
if (!collider.geometry.boundsTree) throw new Error('no BVH built');
console.log('collider + BVH OK');

// Run a few physics frames including a capsule shapecast.
const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
scene.add(cam);
const player = new Player(cam, collider);
player.teleport(TELEPORTS[3].pos);           // King's Chamber
const input = { forward: true, back: false, left: false, right: false,
  jump: false, crouch: false, sprint: false };
for (let i = 0; i < 120; i++) player.update(1 / 60, input);
console.log('physics OK — settled at',
  player.position.toArray().map(v => +v.toFixed(2)).join(', '),
  'onGround:', player.onGround);

// Drop-test from the start overlook: player should fall and land (not NaN).
player.fly = false;
player.teleport(TELEPORTS[0].pos);
for (let i = 0; i < 240; i++) player.update(1 / 60, input);
if ([player.position.x, player.position.y, player.position.z].some(Number.isNaN))
  throw new Error('player position went NaN');
console.log('drop-test OK — landed at',
  player.position.toArray().map(v => +v.toFixed(2)).join(', '),
  'onGround:', player.onGround);

console.log('\nALL HEADLESS CHECKS PASSED');
