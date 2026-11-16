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

// Single import seam for the hash chain. The implementation shipped with the
// sync-canvas module is reused instead of forked, so both products verify the
// same way: hash[i] = SHA-256(hash[i-1] + "|" + canonical(payload)).
export {
  HashChain,
  GENESIS,
  canonical,
  sha256Hex,
} from '../../sync-canvas/src/audit/HashChain.js';
