// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// scripts/verify-secrets.mjs
// SPDX-License-Identifier: Apache-2.0
//
// Secret-in-docs gate. Documentation is shipped, mirrored to GitHub and pasted into
// tickets, so a credential that lands in a `.md` file is published, not stored. This
// gate scans Markdown + workflow YAML for the shapes a leaked credential takes:
//
//   - 64-hex strings (a generated issuer secret is exactly 32 bytes = 64 hex chars).
//     Hashes are legitimate content, so a line that already talks about a digest,
//     checksum, hash or manifest is allowed to carry one.
//   - PEM private-key blocks.
//   - `AEGIS_ISSUER_SECRET=` / `password=` followed by something that is not a
//     placeholder, a command substitution or a variable reference.
//   - JWT, GitHub token and AWS access-key shapes.
//
//   node scripts/verify-secrets.mjs        # report + exit 1 on any hit
//
// Part of `npm test`: adding a real secret to a document fails the build, which is
// cheaper than discovering it after the repository is public.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git']);
const SCAN_EXT = new Set(['.md', '.yml', '.yaml']);

// A value is a placeholder when it is obviously not a credential: angle brackets,
// shell substitution, a variable, or a word that says it is one.
const PLACEHOLDER = /<|\(|\$|%|secret|placeholder|strong|random|change.?me|example|your-|xxxx|…/i;

const RULES = [
  {
    id: 'hex64',
    re: /\b[0-9a-fA-F]{64}\b/g,
    // A digest is content; a credential is not. Allow lines that name the digest.
    allowLine: /(sha-?256|checksum|digest|hash|fingerprint|manifest|integrity)/i,
  },
  { id: 'pem-private-key', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  {
    id: 'issuer-secret-literal',
    re: /AEGIS_ISSUER_SECRET\s*[=:]\s*['"]?([A-Za-z0-9+/=_-]{16,})/g,
    valueIndex: 1,
    allowValue: PLACEHOLDER,
  },
  {
    id: 'password-literal',
    re: /(?:password|passwd|pwd)\s*[=:]\s*['"]?([^'"\s|]{8,})/gi,
    valueIndex: 1,
    allowValue: PLACEHOLDER,
  },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g },
  { id: 'github-token', re: /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(extname(name))) out.push(p);
  }
}

const files = [];
walk(ROOT, files);

let hits = 0;
let scanned = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, 'utf8');
  scanned += 1;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // A digest usually sits on its own line under a sentence that names it, so the
    // "this is a hash" context check looks one line up as well as at the line itself.
    const context = i > 0 ? `${lines[i - 1]} ${line}` : line;
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const m = rule.re.exec(line);
      if (!m) continue;
      if (rule.allowLine && rule.allowLine.test(context)) continue;
      if (rule.allowValue) {
        const value = m[rule.valueIndex ?? 0] || '';
        if (PLACEHOLDER.test(value)) continue;
      }
      hits += 1;
      const masked = String(m[0]).slice(0, 6) + '…';
      console.error(`[secrets] ${rel}:${i + 1}  ${rule.id}  ${masked}`);
    }
  }
}

if (hits > 0) {
  console.error(`\n[secrets] FAIL — ${hits} credential-shaped string(s) in ${scanned} document(s).`);
  console.error('[secrets] A document is public: generate the value at deploy time instead of writing it down.');
  process.exit(1);
}

console.log(`[secrets] PASS — ${scanned} document(s) scanned; no credentials, no private keys.`);
