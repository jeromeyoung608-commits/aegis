<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SLA.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Servicio Nivel Acuerdo (SLA) — Aegis

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Modelo:** autoalojado / Cliente-operated (el Cliente posee el tiempo de ejecución)

## 0. Operational contacto

- **SLA contacto mailbox:** {{SLA_MAILBOX}}
- **operador timezone:** {{SLA_TIMEZONE}}

---

## 1. Alcance & responsabilidad split

Aegis es entregado as **software el Cliente operates en su propio infrastructure**.
Por lo tanto disponibilidad, copia de seguridad y incidente handling son el **Cliente's**
operational responsabilidad, supported por el vendor as described abajo.

| Area | Cliente | Vendor |
|------|----------|--------|
| Host disponibilidad / uptime | posee (su VM/hardware) | — |
| Copia de seguridad & restaurar de el tiempo de ejecución volumen | posee (procedimiento proporcionado) | documentos `sqlite3 .backup` + restaurar drill |
| seguridad patching de el OS/tiempo de ejecución | posee | envía dependencia actualiza + advisories |
| Producto defecto / interrupción causality | diagnoses con vendor | proporciona fixes por soporte tier |
| Disponibilidad monitorización | posee | expone `GET /healthz` sonda |

## 2. Disponibilidad objetivo (referencia)

Para un single-node autoalojado despliegue con el documentado copia de seguridad en place, el
referencia disponibilidad objectivo es **99.5%** de scheduled uptime por mes
(excluye planned maintenance y Cliente-side infrastructure faults). Este es un
**objetivo**, no un contractual penalty a menos que el commercial acuerdo states uno.

## 3. soporte respuesta times (referencia)

| Priority | Ejemplo | Respuesta objectivo |
|----------|---------|-------------------|
| P1 — SEV1 (datos pérdida / incumplimiento / exploited vuln) | confirmado incumplimiento, bóveda corruption | **4 hours** acknowledgement, continuous hasta resolved |
| P2 — SEV2 (major funcionalidad roto, ningún datos pérdida) | un módulo falla a carga | 1 negocio día |
| P3 — SEV3 (degraded) | slow exportación | 3 negocio días |
| P4 — SEV4 (cosmetic/doc) | redacción | siguiente lanzamiento |

## 4. Monitorización

El vendor supplies un **liveness/readiness sonda**: `GET /healthz` retorna
`{ ok, uptimeSeconds, db, version, ts }` y puede sit detrás un carga balancer. El
Cliente wires alerts a esto.

## 5. Cambio management

Releases son tagged y reproducible; el entrega paquete es integrity-checked
(`verify:delivery`). El Cliente controles cuando a aplicar actualiza.

## 6. Exclusions

El vendor hace **no** warrant uptime de Cliente-owned infrastructure, nor
disponibilidad de Cliente-configured opcional integraciones (e.g. un tercero
TSA). Force majeure se aplica.

> Nota: reemplaza respuesta times, penalties y aplicable términos con el firmado
> acuerdo; asesoría jurídica revisión aintes publication.
