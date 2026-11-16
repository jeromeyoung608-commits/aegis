// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis/zero-knowledge-identity/tests/identity.test.mjs
// The issue → persist → reload → unlock cycle, driven through the same modules
// the browser loads. "Reload" is modelled by handing the serialized record to a
// second, independent vault instance — exactly what a fresh tab sees.

import test from 'node:test';
import assert from 'node:assert/strict';

import { MemoryVault } from '../src/keystore.js';
import {
  RECORD_ID,
  issueIdentity,
  unlockIdentity,
  proveWith,
  publicCard,
  isSealed,
  normalizeName,
} from '../src/identity.js';
import { fingerprintOf } from '../src/crypto.js';
import { buildCardBlob } from '../src/card.js';

const PASSPHRASE = 'classified-plant-42';

test('normalizes names and rejects empty or oversized input', () => {
  assert.equal(normalizeName('  Engineer   A  '), 'Engineer A');
  assert.throws(() => normalizeName('   '), /display name is required/);
  assert.throws(() => normalizeName('x'.repeat(33)), /32 characters/);
});

test('issues a sealed record with public material only', async () => {
  const record = await issueIdentity({ name: 'Engineer-A', passphrase: PASSPHRASE });

  assert.equal(record.id, RECORD_ID);
  assert.equal(record.name, 'Engineer-A');
  assert.equal(record.algorithm, 'ECDSA-P256');
  assert.match(record.publicKeySpki, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.match(record.fingerprint, /^SHA256:/);

  assert.equal(isSealed(record), true);
  assert.equal('privateKey' in record, false);
  assert.equal('pkcs8' in record, false);

  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes('pkcs8'), false);
  assert.equal(serialized.includes(PASSPHRASE), false, 'passphrase must never be persisted');
});

test('the public card exposes nothing that could decrypt the vault', async () => {
  const record = await issueIdentity({ name: 'Engineer-A', passphrase: PASSPHRASE });
  const card = publicCard(record);
  assert.deepEqual(Object.keys(card).sort(), [
    'algorithm', 'createdAt', 'fingerprint', 'id', 'name', 'publicKeySpki',
  ]);
});

test('identity survives a simulated reload and unlocks with the same passphrase', async () => {
  const first = new MemoryVault();
  const record = await issueIdentity({ name: 'Engineer-B', passphrase: PASSPHRASE });
  await first.put(record);

  // New vault instance seeded from the persisted bytes == fresh page load.
  const second = new MemoryVault(await first.list());
  const restored = await second.get(RECORD_ID);
  assert.ok(restored, 'record must still be readable after reload');
  assert.equal(restored.fingerprint, record.fingerprint);

  const { privateKey, publicKey } = await unlockIdentity(restored, PASSPHRASE);
  assert.equal(await fingerprintOf(publicKey), restored.fingerprint);

  const proof = await proveWith(privateKey, restored);
  assert.equal(proof.verified, true);
});

test('a reloaded identity still refuses the wrong passphrase', async () => {
  const vault = new MemoryVault();
  const record = await issueIdentity({ name: 'Engineer-C', passphrase: PASSPHRASE });
  await vault.put(record);

  const restored = await new MemoryVault(await vault.list()).get(RECORD_ID);
  await assert.rejects(() => unlockIdentity(restored, 'not-the-passphrase'), /Unlock failed/);
});

test('two identities on the same device stay independent', async () => {
  const one = await issueIdentity({ name: 'Engineer-A', passphrase: PASSPHRASE });
  const two = await issueIdentity({ name: 'Engineer-B', passphrase: PASSPHRASE });
  assert.notEqual(one.publicKeySpki, two.publicKeySpki);
  assert.notEqual(one.fingerprint, two.fingerprint);
  assert.notEqual(one.wrapped.ciphertext, two.wrapped.ciphertext);
});

test('the exported business card is public-only JSON', async () => {
  const record = await issueIdentity({ name: 'Engineer-A', passphrase: PASSPHRASE });
  const blob = buildCardBlob(record);
  const payload = JSON.parse(await blob.text());

  assert.equal(payload.kind, 'aegis-identity-card');
  assert.equal(payload.name, 'Engineer-A');
  assert.equal(payload.fingerprint, record.fingerprint);
  assert.equal(payload.publicKeySpki, record.publicKeySpki);
  assert.equal('wrapped' in payload, false);
  assert.equal(JSON.stringify(payload).includes(record.wrapped.ciphertext), false);
});

test('isSealed rejects records that leak key material', () => {
  assert.equal(isSealed({ wrapped: { ciphertext: 'a', iv: 'b', salt: 'c', iterations: 1 } }), true);
  assert.equal(isSealed({ wrapped: { ciphertext: 'a', iv: 'b', salt: 'c', iterations: 1 }, pkcs8: 'x' }), false);
  assert.equal(isSealed({ privateKey: {} }), false);
  assert.equal(isSealed({ wrapped: { ciphertext: 'a' } }), false);
});
