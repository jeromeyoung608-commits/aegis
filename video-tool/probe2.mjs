// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';
const EXE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const COMMON = ['--no-sandbox', '--disable-gpu-sandbox', '--ignore-gpu-blocklist'];
const COMBOS = {
  A: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
  B: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,UseSkiaRenderer', '--use-vulkan=swiftshader', '--disable-vulkan-surface'],
  C: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-angle=vulkan'],
  D: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-gl=angle', '--use-angle=swiftshader'],
  E: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--in-process-gpu'],
  F: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,UseSkiaRenderer', '--use-vulkan=swiftshader', '--disable-vulkan-surface', '--in-process-gpu'],
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ver = browser.version();
await browser.close();
console.log('CHROME_VERSION=' + ver);

for (const [name, extra] of Object.entries(COMBOS)) {
  let line = name + ': ';
  try {
    const b = await chromium.launch({ executablePath: EXE, headless: true, args: [...COMMON, ...extra] });
    const p = await b.newPage();
    await p.goto('data:text/html,<canvas></canvas>');
    const r = await p.evaluate(async () => {
      if (!navigator.gpu) return { gpu: false };
      try { const a = await navigator.gpu.requestAdapter(); return { gpu: true, adapter: !!a }; }
      catch (e) { return { gpu: true, err: String(e) }; }
    });
    line += JSON.stringify(r);
    await b.close();
  } catch (e) {
    line += 'LAUNCH_ERR ' + String(e).slice(0, 120);
  }
  console.log(line);
}
