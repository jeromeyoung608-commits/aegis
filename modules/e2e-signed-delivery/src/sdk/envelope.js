// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/sdk/envelope.js — multi-recipient public-key envelope for GROUP delivery.
//
// The document is encrypted ONCE with a random data-encryption key (DEK, AES-GCM).
// The DEK is then wrapped to EVERY recipient's P-256 public key via ECDH + AES-GCM,
// so each recipient can open the artifact independently — no shared passphrase, no
// per-recipient re-encryption of the (possibly huge) document. This is the
// "group delivery" primitive: one sealed blob, N independent recipients.
//
// Zero-dependency: Web Crypto only. ECDH keys are SEPARATE from the ECDSA signing
// identities in crypto.js (a key usable for ECDH cannot also sign) — recipients
// present an ECDH encryption key for the envelope.

import { bufToB64, b64ToBuf } from './crypto.js';

const iv = () => crypto.getRandomValues(new Uint8Array(12));

// ---- ECDH P-256 helpers (encryption keys, distinct from ECDSA signing keys) ----
async function ecdhGenerate() {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
}
async function ecdhExportPub(pub) {
  return bufToB64(await crypto.subtle.exportKey('spki', pub));
}
async function ecdhImportPub(b64) {
  return crypto.subtle.importKey(
    'spki', b64ToBuf(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );
}

/**
 * Create a recipient ECDH key pair (P-256) for group delivery.
 * @returns {{ privateKey: CryptoKey, publicKey: CryptoKey, publicKeyBase64: string }}
 */
export async function makeRecipientKeyPair() {
  const kp = await ecdhGenerate();
  return {
    privateKey: kp.privateKey,
    publicKey: kp.publicKey,
    publicKeyBase64: await ecdhExportPub(kp.publicKey),
  };
}

/**
 * Seal a document for multiple recipients.
 * @param {Array<{id:string, publicKey?:CryptoKey, publicKeyBase64?:string}>} recipients
 * @returns {Promise<{ envelope:{recipients:Array}, dek:CryptoKey, rawDek:Uint8Array }>}
 *   The caller encrypts the document bytes with `dek` (AES-GCM) and stores
 *   `envelope` alongside the artifact so recipients can recover `dek`.
 */
export async function sealEnvelope(recipients) {
  if (!recipients || recipients.length === 0) throw new Error('at least one recipient required');
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const rawDek = new Uint8Array(await crypto.subtle.exportKey('raw', dek));

  const sealed = [];
  for (const r of recipients) {
    const pub = r.publicKey ? r.publicKey : await ecdhImportPub(r.publicKeyBase64);
    const eph = await ecdhGenerate(); // ephemeral ECDH key — fresh per recipient
    const shared = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: pub },
      eph.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey'],
    );
    const thisIv = iv();
    const wrapped = await crypto.subtle.wrapKey(
      'raw', dek, shared,
      { name: 'AES-GCM', iv: thisIv },
    );
    sealed.push({
      id: r.id,
      ephPub: await ecdhExportPub(eph.publicKey),
      iv: Array.from(thisIv),
      wrappedDek: Array.from(new Uint8Array(wrapped)),
    });
  }
  return { envelope: { recipients: sealed }, dek, rawDek };
}

/**
 * Recover the DEK as a CryptoKey (for AES-GCM decryption) using a recipient's
 * private key. Fails if `recipientId` is not in the envelope.
 * @param {{recipients:Array}} envelope
 * @param {string} recipientId
 * @param {CryptoKey} privateKey
 */
export async function openEnvelope(envelope, recipientId, privateKey) {
  const r = (envelope.recipients || []).find((x) => x.id === recipientId);
  if (!r) throw new Error(`recipient "${recipientId}" is not in the envelope`);
  const ephPub = await ecdhImportPub(r.ephPub);
  const shared = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephPub },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['unwrapKey'],
  );
  // The wrapped DEK is a fixed 32-byte raw key; recover it as an extractable DEK.
  const dek = await crypto.subtle.unwrapKey(
    'raw',
    new Uint8Array(r.wrappedDek),
    shared,
    { name: 'AES-GCM', iv: new Uint8Array(r.iv) },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  return dek;
}
