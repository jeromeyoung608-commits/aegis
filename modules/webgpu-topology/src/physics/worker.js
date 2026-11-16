// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/physics/worker.js — force-directed layout running OFF the main thread.
//
// It reads/writes the SAME SharedArrayBuffer the GPU renderer reads, so there is
// no postMessage serialization and no per-tick allocation. The heavy part (O(N)
// repulsion via a spatial-hash grid + O(E) spring attraction) is kept allocation
// free: all scratch arrays are preallocated once and reused every tick, so GC
// never stalls the 60 FPS render loop on the main thread.

import { attach, C_TICK, C_RUNNING, C_READY, C_N, C_E, C_TICKMS } from '../mem/sab.js';

let L = null;          // SAB views
let P = null;          // physics params
let N = 0, E = 0;

// Preallocated scratch (sized to N/E at init, reused every tick — no GC churn).
let force = null;      // Float32Array(2N)
let cellOf = null;     // Int32Array(N)
let cellStart = null;  // Int32Array(N)
let cursor = null;     // Int32Array(N)
let bucket = null;     // Int32Array(N)

// --- FR cooling schedule -----------------------------------------------------
// Classic Fruchterman-Reingold caps each node's displacement by a temperature that
// decays every tick. Without it the simulation churns FOREVER and focused nodes
// keep drifting after a click ("I clicked here but the highlight ran over there").
// Once the temperature bottoms out the worker freezes the layout (and keeps
// idling cheaply) until the user resumes or rebuilds.
let temp = 0;              // current temperature = max |velocity| this tick
let settledSent = false;   // 'settled' message emitted once per run
const TEMP_DECAY = 0.985;  // per-tick cooling rate (settles in ~300 ticks ≈ 3s)
const TEMP_STOP = 0.02;    // below this the layout counts as settled

self.onmessage = (ev) => {
  const m = ev.data;
  if (m.type === 'init') {
    L = attach(m.sab, m.N, m.E);
    N = m.N; E = m.E; P = m.params;
    force = new Float32Array(2 * N);
    cellOf = new Int32Array(N);
    cellStart = new Int32Array(N);
    cursor = new Int32Array(N);
    bucket = new Int32Array(N);
    L.ctrl[C_RUNNING] = 1;
    L.ctrl[C_READY] = 1;
    temp = (P.maxSpeed || 4) * (P.dt || 0.6); // full heat on a fresh build
    settledSent = false;
    loop();
  } else if (m.type === 'pause') {
    L.ctrl[C_RUNNING] = 0;
  } else if (m.type === 'resume') {
    L.ctrl[C_RUNNING] = 1;
    // Re-heating a frozen layout: a gentle quarter-heat re-relaxes without exploding.
    if (temp <= TEMP_STOP) temp = (P.maxSpeed || 4) * (P.dt || 0.6) * 0.25;
    settledSent = false;
  }
};

function loop() {
  const running = L && L.ctrl[C_RUNNING] === 1;
  const active = running && temp > TEMP_STOP; // frozen once cooled down
  if (active) tick();
  // Self-reschedule. When paused/settled we idle slowly to save CPU; while
  // simulating we run flat-out (setTimeout 0) so layout converges fast.
  setTimeout(loop, active ? 0 : 120);
}

function tick() {
  const t0 = performance.now();
  const { pos, vel, edge } = L;
  const { damping, dt, maxSpeed, gravity, kc } = P;
  const B = P.maxBound || 100; // numerical safety net only; gravity keeps graph @ ~4

  // --- 1. build spatial-hash grid (counting sort, allocation free) ----------
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = pos[i * 2], y = pos[i * 2 + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const spanX = Math.max(1e-3, maxX - minX);
  const spanY = Math.max(1e-3, maxY - minY);
  // Fruchterman-Reingold ideal edge length, sized by N (k = kc / cbrt(N/2.4)) so the
  // RELATIVE spacing is N-independent — the camera frames the resulting bbox anyway.
  // (The old fixed repulsion collapsed 100k nodes onto the bounds.)
  const k = (kc || 1.0) / Math.cbrt(N / 2.4);
  // Grid cell ~= 3 ideal edges: keeps ~few nodes/cell, so summing ALL 3x3 neighbours
  // is both cheap (O(N*~24)) and an accurate local repulsion — no neighbour cap.
  const cellSize = Math.max(1e-3, k * 3);
  const gMax = Math.max(1, Math.floor(Math.sqrt(N)));
  const gw = Math.min(gMax, Math.max(1, Math.ceil(spanX / cellSize)));
  const gh = Math.min(gMax, Math.max(1, Math.ceil(spanY / cellSize)));
  const invCellX = gw / spanX;
  const invCellY = gh / spanY;

  cellStart.fill(0);
  for (let i = 0; i < N; i++) {
    let cx = ((pos[i * 2] - minX) * invCellX) | 0;
    let cy = ((pos[i * 2 + 1] - minY) * invCellY) | 0;
    if (cx < 0) cx = 0; else if (cx >= gw) cx = gw - 1;
    if (cy < 0) cy = 0; else if (cy >= gh) cy = gh - 1;
    const c = cx + cy * gw;
    cellOf[i] = c;
    cellStart[c]++;
  }
  // prefix sum -> exclusive starts
  let acc = 0;
  for (let c = 0; c < gw * gh; c++) {
    const n = cellStart[c];
    cellStart[c] = acc;
    acc += n;
  }
  cursor.set(cellStart.subarray(0, gw * gh));
  for (let i = 0; i < N; i++) {
    const c = cellOf[i];
    bucket[cursor[c]++] = i;
  }

  // --- 2. repulsion (FR: k^2/d, summed over ALL 3x3 neighbours) ------------
  force.fill(0);
  const k2 = k * k;
  for (let i = 0; i < N; i++) {
    const xi = pos[i * 2], yi = pos[i * 2 + 1];
    const cx = cellOf[i] % gw;
    const cy = (cellOf[i] / gw) | 0;
    let fx = 0, fy = 0;
    for (let oy = -1; oy <= 1; oy++) {
      const ny = cy + oy; if (ny < 0 || ny >= gh) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox; if (nx < 0 || nx >= gw) continue;
        const c = nx + ny * gw;
        const s = cellStart[c], e = (c + 1 < gw * gh ? cellStart[c + 1] : N);
        for (let nk = s; nk < e; nk++) {
          const j = bucket[nk]; if (j === i) continue;
          const dx = xi - pos[j * 2];
          const dy = yi - pos[j * 2 + 1];
          const d2 = dx * dx + dy * dy + 1e-4;
          const dist = Math.sqrt(d2);
          const f = k2 / dist; // |F| = k^2 / d  (Fruchterman-Reingold repulsion)
          fx += (f * dx) / dist;
          fy += (f * dy) / dist;
        }
      }
    }
    // Centering gravity pulls the sparse graph into a compact, FILLED blob instead
    // of a hollow ring (pure FR repulsion pushes a tree out to a shell). The camera
    // frames the resulting bbox, so the absolute scale is irrelevant.
    force[i * 2] += fx - gravity * xi;
    force[i * 2 + 1] += fy - gravity * yi;
  }

  // --- 3. attraction along edges (FR: d^2/k) -------------------------------
  for (let e = 0; e < E; e++) {
    const a = edge[e * 2], b = edge[e * 2 + 1];
    const dx = pos[b * 2] - pos[a * 2];
    const dy = pos[b * 2 + 1] - pos[a * 2 + 1];
    const dist = Math.sqrt(dx * dx + dy * dy) + 1e-4;
    const f = (dist * dist) / k; // |F| = d^2 / k  (FR attraction)
    const fx = (dx / dist) * f;
    const fy = (dy / dist) * f;
    force[a * 2] += fx; force[a * 2 + 1] += fy;
    force[b * 2] -= fx; force[b * 2 + 1] -= fy;
  }

  // --- 4. integrate (Verlet-ish: velocity + damping + clamp) ----------------
  // FR cooling: decay the temperature, then cap each node's displacement at it,
  // so the layout converges and FREEZES instead of churning forever.
  temp *= TEMP_DECAY;
  const ms2 = maxSpeed * maxSpeed;
  for (let i = 0; i < N; i++) {
    let vx = (vel[i * 2] + force[i * 2] * dt) * damping;
    let vy = (vel[i * 2 + 1] + force[i * 2 + 1] * dt) * damping;
    let sp2 = vx * vx + vy * vy;
    if (sp2 > ms2) { const s = maxSpeed / Math.sqrt(sp2); vx *= s; vy *= s; sp2 = ms2; }
    if (sp2 > temp * temp) { const s = temp / Math.sqrt(sp2); vx *= s; vy *= s; }
    vel[i * 2] = vx; vel[i * 2 + 1] = vy;
    let x = pos[i * 2] + vx * dt;
    let y = pos[i * 2 + 1] + vy * dt;
    if (x < -B) { x = -B; vel[i * 2] *= -0.5; }
    else if (x > B) { x = B; vel[i * 2] *= -0.5; }
    if (y < -B) { y = -B; vel[i * 2 + 1] *= -0.5; }
    else if (y > B) { y = B; vel[i * 2 + 1] *= -0.5; }
    pos[i * 2] = x; pos[i * 2 + 1] = y;
  }

  const t1 = performance.now();
  L.ctrl[C_TICK]++;
  L.ctrl[C_TICKMS] = Math.round((t1 - t0) * 1000); // fixed-point ms (integer)

  // Cooled out -> freeze and tell the main thread so it can do a final framing.
  if (temp <= TEMP_STOP) {
    temp = 0;
    if (!settledSent) { settledSent = true; self.postMessage({ type: 'settled' }); }
  }
}
