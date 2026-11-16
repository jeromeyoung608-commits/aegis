// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * token-gate — Token-Gated Rooms (ECDSA Room Tokens)
 * ========================================================================
 *
 * Zero-dependency. Uses platform Web Crypto (globalThis.crypto) — available in
 * browsers and Node >= 19.
 *
 * Problem it solves: a plain WebRTC / collaboration link is "whoever has the
 * URL joins". In B2B that is fatal. token-gate issues a short-lived, ECDSA
 * (P-256) signed token bound to a room id and an optional audience (a specific
 * approver public key). The relay/server verifies the token's signature with a
 * root public key and admits ONLY verified key-holders. The server never learns
 * who a person is — it only validates cryptography.
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

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------ root keys ------------------------------- */

/** Generate the issuer root key pair (signs/verifies room tokens). */
export async function generateRootKey() {
  return wc.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

/** Export the root PUBLIC key (the only thing the relay needs). */
export async function exportPublicKey(key) {
  const spki = await wc.subtle.exportKey('spki', key);
  return b64url(new Uint8Array(spki));
}

export async function importPublicKey(b64) {
  return wc.subtle.importKey(
    'spki',
    unb64url(b64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
}

/** Export the root PRIVATE key (keep secret; used to mint room tokens). */
export async function exportPrivateKey(key) {
  const pkcs8 = await wc.subtle.exportKey('pkcs8', key);
  return b64url(new Uint8Array(pkcs8));
}

/** Import a root PRIVATE key from base64url PKCS#8 (used by the token minter). */
export async function importPrivateKey(b64) {
  return wc.subtle.importKey(
    'pkcs8',
    unb64url(b64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );
}

/* ------------------------------- tokens --------------------------------- */

/**
 * Issue a room token.
 * @param rootPrivateKey CryptoKey (sign)
 * @param opts { room:string, exp?:number(ms epoch), ttlMs?:number, audience?:string(base64url pub or '*'), jti?:string }
 * @returns token string: header.payload.signature (all base64url)
 */
export async function issueToken(rootPrivateKey, opts) {
  if (!opts || !opts.room) throw new Error('room is required');
  const exp = opts.exp ?? Date.now() + (opts.ttlMs ?? 10 * 60 * 1000);
  const header = { alg: 'ES256', typ: 'AEGIS-ROOM-TOKEN' };
  const payload = {
    room: opts.room,
    exp,
    aud: opts.audience ?? '*',
    jti: opts.jti ?? bytesToHex(new Uint8Array(wc.getRandomValues(new Uint8Array(8)))),
  };
  const h = b64url(new TextEncoder().encode(JSON.stringify(header)));
  const p = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await wc.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    rootPrivateKey,
    new TextEncoder().encode(`${h}.${p}`)
  );
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}

/**
 * Verify a room token.
 * @param rootPublicKey CryptoKey (verify)
 * @param token string
 * @param opts { room?:string (must match), requiredAud?:string (must match audience) }
 * @returns { ok, room, exp, aud, reason }
 */
export async function verifyToken(rootPublicKey, token, opts = {}) {
  if (typeof token !== 'string') return { ok: false, reason: 'missing-token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [h, p, s] = parts;
  // Canonical-form guard against base64url padding-bit tampering. ECDSA P-256
  // signatures are 70–72 bytes, so when the length ≡ 1 (mod 3) the final base64url
  // character encodes ONLY padding bits and is discarded by the decoder. An attacker
  // flipping that character produces byte-identical signature bytes, so ECDSA re-
  // verifies and a forged token is admitted (~21% of single-char flips in testing).
  // Reject any signature that is not in canonical base64url: re-encoding the decoded
  // bytes must reproduce `s` exactly. This also catches data-bit tampering.
  if (b64url(unb64url(s)) !== s) return { ok: false, reason: 'non-canonical-signature' };
  try {
    const valid = await wc.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      rootPublicKey,
      unb64url(s),
      new TextEncoder().encode(`${h}.${p}`)
    );
    if (!valid) return { ok: false, reason: 'bad-signature' };
    const payload = JSON.parse(new TextDecoder().decode(unb64url(p)));
    if (typeof payload.exp === 'number' && payload.exp < Date.now()) {
      return { ok: false, reason: 'expired', room: payload.room, exp: payload.exp, aud: payload.aud };
    }
    if (opts.room && payload.room !== opts.room) {
      return { ok: false, reason: 'wrong-room', room: payload.room, exp: payload.exp, aud: payload.aud };
    }
    if (opts.requiredAud && payload.aud !== opts.requiredAud) {
      return { ok: false, reason: 'audience-mismatch', room: payload.room, exp: payload.exp, aud: payload.aud };
    }
    return { ok: true, room: payload.room, exp: payload.exp, aud: payload.aud };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

/**
 * Relay-facing gate. Given an incoming envelope that carries a `token` and the
 * expected `room`, decide admit/deny. Returns { admit:boolean, reason }.
 */
export async function gate(rootPublicKey, envelope, opts = {}) {
  const room = opts.room ?? envelope?.room;
  const res = await verifyToken(rootPublicKey, envelope?.token, { room, requiredAud: opts.requiredAud });
  return { admit: res.ok, reason: res.reason ?? (res.ok ? null : 'denied') };
}

/* --------------------------- external contract -------------------------- */

if (typeof window !== 'undefined') {
  window.TokenGate = {
    generateRootKey,
    exportPublicKey,
    exportPrivateKey,
    importPublicKey,
    importPrivateKey,
    issueToken,
    verifyToken,
    gate,
  };
}
