// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// End-to-end verification for REDAKTOR, structured as a `node --test` regression.
//
// Coverage (the claims the product must hold):
//   1. Intake a real PDF.
//   2. OCR + rule scan find PII detections (>= 1; the bundled sample yields ~10).
//   3. Export a redacted PDF.
//   4. The exported PDF has NO selectable text layer (Cmd+A / copy is impossible) —
//      this is the "redaction cannot be undone by copying" guarantee, verified by
//      feeding the export back through pdf.js and asserting text-item count == 0.
//   5. Redaction boxes render as solid black pixels.
//   6. Zero console errors and ZERO external network requests (offline-proof).
//
// Prereqs (documented; this is a browser-driven test):
//   - `node tests/generate-sample-pii.cjs`  (creates artifacts/sample-pii.pdf)
//   - a static server serving the module root, e.g. `python3 -m http.server 8010`
//   - `npm install playwright-core@1.55.0`  (declared in devDependencies)
// Env: BASE_URL (default http://127.0.0.1:8010/), CHROME_PATH (optional).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { test } = require('node:test');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8010/';
const ARTIFACTS = path.join(__dirname, 'artifacts');

function resolveChrome() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  const candidates = [
    path.join(process.env.HOME, 'Library/Caches/ms-playwright'),
    path.join(process.env.HOME, '.cache/ms-playwright'),
  ];
  for (const root of candidates) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root)) {
      if (!dir.startsWith('chromium-')) continue;
      const base = path.join(root, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
      const alt = path.join(root, dir, 'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
      if (fs.existsSync(base)) return { executablePath: base };
      if (fs.existsSync(alt)) return { executablePath: alt };
    }
  }
  return { channel: 'chrome' };
}

test('REDAKTOR e2e: intake → detect → export → text layer emptied', async () => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const sample = path.join(ARTIFACTS, 'sample-pii.pdf');
  if (!fs.existsSync(sample)) throw new Error(`Missing sample: ${sample} — run generate-sample-pii.cjs first`);

  const browser = await chromium.launch({ ...resolveChrome(), headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1000 } });
  const external = [];

  // Simulated offline: anything not from the local origin is aborted.
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE_URL.replace(/\/$/, '')) || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    external.push(url);
    return route.abort();
  });

  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', sample);
  await page.waitForFunction(() => window.REDAKTOR && window.REDAKTOR.state.pages.length > 0, null, { timeout: 30000 });
  await page.waitForFunction(() => window.REDAKTOR.state.pages[0].status === 'done', null, { timeout: 180000 });

  const detections = await page.evaluate(() => window.REDAKTOR.state.pages[0].detections.map((d) => ({
    rule: d.ruleId, text: d.text, box: d.box,
  })));

  await page.click('.tab[data-tab="export"]');
  await page.click('#dpiChips .chip[data-dpi="300"]');
  await page.waitForTimeout(150);

  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  await page.click('#exportBtn');
  const download = await downloadPromise;
  const exported = path.join(ARTIFACTS, download.suggestedFilename());
  await download.saveAs(exported);
  await page.waitForFunction(() => !window.REDAKTOR.state.exporting, null, { timeout: 120000 });

  // Feed the export back into pdf.js: text layer + pixel proof.
  const b64 = fs.readFileSync(exported).toString('base64');
  const check = await page.evaluate(async ({ b64, boxes }) => {
    const bin = atob(b64);
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) data[i] = bin.charCodeAt(i);

    const pdf = await window.pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    const pdfPage = await pdf.getPage(1);
    const content = await pdfPage.getTextContent();
    const viewport = pdfPage.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;

    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const samplePixel = (nx, ny) => {
      const x = Math.min(canvas.width - 1, Math.max(0, Math.round(nx * canvas.width)));
      const y = Math.min(canvas.height - 1, Math.max(0, Math.round(ny * canvas.height)));
      const i = (y * canvas.width + x) * 4;
      return [px[i], px[i + 1], px[i + 2]];
    };

    return {
      textItems: content.items.length,
      margin: samplePixel(0.03, 0.04),
      centers: boxes.map((b) => samplePixel(b.box.x + b.box.w / 2, b.box.y + b.box.h / 2)),
    };
  }, { b64, boxes: detections });

  const dark = check.centers.every((rgb) => rgb.every((v) => v < 40));

  await browser.close();

  const failures = [];
  if (detections.length === 0) failures.push('no detections');
  if (check.textItems !== 0) failures.push(`export still has a text layer (${check.textItems} items)`);
  if (!dark) failures.push('redaction pixels are not black');
  if (errors.length) failures.push('console errors: ' + errors.join(' | '));
  if (external.length) failures.push('external network attempts: ' + external.join(' | '));

  if (failures.length) throw new Error('REDAKTOR e2e failed: ' + failures.join(', '));
});
