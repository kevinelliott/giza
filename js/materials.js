import * as THREE from 'three';

// =====================================================================
//  Procedural PBR material set. Every surface gets a colour map, a
//  height-derived normal map and a roughness map, all generated on
//  canvases at load (no external assets). Deterministic seeds keep the
//  look stable between runs.
// =====================================================================

const TAU = Math.PI * 2;

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = e => e * e * (3 - 2 * e);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// Tileable value-noise fBm on a w×h grid (wraps in both axes).
function fbm(w, h, cells, octaves, rand, gain = 0.5) {
  const out = new Float32Array(w * h);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const lat = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) lat[i] = rand();
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * n, iy = Math.floor(fy), ty = smooth(fy - iy);
      const y0 = iy % n, y1 = (iy + 1) % n;
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * n, ix = Math.floor(fx), tx = smooth(fx - ix);
        const x0 = ix % n, x1 = (ix + 1) % n;
        const a = lat[y0 * n + x0], b = lat[y0 * n + x1], c = lat[y1 * n + x0], d = lat[y1 * n + x1];
        out[y * w + x] += amp * ((a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty);
      }
    }
    total += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(c, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

// Height field (0..1) → tangent-space normal map (Sobel, wrapping).
function normalFromHeight(hgt, w, h, strength) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), d = img.data;
  const H = (x, y) => hgt[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1;   // canvas y is down → +v is up
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function grayCanvas(vals, w, h) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) { const v = clamp01(vals[i]) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------------------------------------------------------------
//  Masonry: a field of blocks with recessed joints, per-block tint,
//  rounded/chipped edges and weathering. `courses` rows × ~`perCourse`
//  blocks with a running bond. Returns { map, normal, rough }.
// ---------------------------------------------------------------------
function masonry({ w = 1024, h = 1024, courses = 12, perCourse = 10, seed = 1,
  base = '#c9b085', dark = '#9a8058', light = '#e2cfa4', joint = '#6a583a',
  jointPx = 6, edgeRound = 0.08, chips = 0.5, streaks = 0.35, normalStrength = 2.2,
  roughBase = 0.9 }) {
  const rand = mulberry(seed);
  const hgt = new Float32Array(w * h), col = new Float32Array(w * h * 3), rough = new Float32Array(w * h);
  const baseC = hexToRgb(base), darkC = hexToRgb(dark), lightC = hexToRgb(light), jointC = hexToRgb(joint);
  const grain = fbm(w, h, 16, 4, rand);         // fine surface texture
  const macro = fbm(w, h, 3, 3, rand);          // broad tonal drift
  const rh = h / courses;
  // Lay out blocks: per course, random widths that tile the row exactly.
  for (let c = 0; c < courses; c++) {
    const y0 = c * rh, y1 = y0 + rh;
    const n = perCourse + Math.round((rand() - 0.5) * 2);
    let widths = []; let sum = 0;
    for (let i = 0; i < n; i++) { const wv = 0.6 + rand() * 0.8; widths.push(wv); sum += wv; }
    widths = widths.map(v => v / sum * w);
    let x = -rand() * w * 0.5;                    // running bond offset
    const blocks = [];
    for (let i = 0; i < n; i++) { blocks.push([x, x + widths[i]]); x += widths[i]; }
    // wrap last block round to the start
    blocks.push([x, x + widths[0]]);
    for (const [bx0, bx1] of blocks) {
      const t = rand();
      const tint = t > 0.75 ? mixRgb(baseC, lightC, 0.7) : (t < 0.2 ? mixRgb(baseC, darkC, 0.7) : mixRgb(baseC, t > 0.5 ? lightC : darkC, (rand() - 0.5) * 0.5 + 0.25));
      const bh = 0.85 + rand() * 0.15;            // block face height (some sit proud)
      const chipN = rand() < chips ? 1 + (rand() * 3 | 0) : 0;
      const chipList = [];
      for (let k = 0; k < chipN; k++) chipList.push([rand() < 0.5 ? bx0 : bx1, rand() < 0.5 ? y0 : y1, 6 + rand() * 22]);
      const weatherX = rand() * w, weatherW = 10 + rand() * 30, weatherA = rand() * streaks;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) {
        const v = (yy - y0) / rh;
        for (let xx = Math.floor(bx0); xx < Math.ceil(bx1); xx++) {
          const px = ((xx % w) + w) % w, py = ((yy % h) + h) % h, idx = py * w + px;
          const u = (xx - bx0) / (bx1 - bx0);
          // distance to the block edge (in px) → joint + rounding
          const ex = Math.min(xx - bx0, bx1 - xx), ey = Math.min(yy - y0, y1 - yy);
          const e = Math.min(ex, ey);
          let hv, cr;
          if (e < jointPx / 2) { hv = 0.0; cr = jointC; }
          else {
            const r = Math.min(1, (e - jointPx / 2) / (edgeRound * rh + 1));
            hv = bh * smooth(r) * (0.9 + 0.2 * grain[idx]) - 0.15 * macro[idx];
            cr = tint;
          }
          for (const [cx, cy, cr2] of chipList) {
            const dd = Math.hypot(xx - cx, yy - cy);
            if (dd < cr2) { const k = 1 - dd / cr2; hv -= 0.6 * k; cr = mixRgb(cr, darkC, 0.5 * k); }
          }
          // weathering: dark drip streaks and general dirt in the lower half
          let dirt = 0.06 * (1 - v) * grain[idx];
          if (Math.abs(xx - weatherX) < weatherW) dirt += weatherA * (1 - v) * 0.5;
          const g = 0.85 + 0.3 * grain[idx] + 0.1 * (macro[idx] - 0.5);
          col[idx * 3] = cr[0] * g * (1 - dirt); col[idx * 3 + 1] = cr[1] * g * (1 - dirt * 1.1); col[idx * 3 + 2] = cr[2] * g * (1 - dirt * 1.3);
          hgt[idx] = clamp01(hv);
          rough[idx] = roughBase + 0.1 * grain[idx] - (e < jointPx / 2 ? 0 : 0.05 * (1 - u) * 0);
        }
      }
    }
  }
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) { d[i * 4] = col[i * 3]; d[i * 4 + 1] = col[i * 3 + 1]; d[i * 4 + 2] = col[i * 3 + 2]; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { map: c, normal: normalFromHeight(hgt, w, h, normalStrength), rough: grayCanvas(rough, w, h) };
}

// One course of blocks (for the stepped pyramid risers): 1024×128, joints
// only between blocks — the course edges are real geometry.
function courseStrip({ w = 1024, h = 128, seed = 5, base = '#c8ad80', dark = '#94794f', light = '#e3cfa2', joint = '#5e4c31' }) {
  const rand = mulberry(seed);
  const hgt = new Float32Array(w * h), col = new Float32Array(w * h * 3), rough = new Float32Array(w * h);
  const baseC = hexToRgb(base), darkC = hexToRgb(dark), lightC = hexToRgb(light), jointC = hexToRgb(joint);
  const grain = fbm(w, h, 24, 4, rand), macro = fbm(w, h, 4, 2, rand);
  let widths = [], sum = 0; const n = 7;
  for (let i = 0; i < n; i++) { const wv = 0.7 + rand() * 0.7; widths.push(wv); sum += wv; }
  widths = widths.map(v => v / sum * w);
  let x = 0;
  for (let i = 0; i < n; i++) {
    const bx0 = x, bx1 = x + widths[i]; x += widths[i];
    const t = rand();
    const tint = t > 0.7 ? mixRgb(baseC, lightC, 0.6) : (t < 0.25 ? mixRgb(baseC, darkC, 0.6) : mixRgb(baseC, lightC, (rand() - 0.5) * 0.4));
    const proud = 0.8 + rand() * 0.2, topRound = 6 + rand() * 18, botRound = 3 + rand() * 8;
    const chipX = bx0 + rand() * widths[i], chipR = rand() < 0.5 ? 10 + rand() * 28 : 0, chipTop = rand() < 0.7;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = Math.floor(bx0); xx < Math.ceil(bx1); xx++) {
        const px = xx % w, idx = yy * w + px;
        const ex = Math.min(xx - bx0, bx1 - xx);
        let hv, cr;
        if (ex < 3) { hv = 0; cr = jointC; }
        else {
          const rx = Math.min(1, (ex - 3) / 10);
          const rt = Math.min(1, yy / topRound), rb = Math.min(1, (h - 1 - yy) / botRound);   // rounded top/bottom arris
          hv = proud * smooth(rx) * smooth(rt) * smooth(rb) * (0.85 + 0.3 * grain[idx]) - 0.1 * macro[idx];
          cr = tint;
        }
        if (chipR) {
          const dd = Math.hypot(xx - chipX, yy - (chipTop ? 0 : h));
          if (dd < chipR) { const k = 1 - dd / chipR; hv -= 0.7 * k; cr = mixRgb(cr, darkC, 0.6 * k); }
        }
        const v = yy / h;
        const dirt = 0.05 * grain[idx] + 0.08 * v * v;        // dust collects on the lower part
        const g = 0.86 + 0.28 * grain[idx] + 0.12 * (macro[idx] - 0.5);
        col[idx * 3] = cr[0] * g * (1 - dirt); col[idx * 3 + 1] = cr[1] * g * (1 - dirt * 1.1); col[idx * 3 + 2] = cr[2] * g * (1 - dirt * 1.3);
        hgt[idx] = clamp01(hv);
        rough[idx] = 0.9 + 0.1 * grain[idx];
      }
    }
  }
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) { d[i * 4] = col[i * 3]; d[i * 4 + 1] = col[i * 3 + 1]; d[i * 4 + 2] = col[i * 3 + 2]; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { map: c, normal: normalFromHeight(hgt, w, h, 2.6), rough: grayCanvas(rough, w, h) };
}

// Red Aswan granite: warm reddish ground with pink/grey/black flecks.
function granite({ w = 512, h = 512, seed = 9 }) {
  const rand = mulberry(seed);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#8b574b'); grd.addColorStop(1, '#78473e');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const cols = ['#c98f7a', '#9c6253', '#6e4338', '#3a2a24', '#b0a39a', '#caa890', '#2a1f1b'];
  for (let i = 0; i < 30000; i++) {
    g.fillStyle = cols[(rand() * cols.length) | 0];
    g.globalAlpha = 0.25 + rand() * 0.45;
    const x = rand() * w, y = rand() * h, r = 1 + rand() * 2.8;
    g.fillRect(x, y, r, r);
  }
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(30,20,16,0.55)'; g.lineWidth = 3;
  for (let y = 0; y < h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const n = fbm(w, h, 32, 3, rand);
  const hgt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) hgt[i] = 0.5 + 0.5 * n[i];
  for (let y = 0; y < h; y += h / 6) for (let yy = y; yy < y + 3; yy++) for (let x = 0; x < w; x++) hgt[(yy % h) * w + x] = 0;
  const rough = new Float32Array(w * h).fill(0.45);
  for (let i = 0; i < w * h; i++) rough[i] = 0.4 + 0.25 * n[i];
  return { map: c, normal: normalFromHeight(hgt, w, h, 1.2), rough: grayCanvas(rough, w, h) };
}

// Desert sand: wind ripples aligned to the prevailing wind, grain, and
// broad tonal drift. Seamless.
function sand({ w = 512, h = 512, seed = 21, tint = [200, 170, 118], ripples = true }) {
  const rand = mulberry(seed);
  const tone = fbm(w, h, 4, 4, rand), fine = fbm(w, h, 64, 2, rand), warp = fbm(w, h, 6, 2, rand);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), d = img.data;
  const hgt = new Float32Array(w * h), rough = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, u = x / w, v = y / h;
      // ripples: sinusoidal crests, warped by low-frequency noise, sharper on the lee side
      let r = 0;
      if (ripples) {
        const ph = TAU * (u * 26 + v * 9 + 0.5 * (warp[i] - 0.5));
        const s = Math.sin(ph);
        r = (s > 0 ? Math.pow(s, 0.7) : s * 0.6);
      }
      const grain = (rand() - 0.5) * 0.18;
      const t = clamp01(0.5 + 0.55 * (tone[i] - 0.5) + 0.12 * r + grain);
      d[i * 4] = tint[0] * (0.82 + t * 0.34); d[i * 4 + 1] = tint[1] * (0.82 + t * 0.34); d[i * 4 + 2] = tint[2] * (0.82 + t * 0.36); d[i * 4 + 3] = 255;
      hgt[i] = clamp01(0.5 + 0.25 * r + 0.25 * (fine[i] - 0.5) + 0.2 * (tone[i] - 0.5));
      rough[i] = 0.86 + 0.14 * fine[i];
    }
  }
  g.putImageData(img, 0, 0);
  return { map: c, normal: normalFromHeight(hgt, w, h, 1.6), rough: grayCanvas(rough, w, h) };
}

// Fragment-shader patch for the ground: blends two tiling scales so the
// repeat never shows, and adds broad tonal patches + darker gravel areas
// driven by world position.
export function sandShaderPatch(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      varying vec3 vWp;
      float gzHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gzNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(gzHash(i), gzHash(i + vec2(1, 0)), f.x), mix(gzHash(i + vec2(0, 1)), gzHash(i + vec2(1, 1)), f.x), f.y);
      }`)
    .replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 texA = texture2D(map, vMapUv);
        vec4 texB = texture2D(map, vMapUv * 0.171 + vec2(0.37, 0.61));
        float mixK = smoothstep(0.3, 0.7, gzNoise(vWp.xz * 0.045));
        vec4 sampledDiffuseColor = mix(texA, texB, mixK);
        float tonal = gzNoise(vWp.xz * 0.008 + 11.0);
        float gravel = smoothstep(0.58, 0.8, gzNoise(vWp.xz * 0.013 + 3.0) * 0.6 + gzNoise(vWp.xz * 0.07) * 0.4);
        sampledDiffuseColor.rgb *= mix(0.86, 1.10, tonal);
        sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * vec3(0.72, 0.68, 0.62), gravel * 0.7);
        diffuseColor *= sampledDiffuseColor;
      #endif`)
    .replace('#include <normal_fragment_maps>', `
      #ifdef USE_NORMALMAP_TANGENTSPACE
        vec3 mapN = mix(texture2D(normalMap, vNormalMapUv), texture2D(normalMap, vNormalMapUv * 0.171 + vec2(0.37, 0.61)), mixK).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
        normal = normalize(tbn * mapN);
      #else
        #include <normal_fragment_maps>
      #endif`);
}

// World-space planar mapping picked per dominant normal axis, so blocks are
// the same real size on every wall/floor no matter how the mesh is UV'd.
export function triplanarPatch(scale) {
  // Fragment-only: world position/normal are rebuilt from the view-space
  // varyings three already provides, so no extra varyings are needed.
  return shader => {
    const [head, tail] = shader.fragmentShader.split('void main() {');
    shader.fragmentShader = head + 'void main() {\n' + `
        vec3 tpP = cameraPosition + ((-vViewPosition) * mat3(viewMatrix));
        vec3 tpA = abs(normalize(vNormal) * mat3(viewMatrix));
        int tpAxis = (tpA.y > 0.6) ? 1 : ((tpA.x > tpA.z) ? 0 : 2);
        vec2 tpUv = (tpAxis == 1) ? tpP.xz : ((tpAxis == 0) ? tpP.zy : tpP.xy);
        tpUv *= ${(1 / scale).toFixed(5)};\n`
      + tail.replace(/vMapUv|vNormalMapUv|vRoughnessMapUv/g, 'tpUv')
        // Analytic tangent frame for the planar projection (the derivative-based
        // frame is unreliable for world-space UVs on large merged meshes).
        .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 tpMapN = texture2D(normalMap, tpUv).xyz * 2.0 - 1.0;
          tpMapN.xy *= normalScale;
          vec3 tpWN = normalize(normal * mat3(viewMatrix));
          vec3 tpT = (tpAxis == 1) ? vec3(1.0, 0.0, 0.0) : ((tpAxis == 0) ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0));
          vec3 tpB = (tpAxis == 1) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
          if (dot(cross(tpT, tpB), tpWN) < 0.0) tpT = -tpT;
          vec3 tpPert = normalize(tpT * tpMapN.x + tpB * tpMapN.y + tpWN * tpMapN.z);
          normal = normalize(mat3(viewMatrix) * tpPert);
        #else
          #include <normal_fragment_maps>
        #endif`);
  };
}

function std(t, opts) {
  const m = new THREE.MeshStandardMaterial(Object.assign({
    map: t.map, normalMap: t.normal, roughnessMap: t.rough,
    color: 0xffffff, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.2
  }, opts));
  return m;
}

export function makeMaterials() {
  const tex = (gen, repeat, normalRepeat) => {
    const r = gen;
    const map = toTexture(r.map, { repeat });
    const normal = toTexture(r.normal, { srgb: false, repeat });
    const rough = toTexture(r.rough, { srgb: false, repeat });
    return { map, normal, rough };
  };

  // Weathered core masonry (Sphinx body, small structures) — coursed blocks.
  const limestone = tex(masonry({ courses: 10, perCourse: 9, seed: 7, base: '#c0a473', dark: '#876c45', light: '#dbc48e', edgeRound: 0.05, normalStrength: 1.5 }), [1, 1]);
  // One course of core blocks for the stepped pyramids (u repeats per block).
  const course = tex(courseStrip({ seed: 5, base: '#bda06e', dark: '#8a7048', light: '#d6bd8b' }), [1, 1]);
  // Tura limestone casing: pale, tight joints, gently undulating.
  const casing = tex(masonry({ courses: 14, perCourse: 9, seed: 3, base: '#d8cba8', dark: '#b7a67e', light: '#ebe2c8', joint: '#a89a74', jointPx: 3, chips: 0.15, streaks: 0.15, normalStrength: 1.0, roughBase: 0.55 }), [10, 14]);
  const gran = tex(granite({}), [4, 3]);
  const bedrock = tex(masonry({ courses: 6, perCourse: 6, seed: 11, base: '#b9a171', dark: '#84714a', light: '#cbb787', joint: '#74623f', jointPx: 8, edgeRound: 0.06, normalStrength: 1.4 }), [1, 1]);
  const sandT = tex(sand({ w: 1024, h: 1024 }), [180, 180]);
  // Dusty rubble on the course tops (treads) — a greyer, ripple-free sand.
  const rubble = tex(sand({ seed: 33, tint: [178, 158, 122], ripples: false }), [1, 1]);

  const sandMat = std(sandT, { roughness: 1.0, side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 0.22 });
  sandMat.userData.shaderPatch = sandShaderPatch;
  sandMat.customProgramCacheKey = () => 'giza-sand';

  const limestoneMat = std(limestone, { side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.2, 1.2) });
  limestoneMat.userData.shaderPatch = triplanarPatch(11);      // ~1.1 m blocks
  limestoneMat.customProgramCacheKey = () => 'giza-limestone-tp';
  const bedrockMat = std(bedrock, { normalScale: new THREE.Vector2(1.0, 1.0) });
  bedrockMat.userData.shaderPatch = triplanarPatch(8);
  bedrockMat.customProgramCacheKey = () => 'giza-bedrock-tp';

  // Passage/chamber geometry carries no UVs, so the interiors are mapped in
  // world space too (and get no skylight — only your lamp and torches).
  const interiorMat = new THREE.MeshStandardMaterial({
    map: limestone.map, normalMap: limestone.normal, roughnessMap: limestone.rough, normalScale: new THREE.Vector2(0.9, 0.9),
    color: 0xb3a586, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide, envMapIntensity: 0.0
  });
  interiorMat.userData.shaderPatch = triplanarPatch(9);
  interiorMat.customProgramCacheKey = () => 'giza-interior-tp';
  const interiorGraniteMat = new THREE.MeshStandardMaterial({
    map: gran.map, normalMap: gran.normal, roughnessMap: gran.rough, normalScale: new THREE.Vector2(0.5, 0.5),
    color: 0xc4a094, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide, envMapIntensity: 0.0
  });
  interiorGraniteMat.userData.shaderPatch = triplanarPatch(5);
  interiorGraniteMat.customProgramCacheKey = () => 'giza-igranite-tp';

  return {
    limestone: limestoneMat,
    course: std(course, { side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.3, 1.3) }),
    courseTop: std(rubble, { side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.6, 0.6), color: 0xd9c6a0 }),
    casing: std(casing, { roughness: 0.6, side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.35 }),
    granite: std(gran, { roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.4 }),
    sand: sandMat,
    bedrock: bedrockMat,
    interior: interiorMat,
    interiorGranite: interiorGraniteMat,
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.4 })
  };
}
