# Changelog

All notable changes to Aegis are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/); this project adheres to
semantic versioning (`MAJOR.MINOR.PATCH`).

## [1.0.1] — 2026-11-16

### Fixed
- **German interface only covered the console header.** Switching the language
  selector to DE translated the header label and left the 10 tabs, every panel
  heading, all buttons and hints, and the entire workbench in English: just 54
  of ~180 console strings were wired through `[data-i18n]`, and the workbench
  had no selector. A 283-entry phrase catalogue keyed by the English source
  string, a DOM translator (text nodes plus `placeholder` / `title` /
  `aria-label` / `alt`, prefix+suffix rules for label-value strings,
  `MutationObserver` for post-boot content) now covers both pages and restores
  the English text when switching back. The workbench has its own EN/DE selector
  and shares the console's saved choice.
- **36 first-party source files still declared the project MIT-licensed**
  while the repository has been Apache-2.0 since `bdd49e3`. The headers were
  never scanned because `verify-licensing.mjs` only swept markdown. Headers
  rewritten; the gate now checks source headers as well.
- Two console strings referenced keys that did not exist
  (`compStatusOk` / `compStatusWarn`) and would have rendered as raw key names.

### Added
- `aegis-shell/src/i18n-coverage.test.js` — fails the build when a visible
  string in either shell page has no German translation.

## [1.0.0] — 2026-11-15

### Changed
- **License changed from BSL-1.1 to Apache-2.0** — Aegis is now open source and
  free to use, including commercially; paid support and services are optional
  (see `LICENSE`, `docs/LICENSING.md`, `PRICING.md`).

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
