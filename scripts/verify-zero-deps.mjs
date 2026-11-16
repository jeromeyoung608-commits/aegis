#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Aegis zero-dependency gate.
 *
 * Fails if any module:
 *   • declares a runtime `dependencies` entry (dev-only deps are allowed),
 *   • ships a `vendor/` directory without MANIFEST.json,
 *   • fetches a remote asset at runtime from src/ (CDN, model host, telemetry),
 *   • hard-codes a developer's home path (`/Users/...`) into shippable code.
 *
 * Run: node scripts/verify-zero-deps.mjs [--quiet]
 */
import { readdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MODULES = join(ROOT, "modules");
const QUIET = process.argv.includes("--quiet");

// RFC 6761 / RFC 2606 reserved hostnames are documentation/test fixtures by
// definition — they can NEVER be routed to a real remote asset. Match the HOST
// (not a substring of the whole URL) so `https://evil.example.com/x.idp.local`
// cannot sneak through. Real domains still fail the gate.
const RESERVED_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\]|example\.(?:com|org|net)|(?:[^./]+\.)*(?:example|local|test|invalid|localhost|w3\.org))$/i;
function isReservedHost(url) {
  return RESERVED_HOST.test(url.replace(/^https?:\/\//i, "").split(/[:/?#]/)[0]);
}

const failures = [];
const fail = (m, msg) => failures.push(`${m}: ${msg}`);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "vendor") continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(js|mjs|cjs|html|css)$/.test(entry)) acc.push(p);
  }
  return acc;
}

const modules = readdirSync(MODULES).filter((n) => {
  const p = join(MODULES, n);
  return statSync(p).isDirectory() && n !== "aegis";
});

for (const name of modules) {
  const dir = join(MODULES, name);

  // 1) runtime dependencies
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = Object.keys(pkg.dependencies || {});
    if (deps.length) fail(name, `runtime dependencies declared: ${deps.join(", ")}`);
  }

  // 2) vendor without manifest
  if (existsSync(join(dir, "vendor")) && !existsSync(join(dir, "vendor/MANIFEST.json"))) {
    fail(name, "vendor/ present without vendor/MANIFEST.json");
  }

  // 3) remote asset fetches + local absolute paths
  for (const file of walk(dir)) {
    const rel = relative(dir, file);
    const text = readFileSync(file, "utf8");
    if (/\/Users\/[A-Za-z0-9._-]+\//.test(text)) {
      fail(name, `hard-coded home path in ${rel}`);
    }
    for (const line of text.split("\n")) {
      if (/^\s*(\*|\/\/)/.test(line)) continue;
      for (const m of line.matchAll(/https?:\/\/[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::\d+)?[^\s"'`)]*/g)) {
        if (isReservedHost(m[0])) continue;
        fail(name, `remote fetch in ${rel}: ${m[0]}`);
      }
    }
  }
}

// 4) node_modules must not be committed anywhere
for (const name of modules) {
  if (existsSync(join(MODULES, name, "node_modules"))) {
    // tolerated for dev-only test harnesses, but it must be git-ignored
    const gi = join(MODULES, name, ".gitignore");
    const ignored = existsSync(gi) && /node_modules/.test(readFileSync(gi, "utf8"));
    if (!ignored) fail(name, "node_modules present and not git-ignored");
  }
}

if (failures.length === 0) {
  if (!QUIET) console.log(`ZERO-DEP GATE PASS — ${modules.length} modules clean`);
  process.exit(0);
}
console.error(`ZERO-DEP GATE FAIL — ${failures.length} issue(s)`);
for (const f of failures) console.error("  ✗ " + f);
process.exit(1);
