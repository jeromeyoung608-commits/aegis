# Aegis Module SDK

Aegis embeds each feature as an **iframe module** inside the workbench shell
(`aegis-shell/`). Modules talk to the shell and to each other through a small,
dependency-free messaging contract — no shared npm packages, no globals beyond the
documented bridge.

> This document describes the integration contract. Exact helper names live in
> `aegis-shell/src/sdk.js` and `aegis-shell/src/bus.js`; treat those as the source of
> truth and update this file if the contract changes.

## Loading

A module is declared by an `<iframe src="/modules/<name>/index.html">`. The shell
never reaches into a module's internals; all coordination is message-passing.

## The postMessage bridge

Modules send and receive `MessageEvent`s on `window.parent` (toward the shell) and
`event.source` (toward a specific module). Every message is an object:

```js
{ channel: 'aegis', type: '<event-type>', ...payload }
```

- `type: 'signed:sealed'` — emitted by the signed-delivery module after both parties
  sign; the shell logs it to the audit timeline as its own link.
- `type: 'signed:verified'` — emitted after a receiver verifies an artifact.
- `type: 'audit'` — a module requests an audit-event be recorded by the shell.

Because the iframe sandbox and COOP/COEP headers isolate modules, no module can read
another's DOM or the operator's credentials.

## Shell-provided capabilities

The shell exposes a thin SDK (`window.Aegis`) that modules may call to:

- **request a signature / TSA stamp** for a document hash (handled by the identity
  and timestamping adapters);
- **emit an audit event** that lands in the operator's audit log and the GDPR
  Art.20 export bundle;
- **read/write the shared signal/relay channel** for peer-to-peer transfer without
  exposing keys to the relay.

## Authoring a new module

1. Create `modules/<name>/index.html` + `src/main.js` + `src/style.css`.
2. Add the copyright header to every source file (enforced by
   `scripts/verify-headers.mjs`).
3. Keep it **zero-runtime-dependency** unless you explicitly vendor code under
   `modules/<name>/vendor/` (and declare it in `docs/DEPENDENCY_AUDIT.md`).
4. Communicate only through the `channel: 'aegis'` postMessage contract.
5. Add an `ENGINE BY JEROME YOUNG` footer to your `index.html`.

## Signing artifacts (example)

```js
import { assembleArtifact, verifyArtifact } from '/modules/e2e-signed-delivery/src/sdk/pdf.js';
const artifact = assembleArtifact(docBytes, {
  alg: 'SHA-256', hash: hex, producer: 'AEGIS v1.0.0 (Jerome Young)', signers: [...],
});
const res = await verifyArtifact(artifact); // { ok, hashMatch, signers, reason }
```

The `producer` field is the generated watermark — keep it; removing it makes the
artifact untraceable to its origin.
