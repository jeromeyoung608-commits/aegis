<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DPA.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Daten Verarbeitung Vereinbarung (DPA)

**Status:** Ausgestellt für Signatur · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Framework:** EU GDPR Article 28(3) / UK GDPR

Dies DPA ist entered in zwischen der **Verantwortlicher** (Kunde operating ein
Aegis Instanz) und der **Auftragsverarbeiter** (Aegis Software / vendor) und governs
Verarbeitung durchgeführt wenn Kunde verwendet Aegis zu Prozess persönlich Daten.

---

## 1. Subject matter & duration

Der subject matter ist der provision von Aegis lokal Daten-cleansing Service.
Verarbeitung autritt für der duration von Mandat und für irgendein Aufbewahrung Zeitraum
erforderlich durch Verantwortlicher oder Gesetz.

## 2. Nature, Zweck & types von Verarbeitung

- **Nature/purpose:** lokal Bereinigung, Hash-Bildung, Signatur, vaulting und Audit von
  Kunde-supplied documents/media.
- **Types von persönlich Daten:** Dokument contents, abgeleitet hashes/manifests,
  Bediener Konto Daten, und Audit Metadaten.
- **Kategorien von Daten Betroffene:** Verantwortlicher's staff (Bediener), und irgendein
  individuals appearing in Kunde-supplied Dokumente.
- **Special-category Daten:** keiner verarbeitet durch Software durch Entwurf; der
  Verantwortlicher ist verantwortlich für irgendein special-category Daten es chooses zu Upload.

## 3. Verantwortlicher Pflichten

Determine der purposes und means von Verarbeitung; ensure ein lawful Basis; provide
nur Daten lawfully obtained; configure optional Integrationen (e.g. TSA) in Zeile
mit Übertragung requirements.

## 4. Auftragsverarbeiter Pflichten

1. **Confidentiality** — Zugriff begrenzt zu jene mit ein brauchen zu know.
2. **Sicherheit** — implement appropriate technical/organisational misst
   (Verschlüsselung bei Rest, Hash-verkettet Audit, credential Hash-Bildung, Anmeldung throttling,
   kein Standard Ausgang).
3. **Sub-processing** — Software hat **kein verpflichtend sub-processors**; irgendein
   optional extern TSA ist Kunde-configured und Kunde-controlled.
4. **Audit** — Auftragsverarbeiter maintains ein manipulationserkennbar, Hash-verkettet Audit Protokoll der
   Verantwortlicher kann Export für Prüfung (`/audit/export`).
5. **Verstoß Benachrichtigung (Art. 33/34)** — Auftragsverarbeiter shall notify der
   Verantwortlicher **ohne delay und in irgendein Ereignis innerhalb 24 hours** von becoming aware
   von ein personal-Daten Verstoß, ermöglicht Verantwortlicher zu meet seiner eigen 72-Stunde
   supervisory-authority Benachrichtigung duty unter GDPR Art. 33.
6. **Deletion / zurückgeben** — auf Beendigung, Verantwortlicher's Daten resides in seiner
   eigen Laufzeit Lautstärke und ist entfernt pro Verantwortlicher's Aufbewahrung Richtlinie; der
   Auftragsverarbeiter's immutability control gilt nur zu Sicherheit Audit-Trail.
7. **Assistance** — Auftragsverarbeiter assists Verantwortlicher mit Daten-subject
   Anfragen und Article 32–36 Pflichten zu Umfang technically feasible.

## 5. International Übertragungen

Kein Übertragungen occur durch Standard. Wo Verantwortlicher ermöglicht ein optional TSA, der
Verantwortlicher ist verantwortlich für ein lawful Übertragung Mechanismus (e.g. SCCs) für irgendein
Hash transmitted.

## 6. Datensätze & Beweis

Der Service bietet `GET /audit` und `GET /audit/export` für Verantwortlicher's
Datensätze, und ein `GET /healthz` Sonde für Verfügbarkeit Überwachung.

## 7. Bestimmend Gesetz

As agreed in der principal commercial Vereinbarung; dies Vorlage references der GDPR
as Baseline.

---

## Anhang 1 — Technical & Organisational Misst (Art. 32)

| Measure | Implementierung Beweis (Aegis source) |
|---------|------------------------------------------|
| Verschlüsselung bei Rest | encrypted-archive Tresor (AES-GCM); TLS Schlüssel Material in `~/.aegis/tls` |
| Credential Hash-Bildung | `server/store.js` — `crypto.scrypt` Schlüssel derivation (per-salt, N=16384) |
| Zugriff control | bearer-Token Bediener auth mit TTL; operator/admin Umfang separation |
| Anmeldung throttling | `server.js` — pro IP und pro IP:username fixed-window Rate Grenzen + pro IP enumeration Wächter |
| Audit Integrität | Hash-verkettet, manipulationserkennbar `audit_events`; Export über `/audit/export` |
| Netzwerk minimisation | null Standard Ausgang; geprüft durch `npm run verify:zero-deps` |
| Schlüssel management | Aussteller Geheimnis prägt Sitzung Token; rotated durch Verantwortlicher |

## Anhang 2 — Sub-processors (Art. 28(2))

Keiner verpflichtend. Der nur optional extern Integration ist ein Kunde-configured
RFC3161 TSA (sendet ein **Hash nur**); Kunde ist Verantwortlicher von das
Übertragung und verantwortlich für Übertragung Mechanismus (e.g. SCCs).

## Anhang 3 — Personal-Daten Verstoß Verfahren (Art. 33/34)

1. Erkennen & enthalten (rotieren Aussteller Geheimnis; isolate Instanz).
2. Notify Verantwortlicher **innerhalb 24 hours**.
3. Assist Verantwortlicher's 72-Stunde supervisory-authority Benachrichtigung.
4. Post-incident Prüfung; der manipulationserkennbar Audit Protokoll ist der forensic source.

## Anhang 4 — Deletion & zurückgeben (Art. 28(3)(g))

Auf Beendigung, Verantwortlicher's Daten resides in seiner eigen Laufzeit Lautstärke und ist
entfernt pro Verantwortlicher's Aufbewahrung Richtlinie. Der Auftragsverarbeiter's manipulationserkennbar
Audit-Trail ist beibehalten für Rechenschaftspflicht und ist nicht deleted.

## Signatur

| Verantwortlicher | Auftragsverarbeiter (Aegis) |
|-----------|-------------------|
| Name / entity: {{CONTROLLER_Rechtlich_Name}} | Name / entity: Aegis (Jerome Young) |
| Authorised signatory: ______ | Authorised signatory: ______ |
| Datum: ______________________ | Datum: ______________________ |

> Hinweis: bestimmend Gesetz: {{Bestimmend_Gesetz}}; Rechtsberatung bestätigen vor Signatur.
