<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Entrega Informe · Local Cifrado bóveda (auditoríun & Archivo)

> **Local Cifrado bóveda: Zero-cloud archiving de firmado documentos.**

módulo: `modules/encrypted-archive`
Entregado: 2026-11-10
Estado: completo, verificado en Node y Chrome

---

## 1 · Qué era asked

| Requisito | Entregado |
| --- | --- |
| OPFS carpeta dentro el principal shell (`aegis-shell`) | Shell abre `/aegis-vault` vía `openOpfsStore()` y seals en esto directamente |
| Después P2P firma verificación, allow descargar **y** archivo | `signed:verified` gates un oro **Archivo a bóveda** botón; el descargar botón permanece |
| Cifrar el archivo **y** firma metadatos | Uno AES-GCM carga útil frames `metadata JSON + file bytes` |
| Reuse el Web Criptografía approach de módulo 01 | PBKDF2-SHA-256 (250,000) → non-extractable AES-GCM-256 KEK |
| Positioning | Tagline y README/UI copia: *"Local Cifrado bóveda: Zero-cloud archiving de firmado documentos."* |
| Nuevo módulo bajo `modules/` | `modules/encrypted-archive/` con source, pruebas, README, Prueba_Informe, paquete.json |
| English-only documentación | Todos nuevo documentos, comments y UI strings son Inglés |
| Ningún personal ruta leakage | Ningún absolute home-directory rutas en cualquiera módulo documento |
| licencia con derechos y obligaciones | Raíz `LICENSE` cubre este módulo; README §10 enlaces a esto |
| Tres watermark layers | Source encabeceras, styled consola firma, corregido UI pie de página |

---

## 2 · Entregables

| Archivo | Finalidad |
| --- | --- |
| `index.html` | Independiente bóveda: sello, lista, desbloquear, descargar, borrar |
| `src/crypto.js` | PBKDF2, AES-GCM, SHA-256, portable Base64/hex |
| `src/container.js` | `.aegis` binary formato: `sealContainer`, `openContainer`, `parseContainer`, `verifyDigest` |
| `src/store.js` | OPFS adaptador, en memoria adaptador, id validation |
| `src/vault.js` | Producto API: `seal`, `open`, `list`, `remove`, `stats`; 64 MB guarda |
| `src/main.js` | Archivo intake, metadatos JSON, desbloquear panel, descargar, debug superficie |
| `src/style.css` | Dark + oro visual language compartido con el comando centro |
| `tests/container.test.mjs` | 10 pruebas / 11 aserciones |
| `tests/vault.test.mjs` | 6 pruebas |
| `tests/store.test.mjs` | 6 pruebas |
| `package.json` | `npm test` → `node --test`, cero dependencias |
| `README.md` | Formato, parameters, integración, limitaciones |
| `TEST_REPORT.md` | Medido salida, matrix, navegador aceptación, defectos |

Modificado outside el módulo:

| Archivo | Cambio |
| --- | --- |
| `aegis-shell/index.html` | Stepper gains paso 5; bóveda tarjeta; archivo botón; frase de contraseñun `<dialog>` |
| `aegis-shell/src/app.js` | Per-load sala id; direct bóveda importación; verified-artifact puerta de calidad; archivo flujo |
| `aegis-shell/src/style.css` | Oro botón, bóveda tarjeta, dialog y backdrop styles |
| `modules/e2e-signed-delivery/src/main.js` | Emite `signed:verified`; accepts `signed:run-demo` de el shell |
| `modules/e2e-signed-delivery/src/sdk/pdf.js` | Verificación resultado ahora incluye el recomputed SHA-256 |
| `modules/e2e-signed-delivery/src/sdk/transport.js` | Per-load señalización sala |
| `README.md`, `DELIVERY_REPORT.md` | módulo 02 sections |

---

## 3 · Arquitectura decisions

**Sello en el shell, browse en el módulo.** OPFS es scoped a el origen, no a un marco
o un módulo. El primero attempt aprobado el artefacto Blob a un oculto bóveda iframe sobre
`postMessage`; control mensajes arrived pero el carga útil hizo no, y el dialog hung en
`Sealing…`. El shell ahora importaciones `createVault` y `openOpfsStore` directamente. Este removes
un marco, un mensaje hop y un entire clase de fallo, mientras el independiente página aún
browses el mismo `/aegis-vault` carpeta.

**Uno contenedor, ningún sidecar índice.** Un separado `index.json` sería filtración archivo nombres incluso
cuando bloqueado. En cambio, cada `<uuid>.aegis` archivo es self-contained; el listing muestra solo
ID y texto cifrado sizes. Nombres, calcula le hash, firmante ID y el verificación reason appear
después un successful descifrar.

**Two distinct fallo mensajes.** `integrity check failed` es reachable sin un
frase de contraseñun (digest mismatch), `unlock failed` requiere un GCM etiqueta mismatch. Un operador puede
tell almacenamiento corruption de un incorrecto frase de contraseñun aintes spending 250,000 PBKDF2 iterations.

**Cero el staging búfer en cada ruta.** `sealContainer` wraps el texto sin cifrar carga útil en
`try/finally` y llamadas `payload.fill(0)`, incluyendo cuando KDF o `encrypt()` lanza. Un prueba
monkeypatches `crypto.subtle.encrypt` a capture el búfer y assert cada byte es cero
después sellado retorna.

**Per-load señalización salas.** Un corregido BroadcastChannel sala let un desactualizado pestaña answer otro
tab's WebRTC offer (`setRemoteDescription` errores). Ambos demo flows ahora usar un aleatorio suffix
generado una vez por página carga.

---

## 4 · Verificación

- Headless: `node --test` → **23 / 23 aprobado**, 0 fallo, ~3.3 s.
- navegador: **Prueba firmado entrega → Verificado (2 firmantes) → Archivo a bóveda → Sello a
  bóveda** producido un 53,324-byte contenedor para un 52,576-byte artefacto; el barra lateral showed
  `1 sealed record · 52.1 KB ciphertext · opfs` aintes y después un recargar.
- Cross-surface: el independiente bóveda página informado `1 record` y uno row para el registro
  el shell tenía escrito, proving el compartido OPFS directorio.
- Cobertura de negative rutas: incorrecto frase de contraseñun, manipulado texto cifrado, falsificado digest, roto
  magic, truncated contenedor, short frase de contraseñun, vacío archivo, tamaño cap, traversal ID.

Completo evidencia: `TEST_REPORT.md` §3–§5.

---

## 5 · Conocido limitaciones

1. **64 MB por registro** — sellado es en memoria; un chunked/streaming contenedor es el siguiente
   paso para grande escanea.
2. **Ningún recuperación** — losing el frase de contraseñun loses el registro; allí es ningún escrow clave.
3. **Ningún clave rotación o re-wrap** — re-sealing produces un nuevo id y deja el antiguo archivo
   para explícito deletion.
4. **OPFS eviction** — clearing sitio datos o almacenamiento pressure removes el bóveda. El
   contador es persistent a través de reloads y pestañas, pero esto es no un copia de seguridad.
5. **navegador soporte** — Chrome/Borde 113+; otros browsers fall atrás a un clearly labelled
   volatile memoria bóveda así el contenedor lógica permanece demonstrable.

---

## 6 · licencia y atribución

**Abierto source, Apache-2.0** — véase `LICENSE`.

Atribución layers presente:

1. Encabezado comment en cada source archivo (`Jerome Young`, Apache-2.0).
2. Styled consola firma en página carga.
3. `ENGINE BY JEROME YOUNG` corregido en el pie de página.

Contacto: **jeromeyoung608@gmail.com**
