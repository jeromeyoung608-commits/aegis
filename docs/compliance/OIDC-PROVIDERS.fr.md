<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/OIDC-PROVIDERS.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# OIDC Prestataire configuration (rél IdP)

Aegis prend en charge OIDC (auth-code flux, RS256 `id_token` vérification via `node:crypto`)
derrière `AEGIS_AUTH_MODE=oidc`. Le mock flux est couvert par `modules/oidc/tests/oidc.test.mjs`
(6/6). Ce note affiche comment à point il à un rél IdP. Le produit jamais fakes un IdP —
le Client's tenant est requis.

## Requis environnement

```
AEGIS_AUTH_MODE=oidc
AEGIS_OIDC_ISSUER=https://<your-idp>/.well-known/openid-configuration   # or the issuer base
AEGIS_OIDC_CLIENT_ID=<client-id>
AEGIS_OIDC_CLIENT_SECRET=<client-secret>        # confidential client
AEGIS_OIDC_REDIRECT_URI=https://<your-tenant-host>/auth/oidc/callback
AEGIS_OIDC_DEFAULT_ROLE=operator                # role granted to new IdP users
```

`server.js` discovers `.well-known/openid-configuration` (ou `o.issuer`), alors
`token_endpoint` + `jwks_uri`, exchanges le code, et vérifie le `id_token`:
émetteur, audience (`client_id`), expiration, `nonce`, et le RS256 signature contre le
JWKS. `HS256` et aucun tampered/timed-out jeton sont rejeté.

## Entra ID (Azure AD / Microsoft Entra)

1. Application registrations → Nouveau registration. Redirect URI (Web): `AEGIS_OIDC_REDIRECT_URI`.
2. Certificates & secrets → Nouveau client secret → copie dans `AEGIS_OIDC_CLIENT_SECRET`.
3. `AEGIS_OIDC_ISSUANCE`/`ISSUER` = `https://login.microsoftonline.com/<tenant>/v2.0`.
4. jeton → ID jeton (implicit octroi désactivé; nous utiliser auth-code + PKCE-free confidential).
5. Manifest: `accessTokenAcceptedVersion` 2; `signInAudience` single/multi-tenant as nécessaire.
6. Sous Expose un API, le `client_id` est le audience (`aud`) Aegis vérifie.

## Okta

1. Applications → Créer Application Intégration → OIDC → Web.
2. Sign-in redirect URI: `AEGIS_OIDC_REDIRECT_URI`; Octroi type: Authorization Code.
3. `AEGIS_OIDC_ISSUER` = `https://<subdomain>.okta.com/oauth2/default` (ou le
   authorization-serveur émetteur). `AEGIS_OIDC_CLIENT_ID`/`SECRET` de le application.
4. Assign users/groups; Aegis crée un local opérateur session sur premier connexion.

## Keycloak

1. Realm → Clients → Créer → Client type OpenID Connect, client auth Sur.
2. Valide redirect URIs: `AEGIS_OIDC_REDIRECT_URI`.
3. `AEGIS_OIDC_ISSUER` = `https://keycloak.example/realms/<realm>`.
4. Identifiants → Client secret → `AEGIS_OIDC_CLIENT_SECRET`.

## SCIM 2.0 approvisionnement / déprovisionnement

`modules/scim/` implémente CRUD + `active:false` déprovisionnement (conserve le audit
trail; jamais erases il), password-login désactiver, par IP débit limite, et
`Token/{rotate,revoke}`. Testé 5/5 (`modules/scim/tests/scim.test.mjs`). Connector
guides pour Entra/Okta sont dans `docs/compliance/SCIM-CONNECTORS.md`.

## Notes

- Le username est taken de le `email` allégation, falling retour à `sub`. Ensure le IdP
  releases `email` (ou carte un allégation).
- opérateur MFA (`server/totp.js`) est indépendant de IdP MFA; enforce MFA à le IdP ou
  enable Aegis TOTP (`AEGIS_MFA_KEY` + opérateur enroll via le console).
- Faire tourner `AEGIS_OIDC_CLIENT_SECRET` comme aucun autres secret — il est jamais baked dans le
  image (voir `ACR-PRIVATE-REGISTRY.md`).
