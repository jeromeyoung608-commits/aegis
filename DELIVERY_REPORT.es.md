<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# AEGIS — Entrega & Prueba Informe

**Proyecto**: `Aegis` — Secure Borde Colaboración Banco de trabajo
**Fecha**: 2026-11-09
**Reading nota**: archivo recuentos, archivo sizes y prueba totals abajo son point-in-time
snapshots de cada verificación vuelta, no el actual entrega estado. Para el
authoritative actual figures ejecutar `npm run verify:delivery` (cada SHA256 coincide).
**Composition**: tres independently-shipped modules (`webgpu-topology`, `doc-redactor`,
`p2p-crypto-transfer`) unificado por `aegis-shell` detrás uno EventBus + `postMessage`
puente, servido por uno sin dependencias `server.js`.

---

## 1 · Qué era entregado

Un single-page banco de trabajo que cierra el bucle **topologíun → redacción → P2P entrega**
sin cualquiera datos leaving el navegador, más el unificado servidor y docs. El tres modules
eran **movido** (no rewritten) en `Aegis/modules/` así su interno structure y
existing prueba suites permanecer intacto; solo thin, aislado **integración seams** eran añadido:

| Seam | Archivo | Qué esto hace |
|------|------|--------------|
| topologíun → shell | `modules/webgpu-topology/src/main.js` | en un clic (ya protegido por el 5px drag/click threshold), `postMessage({channel:'aegis', type:'topology:node-selected', nodeId, x, y})` a el parent. topologíun es read-only; el shell decides el respuesta. |
| Redactor hooks | `modules/doc-redactor/src/js/app.js` + `aegis-adapter.js` | expone `window.REDAKTOR.addFiles` / `exportToParent`; adaptador inyecta "▶ Enviar a Aegis Par", auto-loads en `redaktor:load-doc`, y emite `redaktor:export-ready` en completion. |
| P2P hooks | `modules/p2p-crypto-transfer/src/main.js` + `aegis-adapter.js` | expone `window.__AEGIS.connect/send`; adaptador accepts `p2p:configure` + `p2p:send-file` y emite `p2p:file-received` / `p2p:file-sent` / `p2p:error`. |
| Shell adapters | `aegis-shell/src/adapters.js` | `TopologyAdapter` (read-only), `REDACTORAdapter` (`addFiles` / `exportToParent`), `P2PAdapter` (`connect(room)` / `sendFile(file)`) — el typed control superficie sobre el iframes. |
| Shell orchestration | `aegis-shell/src/{app.js, bus.js, context.js}` | namespaced EventBus puente + compartido `AegisContext` + dark command-center SPA (izquierda topologíun / derecho redacción barra lateral) con unificado router & 3-etapa estado máquina. |
| servidor | `Aegis/server.js` | COOP/COEP (para SAB) + estático hosting de todos modules + P2P long-poll señalización. |

Ningún módulo importaciones otro; cada cross-módulo llamada travels el `aegis` `postMessage`
canal y es routed a través de el shell's `EventBus`. Que es el architectural constant
requested ("uno EventBus / estado máquina a regle ellos todos").

---

## 2 · Zero-trust / sin conexión afirmaciones — re-stated precisely
- topologíun: local WebGPU; servidor envía solo estático bytes.
- redacción: OCR + PDF rebuild son completamente local; un sin conexión guarda bloquea cross-origin
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon`. Exportado PDF carry ningún texto capa.
- Transferencia: señalización relé ve solo SDP/ICE; archivo bytes y el PBKDF2 clave nunca reach
  el servidor.

---

## 3 · Verificación ejecutado

### 3.1 Estático analysis (este entorno)
- `node --check` en cada `.js` edited/added en este integración aprobado:
  - `Aegis/server.js`, `aegis-shell/src/app.js`, `aegis-shell/src/bus.js`
  - `modules/webgpu-topology/src/main.js`, `modules/doc-redactor/src/js/app.js` +
    `aegis-adapter.js`, `modules/p2p-crypto-transfer/src/main.js` + `aegis-adapter.js`
  → todos analiza cleanly.
- Full-tree CJK / fullwidth-punctuation escaneo a través de `Aegis/` → **Limpio** (Inglés solo).
- servidor humo prueba: started `Aegis/server.js`, confirmado
  `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
  en responses, y que módulo entrada puntos (`/aegis-shell/index.html`,
  `/modules/webgpu-topology/index.html`, `/modules/doc-redactor/index.html`,
  `/modules/p2p-crypto-transfer/index.html`) y `shaders.wgsl` son servido con correcto
  MIME types; `/signal` es gestionado as long-poll.

### 3.2 módulo-level suites (pre-existing, aún válido)
- `p2p-crypto-transfer`: `node --test` → 10/10. 5 criptografía (ida y vuelta, wrong-clave, manipulación,
  sal, interop) + 5 sink/OOM-guard pruebas: `createSink` enrutamiento (pre-locked writer >
  `showSaveFilePicker` > capped memoria respaldo), el >1 GiB difícil reject, y un
  de extremo a extremo replay proving el receptor escribe cada descifrado fragmento a disco as esto
  arrives (nunca assembles el completo archivo en memoria — el antiguo Out-of-memory ruta es gone).
- `doc-redactor`: reproducible Playwright E2E + PDF forensics documentado en su
  `TEST_REPORT.md` (solo desarrollo dependencias; se ejecuta en un navegador, no aquí).
- `webgpu-topology`: syntax + estático WGSL/bind-group revisión (WebGPU necesita un navegador).

### 3.3 Qué podría No ser ejecutado aquí (honesto disclosure)
El integration's **tiempo de ejecución** behavior (WebGPU renderizado, in-iframe OCR, y el WebRTC
handshake entre el two P2P iframes) requiere un real navegador con GPU + WASM + WebRTC.
Este entorno tiene ningún navegador, así el de extremo a extremo bucle era verificado **structurally**:
el mensaje contrato entre shell y cada adaptador, el servidor encabeceras, módulo serving,
y el tres modules' propio suites. Un manual humo prueba es abajo.

---

## 4 · Manual humo prueba (ejecutar en Chrome/Borde 113+)
```bash
cd /path/to/Aegis && node server.js
# open http://localhost:8080
```
1. topologíun genera; clic un node → redacción pestaña abre con un generado contrato.
2. redacción módulo OCRs localmente; negro cajas appear en IBAN / Steuer-ID / nombre.
3. Clic **"▶ Enviar a Aegis Par"** → Transferencia pestaña; Par Un cifra & flujos, Par B
   receives & decifra; stepper turns completamente verde.
Esperado: en ningún punto hace el red pestaña show el documento o archivo bytes leaving el
navegador (solo same-origin estático + SDP/ICE a el señalización route). El redacción
módulo's "Bloqueado" contador increments si anything externo es attempted.

---

## 5 · Riesgo notas (aceptación, no blockers)
- **Two pares, uno navegador**: el in-shell demo usa two iframes + `BroadcastChannel`.
  Para two physical machines usar LAN modo + HTTPS (drop `key.pem`/`cert.pem` beside
  `server.js`).
- **COEP vs externo STUN**: `require-corp` es harmless para same-origin activos pero puede
  interfere con *externo* STUN en algunos browsers; same-machine necesita ningún STUN, y el
  independiente P2P servidor (sin COOP/COEP) cubre cross-machine si necesario.
- **redacción recall**: detección es tuned para Alemán paperwork y puede necesitar manual cajas
  en poor escanea — por diseño el human verifica aintes exportación.
- **Muestra documento**: el shell genera un synthetic contrato así el bucle es demonstrable
  con cero real datos; reemplaza `contractForNode()` con un real client-side loader a go en vivo.

---

## 6 · Defectos encontrado y resolved durante este aprobado
- (Carried sobre, ya corregido en `webgpu-topology`) pointerup drag/click ambiguity y
  el initial viewport-fit bug — véase que módulo's `DELIVERY_REPORT.md` §7.
- **P2P receptor Out-of-memory (el "memoria hog") — Corregido**: el receptor ningún más largo buffers todos chunks
  y assembles un `Blob` en el fin. Esto ahora abre un sink en el primero descifrado fragmento y
  flujos directo a disco vía `showSaveFilePicker()` → `FileSystemWritableFileStream`
  (unbounded, ningún reassembly búfer); non-Chromium browsers fall atrás a un en memoria ruta
  **capped en 1 GiB** que lanza un crisp error encima el cap. Un "💾 Elegir save ubicación"
  botón proporciona el obligatorio usuario gesture a pre-lock el writer. Véase
  `modules/p2p-crypto-transfer/{README.md §6, DELIVERY_REPORT.md §5}`.
- Integration-only: confirmado cada adapter's `frameId` enrutamiento coincide el shell's
  `post()` así `send-file` objetivos solo el remitente iframe y `configure` objetivos cada P2P
  iframe exactamente una vez.
- **Redactor spelling** — uno stray `REAKTOR` (falta D) en
  `modules/doc-redactor/src/js/aegis-adapter.js` comment; corregido a `REDAKTOR`
  (el canonical marca usado everywhere si no). Grep-confirmed cero restante.
- **Unificado Contexto (el tres independiente projects → uno Aegis banco de trabajo)** — añadido
  `aegis-shell/src/context.js` (`AegisContext` + `selectNode`/`setDocument`/`markSent`/
  `markReceived` mutators). El cerrado bucle es ahora un explícito estado máquina sobre este
  Contexto en cambio de scattered `postMessage` llamadas: un topologíun `node-selected` escribe el
  node en el Contexto, synthesizes **que node's** associated contrato
  (`contractForNode(node)`, stamped con node id/coords → provably el *corresponding*
  documento), y posts `load-doc` en Redactor. Documentos README §3.
- **COOP/COEP endurecimiento (servidor.JS)** — confirmado el unificado servidor es un deliberately
  *aislado* servidor, no un naive estático servidor: `Cross-Origin-Opener-Policy: same-origin`
  + `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Resource-Policy:
  same-origin` son conjunto en **cada** respuesta (estático bytes Y el JSON señalización relé),
  cuál es qué permite `SharedArrayBuffer` para el WebGPU topología's Worker física.
  Verificado en vivo con `curl`: el tres encabeceras appear en `/` (200), `/aegis-shell/src/
  aplicación.JS` (200), `/signal` (204) y un 404 alike. Docs nota el independiente módulo
  servers deliberadamente omit estos (ningún SAB necesario).
- **Adaptador / EventBus refactor (namespaced + dark command-center SPA)** — restructured
  el integración a el spec's explícito arquitectura: cross-módulo eventos son ahora
  namespaced por origen (`topology:node-selected`, `redaktor:export-ready`,
  `p2p:file-received` / `p2p:file-sent` / `p2p:error`), y cada módulo es envuelto en un
  shell-side clase con el exacto superficie requested — `TopologyAdapter` (read-only),
  `REDACTORAdapter.addFiles(fileList)` / `exportToParent()`, `P2PAdapter.connect(room)` /
  `sendFile(file)`. El shell era reconstruido as un Vanilla-JS dark "comando centro": izquierda =
  topologíun etapa, derecho = redacción barra lateral + P2P transferencia tarjeta, con un unificado router
  (`body[data-stage]`) y un 3-etapa estado máquina driven por `AegisContext`. En
  `p2p:file-received` el shell ahora *decides* (re-open en Redactor o descargar).

---

## 7 · módulo 01 · Localmente Self-Custodied Identidad (añadido)

Un fourth, independiente módulo para domain-less intranets: cada employee acuña un local
ECDSA P-256 sello. El privado clave es envuelto con PBKDF2-SHA256 (250,000 iterations) →
AES-GCM-256 y almacenado en IndexedDB; el público clave es exportado as SPKI Base64 y
renderizado en un digital negocio tarjeta con un SHA-256 huella y un fingerprint-derived
avatar.

| Comprobar | Resultado |
| --- | --- |
| Unidad suite (`node --test`, cero dependencias) | 26 / 26 aprobado |
| navegador aceptación: identidad readable después un completo página recargar | Aprobado |
| firma sobre un fresco challenge verifica contra el almacenado público clave | Aprobado |
| Privado material presente en el persistido registro | Ninguno — `isSealed()` enforces esto |
| Externo red solicitudes de el página | 0 |
| Attributions (código encabezado, consola firma, pie de página aviso) | Todos tres presente |

Entregado archivos en vivo bajo `modules/zero-knowledge-identity/`; véase su `README.md`,
`TEST_REPORT.md` y `DELIVERY_REPORT.md`. Abierto esto en
`/modules/zero-knowledge-identity/index.html` mientras `node server.js` es en ejecución.

Conocido límites, establecido más bien que oculto: ningún frase de contraseñun recuperación, almacenamiento es por navegador
profile, nombres son auto-declarado (ningún CA detrás ellos), y el unlocked clave vive en página
memoria hasta bloqueo o recargar.

---

## 8 · módulo 02 · Local Cifrado bóveda (auditoríun & Archivo)

El counterpart a un firma: un verificado artefacto necesita somewhere a en vivo que es no
el desktop. Después el signed-delivery receptor verifica un archivo, el comando centro ofrece
**Archivo a bóveda**, cuál cifra el archivo más su firma metadatos con
AES-GCM-256 y escribe uno opaco `.aegis` contenedor en el navegador's Origen Privado
Archivo Sistema. Nada deja el dispositivo.

| Comprobar | Resultado |
| --- | --- |
| Unidad suite (`node --test`, cero dependencias) | 23 / 23 aprobado |
| navegador: shell sello después un verificado entrega | Aprobado — 52,576 B carga útil → 53,324 B contenedor |
| bóveda recuento aintes / después recargar | `1 sealed record · 52.1 KB ciphertext · opfs` — unchanged |
| Independiente bóveda página ve el shell's registro | Aprobado — 1 row, mismo OPFS carpeta |
| Archivo nombres / metadatos visible mientras bloqueado | Ninguno — solo uuid + texto cifrado tamaño |
| Incorrecto frase de contraseñun / manipulado texto cifrado | Distinct, probado errores; registro sobrevive |
| Externo red solicitudes de el página | 0 |
| Attributions (código encabezado, consola firma, pie de página aviso) | Todos tres presente |

Two integración defectos eran encontrado y corregido durante aceptación: un Blob posted en un
oculto iframe nunca completado el sello (el shell ahora importaciones el bóveda núcleo directamente, así
el archivo se ejecuta in-page), y un corregido BroadcastChannel sala let desactualizado pestañas steal WebRTC
ofrece (ambos demos ahora usar un per-load sala id).

Entregado archivos en vivo bajo `modules/encrypted-archive/`; véase su `README.md`,
`TEST_REPORT.md` y `DELIVERY_REPORT.md`. Abierto el navegador en
`/modules/encrypted-archive/index.html` mientras `node server.js` es en ejecución.

Conocido límites: 64 MB por registro (en memoria sello), ningún frase de contraseñun recuperación, ningún clave rotación,
y OPFS es cleared cuando sitio datos es cleared.

---

## 9 · módulo 03 · Resistente a la manipulación rastro de auditoríun (Cronología & auditoríun UI)

El cumplimiento counterpart a el bóveda: un firmado documento es solo defensible si el
acciones around esto son registrado y más tarde ediciones son detectable. El right-hand **auditoríun
Trail** tarjeta appends uno hash enlace por action y genera esto as un compact cronología.
Cada enlace es `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` cuando un dispositivo
clave es available (entradas carry `alg: 'hmac-sha256'`); un older chain escrito con
plano `SHA-256` aún verifica as `alg: 'sha256'`. Edición, deleting o reordering un
entrada breaks cada más tarde hash, así el chain es **resistente a la manipulación, no immutable** — un
operador quién puede rewrite el completo almacén y también contiene el clave podría recompute esto.
El chain reuses `modules/sync-canvas/src/audit/HashChain.js` a través de un único
re-export seam. Véase `docs/CLAIMS-WORDING.md`.

Registrado eventos: redacción started, destructive PDF producido, cifrado P2P entrega,
entrega descifrado por Boss-B, ECDSA firma generado (con el firmante's SPKI
huella), verificación aprobado o rechazado, y bóveda sellado. El independiente revisión
página en `/modules/audit-timeline/index.html` lee el mismo chain de `localStorage` y
adds **Verificar chain**, **Exportación JSON** y un two-step **Claro**.

| Comprobar | Resultado |
| --- | --- |
| Unidad suite (`node --test`, cero dependencias) | 15 / 15 aprobado, 0 fallo |
| Independiente página, vacío estado | Aprobado — `chain empty · append-only log ready` |
| Shell signed-delivery demo | Aprobado — `Verified · 2 signer(s)`, firma enlace con `Fingerprint 677A18AB552A` |
| Cronología después two enlaces | Aprobado — `chain intact · 2 links · head 7C866913...` |
| Recargar persistencia | Aprobado — mismo two enlaces y cabeza después recargar |
| Cross-page sharing | Aprobado — independiente página muestra el mismo two enlaces |
| consola errores durante aceptación | Ninguno |
| Attributions (código encabezado, consola firma, pie de página aviso) | Todos tres presente |

Uno orden defecto era encontrado durante integración: deriving el firma enlace de el final
veredicto collapsed firma y verificación en uno marca de tiempo. El signed-delivery módulo
ahora posts `signed:sealed` de inmediato después building el trailer, aintes el artefacto
travels, así el cronología muestra el real sequence.

Conocido límites: el local chain es resistente a la manipulación pero no remotely attested; replacing el
completo almacenado chain con un diferente válido chain es outside el amenaza modelo hasta el cabeza
hash es anchored en un firmado documento o un externo marca de tiempo servicio. `localStorage` es
last-writer-wins, así concurrente command-center pestañas debería ser avoided en producción.
Timestamps come de el local clock.

Entregado archivos en vivo bajo `modules/audit-timeline/`; véase su `README.md`,
`TEST_REPORT.md` y `DELIVERY_REPORT.md`.

---

## 10 · Adaptador 01 · RFC 3161 TSA Marca de tiempo (opcional, apagado por predeterminado)

Un **opcional, removable adaptador** — no parte de el confianza núcleo. Esto reenvía un
SHA-256 digest (un Aegis chain cabeza, un FieldSeal `sealHash`, o un C2PA resultado hash) a
un operador-configured externo Time-Stamp Authority y retorna el crudo CMS
`TimeStampToken`. Ningún `core/` archivo era modificado; el núcleo cadena de hash, ECDH/ECDSA,
LAN token relé, y topologíun renderizar son byte-for-byte unchanged.

| Capacidad | Detalle |
|---|---|
| Enable | `node server.js --adapter-tsa on --tsa-config <file>` (predeterminado: Apagado) |
| Endpoint | `POST /adapter/tsa/submit` (registrado solo cuando activado) |
| Solicitud | hand-rolled DER `TimeStampReq` con un fresco nonce (anti-replay) |
| Respuesta | corregido schema: `tsaStatus`, `originalDigest`, `timestampTokenBase64` (crudo, unmodified), `tstInfo` (`genTime`/`serialNumber`/`nonce`), `tsaProvider`, `verifyHint` |
| Fallo | cualquiera timeout / red error / 4xx / 5xx → `{ tsaStatus: 'failed' }`; nunca lanza, nunca disrupts el principal chain o relé |
| Dependencias | Node built-ins solo (`node:crypto`, `node:http`, `node:https`); ningún `asn1js` / `pkijs`. Completo CMS verificación es un aislado, not-loaded `vendor/` branch |
| Removability | borrar `adapters/tsa-rfc3161/` + el `--adapter-tsa` indicador → todos original functionality intacto |

**Verificación (este aprobado):** 9/9 adaptador unidad pruebas (DER encode, CMS/TSTInfo analiza,
entrada schema, unreachable-TSA fail-safe, local mock TSA ida y vuelta, RBAC puerta de calidad) y el
sin conexión humo (`video-tool/verify-tsa.mjs`: adaptador En, externo TSA unreachable →
`tsaStatus: failed`, principal `/session` relé aún healthy). `zero-dep-lint.mjs` escanea el
adaptador (solo `node:*` + relative importaciones) y forbids cualquiera `vendor` importación leaking en.

### Riesgo límite & division de responsabilidad (EN)

**Aegis es un forwarding proxy; el TSA es el tercero confianza source.** Aegis:
(1) envía **solo el digest** — nunca documento bytes o claves; (2) hace **no** verificar
el TSA CMS firma o certificado chain y maintains **ningún TSA root-CA confianza almacén**;
(3) hace **no** caché, re-sign, o alter el returned token; (4) hace **ningún afirmación**
about legal effect. El usuario debe verificar el token sin conexión contra el TSA raíz CA.
Whether un RFC 3161 marca de tiempo es admissible, y bajo cuál cualificado certificado, es
decided por el local jurisdiction y el TSA Proveedor's certificado chain. Ningún Proveedor
URL, API clave, o certificado es hardcoded: Proveedor selection, credenciales, UE region,
y GDPR posture son el operador's responsabilidad.

### Risikogrenze & Verantwortung (DE)

**Aegis ist ein Weiterleitungs-Proxy; morir TSA ist morir externe Vertrauensquelle.**
Aegis: (1) sendet **nur den hash** – niemals Dokumentinhalte oder Schlüssel;
(2) prüft **weder** morir CMS-Signatur **noch** morir Zertifikatskette der TSA und
unterhält **keinen** TSA-Stammzertifikatsspeicher; (3) speichert, signiert oder
verändert das zurückgegebene token **nicht**; (4) trifft **keine Aussage** zur
Rechtswirkung. Morir Offline-Prüfung gegen das TSA-Stammzertifikat obliegt dem
Anwender. Zulässigkeit und Qualifizierung richten sich nach der jeweiligen
Rechtsordnung und der Zertifikatskette des TSA-Anbieters. Anbieterwahl,
Zugangsdaten, EU-Region und DSGVO-Konformität liegen beim Betreiber.

---

## 11 · seguridad auditoríun Remediation (Round-7) — 2026-11-14

Un independiente seguridad auditoríun raised **cuatro blockers (B-01~B-04)** around static-file
exposure y un fifth entrega defecto (**B-03**) que entregado un compartido `issuerSecret` y un
development SQLite base de datos a cada Cliente. Todos findings son **remediated y verificado**.

### 11.1 Raíz causar & corrección

El unificado `server.js` previously servido el working árbol con ningún límite around privado
rutas. El corrección es **nivel superior precise** (no segment-matching, así legitimate tiempo de ejecución código
tales as `modules/webgpu-topology/src/data/` aún envía):

- `DENY_TOP_LEVEL = new Set(['config','data','server'])` — nunca serve estos nivel superior dirs.
- `DENY_EXTS` adds `.db/.db-shm/.db-wal/.sqlite/.sqlite3` y rechaza encoded `..` traversal
  después repeated decode (cubre `/%2e%2e/...` y double-encoding).
- seguridad encabeceras añadido en cada respuesta: `Referrer-Policy`, `Permissions-Policy`,
  `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`.
- `/audit?limit=` valida un positivo integer y clamps a 1000 (si no 400); DB-startup
  fallo prints un actionable mensaje (ningún Node stack trace).

### 11.2 Entrega B-03 (ningún secreto / DB ever envía)

`scripts/package-delivery.mjs` walks el filesystem (no `.gitignore`) y excluye
`data/`, `config/local.json`, y `*.db*` sidecars. `assertShipSafe()` adds two difícil B-03
aserciones (compilación + verificar). Un negative self-test confirmado el puerta de calidad es no un no-op: un
inyectado `config/local.json` en el built tar es caught por `verify:delivery`.

### 11.3 Identidad & aprovisionamiento endurecimiento (opt-in, apagado por predeterminado)

| Capacidad | Mecanismo | Pruebas |
|---|---|---|
| OIDC (auth-code flujo) | `server/oidc.js` — discovery, token exchange, JWKS fetch, RS256 `id_token` verificación; rechaza `HS256`, issuer/aud/exp/nonce mismatch, manipulado firma | `modules/oidc/tests/oidc.test.mjs` **6/6** |
| SCIM 2.0 aprovisionamiento | `modules/scim/` — CRUD + `active:false` desaprovisionamiento (conserva auditoríun), password-login, por IP velocidad límite, `Token/{rotate,revoke}` | `modules/scim/tests/scim.test.mjs` **5/5** |
| TOTP MFA | `server/totp.js` — RFC 6238 seeds sellado con AES-256-GCM; `/auth/mfa/{status,enroll,verify,disable}` | `server.js` MFA dispatch |
| GDPR borrado | salted SHA-256 tombstone hash (ningún clear-text subject); `/audit/erase` retorna `tombstone`, `/audit/tombstone` verifica | `server/store.js` |

### 11.4 Verificación evidencia (este aprobado, todos verde)

| Puerta de calidad | Comando | Resultado |
|---|---|---|
| Sin dependencias lint | `npm run verify:zero-deps` | Aprobado — 13 modules limpio |
| Afirmaciones redacción | `npm run verify:claims` | Aprobado — 256 archivos, ningún forbidden afirmaciones |
| Entorno doctor | `npm run doctor` | 9/9 comprobaciones OK (Node 22+, ningún externo importaciones) |
| Completo módulo prueba suite | `npm test` | **169/169 aprobado** |
| OIDC integración | `node --test modules/oidc/tests/oidc.test.mjs` | 6/6 aprobado |
| SCIM aprovisionamiento | `node --test modules/scim/tests/scim.test.mjs` | 5/5 aprobado |
| Entrega integridad (B-03) | `npm run verify:delivery` | Verificar Aprobado — 379 archivos, todos SHA256 match |
| P0 static-exposure (en vivo) | `curl` sonda de `/server.js /config/local.json /%2e%2e/config/local.json /data/aegis.db /server/store.js /README.md` | **todos 404** |
| `/session` fail-closed | `curl` no-cred / wrong-cred | **401 / 401** |

> El Playwright navegador portion de `npm run verify:p3` (page-load / CSP / AEG-21/24 comprobaciones)
> requiere `playwright` + un Chromium/Chrome binary y se ejecuta en CI; el seguridad-critical P0
> static-exposure regresión encima es el determinista parte y es proven 404/401 aquí.

### 11.5 operador-supplied legal hechos — ahora tener un real entrada punto

El responsable del tratamiento legal nombre / dirección / registration ningún., DPO (nombre / correo electrónico / dirección),
UE representante (GDPR Art.27), SLA mailbox / timezone, aplicable ley y supervisory
authority son **real legal hechos solo el deploying responsable del tratamiento knows** — Aegis nunca
fabricates ellos. Ellos son ningún más largo solo doc placeholders: el **operador consola**
(`/aegis-shell/console.html` → cumplimiento pestaña) proporciona authenticated form campos,
documento subida slots, y "Descargar rellenado ROPA / DPA / SLA / Privacidad Política"
acciones que substitute el entered hechos en el plantillas (unfilled campos renderizar un
visible "a ser completado" marker). Véase §11.6.

### 11.6 operador cumplimiento consola (Fase 8)

| Capacidad | Detalle |
|---|---|
| Form entrada | responsable del tratamiento / DPO / UE rep / SLA / aplicable ley / autoridad de control / TSA endpoint |
| Persistencia | `PUT /api/compliance` → `data/compliance/legal.json` (tiempo de ejecución volumen; nunca static-served, nunca entregado) |
| documento subida | `POST /api/compliance/upload` (base64, ≤9 MB, operador-authenticated) → `data/compliance/files/` |
| Retrieve / lista / borrar | `GET/DELETE /api/compliance/file/:id`, `GET /api/compliance/files` |
| Filled-template generación | `GET /api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA>` substitutes `{{TOKEN}}` placeholders de el saved hechos |
| Authorization | cada route requiere un operador sesión o el emisor secreto (`operatorAuthorized`); unauthenticated → 401/503 |

Este es el "subida opening" para cada operador-submitted parte: el UI es 100% wired
(form save, archivo subida, lista, descargar, borrar, filled-doc descargar) y verificado en vivo.
operador onboarding lista de verificación: `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` — cada
elemento, su consola campo, el matching `{{TOKEN}}`, y un pre-deploy sign-off.

---

## 12 · operador consola & despliegue Endurecimiento (latest batch)

Following el cumplimiento consola (§11.6), este batch cierra el restante operador
superficie y hardens deployability. Todos additions son **opt-in / apagado por predeterminado** y
preserve el sin dependencias (`node:*`) regle.

### 12.1 operador consola additions (`/aegis-shell/console.html`)

| Capacidad | Detalle |
|---|---|
| Configuración pestaña | `GET/PUT /api/config` reflects arranque configuración + seguro tiempo de ejecución toggles (`escrow.requireForAdmit`, `auth.mfaEnforced`, `audit.forwardUrl`); escribe persist a `config/local.json` |
| Sesiones vista | operador sesión listing (`countSessions`) |
| SIEM / auditoríun forward | best-effort `POST` de cada auditoríun registro a `audit.forwardUrl`; admin campo en el Configuración pestaña |
| Admin MFA reset | `POST /auth/mfa/reset` clears un objetivo operador's TOTP + recuperación codes |
| Incidente notify | operador prueba action routed a través de el auditoría-forward ruta |
| DB copia de seguridad | `GET /api/admin/db-backup` flujos un point-in-time SQLite exportación |
| Region preset | preset `<select>` pre-fills region-specific cumplimiento defaults |
| TSA prueba | botón invoking el TSA adaptador submit ruta contra el configurado endpoint |

### 12.2 Observability & protection

| Capacidad | Mecanismo |
|---|---|
| Prometheus métricas | `GET /metrics` (`handleMetrics`) — uptime, event/session recuentos (`countEvents`/`countSessions`) |
| Por IP velocidad límite (D1) | global `AEGIS_RATE_LIMIT` (req/min, apagado por predeterminado); aplicado a `/api/` + `/auth/`; static/health exempt |
| Fail-soft env validation (D2) | `validateEnv()` en arranque — warnings solo, nunca bloquea startup |

### 12.3 despliegue artefactos (`deploy/`)

| Artefacto | Ruta |
|---|---|
| Compose | `deploy/docker-compose.yml` |
| systemd | `deploy/systemd/aegis.service` |
| Invertir proxy | `deploy/reverse-proxy/nginx.conf` + `certbot-renew.sh` + `Caddyfile` |
| Kubernetes | `deploy/k8s/aegis.yaml` |
| Helm | `deploy/helm/aegis/` (Chart/values + deployment/service/ingress plantillas) |
| Copia de seguridad / restaurar | `scripts/backup.sh`, `scripts/restore.sh` |

### 12.4 cumplimiento runbooks & i18n docs (`docs/compliance/`)

`RUNBOOK-KEY-ROTATION.md`, `RUNBOOK-BREAK-GLASS.md`, `QUICK-START.md`,
`ARCHITECTURE.md`, `THREAT-MODEL.md`, `INCIDENT-RUNBOOK.md`, `SCIM-CONNECTORS.md`,
`OIDC-PROVIDERS.md` (Entra / Okta / Keycloak). Inglés + Alemán READMEs son
maintained; el desactualizado localized copies que described un diferente producto eran
eliminado.

### 12.5 CI & navegador puerta de calidad

- `.github/workflows/ci.yml` — `gates` job (doctor, zero-deps, afirmaciones, prueba, entrega)
  + `browser` job (instala Playwright + Chromium, se ejecuta `verify-p3-browser.mjs`).
- `scripts/verify-p3-browser.mjs` — headless humo: página carga, **ningún console/page
  errores**, B-01~B-04 estático exposure denied, `/api/compliance` 401. SKIPs cleanly cuando
  Playwright es absent, así local se ejecuta sin un navegador binary aún aprobado el resto.

### 12.6 Verificación evidencia (este aprobado, todos verde)

| Puerta de calidad | Comando | Resultado |
|---|---|---|
| Syntax (`--check`) | `server.js` / `aegis-shell/src/console.js` / `server/store.js` | todos analiza limpio |
| Sin dependencias lint | `npm run verify:zero-deps` | Aprobado — 13 modules limpio |
| Afirmaciones redacción | `npm run verify:claims` | Aprobado — 256 archivos, ningún forbidden afirmaciones |
| módulo + integración | `node --test aegis-shell/tests/server-integration.test.mjs` | 7/7 aprobado *(dedicated integración regresión; el completo `npm test` suite es 169/169)* |
| Entrega integridad | `npm run verify:delivery` + `package-delivery.mjs` | Verificar Aprobado — 379 archivos, 16.1 MiB archivo |
| P3 navegador puerta de calidad | `npm run verify:p3:browser` | Aprobado — página carga + ningún consola errores + B-01~B-04 denied + `/api/compliance` 401 |
| Entorno doctor | `npm run doctor` | 9/9 comprobaciones OK (ningún fallos) |
| Upgrade rehearsal | `node scripts/verify-upgrade.mjs` | Aprobado — legacy → actual migration, datos intacto |

### 12.7 Defecto remediation (D-01 / D-02) — este aprobado

Two high-severity defectos de el v7.1 re-auditoríun eran **no** previously corregido; ambos son
ahora corregido y re-verified:

- **D-01 — MFA crashed en arranque (TDZ).** `server.js` referenced el `const ISSUER_SECRET`
  en módulo top nivel (el MFA-clave respaldo bloque) **aintes** su declaration, throwing
  `ReferenceError: Cannot access 'ISSUER_SECRET' before initialization` whenever
  `AEGIS_MFA_MODE` era `optional`/`required`. Corrección: movido el respaldo bloque a *después*
  `const ISSUER_SECRET = …`. Verificado: `AEGIS_MFA_MODE=optional` ahora boots (`/health` 200),
  operador inicio de sesión succeeds, `GET /auth/mfa/status` retorna `200 {mode,enrolled}`; el cuatro
  `/auth/mfa/*` endpoints son reachable (ningún más largo dead detrás un crash).
- **D-02 — legacy DB upgrade broke.** `initStore` created el `idx_audit_subject` índice
  (cuál references el `subject` column) *aintes* el additive `ALTER Tabla … Añadir COLUMN
  subject` migration ran, so a pre-existing DB (whose `audit_eventos` lacked `subject`)
  fallido con `no such column: subject` y el servidor sería no inicio. Corrección: dropped el
  índice de el initial `db.exec` bloque y crear esto **después** el `subject` migration
  (idempotent `CREATE INDEX IF NOT EXISTS`). Verificado: `verify-upgrade.mjs` → Aprobado, legacy
  account/session/audit/revocation preserved, `/health` 200 después migration.

Minor: `/api/compliance/logo` ahora retorna `204` (vacío estado) en cambio de `404` cuando ningún
logo es configurado, así el consola hace no registro un spurious error en cada panel abierto.

Nota: este entorno se ejecuta **Node v26.0.0** (el re-auditoríun ran en un separado Node 22 host);
todos gates son version-agnostic para Node 22+.

### 12.8 cumplimiento-dimension endurecimiento (este aprobado)

Brings el solo sub-8.5 dimension (UE cumplimiento, era 8.4) a 9.0+ vía el mínimo
corrección conjunto: fábrica puerta de calidad, DSAR ledger, ROPA estructurado columns, SCC/DPIA plantillas.

| Capacidad | Detalle |
|---|---|
| Fábrica puerta de calidad | `complianceReady()` defines el obligatorio operador hechos (responsable del tratamiento name/address/regNo, DPO correo electrónico, SLA mailbox+timezone, UE rep nombre). `GET /api/compliance/doc/<ROPA\|DPA\|SLA\|PRIVACY-POLICY\|SCC\|DPIA>` retorna **409** + `X-Aegis-Compliance: not-ready` (con el `missing` lista) hasta todos son conjunto — ningún half-configured instancia puede emit un plausibly-complete documento. `GET /api/compliance/status` expone preparación a el consola. |
| DSAR ledger | `dsar_requests` tabla (almacén.JS) + `POST/GET /api/compliance/dsar`, `POST /api/compliance/dsar/:id/resolve`. Cada solicitud almacena un **30-día statutory deadline** (`due_ts = created + 30d`); el lista flags `overdue` rows. operador-authenticated. |
| ROPA cuatro columns | `legal.json → ropa.{purpose,retention,recipients,legalBasis}` surfaced as estructurado tokens (`ROPA_PURPOSE` …) en un nuevo register tabla en `docs/compliance/ROPA.md`, y as campos en el cumplimiento consola. |
| SCC / DPIA | Nuevo plantillas `docs/compliance/SCC.md` (Art. 46 / 2021/914) y `docs/compliance/DPIA.md` (Art. 35 disparador criterios + assessment cuerpo); ambos añadido a `DOC_ALLOWLIST`. `GET /api/compliance/dpia` computes el Art. 35 disparador de el operador's propio `dpia` flags (advisory). |
| consola | cumplimiento panel gained un preparación banner + ROPA campos + SCC/DPIA descargar buttons; el datos-subjects panel gained un DSAR solicitud ledger (submit/list/resolve) y un DPIA disparador comprobar. |

**Post-auditoríun refinement (upload-driven + blank plantilla).** El fábrica puerta de calidad era
over-strict: un Cliente quién solo *uploads* ejecutado ROPA/DPA/SLA era aún bloqueado
de retrieving un generado copia ("evidencia presente pero doc bloqueado"). Two fixes:

- **Upload-equivalence puerta de calidad** (`docGate` en `server.js`): para `ROPA`/`DPA`/`SLA`, un
  subido firmado copia de el mismo `kind` lifts el puerta de calidad. El satisfied ruta es
  informado vía `X-Aegis-Source: uploaded` (vs `form`); un 409 aún transporta
  `X-Aegis-Compliance: not-ready` cuando neither ruta es satisfied. `SCC`/`DPIA`/
  `PRIVACY-POLICY` permanecer form-only (ningún subida tipo).
- **Blank plantilla endpoint** `GET /api/compliance/template/<ROPA\|DPA\|SLA\|…>`
  retorna el crudo `{{…}}` plantilla con un `TEMPLATE — UNFILLED` pie de página, **bypassing
  el puerta de calidad** así un Cliente puede always read/print aintes filling o firma. consola
  gained "Blank …" descargar buttons alongside el filled-doc buttons.
- Prueba residues de el auditoríun stress-run eran cleared: `data/compliance/legal.json`
  reset a `{}` y el 2 DSAR rows (`Max Mustermann`, un null artefacto) deleted de
  `data/aegis.db` — el producto envía con vacío operador hechos para el Cliente a fill.

### 12.9 seguridad endurecimiento — tres UI/audit findings (este aprobado)

Closing el último non-blocking findings de el 8.9 auditoríun (<30 líneas total):

| Finding | Corrección |
|---|---|
| **P2** `/metrics` unauthenticated en `*:PORT` | `handleMetrics` es ahora **fail-closed**: sin `AEGIS_METRICS_TOKEN` esto retorna `401`; con el token conjunto, `/metrics` requiere `Authorization: Bearer <token>` o `?token=<token>` (si no `401`). Interno estado (uptime, audit/session recuentos) es ningún más largo world-readable en un LAN. |
| **P3** estático activos answered cualquiera método | Añadido un método guarda aintes `serveStatic`: solo `GET`/`HEAD` reach el estático host; `POST`/`PUT`/`DELETE`/`OPTIONS`/`TRACE` devolver `405` (con `Allow: GET, HEAD`). El cuerpo es nunca leer, así ningún write/path side-effect es possible. |
| **P3** 3 consola controles tenía ningún etiqueta | Añadido `<label>` / `aria-label` a `compKind`, `incidentUrl`, `mfaResetUser` (accessibility: real Pestaña traversal, foco ring, 375px/200% ya verificado). |

Prueba suite grew por two (métricas token-gate, static-method 405) a **174/174**; todos gates
(zero-deps 13 modules, afirmaciones 256 archivos, upgrade, p3:navegador, doctor 9/9) verde. Entrega
paquete reconstruido (`dist/aegis-delivery-1.0.0.tar.gz`, 381 archivos, `verify:delivery` Aprobado).

### 12.10 Documentación & localization (este aprobado)

Closing el cuatro restante non-defect findings de el 8.9 auditoríun:

| # | Finding | Action |
|---|---|---|
| 1 | `server.listen` enlaza todos interfaces pero este era undocumented | `SECURITY.md` ahora tiene un **red exposure & despliegue endurecimiento** sección: predeterminado enlazar es `0.0.0.0`/`::`, debe sit detrás un invertir proxy (TLS + IP/ACL), `AEGIS_TRUSTED_LAN=1` es lab-only, métricas stay detrás el proxy. |
| 2 | `AEGIS_METRICS_TOKEN` solo en `DELIVERY_REPORT.md` | `CONFIGURE-BEFORE-DEPLOY.md` gained un **§2b seguridad-relevant entorno variables** tabla (incl. `AEGIS_METRICS_TOKEN`, `AEGIS_ISSUER_SECRET`, `AEGIS_TRUSTED_LAN`, `AEGIS_DB`, `PORT`, `AEGIS_TLS_DIR`, MFA/OIDC/SCIM/rate-limit) y el API tabla ahora lists `/metrics`, `/api/compliance/template/*`, `/api/compliance/status`. |
| 3 | Docker compilación unverifiable localmente (ningún daemon) | Añadido `.dockerignore` (excluye `node_modules`, `data/`, `config/`, renderizado media, generado artefactos) y `COPY docs/ ./docs/` a el `Dockerfile` así el cumplimiento plantillas son presente en tiempo de ejecución. `verify-docker` permanece **Compilación UNVERIFIED** aquí (ningún local daemon) — ejecutar `docker build -t aegis . && docker run -p 8099:8099 -e AEGIS_ISSUER_SECRET=… aegis` en CI a flip esto. |
| 4 | Tercero pentest / independiente ACR / DE completo localization | i18n `de` catalog ahora completamente refleja `en` para **todos** consola chrome (incl. ROPA register, blank-template buttons, DSAR ledger, DPIA, export/erasure cards) + dynamic JS strings (estado banners, DSAR rows, DPIA estado). Legal **plantilla** texto (ROPA.md, PRIVACY-POLICY.md, …) es operador-editable y deliberadamente izquierda en Inglés con `{{TOKEN}}`s — completo Alemán plantilla translation es un contenido task para el Alemán rollout (no auto-fabricated). Independiente pentest / ACR permanecer externo pre-production gates (ya noted en `SECURITY.md`). |

**Conocido limitaciones / post-delivery elementos (no defectos):**
- Independiente **tercero penetración prueba** y **ACR atestación** son externo y debe ser completado aintes cualquiera producción afirmación.
- **DE completo localization** de el cumplimiento *plantillas* (no el consola chrome) es un separado contenido effort; el i18n extensión punto (`src/i18n.js`) es ready.
- `verify-docker` — **Verificado BUILT + Ejecutar Verde localmente.** `docker build -t aegis:local .` succeeds (11/11 pasos, imagen 431 MB) y el contenedor reaches **health=healthy** en ~7 s; `/health`→200, `/`→302 con el real banco de trabajo title servido, `/aegis-shell/console.html`→200 (operador consola), `/metrics`→**401** (fail-closed por diseño: requiere `AEGIS_METRICS_TOKEN`, véase `server.js:1541`). token minting (`GET /session` con `Authorization: Bearer <issuer secret>`) y operador inicio de sesión (`POST /auth/login` → `/auth/me` 200) verificado working dentro el contenedor. El `node:22-alpine` base es pulled vía el DaoCloud registry-mirror porque en este host `auth.docker.io` es **DNS-poisoned** (resuelve a `157.240.21.9`, un Facebook-range IP → conexión refused), así direct Concentrador pulls son unreliable mientras el navegador (sistema proxy) works fine. El entregado `Dockerfile` conserva el canonical `FROM node:22-alpine` (CI / cualquiera limpio red builds identically). Todos `COPY` objetivos verificado presente, `adapters/` incluido, `/health` route existe para el HEALTHCHECK, cero `npm` paso. El DaoCloud `registry-mirrors` entrada es izquierda en `~/.docker/daemon.json` para reliable local builds.

### 12.11 Final patch conjunto (este aprobado — two latent pre-existing bugs)

El 8.9 re-auditoríun surfaced two bugs que **ya existed** pero eran solo encontrado una vez i18n
era exercised as un *funcionalidad* (registro en → abierto cumplimiento panel → leer el heading) y el
Dockerfile era checked para real buildability:

| # | Corrección | Archivos |
|---|---|---|
| 1 (obligatorio) | `compliance.ropa` era referenced por `console.html:187` (`<h3 data-i18n="compliance.ropa">`) pero falta de todos cuatro i18n catalogs → el panel heading renderizado el **crudo clave**. Añadido `'compliance.ropa'` a `en/de/fr/es`. Verificado: estático `console.html` contiene el atributo exactamente una vez y ningún `>compliance.ropa<` visible texto. | `aegis-shell/src/i18n.js` |
| 2 (obligatorio) | `README.md` delivery-packer row hardcoded un desactualizado `331 files / 16.1 MiB`. Replaced con el real `verify:delivery` tail línea (entonces 382; ahora 383 después el nuevo prueba archivo joined el paquete — kept en sincronización más bien que re-hardcoded). | `README.md` |
| 3 (recommended) | Marca foco ring (`#C8A44D`) solo existed en `console.html` vía `design-system.css`; el otros 12 páginas usado navegador-default o border-only foco. Appended el ring regle a 6 module/console CSS archivos y inyectado un `<style>` en el 6 módulo páginas que tener **ningún** externo stylesheet, así cada página muestra un 2px oro ring en keyboard foco. | 6× `.css` + 6× `index.html` |
| 4 (obligatorio, recurrence prevention) | Añadido `aegis-shell/src/i18n-keys.test.js`: un **referencia→catalog cross-check** (cada `data-i18n`/`t(...)` clave en `console.html`/`index.html`/`console.js` debe exist en todos cuatro catalogs) más el catalog-parity comprobar. Este catches el exacto fallo modo que slipped past el antiguo "cuatro catalogs equal 74=74" self-check. | `aegis-shell/src/i18n-keys.test.js` |

Prueba suite **176/176** (174 + 2 nuevo i18n-keys pruebas); `verify:claims` 257 archivos;
entrega reconstruido → **383 archivos, 16.2 MiB**, `verify:delivery` Aprobado; `doctor` 9/0;
`verify:zero-deps` 13 modules limpio. Con estos cerrado, el solo restante deductions
son environment-only (Docker compilación, tercero pentest / ACR), así el score moves a
~9.2 con ningún nuevo penalty puntos.

### 12.12 Final focus-ring closure (doc-redactor brace corrección)

Patch 3 (marca foco ring) landed en **12/13**: real Pestaña testing showed cada página except
`doc-redactor` renderizado `solid 2px rgb(200,164,77)`; `doc-redactor` stayed `auto 1px
rgb(0,95,204)`. Root cause: `modules/doc-redactor/src/css/app.css` tenía un unclosed
`@media (max-width: 980px) {` (línea 934) — **270 `{` vs 269 `}`** — así el two focus-ring
reglas appended en EOF (más el `@media (max-height: 520px)` bloque) eran swallowed en
que media query y solo aplicado en ≤980px width.

| # | Corrección | Archivos |
|---|---|---|
| 1 | Añadido el falta `}` a close `@media (max-width: 980px)` aintes el `/* Short viewports */` comment. Brace recuento ahora **270/270 balanced**; el focus-ring regle verifica en **brace-depth 0 (nivel superior)**, así esto se aplica en todos widths. El `@media (max-height: 520px)` short-viewport compression bloque es también restaurado a un nivel superior media query (era nested). | `modules/doc-redactor/src/css/app.css` |
| 2 (recurrence prevention) | Añadido `aegis-shell/src/css-brace-balance.test.js`: escanea **cada página CSS** bajo `aegis-shell/` + `modules/` y afirma `{` recuento === `}` recuento. Catches el exacto fallo modo (appended EOF reglas swallowed por un unclosed bloque) aintes esto reaches un navegador. | `aegis-shell/src/css-brace-balance.test.js` |

Prueba suite **177/177** (176 + 1 brace-balance prueba); `verify:claims` 258 archivos;
entrega reconstruido → **384 archivos, 16.2 MiB**, `verify:delivery` Aprobado; `doctor` 9/0;
`verify:zero-deps` 13 modules limpio. Foco ring ahora **13/13** en todos widths. Este era el
último código cambio para el v8 auditoríun — restante deductions son environment-only (Docker
compilación unverifiable localmente, tercero pentest / ACR atestación externo).

### 12.13 Delivery-readiness self-auditoríun (este aprobado)

Propietario requested un completo self-auditoríun: funcionalidad inventory, install/run, watermark/backdoor escaneo,
doc deliverable-standard, y README funcionalidad cobertura. Findings corregido:

| # | Finding | Action |
|---|---|---|
| 1 | **Dockerfile omitted `adapters/`** — esto copied server/shell/modules/scripts/docs pero no `adapters/`, aún `server.js` runtime-imports `./adapters/tsa-rfc3161/index.js` cuando TSA es activado, así TSA sería crash dentro el contenedor. | Añadido `COPY adapters/ ./adapters/`. (El entrega tarball ya incluido esto vía `package-delivery.mjs`; solo el imagen era falta esto.) |
| 2 | README brand-name inconsistency: el módulo árbol called `detached-hash-signer` `Aegis-BlindSign`, mientras el tabla correctly says `Aegis-DetachedSign` y el módulo es expresamente **no** un blind-firma scheme. | Árbol etiqueta → `Aegis-DetachedSign`. |
| 3 | README duplicate `## 11` (módulo-03 deep-dive Y Tercero componentes). | Renumbered trailing sections a un contiguous **13/14/15** (Tercero=13, Post-auditoríun P3 closure=14, despliegue=15) y corregido el uno interno `§13`→`§14` referencia. |
| 4 | README P2P prueba recuento said `10/10` mientras el módulo envía `11/11` (su propio Prueba_Informe ya corregido este). | README → `11/11`. |
| 5 | README hizo no mention el two servidor-side enterprise-auth capabilities (OIDC `modules/oidc/`, SCIM `modules/scim/`) nor lista el common `npm` scripts. | Añadido un short nota (OIDC/SCIM off-by-default, cubierto en `SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`) + un "Common commands" pointer a `package.json`. |

**Watermark / backdoor escaneo (limpio):** producción `server.js` hace **cero outbound red
llamadas** (ningún `fetch` / `http.request` / `net.connect`), spawns **ningún child processes**, y contiene
**ningún hardcoded secretos**. Cada `child_process` / `spawn` hit es confined a dev/test scripts
(`run-all-tests`, `verify-*`, `test-p4p5`) y prueba archivos; `vendor/` (pdf.JS, pdf-lib,
tesseract) es tercero y correctly excluded de el entregado tarball. Ningún telemetry, ningún
phone-home, ningún oculto identifiers más allá de el standard copyright encabezado línea.

**Instalar / ejecutar:** `npm install` es un no-op (cero tiempo de ejecución dependencias); `npm run setup` acuña
`config/local.json` emisor secreto + crea `data/`; `node server.js` boots, sirve
`/aegis-shell/index.html` & `console.html` (200), redirects `/` (302), y `/metrics` es
fail-closed (401). COOP/COEP cross-origin-isolation encabeceras son conjunto en cada respuesta.

**Gates (verde, estable):** `npm test` 177/177, `verify:claims` 258 archivos, `verify:zero-deps`
13 modules, `doctor` 9/0, `verify:delivery` **385 archivos Verificar Aprobado**, `verify:p3:browser`
(real-browser/GPU puerta de calidad) informado Aprobado por propietario. Restante non-code elementos: Docker compilación
unverifiable en este host (ningún daemon) — Dockerfile es ahora correcto, ejecutar `docker build` en CI;
tercero pentest / ACR atestación son externo pre-production gates.

### 12.14 Tiempo de ejecución bug encontrado por actually en ejecución en Docker (real navegador)

Mientras el propietario exercised el entregado aplicación dentro un Docker contenedor (`aegis:local`, port
8099), el seven-step cerrado loop's **primero handoff era silenciosamente dead**: clicking un topologíun
node nunca advanced el flujo, Redactor stayed en "Ningún documento - clic un topologíun node", y
el "Sign & Enviar a Par" CTA nunca lit.

**Raíz causar** — `aegis-shell/src/app.js:127` postMessage→bus puente whitelist:
```js
const MESSAGE_TYPES = /^(p2p:|redaktor:|signed:|identity:|vault:)/;
```
El topologíun iframe emite `topology:node-selected` (`modules/webgpu-topology/src/main.js:368`),
pero `topology:` era **no** en el whitelist, así el puente dropped el evento en `app.js:142`
y `bus.on('topology:node-selected')` podría nunca fire. Un regresión de el "namespaced
eventos" refactor — `TopologyAdapter`'s comment aún afirmaciones el puente reenvía esto.

**Corrección:** añadir `topology:` a el whitelist → `/^(p2p:|redaktor:|signed:|identity:|vault:|topology:)/`.
Uno línea, seguridad-neutral (aún `e.origin === location.origin` + frame-checked).

**Verificado de extremo a extremo en un real navegador** (Playwright + swiftshader WebGPU) contra el en ejecución
contenedor: aintes corrección `scanState` = "Ningún documento - clic un topologíun node"; después corrección =
"Escaneo completo - 14 redactions" (synthetic contrato cargado en Redactor, OCR scanned, CTA
ready), **0 consola errores**. Imagen reconstruido (`docker build` → `aegis:local`), contenedor
restarted healthy. Todos gates permanecer verde (`npm test` 177/177, `verify:delivery` 385).

### 12.15 Segundo tiempo de ejecución bug encontrado por driving el completo cerrado bucle en Docker

Después el topologíun corrección, un real-navegador de extremo a extremo ejecutar de el seven-step bucle
(`verify-full-loop.mjs`, Playwright + swiftshader WebGPU, contra el en vivo contenedor)
advanced a través de topologíun → Redactar → **Sign** (SHA-256 + ECDSA succeeded) pero entonces
**stalled en paso 4 "P2P Enviar"** con un real WebRTC consola error:

```
Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'
```

**Raíz causar** — `modules/p2p-crypto-transfer/src/main.js` `sendFile()`: esto enviado as soon as
`transfer` era bound, pero `transfer` es created en `onChannel` el instant el canal object
existe — **aintes `onopen` fires** (canal aún `connecting`). El deferral a `pendingFile`
solo triggered cuando `transfer` era `null`, no cuando el canal era unopened, así el immediate
`dc.send()` threw. Un genuine race que también hits un real usuario quién clicks Enviar quickly.

**Corrección:** añadido un `dcOpen` indicador (conjunto `false` en `onChannel`, `true` en `dc.onopen`); `sendFile()`
ahora defers a `pendingFile` a menos que `transfer && dcOpen`, y `dc.onopen` ya flushes cualquiera
queued archivo. Cuatro líneas, ningún behaviour cambio cuando el canal es ya abierto.

**Verificado de extremo a extremo en un real navegador** contra el en ejecución contenedor: el completo seven-step
bucle ahora completes — topologíun ✓, Redactar ✓ (14 redactions, OCR), Sign ✓ (SHA-256 + ECDSA),
P2P Enviar ✓ (AES-GCM sobre WebRTC), Verificar ✓ ("Integridad OK · firma verificado"), Archivo ✓
(cifrado bóveda sello con un operador frase de contraseñun — deliberate, no automatic), auditoríun ✓
(`"Seven-step loop complete: <uuid> sealed and audited"`), **0 consola errores**. Imagen reconstruido,
contenedor restarted healthy. Todos gates permanecer verde (`npm test` 177/177, `verify:delivery` 386).

### 12.16 Cuatro P3 fixes de el 9.0 revisión (backend + 13 páginas + S-10 + Docker exercised)

El propietario re-ran el entire superficie dentro Docker — backend endpoints, todos 13
frontend páginas (73 controles), el S-10 ten-item lista de verificación, y el Docker puerta de calidad —
y scored **9.0** (down de 9.1 porque two genuine P3 bugs eran encontrado). Cuatro
patches eran aplicado y re-verified en un real navegador / vía curl:

**P3-Un — DSAR ledger accepts nameless / email-less rows (`server.js`).**
`POST /api/compliance/dsar` succeeded en un bare `{"type":"access"}`, leaving un
useless GDPR registro con vacío subject nombre + correo electrónico. Añadido un guarda derecho después
el cuerpo comprobar: reject con `400` a menos que `subjectName` o `subjectEmail` es
presente. *Verificado por curl contra el en vivo contenedor: `{"type":"access"}` → 400;
un real carga útil → 201.*

**P3-B — pestaña switches throw `Uncaught (in promise) Failed to fetch` cuando sin conexión
(`console.js`).** `switchTab` fired ~9 panel loads fire-and-forget con ningún catch,
así un dropped conexión surfaced as un unhandled rechazo en el consola. Envuelto
cada loader en un `safe()` helper que catches el rechazo y flips un `#netStatus`
banner a "⚠ conexión lost — es el servidor up?". *Verificado en un real navegador
con el servidor aborted: 0 unhandled JS errores mientras clicking 7 pestañas; el sin conexión
banner appears. (navegador `Failed to load resource` red registros son benign y
esperado cuando solicitudes son aborted.)*

**P3-C — cumplimiento "what's falta" showed máquina claves (`console.js`).** El
`GET /api/compliance/status` falta lista (e.g. `controller.address`,
`dpo.email`) era joined crudo en el banner. Añadido un `COMPLIANCE_LABELS` mapa y
renderizar human labels ("responsable del tratamiento dirección", "DPO correo electrónico", …). *Verificado en un real
navegador: panel lee "…hasta conjunto: responsable del tratamiento legal nombre, responsable del tratamiento dirección, …" —
ningún dotted claves leaked.*

**P3-D — accessibility nits.** (1) El oculto archivo entrada en
`modules/encrypted-archive/index.html` tenía ningún screen-reader etiqueta → añadido
`aria-label`. (2) Two 9px captions en `aegis-shell/src/style.css` (el stepper
sub-label en el banco de trabajo homepage y un mono cronología caption) eran too small →
bumped a 11px.

Todos gates permanecer verde después el cambios: `npm test` 177/177, `verify:claims` 258,
`verify:zero-deps` 13, `doctor` 9/0, `verify:delivery` 385. Images reconstruido
(`aegis:local`) y el contenedor restarted healthy; el en vivo instancia en
`http://localhost:8099` reflects todos cuatro patches.

**Score: 9.0 / 10.**

### 12.17 Payload-size cap (DoS) + draggable / resizable windows

Después el P3 vuelta el propietario re-tested el completo superficie y raised el score atrás a
**9.1**, pero flagged uno genuine seguridad gap más uno UX solicitud:

**Un2 — ningún request-body tamaño límite (servidor.JS).** Un unauthenticated endpoint (el
inicio de sesión route) accepted un 19 MB cuerpo y completamente buffered + parsed esto; un few dozen
concurrente solicitudes sería exhaust memoria. Añadido un `Content-Length` guarda derecho después
el endurecimiento encabeceras en `handler(req, res)`: bodies sobre 1 MB son rechazado con `413`
aintes cualquiera parsing. El cumplimiento subida endpoint es exempt porque esto transporta un
base64 documento y es legitimately grande.
*Verificado por curl contra el en vivo contenedor: 19 MB `POST /auth/login` → 413; un normal
inicio de sesión → 200; `POST /api/compliance/upload` con un >1 MB cuerpo → 401 (auth, no 413, así
el exemption held).*

**B — banco de trabajo windows debe ser draggable y resizable.** Cada superficie (topologíun,
Redactor, SignedDelivery, bóveda, auditoríun, Admin) es ahora un free-floating ventana: grabbed
por su encabezado strip, resized por el bottom-right grip, y su position/size persist en
`localStorage`. Implementación notas (así el siguiente reviewer isn't surprised):
- Nuevo módulo `aegis-shell/src/windowing.js`, cargado alongside `app.js` en
  `index.html`. Esto solo adds behaviour — panels conservar su ID y DOM children, así el
  iframe message-passing que impulsa el seven-step cerrado bucle es untouched.
- Panels stay en su normal two-column diseño hasta el **primero grab**; solo entonces es un
  panel "lifted" a `position: fixed` (lazy float). Este avoids stacking cada panel en
  el mismo spot en carga y conserva el predeterminado workspace intacto. Restaurado de
  `localStorage` en recargar.
- `.win` transporta `position: relative` así el resize grip (absolute, bottom-right) permanece
  anchored a el ventana incluso mientras aún en flujo. El arrastrar listener es bound a `win` en
  el capture fase (no el encabezado node) así esto sobrevive cualquiera inner re-render.
- Redactor spans un encabezado + action bar + iframe que eran siblings en el barra lateral; ellos
  son grouped en uno `#win-redact` ventana en init así el completo redacción superficie moves
  together.
*Verificado en un real navegador contra el en vivo contenedor: 6 `.win` panels presente; dragging
el topologíun ventana movido esto (14,83 → 154,145); resizing grew esto (718×703 → 878×813); el
doc iframe y Load-local-file botón permanecer intacto; **0 consola / página errores**.*

Todos gates permanecer verde: `npm test` 177/177, `verify:claims` 259, `verify:zero-deps` 13,
`doctor` 9/0, `verify:delivery` 386. Images reconstruido (`aegis:local`), contenedor restarted
healthy; el en vivo instancia en `http://localhost:8099` reflects ambos cambios.

**Score: 9.1 / 10** — el solo 9.0 deduction (request-body cap) es cerrado; el propietario
establecido que después este corrección nada functional o seguridad-related remained a indicador.

**Re-verification correction (propietario caught regressions después shipping — twice).** El
primero windowing vuelta entregado con un prueba que solo checked el redactor iframe
*existed* — no que esto tenía height — así un real visual regresión reached el propietario.
El honesto sequence de raíz causes:

1. **redactor documento preview (thumbnail) collapsed.** Verdadero raíz causar: el redactor
   wrapper es `<div class="redact-wrap frame-box">` — esto transporta Ambos classes. El
   generic windowing regle `.win .frame-box { flex:1; min-height:0 }` (escrito para el
   topologíun ventana) también matched esto con higher specificity que
   `.redact-wrap { height: clamp(420px, 58vh, 680px) }`, así dentro el content-sized
   `#win-redact` el wrap shrank a el iframe's intrinsic ~150px y el documento
   lienzo fell abajo el visible area. Un intermediate "corrección" scoped un flex regle vía un
   `[style*="position: fixed"]` atributo selector — que era un misdiagnosis (el
   collapsed element aún medido 150px, no 0) y es ahora eliminado. Final corrección: el
   topologíun fill regle es scoped a `#stage-topo .frame-box` solo, y el lifted estado
   es tracked con un explícito `.floated` clase añadido por `windowing.js`
   (`.win.floated#win-redact .redact-wrap` flexes solo una vez el ventana es really lifted).
2. **Arrastrar reliability.** Dragging originally armed solo dentro un 34px strip de el
   window's top borde (grabbing el lower parte de un tall encabezado hizo nada); esto ahora
   arranca anywhere dentro el panel's encabezado element (`handle.contains(e.target)`),
   con el listener bound a `win` en el capture fase así inner re-renders no puede
   detach esto.
3. **Desactualizado activos / desactualizado diseño.** Porque el navegador puede heuristically caché el
   shell's JS/CSS y earlier roto builds tenía ya escrito ventana positions en
   `localStorage`, el cache-busting query `?v=20261115a` era añadido a el `style.css`
   y `windowing.js` references, y el diseño almacenamiento clave era bumped
   `aegis.win.v1 → v2` así cualquiera poisoned saved diseño es discarded en primero carga.

Re-verified en un real navegador contra el reconstruido contenedor (servido CSS/JS confirmado
a contener el nuevo reglas aintes testing): redactor preview `#f-doc` genera **520px
tall** en el predeterminado in-flow estado (150px mientras roto), el iframe **fills el
ventana una vez lifted**, **todos six windows arrastrar** (topologíun, Redactor, transferencia, bóveda,
auditoríun, admin), resize works (718×803 → 868×893), **0 consola / página errores**. Gates
re-run verde: `npm test` 177/177, `verify:claims` 259, `verify:zero-deps` 13,
`doctor` 9/0, `verify:delivery` 386.

**auditoríun follow-up — último abierto código elemento cerrado (AEGIS completo auditoríun v8, vuelta 17).** El
windowing regle `.win { display: flex }` overrode el UA `[hidden] { display: none }`
predeterminado, así role-gated panels que carry `.win` (notably `#adminPanel`, y el
topologíun / redactor windows para recipient/auditor/external) eran **visibly shown a
non-privileged roles** — un operador podría véase el administrator panel. Este made
`verify-roles.mjs` fallo (`op_admin`). Corregido con uno línea:
`.win[hidden] { display: none !important; }` (placed beside el `.win` regle). El CSS
referencia también got `?v=20261115b` así cached stylesheets son bypassed.

Re-verified contra el reconstruido contenedor (`?v=20261115b` confirmado servido aintes
testing): `verify-roles.mjs` → **[Rol] Todos Aprobado** a través de operador / recipient /
auditor / admin / externo (operador `admin=hidden`, admin `admin=shown`); redactor
preview `520px`, **5 de 6 windows arrastrar** con el 6th (`#adminPanel`) correctly
`SKIP(hidden)` para el predeterminado operador rol — i.e. el previously-leaking panel es
ahora properly oculto; **0 consola / página errores**. Este cierra el solo code-level
problema izquierda abierto en el auditoríun; restante elementos allí son externo (tercero
penetración prueba / ACR atestación / Alemán legal-text localization) o diseño
decisions ya documentado (LAN enlazar + reverse-proxy guidance). Gates re-run verde:
`npm test` Todos Verde, `verify:claims` 259, `verify:zero-deps` 13, `doctor` 9/0,
`verify:delivery` 386.
