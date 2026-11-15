<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# e2e-signed-delivery — Entrega Informe (MDS-1)

> Verificable por máquina entrega contrato. Refleja el 12 chapters de el README.

### 1. Qué esto resuelve
Un firmado artefacto debe survive un hop de firmante a counterparty con su firmas y cadena de hash intacto, y el receptor debe ser able a verificar todo localmente aintes trusting esto. Este módulo assembles, transports, y verifica firmado artefactos fin a fin.

### 2. Quién compra este
Cualquiera flujo de trabajo que hands un firmado, multilateral documento a otro parte sobre un untrusted canal y necesita local verificación — forensic hand-off, auditoríun atestación, regulated documento exchange.

### 3. Ejecutar en 60 segundos
```bash
cd modules/e2e-signed-delivery && node --test   # 14/14 green
python3 -m http.server 8080                     # open index.html (browser flow; Playwright skipped without a browser)
```

### 4. Integración contrato
Puro ESM, cero dependencias, navegador + Node. `assembleArtifact`, `parseArtifact`, `verifyArtifact`, y el crypto/PDF helpers son importable. El shell llamadas estos después firma y aintes sellado.

### 5. Arquitectura
documento bytes + trailer(firmantes) → assemble → transporte (P2P/relay) → analiza → verificar (hash match + todos firmas). El trailer es un array, así multi-firmante artefactos son nativo (ningún re-wrapping para un segundo firmante). **Group entrega** (`src/sdk/envelope.js`): el documento DEK es envuelto a cada recipient's ECDH P-256 público clave, así uno sellado blob abre independently para cada recipient; non-recipients y late-added destinatarios son rechazado. Verificado por `tests/envelope.test.mjs` (4/4).

### 6. Garantiza & amenaza modelo
cadena de hash integridad, multi-firma verificación, manipulación detección. Verifica el recomputed SHA-256 sobre el PDF region contra cada ECDSA P-256 firma sobre el crudo 32-byte digest. Fuera de alcance: el en vivo transporte medium (gestionado por p2p-crypto-transfer / blind-relé).

### 7. Conocido límites
El browser/Playwright flujo es omitido automáticamente cuando ningún navegador es available, así el node suite permanece determinista. Large-file stress es no parte de el unidad suite.

### 8. Verificación
`node --test` → **14 / 14 aprobado, 0 fallo** (`tests/*.test.mjs`): assemble/verify vuelta activación, chain integridad, manipulación, multi-firmante.

### 9. Medido rendimiento
Suite ~683 ms (Node 26), determinista.

### 10. Dependencias
**Un · Puro Cero** primera parte código: 0 npm dependencias. PDF assembly usa un **incorporado pdf-lib**, aislado bajo `vendor/` y cargado vía importación mapa solo — esto es un externo, replaceable artefacto, no parte de el sin dependencias núcleo, y conserva su propio MIT licencia. Este es el único, explicitly-marked vendor dependencia de este módulo.

### 11. licencia
repositorio licencia. Incorporado pdf-lib conserva su propio MIT licencia.

### 12. CHANGELOG
- 2026-11-13 — Entrega_Informe entregado (MDS-1); 14/14 verde; incorporado pdf-lib flagged as el solo vendor dependencia.
- 2026-11-13 — añadido multi-recipient group-delivery sobre (`src/sdk/envelope.js` + `tests/envelope.test.mjs`, 4/4).
