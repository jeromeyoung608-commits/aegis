<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ARCHITECTURE.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Arquitectura

Aegis es un único Node.js proceso (`server.js`) con **cero npm dependencias** —
solo `node:*` built-ins. Esto sirve two surfaces de uno port: el `aegis-shell`
workbench/console (estático) y el JSON API.

## Layers
- **Transporte** — `http`/`https` (opcional TLS de `AEGIS_TLS_DIR`); COOP/COEP +
  per-response nonce CSP.
- **Estático** — `serveStatic` confined a el Web raíz con un **nivel superior deny lista**
  (`config`, `data`, `server`) y un deny-extension lista (`.db*`) — privado rutas son
  nunca servido (B-01~B-04).
- **API** — operador-gated endpoints (`operatorAuthorized`): cumplimiento, sesiones,
  configuración, admin copia de seguridad; más OIDC, SCIM, TSA, escrow, auditoríun, MFA.
- **Almacén** — embedded `node:sqlite` (`server/store.js`): cuentas (TOTP sellado
  AES-256-GCM), sesiones, rastro de auditoríun (append-only, non-erasable para operadores),
  revocations, escrow, SCIM tokens, MFA recuperación codes.
- **Modules** — `modules/oidc` (RS256 `id_token` verificación vía `node:crypto`),
  `modules/scim` (SCIM 2.0 CRUD + desaprovisionamiento).
- **Adapters** — `adapters/tsa-rfc3161` (RFC 3161 marca de tiempo signing/verification).

## Confianza boundaries
- El Web raíz es untrusted entrada; el deny lista es el difícil límite.
- operador endpoints require un sesión o el emisor secreto — un presentation rol
  switch en el shell es **no** un access-control límite.
- `data/` y `config/` son tiempo de ejecución volumes, excluded de el entrega paquete
  (B-03): ningún operador secreto o fact ever envía.

## Identidad & aprovisionamiento
Local cuentas (`npm run setup`), OIDC (opt-in), SCIM aprovisionamiento, TOTP MFA, GDPR
borrado con tombstone hash. Véase `docs/compliance/OIDC-PROVIDERS.md` y
`SCIM-CONNECTORS.md`.
