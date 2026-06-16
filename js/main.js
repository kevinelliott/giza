import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { makeMaterials } from './materials.js';
import { buildWorld } from './world.js';
import { buildCollider, Player } from './player.js';
import { TELEPORTS, PYRAMIDS, QUEENS_KHUFU, QUEENS_MENKAURE, SPHINX } from './data.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.68;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 6000);
scene.add(camera);

// ---- Build the plateau ----------------------------------------------
setStatus('Quarrying limestone and raising the pyramids…');
const mats = makeMaterials();
const world = buildWorld(scene, mats);

setStatus('Surveying passages and computing collisions…');
const collider = buildCollider(scene, world.collidables);

const player = new Player(camera, collider);
player.teleport(TELEPORTS[0].pos);
camera.lookAt(0, 30, 0);          // face the pyramids from the overlook

// ---- Player headlamp (auto-on inside the pyramids) ------------------
const lamp = new THREE.SpotLight(0xfff0d0, 0.0, 80, Math.PI / 3.2, 0.5, 1.0);
lamp.position.set(0, 0, 0.2);
const lampTarget = new THREE.Object3D();
lampTarget.position.set(0, 0, -1);
camera.add(lamp); camera.add(lampTarget); lamp.target = lampTarget;
let forceLamp = false;            // manual override (L)

// ---- Controls -------------------------------------------------------
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
let started = false;
const controls = new PointerLockControls(camera, renderer.domElement);
const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');
const mobileUI = document.getElementById('mobile');

// Manual look state for touch devices (pointer lock is unsupported there).
const look = { yaw: 2.34, pitch: -0.05 };   // initially facing the pyramids
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function applyLook() {
  lookEuler.set(look.pitch, look.yaw, 0);
  camera.quaternion.setFromEuler(lookEuler);
}

function showCrosshair(v) { crosshair.style.display = v ? 'block' : 'none'; }

function startMobile() {
  if (menuOpen) return;
  started = true;
  overlay.style.display = 'none';
  if (mobileUI) mobileUI.style.display = 'block';
  showCrosshair(true);
  applyLook();
}
const requestLock = () => {
  if (menuOpen) return;
  const p = controls.lock();
  if (p && typeof p.catch === 'function') p.catch(() => {});
};
overlay.addEventListener('click', () => { isTouch ? startMobile() : requestLock(); });
renderer.domElement.addEventListener('click', () => { if (!isTouch) requestLock(); });
controls.addEventListener('lock', () => {
  started = true; overlay.style.display = 'none'; showCrosshair(true);
});
controls.addEventListener('unlock', () => {
  if (!menuOpen) { overlay.style.display = 'flex'; showCrosshair(false); }
});
// On desktop, releasing the pointer pauses; on touch we never lock.
if (isTouch) {
  const big = overlay.querySelector('.big');
  if (big) big.textContent = 'Tap to start';
}

// ---- Input ----------------------------------------------------------
const input = { forward: false, back: false, left: false, right: false,
  jump: false, crouch: false, sprint: false };
let sprintHeld = false;       // Shift (hold)
let runToggle = false;        // R / RUN button (toggle)
const keymap = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', ControlLeft: 'crouch', KeyC: 'crouch'
};
addEventListener('keydown', e => {
  if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprintHeld = true;
  if (e.code === 'KeyR') toggleRun();
  if (e.code === 'KeyF') toggleFly();
  if (e.code === 'KeyL') toggleLamp();
  if (e.code === 'KeyM') toggleMenu();
  if (e.code === 'KeyH') toggleHelp();
  if (e.code === 'KeyE') useItem();
  if (/^Digit[1-9]$/.test(e.code)) selectSlot(+e.code.slice(5) - 1);
});
addEventListener('keyup', e => {
  if (keymap[e.code]) input[keymap[e.code]] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprintHeld = false;
});

function toggleFly() {
  player.fly = !player.fly;
  document.getElementById('flyState').textContent = player.fly ? 'ON' : 'off';
}
function toggleLamp() { forceLamp = !forceLamp; }
function toggleRun() {
  runToggle = !runToggle;
  const el = document.getElementById('runState'); if (el) el.textContent = runToggle ? 'ON' : 'off';
}

// ---- Teleport menu --------------------------------------------------
let menuOpen = false;
const menu = document.getElementById('menu');
const menuList = document.getElementById('menuList');
TELEPORTS.forEach((t, i) => {
  const li = document.createElement('button');
  li.className = 'tp';
  li.textContent = `${i + 1}. ${t.label}`;
  li.onclick = () => {
    player.teleport(t.pos);
    toggleMenu();
    if (!isTouch) requestLock();
  };
  menuList.appendChild(li);
});
function toggleMenu() {
  menuOpen = !menuOpen;
  menu.style.display = menuOpen ? 'block' : 'none';
  if (menuOpen) {
    if (!isTouch) controls.unlock();
    overlay.style.display = 'none';
  } else if (isTouch && started) {
    if (mobileUI) mobileUI.style.display = 'block';
  }
  if (menuOpen && mobileUI) mobileUI.style.display = 'none';
}
const help = document.getElementById('help');
function toggleHelp() { help.style.display = help.style.display === 'block' ? 'none' : 'block'; }

// ---- Inventory + placeable torches ---------------------------------
const inventory = [
  { id: 'torch', name: 'Torch', count: 12 },
  null, null, null, null, null
];
const ICONS = { torch: '🔥' };
let selSlot = 0;
const hotbar = document.getElementById('hotbar');
const slotEls = [];
inventory.forEach((_, i) => {
  const el = document.createElement('div');
  el.className = 'slot';
  el.innerHTML = `<span class="key">${i + 1}</span><span class="icon"></span><span class="cnt"></span>`;
  el.addEventListener('click', () => selectSlot(i));
  el.addEventListener('touchstart', e => { selectSlot(i); e.preventDefault(); }, { passive: false });
  hotbar.appendChild(el);
  slotEls.push(el);
});
function renderHotbar() {
  inventory.forEach((it, i) => {
    const el = slotEls[i];
    el.classList.toggle('sel', i === selSlot);
    el.querySelector('.icon').textContent = (it && it.count > 0) ? (ICONS[it.id] || '?') : '';
    el.querySelector('.cnt').textContent = (it && it.count > 1) ? it.count : '';
  });
}
function selectSlot(i) {
  const n = slotEls.length;
  selSlot = ((i % n) + n) % n;
  renderHotbar();
}
renderHotbar();
addEventListener('wheel', e => {
  if (!(started || controls.isLocked)) return;
  selectSlot(selSlot + (e.deltaY > 0 ? 1 : -1));
}, { passive: true });

const _ray = new THREE.Raycaster();
const _rp = new THREE.Vector3();
const _rd = new THREE.Vector3();
const torchGroup = new THREE.Group();
scene.add(torchGroup);
const placedTorches = [];
const TORCH_MAT_STICK = new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.9 });

// Aim + click: pick up a torch you're looking at, otherwise place one.
function useItem() {
  if (!(started || controls.isLocked) || menuOpen) return;
  _ray.set(camera.getWorldPosition(_rp), camera.getWorldDirection(_rd));
  _ray.far = 5;
  // 1) Pick up a placed torch under the crosshair.
  if (placedTorches.length) {
    const hits = _ray.intersectObjects(placedTorches.map(t => t.group), true);
    if (hits.length) {
      let o = hits[0].object, idx = -1;
      while (o) { idx = placedTorches.findIndex(t => t.group === o); if (idx >= 0) break; o = o.parent; }
      if (idx >= 0) { pickUpTorch(idx); return; }
    }
  }
  // 2) Otherwise place the selected torch on whatever surface we're facing.
  const it = inventory[selSlot];
  if (!it || it.count <= 0 || it.id !== 'torch') return;
  _ray.far = 6;
  const hit = _ray.intersectObject(collider, true)[0];
  if (!hit) return;
  const normal = hit.face
    ? hit.face.normal.clone().transformDirection(collider.matrixWorld).normalize()
    : new THREE.Vector3(0, 1, 0);
  placeTorch(hit.point, normal);
  it.count--; renderHotbar();
}

function placeTorch(point, normal) {
  const g = new THREE.Group();
  // Orient a local frame: +Z points out of the wall, +Y is world-up.
  const out = normal.clone().normalize();
  const up = Math.abs(out.y) > 0.95 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, out).normalize();
  const up2 = new THREE.Vector3().crossVectors(out, right).normalize();
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up2, out));
  g.position.copy(point).addScaledVector(out, 0.04);

  // Wall mount + a shaft that leans up-and-out, with the flame at the top.
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), TORCH_MAT_STICK);
  mount.rotation.x = Math.PI / 2;           // lie flat against the wall (along +Z)
  mount.position.set(0, 0, 0.08);
  g.add(mount);

  const tilt = 0.62;                         // ~35° from vertical, leaning outward
  const L = 0.95;
  const dir = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)); // up + out
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, L, 7), TORCH_MAT_STICK);
  shaft.rotation.x = tilt;                   // tip +Y toward up-and-out
  shaft.position.copy(dir).multiplyScalar(L / 2);
  g.add(shaft);

  const tip = dir.clone().multiplyScalar(L + 0.02);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc24a, emissive: 0xff7a18, emissiveIntensity: 2.6 }));
  flame.position.copy(tip).add(new THREE.Vector3(0, 0.06, 0));
  flame.scale.y = 1.4;
  g.add(flame);

  const light = new THREE.PointLight(0xffa23a, 28, 20, 2);
  light.position.copy(flame.position);
  g.add(light);

  torchGroup.add(g);
  placedTorches.push({ group: g, light, mat: flame.material, base: 28 });
}

function pickUpTorch(idx) {
  const t = placedTorches[idx];
  torchGroup.remove(t.group);
  t.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  placedTorches.splice(idx, 1);
  const slot = inventory.find(s => s && s.id === 'torch') || (inventory[selSlot] = { id: 'torch', count: 0 });
  slot.count++; renderHotbar();
}

function flickerTorches(t) {
  for (const to of placedTorches) {
    const f = 0.82 + Math.sin(t * 11 + to.base) * 0.1 + Math.random() * 0.06;
    to.light.intensity = to.base * f;
    to.mat.emissiveIntensity = 2.1 + f;
  }
}
// Left-click places/picks up once you're playing (not while paused).
addEventListener('mousedown', e => { if (e.button === 0) useItem(); });

// ---- Touch controls -------------------------------------------------
// Left side = virtual joystick (move); the rest of the screen = drag-look.
const stickBase = document.getElementById('joystick');
const stickKnob = document.getElementById('stick');
if (isTouch && stickBase) {
  let sid = null, ox = 0, oy = 0;
  const R = 48;
  const rect = () => stickBase.getBoundingClientRect();
  stickBase.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; sid = t.identifier;
    const r = rect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2;
    e.preventDefault();
  }, { passive: false });
  stickBase.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== sid) continue;
      let dx = t.clientX - ox, dy = t.clientY - oy;
      const m = Math.hypot(dx, dy) || 1;
      const cl = Math.min(m, R);
      dx = dx / m * cl; dy = dy / m * cl;
      stickKnob.style.transform = `translate(${dx}px,${dy}px)`;
      input.moveX = dx / R; input.moveY = -dy / R;
    }
    e.preventDefault();
  }, { passive: false });
  const endStick = e => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      sid = null; input.moveX = 0; input.moveY = 0;
      stickKnob.style.transform = 'translate(0,0)';
    }
  };
  stickBase.addEventListener('touchend', endStick);
  stickBase.addEventListener('touchcancel', endStick);

  // Drag anywhere else to look around.
  let lid = null, lx = 0, ly = 0;
  renderer.domElement.addEventListener('touchstart', e => {
    if (lid !== null) return;
    const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY;
  }, { passive: true });
  renderer.domElement.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== lid) continue;
      look.yaw -= (t.clientX - lx) * 0.005;
      look.pitch -= (t.clientY - ly) * 0.005;
      look.pitch = Math.max(-1.45, Math.min(1.45, look.pitch));
      lx = t.clientX; ly = t.clientY;
    }
  }, { passive: true });
  const endLook = e => {
    for (const t of e.changedTouches) if (t.identifier === lid) lid = null;
  };
  renderer.domElement.addEventListener('touchend', endLook);
  renderer.domElement.addEventListener('touchcancel', endLook);

  // On-screen action buttons.
  const hold = (id, prop) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('touchstart', e => { input[prop] = true; e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', e => { input[prop] = false; e.preventDefault(); }, { passive: false });
  };
  const tap = (id, fn) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('touchstart', e => { fn(); e.preventDefault(); }, { passive: false });
  };
  hold('btnJump', 'jump');
  hold('btnCrouch', 'crouch');
  tap('btnSprint', toggleRun);
  tap('btnFly', toggleFly);
  tap('btnLamp', toggleLamp);
  tap('btnPlace', useItem);
  tap('btnMap', toggleMenu);
}

// ---- HUD ------------------------------------------------------------
const posEl = document.getElementById('pos');
const nameEl = document.getElementById('lmName');
const blurbEl = document.getElementById('lmBlurb');
const compassEl = document.getElementById('compass');
const lampStateEl = document.getElementById('lampState');
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function insidePyramid(p) {
  for (const k in PYRAMIDS) {
    const py = PYRAMIDS[k];
    const dx = p.x - py.center.x, dz = p.z - py.center.z;
    const W = (py.base / 2) * (1 - Math.max(0, p.y) / py.height) + 1;
    if (Math.abs(dx) < W && Math.abs(dz) < W) return true;       // within the solid envelope
    if (p.y < -1 && Math.hypot(dx, dz) < py.base * 0.5) return true; // subterranean below it
  }
  return false;
}

function updateHUD() {
  const p = player.position;
  posEl.textContent = `E ${p.x.toFixed(0)}  N ${(-p.z).toFixed(0)}  alt ${p.y.toFixed(1)} m`;

  // Compass
  const hd = player.headingDeg();
  if (compassEl) compassEl.textContent = `${DIRS[Math.round(hd / 45) % 8]}  ${hd.toFixed(0)}°`;

  // Auto headlamp when inside / underground, with manual override (L).
  const inside = insidePyramid(p) || p.y < 0.4;
  lamp.intensity = (forceLamp || inside) ? 95 : 0;
  if (lampStateEl) lampStateEl.textContent = forceLamp ? 'ON' : (inside ? 'auto' : 'off');

  let best = null, bestD = Infinity;
  for (const lm of world.landmarks) {
    const d = Math.hypot(p.x - lm.pos.x, p.z - lm.pos.z);
    if (d < lm.radius && d < bestD) { best = lm; bestD = d; }
  }
  if (best) {
    nameEl.textContent = best.name;
    blurbEl.textContent = best.blurb;
    document.getElementById('lm').style.opacity = 1;
  } else {
    document.getElementById('lm').style.opacity = 0.0;
  }
}

// ---- Overhead minimap (north-up) ------------------------------------
const mm = document.getElementById('minimap');
const mmx = mm.getContext('2d');
const MM = { x0: -740, x1: 440, z0: -280, z1: 900 };   // world bounds shown
const MS = mm.width;
const mX = x => (x - MM.x0) / (MM.x1 - MM.x0) * MS;
const mY = z => (z - MM.z0) / (MM.z1 - MM.z0) * MS;
const mW = d => d / (MM.x1 - MM.x0) * MS;
const mH = d => d / (MM.z1 - MM.z0) * MS;
function mmSquare(c, base, fill, label) {
  mmx.fillStyle = fill;
  mmx.fillRect(mX(c.x) - mW(base) / 2, mY(c.z) - mH(base) / 2, mW(base), mH(base));
  if (label) {
    mmx.fillStyle = '#1a1206';
    mmx.fillText(label, mX(c.x) - mmx.measureText(label).width / 2, mY(c.z) + 3);
  }
}
function drawMinimap() {
  mmx.clearRect(0, 0, MS, MS);
  mmx.fillStyle = 'rgba(28, 19, 7, 0.62)';
  mmx.fillRect(0, 0, MS, MS);
  mmx.font = '8px "Trebuchet MS", sans-serif';
  // monuments
  mmSquare(PYRAMIDS.khufu.center, PYRAMIDS.khufu.base, '#e6cf94', 'Khufu');
  mmSquare(PYRAMIDS.khafre.center, PYRAMIDS.khafre.base, '#e6cf94', 'Khafre');
  mmSquare(PYRAMIDS.menkaure.center, PYRAMIDS.menkaure.base, '#e6cf94', 'Menk.');
  for (const q of QUEENS_KHUFU) mmSquare(q.center, q.base, '#b89b66');
  for (const q of QUEENS_MENKAURE) mmSquare(q.center, q.base, '#b89b66');
  // sphinx
  mmx.fillStyle = '#d8b48a';
  mmx.fillRect(mX(SPHINX.center.x) - 4, mY(SPHINX.center.z) - 2, 8, 4);
  mmx.fillStyle = '#1a1206';
  mmx.fillText('Sphinx', mX(SPHINX.center.x) + 6, mY(SPHINX.center.z) + 3);
  // player position + heading
  const p = player.position;
  const px = THREE.MathUtils.clamp(mX(p.x), 4, MS - 4);
  const py = THREE.MathUtils.clamp(mY(p.z), 4, MS - 4);
  mmx.save();
  mmx.translate(px, py);
  mmx.rotate(player.headingDeg() * Math.PI / 180);
  mmx.fillStyle = '#54e081';
  mmx.strokeStyle = '#0b3d1f'; mmx.lineWidth = 1;
  mmx.beginPath(); mmx.moveTo(0, -7); mmx.lineTo(5, 6); mmx.lineTo(0, 3); mmx.lineTo(-5, 6); mmx.closePath();
  mmx.fill(); mmx.stroke();
  mmx.restore();
  // north marker
  mmx.fillStyle = '#ffd98a';
  mmx.fillText('N', MS / 2 - 3, 10);
}

// ---- Resize + loop --------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (isTouch && started) applyLook();      // touch look drives the camera
  const active = started || controls.isLocked;
  input.sprint = sprintHeld || runToggle;
  player.update(delta, active ? input : ZERO_INPUT);
  const t = clock.getElapsedTime();
  if (world.tick) world.tick(t);
  flickerTorches(t);
  updateHUD();
  drawMinimap();
  renderer.render(scene, camera);
}
const ZERO_INPUT = { forward: false, back: false, left: false, right: false,
  jump: false, crouch: false, sprint: false, moveX: 0, moveY: 0 };

function setStatus(t) {
  const s = document.getElementById('status');
  if (s) s.textContent = t;
}

// Expose a small hook for debugging / automated screenshots.
window.__giza = { THREE, scene, camera, player, controls, world, look, input,
  inventory, placedTorches, get runToggle() { return runToggle; } };

// Hide the loader and start once everything is ready.
setStatus('Ready.');
document.getElementById('loading').style.display = 'none';
overlay.style.display = 'flex';
animate();
