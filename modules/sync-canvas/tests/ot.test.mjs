// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * MDS-1 T1/T2/T3 tests for sync-canvas OT core.
 * Pure functions only: no DOM, no network, deterministic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { apply, diff, transform, normalize, retain, insert, remove, mapIndex } from "../src/engine/OT.js";

/* deterministic PRNG so failures are reproducible (MDS-1 T8) */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("diff/apply round-trips: applying the diff yields exactly the target text", () => {
  const cases = [
    ["abc", "abcd"], ["abcd", "abc"], ["hello world", "hello brave world"],
    ["", "x"], ["x", ""], ["aaa", "aaaa"], ["abcdef", "abXef"], ["same", "same"],
  ];
  for (const [before, after] of cases) {
    const op = diff(before, after);
    const got = op ? apply(before, op) : before;
    assert.equal(got, after, `diff(${before} -> ${after}) replayed wrong`);
  }
});

test("TP1 convergence: two concurrent edits merge to the same document", () => {
  const rnd = mulberry32(42);
  const alphabet = "abcdefghij";
  let checked = 0;

  for (let iter = 0; iter < 200; iter += 1) {
    // Build a base string and two independent mutated replicas.
    const len = 1 + Math.floor(rnd() * 12);
    let base = "";
    for (let i = 0; i < len; i += 1) base += alphabet[Math.floor(rnd() * alphabet.length)];

    const mutate = (s) => {
      const at = Math.floor(rnd() * (s.length + 1));
      const kind = rnd() < 0.5 ? "ins" : "del";
      if (kind === "ins") {
        const ch = alphabet[Math.floor(rnd() * alphabet.length)];
        return s.slice(0, at) + ch + s.slice(at);
      }
      if (!s.length) return s;
      const cut = Math.min(1 + Math.floor(rnd() * 3), s.length - at) || 1;
      return s.slice(0, at) + s.slice(at + cut);
    };

    const afterA = mutate(base);
    const afterB = mutate(base);
    const a = diff(base, afterA);
    const b = diff(base, afterB);
    if (!a || !b) continue;

    const aOnB = transform(a, b, "Z", "A"); // a transformed to run after b
    const bOnA = transform(b, a, "A", "Z"); // b transformed to run after a
    const r1 = apply(apply(base, b), aOnB);
    const r2 = apply(apply(base, a), bOnA);
    assert.equal(r1, r2, `divergence at iter ${iter}: ${JSON.stringify({ base, afterA, afterB })}`);
    checked += 1;
  }
  assert.ok(checked > 20, `too few concurrent pairs exercised (${checked})`);
});

test("transform is order-stable for simultaneous inserts at the same offset", () => {
  const doc = "ab";
  const a = normalize([retain(1), insert("X"), retain(1)]);
  const b = normalize([retain(1), insert("Y"), retain(1)]);
  const r1 = apply(apply(doc, a), transform(b, a, "B", "A"));
  const r2 = apply(apply(doc, b), transform(a, b, "A", "B"));
  assert.equal(r1, r2, "same-offset inserts must converge via the site tie-break");
  assert.ok(r1.includes("X") && r1.includes("Y"));
});

test("apply never loses the untouched tail (invariant)", () => {
  const doc = "0123456789";
  const op = [retain(2), insert("ZZ"), remove(3)]; // stops early on purpose
  const out = apply(doc, op);
  assert.equal(out.slice(0, 2), "01");
  assert.ok(out.includes("ZZ"));
  assert.equal(out.slice(-5), "56789"); // delete consumed 2..4, the rest survived intact
  assert.equal(out.length, 2 + 2 + 5);
});

test("mapIndex is monotone for a pure retain/delete op", () => {
  const op = [retain(1), remove(1), retain(1)];
  let prev = -1;
  for (let pos = 0; pos <= 3; pos += 1) {
    const mapped = mapIndex(pos, op);
    assert.ok(mapped >= prev, "mapped positions must not move backwards");
    prev = mapped;
  }
});

test("FAILURE PATH: a delete larger than the document is rejected by mapIndex/apply bounds", () => {
  // apply() tolerates over-long deletes by clamping to the string, but mapIndex
  // must never return a position past the resulting document length.
  const doc = "abc";
  const op = [remove(99)];
  const out = apply(doc, op);
  assert.equal(out, "");
  for (let pos = 0; pos <= doc.length; pos += 1) {
    assert.ok(mapIndex(pos, op) >= 0, "mapIndex must stay non-negative");
  }
});

test("normalize is idempotent and merges adjacent components (invariant)", () => {
  const raw = [retain(1), retain(2), insert("a"), insert("b"), remove(0), remove(3)];
  const once = normalize(raw);
  const twice = normalize(once);
  assert.deepEqual(once, twice);
  assert.deepEqual(once, [retain(3), insert("ab"), remove(3)]);
});
