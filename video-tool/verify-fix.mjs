// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';

const EXE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-webgpu'],
});

// ── B: narrow REDAKTOR (simulates the 520px shell sidebar iframe) ──
const p = await b.newPage({ viewport: { width: 506, height: 760 } }); // 520 - 14 padding
await p.goto('http://localhost:8080/modules/doc-redactor/index.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);

const docsVisible = await p.$eval('#btnDocs', el => getComputedStyle(el).display !== 'none').catch(() => false);
const fieldsVisible = await p.$eval('#btnDrawer', el => getComputedStyle(el).display !== 'none').catch(() => false);
const stageW = await p.$eval('#canvasWrap', el => Math.round(el.getBoundingClientRect().width));
const pageW = await p.evaluate(() => window.innerWidth);
const stageShare = Math.round((stageW / pageW) * 100);

await p.click('#btnDocs');           // open left drawer
await p.waitForTimeout(350);
const docsOpen = await p.$eval('#railLeft', el => el.classList.contains('is-open'));
await p.click('#btnDrawer');         // open right drawer -> left must close
await p.waitForTimeout(350);
const rightOpen = await p.$eval('#railRight', el => el.classList.contains('is-open'));
const leftClosed = await p.$eval('#railLeft', el => !el.classList.contains('is-open'));
const scrimShown = await p.$eval('#railScrim', el => !el.hidden);
const termsOnScreen = await p.$eval('#termInput', el => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.right <= window.innerWidth + 1;
}).catch(() => false);
console.log('[B] docsBtn=%s fieldsBtn=%s stageWidth=%s/%spx(%s%%) docsOpen=%s rightOpen=%s leftAutoClosed=%s scrim=%s termsOnScreen=%s',
  docsVisible, fieldsVisible, stageW, pageW, stageShare, docsOpen, rightOpen, leftClosed, scrimShown, termsOnScreen);

// ── A: shell → redact area height + fullscreen expand ──
const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p2.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(700);
const wrapH = await p2.$eval('.redact-wrap', el => Math.round(el.getBoundingClientRect().height));
const sidebarW = await p2.$eval('#sidebar', el => Math.round(el.getBoundingClientRect().width));
await p2.click('#btnExpandRedact');
await p2.waitForTimeout(300);
const expanded = await p2.$eval('body', el => el.classList.contains('redact-expanded'));
const iframeW = await p2.$eval('#f-doc', el => Math.round(el.getBoundingClientRect().width));
console.log('[A] redactHeight=%spx sidebarWidth=%spx expanded=%s iframeWidth=%spx', wrapH, sidebarW, expanded, iframeW);

await b.close();
