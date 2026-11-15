<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/SDK.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Modul SDK

Aegis embeds jeder Funktion as ein **iframe Modul** innen Workbench Shell
(`aegis-shell/`). Modules talk zu Shell und zu jeder andere durch ein small,
dependency-free messaging Vertrag — kein geteilt npm packages, kein globals über hinaus der
dokumentiert Brücke.

> Dies Dokument beschreibt Integration Vertrag. Genau helper Namen live in
> `aegis-shell/src/sdk.js` und `aegis-shell/src/bus.js`; treat jene as der source von
> truth und Aktualisierung dies Datei wenn Vertrag Änderungen.

## Loading

Ein Modul ist declared durch ein `<iframe src="/modules/<name>/index.html">`. Der Shell
niemals reaches in ein Modul's internals; alle coordination ist message-passing.

## Der postMessage Brücke

Modules senden und erhalten `MessageEvent`s auf `window.parent` (toward Shell) und
`event.source` (toward ein specific Modul). Jeder Meldung ist ein object:

```js
{ channel: 'aegis', type: '<event-type>', ...payload }
```

- `type: 'signed:sealed'` — emitted durch der signed-delivery Modul nach beide Parteien
  sign; Shell Protokolle es zu Audit Zeitleiste as seiner eigen Verknüpfung.
- `type: 'signed:verified'` — emitted nach ein Empfänger prüft ein Artefakt.
- `type: 'audit'` — ein Modul Anfragen ein Audit-event sein aufgezeichnet durch Shell.

Weil der iframe sandbox und COOP/COEP Kopfzeilen isolate modules, kein Modul kann lesen
another's DOM oder Bediener's Zugangsdaten.

## Shell-provided capabilities

Der Shell offenlegt ein thin SDK (`window.Aegis`) das modules darf Aufruf zu:

- **Anfrage ein Signatur / TSA Stempel** für ein Dokument Hash (behandelt durch Identität
  und timestamping adapters);
- **emit ein Audit Ereignis** das lands in Bediener's Audit Protokoll und der GDPR
  Art.20 Export Paket;
- **read/write der geteilt signal/relay Kanal** für peer-to-peer Übertragung ohne
  exposing Schlüssel zu Relay.

## Authoring ein neu Modul

1. Erstellen `modules/<name>/index.html` + `src/main.js` + `src/style.css`.
2. Hinzufügen Copyright Kopfzeile zu jeder source Datei (enforced durch
   `scripts/verify-headers.mjs`).
3. Behalten es **zero-runtime-dependency** sofern Sie ausdrücklich vendor Code unter
   `modules/<name>/vendor/` (und declare es in `docs/DEPENDENCY_AUDIT.md`).
4. Communicate nur durch der `channel: 'aegis'` postMessage Vertrag.
5. Hinzufügen ein `ENGINE BY JEROME YOUNG` Fußzeile zu Ihr `index.html`.

## Signatur Artefakte (Beispiel)

```js
import { assembleArtifact, verifyArtifact } from '/modules/e2e-signed-delivery/src/sdk/pdf.js';
const artifact = assembleArtifact(docBytes, {
  alg: 'SHA-256', hash: hex, producer: 'AEGIS v1.0.0 (Jerome Young)', signers: [...],
});
const res = await verifyArtifact(artifact); // { ok, hashMatch, signers, reason }
```

Der `producer` Feld ist der erzeugt watermark — behalten es; removing es macht der
Artefakt untraceable zu seiner Herkunft.
