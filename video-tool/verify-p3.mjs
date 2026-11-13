// video-tool/verify-p3.mjs — post-audit P3 regression (AEG-19/21/23/24) + P0 PoCs.
//
// 1. All 12 shipping pages load with no pageerror, no real 4xx and no CSP
//    violation under the new per-response nonce policy.
// 2. AEG-21: raw timings / pick-debug hidden by default, visible with ?diag=1.
// 3. AEG-24: Sign stays gated after identity creation, with a visible reason.
// 4. P0: source/key/archive paths are 404; /session is fail-closed and clamps TTL.
import { chromium } from 'playwright';
import http from 'node:http';
import assert from 'node:assert';

const BASE = process.env.BASE || 'http://localhost:8099';
const SECRET = process.env.AEGIS_ISSUER_SECRET || '';
const EXE = process.env.CHROME_EXE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function req(path, headers = {}) {
  return new Promise((resolve) => {
    http.get(BASE + path, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', (e) => resolve({ status: 0, headers: {}, body: String(e) }));
  });
}

// ── 4. P0 regressions ──────────────────────────────────────────────────────
const FORBIDDEN = [
  '/server.js', '/package.json', '/README.md', '/docs/',
  '/scripts/zero-dep-lint.mjs', '/key.pem', '/cert.pem',
  '/dist/aegis-delivery-1.0.0.tar.gz', '/dist/MANIFEST.json',
];
for (const p of FORBIDDEN) {
  const r = await req(p);
  assert.strictEqual(r.status, 404, `${p} must be 404 (got ${r.status})`);
}
console.log(`[P3/P0] PASS — ${FORBIDDEN.length} source/key/archive paths are 404`);

const noCred = await req('/session?room=p3');
assert.ok([401, 403, 503].includes(noCred.status), `/session without credential is fail-closed (got ${noCred.status})`);
const wrongCred = await req('/session?room=p3', { authorization: 'Bearer definitely-wrong' });
assert.ok([401, 403, 503].includes(wrongCred.status), `/session with wrong credential refused (got ${wrongCred.status})`);
console.log('[P3/P0] PASS — /session is fail-closed (no credential / wrong credential)');
if (SECRET) {
  const ok = await req('/session?room=p3&ttl=315360000000', { authorization: 'Bearer ' + SECRET });
  assert.strictEqual(ok.status, 200, `/session with secret → 200 (got ${ok.status})`);
  assert.strictEqual(JSON.parse(ok.body).ttlMs, 3600000, '10-year TTL clamped to 1 hour');
  console.log('[P3/P0] PASS — TTL clamped to 3600000 ms');
}

// ── 1/2/3. Browser checks ──────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-webgpu'] });
const PAGES = [
  '/aegis-shell/index.html',
  '/modules/audit-timeline/index.html',
  '/modules/blind-relay/index.html',
  '/modules/detached-hash-signer/index.html',
  '/modules/doc-redactor/index.html',
  '/modules/e2e-signed-delivery/index.html',
  '/modules/encrypted-archive/index.html',
  '/modules/p2p-crypto-transfer/index.html',
  '/modules/sync-canvas/index.html',
  '/modules/token-gate/index.html',
  '/modules/webgpu-topology/index.html',
  '/modules/zero-knowledge-identity/index.html',
];
// Known headless SwiftShader noise, unrelated to the product.
const BENIGN = /WebGPU|GPU|swiftshader|device lost|deprecat|favicon|404|Failed to load resource|External Instance/i;

for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const cspErrors = [];
  const bad = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Content Security Policy|Refused to (execute|load|apply)/i.test(t)) cspErrors.push(t);
  });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/i.test(r.url())) bad.push(`${r.status()} ${r.url()}`); });
  const resp = await page.goto(BASE + p, { waitUntil: 'load' });
  assert.strictEqual(resp.status(), 200, `${p} → 200 (got ${resp.status()})`);
  await page.waitForTimeout(800);
  assert.strictEqual(pageErrors.length, 0, `${p} has no pageerror (${pageErrors.join(' | ')})`);
  assert.strictEqual(cspErrors.length, 0, `${p} has no CSP violation (${cspErrors.join(' | ')})`);
  assert.strictEqual(bad.length, 0, `${p} has no real 4xx (${JSON.stringify(bad)})`);
  console.log(`[P3/PAGE] PASS — ${p}`);
  await page.close();
}

// ── 1b. F-01 regression: token-gate forged-signature must be DENIED ─────────
{
  const tp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await tp.goto(BASE + '/modules/token-gate/index.html', { waitUntil: 'load' });
  // wait for the ES module to attach its click handlers before interacting
  await tp.waitForFunction(() => { const b = document.getElementById('issueBtn'); return !!b && b.onclick !== null; }, null, { timeout: 10000 });
  await tp.click('#issueBtn');
  await tp.waitForFunction(() => { const t = document.getElementById('tokOut')?.textContent || ''; return t.includes('.') && !/click above/i.test(t); }, null, { timeout: 10000 });
  for (const c of ['valid', 'expired', 'wrongroom', 'forged']) {
    await tp.click(`button[data-case="${c}"]`);
    await tp.waitForTimeout(150);
  }
  const out = await tp.evaluate(() => [...document.querySelectorAll('#gateOut div')].map((d) => d.innerText));
  const row = (re) => out.find((r) => re.test(r)) || '';
  assert.match(row(/Valid/i), /ADMIT/, 'valid token → ADMIT');
  assert.match(row(/Expired/i), /DENY/, 'expired token → DENY');
  assert.match(row(/Wrong-room/i), /DENY/, 'wrong-room token → DENY');
  assert.match(row(/Forged/i), /DENY/, 'forged (mutated signature) → DENY, not ADMIT');
  console.log('[P3/F-01] PASS — token-gate forged-signature regression: forged → DENY');
  await tp.close();
}

await browser.close();

// ── 2. AEG-21: diagnostics are opt-in ──────────────────────────────────────
const b2 = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const TOPO = '/modules/webgpu-topology/index.html';
const visibility = async (url) => {
  const page = await b2.newPage();
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const v = await page.evaluate(() => {
    const shown = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).display !== 'none' : null;
    };
    return {
      fps: shown('#hud-fps'), frame: shown('#hud-frame'),
      physics: shown('#hud-physics'), pickdbg: shown('#pickdbg'),
      physicsValue: document.getElementById('hud-physics')?.textContent || '',
    };
  });
  await page.close();
  return v;
};
const normal = await visibility(TOPO);
assert.strictEqual(normal.fps, true, 'FPS remains a product metric');
assert.strictEqual(normal.frame, false, 'Frame ms is hidden by default');
assert.strictEqual(normal.physics, false, 'Worker tick ms is hidden by default');
assert.strictEqual(normal.pickdbg, false, 'pick-debug panel is hidden by default');
assert.ok(Number(normal.physicsValue) <= 1000, `worker tick is spike-filtered (saw ${normal.physicsValue})`);
console.log('[P3/AEG-21] PASS — default HUD shows product metrics only; raw timings hidden');

const diag = await visibility(TOPO + '?diag=1');
assert.strictEqual(diag.frame, true, 'Frame ms visible with ?diag=1');
assert.strictEqual(diag.physics, true, 'Worker tick ms visible with ?diag=1');
assert.strictEqual(diag.pickdbg, true, 'pick-debug visible with ?diag=1');
console.log('[P3/AEG-21] PASS — ?diag=1 restores all developer diagnostics');
await b2.close();

// ── 3. AEG-24: Sign gate is explained, never auto-unlocked ─────────────────
const b3 = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await b3.newPage();
await page.goto(BASE + '/modules/zero-knowledge-identity/index.html', { waitUntil: 'load' });
await page.waitForTimeout(400);
const before = await page.evaluate(() => ({
  disabled: document.getElementById('btnSign')?.disabled,
  hint: document.getElementById('signGateHint')?.textContent || '',
  title: document.getElementById('btnSign')?.title || '',
  describedBy: document.getElementById('btnSign')?.getAttribute('aria-describedby') || '',
}));
assert.strictEqual(before.disabled, true, 'Sign is disabled before an identity exists');
assert.match(before.hint, /create an identity|create/i, 'gate hint explains the precondition');
assert.strictEqual(before.describedBy, 'signGateHint', 'disabled button is aria-described by its reason');
console.log('[P3/AEG-24] PASS — Sign disabled with an accessible, visible reason');

await page.fill('#name', 'P3-Regression');
await page.fill('#passphrase', 'correct-horse-battery');
await page.fill('#confirm', 'correct-horse-battery');
await page.click('#btnCreate');
await page.waitForFunction(() => /Seal issued/i.test(document.getElementById('setupMsg')?.textContent || ''), null, { timeout: 30000 });
const after = await page.evaluate(() => ({
  disabled: document.getElementById('btnSign')?.disabled,
  hint: document.getElementById('signGateHint')?.textContent || '',
  title: document.getElementById('btnSign')?.title || '',
  unlockMsg: document.getElementById('unlockMsg')?.textContent || '',
}));
assert.strictEqual(after.disabled, true, 'identity creation does NOT auto-unlock the sealed key');
assert.match(after.hint, /sealed|unlock/i, 'gate hint explains the sealed state');
assert.match(after.title, /unlock/i, 'button title points at Unlock');
assert.match(after.unlockMsg, /unlock it and enable Sign/i, 'creation message gives the next action');
console.log('[P3/AEG-24] PASS — after creation Sign stays sealed with explicit next-step guidance');
await b3.close();

console.log('\n[P3] ALL PASS');
process.exit(0);
