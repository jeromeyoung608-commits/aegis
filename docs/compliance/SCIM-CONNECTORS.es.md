<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCIM-CONNECTORS.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# SCIM 2.0 connectors (aprovisionamiento)

`modules/scim` implementa SCIM 2.0: Usuario CRUD, `active:false` desaprovisionamiento (conserva
el rastro de auditoríun; nunca erases esto), password-login desactivar, por IP velocidad límite, y
`Token/{rotate,revoke}`. Probado 5/5 (`modules/scim/tests/scim.test.mjs`).

## Entra ID
1. Empresa applications → Aprovisionamiento → Automatic.
2. Tenant URL: `https://<your-tenant-host>/scim/v2`; secreto token: el Aegis SCIM token
   (`Token/rotate`).
3. Atributo mappings: `externalId`/`userName` → operador username; `active` impulsa
   desaprovisionamiento. En desactivar, Aegis conjuntos el cuenta `enabled=0` y conserva historial.

## Okta
1. Applications → Aplicación Integración → SCIM 2.0.
2. SCIM base URL + bearer token (Aegis SCIM token).
3. Aprovisionamiento funcionalidades: Crear Users, Actualización Usuario Attributes, Deactivate Users.

## Notas
- SCIM desaprovisionamiento es **deactivation**, no deletion — responsabilidad es conservado
  (B-04). A completamente eliminar un operador, revoke su SCIM token y el cuenta permanece
  desactivado.
- El SCIM token es un separado secreto de el emisor secreto; rotar esto independently.
- SCIM hace no concesión operador consola acceso por él mismo — esto provisions cuentas; MFA
  y rol assignment follow el local/OIDC modelo.
