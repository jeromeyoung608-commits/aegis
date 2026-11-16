// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Tamper-Evident Hash-Chained Audit Trail
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

// Shared timeline renderer. The shell uses it in a compact card; the standalone
// compliance page uses the same DOM with larger typography, so both surfaces can
// never drift apart.

import { formatClock, shortHash } from './trail.js';

const EMPTY_TEXT = 'No audit events yet. Run a document through the workbench.';

/** One-line integrity verdict for a badge. */
export function chainStatus(trail) {
  if (trail.loadError) return { text: trail.loadError, tone: 'bad' };
  if (trail.brokenAt !== null) {
    return { text: `chain broken at link #${trail.brokenAt + 1}`, tone: 'bad' };
  }
  const links = trail.entries.length;
  if (links === 0) return { text: 'chain empty · append-only log ready', tone: 'idle' };
  return {
    text: `chain intact · ${links} link${links === 1 ? '' : 's'} · head ${shortHash(trail.head, 8)}…`,
    tone: 'ok',
  };
}

/**
 * Paint the trail into an ordered list.
 * @param {HTMLOListElement} listEl
 * @param {import('./trail.js').AuditTrail} trail
 * @param {{emptyText?:string}} [options]
 */
export function renderTimeline(listEl, trail, { emptyText = EMPTY_TEXT } = {}) {
  listEl.replaceChildren();

  const entries = trail.entries;
  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'tl-empty';
    empty.textContent = emptyText;
    listEl.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const payload = entry.payload || {};
    const item = document.createElement('li');
    item.className = 'tl-item';
    if (trail.brokenAt === entry.index) item.classList.add('tl-broken');

    const top = document.createElement('div');
    top.className = 'tl-top';

    const time = document.createElement('span');
    time.className = 'tl-time';
    time.textContent = `[${formatClock(payload.at)}]`;

    const actor = document.createElement('span');
    actor.className = 'tl-actor';
    actor.textContent = payload.actor || 'system';

    top.append(time, actor);

    const event = document.createElement('div');
    event.className = 'tl-event';
    event.textContent = payload.event || '(unnamed event)';

    item.append(top, event);

    if (payload.detail) {
      const detail = document.createElement('div');
      detail.className = 'tl-detail';
      detail.textContent = payload.detail;
      item.appendChild(detail);
    }

    if (payload.fingerprint) {
      const fingerprint = document.createElement('div');
      fingerprint.className = 'tl-fingerprint';
      fingerprint.textContent = `Fingerprint ${payload.fingerprint}`;
      item.appendChild(fingerprint);
    }

    const link = document.createElement('div');
    link.className = 'tl-hash';
    link.textContent = `#${String(entry.index + 1).padStart(2, '0')} ${shortHash(entry.hash, 12)}…`;
    item.appendChild(link);

    listEl.appendChild(item);
  }

  listEl.scrollTop = listEl.scrollHeight;
}
