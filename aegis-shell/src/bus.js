// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// aegis-shell/src/bus.js — minimal EventBus used for the shell's internal flow
// state machine and UI events. The cross-iframe postMessage bridge is wired in
// app.js; this bus is the in-page decoupling layer (20-years-of-experience habit:
// never let modules talk directly, route everything through one bus).

export class EventBus {
  constructor() { this.listeners = new Map(); }

  on(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(cb);
    return () => this.listeners.get(type)?.delete(cb);
  }

  emit(type, payload) {
    this.listeners.get(type)?.forEach((cb) => {
      try { cb(payload); } catch (err) { console.error('[bus]', type, err); }
    });
  }
}
