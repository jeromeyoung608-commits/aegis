<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Prueba Informe · Local Cifrado bóveda (auditoríun & Archivo)

módulo: `modules/encrypted-archive`
Fecha: 2026-11-10
Tiempo de ejecución: Node 26 (integrado `node:test`, integrado Web Criptografía), Chrome 141 en macOS
Dependencias: ninguno

---

## 1 · Veredicto

**Aprobado** — 23 / 23 headless aserciones y el navegador aceptación ruta.

| Capa | Resultado |
| --- | --- |
| Contenedor (sello / abierto / manipulación) | 11 / 11 aprobado |
| bóveda API (sello / lista / abierto / eliminar) | 6 / 6 aprobado |
| Almacenamiento adapters (memoria / OPFS guarda / ID) | 6 / 6 aprobado |
| navegador: sello de shell → recargar → re-list | Aprobado |
| navegador: independiente bóveda lee shell's OPFS registro | Aprobado |

---

## 2 · Cómo a reproduce

```bash
cd modules/encrypted-archive
node --test
```

Medido tail:

```
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3299.02975
```

navegador ruta:

```bash
# repository root
node server.js
# open http://localhost:8080/, then:
#   Test signed delivery → Verified → Archive to Vault → passphrase → Seal to vault
```

---

## 3 · Aserción matrix

### 3.1 `tests/container.test.mjs` — 11 aserciones

| # | Aserción | Qué esto prueba |
| --- | --- | --- |
| 1 | sellado contenedor round-trips bytes y metadatos | lossless seal/open |
| 2 | público encabezado parses sin un frase de contraseñun | índice puede show sizes mientras bloqueado |
| 3 | archivo bytes y metadatos son absent de el contenedor | confidentiality de nombres y contenido |
| 4 | incorrecto frase de contraseñun → `Vault unlock failed` | distinct, actionable fallo |
| 5 | uno flipped texto cifrado byte → `integrity check failed` | digest pre-check works |
| 6 | falsificado digest + manipulado bytes → `unlock failed` | GCM etiqueta es el real límite |
| 7 | roto magic rechazado | malformed entrada falla early |
| 8 | truncated contenedor rechazado | longitud validation |
| 9 | frase de contraseñun shorter que 8 caracteres rechazado | política enforced en el API |
| 10 | texto sin cifrar staging búfer es zeroed cuando sellado retorna | memoria hygiene |
| 11 | (mismo prueba cuerpo) zeroing cubre metadatos + archivo bytes | ningún partial wipe |

Aserción 10/11 son two comprobaciones dentro uno `test()` cuerpo; el runner recuentos ellos as uno
prueba, hence 10 contenedor pruebas y 11 aserciones a través de el archivo.

### 3.2 `tests/vault.test.mjs` — 6 pruebas

| # | Aserción | Qué esto prueba |
| --- | --- | --- |
| 1 | sello → lista → abierto ida y vuelta | producto API es coherent |
| 2 | listing hides archivo nombres | el índice es opaco |
| 3 | two seals obtener distinct ID | ningún id collision en practice |
| 4 | incorrecto frase de contraseñun deja el registro intacto | fallido desbloquear es non-destructive |
| 5 | eliminar deletes exactamente uno registro | scoped deletion |
| 6 | vacío archivo y tamaño cap son refused | guardrails con claro mensajes |

### 3.3 `tests/store.test.mjs` — 6 pruebas

| # | Aserción | Qué esto prueba |
| --- | --- | --- |
| 1 | memoria adaptador implementa put/get/list/remove/clear | interfaz completeness |
| 2 | lee devolver copies, no compartido buffers | caller no puede mutate almacenado bytes |
| 3 | `recordFileName` rechaza `../`, absolute rutas, uppercase, vacío | ruta traversal impossible |
| 4 | archivo nombres mapa atrás a ID | listing permanece coherente |
| 5 | `opfsSupported()` es falso en Node | funcionalidad detección es honesto |
| 6 | `openOpfsStore()` rechaza en Node | ningún silent fake persistencia |

---

## 4 · navegador aceptación

Entorno: Chrome 141, `http://localhost:8099/` (`node server.js` con COOP/COEP).

| Paso | Action | Observed |
| --- | --- | --- |
| 1 | Clic **Prueba firmado entrega** | `Verified · 2 signer(s) · SHA-256 6930443e3a3b…` |
| 2 | Verificación veredicto reaches el shell | oro **Archivo a bóveda** botón appears solo después un aprobado veredicto |
| 3 | Clic **Archivo a bóveda** | nativo `<dialog>` abre, muestra el artefacto nombre |
| 4 | Entrar `vault-pass-123`, press **Sello a bóveda** | `Archived to the local vault: 5a8af386-add8-483b-9279-e1ca70f53e25 (52576 B payload → 53324 B sealed, AES-GCM-256).` |
| 5 | Inspect barra lateral | `1 sealed record · 52.1 KB ciphertext · opfs` |
| 6 | Recargar el comando centro | mismo línea: `1 sealed record · 52.1 KB ciphertext · opfs` |
| 7 | Abierto el independiente bóveda página | `1 record`, uno `.row-item`, `OPFS · aegis-vault` |

Overhead para que registro: 53324 − 52576 = **748 bytes**, cubriendo el 8-byte magic,
versión byte, 4-byte encabezado longitud, el JSON encabezado (sal, IV, digest, sizes) y el
16-byte GCM etiqueta.

Negative comprobaciones que eran no acceptable en el UI: el archivo botón es oculto aintes un
verificación, y un rechazado firma conjuntos `signedState` a `Rejected: …` sin
offering el botón.

---

## 5 · Defectos encontrado durante el compilación

### 5.1 Blob transferencia en un oculto iframe stalled

**Symptom.** El primero integración embedded el bóveda página en un oculto iframe y posted
`archive:store` con el artefacto Blob. El dialog stayed en `Sealing…` indefinitely; el
bóveda iframe logged ningún receipt, although su `archive:list` ida y vuelta worked.

**Diagnosis.** Control mensajes (strings solo) crossed el límite; el registro carga útil
hizo no. Más bien que guess en structured-clone behaviour, el arquitectura era simplified:
el shell ahora importaciones `createVault` y `openOpfsStore` directamente. OPFS es per-origin, así
el independiente página aún browses el mismo `/aegis-vault` directorio. Este eliminado uno
mensaje hop, uno marco, y uno clase de fallo.

**Verificación.** Después el cambio, el mismo clic ruta producido el archivo registro en el
primero attempt, y paso 7 de el navegador tabla prueba ambos surfaces compartir uno bóveda.

### 5.2 Corregido BroadcastChannel sala caused cross-tab interference

**Symptom.** Con two command-center pestañas abierto, el receptor sometimes ended en
`signaling-error: Failed to execute 'setRemoteDescription'`. Un desactualizado pestaña answered el mismo
room's offer.

**Corrección.** Ambos el signed-delivery página y el shell derive su sala de un per-load
aleatorio suffix (`aegis-signed-delivery-<nonce>`, `aegis-demo-<nonce>`). Sesiones ningún más largo
collide, y el demo es repeatable sin closing cada otros pestaña.

**Verificación.** Repeated se ejecuta con two pestañas abierto: firma, verificación y archiving
completo sin señalización errores.

---

## 6 · seguridad notas verificado por prueba

- Texto sin cifrar nunca deja memoria en cleartext form en disco: el contenedor texto contiene ningún
  archivo nombre, ningún carga útil substring y ningún metadatos claves (aserción 3.1.3).
- El derivado KEK es non-extractable; el módulo nunca llamadas `exportKey` en esto.
- Ruta traversal es bloqueado en el adaptador límite, no por string replacement en el UI.
- Integridad fallos son informado aintes un frase de contraseñun es derivado, así un corrupted registro
  costs ningún KDF work.
- Un incorrecto frase de contraseñun no puede destroy o rewrite un registro (3.2.4).

---

## 7 · Qué es no cubierto

- Real multi-megabyte PDF (el cap es 64 MB; pruebas usar small payloads).
- OPFS quota exhaustion y storage-eviction eventos.
- Cross-navegador OPFS behaviour (Firefox/Safari eran no parte de aceptación).
- Screenshot-level visual regresión de el bóveda página.
