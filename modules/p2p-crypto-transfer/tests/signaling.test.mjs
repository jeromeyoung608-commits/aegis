// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Signaling-layer integration test for p2p-crypto-transfer "lan" mode.
//
// This exercises the exact path that was reported broken: two peers exchange an
// offer/answer through a real (zero-dep) signal server, and — critically — a peer
// must NEVER receive its own message back (the "from === myId self-echo" bug the
// review flagged). The full WebRTC DataChannel connect is environment-dependent
// (headless loopback / mDNS) and is covered separately by tests/lan.e2e.mjs in a
// real browser; here we lock the signaling contract, which is the part that was
// actually missing/broken.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSignalServer } from '../signal-server.js';
import { HttpSignaler } from '../src/signalers.js';

test('two peers exchange offer/answer through the signal server, no self-echo', async () => {
  const sig = await createSignalServer({ port: 0 });
  const base = `http://localhost:${sig.port}`;

  const a = new HttpSignaler(base);
  const b = new HttpSignaler(base);
  await a.connect('room-1', 'peer-A');
  await b.connect('room-1', 'peer-B');

  const aGot = [];
  const bGot = [];
  a.onMessage((m) => aGot.push(m));
  b.onMessage((m) => bGot.push(m));

  await a.send({ type: 'offer', sdp: 'OFFER-SDP' });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(bGot.length, 1, 'B should receive A’s offer');
  assert.equal(bGot[0].type, 'offer');
  assert.equal(bGot[0].sdp, 'OFFER-SDP');
  assert.equal(aGot.length, 0, 'A must NOT receive its own offer (no self-echo)');

  await b.send({ type: 'answer', sdp: 'ANSWER-SDP' });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(aGot.length, 1, 'A should receive B’s answer');
  assert.equal(aGot[0].type, 'answer');
  assert.equal(bGot.length, 1, 'B must NOT receive its own answer');

  // Late joiner in a DIFFERENT room must receive nothing from room-1.
  const c = new HttpSignaler(base);
  const cGot = [];
  c.onMessage((m) => cGot.push(m));
  await c.connect('room-2', 'peer-C');
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(cGot.length, 0, 'peer in another room must not see room-1 traffic');

  await a.close();
  await b.close();
  await c.close();
  await sig.close();
  // The signal server's keep-alive sockets can outlive the assertions; force exit
  // so `node --test` reports and returns promptly in CI.
  process.exit(0);
});
