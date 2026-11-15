<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# AEGIS - Secure Borde Colaboración Banco de trabajo

**Inglés** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md)

> **Closed-loop, zero-trust, local-first colaboración para classified industrial
> documentos** — cada computation permanece en el operador's máquina, el aplicación nunca
> contacts un tercero origen. (Un hosted servicio / sin conexión caché es fuera de alcance.)
> Un clic en un million-node digital-twin topologíun pulls el associated
> maintenance contrato en un completamente local redacción motor. El destructive redacted PDF
> es entonces hashed, firmado, entregado peer-to-peer, verificado, sellado en un cifrado OPFS
> bóveda, y committed a un resistente a la manipulación cadena de hash: **seven stages, ten audited acciones,
> uno shell**.
>
> **El servidor nunca ve el topologíun, el documento, el archivo, un clave, o un frase de contraseñun.**
> Cada sensible byte permanece dentro el navegador; transporte es P2P direct.

> **licencia:** abierto source bajo el [Apache licencia 2.0](./LICENSE) (SPDX `Apache-2.0`).
> Gratuito a usar, incluyendo commercially; pagado soporte es opcional. Véase [§ licencia](#license).

---

## 1 - Por qué este existe (el Alemán industrial / medical pain punto)

Un classified manufacturer o clinic en un **air-gapped o intranet** red debe:

1. Monitor un **huge dispositivo / red topologíun** (connected cars, fábrica sensors) - y
   Canvas2D/SVG dies en escala.
2. Abierto un device's **maintenance contrato** que contiene outsourced workers' ID numbers
   y bank cuentas - y debe **nunca subida** esto a un cloud OCR servicio.
3. Hand el cleaned documento a un colleague en el mismo sitio - con **ningún chat aplicación** y
   absolutely no WeChat/Slack.
4. **Verificar** cuál clave firmado esto (un auto-declarado clave, no un legal identidad), que esto era no altered en transit, donde el sellado copia
   vive, y cuál acciones happened en cuál order.

Cuatro separado difícil problems. AEGIS resuelve ellos as **uno single-page banco de trabajo** whose
independiente modules compartir un único arquitectura: **todo se ejecuta localmente, nada es
subido, y uno EventBus impulsa el completo flujo.** El shell posee el estado máquina;
cada módulo permanece un reusable, independiente producto.

---

## 2 - El siete etapas cerrado bucle

El older three-stage diagram (topologíun -> redactar -> P2P) es retired. Un topologíun clic
ahora impulsa un completo bucle con firma, verificación, archiving y auditoríun.
El señalización servidor aún relays solo SDP/ICE - nunca bytes.

```
 [1] TOPOLOGY           Aegis-Topology          topology:node-selected {nodeId, x, y}
        |
        | redaktor:load-doc  (associated contract File)
        v
 [2] REDACT             Aegis-REDAKTOR          redaktor:export-ready {name, blob}
        |
        | SHA-256(pdfBytes) -> signHash(raw digest) -> assembleArtifact()
        v
 [3] SIGN               Aegis-Identity          identity:signed {hash, signature, publicKey}
        |
        | artifact retained as AegisContext.pendingArtifact
        | P2PAdapter.sendFile(artifact)
        v
 [4] P2P SEND           Aegis-SignedDelivery    p2p:file-sent
        |
        | AES-GCM chunks over a WebRTC DataChannel
        v
 [5] VERIFY             Aegis-Identity          p2p:file-received -> signed:verified
        |
        | Archive to Vault unlocks only on a passing verdict
        v
 [6] ARCHIVE            Aegis-Vault             vault:sealed -> OPFS (.aegis container)
        |
        | every stage calls AuditTrail.append()
        v
 [7] AUDIT              Aegis-AuditTrail        audit:append -> SHA-256 hash chain
```

**Ten audited acciones, paso por paso:**

1. `topology:node-selected` fires con el node id y coordinates; el shell resets el
   ejecutar y registros `AegisContext.selectedNode`.
2. El shell intercepta el node y emite `redaktor:load-doc`, loading **que node's**
   associated contrato en `Aegis-REDAKTOR`.
3. `redaktor:export-ready` transporta el destructive PDF `Blob`; el shell computes su
   SHA-256 digest con Web Criptografía.
4. `IdentityAdapter.signHash(hash)` produces un ECDSA P-256 firma más un Base64 SPKI
   público clave.
5. `identity:signed` publica el hash, firma y público clave; el PDF y el
   firma trailer son packed en uno firmado artefacto y conservado en el Contexto as
   `pendingArtifact`.
6. `P2PAdapter.sendFile()` flujos el artefacto sobre el AES-GCM canal;
   `p2p:file-sent` marcas el handoff.
7. `p2p:file-received` triggers `IdentityAdapter.verifyArtifact(pendingArtifact)`:
   recompute el documento hash, compare el embedded digest, verificar cada firmante.
8. `signed:verified` unlocks el **Archivo a bóveda** botón; un failing veredicto emite
   `signed:rejected` y conserva el botón bloqueado.
9. El operador enters un frase de contraseñun; `vault.seal()` escribe un AES-GCM-256 `.aegis`
   contenedor en OPFS y `vault:sealed` cierra el bucle.
10. Cada etapa llamadas `AuditTrail.append()` y emite `audit:append`. El right-hand
    cronología repaints en cada enlace, el seven-step Stepper turns verde etapa por etapa,
    y el final sello enlace lights todos seven.

**Por qué verificación usa el sender-side copia.** Un grande transferencia puede stream directo a
disco en el receptor (`showSaveFilePicker`) y por lo tanto produce ningún completo en memoria
`Blob` allí. El shell conserva el exacto bytes esto firmado as `pendingArtifact` y usa
que hash más el original documento as el verificación línea base. En el same-machine
`BroadcastChannel` demo el bytes son idéntico; en producción este respects el physical
límite de disk-streamed receivers en cambio de forcing un completo Blob en RAM.

**Multi-firmante capable.** El firma trailer es `signers: [{id, pub, sig}]` y
`verifyArtifact()` verifica cada entrada. `IdentityAdapter` currently problemas uno firmante
(`A`) para el automatizado bucle; adding further firmantes necesita ningún formato cambio.

---

## 3 - Arquitectura y integración seams

Eleven independiente, reusable modules en vivo bajo `modules/` y son composed - **como
building bloquea** - por `aegis-shell/` a través de un `EventBus` + `postMessage` puente. Ningún
módulo importaciones otro; ellos communicate solo en el `aegis` mensaje canal. El shell
es también el solo place que importaciones submodule **puro functions** (criptografía, bóveda, auditoríun
chain); su interno negocio lógica es nunca modificado.

**Marca mapa (el microkernel ecosystem):**

| módulo | Marca | Carpeta | Rol |
|--------|-------|--------|------|
| topologíun | `Aegis-Topology` | `modules/webgpu-topology` | WebGPU digital twin, 1M+ nodos |
| redacción | `Aegis-REDAKTOR` | `modules/doc-redactor` | Local OCR + destructive PDF |
| Identidad | `Aegis-Identity` | `modules/zero-knowledge-identity` | ECDSA P-256 sello, envuelto clave |
| Firmado entrega | `Aegis-SignedDelivery` | `modules/e2e-signed-delivery` | firma trailer + artefacto formato |
| Transporte | `Aegis-Transport` | `modules/p2p-crypto-transfer` | WebRTC + AES-GCM chunks |
| bóveda | `Aegis-Vault` | `modules/encrypted-archive` | OPFS + AES-GCM-256 archivo |
| auditoríun | `Aegis-AuditTrail` | `modules/audit-timeline` | SHA-256 encadenado por hash cronología |
| Lienzo | `Aegis-Canvas` | `modules/sync-canvas` | Realtime colaborativo board |
| Desacoplado firma | `Aegis-DetachedSign` | `modules/detached-hash-signer` | Desacoplado hash firma (sign el hash, no el documento); No un blind-firma scheme |
| token-gated salas | `Aegis-TokenGate` | `modules/token-gate` | ECDSA sala tokens para trusted admisión |
| servidor-blind relé | `Aegis-BlindRelay` | `modules/blind-relay` | servidor-blind WebSocket relé (reenvía texto cifrado solo) |

Two further capabilities ship **servidor-side** (no as independiente modules): **empresa auth**
— OIDC (`AEGIS_AUTH_MODE=oidc`, lógica en `server.js`, pruebas en `modules/oidc/`) y **SCIM**
aprovisionamiento (pruebas en `modules/scim/`). Ambos son apagado por predeterminado y cubierto en
`SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`.

**Common commands:** `npm run dev` (inicio el banco de trabajo) · `npm run setup` (mint el local
emisor secreto + crear el datos dir) · `npm test` (completo suite) · `npm run verify:delivery`
(compilación + checksum el shippable tarball) · `npm run doctor` (entorno self-check) ·
`npm run verify:claims` (forbidden-claim escaneo) · `npm run sbom` (SBOM). El completo script
lista es en `package.json`.

Cada independiente página transporta su marca en el documento title y su principal heading, así un
Cliente opening cualquiera módulo en aislamiento de inmediato ve cuál ecosystem esto belongs a.

**Cómo ellos son stitched together:**

- `aegis-shell/src/app.js` es el **solo** place el modules talk. Esto posee el siete etapas
  estado máquina, un unificado router, un único `EventBus` (`bus.js`), el compartido
  `AegisContext` (`context.js`), y el typed Adapters (`adapters.js`, `identity.js`).
- `aegis-shell/src/identity.js` (`IdentityAdapter`) importaciones el puro Web Criptografía helpers
  de `modules/e2e-signed-delivery/src/sdk/crypto.js` y el artefacto packing /
  verificación functions de `modules/e2e-signed-delivery/src/sdk/pdf.js`.
  **Ningún criptográfico lógica es reimplemented en el shell.**
- El bóveda y auditoríun cores son imported el mismo way
  (`modules/encrypted-archive/src/vault.js`, `store.js`,
  `modules/audit-timeline/src/trail.js`, `timeline.js`).
- `aegis-shell/src/sdk.js` publica `window.AegisSDK`, un documentado facade sobre el mismo
  EventBus. Véase sección 12.
- Cross-módulo eventos son namespaced por origen:
  - `topology:node-selected` `{nodeId, x, y}` - el shell decides el respuesta.
  - `redaktor:load-doc` `{file, name, source}` - el único intake seam, usado por ambos el
    topologíun handoff y `AegisSDK.injectFile()`.
  - `redaktor:export-ready` `{name, blob}` - arranca hash y firma.
  - `p2p:file-sent` / `p2p:file-received` `{name, size, blob}` / `p2p:error`.
  - Shell-produced eventos para externo subscribers: `identity:signed`,
    `signed:verified`, `signed:rejected`, `vault:sealed`, `audit:append`.
- Two P2P iframes (remitente + receptor) ejecutar **oculto** y connect localmente vía
  `BroadcastChannel`. Para cross-machine LAN, switch a LAN modo y serve sobre HTTPS.

**El compartido Contexto.** `AegisContext` transporta el completo ejecutar: `selectedNode`, `document`,
`flowStage` (0..7), `transfer`, `hash`, `signature`, `publicKey`, `artifact`,
`pendingArtifact`, `verified`, `sealed`. `FLOW_STAGES` freezes el seven etapa numbers;
`setSigning`, `markReceived`, `markVerified`, `markSealed` y `resetFlow` son el solo
mutators. Cada handoff es uno explícito, debuggable mutation en cambio de ad-hoc mensajes.

**Este es el architectural payoff:** el negocio es complex, el substrate es boring -
uno bus, uno mensaje canal, uno deliberately ciego servidor, y un público SDK en top.

---

## 4 - Quick inicio

```bash
cd /path/to/Aegis
node server.js            # http://localhost:8080
```

`/session` (el room-token emisor) es **fail-closed** since el seguridad aprobado: con
ningún emisor credential esto refuses a mint tokens, así LAN señalización no puede ser
self-authorised por anyone quién puede reach el port. Two ways a abierto esto:

```bash
# A) shared secret (recommended outside an isolated lab):
AEGIS_ISSUER_SECRET='<long-random-string>' node server.js
#    then open the shell once as http://host:8080/#issuer=<same secret>
#    (the fragment is moved into sessionStorage and stripped from the URL)

# B) isolated demo LAN (lab only — this is logged as a warning on boot):
AEGIS_TRUSTED_LAN=1 node server.js
```

TLS material es ningún más largo leer de el Web raíz: put `key.pem` + `cert.pem` en
`~/.aegis/tls/` (o punto `AEGIS_TLS_DIR` en ellos).


Abierto `http://localhost:8080` en **Chrome o Borde 113+**. Entonces:

1. Esperar para el topologíun a renderizar; arrastrar / wheel a navigate.
2. **Clic cualquiera node** - el redacción panel auto-loads que node's contrato.
3. Revisión el detected negro cajas; toggle reglas si usted como.
4. Clic **Enviar a Aegis Par**. De aquí el bucle es automatic: el PDF es hashed,
   firmado, streamed, verificado, y el **Archivo a bóveda** botón lights up.
5. Clic **Archivo a bóveda**, entrar un frase de contraseñun (>= 8 caracteres), **Sello a bóveda**.
   El seven-step Stepper turns completamente verde y el auditoríun cronología muestra cada enlace.

> Por qué `node server.js` y no `file://`? El topologíun necesita `SharedArrayBuffer`, cuál
> Solo existe en un **cross-origin-isolated** contexto. El unificado `server.js` es por lo tanto
> un **deliberately aislado** servidor, no un naive estático archivo servidor: esto sellos
> `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
> (+ `Cross-Origin-Resource-Policy: same-origin`) en **cada** respuesta - estático bytes
> *y* el JSON señalización relé alike. Drop `key.pem` + `cert.pem` beside esto para HTTPS
> LAN modo. Cada módulo también conserva su propio `server.js` para independiente usar; esos
> deliberadamente omit el aislamiento encabeceras porque ellos don't necesitar `SharedArrayBuffer`.

---

## 5 - El zero-trust garantiza (y su límites)

- **topologíun**: purely local WebGPU; el servidor sirve solo estático bytes.
- **documento**: Tesseract/pdf.js/pdf-lib son incorporado localmente; un sin conexión guarda wraps
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon` y bloquea cualquiera cross-origin llamada.
  Exportado PDF contener **ningún recoverable texto capa** - el source página es nunca copied;
  solo un re-rasterised imagen con burned negro cajas es embedded.
- **Transferencia**: el señalización servidor relays solo SDP/ICE (sala ID, IP hints). Archivo bytes
  y el AES clave (PBKDF2 de un frase de contraseñun) **nunca touch el servidor**.
- **firma**: claves son generado in-page por Web Criptografía. El privado clave es
  non-extractable y nunca serialized; solo el Base64 SPKI público clave travels dentro
  el artefacto. El firma cubre el crudo SHA-256 digest de el PDF region, así un
  único flipped byte falla verificación.
- **Archivo**: AES-GCM-256 bajo un PBKDF2-SHA-256 clave (250,000 iterations, per-record
  sal), escrito as un opaco `.aegis` contenedor en OPFS. El frase de contraseñun es usado una vez y
  nunca almacenado.
- **auditoríun**: cada etapa appends uno enlace a un local cadena de hash —
  `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` cuando un dispositivo clave es conjunto,
  plano `SHA-256` para legacy entradas (cada entrada registros `alg`). Edición uno enlace
  invalidates cada más tarde enlace. El chain es **resistente a la manipulación, no immutable**: esto
  detecta ediciones, pero ofrece ningún protection contra un operador quién puede rewrite el
  completo almacén. Véase `docs/CLAIMS-WORDING.md`.

**Honesto límites** (también en `DELIVERY_REPORT.md`):

- El redacción módulo's PII detección es tuned para Alemán business/legal paperwork;
  accuracy depende en escaneo quality y puede necesitar manual `Mark` cajas.
- **Transferencia receptor es memory-safe**: el P2P módulo flujos cada descifrado fragmento
  directo a disco (`showSaveFilePicker` en Chromium) - ningún en memoria `Blob`, así multi-GB
  transferencias do no Out-of-memory. Non-Chromium browsers fall atrás a un en memoria ruta **capped en
  1 GiB**. `showSaveFilePicker` necesita un usuario gesture, así el receptor tiene un
  "Elegir save ubicación" botón a pre-lock el archivo aintes sending.
- Porque un disk-streamed receptor tiene ningún in-page bytes, el shell verifica contra el
  **sender-side conservado artefacto**. Este es el correcto línea base para el same-machine
  demo y para producción streaming; un cross-machine despliegue que necesita independiente
  receiver-side verificación debe re-read el saved archivo.
- `IdentityAdapter` problemas uno firmante para el automatizado bucle. El trailer formato soporta
  multiple firmantes, pero additional firmantes son no aún wired en el shell flujo.
- COEP `require-corp` puede interfere con *externo* STUN para LAN modo en algunos browsers -
  usar el independiente P2P servidor (ningún COOP/COEP) para cross-machine si usted hit que.
- En vivo WebGPU / OCR / WebRTC execution requiere un real navegador; el repositorio era
  validated por estático analysis, el módulo-level prueba suites, un signed-artifact
  ida y vuelta, y en vivo servidor humo pruebas. El visual de extremo a extremo bucle es un manual
  aceptación paso registrado en sección 8.

---

### Cero dependencias — el accurate afirmación

Aegis es **no** "cero dependencias" as un completo producto, y nosotros do no afirmación esto es.
Concretely:

- **9 de 11 modules, más el shell (`aegis-shell/`) y el servidor (`server.js`),
  ship con cero tercero tiempo de ejecución dependencias.** Ellos usar solo Web Criptografía y
  otros integrado navegador / Node primitivas.
- **Two modules vendor tercero código:**
  - `doc-redactor` vendors **pdf.JS, pdf-lib, tesseract.JS, tesseract-core, tessdata**
    (~35 MB, todos Apache-2.0 / MIT) para local OCR y PDF renderizado.
  - `e2e-signed-delivery` vendors **pdf-lib** (~524 KB, MIT) a renderizar el firmado
    artefacto a PDF.
- **Nada es fetched de un CDN en tiempo de ejecución** — cada incorporado library es servido
  localmente de el imagen. El `video-tool/` directorio envía solo su navegador
  verificación scripts (ellos necesitar Playwright as un dev dependencia); el promo-video
  pipeline (Remotion, TTS, capture) es **no** parte de el entrega paquete.
- El completo atribución y licencia matrix es en `docs/DEPENDENCY_AUDIT.md`.

## 6 - Proyecto mapa

```
Aegis/
|-- server.js                  # unified server: COOP/COEP + static + signaling (zero-dep)
|-- README.md                  # this file
|-- LICENSE                    # Apache License 2.0 (Apache-2.0)
|-- LICENSES/                  # Apache-2.0 license text
|-- DELIVERY_REPORT.md         # engineering + test report
|-- aegis-shell/               # the unifying SPA (dark command-center)
|   |-- index.html             # seven-stage Stepper + sidebar surfaces
|   `-- src/
|       |-- app.js             # seven-stage orchestration + audit wiring
|       |-- adapters.js        # Topology / REDAKTOR / P2P adapters
|       |-- identity.js        # IdentityAdapter (pure submodule imports)
|       |-- sdk.js             # window.AegisSDK public embedding API
|       |-- bus.js             # EventBus
|       |-- context.js         # AegisContext + FLOW_STAGES
|       `-- style.css
`-- modules/
    |-- webgpu-topology/        # Aegis-Topology
    |-- doc-redactor/           # Aegis-REDAKTOR
    |-- zero-knowledge-identity/# Aegis-Identity
    |-- e2e-signed-delivery/    # Aegis-SignedDelivery
    |-- p2p-crypto-transfer/    # Aegis-Transport
    |-- encrypted-archive/      # Aegis-Vault
    |-- audit-timeline/         # Aegis-AuditTrail
    |-- sync-canvas/            # Aegis-Canvas
    |-- detached-hash-signer/   # Aegis-DetachedSign  (detached hash signing; NOT a blind-signature scheme)
    |-- token-gate/             # Aegis-TokenGate  (ECDSA room tokens)
    `-- blind-relay/            # Aegis-BlindRelay (server-blind WebSocket relay)
```

---

## 7 - Extensión puntos

- **Real documentos**: reemplaza el shell's `contractForNode()` con un loader que pulls un
  node's actual archivo (aún client-side) en el redacción módulo, o llamada
  `AegisSDK.injectFile(file)` de un host aplicación.
- **WebGL2 respaldo** para el topologíun; **GPU-compute** física para verdadero 10M nodos.
- **More pares / salas**, TURN para symmetric NAT, y un real clave-exchange UI para transferencia.
- **Multiple firmantes**: extend `IdentityAdapter.signHash()` a devolver un firmante array; el
  artefacto formato y `verifyArtifact()` ya soporte esto.
- **auditoríun exportación** produces un content-free JSON informe seguro a attach a un caso archivo.

---

## 8 - Cómo a prueba

Aegis mixes **headless, repeatable comprobaciones** (ejecutar aquí / en CI) con un **manual navegador
aprobado** (necesita un real GPU + OCR + WebRTC). Ambos son documentado así el cerrado bucle es
reproducible, no mystic.

### Un - Headless comprobaciones (ningún navegador) - qué CI puede assert today

```bash
# 1) Static syntax of every shell entry point (ES module mode)
for f in server.js aegis-shell/src/app.js aegis-shell/src/adapters.js \
         aegis-shell/src/identity.js aegis-shell/src/sdk.js \
         aegis-shell/src/context.js aegis-shell/src/bus.js \
         modules/webgpu-topology/src/main.js modules/doc-redactor/src/js/app.js \
         modules/doc-redactor/src/js/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/main.js \
         modules/p2p-crypto-transfer/src/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/transfer.js; do
  node --input-type=module --check < "$f" || echo "SYNTAX FAIL: $f"
done

# 2) English-only convention on all code + docs (no CJK / fullwidth punctuation)

# 3) P2P module unit tests - the OOM guard is proven here
cd modules/p2p-crypto-transfer && npm test
#   -> tests 11, pass 11, fail 0

# 3b) Audit chain unit tests - hash linkage + tamper detection
cd modules/audit-timeline && npm test
#   -> tests 15, pass 15, fail 0

# 4) Cross-origin isolation headers on EVERY response (enables SharedArrayBuffer)
PORT=8082 node server.js & SRV=$!; sleep 1
for u in "/" "/aegis-shell/src/app.js" "/signal?room=probe&from=a" "/nope-404"; do
  curl -s -D - -o /dev/null "http://localhost:8082$u" \
    | grep -iE "^(cross-origin-opener-policy|cross-origin-embedder-policy|cross-origin-resource-policy|HTTP/)"
done
kill $SRV
#   expect: COOP/COEP/CORP present on all four (200 / 200 / 204 / 404).
```

### B - Manual navegador aprobado (Chrome / Borde 113+, real WebGPU/OCR/WebRTC)

1. `node server.js` -> abierto `http://localhost:8080`.
2. **Confirmar aislamiento**: DevTools consola -> `crossOriginIsolated` debe ser `true`.
3. **Ejecutar el cerrado bucle**:
   - clic cualquiera topologíun node -> `Aegis-REDAKTOR` auto-loads que node's contrato
     (`Wartungsvertrag-N###.png`, filename stamped con el node id);
   - revisión el detected negro cajas, entonces clic **Enviar a Aegis Par**;
   - el shell calcula le hash y firma el PDF, flujos esto, y verifica esto. Watch el registro:
     `Redacted PDF ... hashed and signed`, entonces either un en memoria o un
     "streamed directo a disco" verificación mensaje;
   - **Archivo a bóveda** appears solo después `Signature verified`. Entrar un frase de contraseñun
     (>= 8 caracteres) y **Sello a bóveda**;
   - el top stepper turns verde etapa 1 -> 7.
4. **Demostrar el Out-of-memory corrección en un big archivo**: receptor clicks "Elegir save ubicación" a
   pre-lock el writer, entonces enviar un multi-GB archivo y watch el OS memoria meter stay flat.
5. **Watch el rastro de auditoríun**: cada etapa appends un enlace a el right-hand cronología
   (`Topology node selected` -> `Document hash signed` -> `Verification passed` ->
   `Sealed in the local vault`). Recargar el página; el chain es restaurado y
   **Verificar chain** aún informes intacto.

### C - Honesto huecos (no puede ser automatizado aún)

WebGPU renderizado, OCR accuracy en real escanea, cross-machine WebRTC, y el
`showSaveFilePicker` gesture require un human en un real navegador. El repositorio es
por lo tanto validated por **estático analysis + módulo-level prueba suites + signed-artifact
ida y vuelta + en vivo encabezado comprobaciones + servidor humo pruebas**; el visual de extremo a extremo bucle es un
manual aceptación paso registrado aquí.

---

## 8b - Funcionalidad referencia

El eleven modules son listed en §3; tres (Identidad, bóveda, AuditTrail) tener su
propio deep-dive sections abajo. Este sección cubre el **banco de trabajo shell, el operador
cumplimiento consola, el restante eight modules, empresa auth, y Docker** — el
parts el quick-tour tabla hace no expand.

### Banco de trabajo shell (`aegis-shell/`)

El unificado SPA. Cada superficie — topologíun, Redactor, SignedDelivery, bóveda, auditoríun,
Admin — es un **free-floating, draggable y resizable ventana**: grab su encabezado a
mover esto, arrastrar el bottom-right grip a resize; position y tamaño persist en
`localStorage` y son restaurado en recargar. Panels stay en su predeterminado two-column
diseño hasta usted primero grab uno.

### operador cumplimiento consola (`console.html`) — *el EU/DE revenue funcionalidad*

Este es el producto superficie German/EU clientes pay para, y esto es un first-class
funcionalidad, no un prueba artefacto. Esto es un authenticated operador consola (Issuer-secreto
bearer) con pestañas:

- **ROPA** — estructurado register de procesamiento activities (GDPR Art. 30); campos
  `controller.legalName / address / regNo`, `dpo.email`, `sla.mailbox / timezone`,
  `euRep.name`. Falta hechos superficie as `409` en el doc puerta de calidad y as un human-readable
  banner (`COMPLIANCE_LABELS` maps crudo campo nombres a plano language).
- **DSAR** — datos-subject access-request ledger (GDPR Art. 12/15), 30-día `dueInDays`
  tracking; creation requiere un subject nombre **o** correo electrónico.
- **DPIA** — datos-protection impact assessment registro.
- **Documentos** — subida un firmado ROPA/DPA/SLA/SCC/DPIA; el corresponding `/doc/*`
  puerta de calidad flips de `409` a `200` (`X-Aegis-Source: uploaded`). Blank plantillas
  (`/template/*`) devolver `{{…}}` placeholders (`TEMPLATE — UNFILLED`).
- **auditoríun / Revocations / Escrow / Sesiones / Configuración / Setup** — operador controles,
  clave revocación, secreto escrow, en vivo sesión vista, tiempo de ejecución configuración, first-run setup.
- **Exportación & Erase** — descargar un rellenado `ROPA-filled.md`, y erase un interesado
  (GDPR borrado) bajo auditoríun. El GDPR Art. 20 datos-portability paquete
  (`/export/bundle`) ahora transporta un `provenance` bloque identifying AEGIS (Jerome Young)
  as el producer.

El consola es **role-gated**: el Admin panel es oculto de el `operator` rol
(`.win[hidden]`), visible a `admin`. Switching pestañas sin conexión muestra un "servidor
unreachable" banner en cambio de throwing.

### Restante eight modules

- **Aegis-topologíun** (`modules/webgpu-topology`) — WebGPU digital twin de up a 1M+
  nodos; self-check aprueba 300/300 sampling; WebGL2 respaldo cuando WebGPU es absent.
- **Aegis-REDAKTOR** (`modules/doc-redactor`) — local OCR (tesseract.JS) + destructive
  PDF redacción. Carga un documento, draw/auto-detect PII cajas, conjunto zoom / modo / claro,
  exportación un redacted PDF whose `Producer` es stamped `REDAKTOR — local redaction engine`
  (ningún bytes leave el navegador).
- **Aegis-SignedDelivery** (`modules/e2e-signed-delivery`) — assembles un *firmado
  artefacto* = `[PDF document bytes] + [UTF-8 JSON signature trailer]`; two ECDSA-P256
  firmantes (Un & B) co-sign el documento hash; resistente a la manipulación (uno flipped byte falla
  verificar). El trailer transporta un `producer: "AEGIS v1.0.0 (Jerome Young)"` watermark.
- **Aegis-Transport** (`modules/p2p-crypto-transfer`) — WebRTC + AES-GCM chunked
  transferencia. El receptor flujos cada descifrado fragmento directo a disco (memory-safe,
  ningún Out-of-memory en multi-GB archivos); LAN/P2P modo dropdown.
- **Aegis-Canvas** (`modules/sync-canvas`) — real-time colaborativo board con
  operational-transform sincronización, multi-cursor presencia, y un `fit` viewport control.
- **Aegis-DetachedSign** (`modules/detached-hash-signer`) — *desacoplado hash firma*:
  el firmante firma solo el documento's SHA-256 hash; el documento bytes nunca entrar
  el firma paquete (blind/detached, no un blind-firma scheme).
- **Aegis-TokenGate** (`modules/token-gate`) — ECDSA room-admission tokens; el demo
  prueba admit / expired / wrong-room / falsificado rutas.
- **Aegis-BlindRelay** (`modules/blind-relay`) — servidor-blind WebSocket relé que
  reenvía **texto cifrado solo**; el worked ejemplo prueba el relé nunca ve
  texto sin cifrar.

### Empresa auth: OIDC & SCIM

- **OIDC** (`AEGIS_AUTH_MODE=oidc`, lógica en `server.js`, pruebas en `modules/oidc/`):
  unconfigured → `/auth/oidc/start` retorna `503` (ningún silent respaldo). Configure un
  IdP aintes permitiendo.
- **SCIM 2.0 aprovisionamiento** (pruebas en `modules/scim/`): protegido por `AEGIS_SCIM_TOKEN`;
  `rotate` de inmediato revokes el antiguo token.
- Ambos son apagado por predeterminado. Configuración pasos son en `CONFIGURE-BEFORE-DEPLOY.md`.

### Docker despliegue

```bash
docker build -t aegis .
docker run -d -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET=<strong-secret> \
  -v aegis-data:/app/data \
  aegis
```

El imagen se ejecuta as un non-root usuario, bakes `docs/` en el imagen (así cumplimiento
plantillas resolve en tiempo de ejecución), y persists datos en el `/app/data` volumen. **red
exposure:** el servidor enlaza todos interfaces por diseño — place esto detrás un invertir
proxy con TLS y un ACL, as documentado en `SECURITY.md`. Do **no** expose el port
directamente a untrusted networks.

---

## 9 - módulo 01 - Aegis-Identity (Localmente Self-Custodied Claves)

Un classified plant no puede join un corporate identidad Proveedor, así cada engineer acuña un
local **digital sello** en cambio: un ECDSA P-256 clave pair generado por Web Criptografía, con el
privado half envuelto por PBKDF2 + AES-GCM y almacenado en IndexedDB. El público half becomes
un shareable negocio tarjeta - avatar, nombre, Base64 SPKI clave y un SHA-256 huella.

**En el siete etapas bucle este módulo es automatic.** El shell's `IdentityAdapter`
(`aegis-shell/src/identity.js`) reuses el mismo puro Web Criptografía primitivas exposed por el
signed-delivery SDK. Firma es triggered automáticamente por el principal shell's
`IdentityAdapter` de inmediato después `redaktor:export-ready`; allí es ningún botón a press
anymore. Verificación se ejecuta en `p2p:file-received`, y una vez verificación succeeds el
**Archivo a bóveda** botón lights up automáticamente.

```bash
node server.js
# then open: http://localhost:8080/modules/zero-knowledge-identity/index.html
```

- Type un nombre (para ejemplo `Engineer-A`), elegir un frase de contraseñun de en al menos eight
  caracteres, press **Generar**.
- Recargar el página - el tarjeta retorna de IndexedDB con el mismo huella, y el
  mismo frase de contraseñun aún unlocks el privado clave.

El frase de contraseñun es nunca almacenado, el envoltura clave es non-extractable, y el módulo hace
cero red solicitudes. Completo detalle: `modules/zero-knowledge-identity/README.md`.
Medido resultados: `modules/zero-knowledge-identity/TEST_REPORT.md` (26/26 headless
aserciones, navegador recargar aceptación aprobado).

---

## 10 - módulo 02 - Aegis-bóveda (Local Cifrado bóveda)

> **Aegis-bóveda: zero-cloud archiving de firmado documentos.**

Un firmado contrato no puede ser izquierda en el desktop. Después `Aegis-Identity` verifica el
artifact's ECDSA firma, el shell ofrece **Archivo a bóveda**. El archivo más su
firma metadatos son framed en uno carga útil, cifrado con AES-GCM-256 bajo un
PBKDF2-SHA-256 clave (250,000 iterations, per-record sal), y escrito as un opaco
`.aegis` contenedor en el navegador's Origen Privado Archivo Sistema (OPFS). Nada es
subido; allí es ningún cuenta y ningún sincronización cola.

**Ningún manual demo botón.** Firma es ahora triggered automáticamente por el principal shell's
`IdentityAdapter` derecho después `redaktor:export-ready`; allí es ningún botón a press
anymore. Una vez verificación succeeds, el **Archivo a bóveda** botón lights up
automáticamente. Solo un aprobado veredicto unlocks el bóveda action.

```bash
node server.js
# command center:  http://localhost:8080/
# vault browser:   http://localhost:8080/modules/encrypted-archive/index.html
```

- En el shell: clic cualquiera topologíun node, redactar y exportación, esperar para *Verificado*, entonces
  **Archivo a bóveda** -> frase de contraseñun (>= 8 caracteres) -> **Sello a bóveda**.
- El barra lateral informes `N sealed records | X KB ciphertext | opfs`; recargar el página y
  el recuento sobrevive, porque OPFS es persistent por origen.
- Abierto el independiente bóveda página a browse el mismo directorio: ID y texto cifrado sizes
  son visible mientras bloqueado; archivo nombres, calcula le hash y firmante details appear solo después
  unlocking un registro.

Fallo modes son deliberately distinguishable: `integrity check failed` means el
contenedor changed en disco, `unlock failed` means el frase de contraseñun o el AES-GCM etiqueta hizo
no match. Completo detalle: `modules/encrypted-archive/README.md`.
Medido resultados: `modules/encrypted-archive/TEST_REPORT.md` (23/23 headless aserciones,
navegador sello -> recargar aceptación aprobado).

---

## 11 - módulo 03 - Aegis-AuditTrail (Resistente a la manipulación rastro de auditoríun)

> **Aegis-AuditTrail: un resistente a la manipulación encadenado por hash cronología para cumplimiento reviews.**

Un cumplimiento revisión asks quién hizo qué, y cuando. El right-hand **rastro de auditoríun** tarjeta
appends uno hash enlace para cada meaningful action en el siete etapas bucle:
topologíun node selected, documento cargado en Redactor, destructive PDF producido,
documento hash firmado, firmado artefacto handed a transporte, cifrado P2P entrega,
entrega descifrado, verificación aprobado (o rechazado / fallido / omitido), y bóveda
sellado.

Cada enlace es `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` (legacy entradas
usar plano `SHA-256`), así edición, deleting o reordering cualquiera entrada breaks cada más tarde
hash. El trail es **resistente a la manipulación, no immutable**. Cada añadir también emite `audit:append` en
el shell `EventBus`, así un externo `AegisSDK` subscriber puede watch el chain en real
tiempo. El trail es almacenado en `localStorage` y sobrevive un recargar; **Verificar chain**
recomputes esto de genesis y marcas el primero roto enlace. **Exportación JSON** produces un
content-free case-file artefacto.

```bash
node server.js
# command center:  http://localhost:8080/aegis-shell/index.html
# review page:     http://localhost:8080/modules/audit-timeline/index.html
```

- Clic un topologíun node y completo el cerrado bucle; el cronología fills as cada evento
  fires. Allí es ningún separado signed-delivery demo a ejecutar - firma y verificación
  happen inline en el principal bucle.
- Abierto el independiente revisión página a véase el mismo chain, verificar esto, exportación esto, o claro esto
  con un two-step confirmation.

El chain implementación es reused de `modules/sync-canvas/src/audit/HashChain.js`
a través de un único importación seam; esto es no forked. Completo detalle:
`modules/audit-timeline/README.md`. Medido resultados:
`modules/audit-timeline/TEST_REPORT.md` (15/15 headless pruebas, navegador cronología y
recargar aceptación aprobado).

---

## 12 - AegisSDK: embedding el banco de trabajo

> **Un embeddable, sin dependencias empresa ecosystem.**

`aegis-shell/src/sdk.js` publica `window.AegisSDK` en el command-center página. Esto es un
thin, completamente documentado facade sobre el shell's interno `EventBus` - ningún global estado es
copied, ningún dependencia es añadido, y el SDK nunca llamadas en un submodule directamente.

| API | Finalidad |
|-----|---------|
| `AegisSDK.init(config)` | Aplicar `{theme, locale, authToken, ...}` y devolver el SDK. El token permanece en memoria y es nunca logged o emitted. |
| `AegisSDK.on(eventName, callback)` | Subscribe a cualquiera shell o módulo evento; retorna un unsubscribe function. |
| `AegisSDK.injectFile(file)` | Push un externo `File` en `Aegis-REDAKTOR` por emitting `redaktor:load-doc`. |

```js
const sdk = window.AegisSDK.init({
  theme: 'dark',
  locale: 'en',
  authToken: '<your-token>',
});

const off = sdk.on('audit:append', (entry) => {
  console.log('audit link', entry.index, entry.hash);
});

const file = new File(
  ['%PDF-1.4 sample bytes'],
  'contract.pdf',
  { type: 'application/pdf' },
);
const receipt = await sdk.injectFile(file);
console.log('injected', receipt.name);
off();
```

Observable eventos include `topology:node-selected`, `redaktor:load-doc`,
`redaktor:export-ready`, `identity:signed`, `p2p:file-sent`, `p2p:file-received`,
`signed:verified`, `signed:rejected`, `vault:sealed` y `audit:append`.
`redaktor:load-doc` es el único intake seam: ambos el topologíun handoff y
`AegisSDK.injectFile()` usar esto, así externally inyectado documentos entrar exactamente el mismo
audited siete etapas bucle as node-selected documentos.

Porque el shell posee el EventBus, el Contexto y el Adapters, un host aplicación puede
embed el banco de trabajo, inject documentos, y observe cada etapa sin forking un módulo
o installing un npm paquete.

---

## 13 - Tercero componentes

Aegis declares **cero npm tiempo de ejecución dependencias**. Two modules vendor tercero código
localmente así el completo pipeline se ejecuta con ningún instalar y ningún red acceso — `doc-redactor`
(five activos bajo `modules/doc-redactor/vendor/`) y `e2e-signed-delivery` (pdf-lib bajo
`modules/e2e-signed-delivery/vendor/`, idéntico byte a byte a el doc-redactor copia). Cada asset
conserva su propio subida licencia, unmodified.

| Component | Versión | Licencia | Usado por | Subida |
|---|---|---|---|---|
| pdf.JS | 3.11.174 | Apache-2.0 | doc-redactor | `mozilla/pdf.js` |
| pdf-lib | 1.17.1 | MIT | doc-redactor, e2e-signed-delivery | `Hopding/pdf-lib` |
| tesseract.JS | 5.1.1 | Apache-2.0 | doc-redactor | `naptha/tesseract.js` |
| tesseract.js-core | 5.1.1 | Apache-2.0 | doc-redactor | `naptha/tesseract.js-core` |
| tessdata (`deu`, `eng`) | 4.0.0 best_int | Apache-2.0 | doc-redactor | `tesseract-ocr/tessdata` |

Two modules vendor tercero código — `doc-redactor` (five activos) y
`e2e-signed-delivery` (pdf-lib solo, idéntico byte a byte a el copia en `doc-redactor`,
mismo SHA-256). El otros ten modules — `aegis-shell`, `audit-timeline`, `blind-relay`,
`detached-hash-signer`, `encrypted-archive`, `p2p-crypto-transfer`, `sync-canvas`,
`token-gate`, `webgpu-topology`, `zero-knowledge-identity` — contener **ningún tercero código**.

### Externo integraciones (aislado adapters, no en el núcleo)

El sin dependencias núcleo (criptografía / cadena de hash / auditoríun / señalización / redacción renderizar)
permanece gratuito de red servicios. Cada externo capacidad es un drop-in adaptador que
sits Detrás un interfaz, vive outside núcleo source, y es **completamente removable** —
deleting su directorio más su launch indicador deja Aegis completamente functional.

| Adaptador | Estado | Finalidad | Implementación nota |
|---|---|---|---|
| RFC 3161 TSA marca de tiempo | **Entregado** (opcional, apagado por predeterminado) | Anchor un digest a un trusted marca de tiempo | `adapters/tsa-rfc3161/` — un puro Node forwarder (hand-rolled DER, ningún tercero libs) que POSTs un `TimeStampReq` a un operador-configured TSA y retorna el crudo CMS token. Activado con `node server.js --adapter-tsa on --tsa-config <file>`; `POST /adapter/tsa/submit`. Dev: FreeTSA; prod: DigiCert. Nunca verifica el TSA certificado chain — sin conexión verificación es el user's responsabilidad. |
| Cloudflare R2 almacenamiento (UE) | PLANNED | Client-side-encrypted long-term bóveda archivo | Cifrar con Web Criptografía, entonces PUT a R2 (UE). Adaptador hooks solo; completo SigV4 es no hand-rolled en el núcleo. |
| Tauri desktop shell | PLANNED | Sin conexión kiosk / firmado desktop compilación | Wraps el existing Web aplicación; el núcleo es unchanged. |

**Externo TSA servicios son externo dependencias, no Aegis código.** El TSA adaptador
envía con ningún hardcoded Proveedor URL, clave, o certificado; esto reenvía **solo un SHA-256
digest** (nunca documento bytes). Aegis maintains ningún TSA root-CA confianza almacén y hace
ningún afirmación about legal admissibility. Esto falla seguro: cualquiera timeout / red error / 4xx
yields `{ tsaStatus: 'failed' }` y nunca disrupts el cadena de hash o relé. Eliminar
`adapters/tsa-rfc3161/` y el `--adapter-tsa` indicador a strip esto completely. Véase
`adapters/tsa-rfc3161/README.md` (EN/DE) para GDPR notas y el legal disclaimer.

Un CI puerta de calidad (`scripts/zero-dep-lint.mjs`) enforces este límite: esto falla si cualquiera núcleo
o adaptador source importaciones un non-platform (`node:*`) o non-relative módulo. Cualquiera future
CMS-verification código debe en vivo en `adapters/tsa-rfc3161/vendor/` (aislado, omitido
por el lint, nunca cargado por predeterminado) así un red servicio puede nunca creep en el núcleo.

### Archivos que debe travel con cualquiera copia

```
modules/doc-redactor/vendor/<component>/LICENSE     upstream licence text, unmodified
modules/doc-redactor/vendor/<component>/NOTICE      copyright attribution
modules/doc-redactor/vendor/THIRD_PARTY_NOTICES.md  full attribution index
modules/doc-redactor/vendor/MANIFEST.json           version + SHA-256 per file
modules/e2e-signed-delivery/vendor/pdf-lib/LICENSE  MIT, Copyright (c) 2019 Andrew Dillon
modules/e2e-signed-delivery/vendor/MANIFEST.json    version + SHA-256
```

El bundled builds son subida salida. Su copyright encabeceras eran stripped por el
subida compilación paso, no por este repositorio — atribución por lo tanto vive en el per-component
`LICENSE` y `NOTICE` archivos. Nada aquí eliminado o altered un atribución aviso, y ningún
incorporado archivo era modificado.

### licencia

Aegis es **abierto source**, licenciado bajo el **Apache licencia 2.0** — véase
[`LICENSE`](LICENSE). Usted puede usar, modify, redistribute y sell esto,
incluyendo commercially, sin paying us anything y sin asking
permission. El solo obligaciones son esos Apache-2.0 él mismo imposes:
conservar el licencia y atribución notices, y estado significant cambios.

**Qué es gratuito:** el software. Cada primera parte archivo en este repositorio es
Apache-2.0. Allí es ningún pagado tier, ningún puesto límite, ningún revenue threshold y ningún
"contacto sales" puerta de calidad.

**Qué es pagado (opcional):** nuestro tiempo. despliegue, integración, endurecimiento
reviews, SBOM/CRA preparación paquetes y anual soporte son offered as servicios
(véase [`PRICING.md`](PRICING.md)). Un soporte contrato es nunca obligatorio a ejecutar
el software.

**Tercero componentes** conservar su propio licences — véase [`NOTICE`](NOTICE)
y cada `vendor/<component>/LICENSE`. Apache-2.0 hace no relicense ellos.

Aegis™ es un marca de el copyright holder; el licencia grants ningún
marca derechos. Do no usar el nombre a endorse un modificado compilación.

---

## 14 - Post-auditoríun P3 closure (entrega, CSP, diagnostics, redacción)

Five elementos eran deliberately izquierda abierto en el 2026-11-13 auditoríun porque ellos necesario un
producto decision. El decisions abajo son ahora implementado y protegido en CI.

### 13.1 Entrega footprint (AEG-19) — el working árbol es no el deliverable

El working árbol es ~845 MiB porque esto transporta **regenerable** compilación caches
(`video-tool/node_modules/.cache`, `.remotion`, `out/*.mp4`) y Playwright copies.
Nada es deleted de el working árbol: esos caches son necesario a re-render el
demo video y re-run el navegador gates. En cambio allí es un único reproducible
lanzamiento packer:

```bash
npm run pack:delivery       # dist/aegis-delivery-<version>.tar.gz + dist/MANIFEST.json
npm run verify:delivery     # re-verify every file's SHA-256 against the manifest
```

El packer excluye compilación caches aintes archiving, así el archivo es un small
fraction de el working árbol. Un segundo compilación es idéntico byte a byte (corregido tar epoch,
sorted nombres, zeroed gzip mtime). Ejecutar `npm run verify:delivery` para el actual
archivo recuento y tamaño — cada SHA256 coincide el manifest. El archivo
excluye `node_modules/`, compilación caches, renderizado media y private-clave material, pero
**conserva `vendor/`** (pdf.JS, pdf-lib, tesseract, tessdata son tiempo de ejecución activos, incluyendo
`*.traineddata.gz`). `dist/` es en `server.js`'s deny lista y es nunca HTTP-reachable.
Un falta obligatorio archivo, un forbidden ruta, o un archivo sobre 80 MiB falla el puerta de calidad.

### 13.2 Content-seguridad-Policy (AEG-23) — per-response nonce, no `unsafe-inline`

El páginas mix externo `<script src>` con genuine inline
`<script type="module">` bloquea. hash CSP sería break en cada editar y
`'unsafe-inline'` sería defeat el finalidad, así `server.js` acuña un fresco
`crypto.randomBytes(16)` nonce **por HTML respuesta**, inyecta esto en cada opening
script etiqueta, y envía esto en `Content-Security-Policy`. HTML es `no-store` así un spent
nonce puede nunca ser replayed de caché. El política conserva `'self'`, `blob:` y
`'wasm-unsafe-eval'` (el incorporado OCR/PDF workers necesitar ellos), conjuntos
`frame-ancestors 'self'` así el shell's propio iframes aún work, y bloquea
`object-src` / `base-uri`. `doc-redactor`'s stricter `<meta>` CSP permanece y es
intersected por el navegador con el encabezado política.

Puerta de calidad: `node video-tool/verify-csp.mjs` (después `node server.js`). Esto afirma un fresco
nonce en cada respuesta, nonce en cada script etiqueta, ningún `unsafe-inline` en
`script-src`, real inline módulo scripts aún executing, un inyectado script
**sin** un nonce siendo refused, y `dist/` returning 404.

### 13.3 Diagnostics (AEG-21) — producto métricas stay, crudo timings mover a `?diag=1`

El HUD aún muestra FPS / Nodos / Edges / Draw llamadas. `Frame ms` y `Worker tick ms`
son developer-only: el física Worker se ejecuta en su propio clock, así un cold-start tick
podría leer thousands de ms mientras el renderizar bucle held 60 FPS. Esos two rows y el
on-page pick-debug panel son oculto a menos que usted abierto el topologíun página con
`?diag=1`; el worker tick valor es también warm-up-filtered y exponentially smoothed.
El picking self-test ahora states su alcance honestly: esto verifica projection math,
mientras DOM evento entrega es cubierto por `video-tool/verify-webgl2.mjs`.

### 13.4 Identidad puerta de calidad (AEG-24) — ningún auto-unlock, pero el puerta de calidad es explained

Creating un identidad seals el privado clave de inmediato, así **Sign permanece desactivado**.
Auto-unlocking sería conservar clave material en memoria y defeat el sealed-bóveda
guarantee. En cambio el página ahora states el puerta de calidad (`#signGateHint`, `title`,
`aria-describedby`), puntos en el Desbloquear panel, y actualiza el mensaje en desbloquear.
`btnSign` es desactivado para un visible, establecido reason más bien que looking roto.

### 13.5 Afirmaciones redacción (AEG-22) — normative línea base

[`docs/CLAIMS-WORDING.md`](docs/CLAIMS-WORDING.md) es el normative redacción tabla.
Do no decir `forward secrecy` → decir **per-chunk authenticated cifrado con un
fresco aleatorio IV** (uno PBKDF2 sesión clave, ningún ratchet); do no decir `blind signature`
→ decir **desacoplado hash firma** (ningún blinding factor); do no decir `immutable` → decir
**resistente a la manipulación HMAC/SHA-256 cadena de hash**; do no decir `Prove who signed it` → decir
**verificar integridad contra un auto-declarado firmante clave**.
Directorio nombres tales as `zero-knowledge-identity` y `blind-relay` son historical
y kept para compatibility, pero cada README ahora expresamente denies el criptográfico
afirmación. `npm run verify:claims` falla CI si un over-claim retorna a user-facing copia;
explícito denials son allowed. Ningún API, exportación, wire formato o access-control decision
changed.

### 13.6 topologíun backend selection — WebGL2 flaky regresión corrección

Post-closure, `video-tool/verify-webgl2.mjs` intermittently timed fuera waiting en
`window.__topoBackend` (worst observed 7581 ms contra un 6 s cap). Hands-on
diagnosis showed two real causes, neither un CSP/`?diag=1` regresión:

1. `navigator.gpu.requestAdapter()` tiene **ningún integrado timeout**; headless
   SwiftShader bloquea 3–8 s aintes returning `null`, así el WebGPU-then-WebGL2
   respaldo chain occasionally blew past el test's esperar.
2. El test's `delete navigator.gpu` era un **no-op** — `navigator.gpu` es un
   read-only prototype getter, así el borrar silenciosamente fallido y el prueba solo
   fell atrás por luck cuando headless tenía ningún adaptador.

Cuatro fixes (A/B/C/D) eran aplicado a `modules/webgpu-topology/src/gpu/device.js`
y `video-tool/verify-webgl2.mjs`:

- **Un** — `pickGpu()` honors un explícito `?gpu=webgl2` / `?gpu=webgpu` URL
  override as un synchronous short-circuit, y el prueba ahora navigates a
  `index.html?gpu=webgl2` así el WebGL2 ruta es exercised deterministically
  (ningún adaptador esperar, ningún reliance en el deleted getter).
- **B** — `requestAdapter()` es raced contra un 2 s `setTimeout(() => null)`, así
  un missing/absent adaptador resuelve fast y falls atrás a WebGL2 en cambio de
  hanging el arranque ruta.
- **C** — `window.__topoBackend = 'pending'` es published el instant `pickGpu`
  arranca, y `window.__topoBackendReason` registros el resolution ruta
  (`forced webgl2`, `webgpu default`, `webgpu fell back`, …) para
  self-explaining fallos.
- **D** — `device.lost` es downgraded de `console.error` a `console.warn`; un
  lost dispositivo durante normal teardown es benign noise y debe no activación el
  "ningún fatal consola errores" tiempo de ejecución puerta de calidad.

Puerta de calidad: `verify-webgl2.mjs` es ahora estable — `window.__topoBackend` resuelve a
`webgl2` en well bajo 1 s, y un 3/3 repeated ejecutar aprueba. `?gpu=` es también un
handy manual diagnostic: abierto cualquiera topologíun URL con `?gpu=webgl2` o
`?gpu=webgpu` a force un backend.

### 13.7 Final regresión puerta de calidad estado

Todos gates verde después el WebGL2 corrección (ejecutar en limpio, port-collision-free servers):

| Puerta de calidad | Comando | Resultado |
|------|---------|--------|
| Unidad suite | `npm test` | 151 / 151 aprobado |
| Afirmaciones redacción (AEG-22) | `npm run verify:claims` | 216 archivos scanned, ningún forbidden afirmaciones |
| Entrega packer (AEG-19) | `npm run verify:delivery` | Verificar Aprobado — cada SHA256 coincide, ningún caches/media/keys; source-vs-package freshness comprobar (B-02) |
| CSP nonce (AEG-23) | `node video-tool/verify-csp.mjs` | Todos Aprobado |
| P3 closure | `node video-tool/verify-p3.mjs` | Todos Aprobado (12 páginas + AEG-21/24 + P0 PoCs + F-01 falsificado→DENY regresión) |
| WebGL2 respaldo | `node video-tool/verify-webgl2.mjs` | 3 / 3 aprobado (era flaky) |
| Tiempo de ejecución humo | `node video-tool/verify-runtime.mjs` | Todos Aprobado (goto retry ×3 añadido — ningún más largo flaky) |
| consola (protegido) | `node video-tool/verify-p3.mjs` | `/aegis-shell/console.html` 200 + sign-in control genera (N-01 cobertura añadido) |
| Página cobertura | — | **13 / 13 primera parte páginas** (12 modules + shell + consola) |
| Deep flows | `npm run verify:flows` | **12 / 12 verificado en Chromium (2026-11-14)** — token-gate 4-states, 3-parte ciego sign+verificar, bóveda sello, lienzo sello editar, topologíun 100k, shell superficie, zero-external, cosign 2/2, p2p local (same-context) + LAN (sessionStorage secreto). Selectors matched a confirmado módulo DOM. p2p local/LAN assert page-load + zero-pageerror (peer-connect necesita un en vivo 2-par / sesión secreto). Requiere Playwright + Chromium (solo desarrollo; véase nota abajo). |
| Accessibility | — | `aria-busy` en **cada** long-task botón a través de todos 12 modules + consola + shell (N-04 → EN 301 549 / WCAG 4.1.2 + 4.1.3) |
| seguridad endurecimiento | — | rastro de auditoríun es resistente a la manipulación y append-only para operator/system interesados — `/audit/erase` refuses protected interesados (403); GDPR borrado aún objetivos datos interesados. Inicio de sesión throttled por IP + per-(IP,usuario) (429 + lockout) **más un por IP enumeration guarda** (distinct-username 429) que cierra el account-existence side-channel; **un per-user lockout ahora spreads a el completo IP**, así probing non-existent usernames también retorna 429 (v5 corrección). **token-gate rechaza non-canonical (manipulado) firmas** — cierra un forged-token aceptación flaw (~21% de trailing-char flips admitted aintes el corrección). consola auditoríun CSV/JSON exportación corregido (`res.clone`); `GET /export/bundle` adds Art.20 portability (ahora incluye cuenta metadatos). `npm run doctor` self-diagnostic. (B-04 + must-fix #5 + token-gate + M-01 + enum guarda + lockout-spread) |
| Static-surface lockdown (v7) | `server.js` | **B-01/B-01b/B-02/B-04 cerrado**: `config/`, `data/`, `server/` son denied as Privado Nivel superior dirs (depth-0 match, así `modules/webgpu-topology/src/data/` aún sirve), `.db*` extensions denied, encoded traversal (`%2e%2e`, double-encoded) rechazado en el decoded ruta. `GET /config/local.json`, `/data/aegis.db`, `/server/store.js` ahora 403/404 — el emisor secreto es ningún más largo reachable de el port. `Referrer-Policy` / `Permissions-Policy` / `nosniff` / `HSTS` en cada respuesta; `/audit?limit=` requiere un positivo integer y clamps a 1000; DB startup fallo prints un actionable mensaje. |
| Secret/DB nunca ship (v7) | `scripts/package-delivery.mjs` | **B-03 cerrado**: packer excluye `config/local.json` y nivel superior `data/*` regardless de `.gitignore`, con two difícil aserciones en ambos compilación y `--verify` (contra actual tar entradas). `scripts/setup.mjs` prints `rotating` y rotates cualquiera pre-existing `issuerSecret` en cambio de silenciosamente reusing esto, y chmods el archivo a `0600` en ambos crear y rotar. `Dockerfile` usa `node:22-alpine` (node:SQLite) y crea `config/` en compilación tiempo en cambio de `COPY`-ing un secreto. `npm run verify:zero-deps` / `npm run verify:p3` son ahora first-class gates. |
| cumplimiento paquete | `docs/compliance/` | Privacidad Política (retención tabla, Art.12(3), cookie statement, DPO, DE), DPA (TOM Anexo + 24h/72h incumplimiento + firma), ROPA (responsable del tratamiento + transferencia base), SOC2 preparación, **SCIM 2.0 (implementado, `AEGIS_SCIM_TOKEN`)**, **OIDC SSO (implementado, `AEGIS_AUTH_MODE=oidc`)**, Incidente Respuesta / DR-Backup / Access-Review / Sub-encargado del tratamiento inventory, VPAT 2.5 UE / WCAG 2.2 AA, SLA, datos-Residency; `GET /healthz` + `GET /health` probes; `GET /export/bundle` (Art.20); `scripts/cleanup.mjs` + `scripts/uninstall.mjs` + `Dockerfile`. (cierra el EU/US cumplimiento gap) |
| Identidad / SSO | `server/oidc.js` | OIDC authorization-code flujo con RS256 id_token verificación vía `node:crypto` (cero externo dependencia) y SCIM 2.0 aprovisionamiento (`/scim/v2/Users`, `AEGIS_SCIM_TOKEN` bearer). Ambos son opt-in funcionalidad flags — el zero-config local despliegue es unchanged. SCIM desaprovisionamiento disables inicio de sesión (immediate 401) sin purging el resistente a la manipulación rastro de auditoríun. |

> **E2E prerequisite para `verify:flows`:** el deep-flow puerta de calidad necesita un navegador.
> Playwright es **solo desarrollo** y hace no affect el zero-runtime-dependency
> afirmación. Instalar una vez con `npm i -D playwright && npx playwright install chromium`,
> entonces ejecutar contra un en vivo servidor:
> `BASE=http://localhost:8099 AEGIS_ISSUER_SECRET=<issuer> node video-tool/verify-flows.mjs`.

---

## 15 - De seguridad-kernel demo a EU/US industrial despliegue

El núcleo zero-trust núcleo + el P3 auditoríun closure son hecho (§14). A ser shippable
a European/American industrial-cumplimiento clientes, el banco de trabajo debe mover de
un **local-first demo** a un **producción sistema**. Este es un phased program, ejecutado
fase por fase; cada fase es verificado ("wired up") aintes el siguiente arranca. Estado tabla
en el fin de este sección.

### 14.1 One-click instalar (Fase 0 — Hecho)

Cero externo dependencias. El solo requisito es **Node.js ≥ 22** (para el
integrado `node:sqlite`); nada si no es installed o ejecutar.

```bash
npm run setup     # creates data/ + config/local.json (auto-generated issuer secret)
npm start         # node server.js
```

- `data/aegis.db` es un embedded SQLite almacén (Node integrado) — ningún Postgres/Redis
  a instalar, así "one-click" permanece one-click.
- `config/local.json` (git-ignored) transporta un auto-generated `issuerSecret`;
  `server.js` lee esto automáticamente, o override vía `AEGIS_ISSUER_SECRET`.
- El servidor ahora escribe un **servidor-side auditoríun registro** (`audit_events` tabla) que
  sobrevive restarts — el foundation para Fase 1's conservado + GDPR-erasure-aware trail.

### 14.2 Phased roadmap

| Fase | Alcance | Estado |
|-------|-------|--------|
| **P0** | Foolproof instalar + embedded `node:sqlite` almacén + servidor-side auditoríun registro | ✅ hecho (este sección) |
| **P1** | rastro de auditoríun durable en SQLite + GDPR right-to-erasure (targeted deletion de un subject's rows + conservado borrado marker) + retención purge (excluye cumplimiento markers) + operador-gated `/audit` API (lista / CSV exportación / erase / purge) | ✅ hecho |
| **P2** | Identidad foundation (servidor-side): local cuenta (scrypt + sal) + servidor-side sesiones (TTL) + operador auth accepts sesión O bootstrap secreto; OIDC authorize-redirect scaffold (config-driven, 501 hasta IdP configurado); SAML/LDAP documentado configuración stubs (no faked). navegador `token-gate` wiring a sesiones deferred a módulo integración. | ✅ hecho |
| **P3** | TSA RFC 3161 verificación: firma-over-signedAttrs + mensaje imprint + X.509 **chain-to-trust-store** + validity (eIDAS admissibility). Zero-dep (`node:crypto`). `verifyTimestampToken`, adaptador `submit` retorna `verification`, más `/adapter/tsa/verify` endpoint. OCSP/CRL revocación comprobar deferred. | ✅ hecho |
| **P4** | Cross-site transporte: token-gated `/relay` servidor-mediated datos relé (servidor-blind respaldo cuando ningún TURN) + STUN/TURN configuración surfaced vía `/session` + servidor-side **clave-escrow** política (`/escrow` deposit/retrieve, operador break-glass) | ✅ hecho |
| **P5** | Revocación: local CRL/OCSP-style deny-list de clave fingerprints (`/admin/revoke`) + **admission-time comprobar** en `/session` | ✅ hecho |
| **P6** | Production-leaning UI foundation: unificado **diseño sistema** + **operador consola** (`/aegis-shell/console.html`) que hace P1–P5 servidor funcionalidades usable (inicio de sesión, auditoríun, revocación, escrow, TSA verificar). módulo producto UIs son functional pero no redesigned en este aprobado. | ✅ hecho (foundation) |
| **P7** | cumplimiento shell: **i18n** (en/de/fr/es) + **PWA** (manifest + sin conexión servicio worker) + **SBOM** generación (CycloneDX) + **amenaza modelo** + **CRA/NIS2** + **seguridad.md** self-assessment. Independiente tercero penetración prueba permanece obligatorio (no puede ser ejecutado por este proyecto — expresamente fuera de alcance). | ✅ hecho (pen-test externo) |

El operaciones consola es available en Inglés, Alemán, French y Spanish. módulo interfaces son en Inglés. soporte y correspondence son proporcionado en Inglés y Alemán.

### 14.3 Honesto alcance nota

Two elementos no puede ser cerrado por código alone:

- **Independiente penetración prueba** (parte de P7) debe ser ejecutado por un third parte
  — este proyecto puede solo produce el amenaza modelo y un interno self-assessment.
- P6 (completo UI) y P7 (localization/a11y/PWA) son el largest phases y son
  deliberadamente late en el order así el seguridad + datos foundations son solid primero.
