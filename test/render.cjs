const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    acceptInsecureCerts: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-webgl', '--ignore-gpu-blocklist', '--ignore-certificate-errors',
      '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errors.push('reqfail: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));

  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait until the loader is gone (world built) or timeout.
  await page.waitForFunction(
    () => { const l = document.getElementById('loading'); return l && l.style.display === 'none'; },
    { timeout: 30000 }
  ).catch(() => errors.push('world did not finish loading'));

  // Hide the overlay and lift the camera to an overview of all three
  // pyramids, then let a few frames render.
  await page.evaluate(() => {
    const o = document.getElementById('overlay'); if (o) o.style.display = 'none';
    const g = window.__giza;
    if (g) {
      g.player.fly = true;
      g.player.teleport({ x: 430, y: 210, z: 470 });
      g.camera.lookAt(-260, 10, 260);
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test/preview.png' });

  // A second shot: ground level near the Great Pyramid's north face.
  await page.evaluate(() => {
    const g = window.__giza;
    if (g) {
      g.player.fly = false;
      g.player.teleport({ x: 7, y: 4, z: -200 });
      g.camera.lookAt(7, 80, 0);
    }
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'test/preview_ground.png' });

  // Report some runtime facts pulled from the page.
  const info = await page.evaluate(() => ({
    canvas: !!document.querySelector('canvas#game'),
    status: (document.getElementById('status') || {}).textContent,
    tp: document.querySelectorAll('#menuList .tp').length
  }));

  console.log('canvas present:', info.canvas, '| fast-travel entries:', info.tp);
  console.log('errors:', errors.length);
  errors.slice(0, 20).forEach(e => console.log('  -', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
