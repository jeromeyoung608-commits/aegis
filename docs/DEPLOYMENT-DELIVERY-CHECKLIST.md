# Aegis — Deployment & Delivery Checklist

> Use for every customer deployment. Both parties sign §7 at handover. Tick the
> boxes that apply; write N/A where a step does not apply, with a reason.
> Everything here is verifiable — no step requires trusting a status claim.

**Customer:** ⟨legal entity name⟩  **Environment:** ⟨host / cluster / air-gapped?>
**Engagement / Order Form ref:** ⟨ref⟩  **Date:** ⟨YYYY-MM-DD⟩

---

## 1. Pre-flight

| ☐ | Check | How to verify | Result |
|---|---|---|---|
| ☐ | Node.js runtime present and version in the supported range | `node -v` → major ≥ 22 (`package.json` `engines.node`) | ⟨version⟩ |
| ☐ | No third-party runtime dependencies required | `npm run verify:zero-deps` → PASS | ☐ |
| ☐ | Target port free | `lsof -ti:<port>` → empty (default 8080) | ☐ |
| ☐ | Browser present (WebGPU / WebRTC / OCR need a real browser) | `chrome --version` | ⟨version⟩ |
| ☐ | Disk space for OCR assets + evidence vault | ≥ 500 MiB free | ⟨free⟩ |
| ☐ | Backup taken of the target environment | customer record | ☐ |

## 2. Installation

| ☐ | Step | Command / evidence |
|---|---|---|
| ☐ | One-click install completed | `npm run setup` → success log |
| ☐ | Server starts and serves theshell | `node server.js` → `curl -sf http://localhost:<port>/` |
| ☐ | No source, key or archive path is downloadable | `curl` on `/server.js`, `/config/local.json` → 404 |
| ☐ | Unauthorised paths refused | `verify:p3` gate → PASS |

## 3. Configuration

| ☐ | Step | Where | Value |
|---|---|---|---|
| ☐ | Local secret generated & stored **only** on the operator's machine | `config/local.json` (never committed, never shipped) | ☐ |
| ☐ | Issuer keypair generated (ECDSA) | `npm run setup` output | ☐ |
| ☐ | Port / bind address set | `config/local.json` | ⟨port⟩ |
| ☐ | OIDC / SSO optional integration | `server/oidc.js` | ☐ / N/A |
| ☐ | Optional RFC 3161 TSA endpoint configured | `adapters/tsa-rfc3161/config-default.js` | ☐ / N/A |
| ☐ | **Fail-closed mode verified**: external TSA unreachable → local time fallback, relay intact | `verify:tsa` offline smoke | ☐ |

## 4. Security verification (run all — record the output line)

| ☐ | Gate | Command | Result |
|---|---|---|---|
| ☐ | Licensing headers | `npm run verify:headers` | ☐ PASS |
| ☐ | Licensing compliance | `npm run verify:licensing` | ☐ PASS |
| ☐ | Claims wording | `npm run verify:claims` | ☐ PASS |
| ☐ | Zero-dependency lint | `npm run verify:zero-deps` | ☐ PASS |
| ☐ | Diagnostics | `npm run doctor` | ☐ 0 failures |
| ☐ | Unit + integration suite | `npm test` | ☐ pass / ☐ fail |
| ☐ | Delivery pack reproducible | `npm run pack:delivery && npm run verify:delivery` | ☐ PASS |
| ☐ | CSP nonce enforced (no inline script without nonce) | `verify:csp` | ☐ PASS |
| ☐ | COOP/COEP headers present (cross-origin isolation) | `curl -I` → headers | ☐ |
| ☐ | `.well-known/security.txt` present with a monitored contact | `curl` → file | ☐ |
| ☐ | SBOM regenerated for this build | `npm run sbom` → `SBOM.cdx.json` | ☐ |

## 5. Functional verification (the seven-stage loop)

| ☐ | Stage | Verified by |
|---|---|---|
| ☐ | 1 Topology (device graph renders at scale) | ☐ |
| ☐ | 2 REDAKTOR — destructive redaction (no recoverable text layer) | ☐ |
| ☐ | 3 Sign (detached hash signature, self-asserted key) | ☐ |
| ☐ | 4 Send (P2P relay, server sees ciphertext only) | ☐ |
| ☐ | 5 Receive / verify | ☐ |
| ☐ | 6 Archive (encrypted OPFS vault) | ☐ |
| ☐ | 7 Audit (tamper-evident hash chain) | ☐ |
| ☐ | Evidence export (portability bundle with `producer` / `provenance`) | ☐ |
| ☐ | WebGL2 fallback path (no WebGPU machine) | ☐ |

## 6. Handover pack delivered to the customer

| ☐ | Item | Where |
|---|---|---|
| ☐ | Software + licence (Apache-2.0) | `LICENSE`, `LICENSES/Apache-2.0.txt` |
| ☐ | SBOM for the delivered build | `SBOM.cdx.json` |
| ☐ | Delivery archive + sha256 digest | `dist/aegis-delivery-<version>.tar.gz` + digest |
| ☐ | Third-party attribution index | `NOTICE`, `modules/*/vendor/MANIFEST.json` |
| ☐ | API / SDK documentation | `docs/API.md`, `docs/SDK.md` |
| ☐ | Claims-wording baseline (marketing guardrails) | `docs/CLAIMS-WORDING.md` |
| ☐ | Security policy + support SLA + escalation contacts | `SECURITY.md`, `.well-known/security.txt`, Order Form §4 |
| ☐ | Operator training (recorded) | ⟨session date, attendees⟩ |
| ☐ | Key material handover + rotation procedure | ⟨procedure ref⟩ |

## 7. Handover sign-off

| | Provider | Customer |
|---|---|---|
| Name | Jerome Young (Yang Jie) | ⟨name⟩ |
| Role | maintainer | ⟨role⟩ |
| Signature | | |
| Date | | |

**Outstanding items at handover** (write them here; both parties keep a copy):

1. ⟨item + owner + due date⟩
2. ⟨item + owner + due date⟩

**Not covered by this deployment** (state explicitly, e.g. third-party
attestation, custom development, on-site work): ⟨list or "none">⟩

---

*Appendix: the authoritative gate list is `package.json` `scripts` and
`.github/workflows/ci-runtime.yml`. If a command in this checklist no longer
exists, that is a defect in the checklist — fix it, do not tick it.*
