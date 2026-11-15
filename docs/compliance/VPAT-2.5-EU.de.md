<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/VPAT-2.5-EU.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# VPAT 2.5 EU + WCAG 2.2 Ebene AA — Conformance Bericht

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine (Bediener Konsole + 12 modules)
**Standard:** EN 301 549 / WCAG 2.2 Ebene AA (EU Accessibility Act, EAA)
**Evaluation Methode:** Handbuch keyboard + screen-reader bestanden auf der 13 ausgeliefert Seiten / 96 Kontrollen; automatisiert `aria-busy`/`role` Prüfungen.

---

## Summary

| Conformance Ebene | Ergebnis |
|------------------|--------|
| WCAG 2.2 Ebene Ein | Unterstützt |
| WCAG 2.2 Ebene AA | Unterstützt (siehe 3.3.2 Hinweis) |
| EN 301 549 | Unterstützt |

Kein Inhalt ist conveyed durch color alone; alle long-running Kontrollen expose
`aria-busy` für Zustand; alle interactive Kontrollen sind reachable durch keyboard.

## WCAG 2.2 AA — selected Kriterien

| § | Criterion | Ergebnis | Remarks |
|---|-----------|--------|---------|
| 1.1.1 | Non-text Inhalt | **N/A** | Kein informative images; icons sind decorative / labelled. |
| 1.3.1 | Info und relationships | Unterstützt | Forms verwenden associated `<label>` / `aria-label`. |
| 1.4.4 | Resize Text | **Unterstützt** | 200% zoom — kein Verlust von content/function (geprüft). |
| 1.4.10 | Reflow | **Unterstützt** | 375px width — kein horizontal overflow auf sampled Seiten. |
| 1.4.11 | Non-text contrast | Unterstützt | UI meets 3:1 für controls/state. |
| 2.1.1 | Keyboard | Unterstützt | Alle Kontrollen operable durch keyboard. |
| 2.4.7 | Fokus sichtbar | Unterstützt | Sichtbar Fokus ring auf alle Kontrollen; Marke Verknüpfung hat `:focus-visible` outline. |
| 3.3.1 | Fehler identification | Unterstützt | Klar Text Fehler (e.g. XSS/SQLi abgelehnt mit Meldung). |
| 3.3.2 | Labels oder instructions | **Unterstützt** | Jeder input/control trägt ein programmatic Bezeichnung (`<label for>`, Verpackung `<label>`, oder `aria-label`) — einschließlich Canvas Hinweis editor, remediated in dies Build. |
| 4.1.2 | Name, Rolle, Wert | Unterstützt | `aria-busy`, `role`, `aria-label` vorhanden auf dynamic Kontrollen. |

## Bekannt Einschränkungen
- Legacy builds vor 2026-11-14 ausgeliefert ein small Zahl von unlabelled Kontrollen; remediated in der aktuell Build. Re-test auf der deployed Paket.

Dies statement ist ein self-assessment. Wo EAA conformity declaration ist
ausgestellt publicly, es ist accompanied durch ein unabhängig auditor's Prüfung.
