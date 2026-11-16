// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for detached-hash-signer.
 * Run: node --test tests/   (or: npm test)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  sha256Hex,
  sha256HexOfText,
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  signHash,
  verifySignature,
  makeBundle,
  verifyBundle,
  isDetached,
} from '../src/detached-hash-signer.js';

const SAMPLE_DOC = 'CLASSIFIED: project unicorn financials 2026';

test('sha256Hex is stable and 64 hex chars', async () => {
  const h1 = await sha256HexOfText(SAMPLE_DOC);
  const h2 = await sha256HexOfText(SAMPLE_DOC);
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('a one-byte change produces a completely different hash', async () => {
  const a = await sha256HexOfText('hello');
  const b = await sha256HexOfText('hellp');
  assert.notEqual(a, b);
});

test('a signer can sign the hash and the signature verifies', async () => {
  const kp = await generateKeyPair();
  const pub = await exportPublicKey(kp.publicKey);
  const hash = await sha256HexOfText(SAMPLE_DOC);
  const sig = await signHash(kp.privateKey, hash);
  const imported = await importPublicKey(pub);
  assert.equal(await verifySignature(imported, hash, sig), true);
});

test('tampering with the signature breaks verification', async () => {
  const kp = await generateKeyPair();
  const pub = await exportPublicKey(kp.publicKey);
  const hash = await sha256HexOfText(SAMPLE_DOC);
  let sig = await signHash(kp.privateKey, hash);
  // Flip the FIRST char: it is a high bit, so the decoded bytes always differ.
  // Flipping the trailing char can land on the unused padding bits and leave the
  // signature byte-identical, which made this test fail 5 of 15 runs.
  sig = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  const imported = await importPublicKey(pub);
  assert.equal(await verifySignature(imported, hash, sig), false);
});

test('three executives blind-co-sign one hash; bundle verifies', async () => {
  const hash = await sha256HexOfText(SAMPLE_DOC);
  const signers = [];
  for (const id of ['A', 'B', 'C']) {
    const kp = await generateKeyPair();
    const pub = await exportPublicKey(kp.publicKey);
    const sig = await signHash(kp.privateKey, hash);
    signers.push({ id, pub, sig });
  }
  const bundle = makeBundle({ docName: 'unicorn.pdf', docHash: hash, signers });
  const res = await verifyBundle(bundle);
  assert.equal(res.ok, true);
  assert.equal(res.signers.length, 3);
  assert.deepEqual(res.signers.map((s) => s.ok), [true, true, true]);
});

test('a missing signer in the bundle fails verification', async () => {
  const hash = await sha256HexOfText(SAMPLE_DOC);
  const good = await generateKeyPair();
  const goodPub = await exportPublicKey(good.publicKey);
  const goodSig = await signHash(good.privateKey, hash);
  const bad = await generateKeyPair();
  const badPub = await exportPublicKey(bad.publicKey);
  // bad signs a DIFFERENT hash -> invalid for this docHash
  const wrongHash = await sha256HexOfText('something else');
  const badSig = await signHash(bad.privateKey, wrongHash);
  const bundle = makeBundle({
    docName: 'x.pdf',
    docHash: hash,
    signers: [
      { id: 'good', pub: goodPub, sig: goodSig },
      { id: 'bad', pub: badPub, sig: badSig },
    ],
  });
  const res = await verifyBundle(bundle);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'signature-mismatch');
  assert.deepEqual(res.signers.map((s) => s.ok), [true, false]);
});

test('the bundle is DETACHED — it never contains document bytes', async () => {
  const hash = await sha256HexOfText(SAMPLE_DOC);
  const kp = await generateKeyPair();
  const sig = await signHash(kp.privateKey, hash);
  const pub = await exportPublicKey(kp.publicKey);
  const bundle = makeBundle({ docName: 'unicorn.pdf', docHash: hash, signers: [{ id: 'A', pub, sig }] });
  assert.equal(isDetached(bundle), true);
  // The secret text must not leak into the signed artifact.
  assert.ok(!bundle.includes('CLASSIFIED'));
  assert.ok(!bundle.includes('unicorn financials'));
});

test('verifyBundle rejects malformed input', async () => {
  assert.equal((await verifyBundle('not json')).ok, false);
  assert.equal((await verifyBundle(JSON.stringify({ foo: 1 }))).ok, false);
  assert.equal(
    await verifyBundle(
      JSON.stringify({ kind: 'detached-hash-signature', docHash: 'abc', signers: [] })
    ).ok === false || (await verifyBundle(JSON.stringify({ kind: 'detached-hash-signature', docHash: 'abc', signers: [] }))).reason === 'no-signers',
    true
  );
});
