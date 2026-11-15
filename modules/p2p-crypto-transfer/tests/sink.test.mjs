// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// tests/sink.test.mjs — verify the OOM fix at the logic level (no browser needed).
//
// We cannot drive a real browser (showSaveFilePicker / FileSystemWritableFileStream /
// WebRTC need a secure context + a human gesture + two peers). But the *cause* of the
// "memory hog" OOM is pure logic, and that we can test here:
//   1. createSink routing: prepared writer > showSaveFilePicker > capped memory fallback.
//   2. The >1 GiB memory fallback throws the exact, actionable error instead of OOMing.
//   3. The receiver writes each decrypted chunk to the sink AS IT ARRIVES — it never
//      assembles the whole file in memory (the old `new Blob(chunks[])` path is gone).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSink, MAX_MEM_BYTES } from '../src/transfer.js';
import {
  deriveKey, encryptChunk, bufToB64, b64ToBuf, SALT_LEN, IV_LEN,
} from '../src/crypto.js';

function fakeWritable() {
  return { writes: [], closed: false, write(pt) { this.writes.push(pt); }, close() { this.closed = true; } };
}

function makeWindow(withPicker) {
  if (withPicker) {
    const w = fakeWritable();
    return { showSaveFilePicker: async () => ({ createWritable: async () => w }) };
  }
  return {}; // no showSaveFilePicker -> forces the memory fallback
}

test('createSink prefers a pre-locked (gesture) writer', async () => {
  const fw = fakeWritable();
  const sink = await createSink('a.bin', 5e9, { getPreparedWritable: () => fw });
  assert.equal(sink.kind, 'fs');
  await sink.write(new Uint8Array([1, 2, 3]));
  await sink.close();
  assert.deepEqual(Array.from(fw.writes[0]), [1, 2, 3]);
  assert.equal(fw.closed, true);
});

test('createSink uses showSaveFilePicker when present', async () => {
  const saved = globalThis.window;
  globalThis.window = makeWindow(true);
  try {
    const sink = await createSink('my file*.bin', 100, {});
    assert.equal(sink.kind, 'fs');
    await sink.write(new Uint8Array([9]));
    await sink.close();
  } finally {
    globalThis.window = saved;
  }
});

test('createSink falls back to memory for small files (no picker)', async () => {
  const saved = globalThis.window;
  globalThis.window = makeWindow(false);
  try {
    const sink = await createSink('a.bin', 100, {});
    assert.equal(sink.kind, 'mem');
    await sink.write(new Uint8Array([1, 2]));
    await sink.write(new Uint8Array([3]));
    await sink.close();
    assert.ok(sink.blob instanceof Blob);
    assert.equal(sink.blob.size, 3);
  } finally {
    globalThis.window = saved;
  }
});

test('createSink hard-rejects >1GiB on a browser without disk streaming', async () => {
  const saved = globalThis.window;
  globalThis.window = makeWindow(false);
  try {
    await assert.rejects(
      () => createSink('huge.bin', MAX_MEM_BYTES + 1, {}),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Browser does not support disk streaming, file exceeds memory limit/);
        assert.match(err.message, /Please use Chrome\/Edge for files > 1GB/);
        return true;
      },
    );
  } finally {
    globalThis.window = saved;
  }
});

// ── Integration: replay encrypted frames through the receiver ──────────────────
function frame(seq, iv, ct) {
  const header = new Uint8Array(4 + IV_LEN);
  new DataView(header.buffer).setUint32(0, seq, false);
  header.set(iv, 4);
  const packet = new Uint8Array(header.length + ct.length);
  packet.set(header, 0);
  packet.set(ct, header.length);
  return packet.buffer; // DataChannel delivers an ArrayBuffer when binaryType='arraybuffer'
}

test('receiver streams each decrypted chunk to disk — never buffers the whole file', async () => {
  const pass = 'shared-secret';
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await deriveKey(pass, salt);

  const plaintext = [new Uint8Array([1, 2, 3, 4, 5]), new Uint8Array([6, 7, 8, 9, 10, 11, 12])];
  const total = plaintext.reduce((n, c) => n + c.length, 0);

  const fw = fakeWritable();
  const dc = {}; // mock RTCDataChannel
  const captured = {};
  let doneResolve;
  const donePromise = new Promise((r) => (doneResolve = r));
  const { createTransfer } = await import('../src/transfer.js');
  createTransfer(dc, pass, {
    onMeta: () => {},
    onRecvProgress: () => {},
    onComplete: (sink, meta) => { captured.sink = sink; captured.meta = meta; doneResolve(); },
    onError: (e) => { captured.error = e; doneResolve(); },
  }, { getPreparedWritable: () => fw });

  // 1) meta
  await dc.onmessage({ data: JSON.stringify({
    type: 'meta', name: 'secret.bin', size: total, mime: 'application/octet-stream',
    salt: bufToB64(salt),
  }) });
  // 2) encrypted chunks, in arrival order
  for (let i = 0; i < plaintext.length; i++) {
    const { iv, ciphertext } = await encryptChunk(key, plaintext[i]);
    await dc.onmessage({ data: frame(i, iv, ciphertext) });
  }
  // 3) done
  await dc.onmessage({ data: JSON.stringify({ type: 'done' }) });

  // The receiver finishes asynchronously (key derivation + sink open + replay of
  // the buffered mailbox). Wait for onComplete before asserting — otherwise we
  // read `captured` before the receiver has landed the chunks.
  await donePromise;

  assert.equal(captured.error, undefined);
  assert.equal(captured.sink.kind, 'fs');
  // Exactly one write per chunk — proves the receiver does NOT accumulate then flush.
  assert.equal(fw.writes.length, plaintext.length);
  // The bytes written in order equal the original plaintext (decrypted + streamed).
  const got = new Uint8Array(fw.writes.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of fw.writes) { got.set(c, off); off += c.length; }
  const want = new Uint8Array(total); off = 0;
  for (const c of plaintext) { want.set(c, off); off += c.length; }
  assert.deepEqual(Array.from(got), Array.from(want));
  assert.equal(fw.closed, true);
});
