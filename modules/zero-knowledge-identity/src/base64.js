// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis/zero-knowledge-identity/src/base64.js
// Minimal, dependency-free Base64 for byte arrays.
//
// Deliberately hand-written instead of btoa/atob: btoa only accepts binary
// strings and silently corrupts anything above 0xFF, and the same module has to
// run unchanged in the browser and under `node --test`.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < ALPHABET.length; i += 1) table[ALPHABET.charCodeAt(i)] = i;
  return table;
})();

export function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < view.length; i += 3) {
    const b0 = view[i];
    const b1 = i + 1 < view.length ? view[i + 1] : 0;
    const b2 = i + 2 < view.length ? view[i + 2] : 0;
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < view.length ? ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < view.length ? ALPHABET[b2 & 0x3f] : '=';
  }
  return out;
}

export function base64ToBytes(text) {
  const clean = String(text).replace(/[\s=]/g, '');
  if (clean.length % 4 === 1) throw new Error('Invalid Base64 length');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let acc = 0;
  let bits = 0;
  let pos = 0;
  for (const char of clean) {
    const value = LOOKUP[char.charCodeAt(0)];
    if (value < 0) throw new Error('Invalid Base64 character');
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[pos] = (acc >> bits) & 0xff;
      pos += 1;
    }
  }
  return out.subarray(0, pos);
}
