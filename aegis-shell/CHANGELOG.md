# Changelog

## [1.0.0] - 2026-11-10

### Changed
- License changed to Apache-2.0 (open source); `LICENSE` now points to the Apache-2.0 root license.

### Added
- `LICENSE` (Business Source License 1.1, SPDX: BUSL-1.1)
- `CHANGELOG.md`, `.gitignore`, `package.json`
- `README.md` (MDS-1 twelve-chapter delivery contract)
- `tests/flow.test.mjs`: seven-stage state-machine unit tests (including the failure path where a failed verify cannot enter archive)

### Fixed
- Stage-4 brand label `Aegis-SignedDelivery` → `Aegis-Transport` (matching the actual P2P module)

### Verification
- `node --test tests/flow.test.mjs` → # pass 5 / # fail 0
- Dependency tier: A · Pure Zero
