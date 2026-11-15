// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// tests/transfer.test.mjs — end-to-end integrity of the encrypted P2P receive
// pipeline (p2p-crypto-transfer's createTransfer), driven entirely in Node with
// a mock RTCDataChannel relay. No browser/Playwright needed.
//
// Why this exists: the receive path decrypts + writes each chunk inside an
// un-awaited async IIFE. If writes can complete out of order, an earlier chunk
// may not have pushed into the sink before finishRecv() snapshots the Blob on
// close() — silently dropping those bytes (and scrambling content when
// reordered). This test FORCES that race by making earlier chunks' writes
// resolve last, then asserts every byte arrives, in order. It fails hard on the
// old code and passes on the chained-write fix.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTransfer } from '../../p2p-crypto-transfer/src/transfer.js';

const PASSPHRASE = 'aegis-signed-demo';

// A pair of mock data channels: anything the sender sends is delivered straight
// to the receiver's onmessage (DataChannel is ordered + reliable, so this is a
// faithful relay for our purpose). Sender-only direction: meta/chunks/done flow
// sender -> receiver; the receiver never sends back.
function makeRelay() {
  const receiver = { binaryType: 'arraybuffer', onmessage: null };
  const sender = {
    binaryType: 'arraybuffer',
    bufferedAmountLowThreshold: 0,
    get bufferedAmount() { return 0; }, // tiny files never trip backpressure
    send(m) { if (receiver.onmessage) receiver.onmessage({ data: m }); },
    addEventListener() {},
  };
  return { sender, receiver };
}

// A sink that captures writes into `parts`, but — exactly like the real in-memory
// sink — snapshot()s at close() time (close does NOT wait for pending writes).
// The fake write delays EARLIER chunks more, so they resolve LAST; this is what
// reproduces the old drop/scramble race deterministically.
function makeCaptureSink() {
  const parts = [];
  let seq = 0;
  let snapshot = null;
  const writable = {
    write(pt) {
      const n = seq++;
      const delay = Math.max(0, 25 - n * 5); // chunk0 slowest, last chunk fastest
      return new Promise((res) => setTimeout(() => { parts.push(pt); res(); }, delay));
    },
    close() { snapshot = parts.slice(); return Promise.resolve(); },
  };
  return { writable, getSnapshot: () => snapshot };
}

function concat(parts) {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function runTransfer(original, { tamper = false } = {}) {
  const { sender, receiver } = makeRelay();
  const cap = makeCaptureSink();

  let received = null;
  const got = new Promise((res, rej) => {
    createTransfer(receiver, PASSPHRASE, {
      onError: rej,
      onComplete: () => res(cap.getSnapshot()),
    }, { getPreparedWritable: () => cap.writable });
  });

  let payload = original;
  if (tamper) {
    payload = Uint8Array.from(original);
    payload[Math.floor(payload.length / 2)] ^= 0x01; // flip one byte mid-document
  }

  const transfer = createTransfer(sender, PASSPHRASE, {});
  const sendP = transfer.sendFile(new Blob([payload], { type: 'application/pdf' }));
  await Promise.all([sendP, got]);
  return concat(received = cap.getSnapshot());
}

const SIZES = [52576, 16384, 16385, 100, 200000];

for (const size of SIZES) {
  test(`clean transfer preserves all ${size} bytes, in order`, async () => {
    const original = new Uint8Array(size);
    for (let i = 0; i < size; i++) original[i] = (i * 31 + 7) & 0xff; // deterministic noise

    const out = await runTransfer(original);
    assert.equal(out.length, size, `length must match (got ${out.length})`);
    for (let i = 0; i < size; i++) {
      assert.equal(out[i], original[i], `byte ${i} mismatch`);
    }
  });
}

test('tampered transfer delivers the EXACT (flipped) bytes, not the original', async () => {
  const size = 52576;
  const original = new Uint8Array(size);
  for (let i = 0; i < size; i++) original[i] = (i * 17 + 3) & 0xff;

  const out = await runTransfer(original, { tamper: true });
  assert.equal(out.length, size, 'tamper must not change length');
  // The single flipped byte must differ from the original; everything else equal.
  let diffs = 0;
  for (let i = 0; i < size; i++) if (out[i] !== original[i]) diffs++;
  assert.equal(diffs, 1, 'exactly one byte should differ from the source');
});
