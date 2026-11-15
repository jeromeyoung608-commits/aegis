// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// tests/fps-smoke.mjs — record REAL WebGPU render FPS to JSON (no hardcoded numbers).
//
// Requires a WebGPU-capable Chromium. The Aegis workbench already passes
// `--enable-unsafe-webgpu` when it launches a browser; here we do the same for a
// headless run. This replaces "120 FPS" / "98 FPS" hand-wave claims with a
// measured artifact.
//
//   BASE_URL=http://localhost:8080/modules/webgpu-topology/index.html \
//   CHROME_PATH=/path/to/chrome node tests/fps-smoke.mjs
//
// Output: tests/fps.json  { nodes, seconds, avg, min, max, samples, measuredAt }
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL
  || 'http://127.0.0.1:8080/modules/webgpu-topology/index.html';
const SECONDS = Number(process.env.SECONDS || 8);
const NODES = Number(process.env.NODES || 100000);

function resolveChrome() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  const roots = [
    path.join(process.env.HOME, 'Library/Caches/ms-playwright'),
    path.join(process.env.HOME, '.cache/ms-playwright'),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root)) {
      if (!dir.startsWith('chromium-')) continue;
      for (const sub of ['chrome-mac-arm64', 'chrome-mac']) {
        const p = path.join(root, dir, sub, 'Google Chrome for Testing.app',
          'Contents/MacOS/Google Chrome for Testing');
        if (fs.existsSync(p)) return { executablePath: p };
      }
    }
  }
  return { channel: 'chrome' };
}

const browser = await chromium.launch({
  ...resolveChrome(),
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
});
const page = await browser.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));

await page.goto(BASE_URL, { waitUntil: 'load' });
await page.waitForFunction(
  () => { const el = document.getElementById('hud-fps'); return el && el.textContent.trim() !== ''; },
  null, { timeout: 30000 },
);

const samples = [];
const start = Date.now();
while (Date.now() - start < SECONDS * 1000) {
  const fps = await page.evaluate(() => {
    const el = document.getElementById('hud-fps');
    const n = parseFloat(el?.textContent);
    return Number.isFinite(n) ? n : null;
  });
  if (fps != null) samples.push(fps);
  await page.waitForTimeout(500);
}

await browser.close();

if (samples.length === 0) {
  console.error('No FPS samples collected — WebGPU may be unavailable in this browser.');
  console.error('Console errors:', errs.slice(0, 5));
  process.exit(2);
}

const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
const out = {
  url: BASE_URL,
  nodes: NODES,
  seconds: SECONDS,
  samples,
  avg: Math.round(avg * 10) / 10,
  min: Math.round(Math.min(...samples) * 10) / 10,
  max: Math.round(Math.max(...samples) * 10) / 10,
  measuredAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(import.meta.dirname, 'fps.json'), JSON.stringify(out, null, 2));
console.log(`FPS avg=${out.avg} min=${out.min} max=${out.max} (n=${samples.length}) -> tests/fps.json`);
