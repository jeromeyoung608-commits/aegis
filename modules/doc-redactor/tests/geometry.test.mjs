// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * MDS-1 unit tests for REDAKTOR geometry helpers.
 * These are the functions that decide whether a black box actually covers the PII:
 * a wrong clamp or padding silently leaves characters copyable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampBox, boxFromPoints, expandBox, unionBoxes, boxArea, overlapRatio, pointInBox, padFor,
} from "../src/js/redact/geometry.js";

test("clampBox keeps every box inside the page (invariant)", () => {
  const boxes = [
    { x: -0.2, y: -0.1, w: 0.5, h: 0.5 },
    { x: 0.9, y: 0.9, w: 0.5, h: 0.5 },
    { x: 0.2, y: 0.2, w: 1.4, h: 0.1 },
  ];
  for (const b of boxes) {
    const c = clampBox(b);
    assert.ok(c.x >= 0 && c.y >= 0, "origin must stay on-page");
    assert.ok(c.x + c.w <= 1.0000001 && c.y + c.h <= 1.0000001, "box must not overflow the page");
  }
});

test("boxFromPoints is direction-agnostic", () => {
  const a = boxFromPoints(0.1, 0.2, 0.4, 0.6);
  const b = boxFromPoints(0.4, 0.6, 0.1, 0.2);
  assert.deepEqual(a, b);
  assert.ok(Math.abs(a.w - 0.3) < 1e-9 && Math.abs(a.h - 0.4) < 1e-9);
});

test("expandBox grows symmetrically and stays clamped", () => {
  const g = expandBox({ x: 0.0, y: 0.5, w: 0.2, h: 0.05 }, 0.01);
  assert.equal(g.x, 0, "padding must not push the box off-page");
  assert.ok(Math.abs(g.w - 0.22) < 1e-9);
});

test("unionBoxes covers every input box (invariant)", () => {
  const boxes = [
    { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
    { x: 0.5, y: 0.3, w: 0.2, h: 0.1 },
    { x: 0.2, y: 0.6, w: 0.1, h: 0.1 },
  ];
  const u = unionBoxes(boxes);
  for (const b of boxes) {
    assert.ok(pointInBox(u, b.x + b.w / 2, b.y + b.h / 2), "union must contain each box centre");
  }
  assert.equal(unionBoxes([]), null);
});

test("overlapRatio is 1 for identical boxes and 0 for disjoint", () => {
  const b = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
  assert.ok(Math.abs(overlapRatio(b, { ...b }) - 1) < 1e-9, "identical boxes must fully overlap");
  assert.equal(overlapRatio(b, { x: 0.5, y: 0.5, w: 0.1, h: 0.1 }), 0, "disjoint boxes must not overlap");
});

test("FAILURE PATH: a zero-area box paints nothing, so it can never count as a redaction", () => {
  const degenerate = { x: 0.3, y: 0.3, w: 0, h: 0.02 };
  assert.equal(boxArea(degenerate), 0);
  // A real glyph must NOT be reported as covered by a degenerate box:
  assert.equal(overlapRatio(degenerate, { x: 0.295, y: 0.295, w: 0.02, h: 0.02 }), 0);
  assert.equal(pointInBox({ x: 0.3, y: 0.3, w: 0.02, h: 0.02 }, 0.31, 0.31), true);
});

test("padFor grows the box by ~3 device pixels regardless of page size", () => {
  const base = { x: 0.1, y: 0.1, w: 0.2, h: 0.1 };
  const p600 = padFor(base, 600);
  const p2400 = padFor(base, 2400);
  const grow600 = p600.w - base.w;
  const grow2400 = p2400.w - base.w;
  assert.ok(grow600 > grow2400, "a narrower page needs more normalised padding for the same 3px");
  assert.ok(grow2400 > 0 && grow2400 < 0.01, "padding must stay sub-percent of the page");
  assert.ok(Math.abs(grow600 - 2 * (3 / 600)) < 1e-9);
});
