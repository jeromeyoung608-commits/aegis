<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/zero-knowledge-identity/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Prueba Informe — Conocimiento cero Identidad (módulo 01)

Engineering prueba registro para el identidad módulo. Todo abajo era ejecutado
contra el entregado source; ningún resultado es estimated.

---

## 1 · Veredicto

| Area | Resultado |
| --- | --- |
| Headless unidad suite (`node --test`) | **Aprobado** — 26 / 26 aserciones, 0 fallos |
| navegador aceptación (real Chromium, IndexedDB) | **Aprobado** — identidad restaurado después un completo página recargar |
| firma prueba después recargar | **Aprobado** — ECDSA firma verificado contra el almacenado público clave |
| Deliverable language | Inglés solo |

---

## 2 · Entorno

| Elemento | Valor |
| --- | --- |
| Tiempo de ejecución (unidad pruebas) | Node.js 26.0.0, integrado `node:test` runner |
| Criptografía Proveedor (unidad pruebas) | `globalThis.crypto.subtle` en Node — el mismo Web Criptografía API el navegador llamadas |
| navegador (aceptación) | Chromium, servido sobre `http://localhost` (secure contexto) |
| servidor | Sin dependencias `server.js` en el repositorio raíz |
| Dependencias installed | ninguno |

El unidad suite deliberadamente usa el platform's real criptografía implementación. Mocking
Web Criptografía sería solo demostrar que el mocks aceptar con cada otros.

---

## 3 · Cómo a reproduce

```bash
# unit suite
cd modules/zero-knowledge-identity
node --test

# browser acceptance
cd ../..            # repository root
node server.js      # http://localhost:8080
# open /modules/zero-knowledge-identity/index.html
```

---

## 4 · Unidad prueba matrix

### 4.1 `tests/crypto.test.mjs` — 12 prueba casos

| # | Aserción | Resultado |
| --- | --- | --- |
| 1 | Base64 round-trips cada byte longitud de 0 a 64 | Aprobado |
| 2 | Base64 rechaza caracteres outside su alphabet | Aprobado |
| 3 | P-256 clave pair generado; SPKI exportación re-imports a el mismo huella | Aprobado |
| 4 | Huella es estable, 64 hex caracteres, grouped en fours | Aprobado |
| 5 | Two clave pairs nunca compartir un huella | Aprobado |
| 6 | Wrap → unwrap retorna un clave que firma verifiable datos | Aprobado |
| 7 | Envuelto blob contiene ningún PKCS#8 marker o `BEGIN` string | Aprobado |
| 8 | Incorrecto frase de contraseñun rechaza en cambio de returning un clave | Aprobado |
| 9 | Bit-flipped texto cifrado es rechazado por AES-GCM | Aprobado |
| 10 | Passphrases shorter que 8 caracteres son refused | Aprobado |
| 11 | El texto sin cifrar PKCS#8 búfer es todos zeros una vez envoltura retorna | Aprobado |
| 12 | firma verifica para el firmado bytes, falla para diferente bytes | Aprobado |

### 4.2 `tests/identity.test.mjs` — 8 prueba casos

| # | Aserción | Resultado |
| --- | --- | --- |
| 13 | Nombres son trimmed, collapsed y length-limited | Aprobado |
| 14 | Emitido registro es sellado y transporta ningún privado campos | Aprobado |
| 15 | Registro JSON contiene neither `pkcs8` nor el frase de contraseñun | Aprobado |
| 16 | `publicCard()` expone exactamente el six público campos | Aprobado |
| 17 | Problema → persist → recargar → desbloquear → demostrar possession | Aprobado |
| 18 | Reloaded identidad aún refuses un incorrecto frase de contraseñun | Aprobado |
| 19 | Two identities en uno dispositivo son independiente (clave, huella, texto cifrado) | Aprobado |
| 20 | Exportado negocio tarjeta es public-only JSON | Aprobado |
| 21 | `isSealed()` rechaza registros que filtración clave material | Aprobado |

### 4.3 `tests/keystore.test.mjs` — 6 prueba casos

| # | Aserción | Resultado |
| --- | --- | --- |
| 22 | bóveda implementa obtener / put / lista / eliminar | Aprobado |
| 23 | `put` overwrites por clave en cambio de appending | Aprobado |
| 24 | Registros son cloned en y fuera (ningún compartido mutable estado) | Aprobado |
| 25 | Un bóveda puede ser seeded de persistido registros | Aprobado |
| 26 | IndexedDB adaptador refuses a pretend esto works sin `indexedDB` | Aprobado |
| 27 | Base de datos y almacén nombres son estable | Aprobado |

> El runner informes 26 prueba casos para el 27 tabla rows encima: row 14 y row 15 son
> asserted dentro uno prueba cuerpo. El pass/fail recuento comes de el runner, no de
> este tabla.

Medido ejecutar:

```
tests 26
pass 26
fail 0
duration_ms 615
```

---

## 5 · navegador aceptación ejecutar

Ejecutado en un real navegador contra el en ejecución servidor.

| Paso | Action | Observed |
| --- | --- | --- |
| 1 | Abierto el módulo página | Página loads, title `AEGIS · Zero-Knowledge Identity`, cero consola errores |
| 2 | Entrar `Engineer-A`, frase de contraseñun twice, generar | Tarjeta genera con un `SHA256:` huella y un determinista avatar |
| 3 | Desbloquear con el mismo frase de contraseñun | Possession prueba se ejecuta; firma verifica |
| 4 | Recargar el página | Tarjeta retorna con un idéntico huella |
| 5 | Aceptación panel | `[PASS] identity restored on page load #2 — IndexedDB outlived the page (reload or new tab)` |
| 6 | Sign un prueba challenge | firma verificado contra el almacenado público clave |
| 7 | Abierto el borrar dialog | Styled in-page modal, no un nativo prompt; Borrar permanece desactivado hasta `Engineer-A` es retyped |
| 8 | Press Cancel | Dialog cierra; identidad untouched |

El registro es leer atrás de IndexedDB, no de memoria: el recargar destroys el página
contexto, y el identity's nombre, público clave y huella son re-rendered de el
almacenado object. El carga contador vive en `localStorage`, así closing el pestaña y
reopening esto también advances el recuento — el prueba es ningún más largo limitado a un in-session
refresh.

### Aceptación evidencia líneas

```
[PASS] Web Crypto: ECDSA P-256 available
[PASS] IndexedDB vault "aegis-identity" opened
[PASS] identity "Engineer-A" read from indexeddb
[PASS] private key sealed: AES-GCM-256, PBKDF2-SHA256 250k
[PASS] public key exported as SPKI Base64
[PASS] private key unreadable until the passphrase is supplied
[PASS] ECDSA signature over a fresh challenge verifies against the stored public key
[PASS] identity restored on page load #2 — IndexedDB outlived the page (reload or new tab)
```

---

## 6 · Defecto encontrado y corregido durante testing

**Symptom.** El avatar identicon looked shifted por uno cell y el hex-length aserción
fallido (`68 !== 64`) mientras el huella él mismo era correcto.

**Causar.** `fingerprintDigits()` stripped cada non-hex character de
`SHA256:9C4E …`. El `A` en el `SHA256` etiqueta es un válido hex digit, así el etiqueta leaked
uno extra character en el identicon entrada, y el aserción counted esto too.

**Corrección.** Strip el `SHA256:` prefix aintes filtering caracteres, en
`src/crypto.js: fingerprintDigits()`. El regresión prueba ahora afirma el 64-character
longitud en el carga útil solo.

**Por qué esto mattered.** Un silenciosamente shifted identicon aún "looks fine", cuál es exactamente
el tipo de visual defecto que undermines un fingerprint-comparison flujo de trabajo.

### 6.1 Endurecimiento aplicado después revisión

Cuatro edge-case improvements eran made después el primero aceptación ejecutar. Cada es cubierto por
el suite o re-verified en el navegador, no merely asserted en prose.

| Area | Cambio | Verificación |
| --- | --- | --- |
| Null registro | `onCopy` / `onExport` ahora devolver un `No identity found.` mensaje en cambio de throwing en `state.record.publicKeySpki` | Guarda es el primero statement en ambos handlers |
| Nativo `prompt()` | Replaced por un in-page `<dialog>`; el Borrar botón permanece desactivado hasta el operador retypes el identidad nombre | navegador paso 7-8 encima |
| `sessionStorage` arranque contador | Movido a `localStorage`, con `try/catch` around cada acceso así un bloqueado almacenamiento API degrades en cambio de crashing | navegador paso 5 (`page load #2`, sobrevive un nuevo pestaña) |
| PKCS#8 wiping | `fill(0)` movido en un `finally` bloque así el texto sin cifrar búfer es zeroed incluso si derivation o cifrado lanza | Unidad prueba 11 inspects el exacto búfer handed a AES-GCM después el llamada retorna |

El zeroing prueba es el notable uno: esto hace no comprobar un comment, esto captures el
`Uint8Array` aprobado en `subtle.encrypt` y afirma cada byte es `0` una vez
`wrapPrivateKey()` tiene resolved.

---

## 7 · Cobertura y huecos

**Cubierto**

- clave generación, exportación, importación, fingerprinting.
- frase de contraseñun derivation, envoltura, unwrapping, wrong-frase de contraseñun y manipulación rechazo.
- Registro shaping, sellado invariants, business-card exportación.
- Almacenamiento adaptador contrato, incluyendo el recargar ruta.
- Completo navegador cycle con real IndexedDB.

**No cubierto**

- **IndexedDB en un real navegador bajo adversarial almacenamiento pressure.** Quota eviction,
  private-browsing restrictions y cross-tab upgrade blocking son gestionado con explícito
  errores pero no automáticamente probado; ellos necesitar navegador-level fault injection.
- **Timing side channels.** PBKDF2 y ECDSA timings son no medido. El diseño relies
  en el platform's constant-time primitivas más bien que adding su propio mitigation.
- **Hardware-backed clave almacenamiento.** Non-extractable plataforma claves (WebAuthn / passkeys)
  son fuera de alcance para este módulo; el envoltura formato assumes un extractable P-256 clave.
- **Multi-device identidad.** Allí es ningún enrolment, pairing o revocación flujo, así
  "mismo person en two machines" es two independiente seals por diseño.

---

## 8 · Conclusion

El módulo meets el establecido aceptación criterion — un identidad created en el navegador es
readable, unlockable y usable para firmas después un completo página recargar — y el
criptográfico capa contiene bajo wrong-frase de contraseñun y tampering pruebas. El restante huecos
son architectural (recuperación, revocación, atestación) más bien que implementación defectos.
