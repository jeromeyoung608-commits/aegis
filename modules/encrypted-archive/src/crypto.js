// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Local Encrypted Vault (Audit & Archive)
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

// src/crypto.js — the thin Web Crypto layer for the archive module.
//
// Everything here is transport-agnostic and storage-agnostic: no DOM, no OPFS,
// no postMessage. That keeps the container format testable in plain Node while
// the browser uses the exact same code.
//
// Key hierarchy (identical philosophy to the identity module):
//
//   passphrase ──PBKDF2-SHA256 (250,000 iterations, 16-byte salt)──▶ KEK
//   plaintext payload ──AES-GCM-256 (12-byte IV)──▶ ciphertext + auth tag
//
// The KEK is created with extractable:false, so even a successful derivation
// never yields a key that script can export.

export const KDF = Object.freeze({
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 250_000,
});

export const CIPHER = 'AES-GCM-256';
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const MIN_PASSPHRASE = 8;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function assertCryptoAvailable() {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('Web Crypto is unavailable. Open this page on localhost or over HTTPS.');
  }
}

export function randomBytes(length) {
  assertCryptoAvailable();
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export async function sha256(bytes) {
  assertCryptoAvailable();
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
}

export function toHex(bytes) {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export function bytesToBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

export function base64ToBytes(text) {
  const clean = String(text).replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.ceil((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = clean[i];
    const c1 = clean[i + 1];
    const c2 = clean[i + 2];
    const c3 = clean[i + 3];
    const n0 = B64.indexOf(c0);
    if (n0 < 0) break;
    const n1 = B64.indexOf(c1 ?? '');
    bytes[p++] = (n0 << 2) | ((n1 < 0 ? 0 : n1) >> 4);
    if (c2 === undefined) break;
    const n2 = B64.indexOf(c2);
    bytes[p++] = (((n1 < 0 ? 0 : n1) & 15) << 4) | (n2 >> 2);
    if (c3 === undefined) break;
    const n3 = B64.indexOf(c3);
    bytes[p++] = ((n2 & 3) << 6) | n3;
  }
  return bytes.subarray(0, p);
}

export function utf8Bytes(text) {
  return encoder.encode(String(text));
}

export function utf8Text(bytes) {
  return decoder.decode(bytes);
}

export function assertPassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE} characters.`);
  }
}

// Derive a non-extractable AES-GCM key from the user's passphrase.
// `iterations` lives inside each container header so the count can be raised
// later without breaking records sealed today.
export async function deriveKek(passphrase, salt, iterations = KDF.iterations) {
  assertCryptoAvailable();
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    utf8Bytes(passphrase),
    KDF.name,
    false,
    ['deriveKey'],
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: KDF.name, salt, iterations, hash: KDF.hash },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBytes(bytes, kek, iv) {
  return new Uint8Array(
    await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, bytes),
  );
}

export async function decryptBytes(ciphertext, kek, iv) {
  return new Uint8Array(
    await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, ciphertext),
  );
}
