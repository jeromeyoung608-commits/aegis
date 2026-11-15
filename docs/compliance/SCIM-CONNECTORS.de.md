<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCIM-CONNECTORS.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# SCIM 2.0 connectors (Bereitstellung)

`modules/scim` implementiert SCIM 2.0: Benutzer CRUD, `active:false` Deprovisionierung (behält
Audit-Trail; niemals erases es), password-login deaktivieren, pro IP Rate Grenze, und
`Token/{rotate,revoke}`. Getestet 5/5 (`modules/scim/tests/scim.test.mjs`).

## Entra ID
1. Unternehmen applications → Bereitstellung → Automatic.
2. Tenant URL: `https://<your-tenant-host>/scim/v2`; Geheimnis Token: Aegis SCIM Token
   (`Token/rotate`).
3. Attribut mappings: `externalId`/`userName` → Bediener username; `active` steuert
   Deprovisionierung. Auf deaktivieren, Aegis Mengen Konto `enabled=0` und behält Verlauf.

## Okta
1. Applications → App Integration → SCIM 2.0.
2. SCIM Basis URL + bearer Token (Aegis SCIM Token).
3. Bereitstellung Funktionen: Erstellen Users, Aktualisierung Benutzer Attributes, Deactivate Users.

## Notizen
- SCIM Deprovisionierung ist **deactivation**, nicht deletion — Rechenschaftspflicht ist beibehalten
  (B-04). Zu vollständig entfernen ein Bediener, revoke ihrer SCIM Token und Konto bleibt
  deaktiviert.
- Der SCIM Token ist ein separat Geheimnis von Aussteller Geheimnis; rotieren es independently.
- SCIM macht nicht Gewährung Bediener Konsole Zugriff durch selbst — es provisions Konten; MFA
  und Rolle assignment follow der local/OIDC Modell.
