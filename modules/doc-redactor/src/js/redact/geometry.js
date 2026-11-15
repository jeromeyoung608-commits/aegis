// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Rectangle helpers. All boxes are normalized to the page: x, y, w, h ∈ [0, 1]
 * with the origin at the top-left corner.
 */

import { clamp } from '../core/utils.js';

export function clampBox(box) {
  const x = clamp(box.x, 0, 1);
  const y = clamp(box.y, 0, 1);
  const w = clamp(box.w, 0, 1 - x);
  const h = clamp(box.h, 0, 1 - y);
  return { x, y, w, h };
}

export function boxFromPoints(x1, y1, x2, y2) {
  return clampBox({
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1)
  });
}

export function expandBox(box, padding) {
  return clampBox({
    x: box.x - padding,
    y: box.y - padding,
    w: box.w + padding * 2,
    h: box.h + padding * 2
  });
}

export function unionBoxes(boxes) {
  if (!boxes || !boxes.length) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }
  return clampBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
}

export function boxArea(box) {
  return box.w * box.h;
}

/** Intersection area divided by the smaller box area. */
export function overlapRatio(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  const intersection = (x2 - x1) * (y2 - y1);
  const smaller = Math.min(boxArea(a), boxArea(b));
  return smaller > 0 ? intersection / smaller : 0;
}

export function pointInBox(box, x, y) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

/** Grow a detection box slightly so glyph edges are fully covered. */
export function padFor(box, pageWidthPx) {
  const pad = 3 / Math.max(1, pageWidthPx);
  return expandBox(box, pad);
}
