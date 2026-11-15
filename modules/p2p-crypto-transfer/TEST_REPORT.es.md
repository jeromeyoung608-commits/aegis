<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# p2p-crypto-transfer — Prueba Informe

> Verificable por máquina form mirroring el 12-chapter README.

### 1. Qué es probado
Peer-to-peer cifrado archivo transferencia: clave exchange / derivation, sobre encrypt/decrypt, integridad, wrong-clave rechazo, y el completo WebRTC handshake/transfer simulation.

### 2. Quién se ejecuta este
Integrators / seguridad auditoríun: `node --test` (o `npm test`).

### 3. Ejecutar en 60 segundos
```bash
cd modules/p2p-crypto-transfer && node --test
```

### 4. Prueba contrato
| Caso | Aserción |
|---|---|
| sobre cifrar → descifrar vuelta activación | texto sin cifrar recovered |
| incorrecto clave falla a descifrar | verificación error |
| integridad etiqueta rechaza tampering | AES-GCM detecta |
| clave derivation determinista | mismo inputs → mismo clave |
| completo transferencia simulation | archivo arrives intacto |

### 5. Prueba arquitectura
`tests/*.test.mjs`, `node:test` + `node:assert`, puro Web Criptografía, ningún red. El browser/WebRTC UI flujo es omitido sin un navegador.

### 6. Garantiza & cobertura
- Cubierto: sobre criptografía, integridad, clave derivation, simulated transferencia.
- No cubierto: en vivo WebRTC par conexión (omitido sin un navegador).

### 7. Conocido huecos
- En vivo WebRTC ruta es exercised solo en un navegador; el node suite simulates el crypto/transport contrato.

### 8. Verificación estado
```text
ℹ tests 11   ℹ pass 11   ℹ fail 0
```
**Todos aprobado.** (Nota: un earlier entrega informe establecido 10/10; el medido recuento es 11/11 — corregido aquí.)

### 9. Rendimiento de el suite
~1040 ms (Node 26), determinista.

### 10. Dependencias
0 externo prueba dependencias. Primera parte código es **Un · Puro Cero** (incorporado lib vía importación mapa solo).

### 11. licencia
repositorio licencia.

### 12. CHANGELOG
- 2026-11-11 — verificado 11/11 verde; Prueba_Informe entregado; corregido recuento (era 10).
