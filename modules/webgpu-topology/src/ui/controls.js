// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/ui/controls.js — bind the DOM controls to a small config + event callbacks.

export class Controls {
  constructor(ids) { this.ids = ids; this.cb = {}; }

  on(name, fn) { this.cb[name] = fn; }

  getNodeCount() { return parseInt(document.getElementById(this.ids.nodeCount).value, 10) || 100000; }
  getRadius() { return parseFloat(document.getElementById(this.ids.radius).value) || 3; }
  getColorMode() { return parseInt(document.getElementById(this.ids.colorMode).value, 10) || 0; }

  bind() {
    document.getElementById(this.ids.regenerate).addEventListener('click', () => this.cb.regenerate?.());
    document.getElementById(this.ids.play).addEventListener('click', () => this.cb.togglePlay?.());
    document.getElementById(this.ids.resetView).addEventListener('click', () => this.cb.resetView?.());
    document.getElementById(this.ids.clearFocus).addEventListener('click', () => this.cb.clearFocus?.());
    document.getElementById(this.ids.colorMode).addEventListener('change', () => this.cb.colorMode?.());
    document.getElementById(this.ids.radius).addEventListener('input', () => this.cb.radius?.());

    // Node-count slider: live-update the readout on drag, rebuild the graph on
    // release (change) so we don't thrash the Worker on every pixel of travel.
    const nc = document.getElementById(this.ids.nodeCount);
    const ncl = document.getElementById('nodeCountVal');
    if (nc) {
      nc.addEventListener('input', () => { if (ncl) ncl.textContent = nc.value; });
      nc.addEventListener('change', () => this.cb.nodeCount?.());
    }
  }

  setPlayLabel(running) {
    document.getElementById(this.ids.play).textContent = running ? 'Pause physics' : 'Resume physics';
  }
}
