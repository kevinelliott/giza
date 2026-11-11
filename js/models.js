// =====================================================================
//  Blender-built models (tools/blender/*.py -> assets/models/*.glb).
//  The GLBs carry geometry, material names, lighting baked into vertex
//  colours, and named empties: "insc_*" inscription panels, "tex_*" photo /
//  drawing panels, "poi_*" points of interest, "tp_*" / "spawn" teleports.
//  Materials are swapped for the game's own; baked light is added as
//  emission so the rooms are lit the way they are today.
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { triplanarPatch } from './materials.js';
import { inscriptionTexture, loadGlyphFont, INSCRIPTIONS } from './inscriptions.js';

export const MODEL_FILES = { serapeum: 'serapeum.glb', khufuUpper: 'khufu_upper.glb', khufuLower: 'khufu_lower.glb', meresankh: 'meresankh.glb', menkaure: 'menkaure.glb' };
// Photographs / drawings used directly as wall textures (see research/ for credits).
export const PANEL_TEXTURES = {
  dream_stele: 'assets/textures/dream_stele.png',
  mer_pillar: 'assets/textures/mer_pillar.jpg',
  mer_north: 'assets/textures/mer_north.jpg',
  mer_east: 'assets/textures/mer_east.jpg',
  mer_west: 'assets/textures/mer_west.jpg',
  mer_kawab: 'assets/textures/mer_kawab.jpg',
  mer_jamb: 'assets/textures/mer_jamb.jpg',
  mer_list: 'assets/textures/mer_list.jpg',
  mer_wpillar: 'assets/textures/mer_wpillar.jpg'
};

export async function loadModels(onStatus) {
  const out = { textures: {} };
  if (typeof window === 'undefined') return out;
  onStatus && onStatus('Unpacking the Blender models…');
  const loader = new GLTFLoader(), tl = new THREE.TextureLoader();
  const jobs = Object.entries(MODEL_FILES).map(([k, f]) =>
    loader.loadAsync('assets/models/' + f).then(g => { out[k] = g.scene; }).catch(() => console.warn('model missing:', f)));
  for (const [k, url] of Object.entries(PANEL_TEXTURES))
    jobs.push(tl.loadAsync(url).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; out.textures[k] = t; }).catch(() => {}));
  jobs.push(loadGlyphFont());
  await Promise.all(jobs);
  return out;
}

// Stone with the Blender-baked lighting: vertex colour is light, not paint.
// `plain` = no tiling texture: colour from 3D strata noise, with optional
// masonry joints drawn every jointH (courses) x jointW (staggered blocks).
function bakedStone(base, { color, roughness, scale = 6, courses = 0, gain = 1.0, key, plain = false, jointH = 0, jointW = 0, strata = 1 }) {
  const m = new THREE.MeshStandardMaterial({
    map: plain ? null : base.map, normalMap: plain ? null : base.normalMap, roughnessMap: (!plain && courses) ? base.roughnessMap : null,
    normalScale: new THREE.Vector2(0.8, 0.8), color, roughness, metalness: 0, envMapIntensity: 0,
    vertexColors: true, side: THREE.DoubleSide
  });
  const tp = plain ? null : triplanarPatch(scale, courses);
  m.userData.shaderPatch = shader => {
    if (tp) tp(shader);
    let fs = shader.fragmentShader;
    if (plain) {
      fs = fs.replace('#include <common>', `#include <common>
        float bkH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float bkN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(bkH(i), bkH(i + vec3(1,0,0)), f.x), mix(bkH(i + vec3(0,1,0)), bkH(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(bkH(i + vec3(0,0,1)), bkH(i + vec3(1,0,1)), f.x), mix(bkH(i + vec3(0,1,1)), bkH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace('#include <map_fragment>', `
        vec3 bkP = cameraPosition + ((-vViewPosition) * mat3(viewMatrix));
        float bkS = bkN(vec3(bkP.x * 0.25, bkP.y * 3.2, bkP.z * 0.25));          // bedding planes
        float bkT = bkN(bkP * 1.9) * 0.6 + bkN(bkP * 6.5) * 0.4;                  // tool-pitted / crystalline surface
        diffuseColor.rgb *= (1.0 - ${(0.22 * strata).toFixed(3)} * (1.0 - bkS)) * (0.82 + 0.3 * bkT);
        ${jointH ? `
        vec3 bkNw = inverseTransformDirection(normalize(vNormal), viewMatrix);
        if (abs(bkNw.y) < 0.7) {
          float row = floor(bkP.y / ${jointH.toFixed(3)});
          float u = (abs(bkNw.x) > abs(bkNw.z) ? bkP.z : bkP.x) + bkH(vec3(row, 3.0, 1.0)) * ${jointW.toFixed(3)};
          float jh = smoothstep(0.012, 0.0, abs(fract(bkP.y / ${jointH.toFixed(3)} + 0.5) - 0.5) * ${jointH.toFixed(3)});
          float jv = smoothstep(0.012, 0.0, abs(fract(u / ${jointW.toFixed(3)} + 0.5) - 0.5) * ${jointW.toFixed(3)});
          diffuseColor.rgb *= 1.0 - 0.55 * max(jh, jv);
          diffuseColor.rgb *= 0.93 + 0.14 * bkH(vec3(floor(u / ${jointW.toFixed(3)}), row, 7.0));     // block-to-block tone
        }` : ''}`);
    }
    shader.fragmentShader = fs
      .replace('#include <color_fragment>', '')                       // don't tint albedo by the bake
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        #ifdef USE_COLOR
          totalEmissiveRadiance += diffuseColor.rgb * (vColor.rgb * ${gain.toFixed(2)} + 0.012);
        #endif`);
  };
  m.customProgramCacheKey = () => 'giza-baked-' + key;
  return m;
}

// World-space boxes around the baked-light models: inside them the rooms are
// already lit, so the game dims the player's headlamp.
export const BAKED_ZONES = [];

// One shared library of materials, keyed by the Blender material names.
let LIB = null;
function library(mats) {
  if (LIB) return LIB;
  LIB = {
    rock: bakedStone(null, { color: 0xb9aa8c, roughness: 0.97, gain: 0.42, key: 'rock', plain: true }),
    masonry: bakedStone(null, { color: 0xa39a86, roughness: 0.95, gain: 0.42, key: 'masonry', plain: true, jointH: 0.52, jointW: 1.05, strata: 0.6 }),
    limestone: bakedStone(null, { color: 0x8f8470, roughness: 0.9, gain: 0.5, key: 'limestone', plain: true, jointH: 0.86, jointW: 1.6, strata: 0.4 }),
    granite: bakedStone(null, { color: 0x8a6458, roughness: 0.55, gain: 0.85, key: 'granite', plain: true, jointH: 1.17, jointW: 2.2, strata: 0.3 }),
    granite_dark: bakedStone(null, { color: 0x4a3830, roughness: 0.5, gain: 0.9, key: 'gdark', plain: true, strata: 0.2 }),
    granite_black: bakedStone(null, { color: 0x2c2c30, roughness: 0.22, gain: 0.6, key: 'gblack', plain: true }),
    granite_red: bakedStone(null, { color: 0xb58d82, roughness: 0.42, gain: 0.5, key: 'gred', plain: true }),
    granite_grey: bakedStone(null, { color: 0x6d6d70, roughness: 0.34, gain: 0.55, key: 'ggrey', plain: true }),
    plaster: bakedStone(null, { color: 0x8c8068, roughness: 0.97, gain: 0.5, key: 'plaster', plain: true, strata: 0.6 }),
    ceiling_red: bakedStone(null, { color: 0xa8685e, roughness: 0.95, gain: 0.5, key: 'ceilred', plain: true, strata: 0.6 }),   // painted to imitate granite
    statue: bakedStone(null, { color: 0x8a8070, roughness: 0.97, gain: 0.55, key: 'statue', plain: true, strata: 0.5 }),
    wood: bakedStone(null, { color: 0x6e4a2a, roughness: 0.8, gain: 0.45, key: 'wood', plain: true }),
    dark: new THREE.MeshBasicMaterial({ color: 0x0b0907 }),
    fixture: new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xfff0d0, emissiveIntensity: 2.2 })
  };
  return LIB;
}

const isDeco = n => { for (let o = n; o; o = o.parent) if (o.name && o.name.startsWith('deco')) return true; return false; };

// Put a model into the world. Returns its anchors (world positions of the
// poi_/tp_/spawn empties) and registers landmarks for `pois`
// ([[key, name, blurb, radius], ...] matched to poi_<key>).
export function placeModel(model, { position, rotationY = 0, mats, group, collidables, landmarks, pois = [], textures = {} }) {
  const M = library(mats);
  const root = new THREE.Group();
  root.position.set(position.x, position.y, position.z); root.rotation.y = rotationY;
  const panels = [], anchorNodes = [];
  model.traverse(n => {
    if (n.isMesh) {
      const name = n.material.name;
      n.material = ((n.name.startsWith('steps') || n.parent.name.startsWith('steps')) ? M.rock : M[name]) || M.rock;
      n.castShadow = false; n.receiveShadow = true;
      if (name !== 'fixture' && name !== 'dark' && !isDeco(n)) n.userData.collidable = true;
    } else if (n.name.startsWith('insc_') || n.name.startsWith('tex_')) panels.push(n);
    else if (n.name.startsWith('poi_') || n.name.startsWith('tp_') || n.name === 'spawn') anchorNodes.push(n);
  });
  root.add(model);
  for (const e of panels) {
    const photo = e.name.startsWith('tex_');
    const key = e.name.slice(photo ? 4 : 5).replace(/\.\d+$/, '');
    const tex = photo ? textures[key] : (INSCRIPTIONS[key] ? inscriptionTexture(key, e.scale.x, e.scale.z) : null);
    if (!tex) continue;
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: photo ? 0.5 : 0.22, transparent: true,
        roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    quad.userData.inscription = key;
    e.add(quad);
  }
  group.add(root); root.updateMatrixWorld(true);
  root.traverse(n => { if (n.isMesh && n.userData.collidable) collidables.push(n); });
  BAKED_ZONES.push(new THREE.Box3().setFromObject(root).expandByScalar(0.5));
  const anchors = {};
  for (const n of anchorNodes) anchors[n.name] = n.getWorldPosition(new THREE.Vector3());
  for (const [k, name, blurb, radius] of pois) {
    const p = anchors['poi_' + k];
    if (p) landmarks.push({ name, blurb, radius, pos: { x: p.x, y: p.y, z: p.z } });
  }
  return { root, anchors };
}
