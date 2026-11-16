// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * MDS-1 tests for sync-canvas audit hash chain.
 * Failure path: tampering with any record must be detected, not silently accepted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HashChain, GENESIS, canonical, sha256Hex, signStamp } from "../src/audit/HashChain.js";

test("chain links: every entry folds in the previous hash (invariant)", async () => {
  const chain = new HashChain();
  const a = await chain.append({ op: "stamp", by: "A" });
  const b = await chain.append({ op: "stamp", by: "B" });
  assert.equal(a.prev, GENESIS);
  assert.equal(b.prev, a.hash);
  assert.equal(b.index, 1);
  assert.equal(await chain.verify(), null);
});

test("canonical() is key-order independent (invariant)", async () => {
  assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }));
  assert.equal(
    await sha256Hex(canonical({ b: 1, a: 2 })),
    await sha256Hex(canonical({ a: 2, b: 1 })),
  );
});

test("FAILURE PATH: mutating a payload breaks verification at that index", async () => {
  const chain = new HashChain();
  await chain.append({ op: "stamp", by: "A" });
  await chain.append({ op: "stamp", by: "B" });
  chain.entries[1].payload.by = "MALLORY"; // tamper
  assert.equal(await chain.verify(), 1, "tampered entry must be reported, not hidden");
});

test("FAILURE PATH: reordering two entries is detected", async () => {
  const chain = new HashChain();
  await chain.append({ n: 1 });
  await chain.append({ n: 2 });
  const swapped = [chain.entries[1], chain.entries[0]];
  chain.entries = swapped;
  assert.notEqual(await chain.verify(), null);
});

test("signStamp binds payload, key id and chain position", async () => {
  const prev = GENESIS;
  const op = { kind: "seal", doc: "d1" };
  const s1 = await signStamp({ prevHash: prev, op, keyId: "fp-A" });
  const s2 = await signStamp({ prevHash: prev, op, keyId: "fp-B" });
  assert.notEqual(s1, s2, "a different key must not reproduce the same signature");
  const s3 = await signStamp({ prevHash: "f".repeat(64), op, keyId: "fp-A" });
  assert.notEqual(s1, s3, "replaying a signature at another chain position must fail");
});
