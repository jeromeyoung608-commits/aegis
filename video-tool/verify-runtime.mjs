// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Runtime smoke test for CI: boots checks that only a real browser + the served
// app can prove — WebGPU canvas mounts, the command-center surfaces render, the
// token-gated signaling relay enforces admission, and no fatal console errors
// fire on load. Run after `node server.js` is listening on BASE (default :8080).
import { chromium } from 'playwright';
import http from 'node:http';

const BASE = process.env.BASE || 'http://localhost:8080';
import { chromeLaunchOptions } from './chrome.mjs';

function get(path) {
  return new Promise((resolve) => {
    http.get(BASE + path, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', (e) => resolve({ status: 0, body: String(e) }));
  });
}

function getWith(path, headers) {
  return new Promise((resolve) => {
    http.get(BASE + path, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', (e) => resolve({ status: 0, body: String(e) }));
  });
}

// ── 1. Signaling relay is token-gated (the security hard-stop). ──────────────
// /session is fail-closed unless the deployment supplies AEGIS_ISSUER_SECRET or
// opts into AEGIS_TRUSTED_LAN=1. Both postures are acceptable here: what must
// hold is that /signal rejects callers with no token.
const SECRET = process.env.AEGIS_ISSUER_SECRET || '';
const sess = await getWith('/session?room=ci', SECRET ? { authorization: 'Bearer ' + SECRET } : {});
const tokenMatch = sess.body.match(/"token":"([^"]+)"/);
if (sess.status === 200 && tokenMatch) {
  console.log('[RUNTIME] /session minted a token (issuer configured).');
} else if ([401, 403, 503].includes(sess.status)) {
  console.log(`[RUNTIME] /session is fail-closed (status ${sess.status}) — expected without an issuer secret.`);
} else {
  throw new Error(`/session answered ${sess.status} — neither 200 nor fail-closed`);
}
const token = tokenMatch ? tokenMatch[1] : '';

const noTok = await get('/signal?room=ci&from=a');
assertCond(noTok.status === 401, `/signal without token → 401 (got ${noTok.status})`);

if (token) {
  const withTok = await get(`/signal?room=ci&from=a&token=${token}`);
  assertCond(withTok.status === 204 || withTok.status === 400, `/signal with token admitted (got ${withTok.status})`);
} else {
  console.log('[RUNTIME] SKIP /signal-positive — no token available (issuer locked).');
}

// ── 2. The workbench actually renders in a real browser. ────────────────────
const browser = await chromium.launch(
  chromeLaunchOptions(['--use-gl=swiftshader', '--enable-unsafe-webgpu']),
);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const bad = [];
page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

const resp = await gotoWithRetry(page, BASE + '/');
await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
const hdr = resp.headers();
assertCond(
  /same-origin/i.test(hdr['cross-origin-opener-policy'] || '') &&
  /require-corp/i.test(hdr['cross-origin-embedder-policy'] || ''),
  'page is cross-origin isolated (COOP/COEP) so SharedArrayBuffer works'
);
await page.waitForTimeout(1500);

// The topology WebGPU canvas lives INSIDE the #f-topo iframe, so we reach into it.
const canvas = await page.evaluate(() => {
  const f = document.getElementById('f-topo');
  if (!f || !f.contentDocument) return { ok: false, reason: 'no iframe' };
  const c = f.contentDocument.getElementById('gpu');
  if (!c) return { ok: false, reason: 'no #gpu canvas' };
  return { ok: true, w: c.width, h: c.height };
});
assertCond(canvas.ok, `topology WebGPU canvas mounted inside iframe (${canvas.reason || canvas.w + 'x' + canvas.h})`);

// Core surfaces present.
const surfaces = await page.evaluate(() => {
  const vis = (sel) => {
    const el = document.querySelector(sel);
    return el && getComputedStyle(el).display !== 'none';
  };
  return {
    stage: vis('#stage-topo'),
    redactor: !!document.querySelector('#f-doc'),
    vault: !!document.querySelector('#vaultCard'),
    audit: !!document.querySelector('#auditCard'),
    roleSwitch: !!document.querySelector('#roleSwitch'),
  };
});
assertCond(surfaces.stage && surfaces.redactor && surfaces.vault && surfaces.audit && surfaces.roleSwitch,
  `all core surfaces render (${JSON.stringify(surfaces)})`);

await browser.close();

// Filter out benign WebGPU-availability warnings that are not fatal.
const fatal = errors.filter((e) => !/WebGPU|GPU|swiftshader|deprecat|favicon|404|Failed to load resource/i.test(e));
assertCond(fatal.length === 0, `no fatal console errors (saw ${fatal.length}: ${fatal.slice(0, 3).join(' | ')})`);

// Any real 4xx (other than the auto favicon request) is a genuine breakage.
const badReal = bad.filter((b) => !/favicon/i.test(b));
assertCond(badReal.length === 0, `no 4xx responses (saw ${JSON.stringify(badReal)})`);

console.log('\n[RUNTIME] ALL PASS');
process.exit(0);

async function gotoWithRetry(page, url, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      console.log(`[RUNTIME] goto attempt ${i}/${tries} → ${url}`);
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      lastErr = e;
      console.warn(`[RUNTIME] goto attempt ${i}/${tries} failed: ${e.message.split('\n')[0]}`);
      await page.waitForTimeout(1000 * i);
    }
  }
  throw lastErr;
}

function assertCond(cond, msg) {
  if (cond) { console.log('[RUNTIME] PASS — ' + msg); }
  else { console.error('[RUNTIME] FAIL — ' + msg); process.exit(1); }
}
