// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// video-tool/verify-webgl2.mjs — B5 regression: force the WebGL2 fallback path.
//
// We pass ?gpu=webgl2 in the URL, which pickGpu() honors as an explicit override
// and calls initWebGL2() directly — skipping the flaky headless requestAdapter
// wait entirely. (Deleting navigator.gpu is NOT a reliable override: it is a
// read-only prototype getter, so the delete silently fails and the test only
// fell back by luck when headless had no adapter.) We then assert the topology
// module: (1) selected the webgl2 backend, (2) did NOT show the static fallback,
// (3) ran frames (load-time picking self-test PASSED), and (4) produced no fatal
// console errors. A baseline screenshot is saved.
import { chromium } from 'playwright';
import assert from 'node:assert';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8099';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const logs = [];
page.on('console', (m) => logs.push(m.text()));

// Force the WebGL2 pipeline deterministically via the ?gpu= override.
await page.goto(BASE + '/modules/webgpu-topology/index.html?gpu=webgl2', { waitUntil: 'load' });

// Backend selection happens in boot(); wait for it (15s: generous, but the
// override path resolves in well under 1s — this only has to beat the worst
// observed boot latency, not the old unbounded adapter wait).
await page.waitForFunction(() => window.__topoBackend !== undefined, { timeout: 15000 });
const backend = await page.evaluate(() => window.__topoBackend);
assert.strictEqual(backend, 'webgl2', `expected WebGL2 fallback, got "${backend}"`);

// WebGL2 should have a real drawing surface.
const buf = await page.evaluate(() => {
  const c = document.getElementById('gpu');
  return c ? { w: c.width, h: c.height } : null;
});
assert.ok(buf && buf.w > 0 && buf.h > 0, `WebGL2 canvas should have size (got ${JSON.stringify(buf)})`);

// Static fallback must NOT be shown for a working WebGL2 device.
await page.waitForTimeout(2000);
const errShown = await page.evaluate(() => {
  const e = document.getElementById('error');
  return e ? e.style.display : 'none';
});
const errBoxText = await page.evaluate(() => {
  const e = document.getElementById('error');
  return e ? e.textContent : '';
});
console.log('[WEBGL2] backend=' + backend + ' errShown=' + errShown);
console.log('[WEBGL2] errorBox=' + JSON.stringify(errBoxText));
console.log('[WEBGL2] consoleErrors=' + JSON.stringify(errors.slice(0, 6)));
assert.notStrictEqual(errShown, 'block', 'static fallback must NOT appear when WebGL2 works');

// The load-time picking self-test proves frames were rendered and the CPU pick
// matches the GPU projection — strong evidence the WebGL2 pipeline actually drew.
const pickLog = logs.find((l) => /SELF-TEST picking/.test(l));
assert.ok(pickLog, 'topology load-time picking self-test should run');
assert.ok(/PASS/.test(pickLog || ''), `self-test should PASS, saw: ${pickLog}`);

// Only benign noise (WebGPU/SwiftShader absence, favicon) is tolerated.
const fatal = errors.filter((e) =>
  !/WebGPU|GPU|swiftshader|deprecat|favicon|404|Failed to load resource/i.test(e));
assert.strictEqual(fatal.length, 0, `no fatal console errors (${fatal.slice(0, 3).join(' | ')})`);

// N-06: the baseline screenshot was non-fatal noise — in an offline headless
// environment the page's @font-face URLs never resolve, so the snap hit its 5s
// timeout and printed a warning on every run (a false "yellow light"). It is not
// a pass criterion, so it is removed. Capture a baseline image out-of-band if needed.

console.log('[WEBGL2] PASS — backend=webgl2, canvas=' + JSON.stringify(buf));
console.log('[WEBGL2] self-test: ' + pickLog);
await browser.close();
process.exit(0);
