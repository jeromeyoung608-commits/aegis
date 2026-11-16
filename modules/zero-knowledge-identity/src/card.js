// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Zero-Knowledge Identity & Local Key Vault
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */
// Aegis/zero-knowledge-identity/src/card.js
// The visual side of the identity: a deterministic identicon derived from the
// fingerprint, and the shareable .json business card.
//
// The avatar is a pure function of the fingerprint, so two people comparing
// screenshots can eyeball whether they are looking at the same public key
// before they ever compare the long hex string.

import { fingerprintDigits } from './crypto.js';
import { publicCard } from './identity.js';

const GRID = 5;

function hueFrom(digits) {
  return parseInt(digits.slice(0, 4), 16) % 360;
}

export function renderAvatar(canvas, fingerprint) {
  const digits = fingerprintDigits(fingerprint) || '0'.repeat(64);
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cell = size / GRID;
  const hue = hueFrom(digits);

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = `hsl(${hue} 70% 8%)`;
  ctx.fillRect(0, 0, size, size);

  // Mirror the left three columns so the mark reads as a symmetric seal.
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < Math.ceil(GRID / 2); x += 1) {
      const nibble = parseInt(digits[(y * GRID + x) % digits.length], 16);
      if (nibble % 2 === 0) continue;
      const light = 45 + (nibble % 8) * 4;
      ctx.fillStyle = `hsl(${(hue + nibble * 6) % 360} 78% ${light}%)`;
      ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
      ctx.fillRect((GRID - 1 - x) * cell, y * cell, cell - 1, cell - 1);
    }
  }

  // Corner ticks: a quiet frame so the mark never looks like a random blob.
  ctx.strokeStyle = `hsla(${hue} 60% 70% / 0.55)`;
  ctx.lineWidth = 2;
  const inset = 4;
  const arm = size * 0.16;
  ctx.beginPath();
  ctx.moveTo(inset, inset + arm); ctx.lineTo(inset, inset); ctx.lineTo(inset + arm, inset);
  ctx.moveTo(size - inset - arm, inset); ctx.lineTo(size - inset, inset); ctx.lineTo(size - inset, inset + arm);
  ctx.moveTo(inset, size - inset - arm); ctx.lineTo(inset, size - inset); ctx.lineTo(inset + arm, size - inset);
  ctx.moveTo(size - inset - arm, size - inset); ctx.lineTo(size - inset, size - inset); ctx.lineTo(size - inset, size - inset - arm);
  ctx.stroke();
}

// The business card is public-only by construction: it is built from
// publicCard(record), so the wrapped private key can never be exported here.
export function buildCardBlob(record) {
  const payload = {
    kind: 'aegis-identity-card',
    version: 1,
    issuedBy: 'AEGIS — Zero-Knowledge Identity',
    ...publicCard(record),
    publicKeyEncoding: 'spki+base64',
    verification: 'ECDSA P-256 with SHA-256; fingerprint = SHA-256 over the SPKI bytes',
  };
  return new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}
