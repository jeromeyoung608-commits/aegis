// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * aegis-shell/src/identity.js — shell-owned identity adapter for the seven-step
 * commercial closed loop.
 *
 * This adapter deliberately contains NO cryptography of its own. Every primitive
 * is imported from the independent submodules, which are treated as read-only
 * libraries:
 *
 *   /modules/e2e-signed-delivery/src/sdk/crypto.js
 *     generateKeyPair, exportPublicKey, sha256, sign, verify, toHex, fromHex
 *   /modules/e2e-signed-delivery/src/sdk/pdf.js
 *     assembleArtifact, verifyArtifact, DELIM
 *
 * `pdf.js` only touches `window.PDFLib` inside `buildPdf()`, which this adapter
 * never calls. All functions used here are pure Web Crypto / byte helpers and are
 * safe to import into the shell document.
 *
 * Wire format (owned by the submodule, documented here for the shell reader):
 *
 *   artifact = [ PDF bytes ][ DELIM ][ UTF-8 JSON trailer ]
 *   trailer  = { alg: 'SHA-256', hash: <hex>, signers: [ { id, pub, sig } ] }
 *
 * `verifyArtifact()` recomputes SHA-256 over the PDF region and verifies each
 * ECDSA signature over the 32-byte RAW digest. Therefore `signHash()` MUST sign
 * the raw digest, not the hex string, or verification will always fail.
 */

import {
  generateKeyPair,
  exportPublicKey,
  sha256,
  sign,
  toHex,
  fromHex,
} from '/modules/e2e-signed-delivery/src/sdk/crypto.js';
import {
  assembleArtifact as assembleSignedArtifact,
  verifyArtifact as verifySignedArtifact,
} from '/modules/e2e-signed-delivery/src/sdk/pdf.js';

/**
 * Normalise the different hash shapes the shell may hold into `{ raw, hex }`.
 * Accepted inputs: the `{ raw, hex }` object returned by `sha256()`, a hex
 * string, or a raw `Uint8Array` digest.
 *
 * @param {{raw:Uint8Array,hex:string}|string|Uint8Array} hash
 * @returns {{raw:Uint8Array,hex:string}}
 */
function normalizeHash(hash) {
  if (hash && typeof hash === 'object' && hash.raw instanceof Uint8Array) {
    return { raw: hash.raw, hex: hash.hex || toHex(hash.raw) };
  }
  if (typeof hash === 'string') {
    return { raw: fromHex(hash), hex: hash };
  }
  if (hash instanceof Uint8Array) {
    return { raw: hash, hex: toHex(hash) };
  }
  throw new Error('IdentityAdapter: unsupported hash shape.');
}

/**
 * A thin, typed wrapper around the submodule signing primitives. One instance
 * owns one ECDSA P-256 identity for the lifetime of the shell page. The private
 * key is non-extractable and never leaves this document.
 */
export class IdentityAdapter {
  constructor() {
    /** @type {CryptoKey|null} */
    this.privateKey = null;
    /** @type {CryptoKey|null} */
    this.publicKey = null;
    /** @type {string|null} Base64 SPKI public key, embedded in the trailer. */
    this.publicKeyBase64 = null;
    /** @type {Promise<IdentityAdapter>} Resolves once the key pair exists. */
    this.ready = this.init();
  }

  /**
   * Generate the signer identity. Called once by the constructor; callers that
   * need the key material must await `adapter.ready` first.
   *
   * @returns {Promise<IdentityAdapter>} This adapter, for chaining.
   */
  async init() {
    const pair = await generateKeyPair();
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
    this.publicKeyBase64 = await exportPublicKey(pair.publicKey);
    return this;
  }

  /**
   * Compute SHA-256 over arbitrary document bytes using the submodule's pure
   * Web Crypto helper. The returned `raw` digest is exactly what ECDSA signs.
   *
   * @param {Uint8Array|ArrayBuffer|Blob} bytes Document bytes or a Blob.
   * @returns {Promise<{raw:Uint8Array,hex:string}>} Raw 32-byte digest and hex.
   */
  async hashOf(bytes) {
    let payload = bytes;
    if (bytes instanceof Blob) {
      payload = new Uint8Array(await bytes.arrayBuffer());
    } else if (bytes instanceof ArrayBuffer) {
      payload = new Uint8Array(bytes);
    }
    return sha256(payload);
  }

  /**
   * Sign a document hash with this adapter's private key.
   *
   * IMPORTANT: Web Crypto's `ECDSA` with `hash: 'SHA-256'` hashes the supplied
   * data internally. The submodule's `verifyArtifact()` passes the recomputed
   * 32-byte raw digest to `verify()`, so this method must sign that same raw
   * digest. Signing the hex string instead would produce a valid-looking but
   * unverifiable artifact.
   *
   * @param {{raw:Uint8Array,hex:string}|string|Uint8Array} hash
   * @returns {Promise<{signature:string,publicKey:string,hash:string,raw:Uint8Array,alg:string}>}
   *   Base64 signature, Base64 SPKI public key, hex digest, raw digest, algorithm.
   */
  async signHash(hash) {
    await this.ready;
    const { raw, hex } = normalizeHash(hash);
    const signature = await sign(this.privateKey, raw);
    return {
      signature,
      publicKey: this.publicKeyBase64,
      hash: hex,
      raw,
      alg: 'SHA-256',
    };
  }

  /**
   * Pack PDF bytes plus the signature into the submodule's signed artifact.
   * This is a parameter-shape adapter only: it converts the four shell-level
   * values into the trailer object that `assembleArtifact()` expects and then
   * delegates to the submodule. No byte formatting is reimplemented here.
   *
   * @param {Uint8Array} docBytes Redacted PDF bytes (no trailer yet).
   * @param {{raw:Uint8Array,hex:string}|string} hash Document SHA-256 digest.
   * @param {string|{signature:string,publicKey:string}} signature Base64 ECDSA
   *   signature, or the object returned by `signHash()`.
   * @param {string} [publicKey] Base64 SPKI public key; defaults to this identity.
   * @returns {Uint8Array} PDF bytes + delimiter + JSON signature trailer.
   */
  assembleArtifact(docBytes, hash, signature, publicKey) {
    const hex = typeof hash === 'string' ? hash : normalizeHash(hash).hex;
    const sig = typeof signature === 'string'
      ? signature
      : signature && signature.signature;
    const pub = publicKey
      || (signature && typeof signature === 'object' ? signature.publicKey : null)
      || this.publicKeyBase64;

    if (!hex || !sig || !pub) {
      throw new Error('IdentityAdapter: hash, signature and public key are required.');
    }
    if (!(docBytes instanceof Uint8Array)) {
      throw new Error('IdentityAdapter: document bytes must be a Uint8Array.');
    }

    return assembleSignedArtifact(docBytes, {
      alg: 'SHA-256',
      hash: hex,
      signers: [{ id: 'A', pub, sig }],
    });
  }

  /**
   * Verify a signed artifact with the submodule's verifier: recompute the PDF
   * hash, compare it to the embedded hex digest, then verify every signer.
   *
   * @param {Uint8Array|ArrayBuffer} artifact Signed artifact bytes.
   * @returns {Promise<{ok:boolean,hashMatch:boolean,signers:Array<{id:string,ok:boolean}>,reason:string,hash?:string}>}
   */
  async verifyArtifact(artifact) {
    const bytes = artifact instanceof Uint8Array
      ? artifact
      : new Uint8Array(artifact);
    return verifySignedArtifact(bytes);
  }
}
