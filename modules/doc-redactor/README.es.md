<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# doc-redactor — Local-First documento redacción

## 1. Qué esto resuelve
Sensible PDF debe ser redacted y sanitized aintes sharing, pero clientes será no subida ellos a un servidor. doc-redactor hace el entire job en el navegador: cero subida, cero externo solicitud. Opcional on-device OCR; el exportación es producido localmente.

## 2. Quién compra este
cumplimiento / legal / privacidad equipos quién debe demostrar un documento nunca izquierda el dispositivo durante redacción.

## 3. Ejecutar en 60 segundos
```bash
cd modules/doc-redactor
node --test                 # 62/62 green
python3 -m http.server 8080 # open index.html (works offline)
```

## 4. Integración contrato
navegador aplicación exposing `window.REDAKTOR` y un `aegis` canal (`redaktor:load-doc`, `export-ready`). Núcleo redacción functions son importable; el shell impulsa esto vía iframe + postMessage.

## 5. Arquitectura
PDF parsed in-navegador → regions redacted (vector + raster) → localmente producido exportación. OCR se ejecuta on-device cuando activado; nada es enviado a un servidor.

## 6. Garantiza & amenaza modelo
Cero externo solicitudes (verificado sin conexión), local-only procesamiento. Fuera de alcance: comprometido host OS, malicious navegador extensión.

## 7. Conocido límites
Heavy OCR / grande escanea depend en dispositivo CPU; very grande PDF son bounded por pestaña memoria.

## 8. Verificación
`node --test` → 62/62 verde (redacción correctness, zero-external-request CSP, exportación integridad).

## 9. Medido rendimiento
Suite < 2 s; redacción operaciones son sub-frame en el navegador.

## 10. Dependencias
**Un · Puro Cero** primera parte código: 0 npm dependencias. Incorporado `pdf-lib` vía importación mapa (kept dentro el módulo, no un tiempo de ejecución dependencia).

## 11. licencia
repositorio [licencia](../LICENSE) — **MIT**, cubriendo todos primera parte código. Incorporado componentes conservar su propio subida licences (véase README §11 y `vendor/THIRD_PARTY_NOTICES.md`).

## 12. CHANGELOG
- 2026-11-11 — verificado 62/62 verde; README entregado (Inglés).
