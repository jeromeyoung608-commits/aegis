# Changelog

## [1.0.1] - 2026-11-16

### Fixed
- German interface covered the console header only. The key catalogue reached 54
  of ~180 console strings and the workbench had no language selector at all, so
  switching to DE left tabs, panel headings, buttons and hints in English. A
  phrase catalogue plus a DOM translator now covers every visible string on all
  13 pages (670 entries, 15 counter templates), including content rendered after
  boot and labels a module rewrites on an existing text node; switching back to
  EN restores the original text.
- Two compliance banner strings referenced missing keys (`compStatusOk`,
  `compStatusWarn`) and would have rendered as raw key names; they are now
  `compliance.statusOk` / `compliance.statusWarn` in both catalogues.

### Added
- `src/i18n-dom.js`: self-starting translator loaded by all 13 module demo pages,
  so the whole product follows the saved operator language, not only the shells.
- `src/i18n-coverage.test.js`: fails the build when a visible string in
  `console.html`, `index.html` or any `modules/*/index.html` has no German
  translation.
- Language selector on the workbench, sharing the console's saved choice.

## [1.0.0] - 2026-11-10

### Changed
- License changed to Apache-2.0 (open source); `LICENSE` now points to the Apache-2.0 root license.

### Added
- `LICENSE` — originally Business Source License 1.1 (SPDX: BUSL-1.1); superseded in `Changed` below by Apache-2.0. The current grant is Apache-2.0 only.
- `CHANGELOG.md`, `.gitignore`, `package.json`
- `README.md` (MDS-1 twelve-chapter delivery contract)
- `tests/flow.test.mjs`: seven-stage state-machine unit tests (including the failure path where a failed verify cannot enter archive)

### Fixed
- Stage-4 brand label `Aegis-SignedDelivery` → `Aegis-Transport` (matching the actual P2P module)

### Verification
- `node --test tests/flow.test.mjs` → # pass 5 / # fail 0
- Dependency tier: A · Pure Zero
