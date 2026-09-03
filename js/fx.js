import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

// =====================================================================
//  Immersion FX: particles (kicked-up dust, wind-blown sand), ground
//  pebbles, sun lens flare, cinematic post-processing and procedural
//  wind/footstep audio.
// =====================================================================

// ---- Soft-point shader shared by the particle systems -----------------
const POINT_VERT = /* glsl */`
  attribute float aAlpha;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(0.05, -mv.z);
    // fade out motes that would otherwise fill the screen right at the lens
    vAlpha = aAlpha * smoothstep(0.35, 1.8, dist);
    gl_PointSize = min(aSize * (320.0 / dist), 160.0);
    gl_Position = projectionMatrix * mv;
  }`;
const POINT_FRAG = /* glsl */`
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.12, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }`;

function makePoints(max, color, bright = 2.6) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(max * 3), alpha = new Float32Array(max), size = new Float32Array(max);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  // ShaderMaterial skips lighting, so pre-scale the colour to roughly what
  // sunlit sand comes out as after tone mapping.
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(bright) } },
    vertexShader: POINT_VERT, fragmentShader: POINT_FRAG,
    transparent: true, depthWrite: false
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, geo, pos, alpha, size };
}

// ---- Dust kicked up at the player's feet ------------------------------
export class Dust {
  constructor(scene, max = 420) {
    this.max = max;
    const p = makePoints(max, 0xcdb48c, 1.8);
    Object.assign(this, p);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max).fill(1);
    this.maxLife = new Float32Array(max).fill(1);
    this.base = new Float32Array(max);
    this.head = 0; this.accum = 0;
    scene.add(this.pts);
  }
  emit(x, y, z, vx, vz, n, energy) {
    for (let k = 0; k < n; k++) {
      const i = this.head++ % this.max, i3 = i * 3;
      // scatter along the stride: a little ahead of the feet as well as behind
      const along = -0.4 + Math.random() * 1.1;
      this.pos[i3] = x + vx * along + (Math.random() - 0.5) * 0.6;
      this.pos[i3 + 1] = y + 0.05 + Math.random() * 0.2;
      this.pos[i3 + 2] = z + vz * along + (Math.random() - 0.5) * 0.6;
      // puff up and slightly backwards from the direction of travel
      this.vel[i3] = (Math.random() - 0.5) * 1.1 - vx * 0.15;
      this.vel[i3 + 1] = 0.5 + Math.random() * (0.9 + energy * 0.6);
      this.vel[i3 + 2] = (Math.random() - 0.5) * 1.1 - vz * 0.15;
      this.life[i] = 0;
      this.maxLife[i] = 0.7 + Math.random() * 0.9;
      this.base[i] = 0.4 + Math.random() * 0.5;
    }
  }
  // Call every frame. Emits while the player is moving on outdoor ground.
  update(dt, player, outdoors) {
    const moving = player.onGround && outdoors && player.speedXZ > 0.6 && !player.fly;
    if (moving) {
      const energy = Math.min(1, player.speedXZ / 12);
      this.accum += player.speedXZ * dt * (3.5 + energy * 5);
      const vx = player.vXZ.x / Math.max(0.1, player.speedXZ), vz = player.vXZ.z / Math.max(0.1, player.speedXZ);
      while (this.accum >= 1) {
        this.accum -= 1;
        const p = player.position;
        this.emit(p.x, p.y, p.z, vx, vz, 1 + (energy > 0.5 ? 1 : 0), energy);
      }
    }
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] >= this.maxLife[i]) { this.alpha[i] = 0; continue; }
      this.life[i] += dt;
      const i3 = i * 3, t = this.life[i] / this.maxLife[i];
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const drag = Math.pow(0.15, dt);
      this.vel[i3] *= drag; this.vel[i3 + 2] *= drag;
      this.vel[i3 + 1] = this.vel[i3 + 1] * drag - 0.25 * dt;
      this.alpha[i] = Math.min(1, t * 6) * (1 - t) * 0.5;
      this.size[i] = this.base[i] * (1 + t * 1.8);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }
}

// ---- Wind-blown sand drifting across the plateau -----------------------
export class BlowingSand {
  constructor(scene, count = 1400, radius = 95) {
    this.n = count; this.r = radius;
    const p = makePoints(count, 0xe2cba2);
    Object.assign(this, p);
    this.jit = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.pos[i3] = (Math.random() - 0.5) * 2 * radius;
      this.pos[i3 + 1] = 0.2 + Math.random() * 22;
      this.pos[i3 + 2] = (Math.random() - 0.5) * 2 * radius;
      this.jit[i3] = (Math.random() - 0.5) * 1.5; this.jit[i3 + 1] = Math.random() * 2;
      this.jit[i3 + 2] = (Math.random() - 0.5) * 1.5;
      this.alpha[i] = 0.10 + Math.random() * 0.14;
      this.size[i] = 0.10 + Math.random() * 0.22;
    }
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.wind = new THREE.Vector3(4.5, 0, 1.2);
    this.cx = 0; this.cz = 0;
    scene.add(this.pts);
  }
  update(dt, t, playerPos, outdoors) {
    this.pts.visible = outdoors;
    if (!outdoors) return;
    const gust = 0.7 + 0.5 * Math.sin(t * 0.35) + 0.25 * Math.sin(t * 1.7 + 1.3);
    const wx = this.wind.x * gust, wz = this.wind.z * gust, r = this.r;
    this.cx = playerPos.x; this.cz = playerPos.z;
    for (let i = 0; i < this.n; i++) {
      const i3 = i * 3;
      this.pos[i3] += (wx + this.jit[i3]) * dt;
      this.pos[i3 + 1] += Math.sin(t * this.jit[i3 + 1] + i) * 0.35 * dt;
      this.pos[i3 + 2] += (wz + this.jit[i3 + 2]) * dt;
      // keep the cloud wrapped around the player
      if (this.pos[i3] > r) this.pos[i3] -= 2 * r; else if (this.pos[i3] < -r) this.pos[i3] += 2 * r;
      if (this.pos[i3 + 2] > r) this.pos[i3 + 2] -= 2 * r; else if (this.pos[i3 + 2] < -r) this.pos[i3 + 2] += 2 * r;
      if (this.pos[i3 + 1] < 0.2) this.pos[i3 + 1] = 0.2 + Math.random() * 20;
    }
    this.pts.position.set(this.cx, 0, this.cz);
    this.geo.attributes.position.needsUpdate = true;
  }
}

// ---- Scattered pebbles and small rocks on the ground -------------------
export function createRocks(scene, terrainHeight, inPit, bounds) {
  const group = new THREE.Group();
  const mkLayer = (count, radius, color, scaleMin, scaleMax, rough) => {
    const geo = new THREE.DodecahedronGeometry(radius, 0);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    let placed = 0, tries = 0;
    while (placed < count && tries < count * 4) {
      tries++;
      const x = bounds.x0 + Math.random() * (bounds.x1 - bounds.x0);
      const z = bounds.z0 + Math.random() * (bounds.z1 - bounds.z0);
      if (inPit(x, z)) continue;
      const y = terrainHeight(x, z);
      const k = scaleMin + Math.random() * (scaleMax - scaleMin);
      s.set(k * (0.7 + Math.random() * 0.6), k * (0.5 + Math.random() * 0.5), k * (0.7 + Math.random() * 0.6));
      e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y + radius * s.y * 0.5, z), q, s);
      inst.setMatrixAt(placed++, m);
    }
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    inst.receiveShadow = true;
    group.add(inst);
  };
  mkLayer(6000, 0.14, 0x8f7a58, 0.5, 1.5, 1.0);      // pebbles
  mkLayer(900, 0.45, 0x9a8460, 0.6, 1.6, 0.98);      // fist- to head-sized rocks
  mkLayer(140, 1.1, 0xa08a64, 0.7, 1.4, 0.95);       // boulders
  scene.add(group);
  return group;
}

// ---- Dense near-field pebbles that follow the player ---------------------
// Far-field rocks above are sparse; this keeps a hashed grid of small
// stones populated around the player so the ground never looks bare.
function hash2(ix, iz, k) {
  let h = (ix * 374761393 + iz * 668265263 + k * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export class NearDebris {
  constructor(scene, terrainHeight, inPit, { cell = 6, range = 7, perCell = 9 } = {}) {
    this.th = terrainHeight; this.inPit = inPit;
    this.cell = cell; this.range = range; this.perCell = perCell;
    const n = (range * 2 + 1) ** 2 * perCell;
    const geo = new THREE.DodecahedronGeometry(0.075, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x85704e, roughness: 1, metalness: 0 });
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.cx = NaN; this.cz = NaN;
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  update(pos) {
    const cx = Math.floor(pos.x / this.cell), cz = Math.floor(pos.z / this.cell);
    if (cx === this.cx && cz === this.cz) return;
    this.cx = cx; this.cz = cz;
    let k = 0;
    for (let ix = cx - this.range; ix <= cx + this.range; ix++) {
      for (let iz = cz - this.range; iz <= cz + this.range; iz++) {
        // fewer pebbles in some cells so the scatter isn't uniform
        const density = hash2(ix, iz, 0) < 0.25 ? this.perCell / 3 : this.perCell;
        for (let j = 0; j < this.perCell; j++) {
          if (j >= density) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(k++, this._m); continue; }
          const x = (ix + hash2(ix, iz, j * 4 + 1)) * this.cell;
          const z = (iz + hash2(ix, iz, j * 4 + 2)) * this.cell;
          if (this.inPit(x, z)) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(k++, this._m); continue; }
          const sc = 0.45 + hash2(ix, iz, j * 4 + 3) * 1.4;
          this._s.set(sc * (0.7 + hash2(ix, iz, j * 4 + 4) * 0.6), sc * 0.6, sc);
          this._e.set(hash2(ix, iz, j + 77) * 3, hash2(ix, iz, j + 99) * 3, 0);
          this._q.setFromEuler(this._e);
          this._p.set(x, this.th(x, z) + 0.075 * this._s.y * 0.6, z);
          this._m.compose(this._p, this._q, this._s);
          this.mesh.setMatrixAt(k++, this._m);
        }
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---- Sun lens flare ------------------------------------------------------
function flareTexture(size, inner, outer, hard) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner); grd.addColorStop(hard ? 0.35 : 0.2, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function createLensflare(scene, sunDir) {
  const holder = new THREE.Object3D();
  holder.position.copy(sunDir).multiplyScalar(2800);
  const glow = flareTexture(256, 'rgba(255,240,210,1)', 'rgba(255,200,120,0)', false);
  const ring = flareTexture(128, 'rgba(255,220,170,0.55)', 'rgba(255,220,170,0)', true);
  const lf = new Lensflare();
  lf.addElement(new LensflareElement(glow, 620, 0, new THREE.Color(0xfff2d8)));
  lf.addElement(new LensflareElement(ring, 70, 0.55));
  lf.addElement(new LensflareElement(ring, 110, 0.75));
  lf.addElement(new LensflareElement(ring, 50, 0.95));
  holder.add(lf);
  scene.add(holder);
  return holder;
}

// ---- Cinematic post-processing --------------------------------------------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 },
    uVignette: { value: 0.38 }, uGrain: { value: 0.025 }, uWarm: { value: 0.035 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uWarm;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // warm desert grade + a touch of contrast/saturation
      c.rgb += vec3(uWarm, uWarm * 0.45, -uWarm * 0.7);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, 1.10);
      c.rgb = (c.rgb - 0.5) * 1.06 + 0.5;
      // vignette
      vec2 p = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * dot(p, p) * 1.7;
      // fine film grain
      c.rgb += (hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`
};
export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.16, 0.5, 0.92);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  let enabled = true;
  return {
    setEnabled(v) { enabled = v; },
    get enabled() { return enabled; },
    resize(w, h) { composer.setSize(w, h); bloom.resolution.set(w, h); },
    setPixelRatio(r) { composer.setPixelRatio(r); },
    render(t) {
      if (!enabled) { renderer.render(scene, camera); return; }
      grade.uniforms.uTime.value = t;
      composer.render();
    }
  };
}

// ---- Procedural audio: wind ambience + footsteps -------------------------
export class AudioFX {
  constructor() { this.ctx = null; this.muted = false; this._dist = 0; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ctx.destination);
      // looping noise → lowpass → gain = wind
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;                 // pink-ish noise
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
      }
      this.noise = buf;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 420;
      this.windGain = ctx.createGain(); this.windGain.gain.value = 0.0;
      src.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.master);
      src.start();
      // echo for indoor footsteps
      this.delay = ctx.createDelay(0.5); this.delay.delayTime.value = 0.13;
      this.delayGain = ctx.createGain(); this.delayGain.gain.value = 0.28;
      this.delay.connect(this.delayGain); this.delayGain.connect(this.delay); this.delayGain.connect(this.master);
    } catch { this.ctx = null; }
  }
  // Wind level follows gusts, player speed and whether we're inside.
  update(t, speed, indoors, flying) {
    if (!this.ctx) return;
    const gust = 0.16 + 0.07 * Math.sin(t * 0.35) + 0.04 * Math.sin(t * 1.7 + 1.3);
    let target = gust + Math.min(0.12, speed * 0.006) + (flying ? 0.08 : 0);
    if (indoors) target *= 0.25;
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
    this.windFilter.frequency.setTargetAtTime(380 + speed * 20, this.ctx.currentTime, 0.4);
  }
  footstep(indoors, run) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    if (indoors) { f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 500; f.Q.value = 1.2; }
    else { f.type = 'lowpass'; f.frequency.value = 520 + Math.random() * 220; }
    const g = ctx.createGain();
    const now = ctx.currentTime, vol = (run ? 0.42 : 0.28) * (0.8 + Math.random() * 0.4);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (indoors ? 0.11 : 0.09));
    src.connect(f); f.connect(g); g.connect(this.master);
    if (indoors) g.connect(this.delay);
    src.start(now, Math.random() * 1.5, 0.15);
  }
  // Distance-based step trigger; call each frame.
  steps(dt, player, indoors) {
    if (!this.ctx || !player.onGround || player.fly || player.speedXZ < 0.6) { this._dist = 0; return; }
    const stride = player.speedXZ > 9 ? 2.6 : 1.7;
    this._dist += player.speedXZ * dt;
    if (this._dist >= stride) { this._dist -= stride; this.footstep(indoors, player.speedXZ > 9); }
  }
  // Short one-shot noise bursts for stone impacts, throws and pick-ups.
  _burst({ type = 'lowpass', freq = 400, q = 1, vol = 0.3, attack = 0.005, decay = 0.1, echo = false } = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(), now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    src.connect(f); f.connect(g); g.connect(this.master);
    if (echo) g.connect(this.delay);
    src.start(now, Math.random() * 1.5, decay + 0.05);
  }
  thud(strength, indoors, dist) {
    const att = 1 / (1 + dist * dist * 0.02);
    this._burst({ type: indoors ? 'bandpass' : 'lowpass', freq: indoors ? 900 : 260, q: indoors ? 2 : 0.8,
      vol: Math.max(0.02, 0.55 * strength * att), decay: indoors ? 0.16 : 0.12, echo: indoors });
  }
  whoosh() { this._burst({ type: 'bandpass', freq: 1400, q: 0.6, vol: 0.12, attack: 0.03, decay: 0.18 }); }
  click() { this._burst({ type: 'highpass', freq: 2500, vol: 0.15, decay: 0.05 }); }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    return this.muted;
  }
}
