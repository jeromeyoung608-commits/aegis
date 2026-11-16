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
// Aegis/zero-knowledge-identity/src/identity.js
// The record shape that actually lands in IndexedDB, plus the operations that
// create, unlock and describe an identity.
//
// Split from the crypto layer on purpose: this file is storage-agnostic and
// DOM-free, so tests can drive a full issue → persist → reload → unlock cycle
// against an in-memory store.

import {
  ALGORITHM,
  generateKeyPair,
  exportPublicKeyBase64,
  importPublicKeyBase64,
  fingerprintOf,
  wrapPrivateKey,
  unwrapPrivateKey,
  signMessage,
  verifyMessage,
} from './crypto.js';

export const RECORD_ID = 'primary';
export const RECORD_VERSION = 1;
export const NAME_MAX = 32;

export function normalizeName(raw) {
  const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('A display name is required.');
  if (name.length > NAME_MAX) throw new Error(`Display name must be ${NAME_MAX} characters or fewer.`);
  return name;
}

// Everything here is public by construction: name, algorithm, SPKI and the
// fingerprint. The only secret is `wrapped`, and it is useless without the
// passphrase. Keep this list explicit so a future field cannot leak silently.
export function publicCard(record) {
  return {
    id: record.id,
    name: record.name,
    algorithm: record.algorithm,
    publicKeySpki: record.publicKeySpki,
    fingerprint: record.fingerprint,
    createdAt: record.createdAt,
  };
}

export async function issueIdentity({ name, passphrase }) {
  const safeName = normalizeName(name);
  const pair = await generateKeyPair();
  const publicKeySpki = await exportPublicKeyBase64(pair.publicKey);
  const fingerprint = await fingerprintOf(pair.publicKey);
  const wrapped = await wrapPrivateKey(pair.privateKey, passphrase);
  const now = new Date().toISOString();

  return {
    id: RECORD_ID,
    version: RECORD_VERSION,
    name: safeName,
    algorithm: ALGORITHM,
    publicKeySpki,
    fingerprint,
    wrapped,
    createdAt: now,
    updatedAt: now,
  };
}

export async function unlockIdentity(record, passphrase) {
  const privateKey = await unwrapPrivateKey(record.wrapped, passphrase);
  const publicKey = await importPublicKeyBase64(record.publicKeySpki);
  return { privateKey, publicKey };
}

// Signs a challenge with an already-unwrapped key and verifies it against the
// stored public key. Proves the private key belongs to this card instead of
// merely proving that *some* key decrypted. Callers that just unlocked pass the
// CryptoKey they already hold, so the 250k-iteration KDF is not paid twice.
export async function proveWith(privateKey, record) {
  const publicKey = await importPublicKeyBase64(record.publicKeySpki);
  const challenge = `aegis-possession:${record.fingerprint}:${Date.now()}`;
  const signature = await signMessage(privateKey, challenge);
  const verified = await verifyMessage(publicKey, signature, challenge);
  return { verified, challenge, signature };
}

export async function provePossession(record, passphrase) {
  const { privateKey } = await unlockIdentity(record, passphrase);
  return proveWith(privateKey, record);
}

// A record is only "sealed" if the plaintext private key is absent and the
// wrapped blob is present with every field the unwrap path needs.
export function isSealed(record) {
  const w = record?.wrapped;
  if (!w) return false;
  if ('pkcs8' in record || 'privateKey' in record) return false;
  return Boolean(w.ciphertext && w.iv && w.salt && w.iterations);
}
