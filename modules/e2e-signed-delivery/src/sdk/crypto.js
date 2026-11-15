// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// src/sdk/crypto.js — digital signature primitives for the E2E signed-delivery module.
//
// Built on the browser-native Web Crypto API (also available in Node 20+ for tests).
// Zero dependencies. All keys/identities live ONLY in the browser tab; nothing is sent
// to any server. The transport layer (p2p-crypto-transfer) adds its own AES-GCM
// encryption on top — this file is purely about authenticity (ECDSA) + integrity (SHA-256).

const enc = new TextEncoder();

/** Generate an ECDSA P-256 key pair (SHA-256 digest). Private key is non-extractable. */
export async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, // non-extractable private key
    ['sign', 'verify'],
  );
}

/** Export a public key as base64 (SPKI). Safe to embed in the signature trailer. */
export async function exportPublicKey(pubKey) {
  const raw = await crypto.subtle.exportKey('spki', pubKey);
  return bufToB64(raw);
}

/** Import a base64 SPKI public key back into a CryptoKey (verify only). */
export async function importPublicKey(b64) {
  return crypto.subtle.importKey(
    'spki',
    b64ToBuf(b64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
}

/** SHA-256 over arbitrary bytes. Returns { hex, raw }. */
export async function sha256(bytes) {
  const raw = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return { raw, hex: toHex(raw) };
}

/** Sign a 32-byte hash (or any bytes) with an ECDSA private key. Returns base64. */
export async function sign(privateKey, data) {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data,
  );
  return bufToB64(sig);
}

/** Verify a base64 ECDSA signature over `data` against a base64 SPKI public key. */
export async function verify(b64PubKey, data, b64Sig) {
  try {
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await importPublicKey(b64PubKey),
      b64ToBuf(b64Sig),
      data,
    );
    return !!ok;
  } catch {
    return false; // malformed key/sig, or algorithm mismatch => treat as failure
  }
}

// ---- base64 / hex helpers ---------------------------------------------------

export function bufToB64(buf) {
  const a = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

export function b64ToBuf(b64) {
  const s = atob(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

export function toHex(bytes) {
  let h = '';
  for (let i = 0; i < bytes.length; i++) h += bytes[i].toString(16).padStart(2, '0');
  return h;
}

export function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** Constant-time-ish hex equality (timing isn't a real concern here, but avoid shorts). */
export function hexEq(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export { enc };
