// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * ========================================================================
 * Aegis — Tamper-Evident Hash-Chained Audit Trail
 *
 * Licensed under the MIT License. Any use is permitted, commercial included,
 * with no fee and no permission needed. Attribution is welcome, not required.
 * ========================================================================
 */

console.log(
  '%c Aegis Audit %c Engine by Jerome Young | Contact: jeromeyoung608@gmail.com ',
  'background: #d4b06a; color: #171204; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a2028; color: #b3bcc8; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);

import { AuditTrail, shortHash } from './trail.js';
import { chainStatus, renderTimeline } from './timeline.js';

const $ = (id) => document.getElementById(id);

function safeStorage() {
  try {
    const probe = '__aegis_audit_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

const storage = safeStorage();
const trail = new AuditTrail({ storage });

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function paint() {
  renderTimeline($('timeline'), trail, {
    emptyText: 'No audit events yet. Open the workbench and run a document through the closed loop.',
  });

  const status = chainStatus(trail);
  const state = $('chainState');
  state.textContent = status.text;
  state.className = 'state ' + status.tone;

  $('linkCount').textContent = String(trail.entries.length);
  $('headHash').textContent = trail.entries.length > 0 ? shortHash(trail.head, 16) + '…' : '—';
  $('storageState').textContent = storage ? 'localStorage' : 'in-memory';
}

trail.subscribe(paint);
paint();
trail.load().then(paint);

$('btnVerify').addEventListener('click', async () => {
  const b = $('btnVerify');
  b.setAttribute('aria-busy', 'true');
  try {
    const brokenAt = await trail.verify();
    paint();
    if (brokenAt === null) {
      $('footnote').textContent =
        `Verified ${trail.entries.length} link(s) · head ${shortHash(trail.head, 24)}… · chain intact`;
    } else {
      $('footnote').textContent =
        `Tamper detected at link #${brokenAt + 1} · this entry or anything after it is no longer trustworthy`;
    }
  } finally { b.setAttribute('aria-busy', 'false'); }
});

$('btnExport').addEventListener('click', () => {
  const payload = {
    ...trail.snapshot(),
    source: 'aegis.audit-timeline',
    exportedAt: new Date().toISOString(),
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `aegis-audit-${stamp}.json`
  );
  $('footnote').textContent = `Exported ${trail.entries.length} link(s) as JSON · no document bytes included`;
});

let clearArmed = false;
let clearTimer = null;
$('btnClear').addEventListener('click', () => {
  const button = $('btnClear');
  if (!clearArmed) {
    clearArmed = true;
    button.textContent = 'Confirm clear';
    clearTimer = setTimeout(() => {
      clearArmed = false;
      button.textContent = 'Clear';
    }, 4000);
    return;
  }
  clearTimeout(clearTimer);
  clearArmed = false;
  button.textContent = 'Clear';
  trail.reset();
  $('footnote').textContent = 'Trail cleared · a fresh genesis link will be written on the next event';
});
