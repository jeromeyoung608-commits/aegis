// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/config.js — default configuration + UI-facing constants.
// Tunable knobs live here so the physics/render modules stay declarative.

export const DEFAULTS = {
  nodeCount: 100_000,   // default graph size (tens of thousands is smooth; 1M+ stresses physics)
  maxNodeCount: 1_000_000,
  extraEdgeFactor: 1.4, // additional random edges beyond the spanning tree (degree ~ 2.4)
  radius: 2.0,          // node radius in CSS pixels (small dots; the edge web is the star)
  colorMode: 0,         // 0 = by status, 1 = by id hue
  physics: {
    // Fruchterman-Reingold layout. k = kc / cbrt(N/2.4) sizes the ideal edge length
    // by N so the RELATIVE spacing is N-independent. Weak gravity + a generous kc
    // spread the graph across the viewport so long edges stay visible (the "web"
    // look) while correct FR repulsion keeps it an organic mesh, not a border ring.
    // The camera auto-fits the live bbox, so the absolute scale does not matter.
    kc: 2.2,            // ideal-edge-length scale -> spread web
    gravity: 0.02,      // centering force (per unit distance) -> gentle, keeps clusters
    damping: 0.86,      // velocity decay per tick
    dt: 0.6,            // integration step
    maxSpeed: 4.0,      // velocity clamp (world units / tick)
    maxBound: 100,      // numerical safety net only
  },
};

// Node status weights for the fake generator (industrial monitoring flavor).
export const STATUS = { HEALTHY: 0, WARNING: 1, CRITICAL: 2 };
export const STATUS_WEIGHTS = [
  [STATUS.HEALTHY, 0.72],
  [STATUS.WARNING, 0.2],
  [STATUS.CRITICAL, 0.08],
];
