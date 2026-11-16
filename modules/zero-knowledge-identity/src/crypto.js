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
// Aegis/zero-knowledge-identity/src/crypto.js
// Pure Web Crypto primitives. No DOM, no storage, no network — which is exactly
// why `node --test` can import this file directly and assert on real bytes.
//
// Key hierarchy:
//   passphrase ──PBKDF2-SHA256(250k, 16-byte salt)──▶ KEK (AES-GCM-256, non-extractable)
//   private key ──PKCS#8──▶ AES-GCM(KEK, 12-byte IV) ──▶ wrapped blob on disk
// The passphrase is never persisted and the KEK never leaves memory, so a copy
// of IndexedDB alone reveals nothing about the private key.

import { bytesToBase64, base64ToBytes } from './base64.js';

export const ALGORITHM = 'ECDSA-P256';
export const CURVE = 'P-256';
export const KDF = Object.freeze({ name: 'PBKDF2', hash: 'SHA-256', iterations: 250_000 });
export const CIPHER = Object.freeze({ name: 'AES-GCM', length: 256 });
export const SALT_BYTES = 16;
export const IV_BYTES = 12;

const subtle = globalThis.crypto?.subtle;

export function assertCryptoAvailable() {
  if (!subtle) {
    throw new Error('Web Crypto is unavailable. Serve this page over http://localhost or https://.');
  }
}

function randomBytes(length) {
  assertCryptoAvailable();
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

/* ── key pair ────────────────────────────────────────────────────────────── */

export async function generateKeyPair() {
  assertCryptoAvailable();
  // extractable=true is required to wrap the private key; the wrapped blob is
  // what reaches disk, never the raw PKCS#8 bytes.
  return subtle.generateKey({ name: 'ECDSA', namedCurve: CURVE }, true, ['sign', 'verify']);
}

export async function exportPublicKeyBase64(publicKey) {
  assertCryptoAvailable();
  const spki = await subtle.exportKey('spki', publicKey);
  return bytesToBase64(new Uint8Array(spki));
}

export async function importPublicKeyBase64(base64) {
  assertCryptoAvailable();
  return subtle.importKey(
    'spki',
    base64ToBytes(base64),
    { name: 'ECDSA', namedCurve: CURVE },
    true,
    ['verify'],
  );
}

export async function spkiBytesOf(publicKey) {
  assertCryptoAvailable();
  const spki = await subtle.exportKey('spki', publicKey);
  return new Uint8Array(spki);
}

/* ── passphrase → wrapping key ───────────────────────────────────────────── */

async function deriveKek(passphrase, salt, iterations) {
  assertCryptoAvailable();
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(String(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: the KEK cannot be exported, only used
    ['encrypt', 'decrypt'],
  );
}

/* ── private key wrapping ────────────────────────────────────────────────── */

export async function wrapPrivateKey(privateKey, passphrase) {
  assertCryptoAvailable();
  if (!passphrase || String(passphrase).length < 8) {
    throw new Error('Passphrase must be at least 8 characters.');
  }
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', privateKey));
  try {
    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const kek = await deriveKek(passphrase, salt, KDF.iterations);
    const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, kek, pkcs8));

    return {
      cipher: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256',
      iterations: KDF.iterations,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertext),
    };
  } finally {
    // Zero the plaintext PKCS#8 buffer even if derivation or encryption throws.
    // JS gives no guarantee about when the old byte range is reclaimed, so this
    // is the only moment at which wiping it has a defined effect.
    pkcs8.fill(0);
  }
}

export async function unwrapPrivateKey(wrapped, passphrase) {
  assertCryptoAvailable();
  if (!wrapped) throw new Error('No wrapped key material found.');
  const salt = base64ToBytes(wrapped.salt);
  const iv = base64ToBytes(wrapped.iv);
  const ciphertext = base64ToBytes(wrapped.ciphertext);
  const kek = await deriveKek(passphrase, salt, wrapped.iterations || KDF.iterations);
  let pkcs8;
  try {
    pkcs8 = await subtle.decrypt({ name: 'AES-GCM', iv }, kek, ciphertext);
  } catch {
    // AES-GCM authenticates, so a wrong passphrase and a tampered blob are
    // indistinguishable by design. Say so instead of leaking which it was.
    throw new Error('Unlock failed: wrong passphrase or corrupted vault record.');
  }
  return subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: CURVE },
    true,
    ['sign'],
  );
}

/* ── fingerprint ─────────────────────────────────────────────────────────── */

export async function fingerprintOf(publicKeyOrBytes) {
  assertCryptoAvailable();
  const bytes = publicKeyOrBytes instanceof Uint8Array
    ? publicKeyOrBytes
    : await spkiBytesOf(publicKeyOrBytes);
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `SHA256:${hex.match(/.{4}/g).join(' ')}`;
}

export function fingerprintDigits(fingerprint) {
  // Drop the "SHA256:" label first: its A is a legitimate hex digit and would
  // otherwise shift the identicon grid by one character.
  return String(fingerprint).replace(/^SHA256:/i, '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
}

/* ── proof of possession ─────────────────────────────────────────────────── */

const encoder = new TextEncoder();

export async function signMessage(privateKey, message) {
  assertCryptoAvailable();
  const signature = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(String(message)),
  );
  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyMessage(publicKey, signatureBase64, message) {
  assertCryptoAvailable();
  return subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    base64ToBytes(signatureBase64),
    encoder.encode(String(message)),
  );
}
