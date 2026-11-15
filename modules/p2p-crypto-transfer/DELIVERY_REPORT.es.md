<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Entrega Informe — P2P Cifrado Transferencia (Geek Task #3)

**Proyecto**: `p2p-crypto-transfer`
**Fecha**: 2026-11-09
**Author**: CodeBuddy (engineering auditoríun + compilación)
**Constraint cumplimiento**: 100% nativo navegador + Node built-ins, **cero tercero tiempo de ejecución o dev dependencias**.

---

## 1 · Objectivo recap

Compilación un mínimo, sin dependencias P2P cifrado file-transfer tool para el LAN / no-USB,
no-cloud-drive escenario. Difícil requirements:

1. P2P transporte vía **WebRTC DataChannel**.
2. **Nativo Web Criptografía AES-GCM** cifrado aplicado a **cada fragmento** aintes transferencia.
3. Un hand-written **backpressure** mecanismo based en `bufferedAmount` (ningún memoria blow-up
   cuando el receptor es slow).
4. Un mínimo **señalización servidor** es allowed, O un público STUN, O un same-machine
   **BroadcastChannel** demo.
5. **Cero dependencia**; estructurado, modular archivos; detailed README + este entrega informe.

---

## 2 · Qué era entregado

| Archivo | Responsabilidad |
|------|----------------|
| `index.html` | Mínimo UI: modo select, sala, compartido clave, send/receive progress, registro. |
| `server.js` | Zero-dep Node señalización + estático servidor. HTTP long-poll relé; opcional HTTPS cuando `key.pem`/`cert.pem` presente. |
| `package.json` | Ningún dependencias; `start` y `test` scripts. |
| `src/crypto.js` | Web Criptografía: PBKDF2 clave derivation (frase de contraseñun + aleatorio sal) + AES-GCM per-chunk encrypt/decrypt. |
| `src/signalers.js` | Pluggable señalización: `HttpSignaler` (servidor relé) y `BroadcastSignaler` (servidor-less same-machine). |
| `src/p2p.js` | WebRTC orchestration: Offer/Answer, ICE (non-trickle, ICE-gather-complete aintes enviar), STUN para NAT. |
| `src/transfer.js` | Streaming fragmento + cifrar + enviar con `bufferedAmount` backpressure; recibir + descifrar flujos directo a disco vía `createSink` (1 GiB-capped en memoria `Blob` respaldo). |
| `src/main.js` | UI orchestration solo (ningún negocio lógica). |
| `tests/crypto.test.mjs` + `tests/sink.test.mjs` | Zero-dep unidad pruebas (node --prueba, 11/11): criptografía (ida y vuelta, wrong-clave rechazo, manipulación rechazo, sal ida y vuelta, par interop, clave-derivation) + sink (OOM-fix streaming-to-disk lógica). |
| `README.md` / `DELIVERY_REPORT.md` | Documentación + este informe. |

---

## 3 · Geek-challenge lista de verificación (todos cumplido)

### 3.1 P2P penetración (WebRTC)
- ✅ Conexión built en `RTCPeerConnection` + `RTCDataChannel` (`src/p2p.js`).
- ✅ Two señalización opciones entregado: un **mínimo zero-dep señalización servidor** (`server.js`,
  HTTP long-poll, relays solo SDP/ICE) **y** un **servidor-less BroadcastChannel** modo para
  same-machine demo — exactamente el alternatives el brief allowed.
- ✅ Público gratuito **STUN** (`stun:stun.l.google.com:19302`) para NAT reflexive candidates;
  usado solo para ICE, nunca ve archivo bytes/keys.
- ✅ Non-trickle ICE: nosotros esperar para `iceGatheringState === 'complete'` aintes sending el SDP
  así el servidor lógica permanece trivial (relays exactamente two mensajes).

### 3.2 Cifrado & chunking (Web Criptografía AES-GCM)
- ✅ `File.stream()` es leer vía `getReader()` y sliced en **16 KiB chunks**.
- ✅ Cada fragmento es cifrado con **AES-GCM (256-bit, 128-bit etiqueta) y un fresco aleatorio 12-byte IV**
  (`src/crypto.js` `encryptChunk`). El clave es derivado de el compartido frase de contraseñun + un aleatorio
  sal vía **PBKDF2 (120,000 iterations, SHA-256)**.
- ✅ Wire framing por fragmento: `[uint32 seq | 12-byte IV | ciphertext]`. Sequence numbers hacer
  out-of-order arrival seguro incluso though DataChannel es reliable+ordered.
- ✅ El sal es público (enviado en el JSON `meta` mensaje); el frase de contraseñun es **nunca transmitted**.
  Un comprometido señalización servidor por lo tanto no puede descifrar anything.

### 3.3 Backpressure (bufferedAmount)
- ✅ Hand-written flujo control en `src/transfer.js` `sendFile`:
  - `HIGH_WATER = 16 MiB`: cuando `dc.bufferedAmount` exceeds esto, el remitente **stops reading**
    de el Archivo stream y `await`s el `bufferedamountlow` evento.
  - `LOW_WATER = 1 MiB`: `dc.bufferedAmountLowThreshold` conjunto a este; el `bufferedamountlow`
    evento resumes sending.
  - Resultado: el remitente nunca overwhelms el canal o exhausts RAM incluso si el receptor es slow.
- ✅ UI surfaces el backpressure estado vía un registro línea ("Receptor es slow — backpressure engaged").

### 3.4 Cero dependencia
- ✅ `package.json` tiene vacío `dependencies`.
- ✅ `server.js` usa solo `node:http`, `node:https`, `node:fs`, `node:path`, `node:url`.
- ✅ navegador código usa solo WebRTC + Web Criptografía (plataforma APIs, no libraries).
- ✅ Pruebas ejecutar en `node --test` con ningún installed packages (`npm test` → 11/11 aprobado: criptografía + sink).

---

## 4 · Verificación ejecutado

- `node --test` → **11/11 aprobado**: criptografía pruebas (ida y vuelta, wrong-clave rechazo, manipulación rechazo, sal ida y vuelta, par interop, clave-derivation) + sink pruebas (OOM-fix streaming-to-disk lógica).
- `node --check` en cada `.js` archivo → todos analiza cleanly (ningún syntax errores).
- Estático revisión de el seguridad modelo: confirmado señalización servidor relays opaco SDP/ICE solo;
  archivo bytes + clave material nunca leave el navegador; wrong-key/tampered chunks fallo GCM auth.

> Nota: en vivo WebRTC de extremo a extremo transferencia requiere un secure-context navegador (HTTPS o localhost)
> y era validated por código revisión + unit-tested criptografía. Un manual dos pestañas/ two-machine ejecutar es
> recommended as el final humo prueba (pasos en README §3).

---

## 5 · Conocido limitaciones (honesto disclosure)
- Sequential transferencias solo (uno archivo por canal en un tiempo); concurrente bidirectional metadatos
  aislamiento es no implementado pero es un easy extensión (véase README §5).
- **Receptor Out-of-memory — Corregido (era el "memoria hog" bug)**: el receptor usado a búfer cada
  fragmento en un array y assemble un `Blob` en el fin — un 4 GB archivo sería Out-of-memory el pestaña. Esto ahora
  abre un sink en el primero descifrado fragmento y flujos directo a disco
  (`src/transfer.js` `createSink`): Chromium usa `showSaveFilePicker()` →
  `FileSystemWritableFileStream` (unbounded, ningún reassembly búfer); todos otros browsers fall
  atrás a un en memoria `Blob **capped at 1 GiB**` que lanza un crisp, actionable error encima
  el cap en cambio de crashing. El uno caveat — `showSaveFilePicker` necesita un usuario gesture — es
  gestionado por un "💾 Elegir save ubicación" botón que pre-locks el writer aintes el par
  envía. Véase README §6 para el completo riesgo nota.
- Público STUN solo; symmetric NAT sería necesitar un TURN servidor (fuera de zero-dep alcance).
- Señalización servidor es en memoria, single-process, unauthenticated — suitable para intranet/demo;
  producción necesita sala auth + scaling.

---

## 6 · Suggested siguiente pasos (opcional)
1. Multi-file / carpeta batch con per-file `meta`.
2. Resume capacidad vía `resumeFrom` offset en `meta`.
3. Sala authentication + ephemeral token en el señalización servidor.
4. WASM-accelerated fragmento hash para very alto throughput.
