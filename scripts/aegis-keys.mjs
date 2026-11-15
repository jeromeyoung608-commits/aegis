// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// Aegis/scripts/aegis-keys.mjs — manage the root key for token-gated signaling.
//
// Zero-dependency (uses the in-repo token-gate module). Two commands:
//
//   gen
//     Prints a fresh ECDSA P-256 root keypair as base64url:
//       AEGIS_ROOT_PUB=<public SPKI>   -> set this on the server (AEGIS_ROOT_PUB)
//       AEGIS_ROOT_PRIV=<private PKCS8> -> keep secret; used to mint room tokens
//
//   mint --room <name> --priv <AEGIS_ROOT_PRIV> [--ttl <ms>] [--aud <audience>]
//     Prints a room token. The server's /signal requires ?token=<this> when
//     AEGIS_ROOT_PUB is set. The token is bound to --room, so it cannot be
//     replayed against a different room.
//
// Example trusted-room launch:
//   node scripts/aegis-keys.mjs gen
//   export AEGIS_ROOT_PUB=<public>
//   node server.js &
//   TOK=$(node scripts/aegis-keys.mjs mint --room R1 --priv <private>)
//   # clients connect to /signal?room=R1&from=A&token=$TOK

import { generateRootKey, exportPublicKey, exportPrivateKey, importPrivateKey, issueToken } from '../modules/token-gate/src/token-gate.js';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (k) => {
    const i = rest.indexOf(k);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  if (cmd === 'gen') {
    const root = await generateRootKey();
    console.log('AEGIS_ROOT_PUB=' + b64url(await exportPublicKey(root.publicKey)));
    console.log('AEGIS_ROOT_PRIV=' + b64url(await exportPrivateKey(root.privateKey)));
    return;
  }
  if (cmd === 'mint') {
    const room = opt('--room');
    const priv = opt('--priv');
    const ttl = Number(opt('--ttl') || 10 * 60 * 1000);
    const aud = opt('--aud');
    if (!room || !priv) { console.error('mint requires --room and --priv'); process.exit(1); }
    const privateKey = await importPrivateKey(priv);
    const token = await issueToken(privateKey, { room, ttlMs: ttl, ...(aud ? { audience: aud } : {}) });
    console.log(token);
    return;
  }
  console.error('usage: aegis-keys.mjs gen | mint --room <r> --priv <pkcs8> [--ttl ms] [--aud a]');
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
