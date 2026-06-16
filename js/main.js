import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { makeMaterials } from './materials.js';
import { buildWorld } from './world.js';
import { buildCollider, Player } from './player.js';
import { TELEPORTS, PYRAMIDS, QUEENS_KHUFU, QUEENS_MENKAURE, SPHINX, KHENTKAUS, WORKERS_VILLAGE } from './data.js';

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
  if (mapOpen) return;
  started = true;
  overlay.style.display = 'none';
  if (mobileUI) mobileUI.style.display = 'block';
  showCrosshair(true);
  applyLook();
}
const requestLock = () => {
  if (mapOpen) return;
  const p = controls.lock();
  if (p && typeof p.catch === 'function') p.catch(() => {});
};
overlay.addEventListener('click', () => { isTouch ? startMobile() : requestLock(); });
renderer.domElement.addEventListener('click', () => { if (!isTouch) requestLock(); });
controls.addEventListener('lock', () => {
  started = true; overlay.style.display = 'none'; showCrosshair(true);
});
controls.addEventListener('unlock', () => {
  if (!mapOpen) { overlay.style.display = 'flex'; showCrosshair(false); }
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
  if (e.code === 'KeyM') toggleMap();
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

// ---- Map state (full map + minimap defined further below) -----------
let mapOpen = false;
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
  if (!(started || controls.isLocked) || mapOpen) return;
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
  if (!(started || controls.isLocked) || mapOpen) return;
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
  tap('btnMap', toggleMap);
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

// ---- Map: shared draw, minimap + full-screen, fast-travel -----------
// Plottable features (derived from the same data the world is built from).
const kc = PYRAMIDS.khufu.center, khf = PYRAMIDS.khafre.center, men = PYRAMIDS.menkaure.center;
const FEATURES = [];
FEATURES.push({ kind: 'pyr', label: 'Khufu', x: kc.x, z: kc.z, base: PYRAMIDS.khufu.base });
FEATURES.push({ kind: 'pyr', label: 'Khafre', x: khf.x, z: khf.z, base: PYRAMIDS.khafre.base });
FEATURES.push({ kind: 'pyr', label: 'Menkaure', x: men.x, z: men.z, base: PYRAMIDS.menkaure.base });
for (const q of QUEENS_KHUFU) FEATURES.push({ kind: 'qpyr', x: q.center.x, z: q.center.z, base: q.base });
for (const q of QUEENS_MENKAURE) FEATURES.push({ kind: 'qpyr', x: q.center.x, z: q.center.z, base: q.base });
FEATURES.push({ kind: 'sphinx', label: 'Sphinx', x: SPHINX.center.x, z: SPHINX.center.z });
FEATURES.push({ kind: 'temple', label: 'Khufu Mortuary Temple', x: kc.x + 150, z: kc.z });
FEATURES.push({ kind: 'temple', label: 'Khafre Mortuary Temple', x: khf.x + 145, z: khf.z });
FEATURES.push({ kind: 'temple', label: 'Menkaure Mortuary Temple', x: men.x + 78, z: men.z });
FEATURES.push({ kind: 'temple', label: 'Sphinx (Valley) Temple', x: SPHINX.center.x + 60, z: SPHINX.center.z });
FEATURES.push({ kind: 'cause', x: khf.x + 175, z: khf.z + 6, x2: SPHINX.center.x - 20, z2: SPHINX.center.z });
FEATURES.push({ kind: 'cause', x: men.x + 100, z: men.z + 4, x2: men.x + 360, z2: men.z + 120 });
FEATURES.push({ kind: 'boat', label: "Khufu's Solar Boat", x: kc.x + 10, z: kc.z + 150 });
FEATURES.push({ kind: 'khent', label: KHENTKAUS.name, x: KHENTKAUS.center.x, z: KHENTKAUS.center.z, base: KHENTKAUS.base });
FEATURES.push({ kind: 'village', label: WORKERS_VILLAGE.name, x: WORKERS_VILLAGE.center.x, z: WORKERS_VILLAGE.center.z });

// Draw the plateau into a 2D context. On the full map, `collect` gathers
// marker screen positions for hover tooltips. Returns the world→screen xform.
function drawMapView(ctx, w, h, cx, cz, scale, full, collect) {
  const X = wx => w / 2 + (wx - cx) * scale;
  const Y = wz => h / 2 + (wz - cz) * scale;
  ctx.fillStyle = '#c2a468'; ctx.fillRect(-w, -h, w * 3, h * 3);   // oversized (rotation-safe)
  // individual mastaba tombs + workers' town buildings
  ctx.fillStyle = '#9c7c4c';
  for (const m of world.mastabas) {
    const mw = Math.max(1.5, m.w * scale), md = Math.max(1.5, m.d * scale);
    ctx.fillRect(X(m.x) - mw / 2, Y(m.z) - md / 2, mw, md);
  }
  ctx.fillStyle = '#8a6b46';
  for (const b of world.buildings) {
    const bw = Math.max(1.5, b.w * scale), bd = Math.max(1.5, b.d * scale);
    ctx.fillRect(X(b.x) - bw / 2, Y(b.z) - bd / 2, bw, bd);
  }
  ctx.lineWidth = Math.max(2, 6 * scale); ctx.strokeStyle = 'rgba(90,70,40,0.6)';
  for (const f of FEATURES) if (f.kind === 'cause') {
    ctx.beginPath(); ctx.moveTo(X(f.x), Y(f.z)); ctx.lineTo(X(f.x2), Y(f.z2)); ctx.stroke();
  }
  ctx.textBaseline = 'middle';
  for (const f of FEATURES) {
    const sx = X(f.x), sy = Y(f.z);
    if (f.kind === 'pyr') {
      const s = Math.max(5, f.base * scale);
      ctx.fillStyle = '#e8d199'; ctx.strokeStyle = '#7c6840'; ctx.lineWidth = 1.5;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s); ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
      if (full) {
        ctx.fillStyle = '#2a1d08'; ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(f.label, sx, sy); ctx.textAlign = 'left';
        if (collect) collect.push({ sx, sy, name: f.label, r: s / 2 });
      }
    } else if (f.kind === 'qpyr') {
      const s = Math.max(2.5, f.base * scale);
      ctx.fillStyle = '#c6a76d'; ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      if (full && collect) collect.push({ sx, sy, name: "Queen's pyramid", r: Math.max(5, s / 2) });
    } else if (f.kind === 'temple') {
      ctx.fillStyle = '#8f7f54'; ctx.strokeStyle = '#5e5234'; ctx.lineWidth = 1;
      ctx.fillRect(sx - 6, sy - 5, 12, 10); ctx.strokeRect(sx - 6, sy - 5, 12, 10);
      if (full && collect) collect.push({ sx, sy, name: f.label, r: 9 });
    } else if (f.kind === 'sphinx') {
      ctx.fillStyle = '#c7a884'; ctx.fillRect(sx - 8, sy - 4, 16, 8);
      if (full && collect) collect.push({ sx, sy, name: 'Great Sphinx', r: 10 });
    } else if (f.kind === 'boat') {
      ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3, 0, 0, 7); ctx.fill();
      if (full && collect) collect.push({ sx, sy, name: "Khufu's Solar Boat", r: 9 });
    } else if (f.kind === 'khent') {
      const s = Math.max(5, f.base * scale);
      ctx.fillStyle = '#cdbb8c'; ctx.strokeStyle = '#7c6840'; ctx.lineWidth = 1.5;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s); ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
      if (full && collect) collect.push({ sx, sy, name: f.label, r: Math.max(8, s / 2) });
    } else if (f.kind === 'village') {
      ctx.fillStyle = '#8a6b46'; ctx.fillRect(sx - 9, sy - 7, 18, 14);
      ctx.strokeStyle = '#5e4a30'; ctx.lineWidth = 1; ctx.strokeRect(sx - 9, sy - 7, 18, 14);
      if (full && collect) collect.push({ sx, sy, name: f.label, r: 12 });
    }
  }
  if (full) {
    for (const t of TELEPORTS) {
      const sx = X(t.pos.x), sy = Y(t.pos.z);
      ctx.fillStyle = '#3aa0ff'; ctx.strokeStyle = '#0a3a66'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, 7); ctx.fill(); ctx.stroke();
      if (collect) collect.push({ sx, sy, name: t.label, r: 8 });
    }
  }
  // player + heading
  const p = player.position, px = X(p.x), py = Y(p.z);
  ctx.save(); ctx.translate(px, py); ctx.rotate(player.headingDeg() * Math.PI / 180);
  ctx.fillStyle = '#54e081'; ctx.strokeStyle = '#0b3d1f'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
  return { X, Y };
}

// Minimap (corner): centred on the player, north-up, zoomable.
const mm = document.getElementById('minimap');
const mmx = mm.getContext('2d');
let mmScale = mm.width / 520;          // ~520 m across initially
let mmHeadingUp = false;               // false = north-up, true = heading-up (O)
function drawMinimap() {
  const cx = mm.width / 2, cy = mm.height / 2;
  mmx.save();
  mmx.beginPath(); mmx.rect(0, 0, mm.width, mm.height); mmx.clip();
  if (mmHeadingUp) {
    mmx.translate(cx, cy); mmx.rotate(-player.headingDeg() * Math.PI / 180); mmx.translate(-cx, -cy);
  }
  drawMapView(mmx, mm.width, mm.height, player.position.x, player.position.z, mmScale, false, null);
  mmx.restore();
  // North marker (rotates to point to true north in heading-up mode)
  mmx.fillStyle = '#ffd98a'; mmx.font = 'bold 10px sans-serif';
  if (mmHeadingUp) {
    const hh = player.headingDeg() * Math.PI / 180, rr = cx - 11;
    mmx.fillText('N', cx - Math.sin(hh) * rr - 3, cy - Math.cos(hh) * rr + 4);
  } else {
    mmx.fillText('N', cx - 3, 11);
  }
}

// Full-screen map: pan (drag), zoom (wheel), click to fast-travel.
const mapfull = document.getElementById('mapfull');
const mapcv = document.getElementById('mapcanvas');
const mapx = mapcv.getContext('2d');
const mapView = { cx: -120, cz: 320, scale: 0.5 };
let mapDrag = null;
let mapMarkers = [];
let mapHover = null;     // {x,y} in canvas space, or null
function fitMapCanvas() { mapcv.width = innerWidth; mapcv.height = innerHeight; }
function drawFull() {
  if (!mapOpen) return;
  mapMarkers = [];
  drawMapView(mapx, mapcv.width, mapcv.height, mapView.cx, mapView.cz, mapView.scale, true, mapMarkers);
  // hover tooltip
  let best = null, bd = 1e9;
  if (mapHover) for (const m of mapMarkers) {
    const d = Math.hypot(m.sx - mapHover.x, m.sy - mapHover.y);
    if (d < m.r + 6 && d < bd) { bd = d; best = m; }
  }
  mapcv.style.cursor = best ? 'pointer' : 'crosshair';
  if (best) {
    mapx.font = '13px "Trebuchet MS", sans-serif';
    const tw = mapx.measureText(best.name).width;
    let tx = best.sx + 10, ty = best.sy - 16;
    if (tx + tw + 8 > mapcv.width) tx = best.sx - tw - 16;
    mapx.fillStyle = 'rgba(20,13,4,0.92)'; mapx.strokeStyle = 'rgba(255,217,138,0.55)'; mapx.lineWidth = 1;
    mapx.fillRect(tx - 5, ty - 11, tw + 10, 22); mapx.strokeRect(tx - 5, ty - 11, tw + 10, 22);
    mapx.fillStyle = '#ffd98a'; mapx.textAlign = 'left'; mapx.textBaseline = 'middle';
    mapx.fillText(best.name, tx, ty);
  }
}
function toggleMap() {
  mapOpen = !mapOpen;
  mapfull.style.display = mapOpen ? 'block' : 'none';
  if (mapOpen) {
    fitMapCanvas();
    if (!isTouch) controls.unlock();
    overlay.style.display = 'none';
    if (mobileUI) mobileUI.style.display = 'none';
  } else if (isTouch && started && mobileUI) {
    mobileUI.style.display = 'block';
  }
}
function mapScreenToWorld(ev) {
  const r = mapcv.getBoundingClientRect();
  const sx = ev.clientX - r.left, sy = ev.clientY - r.top;
  return {
    x: mapView.cx + (sx - mapcv.width / 2) / mapView.scale,
    z: mapView.cz + (sy - mapcv.height / 2) / mapView.scale, sx, sy
  };
}
function travelTo(wx, wz) {
  // snap to a named teleport if one is very close on screen
  let best = null, bd = 18 / mapView.scale;
  for (const t of TELEPORTS) {
    const d = Math.hypot(t.pos.x - wx, t.pos.z - wz);
    if (d < bd) { bd = d; best = t; }
  }
  if (best) { player.teleport(best.pos); }
  else {
    _ray.set(new THREE.Vector3(wx, 400, wz), new THREE.Vector3(0, -1, 0)); _ray.far = 900;
    const hit = collider.geometry.boundsTree.raycastFirst(_ray, THREE.DoubleSide);
    player.teleport({ x: wx, y: hit ? hit.point.y + 0.1 : 6, z: wz });
  }
  toggleMap();
  if (!isTouch) requestLock();
}
mapcv.addEventListener('pointerdown', e => { mapDrag = { x: e.clientX, y: e.clientY, moved: 0 }; });
mapcv.addEventListener('pointermove', e => {
  const r = mapcv.getBoundingClientRect();
  mapHover = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (!mapDrag) return;
  const dx = e.clientX - mapDrag.x, dy = e.clientY - mapDrag.y;
  mapDrag.moved += Math.abs(dx) + Math.abs(dy);
  mapView.cx -= dx / mapView.scale; mapView.cz -= dy / mapView.scale;
  mapDrag.x = e.clientX; mapDrag.y = e.clientY;
});
mapcv.addEventListener('pointerleave', () => { mapHover = null; });
mapcv.addEventListener('pointerup', e => {
  const wasClick = mapDrag && mapDrag.moved < 6;
  mapDrag = null;
  if (wasClick) { const w = mapScreenToWorld(e); travelTo(w.x, w.z); }
});
mapcv.addEventListener('wheel', e => {
  e.preventDefault();
  const w = mapScreenToWorld(e);
  mapView.scale = THREE.MathUtils.clamp(mapView.scale * (e.deltaY > 0 ? 0.88 : 1.14), 0.12, 4);
  // keep cursor anchored
  const r = mapcv.getBoundingClientRect();
  mapView.cx = w.x - (e.clientX - r.left - mapcv.width / 2) / mapView.scale;
  mapView.cz = w.z - (e.clientY - r.top - mapcv.height / 2) / mapView.scale;
}, { passive: false });

// Minimap zoom on the keyboard (- / =), and Esc closes the full map.
addEventListener('keydown', e => {
  if (e.code === 'Minus') mmScale = Math.max(mmScale * 0.8, mm.width / 3000);
  if (e.code === 'Equal') mmScale = Math.min(mmScale * 1.25, mm.width / 120);
  if (e.code === 'KeyO') mmHeadingUp = !mmHeadingUp;     // minimap orientation
  if (e.code === 'Escape' && mapOpen) toggleMap();
});

// ---- Resize + loop --------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (mapOpen) fitMapCanvas();
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (isTouch && started && !mapOpen) applyLook();   // touch look drives the camera
  const active = (started || controls.isLocked) && !mapOpen;
  input.sprint = sprintHeld || runToggle;
  player.update(delta, active ? input : ZERO_INPUT);
  const t = clock.getElapsedTime();
  if (world.tick) world.tick(t);
  flickerTorches(t);
  updateHUD();
  drawMinimap();
  drawFull();
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
