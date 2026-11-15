// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
import { chromium } from 'playwright';

const EXE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS = [
  '--no-sandbox',
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-angle=swiftshader',
  '--use-gl=angle',
  '--ignore-gpu-blocklist',
];

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ARGS });
const page = await browser.newPage();
await page.goto('data:text/html,<canvas id=c></canvas>');

const res = await page.evaluate(async () => {
  const out = { gpu: !!navigator.gpu };
  if (!navigator.gpu) return out;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    out.adapter = !!adapter;
    if (adapter) {
      const dev = await adapter.requestDevice();
      out.device = !!dev;
      out.info = adapter.info ? { vendor: adapter.info.vendor, arch: adapter.info.architecture } : 'n/a';
    }
  } catch (e) {
    out.error = String(e);
  }
  return out;
});
console.log('WEBGPU_PROBE=' + JSON.stringify(res));
await browser.close();
