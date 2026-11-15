<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/audit-timeline/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# auditoría-timeline — encadenado por hash auditoríun Cronología

## 1. Qué esto resuelve
Cada meaningful action en el cerrado bucle debe ser registrado así que tampering es detectable. auditoría-timeline es un append-only, SHA-256 encadenado por hash cronología: cada entrada enlaza a el previous hash, así deleting o altering cualquiera entrada breaks el chain.

## 2. Quién compra este
Cualquiera flujo de trabajo que necesita un resistente a la manipulación, localmente verifiable rastro de auditoríun de quién hizo qué, cuando.

## 3. Ejecutar en 60 segundos
```bash
cd modules/audit-timeline
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser timeline UI)
```

## 4. Integración contrato
`AuditTrail` (añadir + verificar) y `renderTimeline` son importable; el shell commits un encadenado por hash entrada en cada closed-loop etapa.

## 5. Arquitectura
entrada → `Hash(prevHash || canonical(entry))` → chain. `verify()` recomputes el chain y flags cualquiera roto enlace.

## 6. Garantiza & amenaza modelo
Append-only integridad, tamper-evidencia. Fuera de alcance: un comprometido host que rewrites el completo chain.

## 7. Conocido límites
Chain integridad es local; cross-party notarization sería necesitar un externo anchor.

## 8. Verificación
`node --test` → suite verde (añadir, verificar, manipulación detección).

## 9. Medido rendimiento
hash chaining es sub-millisecond por entrada (nativo Web Criptografía).

## 10. Dependencias
**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes (plataforma Web Criptografía).

## 11. licencia
repositorio licencia.

## 12. CHANGELOG
- 2026-11-11 — README entregado (Inglés); MDS-1 contrato.
