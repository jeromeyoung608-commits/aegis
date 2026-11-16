// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';

import { createVault } from '../src/vault.js';
import { createMemoryStore } from '../src/store.js';

const PASSPHRASE = 'vault-passphrase-1';
const bytesOf = (text) => new TextEncoder().encode(text);

function makeVault(options) {
  return createVault(createMemoryStore(), options);
}

test('seal → list → open returns the same file and metadata', async () => {
  const vault = makeVault();
  const bytes = bytesOf('signed artifact bytes');

  const record = await vault.seal({
    name: 'contract.pdf',
    type: 'application/pdf',
    bytes,
    metadata: { hash: 'abc123', signers: [{ id: 'A', ok: true }] },
    passphrase: PASSPHRASE,
  });

  const entries = await vault.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, record.id);
  assert.ok(entries[0].containerSize > bytes.length);

  const opened = await vault.open(record.id, PASSPHRASE);
  assert.deepEqual([...opened.bytes], [...bytes]);
  assert.equal(opened.metadata.name, 'contract.pdf');
  assert.equal(opened.metadata.hash, 'abc123');
  assert.equal(opened.metadata.schema, 'aegis.archive.v1');
});

test('the listing reveals sizes but not file names', async () => {
  const vault = makeVault();
  await vault.seal({ name: 'secret-merger.pdf', bytes: bytesOf('payload'), passphrase: PASSPHRASE });

  const entries = await vault.list();
  assert.equal(entries.length, 1);
  assert.ok(!JSON.stringify(entries).includes('secret-merger'));
});

test('a second record gets a distinct id', async () => {
  const vault = makeVault();
  const a = await vault.seal({ name: 'a.bin', bytes: bytesOf('a'), passphrase: PASSPHRASE });
  const b = await vault.seal({ name: 'b.bin', bytes: bytesOf('b'), passphrase: PASSPHRASE });
  assert.notEqual(a.id, b.id);
  assert.equal((await vault.stats()).count, 2);
});

test('opening with the wrong passphrase fails and leaves the record intact', async () => {
  const vault = makeVault();
  const record = await vault.seal({ name: 'x.bin', bytes: bytesOf('x'), passphrase: PASSPHRASE });

  await assert.rejects(() => vault.open(record.id, 'wrong-passphrase'), /unlock failed/);
  const opened = await vault.open(record.id, PASSPHRASE);
  assert.deepEqual([...opened.bytes], [...bytesOf('x')]);
});

test('remove deletes exactly one record', async () => {
  const vault = makeVault();
  const a = await vault.seal({ name: 'a.bin', bytes: bytesOf('a'), passphrase: PASSPHRASE });
  const b = await vault.seal({ name: 'b.bin', bytes: bytesOf('b'), passphrase: PASSPHRASE });

  assert.equal(await vault.remove(a.id), true);
  assert.equal(await vault.remove(a.id), false);
  assert.deepEqual((await vault.list()).map((entry) => entry.id), [b.id]);
});

test('an empty file is refused with an actionable message', async () => {
  const vault = makeVault();
  await assert.rejects(
    () => vault.seal({ name: 'empty.bin', bytes: new Uint8Array(0), passphrase: PASSPHRASE }),
    /file is empty/,
  );
});

test('the per-record size limit is enforced', async () => {
  const vault = makeVault({ maxBytes: 4 });
  await assert.rejects(
    () => vault.seal({ name: 'big.bin', bytes: bytesOf('12345'), passphrase: PASSPHRASE }),
    /Archive limit/,
  );
  const ok = await vault.seal({ name: 'ok.bin', bytes: bytesOf('1234'), passphrase: PASSPHRASE });
  assert.equal(ok.size, 4);
});
