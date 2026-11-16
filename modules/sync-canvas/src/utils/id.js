// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * sync-canvas — Distributed State & Real-time Collaboration Engine
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

/**
 * Identifier helpers.
 *
 * A site id is a 5-character base36 string. It doubles as the tie-breaker for
 * concurrent inserts, so it is compared lexicographically everywhere.
 */

export function makeSite() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += abc[(Math.random() * abc.length) | 0];
  return out;
}

export function makeNodeId(kind = 'n') {
  return `${kind}${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function makeRoom() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += abc[(Math.random() * abc.length) | 0];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}
