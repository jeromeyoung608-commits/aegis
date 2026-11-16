// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// video-tool/verify-tsa.mjs — TSA adapter smoke test (offline, no real TSA).
//
// Boots server.js WITH the TSA adapter enabled but pointed at an unreachable TSA,
// then proves: (1) POST /adapter/tsa/submit returns a graceful { tsaStatus:
// 'failed' } — never a 500 crash; (2) the main relay (/session) still works, so
// enabling the adapter cannot destabilize the kernel. Exits 0 only if both hold.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8137;
const DIGEST = 'b'.repeat(64);

const dir = mkdtempSync(join(tmpdir(), 'aegis-tsa-'));
const cfgPath = join(dir, 'tsa.json');
writeFileSync(cfgPath, JSON.stringify({
  provider: 'offline-test',
  timeoutMs: 1500,
  endpoints: [{ url: 'http://127.0.0.1:1/tsr', auth: { type: 'none' } }],
}));

const child = spawn(process.execPath, ['server.js', '--adapter-tsa', 'on', '--tsa-config', cfgPath], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let srvLog = '';
child.stdout.on('data', (c) => { srvLog += c; });
child.stderr.on('data', (c) => { srvLog += c; });

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/session?room=probe`);
      // /session is fail-closed now: a 401/403 also proves the server is up.
      if ([200, 401, 403, 503].includes(r.status)) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not boot');
}

let failed = false;
try {
  await waitUp();

  // (1) TSA endpoint with an unreachable TSA → graceful failed, not a crash.
  const r1 = await fetch(`http://localhost:${PORT}/adapter/tsa/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ digest: DIGEST, tsaEndpoint: 'http://127.0.0.1:1/tsr' }),
  });
  const raw = await r1.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw: raw.slice(0, 300) }; }
  assert.equal(r1.status, 200, 'HTTP stays 200 (handler did not crash) — got ' + r1.status + ' body=' + JSON.stringify(body).slice(0, 300));
  assert.equal(body.tsaStatus, 'failed', 'TSA unreachable → tsaStatus failed');
  assert.equal(body.originalDigest, DIGEST);

  // (2) Main relay still healthy after the adapter was exercised.
  const r2 = await fetch(`http://localhost:${PORT}/session?room=still-alive`);
  assert.ok([200, 401, 403, 503].includes(r2.status), 'relay still responds');

  console.log('[TSA] PASS — adapter enabled, unreachable TSA → tsaStatus=failed, relay unaffected.');
  console.log('[TSA] tsa response: ' + JSON.stringify(body));
} catch (e) {
  console.error('[TSA] FAIL — ' + (e && e.message));
  console.error('[TSA] server log:\n' + srvLog);
  failed = true;
} finally {
  child.kill('SIGKILL');
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
