// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Zero-dependency OIDC tests: id_token verification (RS256), discovery / token
// exchange / JWKS against an in-process mock IdP, and the Aegis OIDC dispatch.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { discover, exchangeCode, fetchJwks, verifyIdToken } from '../../../server/oidc.js';

const ROOT = new URL('../../../', import.meta.url).pathname;

function makeToken(privKey, payload, headerExtra = {}) {
  const header = { alg: 'RS256', kid: 'k1', ...headerExtra };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(input), privKey).toString('base64url');
  return `${input}.${sig}`;
}

function startServer(env) {
  return new Promise((resolve, reject) => {
    const port = env.PORT || '8137';
    const dbFile = env.AEGIS_DB || ('/tmp/aegis-oidc-' + port + '.db');
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
function get(port, path) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:${port}${path}`, (res) => { res.resume(); resolve({ status: res.statusCode, location: res.headers.location }); })
      .on('error', () => resolve({ status: 0, location: '' }));
  });
}

test('verifyIdToken: valid RS256 token verifies and returns claims', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: 'https://idp.example', aud: 'client-1', exp: now + 300, nonce: 'n1', sub: 'u1', email: 'u1@example.com' };
  const token = makeToken(privateKey, payload);
  const p = verifyIdToken(token, { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks: { keys: [publicKey.export({ format: 'jwk' })] } });
  assert.equal(p.sub, 'u1');
  assert.equal(p.email, 'u1@example.com');
});

test('verifyIdToken: tampered signature is rejected', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const token = makeToken(privateKey, { iss: 'https://idp.example', aud: 'client-1', exp: now + 300, nonce: 'n1' });
  const tampered = token.slice(0, -4) + 'AAAA';
  assert.throws(() => verifyIdToken(tampered, { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks: { keys: [publicKey.export({ format: 'jwk' })] } }), /signature/);
});

test('verifyIdToken: issuer / audience / expiry / nonce mismatches rejected', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwks = { keys: [publicKey.export({ format: 'jwk' })] };
  const now = Math.floor(Date.now() / 1000);
  const base = { iss: 'https://idp.example', aud: 'client-1', exp: now + 300, nonce: 'n1' };
  const sign = (p) => makeToken(privateKey, p);
  assert.throws(() => verifyIdToken(sign({ ...base, iss: 'https://evil' }), { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks }), /issuer/);
  assert.throws(() => verifyIdToken(sign({ ...base, aud: 'other' }), { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks }), /audience/);
  assert.throws(() => verifyIdToken(sign({ ...base, exp: now - 120 }), { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks }), /expired/);
  assert.throws(() => verifyIdToken(sign({ ...base, nonce: 'wrong' }), { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks }), /nonce/);
});

test('verifyIdToken: non-RS256 alg is rejected', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const token = makeToken(privateKey, { iss: 'https://idp.example', aud: 'client-1', exp: now + 300, nonce: 'n1' }, { alg: 'HS256' });
  assert.throws(() => verifyIdToken(token, { issuer: 'https://idp.example', clientId: 'client-1', nonce: 'n1', jwks: { keys: [publicKey.export({ format: 'jwk' })] } }), /alg/);
});

test('discover + exchange + fetchJwks against an in-process mock IdP', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const idToken = makeToken(privateKey, { iss: 'https://idp.local', aud: 'client-x', exp: Math.floor(Date.now() / 1000) + 300, nonce: 'n1', sub: 'sub-x' });
  let base;
  const server = http.createServer((req, res) => {
    if (req.url === '/.well-known/openid-configuration') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ issuer: 'https://idp.local', token_endpoint: `${base}/token`, jwks_uri: `${base}/jwks` }));
    } else if (req.url === '/token') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ access_token: 'at', token_type: 'Bearer', id_token: idToken }));
    } else if (req.url === '/jwks') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [publicKey.export({ format: 'jwk' })] }));
    } else { res.statusCode = 404; res.end(); }
  });
  await new Promise((r) => server.listen(0, r));
  const addr = server.address();
  base = `http://127.0.0.1:${addr.port}`;
  try {
    const disco = await discover(base);
    assert.equal(disco.token_endpoint, `${base}/token`);
    const tok = await exchangeCode(`${base}/token`, { clientId: 'client-x', code: 'c' });
    assert.equal(tok.id_token, idToken);
    const jwks = await fetchJwks(`${base}/jwks`);
    assert.equal(jwks.keys[0].kty, 'RSA');
    const payload = verifyIdToken(tok.id_token, { issuer: 'https://idp.local', clientId: 'client-x', nonce: 'n1', jwks });
    assert.equal(payload.sub, 'sub-x');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('Aegis OIDC dispatch: 503 when unconfigured, 302 + nonce when configured, 400 on callback without code', async () => {
  let srv = await startServer({ PORT: '8141' });
  try { assert.equal((await get(srv.port, '/auth/oidc/start')).status, 503); }
  finally { stopServer(srv); }

  srv = await startServer({ PORT: '8142', AEGIS_AUTH_MODE: 'oidc', AEGIS_OIDC_ISSUER: 'https://idp.example', AEGIS_OIDC_CLIENT_ID: 'client-1' });
  try {
    const r = await get(srv.port, '/auth/oidc/start');
    assert.equal(r.status, 302);
    assert.match(r.location, /https:\/\/idp\.example/);
    assert.match(r.location, /nonce=/);
    assert.equal((await get(srv.port, '/auth/oidc/callback')).status, 400);
  } finally { stopServer(srv); }
});
