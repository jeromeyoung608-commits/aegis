# Contributing to Aegis

Thanks for your interest. Aegis is source-available under the **Business Source
License 1.1** (BSL-1.1, SPDX `BUSL-1.1`; see `LICENSE`). The copyright holder may
also distribute contributed code under the **Aegis Commercial License**.

## Ways to contribute

- **Report issues** with a minimal reproduction and the exact build/version.
- **Propose changes** via a pull request against `main`. For anything that touches
  the security boundary (server.js, auth, compliance gates, crypto) open an issue
  first.
- **Localization** — translation catalogs live in `aegis-shell/src/i18n.js`
  (en/de/fr/es). Add a key to all four catalogs and to the reference set used by
  `aegis-shell/src/i18n-keys.test.js`.

## Developer setup

```bash
npm run setup        # one-click install / dev bootstrap
npm test             # runs every module's suite + repo gates
npm run verify:all   # TSA + p4/p5 checks
npm run doctor       # 9 pre-flight checks
npm run pack:delivery && npm run verify:delivery   # reproducible shipping archive
```

## Coding rules

- **Zero runtime dependencies** for the shell, server, and 9 of 11 modules. Only
  `doc-redactor` (pdf.js, pdf-lib, tesseract.js, tessdata) and `e2e-signed-delivery`
  (pdf-lib) vendor third-party code. See `docs/DEPENDENCY_AUDIT.md`.
- **Watermarks are enforced by gates.** Every shipped `.js/.mjs/.ts/.css/.html` file
  must carry the copyright header (`scripts/verify-headers.mjs`, wired into
  `npm test`). Do not remove `ENGINE BY JEROME YOUNG` footers or generated
  `producer`/`provenance` fields.
- **No private paths, no secrets in the tree.** `scripts/package-delivery.mjs` will
  refuse to build if `data/`, `config/local.json`, or key material would ship.

## License of your contribution

By submitting a pull request you agree your contribution is licensed under the
Business Source License 1.1 (BSL-1.1), and you grant the copyright holder a
perpetual, irrevocable right to relicense it under the Aegis Commercial License
and any future Change License. If you do not agree, do not submit.
