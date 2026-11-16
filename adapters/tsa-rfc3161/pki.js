// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis - adapters/tsa-rfc3161/pki.js
// Test-only helpers: synthesize a CA + TSA signer certificate and a minimal but
// structurally valid RFC 3161 Time-Stamp Token (CMS SignedData). This lets the
// verifier be exercised OFFLINE with no real TSA — the same parse/verify path that
// validates tokens from production TSAs. Not used by the runtime server.
import crypto from 'node:crypto';
import * as D from './der.js';

function nameCN(commonName) {
  return D.SEQ(D.SET(D.SEQ(D.OID('2.5.4.3'), D.UTF8(commonName))));
}
function validity() {
  const notBefore = new Date(Date.now() - 60_000);
  const notAfter = new Date(Date.now() + 365 * 86_400_000);
  return D.SEQ(D.UTCTIME(notBefore), D.UTCTIME(notAfter));
}

export function makeCert({ commonName, issuerCN, pubKey, signKey, serial, isCA }) {
  const spki = pubKey.export({ type: 'spki', format: 'der' });
  const basicConstraints = D.SEQ(
    D.OID('2.5.29.19'),
    D.OCTET(D.SEQ(isCA ? D.BOOL(true) : D.BOOL(false))),
  );
  const tbs = D.SEQ(
    D.CTX(0, D.INT(2)),                                   // version v3
    D.INTbuf(serial),
    D.SEQ(D.OID('1.2.840.113549.1.1.11'), D.NULL()),       // signature alg: rsaSha256
    nameCN(issuerCN),
    validity(),
    nameCN(commonName),
    spki,
    D.CTX(3, D.SEQ(basicConstraints)),                     // extensions [3]
  );
  const sig = crypto.sign('sha256', tbs, signKey);          // RSA PKCS#1 v1.5
  return D.SEQ(tbs, D.SEQ(D.OID('1.2.840.113549.1.1.11'), D.NULL()), D.der(0x03, Buffer.concat([Buffer.from([0x00]), sig])));
}

export function makeTsaToken({ signerCertDer, signerPrivKey, caCertDer, signerSerial, issuerCN, digest, policy, serial, genTime }) {
  const tstInfo = D.SEQ(
    D.INT(1),
    D.OID(policy || '1.3.6.1.4.1.9999.1'),                  // policy OID (demo)
    D.SEQ(D.OID('2.16.840.1.101.3.4.2.1'), D.OCTET(digest)), // messageImprint (sha256)
    D.INTbuf(serial || crypto.randomBytes(8)),
    D.GENERALIZEDTIME(genTime || new Date()),
  );
  const mdHash = crypto.createHash('sha256').update(tstInfo).digest();
  const contentTypeAttr = D.SEQ(D.OID('1.2.840.113549.1.9.3'), D.SET(D.OID('1.2.840.113549.1.9.16.1.4')));
  const mdAttr = D.SEQ(D.OID('1.2.840.113549.1.9.4'), D.SET(D.OCTET(mdHash)));
  const saContent = Buffer.concat([contentTypeAttr, mdAttr]);
  const signedAttrsSet = D.SET(contentTypeAttr, mdAttr);    // tag 0x31 — used for signing
  const signature = crypto.sign('sha256', signedAttrsSet, signerPrivKey);

  const signerInfo = D.SEQ(
    D.INT(1),
    D.SEQ(nameCN(issuerCN), D.INTbuf(signerSerial)),         // IssuerAndSerialNumber
    D.SEQ(D.OID('2.16.840.1.101.3.4.2.1'), D.NULL()),        // digestAlgorithm
    D.CTX(0, saContent),                                     // [0] IMPLICIT signedAttrs
    D.SEQ(D.OID('1.2.840.113549.1.1.11'), D.NULL()),         // signatureAlgorithm
    D.OCTET(signature),
  );

  const encap = D.SEQ(
    D.OID('1.2.840.113549.1.9.16.1.4'),                      // eContentType = TSTInfo
    D.CTX(0, D.OCTET(tstInfo)),                               // [0] EXPLICIT eContent
  );
  const certsField = D.CTX(0, Buffer.concat([signerCertDer, caCertDer])); // [0] IMPLICIT SET OF Certificate
  const signedData = D.SEQ(
    D.INT(3),
    D.SET(D.SEQ(D.OID('2.16.840.1.101.3.4.2.1'), D.NULL())),  // digestAlgorithms
    encap,
    certsField,
    D.SET(signerInfo),
  );
  return D.SEQ(D.OID('1.2.840.113549.1.7.2'), D.CTX(0, signedData)); // ContentInfo
}
