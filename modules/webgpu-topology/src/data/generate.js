// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// src/data/generate.js — fake topology generator (no backend required).
//
// Produces a connected-ish graph: a random spanning tree guarantees connectivity,
// plus extra random edges give it a realistic mesh density. Node positions start
// scattered in a unit disc; the physics Worker will spread them into a layout.
// Status codes emulate an industrial monitoring fleet (healthy/warning/critical).

import { STATUS_WEIGHTS, STATUS } from '../config.js';
import { packAttr } from '../mem/sab.js';

/** Deterministic-ish edge count for a given node count + extra factor. */
export function planEdges(N, extraFactor) {
  const tree = N - 1;
  const extra = Math.floor(N * extraFactor);
  return tree + extra;
}

function pickStatus() {
  const r = Math.random();
  let acc = 0;
  for (const [s, w] of STATUS_WEIGHTS) {
    acc += w;
    if (r <= acc) return s;
  }
  return STATUS.HEALTHY;
}

/**
 * Fill the SAB-backed layout with a generated graph.
 * @param {object} layout  result of attach()/createSAB()
 * @param {number} N       node count
 * @param {number} factor  extra-edge factor
 * @returns {number} actual edge count E
 */
export function generate(layout, N, factor) {
  const { pos, attr, edge } = layout;

  // Positions: uniform in a unit disc (radius 1), slight bias to center.
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.9;
    pos[i * 2] = Math.cos(a) * r;
    pos[i * 2 + 1] = Math.sin(a) * r;
    attr[i] = packAttr(pickStatus());
  }

  let e = 0;
  // Spanning tree: every node (except 0) links to a random earlier node.
  for (let i = 1; i < N; i++) {
    const j = (Math.random() * i) | 0;
    edge[e * 2] = i;
    edge[e * 2 + 1] = j;
    e++;
  }
  // Extra random edges (avoid trivial self-links).
  const extra = Math.floor(N * factor);
  for (let k = 0; k < extra; k++) {
    const a = (Math.random() * N) | 0;
    let b = (Math.random() * N) | 0;
    if (a === b) b = (b + 1) % N;
    edge[e * 2] = a;
    edge[e * 2 + 1] = b;
    e++;
  }

  return e;
}
