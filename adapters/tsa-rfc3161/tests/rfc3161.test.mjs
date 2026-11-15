// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// adapters/tsa-rfc3161/tests/rfc3161.test.mjs — unit + integration tests.
//
// Verifies: DER request encoding, TSTInfo extraction from a CMS fixture, input
// schema, fail-safe behavior on an unreachable TSA, and a successful round-trip
// against a local mock TSA. No third-party TSA is contacted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createTsaAdapter } from '../index.js';
import { buildTimeStampReq, parseTimeStampToken, _buildCmsFixture } from '../rfc3161-client.js';
import { validateInput, buildOutput } from '../schema.js';

const DIGEST = 'a'.repeat(64);

test('buildTimeStampReq: SEQUENCE that embeds the digest', () => {
  const req = buildTimeStampReq(DIGEST, { requestNonce: true });
  assert.ok(Buffer.isBuffer(req));
  assert.equal(req[0], 0x30, 'outer tag is SEQUENCE');
  assert.ok(req.includes(Buffer.from(DIGEST, 'hex')), 'digest bytes present');
});

test('parseTimeStampToken: extracts genTime / serialNumber / nonce', () => {
  const genTime = '2026-11-13T10:00:00Z';
  const serial = '12345678901234567890';
  const nonce = BigInt('0xabcd1234').toString(10); // fixture takes a DECIMAL integer string
  const token = _buildCmsFixture({ genTime, serialNumber: serial, nonce });
  const info = parseTimeStampToken(token);
  assert.equal(info.genTime, new Date(genTime).toISOString());
  assert.equal(info.serialNumber, serial);
  assert.equal(info.nonce, nonce);
});

test('validateInput: accepts good, rejects bad', () => {
  assert.equal(validateInput({ digest: DIGEST }).ok, true);
  assert.equal(validateInput({ digest: 'zz' }).ok, false, 'bad hex');
  assert.equal(validateInput({ digest: DIGEST, digestAlgorithm: 'sha1' }).ok, false, 'only sha256');
  assert.equal(validateInput(null).ok, false, 'null');
  assert.equal(validateInput({ digest: DIGEST, tsaAuth: { type: 'weird' } }).ok, false, 'bad auth type');
});

test('buildOutput: fixed schema + verifyHint', () => {
  const o = buildOutput({ tsaStatus: 'ok', originalDigest: DIGEST, timestampTokenBase64: 'QQ==', tstInfo: { genTime: 'x', serialNumber: '1', nonce: '2' } });
  assert.equal(o.tsaStatus, 'ok');
  assert.ok('verifyHint' in o);
  assert.deepEqual(o.tstInfo, { genTime: 'x', serialNumber: '1', nonce: '2' });
});

test('submit: fails safe on unreachable TSA (never throws)', async () => {
  // Loopback is refused by default; the test opts in explicitly to exercise the
  // network-failure path rather than the egress policy.
  const adapter = createTsaAdapter({ timeoutMs: 1000, allowClientEndpoint: true, allowPrivateHosts: true });
  const res = await adapter.submit({ digest: DIGEST, tsaEndpoint: 'http://127.0.0.1:1/tsr' });
  assert.equal(res.tsaStatus, 'failed');
  assert.equal(res.originalDigest, DIGEST);
  assert.ok(res.error, 'error explaining the failure');
});

test('submit: returns raw token via a local mock TSA', async () => {
  const token = _buildCmsFixture({ genTime: '2026-11-13T10:00:00Z', serialNumber: '42', nonce: '99' });
  const srv = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/timestamp-reply');
    res.end(token);
  });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const adapter = createTsaAdapter({ timeoutMs: 2000, provider: 'mock', allowClientEndpoint: true, allowPrivateHosts: true });
  const res = await adapter.submit({ digest: DIGEST, tsaEndpoint: `http://127.0.0.1:${port}/tsr` });
  assert.equal(res.tsaStatus, 'ok');
  assert.equal(res.timestampTokenBase64, token.toString('base64'), 'raw token passed through');
  assert.equal(res.tstInfo.serialNumber, '42');
  assert.equal(res.tsaProvider, 'mock');
  srv.closeAllConnections?.();
  srv.close();
});

test('submit: rejects invalid input without throwing', async () => {
  const adapter = createTsaAdapter();
  const res = await adapter.submit({ digest: 'not-hex' });
  assert.equal(res.tsaStatus, 'failed');
  assert.match(res.error, /digest/);
});

test('checkAccess: honors AEGIS_ADAPTER_TOKEN', () => {
  const adapter = createTsaAdapter();
  const prev = process.env.AEGIS_ADAPTER_TOKEN;
  process.env.AEGIS_ADAPTER_TOKEN = 'secret';
  assert.equal(adapter.checkAccess({ headers: {} }).ok, false, 'missing token rejected');
  assert.equal(adapter.checkAccess({ headers: { authorization: 'Bearer secret' } }).ok, true, 'valid token allowed');
  if (prev === undefined) delete process.env.AEGIS_ADAPTER_TOKEN;
  else process.env.AEGIS_ADAPTER_TOKEN = prev;
});

test('checkAccess: role gate (Auditor cannot submit when allowRoles set)', () => {
  const adapter = createTsaAdapter({ allowRoles: ['operator', 'admin'] });
  assert.equal(adapter.checkAccess({ headers: { 'x-aegis-role': 'auditor' } }).ok, false, 'auditor blocked');
  assert.equal(adapter.checkAccess({ headers: { 'x-aegis-role': 'admin' } }).ok, true, 'admin allowed');
});
