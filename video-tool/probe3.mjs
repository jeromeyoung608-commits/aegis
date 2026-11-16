// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';
const EXE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:8080/';
const F = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,UseSkiaRenderer', '--use-vulkan=swiftshader', '--disable-vulkan-surface', '--ignore-gpu-blocklist'];

async function tryLaunch(label, opts) {
  let line = label + ' => ';
  try {
    const b = await chromium.launch(opts);
    const p = await b.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 80)); });
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => {
      if (!navigator.gpu) return { gpu: false };
      try { const a = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' }); return { gpu: true, adapter: !!a }; }
      catch (e) { return { gpu: true, err: String(e).slice(0, 100) }; }
    });
    line += JSON.stringify(r);
    await b.close();
  } catch (e) { line += 'LAUNCH_ERR ' + String(e).slice(0, 140); }
  console.log(line);
}

await tryLaunch('OLD+localhost', { executablePath: EXE, headless: true, args: ['--no-sandbox', ...F] });
await tryLaunch('NEW+localhost', { executablePath: EXE, headless: false, args: ['--headless=new', '--no-sandbox', ...F] });
await tryLaunch('NEW+swiftshader-only', { executablePath: EXE, headless: false, args: ['--headless=new', '--no-sandbox', '--enable-unsafe-webgpu', '--use-angle=swiftshader', '--use-gl=angle'] });
