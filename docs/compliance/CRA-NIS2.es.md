<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/CRA-NIS2.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis — CRA / NIS2 Preparación

Mapping de el UE **Cyber Resilience Act (CRA)** y **NIS2 Directive** expectations
a concrete Aegis controles. ✅ = implementado, 🟡 = partial / design-ready,
⏳ = planned.

## Secure-by-design & predeterminado (CRA Anexo I.1)
- ✅ **Cero npm tiempo de ejecución dependencias.** El núcleo núcleo es primera parte + `node:*` solo.
  navegador modules vendor tercero libraries (PDF.JS, pdf-lib, Tesseract.JS) bajo
  `vendor/` directories, y prueba harnesses usar `playwright` — todos listed **honestly**
  en el CycloneDX SBOM (`scripts/gen-sbom.mjs`). Ningún unsupported/abandoned componentes.
- ✅ **Local-first, sin conexión** — ningún obligatorio cloud; datos procesado in-navegador.
- ✅ **servidor-blind transferencia** — el relé nunca ve archivo bytes o claves.

## Vulnerability handling (CRA Anexo I.2 / NIS2 incidente)
- ✅ **rastro de auditoríun** durable en SQLite; operador-facing y append-only (P1).
- 🟡 **Revocación** — local CRL-style deny-list en sesión admisión (P5); un
  coordinated disclosure proceso / PSIRT es **no aún published** (planned).
- ⏳ **Independiente penetración prueba** — obligatorio aintes producción afirmación.

## Documentación & transparency (CRA Anexo I.3)
- ✅ **SBOM** generado vía `npm run` / `scripts/gen-sbom.mjs`.
- ✅ **Amenaza modelo** (`docs/compliance/THREAT-MODEL.md`).
- 🟡 **seguridad política** (`SECURITY.md`); **no aún** un externo bug-bounty.

## NIS2 governance / supply chain
- 🟡 Single-maintainer abierto source (Apache-2.0); supply chain es solo Node.js (LTS recommended).
- ⏳ Formal **conformance / EN 301 549 (accessibility)** testing — P7 (WCAG 2.1 AA
  foundations started vía el diseño sistema + i18n).

## Honesto huecos (do no over-claim)
1. Ningún tercero pen-test aún.
2. Ningún published PSIRT / SLA para divulgación de vulnerabilidades.
3. Accessibility conformance es *foundational*, no *certified*.
4. El auditoríun registro prueba el servidor *saw* un evento; esto hace no por él mismo demostrar
   client-side correctness — pair con el in-navegador cadena de hash.

## Language de usuario información

seguridad-relevant usuario información es proporcionado a través de el producto UI en
Inglés, Alemán, French y Spanish. Formal notices a clientes son emitido en
Inglés y Alemán.

## Rol

Aegis es published as open-source software bajo Apache-2.0; el mantenedor
proporciona pagado soporte servicios. Whether un given distribution hace el
mantenedor un "manufacturer" bajo el CRA depende en el commercial activity
concerned y es assessed por encargo, no asserted aquí.
