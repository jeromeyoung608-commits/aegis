<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# blind-relé — Prueba Informe

### 1. Qué es probado
El conocimiento cero relé's behavioral contrato: token admisión, de extremo a extremo texto cifrado enrutamiento, servidor-blind prueba, no-echo a remitente, y cross-room aislamiento.

### 2. Quién se ejecuta este
Integrators / seguridad auditoríun: `node --test` (o `npm test`).

### 3. Ejecutar en 60 segundos
```bash
cd modules/blind-relay && node --test
```

### 4. Prueba contrato
| Caso | Aserción |
|---|---|
| admitted token + texto cifrado enrutamiento + ciego | B receives A's texto cifrado y decifra; `getObserved()` contiene ningún texto sin cifrar `SECRET`/`coordinates` |
| no/bad token rechazado | `connectAuth` rechaza, `reason:admission denied` |
| wrong-room token rechazado | mismo |
| ningún echo a remitente | remitente `aGot.length === 0` |
| cross-room aislamiento | R2's `r2Got.length === 0` |

### 5. Prueba arquitectura
`tests/relay.test.mjs` usa un real WebSocket: arranca `createRelay` → two token-holding clientes vía `ws-lite.connectWs` → de extremo a extremo AES-GCM encrypt/decrypt. `verifyToken` inyecta token-gate's real verificación. Cada prueba cierra el relé en `finally` a avoid lingering gestiona.

### 6. Garantiza & cobertura
- Cubierto: admisión (valid/bad/wrong-room), ciego prueba, no-echo, cross-room aislamiento.
- No cubierto: WS marco fragmentation límites, huge concurrente connections, WSS (TLS) front.

### 7. Conocido huecos
- Single-connection serial marco procesamiento (noted bajo Conocido límites en README).
- Ningún formal prueba que un comprometido relé aún can't leer datos (relies en E2E cifrado; claves nunca leave el cliente).

### 8. Verificación estado
```text
ℹ tests 5   ℹ pass 5   ℹ fail 0
```
**Todos aprobado.**

### 9. Rendimiento de el suite
5 casos completo en ~1106 ms (real TCP/WS handshake + multiple vuelta trips).

### 10. Dependencias
0 externo dependencias en pruebas; solo `node:test`, `node:assert`, `node:http`, `node:crypto`, `globalThis.crypto`.

### 11. licencia
Coherente con repositorio licencia.

### 12. CHANGELOG
- v1.0.0 — 5/5 casos aprobado, incluyendo el auditable "servidor-blind" prueba.
