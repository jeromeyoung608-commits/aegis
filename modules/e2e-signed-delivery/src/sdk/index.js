// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * ========================================================================
 * Aegis — Privacy-First Local Data Cleansing Engine
 *
 * Licensed under the MIT License. Any use is permitted, commercial included,
 * with no fee and no permission needed. Attribution is welcome, not required.
 * ========================================================================
 */

// Public SDK surface for the end-to-end signed-delivery module.
export {
  generateKeyPair, exportPublicKey, importPublicKey, sha256, sign, verify,
  bufToB64, b64ToBuf, toHex, fromHex, hexEq,
} from './crypto.js';

export { buildPdf, assembleArtifact, parseArtifact, verifyArtifact, DELIM } from './pdf.js';

export { openSender, openReceiver } from './transport.js';
