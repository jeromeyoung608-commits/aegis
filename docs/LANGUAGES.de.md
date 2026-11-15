<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `docs/LANGUAGES.md`
> Übersetzung zur besseren Lesbarkeit. Bei Abweichungen gilt der englische Text.

# Sprachen

Ausgeliefert werden zwei Sprachen: **Englisch** (verbindlich) und **Deutsch**
(Übersetzung zur besseren Lesbarkeit). Code, Kommentare, Befehle, Bezeichner
und Moduloberflächen sind ausschließlich englisch. `LICENSE` und `NOTICE`
bleiben ausschließlich englisch und werden nie übersetzt — ein übersetzter
Lizenztext entfaltet keine rechtliche Wirkung.

## Was auf Deutsch vorliegt

| Dokument | Deutsche Fassung |
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

Alles andere — Modul-READMEs, Liefer- und Testberichte, Compliance-Runbooks,
Changelogs, API- und SDK-Referenzen — liegt ausschließlich auf Englisch vor.
Das ist beabsichtigt: Diese Dokumente lesen Ingenieure und Auditoren, nicht
Einkäufer, und eine schlechte Übersetzung ist schlechter als das englische
Original.

## Regeln

- Jede deutsche Datei beginnt mit einem Hinweis auf das englische Original und
  der Feststellung, dass der englische Text maßgeblich ist.
- Rechtliche Dokumente ergänzen: verbindlich ist die englische Fassung
  (`COMMERCIAL-LICENSE.md` § 8).
- Deutsche Fassungen verändern niemals Codeblöcke, Befehle, Bezeichner,
  Dateipfade, Versionsnummern oder den Lizenztext.
- `scripts/verify-translations.mjs` prüft Vorhandensein, Hinweis, Struktur und
  eine sprachliche Qualitätsheuristik (kein englischer Funktionswort-Salat,
  deutsche Funktionswörter vorhanden).
- Französisch und Spanisch werden nicht gepflegt. Sie wurden am 2026-11-15
  entfernt, weil kein Kunde sie brauchte und halb maschinell erzeugter Text
  schlechter ist als keiner.
