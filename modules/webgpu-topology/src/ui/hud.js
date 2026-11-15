// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/ui/hud.js — heads-up display: FPS, frame time, physics tick time, counts.

export class Hud {
  constructor(els) {
    this.els = els; // { fps, frame, physics, nodes, edges, draws }
  }
  update(s) {
    if (this.els.fps) this.els.fps.textContent = s.fps.toFixed(0);
    if (this.els.frame) this.els.frame.textContent = s.frameMs.toFixed(2);
    if (this.els.physics) this.els.physics.textContent = s.physicsMs.toFixed(2);
    if (this.els.nodes) this.els.nodes.textContent = s.nodes.toLocaleString();
    if (this.els.edges) this.els.edges.textContent = s.edges.toLocaleString();
    if (this.els.draws) this.els.draws.textContent = s.draws;
  }
}
