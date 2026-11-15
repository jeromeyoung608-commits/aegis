// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECORD_SUFFIX,
  createMemoryStore,
  idFromFileName,
  openOpfsStore,
  opfsSupported,
  recordFileName,
} from '../src/store.js';

test('memory store implements put / get / list / remove / clear', async () => {
  const store = createMemoryStore();
  await store.put('a' + RECORD_SUFFIX, new Uint8Array([1, 2, 3]));
  await store.put('b' + RECORD_SUFFIX, new Uint8Array([4]));

  assert.deepEqual([...(await store.get('a' + RECORD_SUFFIX))], [1, 2, 3]);
  assert.equal((await store.list()).length, 2);
  assert.equal(await store.remove('a' + RECORD_SUFFIX), true);
  assert.equal(await store.get('a' + RECORD_SUFFIX), null);

  await store.clear();
  assert.deepEqual(await store.list(), []);
});

test('memory store hands out copies, not shared buffers', async () => {
  const store = createMemoryStore();
  const source = new Uint8Array([9, 9, 9]);
  await store.put('x' + RECORD_SUFFIX, source);
  source[0] = 0;

  const first = await store.get('x' + RECORD_SUFFIX);
  assert.equal(first[0], 9);
  first[1] = 0;

  const second = await store.get('x' + RECORD_SUFFIX);
  assert.equal(second[1], 9);
});

test('record ids are validated to prevent path traversal', () => {
  assert.equal(recordFileName('0f8fad5b-d9cb-469f-a165-70867728950e'), '0f8fad5b-d9cb-469f-a165-70867728950e' + RECORD_SUFFIX);
  assert.throws(() => recordFileName('../escape'), /Invalid vault record id/);
  assert.throws(() => recordFileName('/etc/passwd'), /Invalid vault record id/);
  assert.throws(() => recordFileName('UPPERCASE-ID-123'), /Invalid vault record id/);
  assert.throws(() => recordFileName(''), /Invalid vault record id/);
});

test('file names round-trip back to ids', () => {
  assert.equal(idFromFileName('abc-12345' + RECORD_SUFFIX), 'abc-12345');
  assert.equal(idFromFileName('notes.txt'), null);
});

test('OPFS is reported unavailable outside a browser', () => {
  assert.equal(opfsSupported(), false);
});

test('the OPFS adapter refuses to pretend it works in Node', async () => {
  await assert.rejects(() => openOpfsStore(), /OPFS is not available/);
});
