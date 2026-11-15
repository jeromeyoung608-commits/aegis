<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# blind-relé — servidor-Blind Texto cifrado relé

> **Terminology**: "ciego" describe transporte blindness (el relé reenvía
> texto cifrado esto no puede leer), no un blind-firma scheme y no un
> conocimiento cero prueba. Véase `docs/CLAIMS-WORDING.md`.

> servidor-blind WebSocket relé para cross-device sincronización. El servidor routes cifrado packets y nunca ve el lienzo estado.

---

### 1. Qué esto resuelve
Multi-device sincronización necesita un relé, pero muchos clientes fear WebSockets porque ellos worry el servidor será capture datos. Este módulo es un **sin dependencias** relé: esto solo ejecuta el WebSocket handshake y reenvía **cifrado envelopes** por sala — esto nunca decifra y nunca ve el lienzo estado o documento contenido. Paired con token-gate para admisión y blind-relay/client para de extremo a extremo sobre criptografía.

### 2. Quién compra este
B2B needing cross-device colaboración con un "servidor-blind" requisito: regulated industries, cross-institution cofirma, cualquiera "relé no puede ser trusted" cumplimiento escenario.

### 3. Ejecutar en 60 segundos
```bash
cd modules/blind-relay
node --test                                   # 5 assertions, all green
node src/relay.js --port 8081                 # start the zero-dependency blind relay
# browser demo (shows the server only sees ciphertext): python3 -m http.server 8080
```
Opcional token-gated admisión:
```bash
AEGIS_ROOT_PUB=<base64url-SPKI> node src/relay.js --port 8081
```

### 4. Integración contrato
- **servidor (Node)**: `createRelay({ verifyToken, onObserve })` → `{ listen(port?), address(), getObserved(), close() }`. Inject `verifyToken(token, room)` (predeterminado: abierto; recommend injecting token-gate's `verifyToken`).
- **Cliente (browser/Node)**: `src/ws-lite.js` `connectWs(url, handlers)` (test/tooling); `src/client.js` `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope` (navegador; también `window.BlindRelayClient`).

### 5. Arquitectura
```
client A ──E2E-encrypted envelope──▶ relay (forwards ciphertext only, logs what it sees) ──▶ client B
                                     │
                                     ├─ admission: verifyToken(token,room)
                                     └─ blind proof: getObserved() holds only ciphertext
```
El relé es "ciego": en receiving un `data` sobre esto reenvía esto verbatim a otros same-room pares, nunca parsing o decrypting. Sala estado vive solo en activo sockets.

### 6. Garantiza & amenaza modelo
- **servidor ciego**: el relé contiene ningún symmetric clave; esto reenvía solo client-encrypted envelopes; `getObserved()` es auditable prueba esto solo ever saw texto cifrado.
- **Admisión**: cuando `verifyToken` es inyectado, no/malformed/expired tokens son rechazado en el hello etapa (close + disconnect).
- **Ningún echo**: mensajes go solo a otros same-room pares, nunca atrás a el remitente.
- Fuera de alcance: comprometido cliente, red-layer sniffing (clientes debería usar HTTPS/WSS), raíz private-clave compromiso.

### 7. Conocido límites
- In-flight frames en un único conexión son procesado serially (hello debe arrive aintes welcome, entonces datos); extreme high-volume tiny-frame throughput es no stress-tested.
- El relé es stateless: salas dissolve con connections, ningún base de datos.
- Este es un single-process relé; horizontal escala necesita sala→relé sharding en front.

### 8. Verificación
Véase `TEST_REPORT.md`: `node --test` todos verde (5/5), cubriendo admisión, texto cifrado enrutamiento, ciego prueba, no-echo, y cross-room aislamiento.

### 9. Medido rendimiento
De extremo a extremo handshake + forward es milliseconds; el suite de 5 casos se ejecuta en ~1.1 s (multiple real WebSocket vuelta trips).

### 10. Dependencias
**Un · Puro Cero**: servidor usa solo Node built-ins `node:http` / `node:crypto`; cliente usa solo plataforma Web Criptografía y el navegador `WebSocket`. 0 npm dependencias, 0 vendor.

### 11. licencia
Coherente con repositorio licencia. Este módulo es Aegis's propio implementación.

### 12. CHANGELOG
- v1.0.0 — sin dependencias WS relé, token admisión, blind-visible registro, navegador demo, y `TEST_REPORT.md`.
