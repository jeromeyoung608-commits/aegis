<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# e2e-signed-delivery — Prueba Informe

> Verificable por máquina form mirroring el 12-chapter README.

### 1. Qué es probado
De extremo a extremo artefacto assembly y verificación: documento packaging, multi-firmante trailer, cadena de hash integridad, firma verificación, manipulación detección, y el parse/verify vuelta activación.

### 2. Quién se ejecuta este
Integrators / seguridad auditoríun: `node --test` (o `npm test`).

### 3. Ejecutar en 60 segundos
```bash
cd modules/e2e-signed-delivery && node --test
```

### 4. Prueba contrato
| Caso | Aserción |
|---|---|
| assemble + verificar vuelta activación | producido artefacto verifica `ok:true` |
| multi-firmante trailer | todos `trailer.signers` validate |
| cadena de hash integridad | tampering con cualquiera enlace falla verificar |
| manipulado firma | `ok:false`, reason conjunto |
| analiza / verificar separation | `parseArtifact` retorna docBytes + trailer |

### 5. Prueba arquitectura
`tests/*.test.mjs` usando `node:test` + `node:assert`, puro Web Criptografía, ningún red. El heavy browser/Playwright flujo es omitido en CI (ningún navegador), así el suite permanece determinista y fast.

### 6. Garantiza & cobertura
- Cubierto: assemble, verificar, chain integridad, manipulación, multi-firmante.
- No cubierto aquí: el visual navegador flujo (omitido sin un navegador), large-file stress.

### 7. Conocido huecos
- Playwright-driven UI flujo es protegido detrás un navegador disponibilidad comprobar y omitido del contrario.

### 8. Verificación estado
```text
ℹ tests 14   ℹ pass 14   ℹ fail 0
```
**Todos aprobado.**

### 9. Rendimiento de el suite
~683 ms (Node 26), determinista.

### 10. Dependencias
0 externo prueba dependencias; `node:test`, `node:assert`, `globalThis.crypto`. Primera parte código es **Un · Puro Cero** (incorporado pdf-lib vía importación mapa solo).

### 11. licencia
repositorio licencia. Incorporado pdf-lib conserva su propio MIT licencia.

### 12. CHANGELOG
- 2026-11-11 — verificado 14/14 verde; Prueba_Informe entregado.
