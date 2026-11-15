<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: CONTRIBUTING.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Contributing a Aegis

Thanks para su interest. Aegis es **abierto source** bajo el **Apache licencia
2.0** (SPDX `Apache-2.0`; véase `LICENSE`). Contributions son accepted bajo el
mismo licencia.

## Ways a contribute

- **Informe problemas** con un mínimo reproduction y el exacto build/version.
- **Propose cambios** vía un pull solicitud contra `main`. Para anything que touches
  el seguridad límite (servidor.JS, auth, cumplimiento gates, criptografía) abierto un problema
  primero.
- **Localization** — translation catalogs en vivo en `aegis-shell/src/i18n.js`
  (en/de/fr/es). Añadir un clave a todos cuatro catalogs y a el referencia conjunto usado por
  `aegis-shell/src/i18n-keys.test.js`.

## Developer setup

```bash
npm run setup        # one-click install / dev bootstrap
npm test             # runs every module's suite + repo gates
npm run verify:all   # TSA + p4/p5 checks
npm run doctor       # 9 pre-flight checks
npm run pack:delivery && npm run verify:delivery   # reproducible shipping archive
```

## Coding reglas

- **Cero tiempo de ejecución dependencias** para el shell, servidor, y 9 de 11 modules. Solo
  `doc-redactor` (pdf.JS, pdf-lib, tesseract.JS, tessdata) y `e2e-signed-delivery`
  (pdf-lib) vendor tercero código. Véase `docs/DEPENDENCY_AUDIT.md`.
- **Watermarks son enforced por gates.** Cada entregado `.js/.mjs/.ts/.css/.html` archivo
  debe carry el copyright encabezado (`scripts/verify-headers.mjs`, wired en
  `npm test`). Do no eliminar `ENGINE BY JEROME YOUNG` footers o generado
  `producer`/`provenance` campos.
- **Ningún privado rutas, ningún secretos en el árbol.** `scripts/package-delivery.mjs` será
  refuse a compilación si `data/`, `config/local.json`, o clave material sería ship.

## licencia de su contribución

Aegis es licenciado bajo Apache-2.0. Por submitting un contribución usted aceptar que
esto es licenciado bajo Apache-2.0 (inbound = outbound). Ningún copyright assignment
y ningún CLA es obligatorio.

Cada commit debe carry un Developer Certificado de Origen sign-off:

    Signed-off-by: Su Nombre <usted@ejemplo.com>

Usar `git commit -s`. Pull solicitudes sin sign-off son no merged.
