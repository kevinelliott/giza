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
const { TELEPORTS } = await import('../js/data.js');

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
