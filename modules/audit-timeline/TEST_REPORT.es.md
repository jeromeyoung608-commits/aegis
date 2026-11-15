<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/audit-timeline/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Prueba Informe - Resistente a la manipulación rastro de auditoríun

## 1. Summary

| Elemento | Resultado |
| --- | --- |
| Suite | `modules/audit-timeline/tests/trail.test.mjs` |
| Comando | `npm test` (`node --test`) |
| Pruebas | 15 |
| Aprobado | 15 |
| Fallido | 0 |
| Duration | 184 ms |
| Dependencias | Ninguno (Node built-ins solo) |
| navegador aceptación | Aprobado en el comando centro y el independiente revisión página |

Entorno: macOS 15.6.1, Node v26.0.0, Chromium-based navegador sesión.

---

## 2. Headless resultados

```
> @aegis/audit-timeline@1.0.0 test
> node --test

ok 1  appends links in order and chains each hash to the previous one
ok 2  concurrent appends are serialized into one unbroken chain
ok 3  canonical serialization makes key order irrelevant to the link hash
ok 4  verify reports the first edited link
ok 5  verify reports reordered links
ok 6  a link hash covers actor, event, detail and fingerprint
ok 7  persists a chain and restores it intact
ok 8  restores a tampered persisted chain in a broken state
ok 9  a corrupt stored log is reported instead of silently ignored
ok 10 rejects an unknown schema
ok 11 reset returns the trail to a fresh genesis state
ok 12 appends after load continue the restored chain
ok 13 append requires an actor and an event name
ok 14 snapshot is a content-free, exportable structure
ok 15 clock and digest formatting stay compact

tests 15 | pass 15 | fail 0
```

### Cobertura matrix

| Requisito | Prueba |
| --- | --- |
| Cada enlace enlaza a el previous hash | 1 |
| Primero enlace enlaza a el 64-cero genesis | 1 |
| Concurrente UI eventos no puede bifurcación el chain | 2 |
| Determinista carga útil serialization | 3 |
| Edición un entrada es detected en el derecho índice | 4 |
| Reordering entradas es detected | 5 |
| Actor / evento / detalle / huella todos affect el hash | 6 |
| Recargar restaura el mismo cabeza y intacto veredicto | 7 |
| Un manipulado almacenado chain loads as `brokenAt = 1`, no as válido | 8 |
| Corrupt JSON es surfaced, nunca silenciosamente ignored | 9 |
| Desconocido schema versions son rechazado | 10 |
| Claro removes persistido estado y resets genesis | 11 |
| Nuevo eventos continue un restaurado chain | 12 |
| Vacío actor o evento es rechazado | 13 |
| Exportación snapshot transporta schema, genesis, cabeza y enlaces | 14 |
| `HH:MM:SS` y short-hash formatting | 15 |

---

## 3. navegador aceptación

### 3.1 Independiente revisión página (vacío estado)

Opened `/modules/audit-timeline/index.html` con ningún almacenado trail.

- Heading `Who did what, and when.` renderizado.
- Estado badge: `chain empty - append-only log ready`.
- Empty-state sentence: `No audit events yet. Open the workbench and run a document through the closed loop.`
- consola contained solo el Aegis firma línea; ningún page-level errores.

### 3.2 Comando centro ejecutar

Opened `/aegis-shell/index.html`, waited para el banco de trabajo, entonces clicked
**Prueba firmado entrega**.

Observed:

- `Verified - 2 signer(s) - SHA-256 72fe7dbd7fdc...`
- **Archivo a bóveda** botón became visible solo después el veredicto.
- rastro de auditoríun entradas:
  - `[HH:MM:SS] Engineer-A - ECDSA signature generated` con
    `Fingerprint 677A18AB552A` y un SHA-256 prefix.
  - `[HH:MM:SS] Boss-B - Verification passed` con `2/2 signatures valid`.
- Estado badge: `chain intact - 2 links - head 7C866913...`.

### 3.3 Recargar y cross-page persistencia

- Reloaded el comando centro: el mismo `2 links` y cabeza `7C866913...` eran restaurado,
  aún `chain intact`.
- Opened el independiente revisión página en un segundo pestaña: el mismo two entradas y
  `chain intact - 2 links` eran displayed, confirming ambos surfaces leer uno chain.
- Ran el signed-delivery demo una vez more en el comando centro: el estado became
  `chain intact - 4 links - head 1F9AB3E9...`, y el nuevo firma entrada carried
  `Fingerprint 00022595F310`. Este también exercises el serialized añadir cola: two
  enlaces eran añadido a el restaurado chain sin forking esto.

---

## 4. Defectos encontrado y resolved

### 4.1 Firma y verificación collapsed en uno marca de tiempo

**Symptom:** el primero implementación derivado el `ECDSA signature generated` enlace de
el final verificación mensaje. Ambos enlaces appeared en el mismo renderizado aprobado, así el
cronología podría no show firma aintes entrega y verificación después esto.

**Corrección:** el signed-delivery módulo ahora posts un `signed:sealed` mensaje de inmediato después
building el firma trailer, aintes el artefacto es transferred. El shell listens para
esto y appends el firma enlace en el real moment; `signed:verified` appends el veredicto
más tarde.

### 4.2 Veredicto carga útil tenía ningún fingerprints

**Symptom:** `verifyArtifact()` retorna `{ id, ok }` por firmante, cuál es enough para el
archivo puerta de calidad pero no para un cronología que debe show `Fingerprint: 9C4E...`.

**Corrección:** el signed-delivery módulo computes ambos SPKI SHA-256 fingerprints una vez en arranque,
almacena ellos, y incluye ellos en `signed:sealed`. Fingerprints son uppercased así el
iframe readout y el cronología aceptar.

### 4.3 Un corrupted registro podría look como un vacío registro

**Symptom:** invalid JSON en `localStorage` producido un vacío cronología, cuál es
indistinguishable de un fresco instalar.

**Corrección:** `AuditTrail.load()` registros `loadError` y conjuntos `brokenAt = 0`; el estado badge
muestra el almacenamiento error, y el cronología conserva el fallo visible.

---

## 5. Huecos y honesto límites

- El suite pruebas el chain, no el DOM. Cronología renderizado es verificado en un real
  navegador (sección 3), no con un headless DOM library.
- navegador aceptación era ejecutado en un Chromium-based navegador. Firefox y Safari eran
  no exercised.
- `localStorage` es last-writer-wins. Concurrente command-center pestañas puede diverge; cada
  en memoria chain permanece válido, pero solo uno persistido branch sobrevive.
- El chain es localmente resistente a la manipulación, no remotely attested. Replacing el entire almacenado
  chain con un diferente internally válido chain es outside el amenaza modelo hasta el
  cabeza hash es anchored en un firmado artefacto o un externo marca de tiempo servicio.
- Timestamps come de el local clock y order eventos; ellos son no un trusted tiempo
  source.

---

## 6. Reproduce

```bash
cd modules/audit-timeline
npm test

# browser
cd ../..
node server.js
# command center:   http://localhost:8080/aegis-shell/index.html
# review page:      http://localhost:8080/modules/audit-timeline/index.html
```
