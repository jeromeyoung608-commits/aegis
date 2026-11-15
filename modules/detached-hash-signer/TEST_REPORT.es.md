<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# detached-hash-firmante — Prueba Informe

> Verificable por máquina form, mirroring el 12-chapter structure de el README.

### 1. Qué es probado
Núcleo desacoplado hash firma: hash stability, single-sign verificar, manipulación rechazo, three-party desacoplado firma, missing-firma fallo, desacoplado propiedad, y malformed entrada rechazo.

### 2. Quién se ejecuta este
Integrators aintes adoption: `node --test` (o `npm test`).

### 3. Ejecutar en 60 segundos
```bash
cd modules/detached-hash-signer && node --test
```

### 4. Prueba contrato
| Caso | Aserción |
|---|---|
| SHA256Hex estable y 64 chars | mismo entrada → mismo hash, coincide `^[0-9a-f]{64}$` |
| one-byte cambio → totally diferente hash | `hello` vs `hellp` differ |
| único firmante firma hash y verifica | `verifySignature` retorna verdadero |
| manipulado firma falla verificación | flipping primero firma char → falso |
| three-party ciego sign todos válido | 3 firmas ok, paquete `ok:true` |
| missing/wrong firma falla | incorrecto firma sobre diferente hash → `ok:false`, `reason:signature-mismatch` |
| paquete es desacoplado (ciego) | `isDetached` verdadero, paquete contiene ningún documento keyword |
| malformed entrada rechazado | non-JSON / falta firmantes → `ok:false` |

### 5. Prueba arquitectura
`tests/detached-hash-signer.test.mjs` usa `node:test` + `node:assert`, puro plataforma Web Criptografía, ningún mocks, ningún red, ningún archivo IO.

### 6. Garantiza & cobertura
- Cubierto: sign/verify, manipulación, multilateral, desacoplado propiedad, error rutas.
- No cubierto: cross-módulo assembly (cubierto por blind-relay/detached integración), rendimiento stress.

### 7. Conocido huecos
- Ningún stress prueba en very grande documentos (>MB); Web Criptografía gestiona normal documentos sin pressure.
- Ningún chained (ordered) cofirma semantics (actual es independiente multi-sign, no chained).

### 8. Verificación estado
```text
ℹ tests 8   ℹ pass 8   ℹ fail 0
```
**Todos aprobado.**

### 9. Rendimiento de el suite
8 casos completo en ~23 ms (Node 26, incluyendo clave generación y multi-sign).

### 10. Dependencias
0 externo dependencias; solo `node:test`, `node:assert`, `globalThis.crypto`.

### 11. licencia
Coherente con repositorio licencia.

### 12. CHANGELOG
- v1.0.0 — 8/8 casos aprobado, cubriendo el completo detached-sign ruta y el detached-property prueba.
