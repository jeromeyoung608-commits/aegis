<!-- Readiness evidence — NOT a certification. Maps SOC 2 Trust Services Criteria to implemented controls. -->

# SOC 2 Readiness — Control Mapping & Evidence

**Status:** Readiness evidence (self-assessment) · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine

> This document is **not** a SOC 2 report or certification. It is a readiness
> map showing, for each Trust Services Criterion (TSC), what is implemented and
> where an auditor would find evidence. Gaps are called out explicitly.

## Common Criteria (Security — CC)

| TSC | Control theme | Implemented | Evidence |
|-----|--------------|-----------|----------|
| CC1 | Control environment / governance | Partial | `docs/compliance/` (policies), `README` gate table |
| CC2 | Communication & information | Yes | Operator console; audit export |
| CC3 | Risk assessment | Partial | `docs/compliance/THREAT-MODEL.md`, `CRA-NIS2.md` |
| CC4 | Monitoring | Yes | Hash-chained audit log; `GET /healthz` liveness probe |
| CC5 | Control activities | Yes | Bearer auth + TTL; login throttling; tamper-evident audit; path-traversal guards |
| CC6 | Logical access | Yes | Hashed credentials; operator/issuer scopes; session TTL; failed-login throttle |
| CC7 | System operations | Yes | Backup/restore (`sqlite3 .backup`); freshness-checked delivery packer |
| CC8 | Change management | Partial | Feature-flag gating; ff-only merges; release checklist |
| CC9 | Risk mitigation | Partial | Threat model; no default egress |

## Additional TSC

- **Availability (A):** `GET /healthz` readiness; documented backup/restore;
  port-collision fail-fast boot. _Gap:_ no documented RTO/RPO SLA yet.
- **Confidentiality (C):** encryption at rest (vault); zero-knowledge identity;
  no third-party egress by default.
- **Processing Integrity (PI):** hash-chained audit; RFC3161 adapter with
  fail-open fallback to local time. _Gap:_ formal PI test suite pending.
- **Privacy (P):** `PRIVACY-POLICY.md`, `DPA.md`, `ROPA.md` (this folder);
  GDPR data-subject erasure implemented.

## Auditor pointers

- Audit chain verification: `GET /audit` + `GET /audit/export`; integrity via
  in-repo `verifyAuditChain`.
- Login throttle: `server.js` per-IP + per-(IP,user) limiter (429 + lockout).
- Tamper-evident operator audit: `server/store.js` `eraseSubject` refuses protected
  subjects (HTTP 403).
- Delivery integrity: `scripts/package-delivery.mjs` sha256 + source-freshness.

## Gaps closed (this round)

| # | Gap | Status | Evidence |
|---|-----|--------|----------|
| 1 | Formal access-review procedure & recertification | **Closed** | `ACCESS-REVIEW.md` (JML, quarterly recert, issuer-secret rotation) |
| 2 | Documented incident-response runbook | **Closed** | `INCIDENT-RESPONSE.md` (phases, Sev classes, GDPR 72h, tamper-evident audit forensics) |
| 3 | DR/backup RTO-RPO SLA + tested restore drill | **Closed** | `DR-BACKUP.md` (`sqlite3 .backup` method, RTO/RPO defaults, restore + annual drill) |
| 4 | Vendor / sub-processor inventory | **Closed** | `SUBCONTRACTOR-INVENTORY.md` (no mandatory runtime sub-processor; 2 opt-in egress points, off by default) |

Remaining for a formal audit (operational, not tooling): execute the first
quarterly access review and the first annual restore drill, and have counsel
sign off the legal drafts (Privacy Policy / DPA / ROPA).
