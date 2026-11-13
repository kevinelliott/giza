// =====================================================================
//  Road traffic, on the mapped roads only (js/roadnet.js, built by
//  tools/geo/build_roadnet.py from OpenStreetMap):
//    public streets outside the antiquities fence — cars, taxis,
//      microbuses, tuk-tuks, pickups, city buses and tour coaches,
//      keeping to the right as Egypt does;
//    paved roads inside the fence — only the electric visitor buses
//      (cars, taxis and coaches have been kept out since April 2025).
//  Footpaths, tracks and open desert carry no vehicles at all. Also cars
//  parked along the side streets and street lamps on the larger ones.
//  Vehicles are instanced meshes (models: tools/blender/vehicles.py).
//  The native build has the same logic in godot/scripts/traffic.gd.
// =====================================================================
import * as THREE from 'three';
import { terrainHeight } from './terrain.js';
import { ROADS, LAMPS } from './roadnet.js';

// name: [length, share on public streets, min rank, max rank, speed factor, second colour]
const TYPES = {
  car: [4.4, 0.42, 0, 9, 1.0, 0x111111], taxi: [4.4, 0.16, 0, 9, 1.0, 0x0c0c0c], microbus: [4.9, 0.15, 1, 9, 1.0, 0x111111],
  tuktuk: [2.65, 0.12, 0, 2, 0.7, 0xd9b21a], pickup: [5.0, 0.09, 0, 9, 0.9, 0x111111], bus: [11.8, 0.06, 2, 9, 0.8, 0xb8262a],
  coach: [12.2, 0.04, 2, 9, 0.75, 0x1f4f9a], shuttle: [7.6, 0.0, 0, 9, 0.8, 0x2f8f4f]
};
const PAINTS = [0xe8e8e6, 0xe8e8e6, 0xc9ccd0, 0x9a9da2, 0x2b2d31, 0x101113, 0x7a1f1f, 0x1f3f7a, 0xb9a98a, 0x6b6f5a];
const WHITE = ['taxi', 'microbus', 'bus', 'coach', 'shuttle'];

let seed = 21;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// An instanced copy of one vehicle model: one InstancedMesh per material of
// the model, all sharing the same instance transforms; only the "paint"
// material takes the per-instance colour.
function fleet(model, type, count, group) {
  const parts = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    const name = o.material.name;
    let mat;
    if (name === 'paint') mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.25 });
    else if (name === 'paint2') mat = new THREE.MeshStandardMaterial({ color: TYPES[type][5], roughness: 0.5 });
    else if (name === 'glass') mat = new THREE.MeshStandardMaterial({ color: 0x0d1217, roughness: 0.1, metalness: 0.5 });
    else mat = new THREE.MeshStandardMaterial({ color: o.material.color, roughness: 0.6 });
    const im = new THREE.InstancedMesh(o.geometry, mat, count);
    im.castShadow = true; im.frustumCulled = false; im.userData.dynamic = true; im.userData.paint = name === 'paint';
    group.add(im); parts.push(im);
  });
  return {
    set(i, m) { for (const p of parts) p.setMatrixAt(i, m); },
    color(i, c) { for (const p of parts) if (p.userData.paint) p.setColorAt(i, c); },
    flush() { for (const p of parts) { p.instanceMatrix.needsUpdate = true; if (p.instanceColor) p.instanceColor.needsUpdate = true; } }
  };
}

export function buildRoadTraffic(group, vehicles) {
  // the road graph
  const edges = [], nodes = new Map();
  const key = (x, z) => Math.round(x * 2) + ',' + Math.round(z * 2);
  for (const r of ROADS) {
    const pts = [];
    for (let i = 4; i < r.length; i += 2) pts.push(new THREE.Vector2(r[i], r[i + 1]));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const e = { pts, cum, len: cum[cum.length - 1], kind: r[0], rank: r[1], hw: r[2], speed: r[3], a: key(pts[0].x, pts[0].y), b: key(pts[pts.length - 1].x, pts[pts.length - 1].y) };
    const k = edges.push(e) - 1;
    for (const [nk, end] of [[e.a, 0], [e.b, 1]]) { if (!nodes.has(nk)) nodes.set(nk, []); nodes.get(nk).push([k, end]); }
  }
  const models = {};
  vehicles.traverse(o => { if (TYPES[o.name]) models[o.name] = o; });
  const at = (e, d, out) => {                                 // point and unit direction (a -> b) at distance d from a
    let i = 1;
    while (i < e.cum.length - 1 && e.cum[i] < d) i++;
    const a = e.pts[i - 1], b = e.pts[i], u = Math.min(1, Math.max(0, (d - e.cum[i - 1]) / Math.max(1e-6, e.cum[i] - e.cum[i - 1])));
    out.x = a.x + (b.x - a.x) * u; out.z = a.y + (b.y - a.y) * u;
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1; out.dx = (b.x - a.x) / L; out.dz = (b.y - a.y) / L;
    return out;
  };
  const randomEdge = (kind, rmin, rmax) => {
    for (let n = 0; n < 60; n++) {
      const k = Math.floor(rnd() * edges.length), e = edges[k];
      if (e.kind === kind && e.rank >= rmin && e.rank <= rmax && e.len > 12) return k;
    }
    return -1;
  };
  // how many of each: about one moving vehicle per 230 m of street, one visitor bus per 1.1 km of site road
  let pub = 0, site = 0;
  for (const e of edges) { if (e.kind === 0) pub += e.len; else site += e.len; }
  const plan = [];
  for (const t in TYPES) for (let i = 0; i < Math.round(pub / 230 * TYPES[t][1]); i++) plan.push([t, 0]);
  for (let i = 0; i < Math.round(site / 1100); i++) plan.push(['shuttle', 1]);
  const cars = [], counts = {};
  for (const [type, kind] of plan) {
    const e = randomEdge(kind, TYPES[type][2], TYPES[type][3]);
    if (e < 0 || !models[type]) continue;
    counts[type] = (counts[type] || 0) + 1;
    const paint = WHITE.includes(type) ? 0xf0f0ee : (type === 'tuktuk' ? 0x15161a : PAINTS[Math.floor(rnd() * PAINTS.length)]);
    cars.push({ type, i: counts[type] - 1, e, dir: rnd() < 0.5 ? 1 : -1, s: rnd() * edges[e].len, v: 0, yaw: 0, paint, site: kind, init: false });
  }
  const fleets = {};
  const col = new THREE.Color();
  for (const t in counts) fleets[t] = fleet(models[t], t, counts[t], group);
  for (const c of cars) fleets[c.type].color(c.i, col.setHex(c.paint));

  // cars parked along the side streets: right-hand kerb, facing the way they would drive
  const slots = { car: [], pickup: [], microbus: [], taxi: [] };
  const p = { x: 0, z: 0, dx: 0, dz: 0 }, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (const e of edges) {
    if (e.kind !== 0 || e.rank > 2 || e.len < 30) continue;
    for (const dirn of [1, -1]) {
      let d = 8 + rnd() * 20;
      while (d < e.len - 8) {
        if (rnd() < 0.55) {
          at(e, d, p);
          const dx = p.dx * dirn, dz = p.dz * dirn, x = p.x - dz * (e.hw + 0.2), z = p.z + dx * (e.hw + 0.2);
          const r = rnd(), t = r < 0.7 ? 'car' : (r < 0.82 ? 'pickup' : (r < 0.93 ? 'microbus' : 'taxi'));
          slots[t].push([x, z, Math.atan2(-dz, dx) + (rnd() - 0.5) * 0.08, WHITE.includes(t) ? 0xf0f0ee : PAINTS[Math.floor(rnd() * PAINTS.length)]]);
        }
        d += 6.5 + rnd() * 22;
      }
    }
  }
  for (const t in slots) {
    if (!models[t] || !slots[t].length) continue;
    const f = fleet(models[t], t, slots[t].length, group);
    slots[t].forEach(([x, z, yaw, paint], i) => {
      f.set(i, m4.compose(v3.set(x, terrainHeight(x, z) + 0.02, z), q.setFromEuler(e3.set(0, yaw, 0)), one));
      f.color(i, col.setHex(paint));
    });
    f.flush();
  }

  // street lamps: a pole, an arm over the road and a head that glows at night
  const steel = new THREE.MeshStandardMaterial({ color: 0x6b7073, roughness: 0.6, metalness: 0.4 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe6e6da, emissive: 0xffd28c, emissiveIntensity: 0 });
  const lampParts = [[new THREE.CylinderGeometry(0.06, 0.1, 8, 6), steel, 0, 4, 0], [new THREE.BoxGeometry(1.8, 0.07, 0.07), steel, 0.85, 8, 0], [new THREE.BoxGeometry(0.7, 0.1, 0.26), headMat, 1.6, 7.93, 0]];
  for (const [geo, mat, ox, oy] of lampParts) {
    const im = new THREE.InstancedMesh(geo, mat, LAMPS.length); im.frustumCulled = false; im.userData.dynamic = true;
    LAMPS.forEach(([x, z, hd], i) => {
      const a = -hd * Math.PI / 180;                           // local +X points along the heading (atan2(z, x))
      q.setFromEuler(e3.set(0, a, 0));
      im.setMatrixAt(i, m4.compose(v3.set(x + Math.cos(a) * ox, terrainHeight(x, z) + oy, z - Math.sin(a) * ox), q, one));
    });
    group.add(im);
  }

  const next = c => {                                          // at the end of a street: pick the next one this vehicle may use
    const e = edges[c.e], nk = c.dir > 0 ? e.b : e.a, t = TYPES[c.type], opts = [];
    let total = 0;
    for (const o of nodes.get(nk)) {
      const ne = edges[o[0]];
      if (o[0] === c.e || ne.kind !== c.site || ne.rank < t[2] || ne.rank > t[3]) continue;
      opts.push([o, 1 + ne.rank * 1.5]); total += 1 + ne.rank * 1.5;
    }
    if (!opts.length) { c.dir = -c.dir; c.s = 0; c.v = 0; return; }   // dead end, or nothing it may enter: turn round
    let pick = rnd() * total, k = 0;
    while (k < opts.length - 1 && pick > opts[k][1]) { pick -= opts[k][1]; k++; }
    c.e = opts[k][0][0]; c.dir = opts[k][0][1] === 0 ? 1 : -1; c.s = 0;
  };
  const lanes = new Map();
  let last = 0;
  return (t, eye, night = 0) => {
    const dt = Math.min(0.1, last ? t - last : 0); last = t;
    headMat.emissiveIntensity = 3 * night;
    lanes.clear();
    cars.forEach((c, k) => { const lk = c.e * 2 + (c.dir > 0 ? 1 : 0); if (!lanes.has(lk)) lanes.set(lk, []); lanes.get(lk).push(k); });
    cars.forEach((c, k) => {
      const e = edges[c.e], ty = TYPES[c.type];
      let vmax = e.speed * ty[4];
      const left = e.len - c.s;
      if (left < 9) vmax = Math.min(vmax, 3.5 + left * 0.3);                   // slow for the junction
      let gap = 1e9;                                                           // the vehicle ahead in this lane
      for (const j of lanes.get(c.e * 2 + (c.dir > 0 ? 1 : 0))) {
        if (j === k) continue;
        const ds = cars[j].s - c.s;
        if (ds > 0) gap = Math.min(gap, ds - (TYPES[cars[j].type][0] + ty[0]) * 0.5);
      }
      const target = gap > 30 ? vmax : Math.min(vmax, Math.max(0, (gap - 2.5) * 0.7));
      c.v += Math.sign(target - c.v) * Math.min(Math.abs(target - c.v), (target > c.v ? 2 : 6) * dt);
      c.s += c.v * dt;
      if (c.s >= e.len) next(c);
      const ee = edges[c.e];
      at(ee, c.dir > 0 ? c.s : ee.len - c.s, p);
      const dx = p.dx * c.dir, dz = p.dz * c.dir, off = Math.min(ee.hw * 0.5, 1.7);
      const x = p.x - dz * off, z = p.z + dx * off;                            // right of the direction of travel
      const far = Math.abs(x - eye.x) + Math.abs(z - eye.z);
      if (far > 1400 && c.init) return;
      c.init = true;
      const yaw = Math.atan2(-dz, dx);
      let dy = yaw - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      c.yaw = far < 600 ? c.yaw + dy * Math.min(1, dt * 5) : yaw;
      const half = ty[0] * 0.4, hf = terrainHeight(x + dx * half, z + dz * half), hb = terrainHeight(x - dx * half, z - dz * half);
      q.setFromEuler(e3.set(0, c.yaw, Math.atan2(hf - hb, half * 2), 'YXZ'));
      fleets[c.type].set(c.i, m4.compose(v3.set(x, (hf + hb) / 2 + 0.02, z), q, one));
    });
    for (const t2 in fleets) fleets[t2].flush();
  };
}
