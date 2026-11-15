// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// tests/block.test.mjs — signed-artifact assembly, parsing and verification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportPublicKey, sha256, sign } from '../src/sdk/crypto.js';
import { assembleArtifact, parseArtifact, verifyArtifact } from '../src/sdk/pdf.js';

async function makeArtifact() {
  const doc = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
  const { raw, hex } = await sha256(doc);
  const kpA = await generateKeyPair();
  const kpB = await generateKeyPair();
  const sigA = await sign(kpA.privateKey, raw);
  const sigB = await sign(kpB.privateKey, raw);
  const trailer = {
    alg: 'SHA-256',
    hash: hex,
    signers: [
      { id: 'A', pub: await exportPublicKey(kpA.publicKey), sig: sigA },
      { id: 'B', pub: await exportPublicKey(kpB.publicKey), sig: sigB },
    ],
  };
  return assembleArtifact(doc, trailer);
}

test('assemble/parse roundtrip keeps the document bytes and trailer', async () => {
  const art = await makeArtifact();
  const parsed = parseArtifact(art);
  assert.ok(parsed, 'artifact should parse');
  assert.deepEqual([...parsed.docBytes], [10, 20, 30, 40, 50, 60, 70, 80]);
  assert.equal(parsed.trailer.signers.length, 2);
});

test('verifyArtifact passes for a genuine artifact', async () => {
  const res = await verifyArtifact(await makeArtifact());
  assert.equal(res.ok, true);
  assert.equal(res.hashMatch, true);
  assert.equal(res.signers.length, 2);
  assert.ok(res.signers.every((s) => s.ok));
});

test('verifyArtifact fails when a document byte is tampered', async () => {
  const art = await makeArtifact();
  const tampered = Uint8Array.from(art);
  tampered[2] ^= 0x01; // inside the signed document region, before the trailer
  const res = await verifyArtifact(tampered);
  assert.equal(res.ok, false);
  assert.equal(res.hashMatch, false);
});

test('verifyArtifact fails with no signature trailer', async () => {
  const res = await verifyArtifact(new Uint8Array([1, 2, 3, 4]));
  assert.equal(res.ok, false);
});
