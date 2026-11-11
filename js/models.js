// =====================================================================
//  Blender-built models (tools/blender/*.py -> assets/models/*.glb).
//  The GLBs carry geometry, material names, lighting baked into vertex
//  colours, and named empties ("insc_*" inscription panels, "poi_*"
//  points of interest, "spawn"). Materials are swapped for the game's own
//  so stone looks the same everywhere; baked light is added as emission.
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { triplanarPatch } from './materials.js';
import { inscriptionTexture, loadGlyphFont, INSCRIPTIONS } from './inscriptions.js';
import { SERAPEUM } from './data.js';

export async function loadModels(onStatus) {
  const out = {};
  if (typeof window === 'undefined') return out;
  onStatus && onStatus('Unpacking the Blender models…');
  const loader = new GLTFLoader();
  const [gltf] = await Promise.all([
    loader.loadAsync('assets/models/serapeum.glb').catch(e => { console.warn('serapeum model missing', e); return null; }),
    loadGlyphFont()
  ]);
  if (gltf) out.serapeum = gltf.scene;
  return out;
}

// Stone with the Blender-baked lighting: vertex colour is light, not paint.
// `plain` = natural hewn rock (no block pattern): colour from 3D strata noise.
function bakedStone(base, { color, roughness, scale = 6, courses = 0, gain = 1.0, key, plain = false }) {
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
        float bkT = bkN(bkP * 1.9) * 0.6 + bkN(bkP * 6.5) * 0.4;                  // tool-pitted surface
        diffuseColor.rgb *= (0.78 + 0.22 * bkS) * (0.82 + 0.3 * bkT);`);
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

export function buildSerapeum(model, mats, group, collidables, landmarks) {
  const o = SERAPEUM.origin;
  const root = new THREE.Group();
  root.position.set(o.x, o.y, o.z);
  const M = {
    rock: bakedStone(null, { color: 0xb9aa8c, roughness: 0.97, gain: 0.42, key: 'rock', plain: true }),
    masonry: bakedStone(mats.interior, { color: 0xb9bcc4, roughness: 0.93, scale: 7, courses: 10, gain: 0.34, key: 'masonry' }),
    granite_black: bakedStone(null, { color: 0x2c2c30, roughness: 0.22, gain: 0.6, key: 'gblack', plain: true }),
    granite_red: bakedStone(null, { color: 0xb58d82, roughness: 0.42, gain: 0.5, key: 'gred', plain: true }),
    granite_grey: bakedStone(null, { color: 0x6d6d70, roughness: 0.34, gain: 0.55, key: 'ggrey', plain: true }),
    wood: bakedStone(null, { color: 0x6e4a2a, roughness: 0.8, gain: 0.45, key: 'wood', plain: true }),
    fixture: new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xfff0d0, emissiveIntensity: 2.2 })
  };
  const panels = [], pois = {};
  model.updateMatrixWorld(true);
  model.traverse(n => {
    if (n.isMesh) {
      n.material = (n.name.startsWith('steps') ? M.rock : M[n.material.name]) || M.rock;      // stairs: plain dressed stone
      n.castShadow = false; n.receiveShadow = true;
      if (n.material !== M.fixture) { n.userData.collidable = true; }
    } else if (n.name.startsWith('insc_')) panels.push(n);
    else if (n.name.startsWith('poi_') || n.name === 'spawn') pois[n.name] = n.getWorldPosition(new THREE.Vector3());
  });
  root.add(model);
  // inscription panels: a unit quad in the empty's local XZ plane (Blender XY)
  for (const e of panels) {
    const key = e.name.slice(5).replace(/\.\d+$/, '');
    if (!INSCRIPTIONS[key]) continue;
    const tex = inscriptionTexture(key, e.scale.x, e.scale.z);
    if (!tex) continue;
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.22, transparent: true,
        roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    quad.userData.inscription = key;
    e.add(quad);
  }
  group.add(root); root.updateMatrixWorld(true);
  root.traverse(n => { if (n.isMesh && n.userData.collidable) collidables.push(n); });
  const P = k => { const p = pois[k]; return p ? { x: p.x + o.x, y: p.y + o.y, z: p.z + o.z } : null; };
  for (const [k, name, blurb, radius] of SERAPEUM.pois) {
    const pos = P('poi_' + k);
    if (pos) landmarks.push({ name, blurb, radius, pos });
  }
  const sp = P('spawn');
  if (sp) Object.assign(SERAPEUM.spawn, sp);
  return root;
}
