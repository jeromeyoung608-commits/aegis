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

// src/container.js — the on-disk `.aegis` container format.
//
// Layout (all integers big-endian):
//
//   offset  size            field
//   ------  --------------  ---------------------------------------------
//   0       8               magic "AEGISVLT"
//   8       1               format version (1)
//   9       4               header length H
//   13      H               header JSON (crypto parameters + ciphertext digest)
//   13+H    N               ciphertext (AES-GCM: ciphertext || 16-byte tag)
//
// The AES-GCM plaintext is itself framed:
//
//   uint32 metadataLength | metadata JSON (UTF-8) | original file bytes
//
// Why a digest in the clear header? AES-GCM already authenticates the payload,
// but the digest lets the vault detect silent storage corruption (bad sector,
// truncated copy) *before* asking the user for a passphrase, and it gives the
// UI a cheap way to compare two containers. It is not a substitute for GCM.
// An attacker who rewrites both ciphertext and digest still fails the GCM tag.

import {
  CIPHER,
  IV_BYTES,
  KDF,
  SALT_BYTES,
  assertPassphrase,
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  deriveKek,
  encryptBytes,
  randomBytes,
  sha256,
  toHex,
  utf8Bytes,
  utf8Text,
} from './crypto.js';

export const MAGIC = 'AEGISVLT';
export const VERSION = 1;
export const HEADER_BYTES = MAGIC.length + 1 + 4;

function magicBytes() {
  return utf8Bytes(MAGIC);
}

function fail(message) {
  throw new Error(message);
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function writeUint32(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, false);
}

/**
 * Parse and validate the public part of a container. No passphrase required:
 * this is what the vault browser uses to show sizes and integrity state.
 *
 * @param {Uint8Array} container
 * @returns {{header: object, headerLength: number, ciphertext: Uint8Array}}
 */
export function parseContainer(container) {
  if (!(container instanceof Uint8Array)) fail('Container must be a Uint8Array.');
  if (container.length < HEADER_BYTES + 16) fail('Container is truncated.');

  const expectedMagic = magicBytes();
  for (let i = 0; i < expectedMagic.length; i += 1) {
    if (container[i] !== expectedMagic[i]) fail('Not an AEGIS vault container (bad magic).');
  }
  if (container[MAGIC.length] !== VERSION) {
    fail(`Unsupported container version ${container[MAGIC.length]}.`);
  }

  const headerLength = readUint32(container, MAGIC.length + 1);
  const headerStart = HEADER_BYTES;
  const headerEnd = headerStart + headerLength;
  if (headerLength < 2 || headerEnd > container.length) fail('Container header is malformed.');

  let header;
  try {
    header = JSON.parse(utf8Text(container.subarray(headerStart, headerEnd)));
  } catch {
    fail('Container header is not valid JSON.');
  }
  if (!header || header.v !== VERSION) fail('Container header version mismatch.');
  if (header.alg !== CIPHER) fail(`Unsupported cipher "${header.alg}".`);
  if (typeof header.kdf !== 'string' || !header.kdf.startsWith('PBKDF2')) {
    fail('Unsupported key-derivation function.');
  }
  if (!Number.isInteger(header.iterations) || header.iterations < 100_000) {
    fail('Container KDF parameters are out of range.');
  }
  if (typeof header.salt !== 'string' || typeof header.iv !== 'string') {
    fail('Container is missing its salt or IV.');
  }
  if (typeof header.digest !== 'string' || !/^[0-9a-f]{64}$/.test(header.digest)) {
    fail('Container is missing its ciphertext digest.');
  }

  const ciphertext = container.subarray(headerEnd);
  if (ciphertext.length < 16) fail('Container ciphertext is truncated.');

  return { header, headerLength, ciphertext };
}

/**
 * Verify the ciphertext digest recorded in the header. Cheap, passphrase-free.
 * @returns {Promise<boolean>}
 */
export async function verifyDigest(container) {
  const { header, ciphertext } = parseContainer(container);
  return toHex(await sha256(ciphertext)) === header.digest;
}

/**
 * Encrypt a file plus its metadata into one self-contained container.
 *
 * @param {object} o
 * @param {Uint8Array} o.bytes        original file bytes
 * @param {object} [o.metadata]       signature/verification metadata (kept secret)
 * @param {string} o.passphrase
 * @param {number} [o.iterations]
 * @returns {Promise<Uint8Array>} the `.aegis` container
 */
export async function sealContainer({ bytes, metadata = {}, passphrase, iterations = KDF.iterations }) {
  if (!(bytes instanceof Uint8Array)) fail('File bytes must be a Uint8Array.');
  assertPassphrase(passphrase);

  const metaBytes = utf8Bytes(JSON.stringify(metadata));
  const payload = new Uint8Array(4 + metaBytes.length + bytes.length);
  try {
    writeUint32(payload, 0, metaBytes.length);
    payload.set(metaBytes, 4);
    payload.set(bytes, 4 + metaBytes.length);

    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const kek = await deriveKek(passphrase, salt, iterations);
    const ciphertext = await encryptBytes(payload, kek, iv);

    const header = {
      v: VERSION,
      alg: CIPHER,
      kdf: `${KDF.name}-${KDF.hash}`,
      iterations,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      digest: toHex(await sha256(ciphertext)),
      plainBytes: payload.length,
      cipherBytes: ciphertext.length,
    };
    const headerBytes = utf8Bytes(JSON.stringify(header));

    const out = new Uint8Array(HEADER_BYTES + headerBytes.length + ciphertext.length);
    out.set(magicBytes(), 0);
    out[MAGIC.length] = VERSION;
    writeUint32(out, MAGIC.length + 1, headerBytes.length);
    out.set(headerBytes, HEADER_BYTES);
    out.set(ciphertext, HEADER_BYTES + headerBytes.length);
    return out;
  } finally {
    // The staging buffer held the plaintext file AND its metadata. Wipe it on
    // every path, including a failed KDF or a rejected encrypt() call.
    payload.fill(0);
  }
}

/**
 * Decrypt a container back into `{ metadata, bytes }`.
 *
 * Failure modes are deliberately distinguishable:
 *   - "integrity check failed" → bytes changed on disk (before any passphrase work)
 *   - "unlock failed"          → wrong passphrase, or a tamper that also forged
 *                                the digest (GCM tag mismatch)
 */
export async function openContainer(container, passphrase) {
  assertPassphrase(passphrase);
  const { header, ciphertext } = parseContainer(container);

  const digest = toHex(await sha256(ciphertext));
  if (digest !== header.digest) {
    fail('Vault integrity check failed: this record was modified or corrupted.');
  }

  const salt = base64ToBytes(header.salt);
  const iv = base64ToBytes(header.iv);
  const kek = await deriveKek(passphrase, salt, header.iterations);

  let payload;
  try {
    payload = await decryptBytes(ciphertext, kek, iv);
  } catch {
    fail('Vault unlock failed: wrong passphrase or corrupted record.');
  }

  try {
    if (payload.length < 4) fail('Vault record is malformed.');
    const metaLength = readUint32(payload, 0);
    if (metaLength > payload.length - 4) fail('Vault record is malformed.');
    const metadata = JSON.parse(utf8Text(payload.subarray(4, 4 + metaLength)));
    const bytes = payload.slice(4 + metaLength);
    return { metadata, bytes, header };
  } finally {
    payload.fill(0);
  }
}
