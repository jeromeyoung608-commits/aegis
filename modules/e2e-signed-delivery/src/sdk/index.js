// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Privacy-First Local Data Cleansing Engine
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

// Public SDK surface for the end-to-end signed-delivery module.
export {
  generateKeyPair, exportPublicKey, importPublicKey, sha256, sign, verify,
  bufToB64, b64ToBuf, toHex, fromHex, hexEq,
} from './crypto.js';

export { buildPdf, assembleArtifact, parseArtifact, verifyArtifact, DELIM } from './pdf.js';

export { openSender, openReceiver } from './transport.js';
