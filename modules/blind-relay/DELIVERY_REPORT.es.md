<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# blind-relé — Entrega Informe (MDS-1)

> Verificable por máquina entrega contrato. Refleja el 12 chapters de el README.

### 1. Qué esto resuelve
Cross-device sincronización necesita un relé, pero clientes fear el servidor captures datos. Este sin dependencias relé ejecuta el WS handshake y reenvía **cifrado envelopes** por sala — esto nunca decifra y nunca ve el canvas/document.

### 2. Quién compra este
B2B cross-device colaboración con un servidor-blind requisito: regulated industries, cross-institution cofirma.

### 3. Ejecutar en 60 segundos
```bash
cd modules/blind-relay && node --test        # 5/5 green
node src/relay.js --port 8081                 # start the blind relay
python3 -m http.server 8080                   # open index.html (shows server only sees ciphertext)
```

### 4. Integración contrato
servidor `createRelay({verifyToken, onObserve})` → `{listen, address, getObserved, close}`. Cliente `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope`. También `window.BlindRelayClient`.

### 5. Arquitectura
cliente Un → E2E sobre → relé (reenvía texto cifrado solo, registros qué esto ve) → cliente B. Admisión vía `verifyToken`; ciego prueba vía `getObserved()`.

### 6. Garantiza & amenaza modelo
servidor ciego (ningún symmetric clave, reenvía texto cifrado solo), token admisión, ningún echo a remitente. Fuera de alcance: comprometido cliente, red sniffing (usar WSS), root-clave compromiso.

### 7. Conocido límites
Serial in-flight marco procesamiento; stateless (salas dissolve con connections); single-process (shard para horizontal escala).

### 8. Verificación
`node --test` → **5 / 5 aprobado, 0 fallo** (`tests/relay.test.mjs`), incluyendo el auditable servidor-blind prueba.

### 9. Medido rendimiento
De extremo a extremo ms-scale; suite ~1.1 s (real WS vuelta trips).

### 10. Dependencias
**Un · Puro Cero**: servidor usa solo Node built-ins `node:http`/`node:crypto`; cliente solo Web Criptografía + navegador `WebSocket`.

### 11. licencia
repositorio licencia. Aegis's propio implementación.

### 12. CHANGELOG
- 2026-11-11 — entregado; 5/5 aserciones verde; independiente índice.html; MDS-1 contrato.
