// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis - adapters/tsa-rfc3161/der.js
// Minimal, dependency-free DER codec + OID helpers, just enough for RFC 3161
// (CMS SignedData) parsing/synthesis and X.509 cert building. No external libs.

export function encodeLength(n) {
  if (n < 0x80) return Buffer.from([n]);
  const bytes = [];
  let x = n;
  while (x > 0) { bytes.unshift(x & 0xff); x = Math.floor(x / 256); }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

export function der(tag, content) {
  content = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return Buffer.concat([Buffer.from([tag]), encodeLength(content.length), content]);
}

export const SEQ = (...x) => der(0x30, Buffer.concat(x));
export const SET = (...x) => der(0x31, Buffer.concat(x));
export const OCTET = (b) => der(0x04, b);
export const NULL = () => Buffer.from([0x05, 0x00]);
export const BOOL = (v) => der(0x01, Buffer.from([v ? 0xff : 0x00]));
// [n] IMPLICIT / EXPLICIT context tag (0xA0 + n)
export const CTX = (n, content) => der(0xa0 | n, content);

export function OID(s) {
  const p = s.split('.').map(Number);
  const first = p[0] * 40 + p[1];
  const out = [first];
  for (let i = 2; i < p.length; i++) {
    let v = p[i]; const b = [];
    b.unshift(v & 0x7f); v = Math.floor(v / 128);
    while (v > 0) { b.unshift((v & 0x7f) | 0x80); v = Math.floor(v / 128); }
    out.push(...b);
  }
  return der(0x06, Buffer.from(out));
}

// Non-negative integer from raw big-endian bytes (pads if high bit set).
export function INTbuf(buf) {
  let b = Buffer.from(buf);
  if (b.length === 0) b = Buffer.from([0]);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
  return der(0x02, b);
}

export function INT(n) {
  if (n < 0) throw new Error('INT: negative unsupported');
  let bytes = []; let x = n;
  if (x === 0) bytes = [0];
  while (x > 0) { bytes.unshift(x & 0xff); x = Math.floor(x / 256); }
  if (bytes[0] & 0x80) bytes.unshift(0x00);
  return der(0x02, Buffer.from(bytes));
}

export function UTF8(s) { return der(0x0c, Buffer.from(s, 'utf8')); }

export function GENERALIZEDTIME(date) {
  const s = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', '') + 'Z';
  return der(0x18, Buffer.from(s));
}

export function UTCTIME(date) {
  // UTCTIME is YYMMDDHHMMSSZ — no 'T' separator (unlike GeneralizedTime).
  const s = date.toISOString().replace(/[-:T]/g, '').replace(/\.\d{3}Z$/, 'Z').slice(2);
  return der(0x17, Buffer.from(s));
}

// ── parsing ──────────────────────────────────────────────────────────────────
export function parseTLV(buf, off = 0) {
  const tag = buf[off];
  let p = off + 1;
  let len = buf[p++];
  if (len & 0x80) {
    const n = len & 0x7f; len = 0;
    for (let i = 0; i < n; i++) { len = len * 256 + buf[p++]; }
  }
  const cs = p; const ce = p + len;
  return { tag, off, cs, ce, end: ce, content: buf.subarray(cs, ce) };
}

export function children(buf, start = 0, end = buf.length) {
  const out = []; let p = start;
  while (p < end) { const t = parseTLV(buf, p); out.push(t); p = t.end; }
  return out;
}

export function oidString(buf) {
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let val = bytes[0] < 40 ? bytes[0] : bytes[0] > 79 ? 2 : 1;
  let first = bytes[0] - (val * 40);
  const parts = [val, first];
  let acc = 0;
  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] & 0x80) { acc = (acc << 7) | (bytes[i] & 0x7f); }
    else { acc = (acc << 7) | bytes[i]; parts.push(acc); acc = 0; }
  }
  return parts.join('.');
}

// Locate an extension value (inner content) inside a DER certificate by OID.
export function getExtension(certDer, oid) {
  const root = parseTLV(certDer, 0);
  const tbs = children(certDer, root.cs, root.ce)[0]; // TBSCertificate
  const tbsKids = children(certDer, tbs.cs, tbs.ce);
  // extensions are the last [3] EXPLICIT field if present
  const extField = tbsKids.find((t) => t.tag === 0xa3);
  if (!extField) return null;
  const extSeq = children(certDer, extField.cs, extField.ce)[0];
  for (const ext of children(certDer, extSeq.cs, extSeq.ce)) {
    const extKids = children(certDer, ext.cs, ext.ce);
    const extOid = oidString(extKids[0].content);
    if (extOid === oid) {
      // extnValue is an OCTET STRING; unwrap one level to get the inner content
      const valTlv = children(certDer, extKids[1].cs, extKids[1].ce)[0];
      return { raw: extKids[1].content, inner: valTlv.content };
    }
  }
  return null;
}
