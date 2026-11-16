// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * detached-hash-signer — Detached (Blind) Hash Signing
 * ========================================================================
 *
 * Zero-dependency. Uses the platform Web Crypto (globalThis.crypto) which is
 * available in every modern browser AND in Node >= 19 (global `crypto`).
 *
 * The core idea (blind / detached signing):
 *   A document is NEVER handed to the signer. Only its SHA-256 hash travels.
 *   Each approver signs the hash with their own ECDSA (P-256) private key.
 *   The resulting bundle contains signer identities + signatures + the hash,
 *   but NEVER the document bytes. This is what lets three executives co-sign
 *   a classified PDF without any of them — or the relay/server — ever seeing
 *   the raw file.
 */

const wc = globalThis.crypto;

/* ----------------------------- base helpers ----------------------------- */

function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const bin = atob(str + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------- hashing -------------------------------- */

/** SHA-256 of arbitrary bytes, returned as a 64-char lowercase hex string. */
export async function sha256Hex(bytes) {
  const buf = await wc.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(buf));
}

/** Convenience: hash a UTF-8 string. */
export async function sha256HexOfText(text) {
  return sha256Hex(new TextEncoder().encode(text));
}

/* ------------------------------ key pairs ------------------------------- */

/** Generate an extractable ECDSA P-256 key pair for one approver. */
export async function generateKeyPair() {
  return wc.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

/** Export the public key as a base64url SPKI string (safe to publish). */
export async function exportPublicKey(key) {
  const spki = await wc.subtle.exportKey('spki', key);
  return b64url(new Uint8Array(spki));
}

/** Import a base64url SPKI string back into a verifying CryptoKey. */
export async function importPublicKey(b64) {
  return wc.subtle.importKey(
    'spki',
    unb64url(b64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
}

/* --------------------------- detached signing ------------------------------ */

/**
 * Sign a document HASH (not the document). Returns a base64url ECDSA signature
 * over the raw hash bytes. The signer never receives the document.
 */
export async function signHash(privateKey, hashHex) {
  const sig = await wc.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    hexToBytes(hashHex)
  );
  return b64url(new Uint8Array(sig));
}

/** Verify one signature against a hash + public key. */
export async function verifySignature(publicKey, hashHex, sigB64) {
  try {
    return await wc.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      unb64url(sigB64),
      hexToBytes(hashHex)
    );
  } catch {
    return false;
  }
}

/* ------------------------------ the bundle ------------------------------ */

/**
 * Assemble a DETACHED signature bundle.
 * `signers` is an array of { id, pub, sig } produced by `signHash` + `exportPublicKey`.
 * The bundle intentionally carries NO document bytes — only the SHA-256 hash.
 */
export function makeBundle({ docName = '', docHash, signers }) {
  if (!docHash) throw new Error('docHash is required');
  if (!Array.isArray(signers) || signers.length === 0) {
    throw new Error('at least one signer is required');
  }
  return JSON.stringify({
    v: 1,
    kind: 'detached-hash-signature',
    docName,
    docHash,
    signers,
  });
}

/**
 * Verify a detached bundle. Returns:
 *   { ok, docHash, docName, signers:[{id,ok}], reason }
 * `ok` is true only when EVERY signer's signature validates against docHash.
 */
export async function verifyBundle(bundleJson) {
  let b;
  try {
    b = JSON.parse(bundleJson);
  } catch {
    return { ok: false, reason: 'bad-json' };
  }
  if (!b || b.kind !== 'detached-hash-signature' || !b.docHash) {
    return { ok: false, reason: 'bad-bundle' };
  }
  if (!Array.isArray(b.signers) || b.signers.length === 0) {
    return { ok: false, reason: 'no-signers' };
  }
  const results = [];
  for (const s of b.signers) {
    const pub = await importPublicKey(s.pub);
    const ok = await verifySignature(pub, b.docHash, s.sig);
    results.push({ id: s.id, ok });
  }
  const allOk = results.every((r) => r.ok);
  return {
    ok: allOk,
    docHash: b.docHash,
    docName: b.docName || '',
    signers: results,
    reason: allOk ? null : 'signature-mismatch',
  };
}

/** True when the serialized bundle contains no document bytes (detached property). */
export function isDetached(bundleJson) {
  let b;
  try {
    b = JSON.parse(bundleJson);
  } catch {
    return false;
  }
  // A well-formed detached bundle has exactly these keys and no document body.
  const keys = Object.keys(b).sort().join(',');
  return (
    b.kind === 'detached-hash-signature' &&
    keys === 'docHash,docName,kind,signers,v'
  );
}

/* --------------------------- external contract -------------------------- */

// Allow direct browser integration: window.DetachedHashSigner.<api>
if (typeof window !== 'undefined') {
  window.DetachedHashSigner = {
    sha256Hex,
    sha256HexOfText,
    generateKeyPair,
    exportPublicKey,
    importPublicKey,
    signHash,
    verifySignature,
    makeBundle,
    verifyBundle,
    isDetached,
  };
}
