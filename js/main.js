import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { makeMaterials } from './materials.js';
import { buildWorld } from './world.js';
import { buildCollider, Player } from './player.js';
import { TELEPORTS } from './data.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;

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

// ---- Player headlamp (essential inside the chambers) ----------------
const lamp = new THREE.SpotLight(0xfff0d0, 0.0, 75, Math.PI / 3.4, 0.5, 1.0);
lamp.position.set(0, 0, 0.2);
const lampTarget = new THREE.Object3D();
lampTarget.position.set(0, 0, -1);
camera.add(lamp); camera.add(lampTarget); lamp.target = lampTarget;
let lampOn = false;

// ---- Controls -------------------------------------------------------
const controls = new PointerLockControls(camera, renderer.domElement);
const overlay = document.getElementById('overlay');
const instructions = document.getElementById('instructions');

renderer.domElement.addEventListener('click', () => {
  if (!menuOpen) controls.lock();
});
controls.addEventListener('lock', () => { overlay.style.display = 'none'; });
controls.addEventListener('unlock', () => {
  if (!menuOpen) overlay.style.display = 'flex';
});

// ---- Input ----------------------------------------------------------
const input = { forward: false, back: false, left: false, right: false,
  jump: false, crouch: false, sprint: false };
const keymap = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', ShiftLeft: 'sprint', ShiftRight: 'sprint',
  ControlLeft: 'crouch', KeyC: 'crouch'
};
addEventListener('keydown', e => {
  if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyF') toggleFly();
  if (e.code === 'KeyL') toggleLamp();
  if (e.code === 'KeyM') toggleMenu();
  if (e.code === 'KeyH') toggleHelp();
});
addEventListener('keyup', e => { if (keymap[e.code]) input[keymap[e.code]] = false; });

function toggleFly() {
  player.fly = !player.fly;
  document.getElementById('flyState').textContent = player.fly ? 'ON' : 'off';
}
function toggleLamp() {
  lampOn = !lampOn;
  lamp.intensity = lampOn ? 90 : 0;
  document.getElementById('lampState').textContent = lampOn ? 'ON' : 'off';
}

// ---- Teleport menu --------------------------------------------------
let menuOpen = false;
const menu = document.getElementById('menu');
const menuList = document.getElementById('menuList');
TELEPORTS.forEach((t, i) => {
  const li = document.createElement('button');
  li.className = 'tp';
  li.textContent = `${i + 1}. ${t.label}`;
  li.onclick = () => { player.teleport(t.pos); toggleMenu(); controls.lock(); };
  menuList.appendChild(li);
});
function toggleMenu() {
  menuOpen = !menuOpen;
  menu.style.display = menuOpen ? 'block' : 'none';
  if (menuOpen) { controls.unlock(); overlay.style.display = 'none'; }
}
const help = document.getElementById('help');
function toggleHelp() { help.style.display = help.style.display === 'block' ? 'none' : 'block'; }

// ---- HUD ------------------------------------------------------------
const posEl = document.getElementById('pos');
const nameEl = document.getElementById('lmName');
const blurbEl = document.getElementById('lmBlurb');

function updateHUD() {
  const p = player.position;
  posEl.textContent = `E ${p.x.toFixed(0)}  N ${(-p.z).toFixed(0)}  alt ${p.y.toFixed(1)} m`;
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
  player.update(delta, input);
  updateHUD();
  renderer.render(scene, camera);
}

function setStatus(t) {
  const s = document.getElementById('status');
  if (s) s.textContent = t;
}

// Expose a small hook for debugging / automated screenshots.
window.__giza = { THREE, scene, camera, player, controls, world };

// Hide the loader and start once everything is ready.
setStatus('Ready.');
document.getElementById('loading').style.display = 'none';
overlay.style.display = 'flex';
animate();
