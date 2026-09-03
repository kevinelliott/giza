import * as THREE from 'three';
import { ARTIFACTS } from './data.js';

// =====================================================================
//  Exploration goals: a scavenger hunt for artifacts, site discovery and
//  achievements. Progress persists in localStorage.
// =====================================================================

const KEY = 'giza.progress.v1';

const ACHIEVEMENTS = [
  { id: 'first', name: 'First find', text: 'You picked up your first artifact.' },
  { id: 'half', name: 'Collector', text: 'Half of the artifacts recovered.' },
  { id: 'all', name: 'Curator of Giza', text: 'Every artifact on the plateau recovered!' },
  { id: 'kings', name: 'Heart of the mountain', text: "You reached the King's Chamber on foot." },
  { id: 'summit', name: 'Summit', text: 'You stood on top of the Great Pyramid, 139 m above the plateau.' },
  { id: 'sphinx', name: 'Between the paws', text: 'You stood at the Dream Stele between the paws of the Sphinx.' },
  { id: 'sites', name: 'Surveyor', text: 'You visited every named site on the plateau.' },
  { id: 'night', name: 'Under the stars', text: 'You watched the pyramids by starlight.' },
  { id: 'storm', name: 'Sand in your teeth', text: 'You weathered a sandstorm out in the open.' },
  { id: 'runner', name: 'Desert runner', text: 'You ran a full kilometre across the sand.' }
];

function artifactMesh(type, setupMaterial) {
  const mat = (color, extra = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.1, emissive: color, emissiveIntensity: 0.35 }, extra)); setupMaterial && setupMaterial(m); return m; };
  let mesh;
  switch (type) {
    case 'scarab': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat(0x1f6b5a, { metalness: 0.4 })); mesh.scale.set(1, 0.55, 1.3); break;
    case 'ushabti': mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.38, 4, 10), mat(0x2aa198)); break;
    case 'ring': mesh = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 24), mat(0xe0b040, { metalness: 0.9, roughness: 0.25 })); break;
    case 'amulet': mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat(0x2246c8, { metalness: 0.3 })); break;
    case 'jar': mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.42, 12), mat(0xa8613a, { roughness: 0.85, emissiveIntensity: 0.2 })); break;
    case 'fragment': mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), mat(0xd8cfc0, { roughness: 0.8, emissiveIntensity: 0.15 })); mesh.scale.set(1.2, 0.6, 1); break;
    case 'stele': mesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.08), mat(0xd9b27a, { roughness: 0.8, emissiveIntensity: 0.2 })); break;
    default: mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), mat(0xb87333, { metalness: 0.8, roughness: 0.35 }));   // tool
  }
  mesh.castShadow = true;
  const g = new THREE.Group(); g.add(mesh);
  const light = new THREE.PointLight(mesh.material.color, 1.6, 7, 2); light.position.y = 0.4; g.add(light);
  // soft glowing halo sprite so it can be spotted from a distance
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, depthWrite: false }));
  halo.scale.set(1.6, 1.6, 1); halo.position.y = 0.3; g.add(halo);
  g.userData.spin = mesh; g.userData.halo = halo;
  return g;
}

export class Quest {
  constructor({ scene, world, player, toast, setupMaterial, onChange }) {
    Object.assign(this, { scene, world, player, toast, setupMaterial, onChange });
    this.progress = { artifacts: [], sites: [], ach: [] };
    try { Object.assign(this.progress, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* none */ }
    this.items = [];
    for (const a of ARTIFACTS) {
      if (this.progress.artifacts.includes(a.id)) continue;
      const g = artifactMesh(a.type, setupMaterial);
      g.position.set(a.pos.x, a.pos.y, a.pos.z);
      scene.add(g);
      this.items.push({ def: a, g, phase: Math.random() * 7 });
    }
    this.runDist = 0; this._last = null;
    this.summitTimer = 0;
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.progress)); } catch { /* ignore */ } }
  get total() { return ARTIFACTS.length; }
  get found() { return this.progress.artifacts.length; }
  remaining() { return this.items.map(i => i.def); }
  award(id) {
    if (this.progress.ach.includes(id)) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    this.progress.ach.push(id); this.save();
    this.toast(`<b>🏆 Achievement — ${a.name}</b><br>${a.text}`, 6000);
    this.onChange && this.onChange();
  }
  collect(item) {
    this.scene.remove(item.g);
    this.items.splice(this.items.indexOf(item), 1);
    this.progress.artifacts.push(item.def.id); this.save();
    this.toast(`<b>🏺 Found: ${item.def.name}</b> (${this.found}/${this.total})<br>${item.def.blurb}`, 7000);
    this.onChange && this.onChange();
    if (this.found === 1) this.award('first');
    if (this.found >= Math.ceil(this.total / 2)) this.award('half');
    if (this.found === this.total) this.award('all');
  }
  update(t, dt, env) {
    const p = this.player.position;
    for (const it of this.items) {
      const d = it.g.position.distanceTo(p);
      if (d > 60) continue;
      it.g.userData.spin.rotation.y = t * 1.2 + it.phase;
      it.g.userData.spin.position.y = 0.25 + Math.sin(t * 2 + it.phase) * 0.08;
      it.g.userData.halo.material.opacity = 0.25 + 0.15 * Math.sin(t * 3 + it.phase);
      if (d < 2.2 && !this.player.fly) { this.collect(it); break; }
    }
    // site discovery
    for (const lm of this.world.landmarks) {
      if (this.progress.sites.includes(lm.name)) continue;
      if (Math.hypot(p.x - lm.pos.x, p.z - lm.pos.z) < lm.radius * 0.6) {
        this.progress.sites.push(lm.name); this.save();
        this.toast(`<b>📍 Discovered: ${lm.name}</b> (${this.progress.sites.length}/${this.world.landmarks.length} sites)`, 3500);
        this.onChange && this.onChange();
        if (this.progress.sites.length === this.world.landmarks.length) this.award('sites');
      }
    }
    // milestones
    if (!this.player.fly) {
      if (p.y > 137 && Math.hypot(p.x, p.z) < 14) this.award('summit');
      if (Math.abs(p.x - 7) < 6 && Math.abs(p.y - 42.5) < 3 && Math.abs(p.z - (-19)) < 8) this.award('kings');
      if (env.sphinx) this.award('sphinx');
      if (env.night && env.outdoors) this.award('night');
      if (env.storm && env.outdoors) this.award('storm');
      if (this.player.onGround && this.player.speedXZ > 9 && env.outdoors) {
        this.runDist += this.player.speedXZ * dt;
        if (this.runDist > 1000) this.award('runner');
      }
    }
  }
  achievementsHTML() {
    return ACHIEVEMENTS.map(a => `<li class="${this.progress.ach.includes(a.id) ? 'done' : ''}"><b>${this.progress.ach.includes(a.id) ? '🏆' : '○'} ${a.name}</b> — ${a.text}</li>`).join('');
  }
}
