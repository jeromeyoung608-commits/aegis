<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/RUNBOOK-KEY-ROTATION.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# clave rotación runbook

Aegis usa tres independiente secreto classes. Rotar cada en un horario (e.g. 90–365
días) y después cualquiera suspected compromiso.

## 1. Emisor secreto (`AEGIS_ISSUER_SECRET`)
Controles `/session` token minting (LAN señalización) y algunos operador endpoints.
- **Rotar:** conjunto un nuevo valor en el despliegue secret/env y restart.
- **Effect:** todos previously minted LAN señalización tokens become invalid → re-mint en
  el banco de trabajo. operador consola sesiones (SQLite-stored) son unaffected.
- **Verificar:** `curl -fsS "http://host/session?room=x"` con el antiguo secreto → 401.

## 2. operador credenciales (`npm run setup` cuentas)
Local cuentas son sellado (AES-256-GCM, clave = `AEGIS_MFA_KEY` o emisor secreto).
- **Rotar password:** re-run `npm run setup` para que cuenta, o cambio vía el
  cuenta almacén.
- **Rotar MFA:** operador re-enrolls TOTP en el consola (`/auth/mfa/enroll`); antiguo
  factor + recuperación codes son cleared y 10 nuevo recuperación codes son emitido. Un
  operador puede force-reset otro operador's MFA de el consola (Configuración → Admin
  reset MFA).
- **MFA clave (`AEGIS_MFA_KEY`):** rotating esto invalidates Todos enrolled TOTP seeds
  (ellos son sellado con esto). Communicate un reset ventana.

## 3. TLS privado clave
Solo usado si `AEGIS_TLS_DIR` (`~/.aegis/tls`) contiene `key.pem`/`cert.pem`.
- **Rotar:** reemplaza el PEMs y restart. Para público TLS, prefer terminating en un
  invertir proxy (deploy/reverse-proxy) y rotating allí — el aplicación entonces se ejecuta plano
  HTTP detrás esto.

## 4. SCIM aprovisionamiento token
`modules/scim` problemas tokens con `/Token/{rotate,revoke}`. Rotar vía el consola
o API; revoke de inmediato en offboarding/compromise (revoked tokens no puede authenticate,
pero historial es conservado para el rastro de auditoríun).

## Cadence & evidencia
- Horario rotations; registro cada en el auditoríun registro (el producto audits config/secret
  cambios as `config.updated`, `auth_mfa_*`, `session.revoke`).
- Nunca bake secretos en el imagen — push a su propio registry y inject en tiempo de ejecución
  (docs/compliance/ACR-PRIVATE-REGISTRY.md). Un entregado compartido secreto es el B-03 clase
  de defecto este runbook existe a prevent.
