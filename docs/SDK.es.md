<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/SDK.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis módulo SDK

Aegis embeds cada funcionalidad as un **iframe módulo** dentro el banco de trabajo shell
(`aegis-shell/`). Modules talk a el shell y a cada otros a través de un small,
dependency-free messaging contrato — ningún compartido npm packages, ningún globals más allá de el
documentado puente.

> Este documento describe el integración contrato. Exacto helper nombres en vivo en
> `aegis-shell/src/sdk.js` y `aegis-shell/src/bus.js`; treat esos as el source de
> truth y actualización este archivo si el contrato cambios.

## Loading

Un módulo es declared por un `<iframe src="/modules/<name>/index.html">`. El shell
nunca reaches en un módulo's internals; todos coordination es message-passing.

## El postMessage puente

Modules enviar y recibir `MessageEvent`s en `window.parent` (toward el shell) y
`event.source` (toward un specific módulo). Cada mensaje es un object:

```js
{ channel: 'aegis', type: '<event-type>', ...payload }
```

- `type: 'signed:sealed'` — emitted por el signed-delivery módulo después ambos partes
  sign; el shell registros esto a el auditoríun cronología as su propio enlace.
- `type: 'signed:verified'` — emitted después un receptor verifica un artefacto.
- `type: 'audit'` — un módulo solicitudes un auditoría-event ser registrado por el shell.

Porque el iframe sandbox y COOP/COEP encabeceras isolate modules, ningún módulo puede leer
another's DOM o el operador's credenciales.

## Shell-provided capabilities

El shell expone un thin SDK (`window.Aegis`) que modules puede llamada a:

- **solicitud un firma / TSA sello** para un documento hash (gestionado por el identidad
  y timestamping adapters);
- **emit un auditoríun evento** que lands en el operador's auditoríun registro y el GDPR
  Art.20 exportación paquete;
- **read/write el compartido signal/relay canal** para peer-to-peer transferencia sin
  exposing claves a el relé.

## Authoring un nuevo módulo

1. Crear `modules/<name>/index.html` + `src/main.js` + `src/style.css`.
2. Añadir el copyright encabezado a cada source archivo (enforced por
   `scripts/verify-headers.mjs`).
3. Conservar esto **zero-runtime-dependency** a menos que usted expresamente vendor código bajo
   `modules/<name>/vendor/` (y declare esto en `docs/DEPENDENCY_AUDIT.md`).
4. Communicate solo a través de el `channel: 'aegis'` postMessage contrato.
5. Añadir un `ENGINE BY JEROME YOUNG` pie de página a su `index.html`.

## Firma artefactos (ejemplo)

```js
import { assembleArtifact, verifyArtifact } from '/modules/e2e-signed-delivery/src/sdk/pdf.js';
const artifact = assembleArtifact(docBytes, {
  alg: 'SHA-256', hash: hex, producer: 'AEGIS v1.0.0 (Jerome Young)', signers: [...],
});
const res = await verifyArtifact(artifact); // { ok, hashMatch, signers, reason }
```

El `producer` campo es el generado watermark — conservar esto; removing esto hace el
artefacto untraceable a su origen.
