<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SOC2-EVIDENCE.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# SOC 2 Preparación — Control Mapping & evidencia

**Estado:** Preparación evidencia (self-assessment) · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor

> Este documento es **no** un SOC 2 informe o certification. Esto es un preparación
> mapa showing, para cada Confianza Servicios Criterion (TSC), qué es implementado y
> donde un auditor sería find evidencia. Huecos son called fuera expresamente.

## Common Criterios (seguridad — CC)

| TSC | Control theme | Implementado | evidencia |
|-----|--------------|-----------|----------|
| CC1 | Control entorno / governance | Partial | `docs/compliance/` (policies), `README` puerta de calidad tabla |
| CC2 | Communication & información | Sí | operador consola; auditoríun exportación |
| CC3 | Riesgo assessment | Partial | `docs/compliance/THREAT-MODEL.md`, `CRA-NIS2.md` |
| CC4 | Monitorización | Sí | encadenado por hash auditoríun registro; `GET /healthz` liveness sonda |
| CC5 | Control activities | Sí | Bearer auth + TTL; inicio de sesión throttling; resistente a la manipulación auditoríun; path-traversal guards |
| CC6 | Logical acceso | Sí | Hashed credenciales; operator/issuer scopes; sesión TTL; failed-login throttle |
| CC7 | Sistema operaciones | Sí | Backup/restore (`sqlite3 .backup`); freshness-checked entrega packer |
| CC8 | Cambio management | Partial | Feature-flag gating; ff-only merges; lanzamiento lista de verificación |
| CC9 | Riesgo mitigation | Partial | Amenaza modelo; ningún predeterminado salida |

## Additional TSC

- **Disponibilidad (Un):** `GET /healthz` preparación; documentado backup/restore;
  port-collision fail-fast arranque. _Gap:_ ningún documentado RTO/RPO SLA aún.
- **Confidentiality (C):** cifrado en resto (bóveda); conocimiento cero identidad;
  ningún tercero salida por predeterminado.
- **Procesamiento Integridad (PI):** encadenado por hash auditoríun; RFC3161 adaptador con
  fail-open respaldo a local tiempo. _Gap:_ formal PI prueba suite pending.
- **Privacidad (P):** `PRIVACY-POLICY.md`, `DPA.md`, `ROPA.md` (este carpeta);
  GDPR datos-subject borrado implementado.

## Auditor pointers

- auditoríun chain verificación: `GET /audit` + `GET /audit/export`; integridad vía
  in-repo `verifyAuditChain`.
- Inicio de sesión throttle: `server.js` por IP + per-(IP,usuario) limiter (429 + lockout).
- Resistente a la manipulación operador auditoríun: `server/store.js` `eraseSubject` refuses protected
  interesados (HTTP 403).
- Entrega integridad: `scripts/package-delivery.mjs` SHA256 + source-freshness.

## Huecos cerrado (este vuelta)

| # | Gap | Estado | evidencia |
|---|-----|--------|----------|
| 1 | Formal access-review procedimiento & recertification | **Cerrado** | `ACCESS-REVIEW.md` (JML, quarterly recert, issuer-secreto rotación) |
| 2 | Documentado incident-response runbook | **Cerrado** | `INCIDENT-RESPONSE.md` (phases, SEV classes, GDPR 72h, resistente a la manipulación auditoríun forensics) |
| 3 | DR/backup RTO-RPO SLA + probado restaurar drill | **Cerrado** | `DR-BACKUP.md` (`sqlite3 .backup` método, RTO/RPO defaults, restaurar + anual drill) |
| 4 | Vendor / sub-encargado del tratamiento inventory | **Cerrado** | `SUBCONTRACTOR-INVENTORY.md` (ningún obligatorio tiempo de ejecución sub-encargado del tratamiento; 2 opt-in salida puntos, apagado por predeterminado) |

Restante para un formal auditoríun (operational, no tooling): execute el primero
quarterly acceso revisión y el primero anual restaurar drill, y tener asesoría jurídica
sign apagado el legal drafts (Privacidad Política / DPA / ROPA).
