// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// tests/envelope.test.mjs — multi-recipient group-delivery envelope.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRecipientKeyPair, sealEnvelope, openEnvelope } from '../src/sdk/envelope.js';
import { generateKeyPair, exportPublicKey, importPublicKey } from '../src/sdk/crypto.js';

// A recipient must be able to recover the SAME DEK that sealed the document.
test('every recipient recovers the identical DEK', async () => {
  const a = await makeRecipientKeyPair();
  const b = await makeRecipientKeyPair();
  const c = await makeRecipientKeyPair();

  const { envelope, rawDek } = await sealEnvelope([
    { id: 'alice', publicKey: a.publicKey },
    { id: 'bob', publicKey: b.publicKey },
    { id: 'carol', publicKeyBase64: c.publicKeyBase64 },
  ]);

  assert.equal(envelope.recipients.length, 3);
  for (const [kp, id] of [[a, 'alice'], [b, 'bob'], [c, 'carol']]) {
    const dek = await openEnvelope(envelope, id, kp.privateKey);
    const recovered = new Uint8Array(await crypto.subtle.exportKey('raw', dek));
    assert.deepEqual(recovered, rawDek, `${id} must recover the sealing DEK`);
  }
});

// A non-recipient must not be able to open the envelope.
test('non-recipient is rejected', async () => {
  const a = await makeRecipientKeyPair();
  const stranger = await generateKeyPair();
  const { envelope } = await sealEnvelope([{ id: 'alice', publicKey: a.publicKey }]);
  await assert.rejects(() => openEnvelope(envelope, 'mallory', stranger.privateKey));
  await assert.rejects(() => openEnvelope(envelope, 'bob', a.privateKey));
});

// Adding a recipient after sealing must NOT let them open the original envelope.
test('envelope is closed at seal time', async () => {
  const a = await makeRecipientKeyPair();
  const late = await makeRecipientKeyPair();
  const { envelope } = await sealEnvelope([{ id: 'alice', publicKey: a.publicKey }]);
  const lateExported = await exportPublicKey(late.publicKey);
  envelope.recipients.push({ id: 'late', ephPub: lateExported, iv: [0], wrappedDek: [0] });
  await assert.rejects(() => openEnvelope(envelope, 'late', late.privateKey));
  // but the legit recipient still works
  const dek = await openEnvelope(envelope, 'alice', a.privateKey);
  assert.ok(dek);
});

// Single-recipient envelope is just the degenerate group case.
test('single recipient works', async () => {
  const a = await makeRecipientKeyPair();
  const { envelope, rawDek } = await sealEnvelope([{ id: 'only', publicKey: a.publicKey }]);
  const dek = await openEnvelope(envelope, 'only', a.privateKey);
  assert.deepEqual(new Uint8Array(await crypto.subtle.exportKey('raw', dek)), rawDek);
});
