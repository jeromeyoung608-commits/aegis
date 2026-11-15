<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# token-gate — Prueba Informe

### 1. Qué es probado
Completo token issue/verify ruta: válido admisión, caducidad, incorrecto sala, falsificado firma, audience restriction, puerta de calidad, y cross-root rechazo.

### 2. Quién se ejecuta este
Integrators aintes adoption: `node --test` (o `npm test`).

### 3. Ejecutar en 60 segundos
```bash
cd modules/token-gate && node --test
```

### 4. Prueba contrato
| Caso | Aserción |
|---|---|
| válido token verifica | `verifyToken` ok, sala coincide |
| expired token rechazado | `reason:expired` |
| wrong-room token rechazado | `reason:wrong-room` |
| falsificado (manipulado) token rechazado | `reason:bad-signature` |
| audience: correcto admits / incorrecto denies | `audience-mismatch` |
| puerta de calidad() admits good / denies bad sobre | admit boolean correcto |
| cross-root firma falla | `bad-signature` |

### 5. Prueba arquitectura
`tests/token-gate.test.mjs`, `node:test` + `node:assert`, puro Web Criptografía, ningún red, ningún IO.

### 6. Garantiza & cobertura
- Cubierto: problema, verificar, cuatro rechazo classes, audience, puerta de calidad, cross-root.
- No cubierto: concurrente issuance, token revocación, oversized carga útil.

### 7. Conocido huecos
- Stateless tokens tener ningún instant-revocation prueba (diseño relies en un emisor denylist, no implementado aquí).

### 8. Verificación estado
```text
ℹ tests 7   ℹ pass 7   ℹ fail 0
```
**Todos aprobado.**

### 9. Rendimiento de el suite
7 casos completo en ~130 ms (multiple clave generations y issuances).

### 10. Dependencias
0 externo dependencias; solo `node:test`, `node:assert`, `globalThis.crypto`.

### 11. licencia
Coherente con repositorio licencia.

### 12. CHANGELOG
- v1.0.0 — 7/7 casos aprobado, cubriendo el completo token-admission rechazo ruta.
