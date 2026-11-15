// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// src/mem/sab.js — SharedArrayBuffer layout: the zero-copy bridge between the
// physics Worker and the main-thread GPU renderer.
//
// Why SAB: the Worker writes node positions every physics tick; the main thread
// reads them every animation frame. With a normal postMessage the ArrayBuffer is
// *cloned* (and detached if transferred), forcing per-frame allocation + GC churn.
// A SharedArrayBuffer is a single backing store mapped by BOTH threads with typed
// array views — no copy, no allocation, no GC pause. That is the explicit goal of
// the "Zero-Copy" challenge item.
//
// Memory map (all offsets in bytes):
//   [0]            control   : Int32Array(CTRL)  -> tick, running, N, E, ready, ...
//   [ctrlBytes]    pos       : Float32Array(2N)  -> x,y interleaved (written by Worker)
//   [+posBytes]    vel       : Float32Array(2N)  -> velocity (Worker only)
//   [+velBytes]    attr      : Uint32Array(N)    -> status(low2) | inFocus(bit2) | focusActive(bit3)
//   [+attrBytes]   edge      : Uint32Array(2E)   -> endpoint indices (static)
//
// `attr` packs both the base status (set at generation, never touched by physics)
// and the interactive focus bits (set by the main thread). The shader reads `attr`
// for data-driven coloring AND focus dimming, so this one shared buffer serves both.

export const CTRL = 16; // number of int32 control slots

// Control slot indices
export const C_TICK = 0;
export const C_RUNNING = 1;
export const C_N = 2;
export const C_E = 3;
export const C_READY = 4;
export const C_TICKMS = 5; // last physics tick duration, integer fixed-point ms

// attr bit layout (Uint32 per node)
export const BIT_STATUS = 0;   // low 2 bits: 0 healthy, 1 warning, 2 critical
export const BIT_INFOCUS = 2;  // 1 if node belongs to the focused subgraph
export const BIT_FOCUSON = 3;  // 1 if a focus is currently active (dim the rest)
export const BIT_HOVER = 4;    // 1 if the pointer is currently hovering this node

export function offsets(N, E) {
  const ctrlBytes = CTRL * 4;
  const posBytes = 2 * N * 4;
  const velBytes = 2 * N * 4;
  const attrBytes = N * 4;
  const edgeBytes = 2 * E * 4;
  const total = ctrlBytes + posBytes + velBytes + attrBytes + edgeBytes;
  return { ctrlBytes, posBytes, velBytes, attrBytes, edgeBytes, total };
}

/** Attach typed-array views over an existing SharedArrayBuffer (used by both threads). */
export function attach(sab, N, E) {
  const o = offsets(N, E);
  return {
    sab,
    ctrl: new Int32Array(sab, 0, CTRL),
    pos: new Float32Array(sab, o.ctrlBytes, 2 * N),
    vel: new Float32Array(sab, o.ctrlBytes + o.posBytes, 2 * N),
    attr: new Uint32Array(sab, o.ctrlBytes + o.posBytes + o.velBytes, N),
    edge: new Uint32Array(sab, o.ctrlBytes + o.posBytes + o.velBytes + o.attrBytes, 2 * E),
    ...o,
  };
}

/** Create a fresh SharedArrayBuffer + views for N nodes and E edges. */
export function createSAB(N, E) {
  const o = offsets(N, E);
  const sab = new SharedArrayBuffer(o.total);
  const v = attach(sab, N, E);
  v.ctrl[C_N] = N;
  v.ctrl[C_E] = E;
  return v;
}

/** Pack/unpack the attr word. */
export function packAttr(status, inFocus = 0, focusOn = 0) {
  return (status & 3) | ((inFocus & 1) << BIT_INFOCUS) | ((focusOn & 1) << BIT_FOCUSON);
}
export function attrStatus(a) { return a & 3; }
