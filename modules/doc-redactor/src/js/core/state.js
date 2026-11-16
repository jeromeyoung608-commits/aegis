// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Central application state plus a tiny event emitter.
 * Only app.js mutates state; panels and views read from it.
 */

export const state = {
  pages: [],            // flat list of page records (see ingest/page-factory.js)
  activePageId: null,
  selectedId: null,     // selected detection id
  mode: 'review',       // 'review' | 'mark'
  zoom: 0,              // 0 = fit to viewport, otherwise absolute multiplier
  rules: {},            // ruleId -> boolean
  customTerms: [],
  engineLang: 'deu+eng',
  ocrBusy: false,
  exporting: false,
  export: {
    dpi: 200,
    format: 'png',
    vectorRects: true
  }
};

class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const set = this.listeners.get(type);
    if (set) set.delete(handler);
  }

  emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[bus:${type}]`, err);
      }
    }
  }
}

export const bus = new Emitter();

export function getActivePage() {
  return state.pages.find((p) => p.id === state.activePageId) || null;
}

export function getPageById(id) {
  return state.pages.find((p) => p.id === id) || null;
}

export function countDetections(pages = state.pages) {
  let total = 0;
  for (const page of pages) total += page.detections.filter((d) => d.enabled !== false).length;
  return total;
}
