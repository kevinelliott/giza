import * as THREE from 'three';

// Procedural canvas texture of stacked stone courses, used to suggest the
// millions of blocks without modelling each one.
function blockTexture(base, line, courses = 26, seed = 1) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const rh = 256 / courses;
  let rng = seed;
  const rand = () => (rng = (rng * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i <= courses; i++) {
    const y = i * rh;
    g.strokeStyle = line; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    // vertical joints, offset per course
    const off = (i % 2) * (256 / 8);
    for (let x = -off; x < 256; x += 256 / 8) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke();
    }
    // subtle per-block shading
    for (let x = -off; x < 256; x += 256 / 8) {
      g.fillStyle = `rgba(0,0,0,${0.04 + rand() * 0.06})`;
      g.fillRect(x + 1, y + 1, 256 / 8 - 2, rh - 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function sandTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a86b'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const v = Math.random();
    g.fillStyle = `rgba(${v > 0.5 ? 160 : 120},${v > 0.5 ? 130 : 95},${v > 0.5 ? 80 : 55},0.25)`;
    g.fillRect(x, y, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(140, 140);
  tex.anisotropy = 8;
  return tex;
}

export function makeMaterials() {
  const limestoneTex = blockTexture('#cdb286', '#9c8559', 60, 7);
  limestoneTex.repeat.set(8, 12);

  const casingTex = blockTexture('#e9dcb8', '#cdbf95', 40, 3);
  casingTex.repeat.set(10, 14);

  const graniteTex = blockTexture('#8a5a4e', '#6e4338', 12, 11);
  graniteTex.repeat.set(4, 3);

  return {
    // Weathered core masonry (exposed step pyramid look). Double-sided so
    // the procedurally-wound triangular faces never get back-face culled.
    limestone: new THREE.MeshStandardMaterial({
      map: limestoneTex, color: 0xffffff, roughness: 0.95, metalness: 0.0,
      side: THREE.DoubleSide
    }),
    // Smooth Tura limestone casing
    casing: new THREE.MeshStandardMaterial({
      map: casingTex, color: 0xffffff, roughness: 0.6, metalness: 0.0,
      side: THREE.DoubleSide
    }),
    // Red Aswan granite (Menkaure base, King's Chamber, sarcophagi)
    granite: new THREE.MeshStandardMaterial({
      map: graniteTex, color: 0xffffff, roughness: 0.5, metalness: 0.05,
      side: THREE.DoubleSide
    }),
    // Desert floor
    sand: new THREE.MeshStandardMaterial({
      map: sandTexture(), color: 0xffffff, roughness: 1.0, metalness: 0.0,
      side: THREE.DoubleSide
    }),
    // Bedrock / Sphinx / temple stone
    bedrock: new THREE.MeshStandardMaterial({
      color: 0xb8a273, roughness: 0.98, metalness: 0.0
    }),
    // Interior passage stone (darker, smoother)
    interior: new THREE.MeshStandardMaterial({
      color: 0x8c8068, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide
    }),
    interiorGranite: new THREE.MeshStandardMaterial({
      color: 0x7a4f44, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x6b4a2b, roughness: 0.85, metalness: 0.0
    })
  };
}
