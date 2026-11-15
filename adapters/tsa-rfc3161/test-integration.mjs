// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis - adapters/tsa-rfc3161/test-integration.mjs
// Proves the verifier is correctly wired into the adapter + trust-store config
// (the exact path the /adapter/tsa/verify HTTP endpoint uses): a freshly minted
// token verifies when its CA is in the trust store, and fails when it is not.
import crypto from 'node:crypto';
import { makeCert, makeTsaToken } from './pki.js';
import { createTsaAdapter } from './index.js';

let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x ? ' — ' + x : '')); } };

const ca = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const signer = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const caCertDer = makeCert({ commonName: 'Aegis Test TSA CA', issuerCN: 'Aegis Test TSA CA', pubKey: ca.publicKey, signKey: ca.privateKey, serial: crypto.randomBytes(8), isCA: true });
const signerCertDer = makeCert({ commonName: 'Aegis Test TSA', issuerCN: 'Aegis Test TSA CA', pubKey: signer.publicKey, signKey: ca.privateKey, serial: crypto.randomBytes(8), isCA: false });

const digest = crypto.createHash('sha256').update('proof doc').digest();
const token = makeTsaToken({ signerCertDer, signerPrivKey: signer.privateKey, caCertDer, signerSerial: crypto.randomBytes(8), issuerCN: 'Aegis Test TSA CA', digest });
const tokenB64 = token.toString('base64');

console.log('TSA adapter integration (trust store path):');
const adapterWithTrust = createTsaAdapter({ provider: 'demo', endpoints: [], trustStore: [caCertDer] });
const ok = adapterWithTrust.verify(tokenB64, digest.toString('hex'));
check('verifies with CA in trust store', ok.verified === true, JSON.stringify(ok.issues));

const adapterNoTrust = createTsaAdapter({ provider: 'demo', endpoints: [], trustStore: [] });
const skip = adapterNoTrust.verify(tokenB64, digest.toString('hex'));
check('no trust store → skipped (not false-positive)', skip.verified === 'skipped', JSON.stringify(skip));

const adapterWrong = createTsaAdapter({ provider: 'demo', endpoints: [], trustStore: [makeCert({ commonName: 'Other CA', issuerCN: 'Other CA', pubKey: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey, signKey: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey, serial: crypto.randomBytes(8), isCA: true })] });
const bad = adapterWrong.verify(tokenB64, digest.toString('hex'));
check('untrusted root → unverified', bad.verified === false, JSON.stringify(bad.issues));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
