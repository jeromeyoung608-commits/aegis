<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/OIDC-PROVIDERS.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# OIDC Anbieter Konfiguration (echt IdP)

Aegis unterstützt OIDC (auth-code Ablauf, RS256 `id_token` Prüfung über `node:crypto`)
hinter `AEGIS_AUTH_MODE=oidc`. Der mock Ablauf ist abgedeckt durch `modules/oidc/tests/oidc.test.mjs`
(6/6). Dies Hinweis zeigt wie zu Punkt es bei ein echt IdP. Der Produkt niemals fakes ein IdP —
Kunde's tenant ist erforderlich.

## Erforderlich Umgebung

```
AEGIS_AUTH_MODE=oidc
AEGIS_OIDC_ISSUER=https://<your-idp>/.well-known/openid-configuration   # or the issuer base
AEGIS_OIDC_CLIENT_ID=<client-id>
AEGIS_OIDC_CLIENT_SECRET=<client-secret>        # confidential client
AEGIS_OIDC_REDIRECT_URI=https://<your-tenant-host>/auth/oidc/callback
AEGIS_OIDC_DEFAULT_ROLE=operator                # role granted to new IdP users
```

`server.js` discovers `.well-known/openid-configuration` (oder `o.issuer`), dann
`token_endpoint` + `jwks_uri`, exchanges Code, und prüft der `id_token`:
Aussteller, audience (`client_id`), Ablauf, `nonce`, und RS256 Signatur gegen der
JWKS. `HS256` und irgendein tampered/timed-out Token sind abgelehnt.

## Entra ID (Azure AD / Microsoft Entra)

1. App registrations → Neu registration. Redirect URI (Web): `AEGIS_OIDC_REDIRECT_URI`.
2. Certificates & Geheimnisse → Neu Client Geheimnis → Kopie in `AEGIS_OIDC_CLIENT_SECRET`.
3. `AEGIS_OIDC_ISSUANCE`/`ISSUER` = `https://login.microsoftonline.com/<tenant>/v2.0`.
4. Token → ID Token (implicit Gewährung aus; wir verwenden auth-code + PKCE-free confidential).
5. Manifest: `accessTokenAcceptedVersion` 2; `signInAudience` single/multi-tenant as benötigt.
6. Unter Expose ein API, der `client_id` ist der audience (`aud`) Aegis prüft.

## Okta

1. Applications → Erstellen App Integration → OIDC → Web.
2. Sign-in redirect URI: `AEGIS_OIDC_REDIRECT_URI`; Gewährung type: Authorization Code.
3. `AEGIS_OIDC_ISSUER` = `https://<subdomain>.okta.com/oauth2/default` (oder der
   authorization-Server Aussteller). `AEGIS_OIDC_CLIENT_ID`/`SECRET` von App.
4. Assign users/groups; Aegis erstellt ein lokal Bediener Sitzung auf erste Anmeldung.

## Keycloak

1. Realm → Clients → Erstellen → Client type OpenID Connect, Client auth Auf.
2. Gültig redirect URIs: `AEGIS_OIDC_REDIRECT_URI`.
3. `AEGIS_OIDC_ISSUER` = `https://keycloak.example/realms/<realm>`.
4. Zugangsdaten → Client Geheimnis → `AEGIS_OIDC_CLIENT_SECRET`.

## SCIM 2.0 Bereitstellung / Deprovisionierung

`modules/scim/` implementiert CRUD + `active:false` Deprovisionierung (behält Audit
trail; niemals erases es), password-login deaktivieren, pro IP Rate Grenze, und
`Token/{rotate,revoke}`. Getestet 5/5 (`modules/scim/tests/scim.test.mjs`). Connector
guides für Entra/Okta sind in `docs/compliance/SCIM-CONNECTORS.md`.

## Notizen

- Der username ist taken von der `email` Behauptung, falling zurück zu `sub`. Ensure IdP
  releases `email` (oder Karte ein Behauptung).
- Bediener MFA (`server/totp.js`) ist unabhängig von IdP MFA; enforce MFA bei IdP oder
  enable Aegis TOTP (`AEGIS_MFA_KEY` + Bediener enroll über Konsole).
- Rotieren `AEGIS_OIDC_CLIENT_SECRET` wie irgendein andere Geheimnis — es ist niemals baked in der
  Bild (siehe `ACR-PRIVATE-REGISTRY.md`).
