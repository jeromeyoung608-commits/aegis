// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/sdk/pdf.js — assemble a "signed artifact" from a PDF document + a signature
// trailer, and verify it on the receiver side.
//
// Design (kept deliberately simple so the tamper test is unambiguous):
//   artifact = [ PDF document bytes ] + DELIM + [ UTF-8 JSON signature trailer ]
//
// The SHA-256 used for the ECDSA signatures covers ONLY the PDF document bytes
// (everything before DELIM). On receipt the boss recomputes that hash and checks
// it matches the embedded hash, then verifies both signers' ECDSA signatures.
// Flipping even one byte of the document changes the hash => verification fails.
//
// pdf-lib (window.PDFLib, vendored UMD) is used only to render the canvas image
// into a PDF. The signature logic is independent and unit-tested in Node.

import { sha256, hexEq, verify } from './crypto.js';

const DELIM = '\n%AEGIS_SIG_V1%\n';

const dec = new TextDecoder();
const enc = new TextEncoder();

// pdf-lib is a vendored UMD bundle exposed as the window.PDFLib global by
// index.html. The lookup is lazy (inside buildPdf) so importing this module in
// any context — including the aegis-shell, which only uses parse/assemble/verify
// — never requires the library to be present.
function getPDFLib() {
  if (typeof window === 'undefined' || !window.PDFLib) {
    throw new Error('PDFLib not loaded (browser only)');
  }
  return window.PDFLib;
}

/**
 * Render a PNG (already-encoded bytes) into a single-page PDF.
 * @param {Uint8Array} pngBytes PNG image bytes
 * @param {{width:number,height:number}} dims intrinsic pixel size of the PNG
 * @returns {Promise<Uint8Array>} PDF document bytes (NO trailer yet)
 */
export async function buildPdf(pngBytes, dims) {
  const PDFLib = getPDFLib();
  const doc = await PDFLib.PDFDocument.create();
  const page = doc.addPage([dims.width, dims.height]);
  const img = await doc.embedPng(pngBytes);
  page.drawImage(img, { x: 0, y: 0, width: dims.width, height: dims.height });
  const bytes = await doc.save();
  return new Uint8Array(bytes);
}

/**
 * Pack document bytes + a JSON signature trailer into one artifact.
 * @param {Uint8Array} docBytes
 * @param {object} trailer plain object (will be JSON-stringified)
 * @returns {Uint8Array}
 */
export function assembleArtifact(docBytes, trailer) {
  const t = enc.encode(JSON.stringify(trailer));
  const out = new Uint8Array(docBytes.length + DELIM.length + t.length);
  out.set(docBytes, 0);
  out.set(enc.encode(DELIM), docBytes.length);
  out.set(t, docBytes.length + DELIM.length);
  return out;
}

/**
 * Split an artifact back into its document bytes and parsed trailer.
 * @returns {{docBytes:Uint8Array, trailer:object}|null} null if no valid delimiter
 */
export function parseArtifact(artifactBytes) {
  // The document region is arbitrary binary (a PDF). Decoding the whole artifact
  // as UTF-8 would let multibyte/edge bytes shift string indices away from byte
  // indices, so `subarray(0, stringIndex)` would slice the wrong number of bytes.
  // Search for the delimiter's exact byte pattern instead (byte-accurate), and
  // only UTF-8-decode the trailing JSON trailer (which is pure ASCII).
  const needle = enc.encode(DELIM);
  let idx = -1;
  for (let i = artifactBytes.length - needle.length; i >= 0; i--) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (artifactBytes[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) { idx = i; break; }
  }
  if (idx === -1) return null;
  const docBytes = artifactBytes.subarray(0, idx);
  const trailerBytes = artifactBytes.subarray(idx + needle.length);
  let trailer;
  try {
    trailer = JSON.parse(dec.decode(trailerBytes));
  } catch {
    return null;
  }
  return { docBytes, trailer };
}

/**
 * Verify an artifact: recompute the document hash, compare to the embedded hash,
 * and verify every signer's ECDSA signature against the embedded public key.
 * @param {Uint8Array} artifactBytes
 * @param {{importPublicKeyVerify?:boolean}} [opts]
 * @returns {Promise<{ok:boolean, hashMatch:boolean, signers:Array<{id:string,ok:boolean}>, reason:string}>}
 */
export async function verifyArtifact(artifactBytes) {
  const parsed = parseArtifact(artifactBytes);
  if (!parsed) return { ok: false, hashMatch: false, signers: [], reason: 'No signature trailer found.' };
  const { docBytes, trailer } = parsed;

  const recomputed = await sha256(docBytes);
  const hashMatch = typeof trailer.hash === 'string' && hexEq(recomputed.hex, trailer.hash);

  const signers = [];
  let allSigsOk = true;
  for (const s of trailer.signers || []) {
    const ok = hashMatch && (await verify(s.pub, recomputed.raw, s.sig));
    if (!ok) allSigsOk = false;
    signers.push({ id: s.id, ok });
  }

  const ok = hashMatch && allSigsOk && signers.length > 0;
  const reason = ok
    ? `Verified: SHA-256 ${recomputed.hex.slice(0, 16)}… matches and ${signers.length} signature(s) valid.`
    : (!hashMatch ? 'Hash mismatch — document bytes differ from what was signed (tampered).'
                  : 'Signature(s) invalid — could not verify against embedded public key.');
  // `trust` is deliberately honest: verification proves the bytes match the hash
  // and that the embedded keys signed them. It does NOT prove WHO the signer is —
  // the public keys travel inside the artifact, so the claim is self-asserted
  // unless a separate fingerprint-pinning step confirms them.
  return { ok, hashMatch, signers, reason, hash: recomputed.hex, trust: 'self-asserted' };
}

export { DELIM };
