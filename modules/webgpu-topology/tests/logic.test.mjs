// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Pure-logic regression tests for webgpu-topology. No GPU / no browser required:
// these exercise the graph generator, the SharedArrayBuffer memory layout, and the
// config invariants — the parts that previously had zero automated coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planEdges, generate } from '../src/data/generate.js';
import {
  offsets, createSAB, attach, packAttr, attrStatus,
  CTRL, BIT_INFOCUS, BIT_FOCUSON, C_N, C_E,
} from '../src/mem/sab.js';
import { DEFAULTS, STATUS, STATUS_WEIGHTS } from '../src/config.js';

test('planEdges = (N-1) + floor(N*factor)', () => {
  assert.equal(planEdges(100, 1.4), 99 + 140);
  assert.equal(planEdges(100_000, 1.4), 99_999 + 140_000);
  assert.equal(planEdges(10, 0), 9);
});

test('offsets math is self-consistent and positive', () => {
  const N = 5000, E = 12_000;
  const o = offsets(N, E);
  assert.equal(o.total, o.ctrlBytes + o.posBytes + o.velBytes + o.attrBytes + o.edgeBytes);
  assert.equal(o.posBytes, 2 * N * 4);
  assert.equal(o.velBytes, 2 * N * 4);
  assert.equal(o.edgeBytes, 2 * E * 4);
  assert.ok(o.total > 0);
});

test('createSAB produces correctly-sized views and stamps N/E', () => {
  const N = 1000, E = 2400;
  const v = createSAB(N, E);
  assert.equal(v.ctrl.length, CTRL);
  assert.equal(v.pos.length, 2 * N);
  assert.equal(v.vel.length, 2 * N);
  assert.equal(v.attr.length, N);
  assert.equal(v.edge.length, 2 * E);
  assert.equal(v.ctrl[C_N], N);
  assert.equal(v.ctrl[C_E], E);
});

test('attach overlays views without overflow', () => {
  const N = 200, E = 400;
  const o = offsets(N, E);
  const sab = new SharedArrayBuffer(o.total);
  const v = attach(sab, N, E);
  assert.equal(v.pos.length, 2 * N);
  assert.equal(v.edge.length, 2 * E);
  assert.equal(v.attr.length, N);
});

test('packAttr/attrStatus round-trip status and focus bits', () => {
  const w = packAttr(STATUS.CRITICAL, 1, 1);
  assert.equal(attrStatus(w), STATUS.CRITICAL);
  assert.equal((w >> BIT_INFOCUS) & 1, 1);
  assert.equal((w >> BIT_FOCUSON) & 1, 1);

  const w2 = packAttr(STATUS.HEALTHY, 0, 0);
  assert.equal(attrStatus(w2), STATUS.HEALTHY);
  assert.equal((w2 >> BIT_INFOCUS) & 1, 0);
});

test('generate fills a valid graph (count matches plan, edges in range)', () => {
  const N = 300, factor = DEFAULTS.extraEdgeFactor;
  const E = planEdges(N, factor);
  const layout = createSAB(N, E);
  const got = generate(layout, N, factor);
  assert.equal(got, E);
  for (let i = 0; i < E; i++) {
    const a = layout.edge[i * 2], b = layout.edge[i * 2 + 1];
    assert.ok(a >= 0 && a < N && b >= 0 && b < N, `edge ${i} out of range`);
  }
  for (let i = 0; i < N; i++) {
    assert.ok(
      Number.isFinite(layout.pos[i * 2]) && Number.isFinite(layout.pos[i * 2 + 1]),
      `node ${i} position not finite`
    );
  }
});

test('STATUS_WEIGHTS cover 0..2 and sum to 1', () => {
  const sum = STATUS_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.deepEqual(Object.values(STATUS).sort((a, b) => a - b), [0, 1, 2]);
});
