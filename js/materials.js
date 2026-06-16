import * as THREE from 'three';

// Procedural canvas of stacked, eroded stone courses. Used as both colour
// map and bump map so the millions of blocks read as relief without
// modelling each one. Returns a THREE.CanvasTexture.
function blockTexture(base, line, hi, courses = 24, seed = 1) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const rh = S / courses;
  let rng = seed;
  const rand = () => (rng = (rng * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < courses; i++) {
    const y = i * rh;
    const off = (i % 2) * (S / 12);
    const blocks = 12;
    const bw = S / blocks;
    for (let b = -1; b < blocks + 1; b++) {
      const x = b * bw - off;
      // per-block tint (lighter top edge, darker base = weathering)
      const t = rand();
      g.fillStyle = t > 0.5 ? hi : base;
      g.globalAlpha = 0.18 + rand() * 0.22;
      g.fillRect(x + 1, y + 1, bw - 2, rh - 2);
      g.globalAlpha = 1;
      // mortar / shadow gaps
      g.fillStyle = line;
      g.fillRect(x, y, bw, 1.6);              // horizontal joint
      g.fillRect(x, y, 1.6, rh);              // vertical joint
      // erosion speckle
      if (rand() > 0.7) {
        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.fillRect(x + rand() * bw, y + rand() * rh, 3, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sandTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#cdac6e');
  grad.addColorStop(1, '#c2a062');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const v = Math.random();
    g.fillStyle = `rgba(${v > 0.5 ? 170 : 120},${v > 0.5 ? 138 : 96},${v > 0.5 ? 86 : 56},0.22)`;
    g.fillRect(x, y, 1.6, 1.6);
  }
  // faint wind ripples
  g.strokeStyle = 'rgba(120,95,55,0.08)';
  g.lineWidth = 2;
  for (let y = 0; y < S; y += 9) {
    g.beginPath();
    for (let x = 0; x <= S; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(160, 160);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeMaterials() {
  const limestoneTex = blockTexture('#cbb083', '#7c6840', '#e4cf9e', 80, 7);
  limestoneTex.repeat.set(10, 16);
  const limestoneBump = limestoneTex.clone();
  limestoneBump.needsUpdate = true;

  const casingTex = blockTexture('#e7d9b2', '#cabd92', '#f5ecd2', 48, 3);
  casingTex.repeat.set(12, 18);

  const graniteTex = blockTexture('#8a564a', '#5f3a30', '#a06b5c', 16, 11);
  graniteTex.repeat.set(5, 4);

  const sandTex = sandTexture();

  const lime = new THREE.MeshStandardMaterial({
    map: limestoneTex, bumpMap: limestoneTex, bumpScale: 0.6,
    color: 0xffffff, roughness: 0.97, metalness: 0.0, side: THREE.DoubleSide
  });

  return {
    limestone: lime,
    casing: new THREE.MeshStandardMaterial({
      map: casingTex, bumpMap: casingTex, bumpScale: 0.35,
      color: 0xffffff, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide
    }),
    granite: new THREE.MeshStandardMaterial({
      map: graniteTex, bumpMap: graniteTex, bumpScale: 0.4,
      color: 0xffffff, roughness: 0.5, metalness: 0.06, side: THREE.DoubleSide
    }),
    sand: new THREE.MeshStandardMaterial({
      map: sandTex, color: 0xffffff, roughness: 1.0, metalness: 0.0,
      side: THREE.DoubleSide
    }),
    bedrock: new THREE.MeshStandardMaterial({
      color: 0xbfa978, roughness: 0.98, metalness: 0.0
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
