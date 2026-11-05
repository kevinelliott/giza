// =====================================================================
//  Life on the plateau: visitors who actually walk (swinging arms and
//  legs), horse carriages and camel rides plying the mapped site roads,
//  saddled camels you can ride, and the nightly Sound & Light show that
//  floods the Sphinx and the pyramids with colour.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainHeight } from './terrain.js';
import { ROUTES } from './geodata.js';
import { PYRAMIDS, SPHINX } from './data.js';

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// ---- a camel (children: 0 body, 1-2 humps, 3 neck, 4 head, 5-8 legs) ----
export function buildCamel(mat, x, z, rot, opts = {}) {
  const g = new THREE.Group();
  const part = (sx, sy, sz, px, py, pz, m = mat) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o;
  };
  const body = part(3.4, 1.6, 1.4, 0, 2.0, 0);
  part(1.1, 1.0, 1.1, -0.5, 3.0, 0);
  part(1.0, 0.8, 1.0, 0.7, 2.9, 0);
  part(0.7, 2.0, 0.7, 2.0, 2.6, 0);
  part(0.9, 0.7, 0.6, 2.4, 3.6, 0);
  for (const [lx, lz] of [[-1.2, 0.5], [-1.2, -0.5], [1.2, 0.5], [1.2, -0.5]]) {
    const leg = part(0.35, 2.0, 0.35, lx, 2.0, lz);
    leg.geometry.translate(0, -1.0, 0);                // pivot at the hip
  }
  if (opts.saddle) {                                     // woven blanket + saddle frame
    const blanket = new THREE.MeshStandardMaterial({ color: opts.saddle, roughness: 0.9 });
    part(1.9, 0.12, 1.75, -0.1, 3.55, 0, blanket);
    part(0.2, 0.28, 0.5, 0.75, 3.72, 0, blanket);          // low saddle pommel
  }
  g.position.set(x, terrainHeight(x, z), z); g.rotation.y = rot;
  g.userData.body = body;
  return g;
}
export function animateCamelLegs(c, t, speed, ph = 0) {
  const k = Math.min(1, speed / 1.2), legs = c.children;
  for (let i = 5; i < 9; i++) legs[i].rotation.z = Math.sin(t * (2.2 + speed * 0.9) + ph + (i % 2 ? Math.PI : 0) + (i > 6 ? 0.6 : 0)) * 0.32 * k;
  legs[4].rotation.z = Math.sin(t * 1.6 + ph) * 0.08;
}

// ---- a seated/standing person made of a few boxes (rider, driver) ----------
function figure(shirt, skin, seated) {
  const g = new THREE.Group();
  const m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), m(shirt)); torso.position.y = seated ? 0.35 : 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), m(skin)); head.position.y = torso.position.y + 0.45;
  const scarf = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.12, 8), m(0xf0ece2)); scarf.position.y = head.position.y + 0.08;
  for (const o of [torso, head, scarf]) { o.castShadow = true; g.add(o); }
  if (!seated) for (const x of [-0.09, 0.09]) {            // a long galabiya down to the feet
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.86, 0.2), torso.material); leg.position.set(0, 0.43, x); leg.castShadow = true; g.add(leg);
  }
  return g;
}

// ---- following a polyline route back and forth --------------------------
function makeRoute(flat) {
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push(new THREE.Vector2(flat[i], flat[i + 1]));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function onRoute(r, s, out) {                            // s in [0, 2*len): ping-pong
  let d = s % (2 * r.len), dir = 1;
  if (d > r.len) { d = 2 * r.len - d; dir = -1; }
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < d) i++;
  const a = r.pts[i - 1], b = r.pts[i], u = (d - r.cum[i - 1]) / Math.max(1e-6, r.cum[i] - r.cum[i - 1]);
  out.x = a.x + (b.x - a.x) * u; out.z = a.y + (b.y - a.y) * u;
  out.yaw = Math.atan2(-(b.y - a.y) * dir, (b.x - a.x) * dir);   // rotation.y for a +X-facing model
  return out;
}

// ---- horse carriages (calèches) and camel rides on the site roads -------
function buildCarriage(colors) {
  const g = new THREE.Group();
  const m = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const horseM = m(colors.horse);
  // horse at +X, pulling
  add(new THREE.BoxGeometry(1.8, 0.75, 0.55), horseM, 2.3, 1.45, 0);
  const neck = add(new THREE.BoxGeometry(0.35, 0.95, 0.32), horseM, 3.2, 1.95, 0); neck.rotation.z = -0.5;
  add(new THREE.BoxGeometry(0.62, 0.3, 0.26), horseM, 3.55, 2.35, 0);
  const legs = [];
  for (const [lx, lz] of [[1.6, 0.18], [1.6, -0.18], [3.0, 0.18], [3.0, -0.18]]) {
    const leg = add(new THREE.BoxGeometry(0.15, 1.1, 0.15), horseM, lx, 1.1, lz);
    leg.geometry.translate(0, -0.55, 0); legs.push(leg);
  }
  add(new THREE.BoxGeometry(0.5, 0.4, 0.62), m(colors.plume), 2.8, 1.95, 0);       // harness blanket
  // shafts + cart body, canopy and two big wheels
  add(new THREE.BoxGeometry(2.2, 0.08, 0.08), m(0x3a2a1a), 1.4, 1.25, 0.4);
  add(new THREE.BoxGeometry(2.2, 0.08, 0.08), m(0x3a2a1a), 1.4, 1.25, -0.4);
  add(new THREE.BoxGeometry(1.7, 0.55, 1.35), m(colors.cart, 0.5), -0.2, 1.15, 0);
  add(new THREE.BoxGeometry(1.5, 0.08, 1.45), m(0x1d1d1d, 0.6), -0.35, 2.45, 0);
  for (const sz of [-0.62, 0.62]) add(new THREE.BoxGeometry(0.06, 1.0, 0.06), m(0x2a2a2a), -1.0, 1.9, sz);
  const wheels = [];
  for (const sz of [-0.74, 0.74]) {
    const w = add(new THREE.TorusGeometry(0.6, 0.05, 6, 16), m(colors.wheel, 0.6), -0.2, 0.62, sz);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.04), w.material); sp.rotation.z = k * Math.PI / 3; w.add(sp); }
    wheels.push(w);
  }
  const driver = figure(0xe9e3d6, 0x8d5f3f, true); driver.position.set(0.55, 1.4, 0); g.add(driver);
  g.userData = { legs, wheels };
  return g;
}

export function buildTraffic(group, camelMat) {
  const routes = ROUTES.map(makeRoute).filter(r => r.len > 200);
  const movers = [];
  const carriageColors = [
    { horse: 0x2a1d14, cart: 0x7a1b1b, wheel: 0xc9a227, plume: 0xd23c3c },
    { horse: 0xd9d2c4, cart: 0x1f4f7a, wheel: 0xd8c27a, plume: 0x2f7fd0 },
    { horse: 0x5a3b24, cart: 0x2c5d2a, wheel: 0xc9a227, plume: 0xe2b33c },
    { horse: 0x3b2b20, cart: 0x6b2f6b, wheel: 0xd8c27a, plume: 0xcf4fb0 }
  ];
  routes.forEach((r, i) => {
    const nCar = Math.max(1, Math.round(r.len / 700)), nCam = Math.max(1, Math.round(r.len / 900));
    for (let k = 0; k < nCar; k++) {
      const g = buildCarriage(carriageColors[(i + k) % carriageColors.length]); group.add(g);
      movers.push({ g, r, s: rnd() * r.len * 2, speed: 3.2 + rnd() * 1.4, type: 'carriage', ph: rnd() * 6 });
    }
    for (let k = 0; k < nCam; k++) {
      const c = buildCamel(camelMat, 0, 0, 0, { saddle: [0xb03030, 0x2d5aa0, 0xd8a030, 0x3f7f3f][k % 4] });
      const rider = figure([0xf2f2f2, 0x2b4f8c, 0xc23b2f, 0xe8c547][(i + k) % 4], 0xe6c2a0, true); rider.position.set(-0.2, 3.62, 0); c.add(rider);
      const guide = figure(0x3d5a7a, 0x8d5f3f, false); guide.position.set(3.6, 0, 0.9); c.add(guide);   // a cameleer leads it
      group.add(c);
      movers.push({ g: c, r, s: rnd() * r.len * 2, speed: 1.1 + rnd() * 0.3, type: 'camel', ph: rnd() * 6 });
    }
  });
  const p = { x: 0, z: 0, yaw: 0 };
  let last = 0;
  return t => {
    const dt = Math.min(0.1, last ? t - last : 0); last = t;
    for (const m of movers) {
      m.s += m.speed * dt;
      onRoute(m.r, m.s, p);
      m.g.position.set(p.x, terrainHeight(p.x, p.z), p.z);
      m.g.rotation.y = p.yaw;
      if (m.type === 'carriage') {
        const { legs, wheels } = m.g.userData;
        legs.forEach((l, k) => { l.rotation.z = Math.sin(t * 7 + m.ph + (k % 2) * Math.PI + (k > 1 ? 1.2 : 0)) * 0.45; });
        for (const w of wheels) w.rotation.z -= m.speed * dt / 0.6;
      } else animateCamelLegs(m.g, t, m.speed, m.ph);
    }
  };
}

// ---- visitors who walk -------------------------------------------------
export function buildVisitors(group) {
  const spots = [
    { x: 7, z: -150, r: 38, n: 34 }, { x: 150, z: -110, r: 25, n: 10 }, { x: 440, z: 452, r: 22, n: 26 },
    { x: -330, z: 222, r: 30, n: 14 }, { x: -575, z: 660, r: 22, n: 8 }, { x: -737, z: 1149, r: 18, n: 16 },
    { x: 4, z: -235, r: 55, n: 18 }, { x: 395, z: 395, r: 14, n: 8 }, { x: -160, z: 352, r: 22, n: 10 }
  ];
  const total = spots.reduce((s, p) => s + p.n, 0);
  // parts, each modelled with its pivot at the origin
  const torsoG = new THREE.LatheGeometry([[0.001, 0.0], [0.15, 0.0], [0.16, 0.12], [0.15, 0.34], [0.21, 0.52], [0.2, 0.6], [0.07, 0.66], [0.05, 0.7]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 7);
  torsoG.scale(1, 1, 0.62);
  const headG = new THREE.SphereGeometry(0.115, 8, 6); headG.translate(0, 0.81, 0);
  const legG = new THREE.BoxGeometry(0.13, 0.86, 0.15); legG.translate(0, -0.43, 0);
  const armG = new THREE.BoxGeometry(0.09, 0.6, 0.1); armG.translate(0, -0.3, 0);
  const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, total); m.castShadow = true; m.frustumCulled = false; group.add(m); return m; };
  const torsos = mk(torsoG, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
  const heads = mk(headG, new THREE.MeshStandardMaterial({ roughness: 0.7 }));
  const legsL = mk(legG, new THREE.MeshStandardMaterial({ roughness: 0.9 })), legsR = mk(legG, legsL.material);
  const armsL = mk(armG, new THREE.MeshStandardMaterial({ roughness: 0.85 })), armsR = mk(armG, armsL.material);
  const shirts = [0xf2f2f2, 0x2b4f8c, 0xc23b2f, 0x1e1e1e, 0xe8c547, 0x6fa36a, 0xd98ab0, 0x8a6b4a, 0x4fb3c9, 0xb0b0b0, 0xf28c28];
  const trousers = [0x2a3550, 0x1e1e1e, 0xd8cfb8, 0x5a5a5a, 0x3c5a3c, 0xe8e2d4];
  const skins = [0xc99d78, 0x8d5f3f, 0xe6c2a0, 0xa8754f, 0xf0d2b8];
  const people = [], c = new THREE.Color();
  for (const sp of spots) for (let i = 0; i < sp.n; i++) {
    const a = rnd() * 6.283, r = Math.sqrt(rnd()) * sp.r;
    const p = { sp, x: sp.x + Math.cos(a) * r, z: sp.z + Math.sin(a) * r, wait: rnd() * 6, speed: 0.7 + rnd() * 0.6,
      s: 0.9 + rnd() * 0.17, ph: rnd() * 9, yaw: rnd() * 6.3, look: 0 };
    p.tx = p.x; p.tz = p.z;
    const k = people.length, shirt = shirts[Math.floor(rnd() * shirts.length)];
    torsos.setColorAt(k, c.setHex(shirt));
    heads.setColorAt(k, c.setHex(skins[Math.floor(rnd() * skins.length)]));
    armsL.setColorAt(k, c.setHex(rnd() < 0.5 ? shirt : skins[Math.floor(rnd() * skins.length)])); armsR.setColorAt(k, c);
    legsL.setColorAt(k, c.setHex(trousers[Math.floor(rnd() * trousers.length)])); legsR.setColorAt(k, c);
    people.push(p);
  }
  const m = new THREE.Matrix4(), base = new THREE.Matrix4(), local = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const sc = new THREE.Vector3(), v = new THREE.Vector3();
  let last = 0;
  return t => {
    const dt = Math.min(0.1, last ? t - last : 0); last = t;
    people.forEach((p, k) => {
      let walk = 0;
      if (p.wait > 0) { p.wait -= dt; p.look = Math.sin(t * 0.7 + p.ph) * 0.6; }
      else {
        const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.3) {
          p.wait = 2 + rnd() * 9;
          const a = rnd() * 6.283, r = Math.sqrt(rnd()) * p.sp.r;
          p.tx = p.sp.x + Math.cos(a) * r; p.tz = p.sp.z + Math.sin(a) * r;
        } else { p.x += dx / d * p.speed * dt; p.z += dz / d * p.speed * dt; p.yaw = Math.atan2(dx, dz); walk = 1; }
      }
      const ph = t * p.speed * 5.2 + p.ph, sw = Math.sin(ph) * 0.5 * walk;
      const y = terrainHeight(p.x, p.z) + Math.abs(Math.cos(ph)) * 0.035 * walk;
      e.set(0, p.yaw + p.look * (1 - walk), 0); q.setFromEuler(e);
      base.compose(v.set(p.x, y, p.z), q, sc.set(p.s, p.s, p.s));
      // torso sits on the hips at 0.86 m
      torsos.setMatrixAt(k, m.multiplyMatrices(base, local.makeTranslation(0, 0.86, 0)));
      heads.setMatrixAt(k, m);
      const limb = (mesh, x, yy, ang) => {
        local.makeRotationX(ang).setPosition(x, yy, 0);
        mesh.setMatrixAt(k, m.multiplyMatrices(base, local));
      };
      limb(legsL, -0.08, 0.88, sw); limb(legsR, 0.08, 0.88, -sw);
      limb(armsL, -0.24, 1.43, -sw * 0.8); limb(armsR, 0.24, 1.43, sw * 0.8);
    });
    for (const mm of [torsos, heads, legsL, legsR, armsL, armsR]) mm.instanceMatrix.needsUpdate = true;
  };
}

// ---- Khufu's summit mast ------------------------------------------------
// The surveyors' mast planted on the flat summit in 1874 marks the original
// apex, ~7.8 m above today's top platform.
export function buildSummitMast(group) {
  const kh = PYRAMIDS.khufu, top = 138.8, mat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7, metalness: 0.3 });
  const geoms = [new THREE.CylinderGeometry(0.09, 0.12, kh.height - top + 0.4, 6).translate(0, (kh.height - top) / 2 + 0.2, 0)];
  for (let k = 0; k < 3; k++) {
    const leg = new THREE.CylinderGeometry(0.05, 0.06, 3.4, 5).translate(0, 1.7, 0);
    leg.rotateZ(0.42); leg.rotateY(k * Math.PI * 2 / 3);
    geoms.push(leg);
  }
  const mast = new THREE.Mesh(mergeGeometries(geoms, false), mat);
  mast.position.set(kh.center.x, kh.baseY + top, kh.center.z); mast.castShadow = true;
  group.add(mast);
}

// ---- the Sound & Light show ----------------------------------------------
// Every evening coloured floodlights on the Sphinx terrace sweep the Sphinx
// and the three pyramids in turn. Lights are always present (so materials
// never recompile at dusk); their intensity is zero by day.
export function buildLightShow(scene) {
  const origin = { x: SPHINX.center.x + 120, y: SPHINX.floorY + 6, z: SPHINX.center.z + 10 };
  const targets = [
    { p: { x: SPHINX.center.x + 10, y: SPHINX.floorY + 12, z: SPHINX.center.z }, angle: 0.2, k: 9 },
    { p: { x: PYRAMIDS.khufu.center.x, y: 50, z: PYRAMIDS.khufu.center.z }, angle: 0.19, k: 12 },
    { p: { x: PYRAMIDS.khafre.center.x, y: PYRAMIDS.khafre.baseY + 50, z: PYRAMIDS.khafre.center.z }, angle: 0.16, k: 12 },
    { p: { x: PYRAMIDS.menkaure.center.x, y: PYRAMIDS.menkaure.baseY + 22, z: PYRAMIDS.menkaure.center.z }, angle: 0.09, k: 12 }
  ];
  const palette = [0xff3b2f, 0x2f7bff, 0xffb02f, 0x2fff9a, 0xc84bff, 0xffffff].map(h => new THREE.Color(h));
  const lights = targets.map((tg, i) => {
    const l = new THREE.SpotLight(0xffffff, 0, 0, tg.angle, 0.6, 0);
    l.position.set(origin.x + i * 6, origin.y, origin.z - 12 + i * 8);
    l.target.position.set(tg.p.x, tg.p.y, tg.p.z);
    scene.add(l, l.target);
    return { l, tg };
  });
  let level = 0;
  return (t, nightK) => {
    level = THREE.MathUtils.damp(level, nightK, 0.8, 1 / 60);
    const cyc = t / 9;                                     // a new colour every ~9 s
    lights.forEach(({ l, tg }, i) => {
      const a = palette[Math.floor(cyc + i * 1.7) % palette.length], b = palette[Math.floor(cyc + i * 1.7 + 1) % palette.length];
      const f = THREE.MathUtils.smoothstep((cyc + i * 1.7) % 1, 0.75, 1);
      l.color.copy(a).lerp(b, f);
      const pulse = 0.75 + 0.25 * Math.sin(t * 0.5 + i * 2);
      l.intensity = level * tg.k * pulse;
    });
  };
}
