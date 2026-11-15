<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/INCIDENT-RESPONSE.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Vorfall Antwort Runbook

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine
**Zweck:** define wie der operating Team erkennt, enthält, eradicates, recovers
von, und learns von security/privacy incidents, einschließlich der GDPR 72-Stunde
breach-notification duty.

---

## 1. Roles

| Rolle | Verantwortung |
|------|----------------|
| Vorfall Commander (IC) | besitzt Antwort, coordinates, decides severity |
| Sicherheit lead | technical containment & forensics |
| Comms / DPO | regulator, Kunde und intern communication |
| On-call Bediener | executes containment Schritte auf Instanz |

## 2. Severity classification

| SEV | Beispiel | Antwort Ziel |
|-----|---------|-----------------|
| SEV1 | Bestätigt Verstoß von Bediener Konto / Aussteller Geheimnis Leck / Daten exfiltration | 1h acknowledge, 24h containment |
| SEV2 | Exploit attempted & blockiert, Audit-integrity alarm | 4h acknowledge |
| SEV3 | Service degradation, fehlgeschlagen Sicherung, /healthz red | 1 Geschäft Tag |
| SEV4 | Cosmetic / doc / low-risk | backlog |

## 3. Antwort phases

1. **Erkennen / Triage** — alerts von `/healthz` Überwachung, Audit anomalies
   (`auth_login_throttled`, `auth_login_failed` spikes), oder extern Bericht.
2. **Enthalten** — rotieren `AEGIS_ISSUER_SECRET`; disable/lock der implicated
   Bediener Konto; isolate Instanz (stop `node server.js` oder Block port).
3. **Eradicate** — patch der vulnerable component; purge irgendein injiziert Artefakt;
   bestätigen mit `verify:delivery` das der deployed Build passt ein known-good manifest.
4. **Recover** — wiederherstellen von der letzte known-good Sicherung (`sqlite3 .backup` chain,
   siehe `DR-BACKUP.md`); bring Service zurück hinter Überwachung.
5. **Post-mortem** — blameless write-up innerhalb 5 Geschäft Tage; der **manipulationserkennbar
   Audit Protokoll** (`/audit/export`) ist der authoritative forensic source — es kann nicht
   sein erased (operator/system Betroffene sind protected).

## 4. Verstoß Benachrichtigung (GDPR Art. 33/34)

- Assess whether ein **personal-Daten Verstoß** occurred innerhalb **24h** von Erkennung.
- Notify der competent **Aufsichtsbehörde innerhalb 72h** wenn erforderlich.
- Notify **affected Daten Betroffene** ohne undue delay wenn hoch Risiko zu sie.
- Der Verantwortlicher (Kunde operating Instanz) besitzt Benachrichtigung; der
  Auftragsverarbeiter (Aegis) assists pro der DPA.

## 5. Comms

- Intern: Vorfall Kanal + IC aktualisiert jeder 4h während Sev1/2.
- Extern: über DPO; niemals disclose forensic Detail publicly.

## 6. Drills

- Quarterly tabletop; jährlich live wiederherstellen drill (siehe `DR-BACKUP.md`).
- Test der throttle/alarm Pfad durch absichtlich tripping `auth_login_throttled`.
