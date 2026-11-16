// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis/zero-knowledge-identity/tests/crypto.test.mjs
// Headless assertions over the real Web Crypto path (Node 18+ ships the same
// `crypto.subtle` the browser uses, so these are not mocks).

import test from 'node:test';
import assert from 'node:assert/strict';

import { bytesToBase64, base64ToBytes } from '../src/base64.js';
import {
  KDF,
  generateKeyPair,
  exportPublicKeyBase64,
  importPublicKeyBase64,
  fingerprintOf,
  wrapPrivateKey,
  unwrapPrivateKey,
  signMessage,
  verifyMessage,
} from '../src/crypto.js';

const PASSPHRASE = 'correct horse battery staple';

test('base64 round-trips every length from 0 to 64 bytes', () => {
  for (let length = 0; length <= 64; length += 1) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) bytes[i] = (i * 37 + 11) & 0xff;
    const text = bytesToBase64(bytes);
    assert.deepEqual(base64ToBytes(text), bytes, `length ${length}`);
  }
});

test('base64 rejects characters outside the alphabet', () => {
  assert.throws(() => base64ToBytes('!!!!'), /Invalid Base64/);
});

test('generates a P-256 key pair and exports an importable SPKI public key', async () => {
  const pair = await generateKeyPair();
  assert.equal(pair.publicKey.type, 'public');
  assert.equal(pair.privateKey.type, 'private');

  const spki = await exportPublicKeyBase64(pair.publicKey);
  assert.match(spki, /^[A-Za-z0-9+/]+={0,2}$/);

  // Re-importing the Base64 must yield the same key, proved by the fingerprint.
  const reimported = await importPublicKeyBase64(spki);
  assert.equal(await fingerprintOf(reimported), await fingerprintOf(pair.publicKey));
});

test('fingerprint is stable, 64 hex characters, and formatted in groups of four', async () => {
  const pair = await generateKeyPair();
  const first = await fingerprintOf(pair.publicKey);
  const second = await fingerprintOf(pair.publicKey);
  assert.equal(first, second);
  assert.match(first, /^SHA256:([0-9A-F]{4} ){15}[0-9A-F]{4}$/);
  assert.equal(first.replace(/^SHA256:/, '').replace(/[^0-9A-F]/g, '').length, 64);
});

test('different key pairs never share a fingerprint', async () => {
  const a = await generateKeyPair();
  const b = await generateKeyPair();
  assert.notEqual(await fingerprintOf(a.publicKey), await fingerprintOf(b.publicKey));
});

test('wraps and unwraps the private key with the same passphrase', async () => {
  const pair = await generateKeyPair();
  const wrapped = await wrapPrivateKey(pair.privateKey, PASSPHRASE);

  assert.equal(wrapped.cipher, 'AES-GCM-256');
  assert.equal(wrapped.kdf, 'PBKDF2-SHA256');
  assert.equal(wrapped.iterations, KDF.iterations);
  assert.ok(wrapped.salt.length > 0 && wrapped.iv.length > 0 && wrapped.ciphertext.length > 32);

  const unwrapped = await unwrapPrivateKey(wrapped, PASSPHRASE);
  const signature = await signMessage(unwrapped, 'sealed-material-proof');
  assert.equal(await verifyMessage(pair.publicKey, signature, 'sealed-material-proof'), true);
});

test('wrapped blob contains no plaintext PKCS#8 material', async () => {
  const pair = await generateKeyPair();
  const wrapped = await wrapPrivateKey(pair.privateKey, PASSPHRASE);
  const serialized = JSON.stringify(wrapped);
  assert.equal(serialized.includes('pkcs8'), false);
  assert.equal(serialized.includes('BEGIN'), false);
});

test('a wrong passphrase fails loudly instead of returning a key', async () => {
  const pair = await generateKeyPair();
  const wrapped = await wrapPrivateKey(pair.privateKey, PASSPHRASE);
  await assert.rejects(
    () => unwrapPrivateKey(wrapped, 'wrong passphrase'),
    /Unlock failed: wrong passphrase or corrupted vault record/,
  );
});

test('tampering with the wrapped ciphertext is detected by AES-GCM', async () => {
  const pair = await generateKeyPair();
  const wrapped = await wrapPrivateKey(pair.privateKey, PASSPHRASE);
  const bytes = base64ToBytes(wrapped.ciphertext);
  bytes[Math.floor(bytes.length / 2)] ^= 0xff;
  await assert.rejects(
    () => unwrapPrivateKey({ ...wrapped, ciphertext: bytesToBase64(bytes) }, PASSPHRASE),
    /Unlock failed/,
  );
});

test('passphrases shorter than eight characters are refused at wrap time', async () => {
  const pair = await generateKeyPair();
  await assert.rejects(() => wrapPrivateKey(pair.privateKey, 'short'), /at least 8 characters/);
});

test('the plaintext PKCS#8 buffer is wiped before wrapping resolves', async () => {
  const pair = await generateKeyPair();
  const subtle = globalThis.crypto.subtle;
  const originalEncrypt = subtle.encrypt;
  let captured = null;

  // Hold a reference to the exact buffer handed to AES-GCM, then inspect it
  // after wrapPrivateKey() returns.
  subtle.encrypt = async (algorithm, key, data) => {
    captured = data instanceof Uint8Array ? data : new Uint8Array(data);
    return originalEncrypt.call(subtle, algorithm, key, data);
  };
  try {
    await wrapPrivateKey(pair.privateKey, PASSPHRASE);
  } finally {
    subtle.encrypt = originalEncrypt;
  }

  assert.ok(captured && captured.length > 0, 'wrap must have encrypted a PKCS#8 buffer');
  assert.ok(
    captured.every((byte) => byte === 0),
    'the plaintext private key must be zeroed once wrapping returns',
  );
});

test('ECDSA signatures verify only against the signed bytes', async () => {
  const pair = await generateKeyPair();
  const signature = await signMessage(pair.privateKey, 'engineer-a');
  assert.equal(await verifyMessage(pair.publicKey, signature, 'engineer-a'), true);
  assert.equal(await verifyMessage(pair.publicKey, signature, 'engineer-b'), false);
});
