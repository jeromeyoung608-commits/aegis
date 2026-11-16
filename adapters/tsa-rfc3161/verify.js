// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis - adapters/tsa-rfc3161/verify.js
// RFC 3161 Time-Stamp Token verification WITHOUT a third-party ASN.1 library.
// Parses the CMS SignedData with the minimal DER codec, then — using Node's
// built-in crypto.X509Certificate — validates:
//   1. the signature over the signed attributes (signer's public key),
//   2. the messageDigest attribute binds the TSTInfo,
//   3. the contentType attribute is TSTInfo,
//   4. the message imprint matches the expected document digest,
//   5. the certificate chain builds to a trusted root in the operator trust store
//      (each link signed + CA basic constraint + time-valid).
// This is what makes a timestamp legally admissible under eIDAS / US court rules:
// you can prove WHO signed the time and that their chain was trusted at that time.
import crypto from 'node:crypto';
import * as D from './der.js';

export const OID = {
  signedData: '1.2.840.113549.1.7.2',
  tstInfo: '1.2.840.113549.1.9.16.1.4',
  sha256: '2.16.840.1.101.3.4.2.1',
  rsaSha256: '1.2.840.113549.1.1.11',
  ecdsaSha256: '1.2.840.10045.4.3.2',
  contentType: '1.2.840.113549.1.9.3',
  messageDigest: '1.2.840.113549.1.9.4',
};

function toCert(x) {
  if (x instanceof crypto.X509Certificate) return x;
  if (Buffer.isBuffer(x)) return new crypto.X509Certificate(x);
  if (typeof x === 'string') {
    const p = String(x).replace(/-----[\s\S]*?-----/g, '').replace(/\s+/g, '');
    return new crypto.X509Certificate(Buffer.from(p, 'base64'));
  }
  throw new Error('unknown cert input');
}

function findAttr(buf, attrsTlv, oid) {
  for (const a of D.children(buf, attrsTlv.cs, attrsTlv.ce)) {
    const ak = D.children(buf, a.cs, a.ce);
    if (D.oidString(ak[0].content) === oid) {
      return D.children(buf, ak[1].cs, ak[1].ce)[0].content;
    }
  }
  return null;
}

export function parseToken(tokenDer) {
  const buf = Buffer.isBuffer(tokenDer) ? tokenDer : Buffer.from(tokenDer);
  const root = D.parseTLV(buf, 0);
  const ci = D.children(buf, root.cs, root.ce);
  if (ci.length < 2) throw new Error('not a ContentInfo');
  if (D.oidString(ci[0].content) !== OID.signedData) throw new Error('contentType is not signedData');
  const sdExplicit = D.children(buf, ci[1].cs, ci[1].ce)[0];
  const sd = D.children(buf, sdExplicit.cs, sdExplicit.ce);

  const encapTlv = sd.find((t) => t.tag === 0x30);
  const certsTlv = sd.find((t) => t.tag === 0xa0) || null;
  const sets = sd.filter((t) => t.tag === 0x31);
  const signerInfosTlv = sets[sets.length - 1];

  const encapKids = D.children(buf, encapTlv.cs, encapTlv.ce);
  const eContentExplicit = D.children(buf, encapKids[1].cs, encapKids[1].ce)[0];
  const tstInfoDer = eContentExplicit.content;

  const certs = certsTlv
    ? D.children(buf, certsTlv.cs, certsTlv.ce).map((c) => toCert(buf.subarray(c.off, c.ce)))
    : [];

  const si = D.children(buf, signerInfosTlv.cs, signerInfosTlv.ce)[0];
  const siKids = D.children(buf, si.cs, si.ce);
  let signedAttrsTlv = null, sigTlv = null, digestAlgOid = null, sigAlgOid = null;
  for (const k of siKids) {
    if (k.tag === 0xa0) signedAttrsTlv = k;
    else if (k.tag === 0x04) sigTlv = k;
    else if (k.tag === 0x30) {
      const first = D.children(buf, k.cs, k.ce)[0];
      if (first && first.tag === 0x06) {
        const o = D.oidString(first.content);
        if (!digestAlgOid) digestAlgOid = o; else sigAlgOid = o;
      }
    }
  }

  // TSTInfo (eContent of encapContentInfo) → messageImprint.hashedMessage
  const tstOuter = D.parseTLV(tstInfoDer, 0);
  const tstKids = D.children(tstInfoDer, tstOuter.cs, tstOuter.ce); // version, policy, imprint, serial, genTime
  const miOuter = D.parseTLV(tstInfoDer, tstKids[2].off);           // messageImprint SEQUENCE
  const miKids = D.children(tstInfoDer, miOuter.cs, miOuter.ce);     // hashAlg OID, OCTET(hash)
  const imprintOuter = D.parseTLV(tstInfoDer, miKids[1].off);        // OCTET STRING
  const imprintHash = imprintOuter.content;

  return { buf, certs, signedAttrsTlv, sigTlv, sigAlgOid, tstInfoDer, imprintHash };
}

function buildAndVerifyChain(signer, allCerts, trustStore, now) {
  const issues = [];
  const chain = [signer];
  let current = signer;
  let guard = 0;
  while (true) {
    if (current.validFromDate.getTime() > now.getTime() || current.validToDate.getTime() < now.getTime()) {
      issues.push(`${current.subject} not time-valid (${current.validFrom}..${current.validTo})`);
    }
    if (trustStore.some((t) => t.fingerprint256 === current.fingerprint256)) break; // trusted anchor
    let issuer = null;
    const pool = [...allCerts, ...trustStore].filter((c) => c.fingerprint256 !== current.fingerprint256);
    for (const c of pool) {
      if (c.subject === current.issuer) {
        try { if (current.verify(c.publicKey)) { issuer = c; break; } } catch { /* keep looking */ }
      }
    }
    if (!issuer) { issues.push(`no trusted anchor / issuer found for ${current.subject}`); break; }
    if (!issuer.ca) issues.push(`issuer ${issuer.subject} lacks CA basic constraint`);
    chain.push(issuer);
    current = issuer;
    if (++guard > 12) { issues.push('chain too long'); break; }
  }
  return { ok: issues.length === 0 && chain.length > 0, chain, issues };
}

export function verifyTimestampToken(tokenDer, opts = {}) {
  const issues = [];
  let p;
  try { p = parseToken(tokenDer); } catch (e) { return { verified: false, issues: ['parse error: ' + e.message] }; }

  const { buf, certs, signedAttrsTlv, sigTlv, sigAlgOid, tstInfoDer, imprintHash } = p;
  if (!certs.length) return { verified: false, issues: ['no certificates in token'] };

  // 1. signature over the signed attributes (or eContent if no signedAttrs)
  const signer = certs.find((c) => c.issuer !== c.subject) || certs[0];
  const pub = signer.publicKey;
  let signedData;
  if (signedAttrsTlv) {
    const saBuf = Buffer.from(buf); saBuf[signedAttrsTlv.off] = 0x31; // re-wrap [0] as SET
    signedData = saBuf.subarray(signedAttrsTlv.off, signedAttrsTlv.end);
  } else {
    signedData = tstInfoDer;
  }
  const verifyAlg = sigAlgOid === OID.rsaSha256 ? null : (sigAlgOid === OID.ecdsaSha256 ? 'sha256' : null);
  let sigOk = false;
  try { sigOk = crypto.verify(verifyAlg, signedData, pub, sigTlv.content); } catch (e) { issues.push('signature verify threw: ' + e.message); }
  if (!sigOk) issues.push('signature over signed attributes is INVALID');

  if (signedAttrsTlv) {
    // 2. messageDigest attribute must equal sha256(TSTInfo)
    const mdAttr = findAttr(buf, signedAttrsTlv, OID.messageDigest);
    const expectedMd = crypto.createHash('sha256').update(tstInfoDer).digest();
    if (!mdAttr || mdAttr.length !== expectedMd.length || !crypto.timingSafeEqual(mdAttr, expectedMd)) {
      issues.push('messageDigest attribute does not match TSTInfo hash');
    }
    // 3. contentType attribute must be TSTInfo
    const ctAttr = findAttr(buf, signedAttrsTlv, OID.contentType);
    if (!ctAttr || D.oidString(ctAttr) !== OID.tstInfo) issues.push('contentType attribute is not TSTInfo');
  }

  // 4. message imprint must match the expected document digest
  if (opts.expectedDigest) {
    const exp = Buffer.isBuffer(opts.expectedDigest) ? opts.expectedDigest : Buffer.from(opts.expectedDigest, 'hex');
    if (imprintHash.length !== exp.length || !crypto.timingSafeEqual(imprintHash, exp)) {
      issues.push('message imprint does not match expected digest');
    }
  }

  // 5. certificate chain to a trusted root
  const trustStore = (opts.trustStore || []).map(toCert);
  const chainRes = buildAndVerifyChain(signer, certs, trustStore, opts.verifyAt || new Date());
  for (const i of chainRes.issues) issues.push('chain: ' + i);

  return {
    verified: issues.length === 0,
    signer: signer.subject,
    serialNumber: signer.serialNumber,
    chain: chainRes.chain.map((c) => c.subject),
    issues,
  };
}

export function verifyTimestampTokenBase64(b64, opts = {}) {
  return verifyTimestampToken(Buffer.from(b64, 'base64'), opts);
}
