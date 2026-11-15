<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ACCESS-REVIEW.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Zugriff Prüfung & Konto Lifecycle

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine

Deckt ab operator/issuer Zugriff zu ein Aegis Instanz und der periodic Prüfung
erforderlich durch SOC 2 CC1.2 / CC6.1–6.3 und ISO 27001 Ein.9.

---

## 1. Konto types

| Konto | Zweck | Bereitstellung |
|---------|---------|--------------|
| `operator` | day-to-day Betrieb (Bereinigung, Signatur, Tresor, Audit Export) | lokal `accounts` Tabelle; oder SCIM/OIDC (siehe `SCIM.md`) |
| `admin` | gleich as Bediener + revocation/escrow Admin | lokal `accounts` Tabelle |
| Aussteller Geheimnis (`AEGIS_ISSUER_SECRET`) | prägt Sitzung Token (LAN Clients) | Umgebung Geheimnis, **nicht** ein Anmeldung Konto |

Dort ist **kein multi-tenant** Modell; jeder Instanz hat seiner eigen Bediener Set.

## 2. Joiner / Mover / Leaver (JML)

- **Joiner:** erstellen Konto mit mindestens privilege (`operator` sofern Admin benötigt);
  Problem Zugangsdaten über ein secured Kanal; Datensatz Eigentümer + approver.
- **Mover:** re-scope roles nur nach Genehmigung; niemals accumulate privileges.
- **Leaver:** deaktivieren Konto sofort; Bediener's **Audit-Trail bleibt
  unversehrt** (es ist protected und nicht erasable — siehe `server/store.js` `eraseSubject`);
  GDPR Löschung gilt zu *Daten Betroffene*, nicht Bediener Rechenschaftspflicht Protokoll.

## 3. Periodic recertification

- **Quarterly** Prüfung von alle operator/admin Konten: bestätigen jeder ist noch
  erforderlich, Rolle appropriate, und Eigentümer bekannt.
- Entfernen oder deaktivieren veraltet Konten; Dokument Prüfung (who/when/result).
- **Aussteller Geheimnis Rotation** bei mindestens **annually** oder auf suspicion von exposure;
  rotating invalidates alle ausgestellt Sitzung Token (TTL-bounded anyway).

## 4. Prüfung Checkliste

- [ ] Konto Liste passt approved roster (kein orphaned Konten).
- [ ] Kein Konto enthält `admin` ohne ein aufgezeichnet Geschäft brauchen.
- [ ] Aussteller Geheimnis rotated innerhalb Richtlinie Fenster.
- [ ] Kein shared/generic Bediener Konten.
- [ ] Failed-login throttle aktiv (`auth_login_throttled` Ereignisse vorhanden unter Last).
- [ ] Audit Export reviewed für anomalous privileged Aktionen.

## 5. Mindestens privilege & separation

Bediener Aktionen sind scope-gated (e.g. revocation/escrow require Admin). Der
manipulationserkennbar, nur-appendierbar Audit Protokoll bietet der detective control; Prüfung bietet der
preventive/periodic control.
