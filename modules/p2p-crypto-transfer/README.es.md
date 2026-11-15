<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# p2p-crypto-transfer — Peer-to-Peer Cifrado Transferencia

## 1. Qué esto resuelve
Archivos debe mover entre two partes sin un servidor ever seeing ellos. p2p-crypto-transfer conjuntos up un WebRTC datos canal y flujos AES-GCM-encrypted chunks directo a disco, con un mínimo sin dependencias señalización servidor que relays solo opaco SDP/ICE.

## 2. Quién compra este
Cualquiera flujo de trabajo que necesita direct, end-to-end-encrypted archivo handoff (el "transporte" leg de el Aegis cerrado bucle).

## 3. Ejecutar en 60 segundos
```bash
cd modules/p2p-crypto-transfer
node --test                 # 11/11 green
node server.js &            # minimal signaling server (relays SDP/ICE only)
python3 -m http.server 8080 # open index.html (two tabs to transfer)
```

## 4. Integración contrato
`src/transfer.js` (stream encrypt/send + receive/decrypt a disco), `src/p2p.js` (RTCPeerConnection/DataChannel), `src/crypto.js` (sobre). El shell impulsa esto vía iframe + postMessage.

## 5. Arquitectura
clave exchange → AES-GCM sobre → WebRTC DataChannel → receptor decifra a disco vía un 1 GiB-capped en memoria Blob respaldo. Señalización servidor relays solo SDP/ICE.

## 6. Garantiza & amenaza modelo
De extremo a extremo cifrado (incorrecto clave falla), integridad (manipulación rechazado), OOM-safe streaming. El señalización servidor ve ningún archivo bytes o claves. Fuera de alcance: señalización servidor compromiso, host OS compromiso.

## 7. Conocido límites
Requiere un secure contexto (HTTPS/WSS) y un navegador para el en vivo transferencia; el node suite simulates el crypto/transport contrato.

## 8. Verificación
`node --test` → 11/11 verde (criptografía vuelta activación, wrong-clave rechazo, manipulación rechazo, sal vuelta activación, par interop, streaming-to-disk lógica).

## 9. Medido rendimiento
Suite ~1.0 s (Node 26), determinista.

## 10. Dependencias
**Un · Puro Cero** primera parte código: 0 npm dependencias. navegador usa solo WebRTC + Web Criptografía.

## 11. licencia
repositorio licencia.

## 12. CHANGELOG
- 2026-11-11 — README entregado (Inglés); Prueba_Informe entregado; 11/11 verde (recuento corregido de desactualizado 10).
