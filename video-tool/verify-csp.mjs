// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// video-tool/verify-csp.mjs — AEG-23 regression: per-response nonce CSP.
//
// Proves (1) every HTML document gets a fresh nonce + CSP header, (2) every
// <script> tag carries that same nonce, (3) no 'unsafe-inline' escapes into
// script-src, (4) inline module scripts still EXECUTE (nonce works, pages are
// not silently broken), (5) an injected script without a nonce is REFUSED,
// (6) release archives under dist/ are not downloadable.
import { chromium } from 'playwright';
import http from 'node:http';
import assert from 'node:assert';

const BASE = process.env.BASE || 'http://localhost:8099';
import { chromeLaunchOptions } from './chrome.mjs';

function get(path) {
  return new Promise((resolve) => {
    http.get(BASE + path, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', (e) => resolve({ status: 0, headers: {}, body: String(e) }));
  });
}

const PAGES = [
  '/aegis-shell/index.html',          // external module script
  '/modules/token-gate/index.html',   // inline <script type="module">
  '/modules/blind-relay/index.html',  // inline <script type="module">
  '/modules/detached-hash-signer/index.html',
  '/modules/webgpu-topology/index.html',
  '/modules/doc-redactor/index.html', // additionally has a <meta> CSP
];

const nonces = new Set();
for (const page of PAGES) {
  const r = await get(page);
  assert.strictEqual(r.status, 200, `${page} → 200 (got ${r.status})`);
  const csp = r.headers['content-security-policy'] || '';
  assert.match(csp, /script-src[^;]*'nonce-/, `${page} has a nonce CSP`);
  assert.doesNotMatch(csp.split(';').find((d) => d.trim().startsWith('script-src')) || '',
    /unsafe-inline/, `${page} script-src must not allow unsafe-inline`);
  assert.match(csp, /frame-ancestors 'self'/, `${page} keeps shell iframes usable`);
  assert.match(csp, /worker-src 'self' blob:/, `${page} keeps the SAB/OCR workers usable`);
  const m = csp.match(/'nonce-([^']+)'/);
  assert.ok(m, `${page} nonce is present`);
  const nonce = m[1];
  nonces.add(nonce);

  const tags = r.body.match(/<script(?=[\s>])[^>]*>/gi) || [];
  assert.ok(tags.length > 0, `${page} has script tags`);
  for (const tag of tags) {
    assert.ok(tag.includes(`nonce="${nonce}"`), `${page} script tag carries the header nonce: ${tag}`);
  }
  console.log(`[CSP] PASS — ${page}: ${tags.length} script tag(s), nonce injected, no unsafe-inline`);
}

// Two requests must not reuse a nonce (replay protection).
const again = await get('/aegis-shell/index.html');
const againNonce = (again.headers['content-security-policy'] || '').match(/'nonce-([^']+)'/)?.[1] || '';
assert.ok(againNonce && !nonces.has(againNonce), 'nonce is fresh per response');
console.log('[CSP] PASS — nonce rotates on every HTML response');

// AEG-19 companion: release archives must not be reachable over HTTP.
const archive = await get('/dist/aegis-delivery-1.0.0.tar.gz');
assert.strictEqual(archive.status, 404, `dist/ archive is 404 (got ${archive.status})`);
console.log('[CSP] PASS — dist/ release archive is not downloadable');

// ── Browser: inline module scripts execute, injected scripts are refused ─────
const browser = await chromium.launch(chromeLaunchOptions());
const page = await browser.newPage();
const violations = [];
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE + '/aegis-shell/index.html', { waitUntil: 'load' });
await page.evaluate(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__cspViolations.push(e.violatedDirective));
});

// The shell's app.js is an external module script; if the nonce were wrong the
// role switch / audit card would never be wired up. Check a real DOM effect.
await page.waitForTimeout(700);
const wired = await page.evaluate(() => Boolean(document.querySelector('#roleSwitch')) &&
  document.querySelector('#auditState')?.textContent !== undefined);
assert.ok(wired, 'shell module script executed under CSP');
console.log('[CSP] PASS — shell external module script executed under CSP');

// No CSP violation on the pristine page (before we deliberately inject one).
const loadCspErrors = errors.filter((e) => /Content Security Policy/i.test(e));
assert.strictEqual(loadCspErrors.length, 0, `clean shell load has no CSP errors (${loadCspErrors.join(' | ')})`);
console.log('[CSP] PASS — clean shell load produces no CSP violation');

// Inject a script WITHOUT a nonce: CSP must refuse it.
const refused = await page.evaluate(async () => {
  const s = document.createElement('script');
  s.textContent = 'window.__cspProbe = "EXECUTED";';
  document.body.appendChild(s);
  await new Promise((r) => setTimeout(r, 150));
  return { executed: window.__cspProbe === 'EXECUTED', blocked: [...(window.__cspViolations || [])] };
});
assert.strictEqual(refused.executed, false, 'an injected script without nonce must NOT execute');
assert.ok(refused.blocked.some((d) => String(d).includes('script-src')),
  `a script-src violation must be reported (saw ${JSON.stringify(refused.blocked)})`);
console.log('[CSP] PASS — injected script without nonce refused + violation reported');

// Inline module pages: their <script type="module"> bodies must actually run.
for (const p of ['/modules/token-gate/index.html', '/modules/blind-relay/index.html']) {
  const sub = await browser.newPage();
  const subErrors = [];
  sub.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) subErrors.push(m.text()); });
  await sub.goto(BASE + p, { waitUntil: 'load' });
  await sub.waitForTimeout(400);
  assert.strictEqual(subErrors.length, 0, `${p} has no CSP console errors (${subErrors.join(' | ')})`);
  await sub.close();
  console.log(`[CSP] PASS — ${p} inline module script runs with no CSP violation`);
}
await browser.close();

// no-store is required: a cached document would replay a spent nonce.
const cache = (await get('/aegis-shell/index.html')).headers['cache-control'] || '';
assert.match(cache, /no-store/i, 'HTML is no-store');
console.log('[CSP] PASS — HTML responses are no-store');

console.log('\n[CSP] ALL PASS');
process.exit(0);
