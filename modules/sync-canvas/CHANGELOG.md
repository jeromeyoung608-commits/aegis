# Changelog

## [1.0.0] - 2026-11-10

### Added
- `LICENSE` (MIT)
- `CHANGELOG.md`, `.gitignore`
- README completed with the MDS-1 delivery contract (12 chapters: problem / buyer / 60-second start / integration contract / architecture / guarantees & threat model / known limits / verification / measured performance / dependencies / license / changelog)

### Changed
- `package.json`: completed `license`, `engines`, `scripts.start`, `scripts.test`, `scripts.verify` (wired into the `verify-module.mjs` gate)

### Verification
- `node --test` → # pass 13 / # fail 0
- Dependency tier: A · Pure Zero
