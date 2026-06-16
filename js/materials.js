import * as THREE from 'three';

// ---------------------------------------------------------------------
//  Procedural stone-course texture (colour + matching bump). Models the
//  stacked masonry of the pyramids: mortar joints, per-block colour
//  variation, weathering streaks and erosion speckle.
// ---------------------------------------------------------------------
function blockTexture(opts) {
  const {
    base = '#cbb083', dark = '#7c6840', light = '#e4cf9e',
    courses = 12, perCourse = 12, streaks = true, seed = 1
  } = opts;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  let rng = seed;
  const rand = () => (rng = (rng * 9301 + 49297) % 233280) / 233280;

  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const rh = S / courses, bw0 = S / perCourse;
  for (let i = 0; i < courses; i++) {
    const y = i * rh;
    const off = (i % 2) * (bw0 / 2);                 // running-bond offset
    // gentle per-course shade band
    g.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.04})`;
    g.fillRect(0, y, S, rh);
    for (let b = -1; b <= perCourse; b++) {
      const x = b * bw0 - off;
      const t = rand();
      // block face: blend between dark/base/light by random
      g.fillStyle = t > 0.72 ? light : (t < 0.22 ? dark : base);
      g.globalAlpha = 0.30 + rand() * 0.30;
      g.fillRect(x + 1.5, y + 1.5, bw0 - 3, rh - 3);
      g.globalAlpha = 1;
      // occasional dark eroded / missing block
      if (rand() > 0.93) {
        g.fillStyle = 'rgba(40,30,18,0.45)';
        g.fillRect(x + 1.5, y + 1.5, bw0 - 3, rh - 3);
      }
      // chips / speckle
      for (let s = 0; s < 3; s++) {
        g.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`;
        g.fillRect(x + rand() * bw0, y + rand() * rh, 2, 1.5);
      }
    }
    // mortar joints (recessed → dark, used by the bump map too)
    g.strokeStyle = dark; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
    for (let b = -1; b <= perCourse; b++) {
      const x = b * bw0 - off;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke();
    }
  }
  // vertical weathering streaks
  if (streaks) {
    for (let s = 0; s < 26; s++) {
      const x = rand() * S, w = 3 + rand() * 10;
      const grd = g.createLinearGradient(x, 0, x, S);
      grd.addColorStop(0, 'rgba(60,45,25,0)');
      grd.addColorStop(1, `rgba(50,38,20,${0.05 + rand() * 0.10})`);
      g.fillStyle = grd; g.fillRect(x, 0, w, S);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Red Aswan granite: warm reddish ground with pink/grey/black mineral flecks.
function graniteTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, S, S);
  grd.addColorStop(0, '#8a564a'); grd.addColorStop(1, '#7a4a40');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const cols = ['#c98f7a', '#9c6253', '#6e4338', '#3a2a24', '#b0a39a', '#caa890'];
  for (let i = 0; i < 24000; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    g.globalAlpha = 0.25 + Math.random() * 0.4;
    const x = Math.random() * S, y = Math.random() * S, r = 1 + Math.random() * 2.6;
    g.fillRect(x, y, r, r);
  }
  g.globalAlpha = 1;
  // faint horizontal joints (granite ashlar)
  g.strokeStyle = 'rgba(30,20,16,0.5)'; g.lineWidth = 2;
  for (let y = 0; y < S; y += S / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Seamless, line-free desert sand. Built with wrapping sine harmonics (so it
// tiles with no visible grid) plus fine per-pixel grain via ImageData.
function sandTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;
  const TAU = Math.PI * 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      // large-scale tonal variation — integer harmonics wrap seamlessly
      let n = 0.5 * Math.sin(TAU * u) * Math.cos(TAU * v)
            + 0.25 * Math.sin(TAU * (2 * u + 0.3)) * Math.cos(TAU * (3 * v + 0.7))
            + 0.15 * Math.sin(TAU * (4 * u + 1.1)) * Math.cos(TAU * (2 * v + 0.2));
      const grain = (Math.random() - 0.5) * 0.16;
      const t = THREE.MathUtils.clamp(0.5 + 0.42 * n + grain, 0, 1);
      const i = (y * S + x) * 4;
      d[i] = 196 + t * 38;            // R
      d[i + 1] = 166 + t * 34;        // G
      d[i + 2] = 112 + t * 30;        // B
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(70, 70);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeMaterials() {
  // Weathered core masonry (exposed, casing-stripped pyramid) — fine courses.
  const limestoneTex = blockTexture({ base: '#c7ad80', dark: '#6f5c39', light: '#e0cb98', courses: 13, perCourse: 13, seed: 7 });
  limestoneTex.repeat.set(14, 14);

  // Smooth Tura limestone casing — near-white, tight joints.
  const casingTex = blockTexture({ base: '#e9dcbb', dark: '#cdbf93', light: '#f6efd8', courses: 16, perCourse: 10, streaks: false, seed: 3 });
  casingTex.repeat.set(12, 16);

  const graniteTex = graniteTexture();
  graniteTex.repeat.set(4, 3);

  const bedrockTex = blockTexture({ base: '#bda876', dark: '#8a774c', light: '#cdbb8c', courses: 8, perCourse: 8, seed: 11 });
  bedrockTex.repeat.set(3, 3);

  const sandTex = sandTexture();

  return {
    limestone: new THREE.MeshStandardMaterial({
      map: limestoneTex, bumpMap: limestoneTex, bumpScale: 1.1,
      color: 0xffffff, roughness: 0.96, metalness: 0.0, side: THREE.DoubleSide
    }),
    casing: new THREE.MeshStandardMaterial({
      map: casingTex, bumpMap: casingTex, bumpScale: 0.5,
      color: 0xffffff, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide
    }),
    granite: new THREE.MeshStandardMaterial({
      map: graniteTex, bumpMap: graniteTex, bumpScale: 0.35,
      color: 0xffffff, roughness: 0.55, metalness: 0.08, side: THREE.DoubleSide
    }),
    sand: new THREE.MeshStandardMaterial({
      map: sandTex, color: 0xffffff, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide
    }),
    bedrock: new THREE.MeshStandardMaterial({
      map: bedrockTex, bumpMap: bedrockTex, bumpScale: 0.7,
      color: 0xffffff, roughness: 0.97, metalness: 0.0
    }),
    interior: new THREE.MeshStandardMaterial({
      color: 0x9b8e70, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide
    }),
    interiorGranite: new THREE.MeshStandardMaterial({
      color: 0x86564a, roughness: 0.55, metalness: 0.06, side: THREE.DoubleSide
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x6b4a2b, roughness: 0.85, metalness: 0.0
    })
  };
}
