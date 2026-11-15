// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/crypto.js — App-layer encryption built on the browser-native Web Crypto API.
//
// Why an app-layer AES-GCM layer on top of WebRTC's DTLS?
//   WebRTC DataChannel is already encrypted by DTLS, so the signaling server never
//   sees file bytes. We add an EXPLICIT, auditable AES-GCM layer because:
//     1. The key is derived from a passphrase the signaling server never learns,
//        so even a malicious/compromised signaling server cannot decrypt anything.
//     2. It is per-chunk authenticated encryption with a fresh random IV, which
//        prevents IV reuse and makes the threat model obvious to auditors.
//
//        NOTE: this is NOT forward secrecy. One session key (PBKDF2 from the
//        shared passphrase) encrypts every chunk; there is no key ratchet and no
//        per-message key erasure. See docs/CLAIMS-WORDING.md.
//
// Zero dependencies. Works in browsers (secure context) and Node 20+ (for tests).

export const SALT_LEN = 16;   // PBKDF2 salt, sent in the clear inside meta
export const IV_LEN = 12;     // AES-GCM standard IV length
export const TAG_LEN = 128;   // AES-GCM auth tag length (bits)
export const PBKDF2_ITER = 120000; // deliberately costly to slow brute force

const enc = new TextEncoder();

/**
 * Derive a 256-bit AES-GCM key from a shared passphrase + random salt.
 * Both peers must use the SAME passphrase and the SAME salt (salt is broadcast
 * in the file meta message, in the clear — that is fine, salt is not secret).
 * @param {string} passphrase shared secret (room key)
 * @param {Uint8Array} salt random salt (16 bytes)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt one chunk. A fresh random IV is generated every call.
 * @returns {Promise<{iv: Uint8Array, ciphertext: Uint8Array}>}
 */
export async function encryptChunk(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: TAG_LEN }, key, plaintext);
  return { iv, ciphertext: new Uint8Array(ct) };
}

/** Decrypt one chunk. Throws if the tag is invalid (tampering / wrong key). */
export async function decryptChunk(key, iv, ciphertext) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: TAG_LEN }, key, ciphertext);
  return new Uint8Array(pt);
}

// ---- base64 helpers for embedding salt inside the JSON meta message ----------
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
