// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for token-gate.
 * Run: node --test   (or: npm test)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRootKey,
  exportPublicKey,
  importPublicKey,
  issueToken,
  verifyToken,
  gate,
} from '../src/token-gate.js';

test('a valid token verifies for its room', async () => {
  const root = await generateRootKey();
  const rootPub = await exportPublicKey(root.publicKey);
  const pub = await importPublicKey(rootPub);
  const tok = await issueToken(root.privateKey, { room: 'R1', ttlMs: 60000 });
  const res = await verifyToken(pub, tok, { room: 'R1' });
  assert.equal(res.ok, true);
  assert.equal(res.room, 'R1');
});

test('an expired token is rejected', async () => {
  const root = await generateRootKey();
  const rootPub = await importPublicKey(await exportPublicKey(root.publicKey));
  const tok = await issueToken(root.privateKey, { room: 'R1', exp: Date.now() - 1000 });
  const res = await verifyToken(rootPub, tok, { room: 'R1' });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'expired');
});

test('a token for the wrong room is rejected', async () => {
  const root = await generateRootKey();
  const rootPub = await importPublicKey(await exportPublicKey(root.publicKey));
  const tok = await issueToken(root.privateKey, { room: 'R1' });
  const res = await verifyToken(rootPub, tok, { room: 'R2' });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'wrong-room');
});

test('a forged (tampered) token fails signature check', async () => {
  const root = await generateRootKey();
  const rootPub = await importPublicKey(await exportPublicKey(root.publicKey));
  const tok = await issueToken(root.privateKey, { room: 'R1' });
  // Flip the FIRST character of the signature segment: those are the high bits,
  // so the decoded bytes always change. Flipping the trailing character can land
  // on the unused padding bits and leave the signature byte-identical, which made
  // this test flaky (2 failures in 10 runs).
  const parts = tok.split('.');
  const last = parts[2];
  parts[2] = (last[0] === 'A' ? 'B' : 'A') + last.slice(1);
  const res = await verifyToken(rootPub, parts.join('.'), { room: 'R1' });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'bad-signature');
});

test('audience restriction: token bound to a key is rejected for another key', async () => {
  const root = await generateRootKey();
  const rootPub = await importPublicKey(await exportPublicKey(root.publicKey));
  const alice = await generateRootKey(); // some approver's key
  const alicePub = await exportPublicKey(alice.publicKey);
  const tok = await issueToken(root.privateKey, { room: 'R1', audience: alicePub });
  // correct audience -> admit
  assert.equal((await verifyToken(rootPub, tok, { room: 'R1', requiredAud: alicePub })).ok, true);
  // wrong audience -> deny
  const bob = await generateRootKey();
  const bobPub = await exportPublicKey(bob.publicKey);
  const res = await verifyToken(rootPub, tok, { room: 'R1', requiredAud: bobPub });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'audience-mismatch');
});

test('gate() admits a good envelope and denies a bad one', async () => {
  const root = await generateRootKey();
  const rootPub = await importPublicKey(await exportPublicKey(root.publicKey));
  const tok = await issueToken(root.privateKey, { room: 'R1' });
  const good = await gate(rootPub, { room: 'R1', token: tok }, { room: 'R1' });
  assert.equal(good.admit, true);
  const bad = await gate(rootPub, { room: 'R1', token: 'garbage' }, { room: 'R1' });
  assert.equal(bad.admit, false);
});

test('a token signed by a DIFFERENT root fails verification', async () => {
  const rootA = await generateRootKey();
  const rootB = await generateRootKey();
  const rootBPub = await importPublicKey(await exportPublicKey(rootB.publicKey));
  const tok = await issueToken(rootA.privateKey, { room: 'R1' });
  const res = await verifyToken(rootBPub, tok, { room: 'R1' });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'bad-signature');
});
