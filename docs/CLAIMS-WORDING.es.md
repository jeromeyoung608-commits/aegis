<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/CLAIMS-WORDING.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis — afirmaciones redacción (normative)

**Estado**: normative redacción línea base, 2026-11-13. Se aplica a README, entrega
informes, UI copia, comments y sales material. Technical behaviour es unchanged;
solo el palabras usado a describe esto son corregido.

Este archivo existe porque tres términos eran usado as marketing shorthand para things
Aegis hace **no** implement. Directorio y módulo nombres son historical y son
kept (renaming ellos sería break importaciones y pruebas), pero ellos debe nunca ser leer
as criptográfico afirmaciones.

## 1. Forbidden afirmaciones y obligatorio replacements

| Do no decir | Por qué esto es incorrecto | Decir en cambio |
|---|---|---|
| `forward secrecy` | Uno PBKDF2 sesión clave es reused para cada fragmento. Un fresco IV por fragmento evita IV reuse; esto hace no provide clave borrado o compromise-resistance. | **per-chunk authenticated cifrado con un fresco aleatorio IV** (añadir "ningún forward secrecy" cuando el amenaza modelo es discussed) |
| `blind signature` | Allí es ningún blinding factor y ningún unblinding paso. El firmante firma un hash ellos puede véase. | **desacoplado hash firma** (añadir "no un criptográfico ciego firma scheme") |
| `immutable` / `Immutable Audit Trail` | Un cadena de hash es resistente a la manipulación, no immutable: un operador con escribir acceso puede recompute el completo chain. Con `hmacKey` conjunto esto es HMAC-bound; sin esto, plano SHA-256 enlaces son solo un detección aid. | **resistente a la manipulación cadena de hash** (y estado cuál modo es en usar) |
| `Prove who signed it` | ECDSA verifica possession de un clave, no un legal identidad. Ningún CA, ningún KYC. | **verificar integridad contra un auto-declarado firmante clave** (`trust: 'self-asserted'`) |
| `Role views are enforced` | Rol switching es CSS-level presentation solo. | **rol views cambio el UI solo — no un access-control límite** |
| `zero-knowledge` | El módulo wraps claves localmente; esto ejecuta ningún ZK prueba y tiene ningún servidor protocol. | **localmente self-custodied claves** (directorio nombre `zero-knowledge-identity` es historical) |
| `Blind relay` (as un criptografía afirmación) | El relé reenvía texto cifrado esto no puede leer; que es transporte blindness, no un blind-firma scheme. | **servidor-blind texto cifrado relé** |

## 2. Redacción que permanece (verificado por auditoríun)

- `destructive redaction` — byte-level verificación aprobado; el exportado PDF tiene
  ningún recoverable texto capa.
- `server never sees plaintext` — el relé reenvía texto cifrado solo.
- `100k+ nodes at 60fps` — medido 100k / 54–60fps.

## 3. Naming exception

`modules/detached-hash-signer`, `modules/blind-relay` y
`modules/zero-knowledge-identity` conservar su directorio nombres para compatibility.
Cada user-facing documento debe pair el nombre con el accurate término encima y
debe no describe el implementación as forward-secreto, blind-firma o
conocimiento cero cryptography.

## 4. Alcance

Estos son redacción corrections solo. Ningún API, exportación, archivo ruta, wire formato,
criptografía primitive o access-control decision es changed por este línea base.
