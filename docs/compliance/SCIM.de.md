<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCIM.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# SCIM 2.0 Bereitstellung Integration

**Status:** Implementiert · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine

## 1. Zweck

Unternehmen Kunden manage Bediener identities in ein IdP (Okta, Azure AD/Entra,
OneLogin, …) und expect **automatisiert provisioning/deprovisioning** von Aegis
Bediener Konten über **SCIM 2.0**. Dies Dokument beschreibt der ausgeliefert Vertrag.

## 2. Aktuell Zustand

- Aegis operator/issuer Konten live in der lokal SQLite Speicher
  (`accounts`, roles `operator`/`admin`, mit ein `enabled` Schalter für Deprovisionierung).
- OIDC SSO ist implementiert (`/auth/oidc/*`, Opt-in über `AEGIS_AUTH_MODE=oidc`).
- SCIM 2.0 Bereitstellung ist **implementiert** (`/scim/v2/Users`, guarded durch
  `AEGIS_SCIM_TOKEN`); siehe Abschnitt 3 für Vertrag.

## 3. SCIM Endpunkt Vertrag (implementiert)

| Vorgang | SCIM Pfad | Aegis action |
|-----------|-----------|--------------|
| Liste | `GET /scim/v2/Users` | paginated `ListResponse` von alle Bediener Konten |
| Erstellen | `POST /scim/v2/Users` | erstellen Bediener Konto (Rolle von `roles`, Standard `operator`) |
| Lesen | `GET /scim/v2/Users/{id}` | einzeln Konto resource |
| Aktualisierung | `PATCH /scim/v2/Users/{id}` | `op:replace`/`add` auf `active` toggles Anmeldung; `roles` aktualisiert Rolle |
| Deactivate | `PATCH /scim/v2/Users/{id}` (`active:false`) | `enabled=0` → Anmeldung gibt zurück 401 sofort |
| Löschen | `DELETE /scim/v2/Users/{id}` | **deaktivieren, do nicht purge** Bediener Audit |
| Liste | `GET /scim/v2/Users` | paginated Liste |

## 4. Authentication & Sicherheit

- SCIM bearer Token (`Authorization: Bearer <SCIM_TOKEN>`), distinct von der
  operator/issuer Geheimnis.
- Token konfiguriert über `AEGIS_SCIM_TOKEN`; Endpunkt gibt zurück **503** (nicht
  konfiguriert) bis Token ist Set.
- Alle SCIM mutations sind aufgezeichnet in der manipulationserkennbar Audit-Trail.
- SCIM Deprovisionierung Muss preserve Bediener's **manipulationserkennbar Audit-Trail**
  (konsistent mit `eraseSubject` refusing protected Betroffene).

## 5. Attribut mapping

| SCIM | Aegis | Notizen |
|------|-------|-------|
| `userName` | Konto username | |
| `active` | `enabled` | `false` disables Anmeldung (immediate 401) |
| `roles` | `operator` / `admin` | Standard `operator` |
| `id` | Konto username | returned auf read/create |

## 6. Deprovisionierung & der manipulationserkennbar Audit

Wenn ein Bediener lässt, SCIM deactivates Konto (`PATCH active:false` oder
`DELETE`). Der Bediener's Audit Ereignisse bleiben (forensic Integrität) und GDPR
Löschung gilt nur zu **Daten Betroffene**, nicht Bediener's Rechenschaftspflicht Protokoll.

## 7. SSO (OIDC)

Der implementiert OIDC Ablauf (`/auth/oidc/start` → IdP → `/auth/oidc/callback`)
unterstützt authorization-code + RS256 id_token Prüfung über `node:crypto`,
mit `state`/`nonce` replay protection und JIT Konto creation von der
`email`/`sub` Behauptung. SCIM complements es durch automating Konto lifecycle; der two
sind unabhängig und kann sein aktiviert separately.

## 8. Rollout Checkliste

1. Set `AEGIS_SCIM_TOKEN` (ein long Zufall Geheimnis) auf Aegis Server.
2. Configure IdP SCIM App → Aegis Basis URL (`https://host/scim/v2`).
3. Karte `roles` → Aegis Rolle (Standard `operator`).
4. Test erstellen / deaktivieren / löschen gegen ein non-admin Konto.
5. Bestätigen ein deprovisioned Bediener kann kein länger Protokoll in aber ihrer Audit überlebt.
