// Render every inscription panel found in the Blender models to a PNG, using
// the web build's own renderer (js/inscriptions.js) in headless Chromium, so
// the native build shows exactly the same hieroglyphs.
//   python3 -m http.server 8080 &   node tools/export_inscriptions.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
(async () => {
  const panels = [];
  for (const f of fs.readdirSync(path.join(root, 'assets/models')).filter(f => f.endsWith('.glb'))) {
    const b = fs.readFileSync(path.join(root, 'assets/models', f));
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
    for (const n of j.nodes) if (n.name && n.name.startsWith('insc_')) {
      const s = n.scale || [1, 1, 1];
      panels.push({ key: n.name.slice(5).replace(/\.\d+$/, ''), w: +s[0].toFixed(3), h: +s[2].toFixed(3) });
    }
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/index.local.html', { waitUntil: 'domcontentloaded' });
  const out = await page.evaluate(async (panels) => {
    const I = await import('/js/inscriptions.js');
    await I.loadGlyphFont();
    const res = {};
    for (const p of panels) {
      const id = `${p.key}_${Math.round(p.w * 100)}x${Math.round(p.h * 100)}`;
      if (res[id] || !I.INSCRIPTIONS[p.key]) continue;
      const t = I.inscriptionTexture(p.key, p.w, p.h);
      res[id] = t.image.toDataURL('image/png');
    }
    return res;
  }, panels);
  const dir = path.join(root, 'godot/textures/insc');
  fs.mkdirSync(dir, { recursive: true });
  for (const [id, url] of Object.entries(out)) fs.writeFileSync(path.join(dir, id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(root, 'godot/data/inscriptions.json'), JSON.stringify(Object.keys(out).sort(), null, 1));
  console.log('wrote', Object.keys(out).length, 'inscription textures');
  await browser.close();
})();
