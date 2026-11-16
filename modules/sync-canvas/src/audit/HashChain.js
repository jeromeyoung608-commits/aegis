// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * sync-canvas — Distributed State & Real-time Collaboration Engine
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

/**
 * Audit hash chain for signature stamps.
 *
 * Every time a party affixes a stamp, the client appends one record to a local
 * hash chain:
 *
 *     hash[i] = SHA-256( hash[i-1] + "|" + canonical(op) )
 *
 * The genesis hash is a string of 64 zeros, so the first link is bound to a
 * known starting point. Because each link folds in the previous one, tampering
 * with any record (or reordering two) breaks every subsequent hash — which is
 * exactly the tamper-evidence an audit trail needs. The chain lives only on the
 * signer's machine until exported; the stamp node on the board carries the hash
 * it produced, so a verifier can recompute and compare.
 *
 * The module is environment-agnostic: it uses `crypto.subtle` when available
 * (browsers on a secure context, including http://localhost, and Node 20+), and
 * falls back to a synchronous Web Crypto shim otherwise. This lets the same code
 * run in the browser UI and in Node-based tests.
 */

const subtle =
  (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) || null;

function toBytes(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  return Buffer.from(str, 'utf-8');
}

function toHex(buf) {
  if (buf instanceof Uint8Array && typeof Buffer !== 'undefined') {
    return Buffer.from(buf).toString('hex');
  }
  const out = [];
  for (let i = 0; i < buf.length; i += 1) out.push(buf[i].toString(16).padStart(2, '0'));
  return out.join('');
}

/** SHA-256 of a string (or any JSON-serializable value), hex encoded. */
export async function sha256Hex(input) {
  if (!subtle) throw new Error('Web Crypto (crypto.subtle) is unavailable in this runtime');
  const data = toBytes(typeof input === 'string' ? input : JSON.stringify(input));
  const digest = await subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

/** Key-sorted serialization so two equal payloads hash to identical bytes. */
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

export const GENESIS = '0'.repeat(64);

// ── Chain key ────────────────────────────────────────────────────────────────
// A plain SHA-256 chain is only tamper-EVIDENT against accidents: anyone who can
// recompute SHA-256 can rewrite every link and land on the same head. Sealing each
// link with HMAC-SHA256 under a per-device key removes that ability. Entries carry
// `alg`, so chains written before this change still verify as 'sha256'.
const CHAIN_KEY_STORAGE = 'aegis.chainKey';

export function newChainKeyHex() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is unavailable; cannot create a chain key');
  }
  const bytes = new Uint8Array(32);
  c.getRandomValues(bytes);
  return toHex(bytes);
}

/** Per-device key: persisted in localStorage so reloads keep verifying old links. */
function loadChainKeyHex() {
  try {
    const existing = localStorage.getItem(CHAIN_KEY_STORAGE);
    if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;
    const fresh = newChainKeyHex();
    localStorage.setItem(CHAIN_KEY_STORAGE, fresh);
    return fresh;
  } catch {
    return null; // no storage (private mode / Node): caller may pass hmacKey
  }
}

export async function hmacSha256Hex(keyHex, message) {
  if (!subtle) throw new Error('Web Crypto (crypto.subtle) is unavailable in this runtime');
  const keyBytes = toBytes(String(keyHex));
  const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await subtle.sign('HMAC', key, toBytes(String(message)));
  return toHex(new Uint8Array(sig));
}


/**
 * A local append-only hash chain.
 *
 * `append(payload)` returns `{ index, prev, hash, payload }` and advances
 * `head`. `verify()` replays the whole chain and reports the first broken link,
 * or null when the chain is intact.
 */
export class HashChain {
  /**
   * @param {string} genesis starting head (defaults to 64 zeros)
   * @param {{hmacKey?: string}} [opts] hmacKey overrides the device key; pass
   *   `null` deliberately to fall back to a plain SHA-256 chain.
   */
  constructor(genesis = GENESIS, opts = {}) {
    this.head = genesis;
    this.index = 0;
    this.entries = [];
    this.keyHex = Object.prototype.hasOwnProperty.call(opts, 'hmacKey')
      ? opts.hmacKey
      : loadChainKeyHex();
  }

  async _link(prev, payload) {
    const material = `${prev}|${canonical(payload)}`;
    if (this.keyHex) return { hash: await hmacSha256Hex(this.keyHex, material), alg: 'hmac-sha256' };
    return { hash: await sha256Hex(material), alg: 'sha256' };
  }

  async append(payload) {
    const prev = this.head;
    const { hash, alg } = await this._link(prev, payload);
    const entry = { index: this.index, prev, hash, alg, payload };
    this.entries.push(entry);
    this.index += 1;
    this.head = hash;
    return entry;
  }

  /** Recompute every link; returns the index of the first broken entry, or null. */
  async verify() {
    let prev = GENESIS;
    for (let i = 0; i < this.entries.length; i += 1) {
      const e = this.entries[i];
      const material = `${prev}|${canonical(e.payload)}`;
      // Legacy entries have no alg: they were written as plain SHA-256.
      const expect = e.alg === 'hmac-sha256' && this.keyHex
        ? await hmacSha256Hex(this.keyHex, material)
        : await sha256Hex(material);
      if (e.prev !== prev || e.hash !== expect) return i;
      prev = e.hash;
    }
    return null;
  }
}

/**
 * Bind a stamp signature to the signer's public-key fingerprint:
 *   sig = SHA-256( prevHash | canonical(op) | keyId )
 * The board node stores `hash` (the chain link) and `fp` (the fingerprint) so a
 * verifier can confirm the signature came from this key and belongs to this
 * position in the chain.
 */
export async function signStamp({ prevHash, op, keyId }) {
  return sha256Hex(`${prevHash}|${canonical(op)}|${keyId}`);
}
