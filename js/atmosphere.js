import * as THREE from 'three';
import { DEG } from './data.js';

// =====================================================================
//  Atmosphere: a day/night cycle that drives the sky, sun cascades,
//  skylight (environment map), fog, exposure and stars; plus sandstorms.
// =====================================================================

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Sun direction for a local hour (Giza, summer-ish): rises ENE ~05:30,
// culminates due south, sets WNW ~19:00. Bearing 0 = N, 90 = E.
export function sunFromHour(h) {
  let elev, bearing;
  if (h >= 5.5 && h <= 19) {
    const t = (h - 5.5) / 13.5;
    elev = Math.sin(t * Math.PI) * 66; bearing = 75 + t * 210;
  } else {
    const tn = h > 19 ? (h - 19) / 10.5 : (h + 5) / 10.5;
    elev = -Math.sin(tn * Math.PI) * 45; bearing = 285 + tn * 150;
  }
  const e = elev * DEG, b = bearing * DEG;
  return { dir: new THREE.Vector3(Math.cos(e) * Math.sin(b), Math.sin(e), -Math.cos(e) * Math.cos(b)), elev, bearing };
}

export class Stars {
  constructor(scene, n = 2600) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const R = 2600;
    for (let i = 0; i < n; i++) {
      // a third of the stars cluster along a tilted band (the Milky Way)
      let x, y, z;
      if (i % 3 === 0) {
        const a = Math.random() * Math.PI * 2, w = (Math.random() - 0.5) * 0.35 + (Math.random() - 0.5) * 0.35;
        const v = new THREE.Vector3(Math.cos(a), w, Math.sin(a)).normalize().applyAxisAngle(new THREE.Vector3(1, 0, 0), 1.1);
        x = v.x; y = v.y; z = v.z;
      } else {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        x = r * Math.cos(a); y = u; z = r * Math.sin(a);
      }
      if (y < -0.05) y = -y;                                  // keep them above the horizon
      pos[i * 3] = x * R; pos[i * 3 + 1] = y * R; pos[i * 3 + 2] = z * R;
      const m = 0.35 + Math.pow(Math.random(), 3) * 0.9, warm = Math.random();
      col[i * 3] = m * (0.85 + 0.15 * warm); col[i * 3 + 1] = m * (0.85 + 0.1 * warm); col[i * 3 + 2] = m * (1.0 - 0.15 * warm);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // round, soft star sprite
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    this.mat = new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.pts = new THREE.Points(geo, this.mat);
    this.pts.frustumCulled = false; this.pts.visible = false; this.pts.renderOrder = -1;
    scene.add(this.pts);
  }
  update(fade, camPos) {
    this.pts.position.copy(camPos);
    this.mat.opacity = fade; this.pts.visible = fade > 0.01;
  }
}

export class DayCycle {
  constructor({ scene, renderer, sky, csm, hemi, flare, stars }) {
    Object.assign(this, { scene, renderer, sky, csm, hemi, flare, stars });
    this.hour = 16; this.isNight = false; this.elev = 30; this.auto = true;
    this.envTimer = 0; this.envDirty = true;
    this.presets = [6, 9, 12, 16, 18.6, 22.5];
    this.fogDay = new THREE.Color(0xd7c7a6); this.fogSet = new THREE.Color(0xd8a074); this.fogNight = new THREE.Color(0x0c1018);
    this.fogColor = new THREE.Color();
    this.sunWarm = new THREE.Color(0xffb070); this.sunDay = new THREE.Color(0xfff0d2); this.moon = new THREE.Color(0x8fa8ff);
    this._c = new THREE.Color(); this._c2 = new THREE.Color();
    this.sunDir = new THREE.Vector3();
  }
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.apply(); this.captureEnv(); }
  shift(dh) { this.setHour(this.hour + dh); }
  cyclePreset() {
    const next = this.presets.find(p => p > this.hour + 0.01);
    this.setHour(next === undefined ? this.presets[0] : next);
  }
  label() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  apply() {
    const { dir, elev } = sunFromHour(this.hour);
    this.elev = elev; this.sunDir.copy(dir);
    const dayK = sm(-3, 10, elev), warm = 1 - sm(0, 28, elev);
    // sky
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(dir);
    u.turbidity.value = 3.5 + 4.5 * warm;
    u.rayleigh.value = 2.0 + 1.0 * warm;
    u.mieCoefficient.value = 0.003 + 0.006 * warm;
    // sun (or moon) through the cascades
    if (this.csm) {
      let intensity, color;
      if (elev > 1) {
        this.csm.lightDirection.copy(dir).negate();
        intensity = 3.4 * (0.3 + 0.7 * sm(0, 32, elev));
        color = this._c.copy(this.sunWarm).lerp(this.sunDay, 1 - warm);
      } else {
        const m = sunFromHour((this.hour + 12) % 24).dir; m.y = Math.abs(m.y) * 0.8 + 0.3; m.normalize();
        this.csm.lightDirection.copy(m).negate();
        intensity = 0.55; color = this.moon;
      }
      for (const l of this.csm.lights) { l.intensity = intensity; l.color.copy(color); }
      this.sunIntensity = intensity;
    }
    // skylight + ground bounce
    this._c.set(0xc4d6ff).lerp(this._c2.set(0xe0a878), warm);
    this.hemi.color.copy(this._c2.set(0x1c2a4a).lerp(this._c, dayK));
    this.hemi.groundColor.copy(this._c.set(0x2a2418).lerp(this._c2.set(0xcaa56a), dayK));
    this.hemi.intensity = 0.1 + 0.15 * dayK;
    // fog + exposure
    this._c.copy(this.fogDay).lerp(this.fogSet, warm);
    this.fogColor.copy(this.fogNight).lerp(this._c, dayK);
    if (this.scene.fog) this.scene.fog.color.copy(this.fogColor);
    this.renderer.toneMappingExposure = 0.62 * dayK + 0.95 * (1 - dayK);
    // flare + stars
    if (this.flare) { this.flare.visible = elev > 0.5; this.flare.position.copy(dir).multiplyScalar(2800); }
    this.starFade = 1 - sm(-10, -1, elev);
    this.isNight = elev < -3;
    this.dayK = dayK;
    // Deep night: the analytic sky turns a muddy brown once the sun is well
    // below the horizon, so swap it for a plain dark-blue backdrop.
    const deep = elev < -8;
    this.sky.visible = !deep;
    this.scene.background = deep ? (this.nightBg || (this.nightBg = new THREE.Color(0x060912))) : null;
  }
  captureEnv() {
    if (!this.renderer) return;
    const u = this.sky.material.uniforms, mie = u.mieCoefficient.value;
    u.mieCoefficient.value = 0.0;                     // skylight only, no sun disc
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const tmp = new THREE.Scene(); const parent = this.sky.parent; tmp.add(this.sky);
    const vis = this.sky.visible; this.sky.visible = true;
    const old = this.scene.environment;
    this.scene.environment = pmrem.fromScene(tmp, 0.04).texture;
    pmrem.dispose(); if (old) old.dispose();
    this.sky.visible = vis;
    if (parent) parent.add(this.sky);
    u.mieCoefficient.value = mie;
    this.envTimer = 45; this.envDirty = false;
  }
  update(dt, camPos) {
    dt = Math.min(dt, 0.1);
    if (this.auto) { this.hour = (this.hour + dt / 300) % 24; this.apply(); }   // 1 game hour per 5 real minutes
    this.envTimer -= dt;
    if (this.envTimer <= 0) this.captureEnv();
    if (this.stars) this.stars.update(this.starFade, camPos);
  }
}

// Sandstorms roll in every few minutes (or on demand): visibility drops,
// the sand-in-the-air thickens and races, the sun dims, the wind roars.
export class Sandstorm {
  constructor({ scene, sand, post, audio, csm, day }) {
    Object.assign(this, { scene, sand, post, audio, csm, day });
    this.k = 0; this.target = 0; this.active = false;
    this.timer = 200 + Math.random() * 240; this.remaining = 0;
    this.baseDensity = scene.fog ? scene.fog.density : 0.00013;
    this.dust = new THREE.Color(0xc9ac78);
  }
  start(duration = 55 + Math.random() * 35) { this.active = true; this.target = 1; this.remaining = duration; }
  stop() { this.active = false; this.target = 0; this.timer = 240 + Math.random() * 300; }
  toggle() { this.active ? this.stop() : this.start(); }
  update(dt, outdoors) {
    dt = Math.min(dt, 0.1);
    if (this.active) { this.remaining -= dt; if (this.remaining <= 0) this.stop(); }
    else { this.timer -= dt; if (this.timer <= 0) this.start(); }
    this.k += (this.target - this.k) * Math.min(1, dt * 0.35);
    const k = this.k;
    if (this.scene.fog) {
      this.scene.fog.density = this.baseDensity * (1 + 16 * k);
      this.scene.fog.color.lerp(this.dust, k * 0.85);
    }
    if (this.sand) this.sand.setStorm(k);
    if (this.post) this.post.setDust(k * (outdoors ? 1 : 0.25));
    if (this.audio) this.audio.storm = k * (outdoors ? 1 : 0.3);
    if (this.csm && this.day) for (const l of this.csm.lights) l.intensity = this.day.sunIntensity * (1 - 0.55 * k);
  }
}
