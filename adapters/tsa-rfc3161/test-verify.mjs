// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis - adapters/tsa-rfc3161/test-verify.mjs
// OFFLINE proof that the RFC 3161 verifier works: synthesize a CA + TSA signer,
// mint a token, and assert (a) a trusted chain verifies, (b) an untrusted root
// fails, (c) a tampered signature fails, (d) a wrong expected digest fails.
import crypto from 'node:crypto';
import { makeCert, makeTsaToken } from './pki.js';
import { verifyTimestampToken } from './verify.js';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}` + (extra ? ` — ${extra}` : '')); }
}

const ca = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const signer = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const caSerial = crypto.randomBytes(8);
const signerSerial = crypto.randomBytes(8);

const caCertDer = makeCert({
  commonName: 'Aegis Test TSA CA', issuerCN: 'Aegis Test TSA CA',
  pubKey: ca.publicKey, signKey: ca.privateKey, serial: caSerial, isCA: true,
});
const signerCertDer = makeCert({
  commonName: 'Aegis Test TSA', issuerCN: 'Aegis Test TSA CA',
  pubKey: signer.publicKey, signKey: ca.privateKey, serial: signerSerial, isCA: false,
});
const caCert = new crypto.X509Certificate(caCertDer);

const document = Buffer.from('Aegis proof-of-existence document');
const digest = crypto.createHash('sha256').update(document).digest();

const token = makeTsaToken({
  signerCertDer, signerPrivKey: signer.privateKey, caCertDer,
  signerSerial, issuerCN: 'Aegis Test TSA CA', digest,
});

console.log('TSA verifier offline self-test:');
const good = verifyTimestampToken(token, { trustStore: [caCertDer], expectedDigest: digest });
check('trusted chain + correct digest → verified', good.verified, JSON.stringify(good.issues));
check('signer identified', good.signer && good.signer.includes('Aegis Test TSA'), good.signer);
check('chain includes CA', Array.isArray(good.chain) && good.chain.some((s) => s.includes('CA')), good.chain && good.chain.join(' -> '));

const untrusted = verifyTimestampToken(token, { trustStore: [], expectedDigest: digest });
check('no trust store → unverified (chain untrusted)', !untrusted.verified, JSON.stringify(untrusted.issues));

const tampered = Buffer.from(token); tampered[tampered.length - 1] ^= 0x01;
const badSig = verifyTimestampToken(tampered, { trustStore: [caCertDer], expectedDigest: digest });
check('tampered signature → unverified', !badSig.verified, JSON.stringify(badSig.issues));

const wrongDigest = verifyTimestampToken(token, { trustStore: [caCertDer], expectedDigest: crypto.createHash('sha256').update('other').digest() });
check('wrong expected digest → unverified', !wrongDigest.verified, JSON.stringify(wrongDigest.issues));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
