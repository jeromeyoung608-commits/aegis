// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// tests/crypto.test.mjs — Web Crypto signing/verification primitives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateKeyPair, exportPublicKey, sha256, sign, verify, hexEq,
} from '../src/sdk/crypto.js';

test('sha256 known vector (empty input)', async () => {
  const { hex } = await sha256(new Uint8Array(0));
  assert.equal(hex, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('ECDSA sign/verify roundtrip', async () => {
  const kp = await generateKeyPair();
  const pub = await exportPublicKey(kp.publicKey);
  const data = new Uint8Array(32).map((_, i) => i);
  const sig = await sign(kp.privateKey, data);
  assert.ok(await verify(pub, data, sig), 'valid signature must verify');
  const bad = data.slice();
  bad[0] ^= 0xff;
  assert.equal(await verify(pub, bad, sig), false, 'tampered data must fail');
});

test('signature does not verify under the wrong public key', async () => {
  const a = await generateKeyPair();
  const b = await generateKeyPair();
  const data = new Uint8Array([1, 2, 3, 4]);
  const sig = await sign(a.privateKey, data);
  assert.equal(await verify(await exportPublicKey(b.publicKey), data, sig), false);
});

test('hexEq compares content, not length', () => {
  assert.ok(hexEq('abcd', 'abcd'));
  assert.equal(hexEq('abcd', 'abce'), false);
  assert.equal(hexEq('abcd', 'abc'), false);
});
