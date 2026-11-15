<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/SDK.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis module SDK

Aegis embeds chaque fonctionnalité as un **iframe module** à l.íntérieur le établi shell
(`aegis-shell/`). Modules talk à le shell et à chaque autres à travers un small,
dependency-free messaging contrat — aucun partagé npm packages, aucun globals au-delà le
documenté pont.

> Ce document décrit le intégration contrat. Exact helper noms direct dans
> `aegis-shell/src/sdk.js` et `aegis-shell/src/bus.js`; treat ceux as le source de
> truth et mise à jour ce fichier si le contrat modifications.

## Loading

Un module est declared par un `<iframe src="/modules/<name>/index.html">`. Le shell
jamais reaches dans un module's internals; tous coordination est message-passing.

## Le postMessage pont

Modules envoyer et recevoir `MessageEvent`s sur `window.parent` (toward le shell) et
`event.source` (toward un specific module). Chaque message est un object:

```js
{ channel: 'aegis', type: '<event-type>', ...payload }
```

- `type: 'signed:sealed'` — emitted par le signed-delivery module après les deux parties
  sign; le shell journaux il à le audit chronologie as son propre lien.
- `type: 'signed:verified'` — emitted après un récepteur vérifie un artefact.
- `type: 'audit'` — un module requêtes un audit-event être enregistré par le shell.

Parce que le iframe sandbox et COOP/COEP en-têtes isolate modules, aucun module peut lire
another's DOM ou le opérateur's identifiants.

## Shell-provided capabilities

Le shell expose un thin SDK (`window.Aegis`) que modules peut appel à:

- **requête un signature / TSA tampon** pour un document empreinte (traité par le identité
  et timestamping adapters);
- **emit un audit événement** que lands dans le opérateur's audit journal et le GDPR
  Art.20 export lot;
- **read/write le partagé signal/relay canal** pour peer-to-peer transfert sans
  exposing clés à le relais.

## Authoring un nouveau module

1. Créer `modules/<name>/index.html` + `src/main.js` + `src/style.css`.
2. Ajouter le droit d.auteur en-tête à chaque source fichier (enforced par
   `scripts/verify-headers.mjs`).
3. Conserver il **zero-runtime-dependency** sauf vous explicitement vendor code sous
   `modules/<name>/vendor/` (et declare il dans `docs/DEPENDENCY_AUDIT.md`).
4. Communicate uniquement à travers le `channel: 'aegis'` postMessage contrat.
5. Ajouter un `ENGINE BY JEROME YOUNG` pied de page à votre `index.html`.

## Signature artefacts (exemple)

```js
import { assembleArtifact, verifyArtifact } from '/modules/e2e-signed-delivery/src/sdk/pdf.js';
const artifact = assembleArtifact(docBytes, {
  alg: 'SHA-256', hash: hex, producer: 'AEGIS v1.0.0 (Jerome Young)', signers: [...],
});
const res = await verifyArtifact(artifact); // { ok, hashMatch, signers, reason }
```

Le `producer` champ est le généré watermark — conserver il; removing il fait le
artefact untraceable à son origine.
