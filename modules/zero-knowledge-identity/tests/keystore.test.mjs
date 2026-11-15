// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/zero-knowledge-identity/tests/keystore.test.mjs
// The storage contract. `openIndexedDbVault` needs a browser, so its shape is
// asserted indirectly: MemoryVault implements the identical interface, and every
// caller above it is written against the interface, not against IndexedDB.

import test from 'node:test';
import assert from 'node:assert/strict';

import { MemoryVault, openIndexedDbVault, STORE, DB_NAME } from '../src/keystore.js';

const RECORD = { id: 'primary', name: 'Engineer-A', fingerprint: 'SHA256:AAAA' };

test('memory vault implements get / put / list / remove', async () => {
  const vault = new MemoryVault();
  assert.equal(vault.kind, 'memory');
  assert.equal(await vault.get('primary'), undefined);

  await vault.put(RECORD);
  assert.equal((await vault.get('primary')).name, 'Engineer-A');
  assert.equal((await vault.list()).length, 1);

  await vault.remove('primary');
  assert.equal(await vault.get('primary'), undefined);
  assert.equal((await vault.list()).length, 0);
});

test('put overwrites by key instead of appending', async () => {
  const vault = new MemoryVault();
  await vault.put(RECORD);
  await vault.put({ ...RECORD, name: 'Engineer-B' });
  const all = await vault.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].name, 'Engineer-B');
});

test('records are cloned on the way in and out (no shared mutable state)', async () => {
  const vault = new MemoryVault();
  await vault.put(RECORD);
  const read = await vault.get('primary');
  read.name = 'mutated';
  assert.equal((await vault.get('primary')).name, 'Engineer-A');
});

test('a vault can be seeded from persisted records', async () => {
  const vault = new MemoryVault([RECORD]);
  assert.equal((await vault.get('primary')).name, 'Engineer-A');
});

test('IndexedDB vault refuses to pretend it works without a browser', async () => {
  const original = globalThis.indexedDB;
  delete globalThis.indexedDB;
  try {
    await assert.rejects(() => openIndexedDbVault(), /IndexedDB is unavailable/);
  } finally {
    if (original !== undefined) globalThis.indexedDB = original;
  }
});

test('database and store names are stable (renaming would orphan identities)', () => {
  assert.equal(DB_NAME, 'aegis-identity');
  assert.equal(STORE, 'identities');
});
