# Languages

Two languages ship: **English** (authoritative) and **German** (translation for
convenience). Code, comments, commands, identifiers and module interfaces are
English only. `LICENSE` and `NOTICE` are English only and are never translated —
a translated licence text has no legal effect.

## What exists in German

| Document | German version |
|---|---|
| `README.md` | `README.de.md` |
| `SECURITY.md` | `SECURITY.de.md` |
| `PRICING.md` | `PRICING.de.md` |
| `COMMERCIAL-LICENSE.md` | `COMMERCIAL-LICENSE.de.md` |
| `EULA.md` | `EULA.de.md` |
| `TRADEMARK.md` | `TRADEMARK.de.md` |
| `CONTRIBUTING.md` | `CONTRIBUTING.de.md` |
| `CODE_OF_CONDUCT.md` | `CODE_OF_CONDUCT.de.md` |
| `docs/LICENSING.md` | `docs/LICENSING.de.md` |
| `docs/LANGUAGES.md` | `docs/LANGUAGES.de.md` |
| `docs/legal/ORDER-FORM-TEMPLATE.md` | `ORDER-FORM-TEMPLATE.de.md` |
| `docs/legal/DPA-STATEMENT.md` | `DPA-STATEMENT.de.md` |
| `docs/legal/LEGAL-INDEX.md` | `LEGAL-INDEX.de.md` |
| `docs/compliance/QUICK-START.md` | `QUICK-START.de.md` |
| `docs/compliance/CRA-NIS2.md` | `CRA-NIS2.de.md` |
| `docs/compliance/DATA-RESIDENCY.md` | `DATA-RESIDENCY.de.md` |

Everything else — module READMEs, delivery and test reports, compliance
runbooks, changelogs, API/SDK references — is English only. That is deliberate:
those documents are read by engineers and auditors, not by buyers, and a bad
translation is worse than an English original.

## Rules

- Every German file starts with a banner naming the English original and stating
  that the English text prevails.
- Legal documents add: the binding text is the English version
  (`COMMERCIAL-LICENSE.md` § 8).
- German files never alter code blocks, commands, identifiers, file paths,
  version numbers or the licence text.
- `scripts/verify-translations.mjs` enforces presence, banner, structure and a
  language-quality heuristic (no English function-word soup, German function
  words present).
- French and Spanish are not maintained. They were removed on 2026-11-15 because
  no customer needed them and half machine-generated text is worse than none.
