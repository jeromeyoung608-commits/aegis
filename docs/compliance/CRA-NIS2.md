# Aegis — CRA / NIS2 Readiness

Mapping of the EU **Cyber Resilience Act (CRA)** and **NIS2 Directive** expectations
to concrete Aegis controls. ✅ = implemented, 🟡 = partial / design-ready,
⏳ = planned.

## Secure-by-design & default (CRA Annex I.1)
- ✅ **Zero npm runtime dependencies.** The core kernel is first-party + `node:*` only.
  Browser modules vendor third-party libraries (PDF.js, pdf-lib, Tesseract.js) under
  `vendor/` directories, and test harnesses use `playwright` — all listed **honestly**
  in the CycloneDX SBOM (`scripts/gen-sbom.mjs`). No unsupported/abandoned components.
- ✅ **Local-first, offline** — no mandatory cloud; data processed in-browser.
- ✅ **Server-blind transfer** — the relay never sees file bytes or keys.

## Vulnerability handling (CRA Annex I.2 / NIS2 incident)
- ✅ **Audit trail** durable in SQLite; operator-facing and append-only (P1).
- 🟡 **Revocation** — local CRL-style deny-list at session admission (P5); a
  coordinated disclosure process / PSIRT is **not yet published** (planned).
- ⏳ **Independent penetration test** — required before production claim.

## Documentation & transparency (CRA Annex I.3)
- ✅ **SBOM** generated via `npm run` / `scripts/gen-sbom.mjs`.
- ✅ **Threat model** (`docs/compliance/THREAT-MODEL.md`).
- 🟡 **Security policy** (`SECURITY.md`); **not yet** an external bug-bounty.

## NIS2 governance / supply chain
- 🟡 Single-maintainer source-available (BUSL-1.1); supply chain is just Node.js (LTS recommended).
- ⏳ Formal **conformance / EN 301 549 (accessibility)** testing — P7 (WCAG 2.1 AA
  foundations started via the design system + i18n).

## Honest gaps (do not over-claim)
1. No third-party pen-test yet.
2. No published PSIRT / SLA for vulnerability disclosure.
3. Accessibility conformance is *foundational*, not *certified*.
4. The audit log proves the server *saw* an event; it does not by itself prove
   client-side correctness — pair with the in-browser hash chain.
