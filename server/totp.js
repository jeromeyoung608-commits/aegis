// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// server/totp.js — RFC 6238 TOTP + RFC 4226 HOTP, zero dependencies.
// Uses only node:crypto. TOTP secrets are sealed with AES-256-GCM before being
// stored, so a database leak does not hand over working second factors.
import crypto from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

export function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of String(str).toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function hotp(key, counter, digits = 6) {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', key).update(c).digest();
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export function totpCode(secret, { at = Date.now(), step = 30, digits = 6 } = {}) {
  return hotp(base32Decode(secret), Math.floor(at / 1000 / step), digits);
}

// Constant-time comparison, ±window steps to tolerate clock drift. Replay is
// bounded by the caller's one-time-use check (see server.js totpReplay map).
export function verifyTotp(secret, code, { at = Date.now(), step = 30, digits = 6, window = 1 } = {}) {
  if (!/^[0-9]{6}$/.test(String(code))) return false;
  const key = base32Decode(secret);
  let ok = false;
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(key, Math.floor(at / 1000 / step) + w, digits);
    const a = Buffer.from(candidate), b = Buffer.from(String(code));
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}

export function otpauthUri({ issuer = 'Aegis', account, secret }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Sealed storage ───────────────────────────────────────────────────────────
// Key material comes from AEGIS_MFA_KEY, falling back to the issuer secret so a
// standard one-click install still works. Rotating either invalidates enrolled
// factors (documented in docs/compliance/MFA.md).
export function mfaKey() {
  const raw = process.env.AEGIS_MFA_KEY || process.env.AEGIS_ISSUER_SECRET || '';
  if (!raw) throw new Error('MFA key unavailable');
  return crypto.createHash('sha256').update(`aegis-mfa-v1|${raw}`).digest();
}

export function sealSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', mfaKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function openSecret(blob) {
  const buf = Buffer.from(String(blob), 'base64');
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), enc = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', mfaKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}
