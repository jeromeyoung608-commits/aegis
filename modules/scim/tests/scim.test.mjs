// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// SCIM 2.0 tests: account deprovisioning blocks login (store-level), and the
// Aegis SCIM endpoints (CRUD + PATCH active:false + DELETE deactivate) over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url).pathname;

function startServer(env) {
  return new Promise((resolve, reject) => {
    const port = env.PORT || '8138';
    const dbFile = env.AEGIS_DB || ('/tmp/aegis-scim-' + port + '.db');
    try { rmSync(dbFile); } catch {}
    const proc = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: { ...process.env, AEGIS_DB: dbFile, AEGIS_ISSUER_SECRET: 'test-secret', ...env, PORT: port },
      stdio: 'ignore',
    });
    const t0 = Date.now();
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/healthz`, (res) => { res.resume(); resolve({ proc, port: Number(port) }); });
      req.on('error', () => {
        if (Date.now() - t0 > 6000) reject(new Error('server start timeout'));
        else setTimeout(tick, 150);
      });
    };
    tick();
  });
}
function stopServer(s) { try { s.proc.kill('SIGKILL'); } catch {} }
function req(port, method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers, ...(data ? {} : {}) },
    }, (res) => {
      let buf = '';
      res.on('data', (d) => { buf += d; });
      res.on('end', () => {
        let json = null;
        try { json = buf ? JSON.parse(buf) : null; } catch {}
        resolve({ status: res.statusCode, body: json, location: res.headers.location });
      });
    });
    r.on('error', () => resolve({ status: 0, body: null }));
    if (data) r.write(data);
    r.end();
  });
}

test('store: a deprovisioned (enabled=0) account fails verifyAccount', async () => {
  const dbFile = '/tmp/aegis-store-test-' + process.pid + '.db';
  try { rmSync(dbFile); } catch {}
  process.env.AEGIS_DB = dbFile;
  const store = await import('../../../server/store.js');
  store.initStore();
  const u = 'scimstore-' + Date.now();
  assert.ok(store.createAccount(u, 'known-pw', 'operator'));
  assert.ok(store.verifyAccount(u, 'known-pw'));
  store.setAccountEnabled(u, 0);
  assert.equal(store.getAccount(u).enabled, 0);
  assert.equal(store.verifyAccount(u, 'known-pw'), false); // disabled -> 401
  store.setAccountEnabled(u, 1);
  assert.ok(store.verifyAccount(u, 'known-pw'));
});

test('SCIM returns 503 when AEGIS_SCIM_TOKEN is unset', async () => {
  const srv = await startServer({ PORT: '8138' });
  try { assert.equal((await req(srv.port, 'GET', '/scim/v2/Users', null, {})).status, 503); }
  finally { stopServer(srv); }
});

test('SCIM CRUD + deprovisioning (PATCH active:false, DELETE deactivates — keeps audit)', async () => {
  const srv = await startServer({ PORT: '8150', AEGIS_SCIM_TOKEN: 'scim-secret' });
  const auth = { Authorization: 'Bearer scim-secret' };
  try {
    assert.equal((await req(srv.port, 'GET', '/scim/v2/Users', null, {})).status, 401); // no token
    const created = await req(srv.port, 'POST', '/scim/v2/Users', { userName: 'op1', active: true, roles: ['operator'] }, auth);
    assert.equal(created.status, 201);
    assert.equal(created.body.userName, 'op1');
    assert.equal(created.body.active, true);

    const list = await req(srv.port, 'GET', '/scim/v2/Users', null, auth);
    assert.equal(list.status, 200);
    assert.ok(list.body.Resources.some((x) => x.userName === 'op1'));

    const read = await req(srv.port, 'GET', '/scim/v2/Users/op1', null, auth);
    assert.equal(read.status, 200);

    const patch = await req(srv.port, 'PATCH', '/scim/v2/Users/op1',
      { schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'replace', path: 'active', value: false }] }, auth);
    assert.equal(patch.status, 200);
    assert.equal(patch.body.active, false);

    const del = await req(srv.port, 'DELETE', '/scim/v2/Users/op1', null, auth);
    assert.equal(del.status, 204);
    const after = await req(srv.port, 'GET', '/scim/v2/Users/op1', null, auth);
    assert.equal(after.status, 200); // account retained (audit preserved), deactivated
    assert.equal(after.body.active, false);
  } finally { stopServer(srv); }
});

test('SCIM: a user created with `password` can actually log in; disabling blocks it again', async () => {
  const srv = await startServer({ PORT: '8151', AEGIS_SCIM_TOKEN: 'scim-secret' });
  const auth = { Authorization: 'Bearer scim-secret' };
  try {
    const created = await req(srv.port, 'POST', '/scim/v2/Users', { userName: 'pwuser', password: 'correct-horse-9' }, auth);
    assert.equal(created.status, 201);
    assert.equal(created.body.password, undefined); // never echo secrets
    const ok = await req(srv.port, 'POST', '/auth/login', { username: 'pwuser', password: 'correct-horse-9' }, {});
    assert.equal(ok.status, 200, 'provisioned password must authenticate');
    assert.ok(ok.body.token);
    const short = await req(srv.port, 'POST', '/scim/v2/Users', { userName: 'shortpw', password: 'x' }, auth);
    assert.equal(short.status, 400);
    await req(srv.port, 'PATCH', '/scim/v2/Users/pwuser', { Operations: [{ op: 'replace', path: 'active', value: false }] }, auth);
    assert.equal((await req(srv.port, 'POST', '/auth/login', { username: 'pwuser', password: 'correct-horse-9' }, {})).status, 401);
  } finally { stopServer(srv); }
});

test('static surface: config/data/server paths are never served (B-01/B-01b/B-02/B-04)', async () => {
  const srv = await startServer({ PORT: '8152' });
  try {
    for (const p of ['/config/local.json', '/%2e%2e/config/local.json', '/%252e%252e/config/local.json',
      '/data/aegis.db', '/data/aegis.db-wal', '/server/store.js', '/server/oidc.js',
      '/aegis-shell/../../../config/local.json']) {
      const r = await req(srv.port, 'GET', p, null, {});
      assert.ok(r.status === 404 || r.status === 403, `${p} must be 403/404 (got ${r.status})`);
    }
    // The legitimate runtime `data` dir must NOT be collateral damage.
    assert.equal((await req(srv.port, 'GET', '/modules/webgpu-topology/src/data/generate.js', null, {})).status, 200);
    assert.equal((await req(srv.port, 'GET', '/aegis-shell/index.html', null, {})).status, 200);
  } finally { stopServer(srv); }
});
