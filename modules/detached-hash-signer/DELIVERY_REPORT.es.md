<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# detached-hash-firmante — Entrega Informe (MDS-1)

> Verificable por máquina entrega contrato. Refleja el 12 chapters de el README y answers el buyer's questions directamente.

### 1. Qué esto resuelve
Multilateral aprobación de sensible documentos: cada firmante firma solo un SHA-256 hash, así el documento bytes nunca leave el local máquina y nunca entrar el firma paquete.

### 2. Quién compra este
B2B equipos needing multilateral aprobación sin exposing documento bytes (legal/finance/exec cofirma, regulatory filing).

### 3. Ejecutar en 60 segundos
```bash
cd modules/detached-hash-signer && node --test   # 8/8 green
python3 -m http.server 8080                       # open index.html
```

### 4. Integración contrato
Puro ESM, cero dependencias, navegador + Node. `sha256Hex`, `generateKeyPair`, `export/importPublicKey`, `signHash`, `verifySignature`, `makeBundle`, `verifyBundle`, `isDetached`. También `window.DetachedHashSigner`.

### 5. Arquitectura
doc → SHA-256 → docHash → cada exec firma el hash → `makeBundle` (hash + firmas solo) → `verifyBundle`. Ningún documento bytes travel.

### 6. Garantiza & amenaza modelo
Desacoplado propiedad (`isDetached`), firma verificación, manipulación resistance. Fuera de alcance: private-clave compromiso, host OS compromiso.

### 7. Conocido límites
Firma el hash solo; documento transporte gestionado subida. Ningún enforced firma orden chain.

### 8. Verificación
`node --test` → **8 / 8 aprobado, 0 fallo** (`tests/detached-hash-signer.test.mjs`).

### 9. Medido rendimiento
Sub-millisecond sign/verify; completo suite ~23 ms (Node 26).

### 10. Dependencias
**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes (plataforma Web Criptografía).

### 11. licencia
repositorio licencia. Aegis's propio implementación, ningún tercero atribución encumbrance.

### 12. CHANGELOG
- 2026-11-11 — entregado; 8/8 aserciones verde; independiente índice.html; MDS-1 contrato.
