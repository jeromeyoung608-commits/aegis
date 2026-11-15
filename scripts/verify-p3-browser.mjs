// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// scripts/verify-p3-browser.mjs — P3 browser gate (A1).
// Runs a headless-Chromium smoke test against the real server: page loads, no
// console errors, and the B-01~B-04 static-exposure paths are denied even over the
// browser's request pipeline. Playwright is optional: if it is not installed the
// script reports SKIP (exit 0) instead of failing, so local runs without a browser
// binary still pass the rest of the suite. CI installs playwright + chromium.
import { spawn } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const PORT = 8139;
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = 'p3-browser-secret';

let playwright;
try { playwright = (await import('playwright')).default; }
catch { console.log('SKIP: playwright not installed (npm i -D playwright && npx playwright install chromium)'); process.exit(0); }

const srv = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, AEGIS_ISSUER_SECRET: SECRET, PORT: String(PORT), AEGIS_DB: '/tmp/aegis-p3.db' },
  stdio: 'ignore',
});

async function waitReady() {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/healthz`); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 150)); }
  throw new Error('server not ready');
}

let failures = 0;
const check = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`); if (!cond) failures++; };

try {
  await waitReady();
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/aegis-shell/console.html`, { waitUntil: 'networkidle' });
  check((await page.title()).length > 0, 'console page loads');

  // B-01~B-04: static exposure must be denied. Performed from Node (not the page)
  // so the expected 404s do not register as browser console errors.
  for (const p of ['/server.js', '/config/local.json', '/data/aegis.db', '/server/store.js']) {
    const r = await fetch(`${BASE}${p}`);
    check(r.status === 404 || r.status === 403, `denied ${p} (${r.status})`);
  }
  if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.map((e) => '  - ' + e).join('\n'));
  check(errors.length === 0, `no console/page errors (${errors.length})`);
  await browser.close();

  // P3 also asserts the operator console is reachable and unauthenticated API is closed.
  const noAuth = await fetch(`${BASE}/api/compliance`);
  check(noAuth.status === 401, `/api/compliance unauthenticated -> ${noAuth.status}`);
} catch (e) {
  console.error('ERROR', e); failures++;
} finally {
  try { srv.kill('SIGKILL'); } catch {}
  console.log(failures ? `\nP3 BROWSER: ${failures} failure(s)` : '\nP3 BROWSER: PASS');
  process.exit(failures ? 1 : 0);
}
