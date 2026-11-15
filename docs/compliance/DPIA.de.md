<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DPIA.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Daten Protection Impact Assessment (DPIA) — Auslöser & Vorlage

**Status:** Vorlage · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Framework:** EU GDPR Article 35 / UK GDPR

Ein DPIA ist verpflichtend vor starting Verarbeitung das ist "likely zu Ergebnis in ein hoch
Risiko". Dies Dokument (ein) lists der statutory Auslöser Kriterien, (b) Datensätze der
Verantwortlicher's answers, und (c) bietet der assessment Rumpf. Der Aegis Instanz
offenlegt ein Auslöser calculation bei `GET /api/compliance/dpia` von Verantwortlicher's
eigen `dpia` flags — es ist advisory nur und macht nicht ersetzt counsel's judgement.

---

## 1. Auslöser Kriterien (Art. 35(3)) — tick irgendein das anwenden

| # | Criterion | Verantwortlicher answer |
|---|---|---|
| 1 | Large-scale evaluation von persönlich aspects based auf automatisiert Verarbeitung (profiling) | [ ] |
| 2 | Large-scale Verarbeitung von special-category Daten (Art. 9) oder criminal-offence Daten (Art. 10) | [ ] |
| 3 | Systematic, large-scale Überwachung von ein publicly accessible area | [ ] |
| 4 | Large-scale Verarbeitung (e.g. > 100k Daten Betroffene) | [ ] |
| 5 | Verarbeitung das verhindert Daten Betroffene von exercising ein Recht oder mit ein service/contract | [ ] |
| 6 | Verarbeitung das erstellt oder exploits vulnerable-subject profiles | [ ] |
| 7 | Innovative technology (e.g. biometric, AI-driven decisions) | [ ] |
| 8 | Wenn combined mit eine weitere Verarbeitung, es gives rise zu hoch Risiko | [ ] |
| 9 | Verarbeitung von children's Daten / offering Services zu children | [ ] |

**Auslöser Ergebnis:** wenn irgendein criterion ist ticked, ein DPIA ist **erforderlich**. Der
`/api/compliance/dpia` Endpunkt gibt zurück `{ required: true, reasons: [...] }`.

## 2. Assessment Rumpf (Art. 35(7))

- **Description von Verarbeitung:** {{ROPA_Zweck}}
- **Necessity & proportionality:** local-only durch Entwurf; Ausgang deaktiviert durch Standard;
  hashing/minimisation angewendet vor irgendein optional extern Aufruf.
- **Risks zu Daten Betroffene:** unauthorised Zugriff (mitigated durch Bediener auth + Audit);
  Aufbewahrung über hinaus brauchen (mitigated durch GDPR Löschung / tombstone).
- **Misst:** Verschlüsselung bei Rest, null Standard Ausgang, manipulationserkennbar Audit chain,
  role-based Zugriff, und Bediener Compliance Konsole.
- **Residual Risiko & sign-off:** _zu sein abgeschlossen durch Verantwortlicher's DPO._

## 3. Consultation (Art. 35(9))

Wo ein DPIA zeigt hoch residual Risiko, Verantwortlicher consults der competent
Aufsichtsbehörde vor Verarbeitung.

---

_Abgeschlossen DPIA zu sein beibehalten durch Verantwortlicher und supplied zu Aufsichtsbehörde auf Anfrage._
