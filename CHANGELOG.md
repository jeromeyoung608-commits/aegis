# Changelog

All notable changes to Aegis are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/); this project adheres to
semantic versioning (`MAJOR.MINOR.PATCH`).

## [1.0.0] — 2026-11-15

### Added
- **Workbench windows**: every surface (Topology, REDAKTOR, SignedDelivery, Vault,
  Audit, Admin) is now a draggable, resizable floating window; position/size persist
  in `localStorage` and are restored on reload (`aegis-shell/src/windowing.js`).
- **Compliance console** (`console.html`): ROPA register, DSAR ledger (GDPR Art. 15/12),
  DPIA, compliance-doc upload/gate, export, and erase-with-audit.
- **Request-body cap**: JSON endpoints reject bodies over 1 MB with `413` (upload
  endpoint exempt); closes an unauthenticated memory-amplification vector.
- **Brand watermarking**: source copyright headers on 100% of shipped files
  (`scripts/verify-headers.mjs` gate), `ENGINE BY JEROME YOUNG` page footers, and
  generated `producer` / `provenance` fields on signed artifacts and the data-portability
  export.
- **Source-available licensing**: Business Source License 1.1 (BSL-1.1, SPDX
  `BUSL-1.1`) with an Aegis Commercial License as the paid alternative
  (`LICENSE`, `LICENSES/`, `COMMERCIAL-LICENSE.md`, `EULA.md`, `PRICING.md`).
  The Change License is Apache-2.0; the support period is 5 years from v1.0.0.

### Fixed
- Redactor document preview (`#f-doc`) no longer collapses when its window is in the
  default in-flow state (class-collision with `.frame-box` resolved; topology fill rule
  scoped to `#stage-topo`).
- `.win[hidden]` now actually hides role-gated panels (operator can no longer see the
  admin panel).
- Static assets reject non-`GET`/`HEAD` methods with `405`.
- `/metrics` is fail-closed behind `AEGIS_METRICS_TOKEN`.

### Security
- Default surface hardening unchanged: no private paths served; auth/audit/compliance
  endpoints require credentials; rate-limiting after 5 failed logins; CSP/COOP/COEP/CORP
  set.

## [0.x] — pre-release
Initial zero-dependency server, 11 modules, seven-step closed-loop compliance flow,
and the audit/identity/vault subsystems. See `DELIVERY_REPORT.md` for the full audit
trail.
