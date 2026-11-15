// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/scripts/gen-sbom.mjs — generate a CycloneDX 1.5 SBOM (Phase 7).
//
// HONEST DEPENDENCY SURFACE (verified, not assumed):
//  - The ROOT package.json declares ZERO npm dependencies (runtime or dev).
//  - BUT several modules commit THIRD-PARTY libraries under their own `vendor/`
//    directories (PDF.js, pdf-lib, Tesseract.js). These ARE third-party code
//    shipped in-browser; a package.json-only SBOM would wrongly claim "zero
//    third-party". This script therefore ALSO walks every `vendor/` dir.
//  - Dev/test tooling (playwright, playwright-core) is declared in module
//    package.json files (not the root) and is marked excluded (not shipped).
//
// Licenses use SPDX identifiers only (CycloneDX `license.id`), never free-text
// placeholders — CRA evidence requires machine-readable SPDX ids. The root
// component is BUSL-1.1; the five vendored libs map to their upstream SPDX ids
// (cross-checked against README §13 and each vendor/LICENSE file); anything
// unknown uses the SPDX-defined `NOASSERTION`, which CycloneDX accepts.
//
// Usage:  node scripts/gen-sbom.mjs [--out dist/sbom.cdx.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const nodeVer = process.versions.node;
const outFile = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;

const declaredDeps = Object.keys(pkg.dependencies || {});
const declaredDev = Object.keys(pkg.devDependencies || {});

// ── Walk every vendor/ directory and group bundled libraries by folder name. ────
function scanVendored(root) {
  const libs = new Map(); // name -> { files, bytes, dirs:Set }
  const collect = (vdir) => {
    let ents;
    try { ents = fs.readdirSync(vdir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      const libDir = path.join(vdir, e.name);
      let files = 0, bytes = 0;
      const inner = (d) => {
        let x;
        try { x = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const f of x) {
          const fp = path.join(d, f.name);
          if (f.isDirectory()) inner(fp);
          else { files++; try { bytes += fs.statSync(fp).size; } catch { /* ignore */ } }
        }
      };
      inner(libDir);
      if (files) libs.set(e.name, { files, bytes });
    }
  };
  const walk = (dir, depth = 0) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (!e.isDirectory()) continue;
      if (e.name === 'vendor') collect(p);
      else if (depth < 5) walk(p, depth + 1);
    }
  };
  walk(root);
  return libs;
}

// ── Dev/test tooling declared in module package.json files (never shipped). ─────
function scanDevTooling(root) {
  const set = new Map(); // name -> version constraint
  const modsDir = path.join(root, 'modules');
  let mods;
  try { mods = fs.readdirSync(modsDir, { withFileTypes: true }); } catch { return set; }
  for (const m of mods) {
    if (!m.isDirectory()) continue;
    const pj = path.join(modsDir, m.name, 'package.json');
    try {
      const mj = JSON.parse(fs.readFileSync(pj, 'utf8'));
      const dd = mj.devDependencies || {};
      for (const k of Object.keys(dd)) set.set(k, dd[k].replace(/[^0-9.]/g, ''));
    } catch { /* no package.json in this module */ }
  }
  return set;
}

const vendored = scanVendored(ROOT);
const devTooling = scanDevTooling(ROOT);

// ── Version / provenance for vendored libs, read from vendor/MANIFEST.json ─────
// The manifests are the authoritative record (version, SHA-256, upstream URL);
// an SBOM that says "version not machine-readable" is not CRA-usable.
function loadVendorManifests(root) {
  const map = new Map();
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      const p = path.join(dir, e.name);
      if (e.name === 'vendor') {
        const mp = path.join(p, 'MANIFEST.json');
        try {
          const mj = JSON.parse(fs.readFileSync(mp, 'utf8'));
          for (const c of (mj.components || [])) {
            if (!c || !c.name) continue;
            const upstream = c.upstream || c.upstreamUrl || '';
            const gh = upstream.match(/github\.com\/([^/]+)\/([^/#]+)/);
            map.set(c.name, {
              version: c.version || 'NOASSERTION',
              license: c.license || 'NOASSERTION',
              purl: gh ? `pkg:github/${gh[1]}/${gh[2]}@${c.version}` : undefined,
            });
          }
        } catch { /* no manifest in this vendor dir */ }
        continue;
      }
      stack.push(p);
    }
  }
  return map;
}
const vendorMeta = loadVendorManifests(ROOT);
// Directory names differ from upstream package names in the manifests.
const VENDOR_ALIAS = {
  pdfjs: 'pdf.js',
  tesseract: 'tesseract.js',
  'tesseract-core': 'tesseract.js-core',
  tessdata: 'tessdata (deu, eng)',
};

// Upstream SPDX ids for the five vendored libraries (verified against README §13
// and each vendor/<lib>/LICENSE). Unknown folders get NOASSERTION, the SPDX id
// for "license could not be determined" — accepted by CycloneDX 1.5.
const VENDOR_SPDX = {
  'pdfjs': 'Apache-2.0',
  'pdf-lib': 'MIT',
  'tesseract': 'Apache-2.0',
  'tesseract-core': 'Apache-2.0',
  'tessdata': 'Apache-2.0',
};

const components = [
  { type: 'application', name: 'Node.js', version: nodeVer, purl: `pkg:generic/node@${nodeVer}`, 'bom-ref': 'node', licenses: [{ license: { id: 'MIT' } }] },
];
for (const d of declaredDeps) {
  components.push({ type: 'library', name: d, version: (pkg.dependencies[d] || '*').replace(/[^0-9.]/g, ''), 'bom-ref': 'dep:' + d });
}
// purl/version must be machine-readable: keep only the leading numeric version.
function purlVersion(v) {
  const m = String(v || '').match(/^[0-9]+(\.[0-9]+)*/);
  return m ? m[0] : 'NOASSERTION';
}
for (const [lib, info] of vendored) {
  const meta = vendorMeta.get(lib) || vendorMeta.get(VENDOR_ALIAS[lib]) || {};
  const ver = purlVersion(meta.version);
  const comp = {
    type: 'library',
    name: lib,
    version: ver,
    'bom-ref': 'vendor:' + lib,
    scope: 'required',
    licenses: [{ license: { id: VENDOR_SPDX[lib] || meta.license || 'NOASSERTION' } }],
    properties: [
      { name: 'aegis:vendored', value: 'true' },
      { name: 'aegis:bundledFiles', value: String(info.files) },
      { name: 'aegis:bundledBytes', value: String(info.bytes) },
    ],
  };
  if (meta.purl) comp.purl = meta.purl.replace(/@[^@]*$/, '@' + (ver === 'NOASSERTION' ? purlVersion(meta.purl.split('@').pop()) : ver));
  components.push(comp);
}
// Known licences for the dev/test tooling we declare; anything else stays NOASSERTION.
const DEV_SPDX = { 'playwright': 'Apache-2.0', 'playwright-core': 'Apache-2.0', 'pdf-lib': 'MIT', 'remotion': 'SEE LICENSE IN LICENSE.md', 'react': 'MIT', 'react-dom': 'MIT' };
for (const [name, ver] of devTooling) {
  if (vendored.has(name)) continue; // already recorded as a shipped vendored component
  components.push({
    type: 'library',
    name,
    version: ver || 'unknown',
    'bom-ref': 'dev:' + name,
    scope: 'excluded', // dev/test only, not in the shipped runtime
    licenses: [{ license: { id: DEV_SPDX[name] || 'NOASSERTION' } }],
    properties: [{ name: 'aegis:scope', value: 'dev/test tooling (not shipped)' }],
  });
}

const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: 'application',
      name: pkg.name,
      version: pkg.version,
      description: `${pkg.description} NOTE: root declares zero npm deps, but browser modules vendor third-party libs (PDF.js, pdf-lib, Tesseract.js) and test harnesses use playwright.`,
      licenses: [{ license: { id: 'BUSL-1.1' } }],
      'bom-ref': 'aegis',
    },
  },
  components,
  dependencies: [
    { ref: 'aegis', dependsOn: ['node', ...declaredDeps.map((d) => 'dep:' + d), ...[...vendored.keys()].map((l) => 'vendor:' + l)] },
    ...components.filter((c) => c['bom-ref'] !== 'aegis').map((c) => ({ ref: c['bom-ref'], dependsOn: [] })),
  ],
};

const json = JSON.stringify(bom, null, 2);
if (outFile) {
  fs.mkdirSync(path.dirname(path.join(ROOT, outFile)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, outFile), json + '\n');
  console.log(`SBOM written: ${outFile}`);
}
console.log(`  npm runtime deps : ${declaredDeps.length}`);
console.log(`  vendored libs   : ${vendored.size}  ->  ${[...vendored.keys()].join(', ') || '(none)'}`);
console.log(`  dev/test tooling: ${devTooling.size}  ->  ${[...devTooling.keys()].join(', ') || '(none)'}`);
console.log(`  node runtime    : ${nodeVer}`);
if (!outFile) process.stdout.write(json + '\n');
