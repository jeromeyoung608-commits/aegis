// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis/scripts/setup.mjs — foolproof one-click setup.
//
// Zero external dependencies: the only thing it needs is Node.js >= 22 (for the
// built-in node:sqlite). It creates the data directory, initializes the embedded
// database, and writes a config/local.json with an auto-generated issuer secret
// so `node server.js` works immediately afterwards — no manual environment setup.
//
// Idempotent: safe to run again. On an existing config the issuerSecret is
// ROTATED (never silently reused) so a secret baked into a dev tree can never
// become every customer's shared admin password (B-03).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_DIR = path.join(ROOT, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'local.json');

function fail(msg) {
  console.error('\n  ✖ ' + msg + '\n');
  process.exit(1);
}

console.log('\nAegis one-click setup\n─────────────────────');

// 1. Node version gate (node:sqlite needs >= 22).
const [major] = process.versions.node.split('.').map(Number);
if (major < 22) {
  fail(`Node.js >= 22 is required (current: ${process.versions.node}). node:sqlite is built in from 22 onwards; below that version the one-click setup cannot run.\n  Please upgrade Node first: https://nodejs.org`);
}

// 2. Directories.
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CONFIG_DIR, { recursive: true });

// 3. Initialize the embedded database (this also self-checks node:sqlite works).
const { initStore } = await import('../server/store.js');
initStore();
console.log('  • initialised the embedded database data/aegis.db (node:sqlite, nothing to install)');

// 4. Config with an auto-generated issuer secret (idempotent).
if (!fs.existsSync(CONFIG_PATH)) {
  const cfg = {
    // Auto-generated issuer secret; in production replace it with a strong passphrase
    // and keep it offline (see README §14).
    issuerSecret: crypto.randomBytes(32).toString('hex'),
    port: 8080,
    trustedLan: false, // true is for lab use only; keep it false in production
    // The fields below are reserved for later stages (identity IdP / TSA chain
    // validation / cross-site transfer / revocation); server.js ignores them or treats
    // them as placeholders for now.
    tsa: { mode: 'off' },
    auth: { mode: 'local' },
    retentionDays: 365,
    // Phase 4 — cross-site transfer: once real STUN/TURN servers are configured the
    // client uses them to connect directly; without a usable TURN, Aegis falls back to
    // its built-in /relay as a self-hosted relay (server-blind).
    rtc: { iceServers: [] },
    // Phase 4 — server-side key escrow: when enabled the client should store the
    // session key envelope (encrypted to operatorPubKey) in /escrow; operatorPubKey is
    // the operator public key as SPKI (base64url).
    escrow: { enabled: false, operatorPubKey: null, requireForAdmit: false },
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(CONFIG_PATH, 0o600); // `mode` only applies on create; be explicit.
  console.log('  • generated config/local.json (with an auto-generated AEGIS_ISSUER_SECRET, mode 0600)');
} else {
  // B-01/B-03: never silently reuse an existing (possibly leaked / shipped) secret.
  // Rotate it in place and say so loudly. All other operator-tuned fields survive.
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { existing = {}; }
  const rotated = crypto.randomBytes(32).toString('hex');
  const hadSecret = typeof existing.issuerSecret === 'string' && existing.issuerSecret.length > 0;
  existing.issuerSecret = rotated;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2) + '\n', { mode: 0o600 });
  // An EXISTING file keeps its old mode (often 0644) — a rotated secret must not
  // stay world-readable, so chmod explicitly on both create and rotate paths.
  fs.chmodSync(CONFIG_PATH, 0o600);
  console.log(`  • rotating issuerSecret - ${hadSecret ? 'existing secret found, rotated (never reused)' : 'generated a new secret'}; existing sessions and passphrases stop working immediately`);
  console.log('    If clients are already deployed, re-issue with the new secret; AEGIS_ISSUER_SECRET can override it.');
}

console.log(`
✔ Setup complete (zero dependencies, no external database or service required).

Next:
  1. Start the server:  npm start        (equivalent to node server.js)
  2. Open the page:     http://localhost:8080
  3. Run the unit suite: npm test
  4. Run the browser gate: node video-tool/verify-runtime.mjs

Notes:
  • All data lives in data/aegis.db and survives a restart.
  • The /session issuer secret is the issuerSecret field in config/local.json;
    server.js reads it automatically, and AEGIS_ISSUER_SECRET can override it.
  • Enterprise features (identity IdP / TSA trust / cross-site transfer / revocation)
    are enabled in later stages (see README §14).
`);
