// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAGIC,
  VERSION,
  openContainer,
  parseContainer,
  sealContainer,
  verifyDigest,
} from '../src/container.js';

const PASSPHRASE = 'correct horse battery staple';
const encoder = new TextEncoder();

function bytesOf(text) {
  return encoder.encode(text);
}

function sample() {
  return {
    bytes: bytesOf('CONFIDENTIAL CONTRACT — payload bytes 0123456789'),
    metadata: {
      name: 'top-secret-name.pdf',
      type: 'application/pdf',
      verdict: { ok: true, signers: [{ id: 'A', ok: true }] },
    },
  };
}

function rewriteHeader(container, mutate) {
  const view = new DataView(container.buffer, container.byteOffset, container.byteLength);
  const headerLength = view.getUint32(MAGIC.length + 1, false);
  const start = 8 + 1 + 4;
  const header = JSON.parse(new TextDecoder().decode(container.subarray(start, start + headerLength)));
  mutate(header);
  const headerBytes = encoder.encode(JSON.stringify(header));
  const tail = container.subarray(start + headerLength);
  const out = new Uint8Array(start + headerBytes.length + tail.length);
  out.set(container.subarray(0, 8), 0);
  out[MAGIC.length] = VERSION;
  new DataView(out.buffer).setUint32(MAGIC.length + 1, headerBytes.length, false);
  out.set(headerBytes, start);
  out.set(tail, start + headerBytes.length);
  return out;
}

test('a sealed container round-trips bytes and metadata', async () => {
  const { bytes, metadata } = sample();
  const container = await sealContainer({ bytes, metadata, passphrase: PASSPHRASE });

  const opened = await openContainer(container, PASSPHRASE);
  assert.deepEqual([...opened.bytes], [...bytes]);
  assert.deepEqual(opened.metadata, metadata);
  assert.equal(opened.header.alg, 'AES-GCM-256');
});

test('the container carries a parseable public header without a passphrase', async () => {
  const container = await sealContainer({ ...sample(), passphrase: PASSPHRASE });
  const { header, ciphertext } = parseContainer(container);
  assert.equal(header.v, VERSION);
  assert.equal(header.kdf, 'PBKDF2-SHA-256');
  assert.equal(header.iterations, 250_000);
  assert.ok(ciphertext.length > 0);
  assert.equal(await verifyDigest(container), true);
});

test('file bytes and metadata are not visible in the container', async () => {
  const { bytes, metadata } = sample();
  const container = await sealContainer({ bytes, metadata, passphrase: PASSPHRASE });
  const haystack = new TextDecoder().decode(container);

  assert.ok(!haystack.includes('CONFIDENTIAL CONTRACT'));
  assert.ok(!haystack.includes('top-secret-name.pdf'));
  assert.ok(haystack.includes('AES-GCM-256'), 'algorithm name is allowed in the header');
});

test('the wrong passphrase fails with a clear unlock error', async () => {
  const container = await sealContainer({ ...sample(), passphrase: PASSPHRASE });
  await assert.rejects(
    () => openContainer(container, 'not-the-right-passphrase'),
    /Vault unlock failed: wrong passphrase or corrupted record\./,
  );
});

test('flipping one ciphertext byte is caught by the digest and by AES-GCM', async () => {
  const container = await sealContainer({ ...sample(), passphrase: PASSPHRASE });
  const tampered = Uint8Array.from(container);
  tampered[tampered.length - 20] ^= 0x01;

  assert.equal(await verifyDigest(tampered), false);
  await assert.rejects(() => openContainer(tampered, PASSPHRASE), /integrity check failed/);
});

test('a forged digest still cannot bypass AES-GCM authentication', async () => {
  const container = await sealContainer({ ...sample(), passphrase: PASSPHRASE });
  const tampered = Uint8Array.from(container);
  tampered[tampered.length - 20] ^= 0x01;

  // Recompute the digest so the cheap pre-check passes, as an attacker would.
  const { createHash } = await import('node:crypto');
  const { parseContainer: parse } = await import('../src/container.js');
  const { ciphertext } = parse(tampered);
  const forged = createHash('sha256').update(ciphertext).digest('hex');

  const repaired = rewriteHeader(tampered, (header) => { header.digest = forged; });
  assert.equal(await verifyDigest(repaired), true);
  await assert.rejects(() => openContainer(repaired, PASSPHRASE), /Vault unlock failed/);
});

test('a container with a broken magic is rejected before any crypto work', async () => {
  const container = await sealContainer({ ...sample(), passphrase: PASSPHRASE });
  const broken = Uint8Array.from(container);
  broken[0] = 0x58;
  await assert.rejects(() => openContainer(broken, PASSPHRASE), /bad magic/);
});

test('a truncated container is rejected', async () => {
  const container = await sealContainer({ ...sample(), passphrase: PASSPHRASE });
  await assert.rejects(
    () => openContainer(container.subarray(0, 20), PASSPHRASE),
    /truncated|malformed/,
  );
});

test('a short passphrase is rejected before sealing', async () => {
  await assert.rejects(
    () => sealContainer({ bytes: bytesOf('x'), passphrase: 'short' }),
    /at least 8 characters/,
  );
});

test('the plaintext staging buffer is wiped once sealing returns', async () => {
  const { bytes, metadata } = sample();
  const subtle = globalThis.crypto.subtle;
  const originalEncrypt = subtle.encrypt;
  let captured = null;

  subtle.encrypt = async (algorithm, key, data) => {
    captured = data instanceof Uint8Array ? data : new Uint8Array(data);
    return originalEncrypt.call(subtle, algorithm, key, data);
  };
  try {
    await sealContainer({ bytes, metadata, passphrase: PASSPHRASE });
  } finally {
    subtle.encrypt = originalEncrypt;
  }

  assert.ok(captured && captured.length > bytes.length, 'the payload includes metadata + bytes');
  assert.ok(captured.every((byte) => byte === 0), 'plaintext must be zeroed after sealing');
});
