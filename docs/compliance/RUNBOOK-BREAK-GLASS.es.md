<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/RUNBOOK-BREAK-GLASS.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Break-glass (clave escrow) runbook

Aegis soporta **clave escrow** para "break-glass" recuperación de un session/asset cuando el
primary holder es unavailable. Este es un accountability-sensitive capacidad y es
audited; usar esto solo bajo un documentado, authorized procedimiento.

## Cuando a usar
- Un bloqueado sesión debe ser admitted pero el operador quién sellado el escrow es absent.
- Un regulatory/litigation hold requiere retrieving un sellado carga útil.

## Procedimiento
1. **Authorize:** obtain un second-person aprobación (two-operador regle). Registro el
   ticket/incident ID.
2. **Deposit/retrieve:** el escrow API deposits un sellado blob bajo un sala clave; el
   recuperación endpoint retorna esto a un authorized holder. Cada deposit y retrieval
   es escrito a el append-only auditoríun registro (`escrow.deposit` / `escrow.retrieve`).
3. **Verificar:** confirmar el auditoríun entrada muestra el retrieving operador, marca de tiempo, y
   sala — el rastro de auditoríun es el evidencia el break-glass era legitimate.
4. **Close:** después usar, rotar el relevant secreto (véase RUNBOOK-clave-ROTATION.md) y
   nota el break-glass evento en el incidente registro.

## Guardrails
- Escrow es **opt-in** (`gateway.escrow.enabled`); permitiendo
  `gateway.escrow.requireForAdmit` hace admisión impossible sin un deposited
  clave — solo turn este en cuando su proceso puede actually deposit.
- El operator/system rastro de auditoríun es **nunca erasable** (GDPR Art.17 objetivos datos
  interesados, no responsabilidad registros — véase el B-04 endurecimiento nota en
  Entrega_Informe.md). Un break-glass evento por lo tanto always deja un trace; que es
  intentional.
- Desactivar escrow en high-risk environments donde el añadido recuperación superficie outweighs
  el disponibilidad benefit.
