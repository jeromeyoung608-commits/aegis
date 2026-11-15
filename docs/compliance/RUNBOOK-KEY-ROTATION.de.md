<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/RUNBOOK-KEY-ROTATION.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Schlüssel Rotation runbook

Aegis verwendet drei unabhängig Geheimnis classes. Rotieren jeder auf ein Zeitplan (e.g. 90–365
Tage) und nach irgendein suspected Kompromittierung.

## 1. Aussteller Geheimnis (`AEGIS_ISSUER_SECRET`)
Kontrollen `/session` Token minting (LAN Signalisierung) und einige Bediener endpoints.
- **Rotieren:** Set ein neu Wert in Bereitstellung secret/env und restart.
- **Effect:** alle previously minted LAN Signalisierung Token become invalid → re-mint auf
  Workbench. Bediener Konsole Sitzungen (SQLite-stored) sind unaffected.
- **Prüfen:** `curl -fsS "http://host/session?room=x"` mit der alt Geheimnis → 401.

## 2. Bediener Zugangsdaten (`npm run setup` Konten)
Lokal Konten sind versiegelt (AES-256-GCM, Schlüssel = `AEGIS_MFA_KEY` oder Aussteller Geheimnis).
- **Rotieren password:** re-run `npm run setup` für Konto, oder Änderung über der
  Konto Speicher.
- **Rotieren MFA:** Bediener re-enrolls TOTP in Konsole (`/auth/mfa/enroll`); alt
  factor + Wiederherstellung codes sind cleared und 10 neu Wiederherstellung codes sind ausgestellt. Ein
  Bediener kann force-reset eine weitere Bediener's MFA von Konsole (Konfiguration → Admin
  reset MFA).
- **MFA Schlüssel (`AEGIS_MFA_KEY`):** rotating es invalidates Alle enrolled TOTP seeds
  (sie sind versiegelt mit es). Communicate ein reset Fenster.

## 3. TLS privat Schlüssel
Nur verwendet wenn `AEGIS_TLS_DIR` (`~/.aegis/tls`) enthält `key.pem`/`cert.pem`.
- **Rotieren:** ersetzt PEMs und restart. Für offentlich TLS, prefer terminating bei ein
  umkehren Proxy (deploy/reverse-proxy) und rotating dort — App dann läuft Klartext
  HTTP hinter es.

## 4. SCIM Bereitstellung Token
`modules/scim` Probleme Token mit `/Token/{rotate,revoke}`. Rotieren über Konsole
oder API; revoke sofort auf offboarding/compromise (revoked Token kann nicht authenticate,
aber Verlauf ist beibehalten für Audit-Trail).

## Cadence & Beweis
- Zeitplan rotations; Datensatz jeder in Audit Protokoll (Produkt audits config/secret
  Änderungen as `config.updated`, `auth_mfa_*`, `session.revoke`).
- Niemals bake Geheimnisse in Bild — push zu Ihr eigen Registry und inject bei Laufzeit
  (docs/compliance/ACR-PRIVATE-REGISTRY.md). Ein ausgeliefert geteilt Geheimnis ist der B-03 Klasse
  von Fehler dies runbook existiert zu prevent.
