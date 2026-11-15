// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// adapters/tsa-rfc3161/rfc3161-client.js — RFC 3161 Time-Stamp Protocol client.
//
// PURE glue / forwarder. This module does NOT implement any cryptographic signing
// or timestamping primitive: it builds a DER-encoded TimeStampReq, POSTs it to an
// external TSA over HTTP/HTTPS, and returns the raw CMS TimeStampToken. The token
// is passed through UNMODIFIED (never re-signed, never cached, never verified).
//
// Zero third-party dependencies: only Node built-ins (node:crypto for the nonce,
// node:http / node:https for the request). The ASN.1 DER codec below is hand-rolled
// because Web Crypto cannot emit/parse RFC 3161, and pulling in asn1js/pkijs would
// put a non-platform dependency inside the adapter. If a future need arises for
// full CMS *verification*, that belongs in adapters/tsa-rfc3161/vendor/ (isolated,
// not loaded by default) — see README.
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';

// ── DER encoding helpers (definite-length only) ─────────────────────────────────
function lenBytes(n) {
  if (n < 0x80) return Buffer.from([n]);
  const bytes = [];
  let x = n;
  while (x > 0) { bytes.unshift(x & 0xff); x >>= 8; }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
function tagSeq(content) { return Buffer.concat([Buffer.from([0x30]), lenBytes(content.length), content]); }
function tagOctet(content) { return Buffer.concat([Buffer.from([0x04]), lenBytes(content.length), content]); }
function tagBool(v) { return Buffer.from([0x01, 0x01, v ? 0xff : 0x00]); }
function tagOid(oid) { return Buffer.concat([Buffer.from([0x06]), lenBytes(oid.length), oid]); }
function tagNull() { return Buffer.from([0x05, 0x00]); }
function tagInt(buf) {
  let b = Buffer.from(buf);
  if (b.length > 0 && (b[0] & 0x80)) b = Buffer.concat([Buffer.from([0x00]), b]);
  return Buffer.concat([Buffer.from([0x02]), lenBytes(b.length), b]);
}
function tagTime(iso) {
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(2);
  const s = `${yy}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
  return Buffer.from([0x17, 0x0d, ...Buffer.from(s, 'ascii')]);
}
function bigIntBuf(n) {
  let b = Buffer.from(BigInt(n).toString(16).padStart(2, '0'), 'hex');
  if (b.length > 0 && (b[0] & 0x80)) b = Buffer.concat([Buffer.from([0x00]), b]);
  return b;
}

// sha-256 AlgorithmIdentifier OID = 2.16.840.1.101.3.4.2.1
const SHA256_OID = Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]);
// id-ct-TSTInfo = 1.2.840.113549.1.9.16.1.4
const ID_CT_TSTINFO = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x10, 0x01, 0x04]);
// id-signedData = 1.2.840.113549.1.7.2
const ID_SIGNED_DATA = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]);

// Build a DER TimeStampReq for a hex sha-256 digest.
export function buildTimeStampReq(digestHex, { requestNonce = true } = {}) {
  const digest = Buffer.from(digestHex, 'hex');
  const messageImprint = tagSeq(Buffer.concat([
    tagSeq(Buffer.concat([tagOid(SHA256_OID), tagNull()])),
    tagOctet(digest),
  ]));
  const parts = [tagInt(Buffer.from([0x01])), messageImprint]; // version(1) + messageImprint
  if (requestNonce) parts.push(tagInt(crypto.randomBytes(16))); // nonce INTEGER
  parts.push(tagBool(true)); // certReq = TRUE (ask the TSA to return its signing cert)
  return tagSeq(Buffer.concat(parts));
}

// POST the request to the TSA and return the raw token (never throws — failures
// are reported via { ok:false, error }). Network/timeout/4xx/5xx are all caught.
export function requestTimestamp({ digest, endpoint, auth = { type: 'none' }, timeoutMs = 10000 }) {
  let body;
  try { body = buildTimeStampReq(digest, { requestNonce: true }); }
  catch (e) { return Promise.resolve({ ok: false, error: 'request encode failed: ' + e.message }); }

  let url;
  try { url = new URL(endpoint); } catch (e) { return Promise.resolve({ ok: false, error: 'bad endpoint url' }); }

  const lib = url.protocol === 'https:' ? https : http;
  const headers = {
    'Content-Type': 'application/timestamp-query',
    Accept: 'application/timestamp-reply',
    'Content-Length': body.length,
    'Connection': 'close', // one-shot request — do not hold sockets open
  };
  if (auth && auth.type === 'basic') {
    headers['Authorization'] = 'Basic ' + Buffer.from(auth.value || '', 'utf8').toString('base64');
  } else if (auth && auth.type === 'token') {
    headers['Authorization'] = 'Bearer ' + (auth.value || '');
  }

  return new Promise((resolve) => {
    const req = lib.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve({ ok: false, error: 'tsa http status ' + res.statusCode });
            return;
          }
          resolve({ ok: true, token: Buffer.concat(chunks) });
        });
      },
    );
    req.on('error', (e) => resolve({ ok: false, error: 'tsa network error: ' + e.message }));
    req.setTimeout(timeoutMs, () => req.destroy(new Error('tsa request timeout')));
    req.write(body);
    req.end();
  });
}

// ── DER parsing (minimal, definite-length) ─────────────────────────────────────
function parseTLV(buf, off) {
  const tag = buf[off];
  const cls = tag & 0xc0;
  const constructed = (tag & 0x20) !== 0;
  const tagnum = tag & 0x1f;
  const first = buf[off + 1];
  let len, lenBytes = 1;
  if (first < 0x80) { len = first; }
  else if (first === 0x81) { len = buf[off + 2]; lenBytes = 2; }
  else if (first === 0x82) { len = (buf[off + 2] << 8) | buf[off + 3]; lenBytes = 3; }
  else throw new Error('unsupported/indefinite DER length at ' + off);
  const contentStart = off + 1 + lenBytes;
  return { tag, cls, constructed, tagnum, off, contentStart, len, end: contentStart + len };
}
function parseChildren(buf, node) {
  if (!node.constructed) return;
  node.children = [];
  let p = node.contentStart;
  while (p < node.end) {
    const kid = parseTLV(buf, p);
    kid.value = buf.subarray(kid.contentStart, kid.end);
    node.children.push(kid);
    p = kid.end;
  }
}
function bigIntToStr(buf) { return BigInt('0x' + Buffer.from(buf).toString('hex')).toString(10); }
function parseTime(node) {
  const s = node.value.toString('ascii').replace(/\0/g, '').trim();
  let iso;
  if (node.tag === 0x17) { // UTCTime YYMMDDHHMMSSZ
    const y = parseInt(s.slice(0, 2), 10);
    const full = (y >= 50 ? 1900 : 2000) + y;
    iso = `${full}-${s.slice(2, 4)}-${s.slice(4, 6)}T${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}Z`;
  } else { // GeneralizedTime YYYYMMDDHHMMSSZ
    iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error('invalid genTime');
  return d.toISOString();
}

// Extract the TSTInfo metadata from a CMS TimeStampToken. Best-effort: the raw
// token is ALWAYS returned by the caller regardless of parse success; this only
// fills human-readable metadata (genTime / serialNumber / nonce).
export function parseTimeStampToken(tokenBuf) {
  const root = parseTLV(tokenBuf, 0);
  parseChildren(tokenBuf, root); // ContentInfo SEQUENCE { OID, [0] EXPLICIT SignedData }
  const explicit = root.children.find((c) => c.cls === 0x80 && c.tagnum === 0);
  if (!explicit) throw new Error('no [0] EXPLICIT SignedData');
  const signedData = parseTLV(tokenBuf, explicit.contentStart);
  parseChildren(tokenBuf, signedData);
  const encap = signedData.children.find((c) => c.tag === 0x30) || signedData.children[2];
  if (!encap) throw new Error('no encapContentInfo');
  parseChildren(tokenBuf, encap);
  const eContentExplicit = encap.children.find((c) => c.cls === 0x80 && c.tagnum === 0);
  if (!eContentExplicit) throw new Error('no eContent');
  const octet = parseTLV(tokenBuf, eContentExplicit.contentStart);
  // parseTLV() nodes carry offsets, not a `.value`; slice the OCTET STRING's
  // content bytes explicitly (that content IS the DER TSTInfo SEQUENCE).
  const tstBuf = tokenBuf.subarray(octet.contentStart, octet.end);
  const tst = parseTLV(tstBuf, 0);
  parseChildren(tstBuf, tst);
  const kids = tst.children;
  // TSTInfo order: version(INT), policy(OID), messageImprint(SEQ), serialNumber(INT),
  // genTime(TIME), accuracy(SEQ) OPT, ordering(BOOL) OPT, nonce(INT) OPT, ...
  const serialNode = kids[3];
  const timeNode = kids[4];
  const out = {
    serialNumber: serialNode ? bigIntToStr(serialNode.value) : null,
    genTime: timeNode ? parseTime(timeNode) : null,
  };
  for (let i = 5; i < kids.length; i++) {
    if (kids[i].tag === 0x02) { out.nonce = bigIntToStr(kids[i].value); break; }
  }
  return out;
}

// ── Test-only fixture builder (NOT used in production) ─────────────────────────
// Produces a structurally valid CMS ContentInfo wrapping a TSTInfo, so the parser
// can be unit-tested without reaching a live TSA. Mirrors the same DER helpers.
export function _buildCmsFixture({ genTime, serialNumber, nonce }) {
  const tstInfo = tagSeq(Buffer.concat([
    tagInt(Buffer.from([0x01])),
    tagOid(SHA256_OID),
    tagSeq(Buffer.concat([
      tagSeq(Buffer.concat([tagOid(SHA256_OID), tagNull()])),
      tagOctet(Buffer.alloc(32, 7)),
    ])),
    tagInt(bigIntBuf(serialNumber)),
    tagTime(genTime),
    tagInt(bigIntBuf(nonce)),
  ]));
  // [0] EXPLICIT wrapping the OCTET STRING that carries TSTInfo. Derive the
  // length from the already-built TLVs so it is always exact (no hand arithmetic).
  const octetStringTlv = tagOctet(tstInfo);
  const eContent = Buffer.concat([
    Buffer.from([0xa0]), lenBytes(octetStringTlv.length), octetStringTlv,
  ]);
  const encap = tagSeq(Buffer.concat([tagOid(ID_CT_TSTINFO), eContent]));
  const digestAlgsInner = tagSeq(Buffer.concat([tagOid(SHA256_OID), tagNull()]));
  const digestAlgs = Buffer.concat([Buffer.from([0x31]), lenBytes(digestAlgsInner.length), digestAlgsInner]);
  const signedData = tagSeq(Buffer.concat([tagInt(Buffer.from([0x01])), digestAlgs, encap]));
  const content = Buffer.concat([
    Buffer.from([0xa0]), lenBytes(signedData.length), signedData,
  ]);
  return tagSeq(Buffer.concat([tagOid(ID_SIGNED_DATA), content]));
}
