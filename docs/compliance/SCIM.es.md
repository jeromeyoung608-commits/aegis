<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCIM.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# SCIM 2.0 Aprovisionamiento Integración

**Estado:** Implementado · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor

## 1. Finalidad

Empresa clientes manage operador identities en un IdP (Okta, Azure AD/Entra,
OneLogin, …) y expect **automatizado provisioning/deprovisioning** de Aegis
operador cuentas vía **SCIM 2.0**. Este documento describe el entregado contrato.

## 2. Actual estado

- Aegis operator/issuer cuentas en vivo en el local SQLite almacén
  (`accounts`, roles `operator`/`admin`, con un `enabled` indicador para desaprovisionamiento).
- OIDC SSO es implementado (`/auth/oidc/*`, opt-in vía `AEGIS_AUTH_MODE=oidc`).
- SCIM 2.0 aprovisionamiento es **implementado** (`/scim/v2/Users`, guarded por
  `AEGIS_SCIM_TOKEN`); véase sección 3 para el contrato.

## 3. SCIM endpoint contrato (implementado)

| Operación | SCIM ruta | Aegis action |
|-----------|-----------|--------------|
| Lista | `GET /scim/v2/Users` | paginated `ListResponse` de todos operador cuentas |
| Crear | `POST /scim/v2/Users` | crear operador cuenta (rol de `roles`, predeterminado `operator`) |
| Leer | `GET /scim/v2/Users/{id}` | único cuenta resource |
| Actualización | `PATCH /scim/v2/Users/{id}` | `op:replace`/`add` en `active` toggles inicio de sesión; `roles` actualiza rol |
| Deactivate | `PATCH /scim/v2/Users/{id}` (`active:false`) | `enabled=0` → inicio de sesión retorna 401 de inmediato |
| Borrar | `DELETE /scim/v2/Users/{id}` | **desactivar, do no purge** operador auditoríun |
| Lista | `GET /scim/v2/Users` | paginated lista |

## 4. Authentication & seguridad

- SCIM bearer token (`Authorization: Bearer <SCIM_TOKEN>`), distinct de el
  operator/issuer secreto.
- token configurado vía `AEGIS_SCIM_TOKEN`; el endpoint retorna **503** (no
  configurado) hasta el token es conjunto.
- Todos SCIM mutations son registrado en el resistente a la manipulación rastro de auditoríun.
- SCIM desaprovisionamiento Debe preserve el operador's **resistente a la manipulación rastro de auditoríun**
  (coherente con `eraseSubject` refusing protected interesados).

## 5. Atributo mapping

| SCIM | Aegis | Notas |
|------|-------|-------|
| `userName` | cuenta username | |
| `active` | `enabled` | `false` disables inicio de sesión (immediate 401) |
| `roles` | `operator` / `admin` | predeterminado `operator` |
| `id` | cuenta username | returned en read/create |

## 6. Desaprovisionamiento & el resistente a la manipulación auditoríun

Cuando un operador deja, SCIM deactivates el cuenta (`PATCH active:false` o
`DELETE`). El operador's auditoríun eventos permanecer (forensic integridad) y GDPR
borrado se aplica solo a **datos interesados**, no el operador's responsabilidad registro.

## 7. SSO (OIDC)

El implementado OIDC flujo (`/auth/oidc/start` → IdP → `/auth/oidc/callback`)
soporta authorization-code + RS256 id_token verificación vía `node:crypto`,
con `state`/`nonce` replay protection y JIT cuenta creation de el
`email`/`sub` afirmación. SCIM complements esto por automating cuenta lifecycle; el two
son independiente y puede ser activado separately.

## 8. Rollout lista de verificación

1. Conjunto `AEGIS_SCIM_TOKEN` (un long aleatorio secreto) en el Aegis servidor.
2. Configure el IdP SCIM aplicación → Aegis base URL (`https://host/scim/v2`).
3. Mapa `roles` → Aegis rol (predeterminado `operator`).
4. Prueba crear / desactivar / borrar contra un non-admin cuenta.
5. Confirmar un deprovisioned operador puede ningún más largo registro en pero su auditoríun sobrevive.
