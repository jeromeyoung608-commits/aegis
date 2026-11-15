// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/aegis-shell/tests/server-integration.test.mjs
// Integration tests that spawn the real server.js and exercise the operator
// compliance API (A2) and the B-01~B-04 static-exposure gate (A3). These run in
// `npm test` (the aggregator scans aegis-shell/). Kept dependency-free.
import { test, before, after } from 'node:test';
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import process from 'node:process';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const PORT = 8137;
const SECRET = 'test-secret-integration';
const BASE = `http://127.0.0.1:${PORT}`;
const AUTH = `Bearer ${SECRET}`;

let srv;
let dataExisted;

function startServer() {
  dataExisted = existsSync(`${ROOT}/data`);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, AEGIS_ISSUER_SECRET: SECRET, AEGIS_METRICS_TOKEN: SECRET, PORT: String(PORT), AEGIS_DB: '/tmp/aegis-itest.db' },
    stdio: 'ignore',
  });
  return child;
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/healthz`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server not ready');
}

before(async () => { srv = startServer(); await waitReady(); });
after(() => {
  try { srv.kill('SIGKILL'); } catch {}
  rmSync('/tmp/aegis-itest.db', { force: true });
  if (!dataExisted) rmSync(`${ROOT}/data`, { recursive: true, force: true });
});

const j = (b) => JSON.stringify(b);

// ── A3: static-exposure regression (B-01~B-04) ───────────────────────────────
test('static server never exposes private paths', async () => {
  const forbidden = [
    '/server.js', '/config/local.json', '/%2e%2e/config/local.json',
    '/data/aegis.db', '/server/store.js', '/server/oidc.js',
    '/config/local.json.bak',
  ];
  for (const p of forbidden) {
    const r = await fetch(BASE + p);
    assert.ok(r.status === 404 || r.status === 403, `${p} should be denied, got ${r.status}`);
  }
});

test('metrics endpoint is fail-closed behind AEGIS_METRICS_TOKEN', async () => {
  const noTok = await fetch(`${BASE}/metrics`);
  assert.equal(noTok.status, 401);
  const wrong = await fetch(`${BASE}/metrics`, { headers: { authorization: 'Bearer nope' } });
  assert.equal(wrong.status, 401);
  const ok = await fetch(`${BASE}/metrics?token=${SECRET}`);
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /aegis_uptime_seconds/);
});

test('static assets reject non-GET/HEAD methods with 405', async () => {
  const STATIC = `${BASE}/aegis-shell/console.html`;
  for (const m of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const r = await fetch(STATIC, { method: m });
    assert.equal(r.status, 405, `${m} on static path should be 405, got ${r.status}`);
    assert.ok(/GET/i.test(r.headers.get('allow') || ''), `${m} should advertise GET in Allow`);
  }
  const get = await fetch(STATIC);
  assert.equal(get.status, 200);
});

test('/session is fail-closed without credential', async () => {
  const noCred = await fetch(`${BASE}/session?room=probe`);
  assert.equal(noCred.status, 401);
  const wrong = await fetch(`${BASE}/session?room=probe`, { headers: { authorization: 'Bearer nope' } });
  assert.equal(wrong.status, 401);
});

// ── A2: operator compliance API ──────────────────────────────────────────────
test('compliance facts round-trip (PUT then GET)', async () => {
  const put = await fetch(`${BASE}/api/compliance`, {
    method: 'PUT', headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: j({ controller: { legalName: 'Acme GmbH', address: 'Berlin', regNo: 'HRB 1' }, dpo: { email: 'dpo@acme.example' }, governingLaw: 'DE' }),
  });
  assert.equal(put.status, 200);
  const get = await fetch(`${BASE}/api/compliance`, { headers: { Authorization: AUTH } });
  assert.equal(get.status, 200);
  const cfg = await get.json();
  assert.equal(cfg.controller.legalName, 'Acme GmbH');
  assert.equal(cfg.dpo.email, 'dpo@acme.example');
});

test('factory gate blocks incomplete compliance docs with 409', async () => {
  // Partial facts (no sla.mailbox / sla.timezone / euRep.name) must NOT issue a doc.
  // Use DPIA (form-only gated, no upload-kind equivalence) so the assertion does not
  // depend on any signed docs a customer may have uploaded into the shared data dir.
  await fetch(`${BASE}/api/compliance`, {
    method: 'PUT', headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: j({ controller: { legalName: 'Acme GmbH', address: 'Berlin', regNo: 'HRB 1' }, dpo: { email: 'dpo@acme.example' } }),
  });
  const r = await fetch(`${BASE}/api/compliance/doc/DPIA`, { headers: { Authorization: AUTH } });
  assert.equal(r.status, 409);
  assert.equal(r.headers.get('X-Aegis-Compliance'), 'not-ready');
  const body = await r.json();
  assert.ok(Array.isArray(body.missing) && body.missing.length > 0);
});

test('filled ROPA substitutes operator facts into tokens', async () => {
  // Supply the full required set so the factory gate clears and issues the doc.
  await fetch(`${BASE}/api/compliance`, {
    method: 'PUT', headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: j({
      controller: { legalName: 'Acme GmbH', address: 'Berlin', regNo: 'HRB 1' },
      dpo: { email: 'dpo@acme.example' },
      sla: { mailbox: 'sla@acme.example', timezone: 'Europe/Berlin' },
      euRep: { name: 'Acme EU Rep Ltd' },
      ropa: { purpose: 'document cleansing', retention: '12 months', recipients: 'none', legalBasis: 'Art. 6(1)(f)' },
    }),
  });
  const r = await fetch(`${BASE}/api/compliance/doc/ROPA`, { headers: { Authorization: AUTH } });
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.match(text, /Acme GmbH/);
  assert.match(text, /Berlin/);
  assert.match(text, /document cleansing/);
});

test('uploaded signed doc lifts the gate for its kind', async () => {
  // Clear operator facts so ONLY an uploaded signed copy can satisfy the gate.
  await fetch(`${BASE}/api/compliance`, {
    method: 'PUT', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: j({}),
  });
  const up = await fetch(`${BASE}/api/compliance/upload`, {
    method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: j({ name: 'ROPA-signed.pdf', kind: 'ROPA', mime: 'application/pdf', data: Buffer.from('signed').toString('base64') }),
  });
  assert.equal(up.status, 200);
  const { id } = await up.json();
  const r = await fetch(`${BASE}/api/compliance/doc/ROPA`, { headers: { Authorization: AUTH } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('X-Aegis-Source'), 'uploaded');
  // cleanup so the uploaded file does not linger in the data dir
  await fetch(`${BASE}/api/compliance/file/${id}`, { method: 'DELETE', headers: { Authorization: AUTH } });
});

test('blank template endpoint returns unfilled placeholders', async () => {
  const r = await fetch(`${BASE}/api/compliance/template/ROPA`, { headers: { Authorization: AUTH } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('X-Aegis-Source'), 'template');
  const text = await r.text();
  assert.match(text, /\{\{CONTROLLER_LEGAL_NAME\}\}/);
  assert.match(text, /TEMPLATE — UNFILLED/);
});

test('document upload / download / delete lifecycle', async () => {
  const b64 = Buffer.from('hello compliance').toString('base64');
  const up = await fetch(`${BASE}/api/compliance/upload`, {
    method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: j({ name: 'ROPA-signed.pdf', kind: 'ROPA', mime: 'application/pdf', data: b64 }),
  });
  assert.equal(up.status, 200);
  const { id } = await up.json();
  const dl = await fetch(`${BASE}/api/compliance/file/${id}`, { headers: { Authorization: AUTH } });
  assert.equal(dl.status, 200);
  assert.equal(Buffer.from(await dl.arrayBuffer()).toString(), 'hello compliance');
  const del = await fetch(`${BASE}/api/compliance/file/${id}`, { method: 'DELETE', headers: { Authorization: AUTH } });
  assert.equal(del.status, 200);
});

test('compliance API rejects unauthenticated access', async () => {
  const r = await fetch(`${BASE}/api/compliance`);
  assert.equal(r.status, 401);
});

test('compliance upload rejects oversize payload', async () => {
  const big = 'A'.repeat(13_000_000); // ~9.75 MB decoded — exceeds the 9 MB cap
  const r = await fetch(`${BASE}/api/compliance/upload`, {
    method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: j({ name: 'x', kind: 'ROPA', mime: 'application/octet-stream', data: big }),
  });
  assert.equal(r.status, 413);
});
