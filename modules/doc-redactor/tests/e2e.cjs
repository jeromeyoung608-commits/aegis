// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * End-to-end verification for REDAKTOR: intake -> OCR -> detection -> export -> forensics.
 *
 * Dev-only: requires playwright-core. The shipped app itself has no dependencies.
 * Prereqs: `python3 -m http.server 8010` in the project root and
 *          `node generate-sample-pii.cjs`.
 *
 * Env:
 *   BASE_URL     default http://127.0.0.1:8010/
 *   CHROME_PATH  optional explicit Chrome/Chromium executable
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8010/';
const ARTIFACTS = path.join(__dirname, 'artifacts');

function resolveChrome() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  const candidates = [
    path.join(process.env.HOME, 'Library/Caches/ms-playwright'),
    path.join(process.env.HOME, '.cache/ms-playwright')
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

(async () => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const sample = path.join(ARTIFACTS, 'sample-pii.pdf');
  if (!fs.existsSync(sample)) throw new Error(`Missing sample: ${sample} — run generate-sample-pii.cjs first`);

  const browser = await chromium.launch({ ...resolveChrome(), headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1000 } });
  const external = [];

  // Simulated offline: anything that is not the local origin is aborted.
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
    rule: d.ruleId, text: d.text, box: d.box
  })));
  console.log('PAGES 1');
  console.log('OCR_STATUS done');
  console.log('DETECTIONS', detections.length, JSON.stringify(detections.map((d) => d.rule)));

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
      centers: boxes.map((b) => samplePixel(b.box.x + b.box.w / 2, b.box.y + b.box.h / 2))
    };
  }, { b64, boxes: detections });

  const dark = check.centers.every((rgb) => rgb.every((v) => v < 40));
  console.log('EXPORT_TEXT_ITEMS', check.textItems);
  console.log('MARGIN_RGB', JSON.stringify(check.margin));
  console.log('ALL_CENTERS_DARK', dark);

  await page.click('#auditTest');
  await page.waitForTimeout(1200);
  const audit = await page.evaluate(() => ({ ...window.REDAKTOR.audit }));
  console.log('AUDIT', JSON.stringify(audit));

  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(ARTIFACTS, 'ui.png') });
  console.log('CONSOLE_ERRORS', JSON.stringify(errors));
  console.log('EXTERNAL_BLOCKED', JSON.stringify(external));
  console.log('EXPORT_FILE', path.basename(exported), fs.statSync(exported).size);

  await browser.close();

  const failures = [];
  if (detections.length === 0) failures.push('no detections');
  if (check.textItems !== 0) failures.push('export still has a text layer');
  if (!dark) failures.push('redaction pixels are not black');
  if (errors.length) failures.push('console errors');
  if (external.length) failures.push('external network attempts');
  if (failures.length) {
    console.error('FAILED:', failures.join(', '));
    process.exit(1);
  }
  console.log('E2E_PASS');
})().catch((error) => {
  console.error('E2E_ERROR', error && error.message);
  process.exit(1);
});
