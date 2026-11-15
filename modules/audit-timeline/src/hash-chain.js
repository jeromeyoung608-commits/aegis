// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Tamper-Evident Hash-Chained Audit Trail
 *
 * Licensed under the MIT License. Any use is permitted, commercial included,
 * with no fee and no permission needed. Attribution is welcome, not required.
 * ========================================================================
 */

// Single import seam for the hash chain. The implementation shipped with the
// sync-canvas module is reused instead of forked, so both products verify the
// same way: hash[i] = SHA-256(hash[i-1] + "|" + canonical(payload)).
export {
  HashChain,
  GENESIS,
  canonical,
  sha256Hex,
} from '../../sync-canvas/src/audit/HashChain.js';
