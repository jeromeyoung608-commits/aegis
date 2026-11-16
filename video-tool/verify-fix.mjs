// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

// (2026-11-16) This script used to hardcode both a macOS Chrome path and
// port 8080, so it could not run on Linux CI and could not be pointed at the
// port the other suites use. BASE and CHROME_PATH now work like everywhere
// else; when no local Chrome is found we fall back to Playwright's bundled
// Chromium instead of failing on a missing absolute path.
const BASE = process.env.BASE || 'http://localhost:8080';
const LOCAL_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXE = process.env.CHROME_PATH || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined);
const b = await chromium.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-webgpu'],
});

// ── B: narrow REDAKTOR (simulates the 520px shell sidebar iframe) ──
const p = await b.newPage({ viewport: { width: 506, height: 760 } }); // 520 - 14 padding
await p.goto(BASE + '/modules/doc-redactor/index.html', { waitUntil: 'domcontentloaded' });
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
await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(700);
const wrapH = await p2.$eval('.redact-wrap', el => Math.round(el.getBoundingClientRect().height));
const sidebarW = await p2.$eval('#sidebar', el => Math.round(el.getBoundingClientRect().width));
await p2.click('#btnExpandRedact');
await p2.waitForTimeout(300);
const expanded = await p2.$eval('body', el => el.classList.contains('redact-expanded'));
const iframeW = await p2.$eval('#f-doc', el => Math.round(el.getBoundingClientRect().width));
console.log('[A] redactHeight=%spx sidebarWidth=%spx expanded=%s iframeWidth=%spx', wrapH, sidebarW, expanded, iframeW);

// ── Assertions ──────────────────────────────────────────────────────────────
// (2026-11-16) This script used to only print measurements, so every value
// above could regress silently and the suite still exited 0. It now asserts
// the invariants the measurements are supposed to prove.
const failures = [];
const check = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) failures.push(label);
};
check(docsVisible, 'docs button is visible');
check(fieldsVisible, 'fields button is visible');
check(stageShare === 100, `stage fills the narrow viewport (${stageShare}%)`);
check(docsOpen, 'left drawer opens');
check(rightOpen, 'right drawer opens');
check(leftClosed, 'left drawer auto-closes when the right drawer opens');
check(scrimShown, 'scrim is shown behind an open drawer');
check(termsOnScreen, 'term input stays inside the viewport');
check(wrapH > 0, `redact area has height (${wrapH}px)`);
check(sidebarW > 0, `sidebar has width (${sidebarW}px)`);
check(expanded, 'fullscreen expand toggles redact-expanded');
check(iframeW > 0, `redactor iframe has width (${iframeW}px)`);

await b.close();
if (failures.length) {
  console.error(`[FIX] FAIL — ${failures.length} assertion(s) failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('[FIX] ALL PASS');
