// Rendering fotogramma per fotogramma della pagina del motore: node render.js <url base> <out.mp4> <fps> <workers> <w> <h>
// Usa il Playwright gia' installato (require('playwright')); ogni worker ha il suo browser e scrive un pezzo, poi si uniscono.
const { chromium } = require('playwright'); const { spawn, execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
(async () => {
  const [base, out, fpsS, wkS, wS, hS] = process.argv.slice(2), FPS = +fpsS, WK = +wkS, w = +wS, h = +hS, dir = path.dirname(out), t0 = Date.now();
  const open = async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    p.on('pageerror', e => { console.error('errore nella pagina:', e.message); process.exit(1); });
    await p.goto(`${base}/index.html?w=${w}&h=${h}&t=0.01`); await p.waitForFunction(() => window.READY === true, null, { timeout: 180000 }); return { b, p }; };
  const pr = await open(); const DUR = await pr.p.evaluate(() => window.DUR); await pr.b.close();
  const TOTAL = Math.round(DUR * FPS), per = Math.ceil(TOTAL / WK);
  await Promise.all([...Array(WK)].map(async (_, k) => {
    const a = k * per, z = Math.min(TOTAL, a + per); if (a >= z) return;
    const { b, p } = await open();
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', path.join(dir, `seg_${k}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise(r => ff.on('close', r));
    for (let f = a; f < z; f++) { await p.evaluate(t => window.render(t), f / FPS); const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - a) % 150 === 0) console.log(`parte ${k}: ${f - a}/${z - a} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
    ff.stdin.end(); await closed; await b.close();
  }));
  fs.writeFileSync(path.join(dir, 'segs.txt'), [...Array(WK)].map((_, k) => `file 'seg_${k}.mp4'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'segs.txt'), '-c', 'copy', out]);
  for (let k = 0; k < WK; k++) try { fs.unlinkSync(path.join(dir, `seg_${k}.mp4`)); } catch {}
  console.log(`fatto: ${TOTAL} fotogrammi in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})();
