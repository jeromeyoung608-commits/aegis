// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// tests/crypto.test.mjs — zero-dependency unit tests for the crypto layer.
// Run with: npm test   (uses node: built-in test runner, no third-party deps)
//
// These prove the AES-GCM + PBKDF2 primitives behave correctly and that the
// authentication guarantee holds (wrong key / tampering => hard failure).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveKey, encryptChunk, decryptChunk, SALT_LEN, IV_LEN, bufToB64, b64ToBuf } from '../src/crypto.js';

// Node 20+ exposes Web Crypto globally; pin it just in case.
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}

test('AES-GCM round-trips a chunk with a fresh IV each call', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await deriveKey('geheim-raum-123', salt);
  const plaintext = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 0, 42]);

  const a = await encryptChunk(key, plaintext);
  const b = await encryptChunk(key, plaintext);

  assert.equal(a.iv.length, IV_LEN, 'IV must be 12 bytes');
  assert.notDeepEqual([...a.iv], [...b.iv], 'IVs must differ between chunks (random)');

  const ptA = await decryptChunk(key, a.iv, a.ciphertext);
  const ptB = await decryptChunk(key, b.iv, b.ciphertext);
  assert.deepEqual([...ptA], [...plaintext], 'decrypt(A) must match');
  assert.deepEqual([...ptB], [...plaintext], 'decrypt(B) must match');
});

test('wrong passphrase can NEVER decrypt (authentication failure)', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const good = await deriveKey('correct horse', salt);
  const bad = await deriveKey('wrong horse', salt);

  const { iv, ciphertext } = await encryptChunk(good, new Uint8Array([9, 9, 9, 9]));
  await assert.rejects(() => decryptChunk(bad, iv, ciphertext), 'decrypt with wrong key must reject');
});

test('tampered ciphertext is rejected (integrity)', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await deriveKey('p@ss', salt);
  const { iv, ciphertext } = await encryptChunk(key, new Uint8Array([1, 2, 3, 4, 5]));

  // flip one byte of the ciphertext
  const tampered = ciphertext.slice();
  tampered[0] ^= 0xff;
  await assert.rejects(() => decryptChunk(key, iv, tampered), 'tampered data must fail GCM auth');
});

test('salt base64 round-trips (used inside the meta message)', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const back = b64ToBuf(bufToB64(salt));
  assert.deepEqual([...back], [...salt], 'salt b64 round-trip');
});

test('same passphrase + same salt => identical key (peer interop)', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const k1 = await deriveKey('shared', salt);
  const k2 = await deriveKey('shared', salt);
  const p = new Uint8Array([7, 7, 7]);
  const { iv, ciphertext } = await encryptChunk(k1, p);
  const pt = await decryptChunk(k2, iv, ciphertext); // decrypt with the "other peer" key
  assert.deepEqual([...pt], [...p], 'different deriveKey calls with same inputs interop');
});
