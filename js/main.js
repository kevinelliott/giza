import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { makeMaterials } from './materials.js';
import { buildWorld } from './world.js';
import { buildCollider, Player } from './player.js';
import { TELEPORTS, PYRAMIDS } from './data.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
const placedTorches = [];
function useItem() {
  if (!(started || controls.isLocked) || menuOpen) return;
  const it = inventory[selSlot];
  if (!it || it.count <= 0 || it.id !== 'torch') return;
  _ray.set(camera.getWorldPosition(_rp), camera.getWorldDirection(_rd));
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
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.85, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.9 }));
  stick.rotation.x = Math.PI / 2.5;
  stick.position.set(0, 0.12, 0.28);
  g.add(stick);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc24a, emissive: 0xff7a18, emissiveIntensity: 2.6 }));
  flame.position.set(0, 0.46, 0.46);
  g.add(flame);
  const light = new THREE.PointLight(0xffa23a, 28, 20, 2);
  light.position.copy(flame.position);
  g.add(light);
  g.position.copy(point).addScaledVector(normal, 0.06);
  const up = Math.abs(normal.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), normal, up));
  scene.add(g);
  placedTorches.push({ light, mat: flame.material, base: 28 });
}
function flickerTorches(t) {
  for (const to of placedTorches) {
    const f = 0.82 + Math.sin(t * 11 + to.base) * 0.1 + Math.random() * 0.06;
    to.light.intensity = to.base * f;
    to.mat.emissiveIntensity = 2.1 + f;
  }
}
// Left-click places the selected item once you're playing (not while paused).
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
