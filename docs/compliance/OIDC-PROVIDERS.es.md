<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/OIDC-PROVIDERS.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# OIDC Proveedor configuración (real IdP)

Aegis soporta OIDC (auth-code flujo, RS256 `id_token` verificación vía `node:crypto`)
detrás `AEGIS_AUTH_MODE=oidc`. El mock flujo es cubierto por `modules/oidc/tests/oidc.test.mjs`
(6/6). Este nota muestra cómo a punto esto en un real IdP. El producto nunca fakes un IdP —
el Cliente's tenant es obligatorio.

## Obligatorio entorno

```
AEGIS_AUTH_MODE=oidc
AEGIS_OIDC_ISSUER=https://<your-idp>/.well-known/openid-configuration   # or the issuer base
AEGIS_OIDC_CLIENT_ID=<client-id>
AEGIS_OIDC_CLIENT_SECRET=<client-secret>        # confidential client
AEGIS_OIDC_REDIRECT_URI=https://<your-tenant-host>/auth/oidc/callback
AEGIS_OIDC_DEFAULT_ROLE=operator                # role granted to new IdP users
```

`server.js` discovers `.well-known/openid-configuration` (o `o.issuer`), entonces
`token_endpoint` + `jwks_uri`, exchanges el código, y verifica el `id_token`:
emisor, audience (`client_id`), caducidad, `nonce`, y el RS256 firma contra el
JWKS. `HS256` y cualquiera tampered/timed-out token son rechazado.

## Entra ID (Azure AD / Microsoft Entra)

1. Aplicación registrations → Nuevo registration. Redirect URI (Web): `AEGIS_OIDC_REDIRECT_URI`.
2. Certificates & secretos → Nuevo cliente secreto → copia en `AEGIS_OIDC_CLIENT_SECRET`.
3. `AEGIS_OIDC_ISSUANCE`/`ISSUER` = `https://login.microsoftonline.com/<tenant>/v2.0`.
4. token → ID token (implicit concesión apagado; nosotros usar auth-code + PKCE-free confidential).
5. Manifest: `accessTokenAcceptedVersion` 2; `signInAudience` single/multi-tenant as necesario.
6. Bajo Expose un API, el `client_id` es el audience (`aud`) Aegis verifica.

## Okta

1. Applications → Crear Aplicación Integración → OIDC → Web.
2. Sign-in redirect URI: `AEGIS_OIDC_REDIRECT_URI`; Concesión type: Authorization Código.
3. `AEGIS_OIDC_ISSUER` = `https://<subdomain>.okta.com/oauth2/default` (o el
   authorization-servidor emisor). `AEGIS_OIDC_CLIENT_ID`/`SECRET` de el aplicación.
4. Assign users/groups; Aegis crea un local operador sesión en primero inicio de sesión.

## Keycloak

1. Realm → Clientes → Crear → Cliente type OpenID Connect, cliente auth En.
2. Válido redirect URIs: `AEGIS_OIDC_REDIRECT_URI`.
3. `AEGIS_OIDC_ISSUER` = `https://keycloak.example/realms/<realm>`.
4. Credenciales → Cliente secreto → `AEGIS_OIDC_CLIENT_SECRET`.

## SCIM 2.0 aprovisionamiento / desaprovisionamiento

`modules/scim/` implementa CRUD + `active:false` desaprovisionamiento (conserva el auditoríun
trail; nunca erases esto), password-login desactivar, por IP velocidad límite, y
`Token/{rotate,revoke}`. Probado 5/5 (`modules/scim/tests/scim.test.mjs`). Connector
guides para Entra/Okta son en `docs/compliance/SCIM-CONNECTORS.md`.

## Notas

- El username es taken de el `email` afirmación, falling atrás a `sub`. Ensure el IdP
  releases `email` (o mapa un afirmación).
- operador MFA (`server/totp.js`) es independiente de IdP MFA; enforce MFA en el IdP o
  enable Aegis TOTP (`AEGIS_MFA_KEY` + operador enroll vía el consola).
- Rotar `AEGIS_OIDC_CLIENT_SECRET` como cualquiera otros secreto — esto es nunca baked en el
  imagen (véase `ACR-PRIVATE-REGISTRY.md`).
