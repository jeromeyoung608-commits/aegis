// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// tests/e2e.browser.mjs — real-browser end-to-end check of the signed-delivery
// flow. Drives the actual page UI (seal A & B -> finalize -> boss verdict) in
// headless Chromium for both the clean and the tampered paths. Self-hosts the
// page through the project's zero-dep server.js so ES modules + secure context
// (localhost) + COOP/COEP headers are all correct.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = 8099;
const BASE = `http://localhost:${PORT}/modules/e2e-signed-delivery/index.html`;

function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://localhost:${PORT}/`, (res) => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error('server did not start'));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

async function runFlow(page, { tamper }) {
  await page.goto(BASE, { waitUntil: 'load' });

  // Boot opens the receiver first, then the sender; "Boss online" means both
  // the P2P channel endpoints are live.
  await page.waitForFunction(
    () => document.getElementById('bossLog')?.textContent.includes('Boss online'),
    { timeout: 30000 },
  );

  await page.click('#stampA');
  await page.click('#stampB');
  await page.waitForFunction(
    () => document.getElementById('stampState')?.textContent.trim() === '2 / 2 sealed',
    { timeout: 5000 },
  );

  if (tamper) await page.check('#tamper');
  await page.click('#finalize');

  // The verdict overlay sets #verdict synchronously once verification runs.
  await page.waitForFunction(
    () => {
      const v = document.getElementById('verdict');
      return v && v.textContent && v.textContent !== 'AWAITING';
    },
    { timeout: 30000 },
  );
  const verdict = await page.$eval('#verdict', (el) => el.textContent.trim());
  const sub = await page.$eval('#verdictSub', (el) => el.textContent.trim());
  const boss = await page.$eval('#bossLog', (el) => el.textContent.trim());
  console.log(`  verdict="${verdict}" reason="${sub}"`);
  console.log('  bossLog:', boss.replace(/\s+/g, ' ').slice(0, 400));
  return verdict;
}

const server = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

const logs = [];
let browser;
let failed = false;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  const clean = await runFlow(page, { tamper: false });
  console.log('clean  verdict:', clean);
  assert.equal(clean, 'VERIFIED', `clean flow must verify (got "${clean}")`);

  const tampered = await runFlow(page, { tamper: true });
  console.log('tampered verdict:', tampered);
  assert.equal(tampered, 'VERIFICATION FAILED', `tampered flow must fail (got "${tampered}")`);

  console.log('\nE2E browser check PASSED: clean => VERIFIED, tampered => VERIFICATION FAILED');
} catch (err) {
  failed = true;
  console.error('\nE2E browser check FAILED:', err.message);
  if (logs.length) console.error('page logs:\n' + logs.join('\n'));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

process.exit(failed ? 1 : 0);
