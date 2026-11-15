<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# AEGIS - Secure Kante Zusammenarbeit Workbench

**Englisch** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md)

> **Closed-loop, zero-trust, local-first Zusammenarbeit für classified industrial
> Dokumente** — jeder computation bleibt auf Bediener's Maschine, App niemals
> contacts ein Drittanbieter Herkunft. (Ein hosted Service / offline Cache ist außer von Umfang.)
> Ein Klick in ein million-node digital-twin Topologie pulls der associated
> maintenance Vertrag in ein vollständig lokal Schwärzung Engine. Der destructive redacted PDF
> ist dann hashed, signiert, zugestellt peer-to-peer, geprüft, versiegelt in ein verschlüsselt OPFS
> Tresor, und committed zu ein manipulationserkennbar Hash-Kette: **seven stages, ten audited Aktionen,
> eine Shell**.
>
> **Der Server niemals sieht Topologie, Dokument, Datei, ein Schlüssel, oder ein Passphrase.**
> Jeder vertraulich Byte bleibt innen Browser; Transport ist P2P direct.

> **Lizenz:** offen source unter der [Apache Lizenz 2.0](./LICENSE) (SPDX `Apache-2.0`).
> Kostenlos zu verwenden, einschließlich commercially; bezahlt Support ist optional. Siehe [§ Lizenz](#license).

---

## 1 - Warum dies existiert (Deutsch industrial / medical pain Punkt)

Ein classified manufacturer oder clinic auf ein **air-gapped oder intranet** Netzwerk muss:

1. Monitor ein **huge Gerät / Netzwerk Topologie** (connected cars, Fabrik sensors) - und
   Canvas2D/SVG dies bei Skalierung.
2. Offen ein device's **maintenance Vertrag** das enthält outsourced workers' ID numbers
   und bank Konten - und muss **niemals Upload** es zu ein cloud OCR Service.
3. Hand der cleaned Dokument zu ein colleague auf der gleich Standort - mit **kein chat App** und
   absolutely nicht WeChat/Slack.
4. **Prüfen** welche Schlüssel signiert es (ein selbst.assertiert Schlüssel, nicht ein rechtlich Identität), das es war nicht altered in transit, wo der versiegelt Kopie
   lebt, und welche Aktionen happened in welche order.

Vier separat schwer problems. AEGIS löst sie as **eine single-page Workbench** whose
unabhängig modules teilen ein einzeln Architektur: **alles läuft lokal, nichts ist
hochgeladen, und eine EventBus steuert der gesamte Ablauf.** Der Shell besitzt Zustand Maschine;
jeder Modul bleibt ein reusable, eigenständig Produkt.

---

## 2 - Der Sieben-Stufen geschlossen Schleife

Der older three-stage diagram (Topologie -> Schwärzen -> P2P) ist retired. Ein Topologie Klick
jetzt steuert ein vollständig Schleife mit Signatur, Prüfung, archiving und Audit.
Der Signalisierung Server noch relays nur SDP/ICE - niemals Bytes.

```
 [1] TOPOLOGY           Aegis-Topology          topology:node-selected {nodeId, x, y}
        |
        | redaktor:load-doc  (associated contract File)
        v
 [2] REDACT             Aegis-REDAKTOR          redaktor:export-ready {name, blob}
        |
        | SHA-256(pdfBytes) -> signHash(raw digest) -> assembleArtifact()
        v
 [3] SIGN               Aegis-Identity          identity:signed {hash, signature, publicKey}
        |
        | artifact retained as AegisContext.pendingArtifact
        | P2PAdapter.sendFile(artifact)
        v
 [4] P2P SEND           Aegis-SignedDelivery    p2p:file-sent
        |
        | AES-GCM chunks over a WebRTC DataChannel
        v
 [5] VERIFY             Aegis-Identity          p2p:file-received -> signed:verified
        |
        | Archive to Vault unlocks only on a passing verdict
        v
 [6] ARCHIVE            Aegis-Vault             vault:sealed -> OPFS (.aegis container)
        |
        | every stage calls AuditTrail.append()
        v
 [7] AUDIT              Aegis-AuditTrail        audit:append -> SHA-256 hash chain
```

**Ten audited Aktionen, Schritt durch Schritt:**

1. `topology:node-selected` fires mit der node id und coordinates; Shell resets der
   ausführen und Datensätze `AegisContext.selectedNode`.
2. Der Shell fängt ab der node und emittiert `redaktor:load-doc`, loading **das node's**
   associated Vertrag in `Aegis-REDAKTOR`.
3. `redaktor:export-ready` trägt der destructive PDF `Blob`; Shell computes seiner
   SHA-256 Prüfsumme mit Web Kryptografie.
4. `IdentityAdapter.signHash(hash)` produces ein ECDSA P-256 Signatur plus ein Basis64 SPKI
   offentlich Schlüssel.
5. `identity:signed` veröffentlicht Hash, Signatur und offentlich Schlüssel; der PDF und der
   Signatur Trailer sind packed in eine signiert Artefakt und beibehalten in Kontext as
   `pendingArtifact`.
6. `P2PAdapter.sendFile()` Streams Artefakt über der AES-GCM Kanal;
   `p2p:file-sent` Kennzeichen Übergabe.
7. `p2p:file-received` triggers `IdentityAdapter.verifyArtifact(pendingArtifact)`:
   recompute Dokument Hash, compare der embedded Prüfsumme, prüfen jeder Signierer.
8. `signed:verified` unlocks der **Archiv zu Tresor** Schaltfläche; ein failing Urteil emittiert
   `signed:rejected` und behält Schaltfläche gesperrt.
9. Der Bediener enters ein Passphrase; `vault.seal()` schreibt ein AES-GCM-256 `.aegis`
   Container in OPFS und `vault:sealed` schließt Schleife.
10. Jeder Stufe Aufrufe `AuditTrail.append()` und emittiert `audit:append`. Der right-hand
    Zeitleiste repaints auf jeder Verknüpfung, der seven-step Stepper turns grün Stufe durch Stufe,
    und der endgültig Siegel Verknüpfung lights alle seven.

**Warum Prüfung verwendet der sender-side Kopie.** Ein groß Übertragung darf stream gerade zu
Datenträger auf Empfänger (`showSaveFilePicker`) und daher produce kein vollständig im Arbeitsspeicher
`Blob` dort. Der Shell behält der genau Bytes es signiert as `pendingArtifact` und verwendet
Hash plus der original Dokument as Prüfung Baseline. In der same-machine
`BroadcastChannel` Demo Bytes sind identisch; in Produktion dies respects der physical
Grenze von disk-streamed receivers stattdessen von forcing ein vollständig Blob in RAM.

**Multi-Signierer capable.** Der Signatur Trailer ist `signers: [{id, pub, sig}]` und
`verifyArtifact()` prüft jeder Eintrag. `IdentityAdapter` currently Probleme eine Signierer
(`A`) für der automatisiert Schleife; adding further Signierer benötigt kein Format Änderung.

---

## 3 - Architektur und Integration seams

Eleven unabhängig, reusable modules live unter `modules/` und sind composed - **wie
building blockiert** - durch `aegis-shell/` durch ein `EventBus` + `postMessage` Brücke. Kein
Modul Importe eine weitere; sie communicate nur auf der `aegis` Meldung Kanal. Der Shell
ist auch der nur place Importe submodule **rein functions** (Kryptografie, Tresor, Audit
chain); ihrer intern Geschäft Logik ist niemals geändert.

**Marke Karte (der microkernel ecosystem):**

| Modul | Marke | Ordner | Rolle |
|--------|-------|--------|------|
| Topologie | `Aegis-Topology` | `modules/webgpu-topology` | WebGPU digital twin, 1M+ Knoten |
| Schwärzung | `Aegis-REDAKTOR` | `modules/doc-redactor` | Lokal OCR + destructive PDF |
| Identität | `Aegis-Identity` | `modules/zero-knowledge-identity` | ECDSA P-256 Siegel, verpackt Schlüssel |
| Signiert Lieferung | `Aegis-SignedDelivery` | `modules/e2e-signed-delivery` | Signatur Trailer + Artefakt Format |
| Transport | `Aegis-Transport` | `modules/p2p-crypto-transfer` | WebRTC + AES-GCM chunks |
| Tresor | `Aegis-Vault` | `modules/encrypted-archive` | OPFS + AES-GCM-256 Archiv |
| Audit | `Aegis-AuditTrail` | `modules/audit-timeline` | SHA-256 Hash-verkettet Zeitleiste |
| Canvas | `Aegis-Canvas` | `modules/sync-canvas` | Realtime kollaborativ board |
| Abgetrennt Signatur | `Aegis-DetachedSign` | `modules/detached-hash-signer` | Abgetrennt Hash Signatur (sign Hash, nicht Dokument); Nicht ein blind-Signatur scheme |
| Token-gated Räume | `Aegis-TokenGate` | `modules/token-gate` | ECDSA Raum Token für trusted Zulassung |
| Serverblind Relay | `Aegis-BlindRelay` | `modules/blind-relay` | Serverblind WebSocket Relay (leitet weiter Chiffretext nur) |

Two further capabilities ship **Serverseitig** (nicht as eigenständig modules): **Unternehmen auth**
— OIDC (`AEGIS_AUTH_MODE=oidc`, Logik in `server.js`, Tests in `modules/oidc/`) und **SCIM**
Bereitstellung (Tests in `modules/scim/`). Beide sind aus durch Standard und abgedeckt in
`SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`.

**Common commands:** `npm run dev` (Start Workbench) · `npm run setup` (mint der lokal
Aussteller Geheimnis + erstellen Daten dir) · `npm test` (vollständig Suite) · `npm run verify:delivery`
(Build + checksum der shippable tarball) · `npm run doctor` (Umgebung self-check) ·
`npm run verify:claims` (forbidden-claim Scan) · `npm run sbom` (SBOM). Der vollständig Skript
Liste ist in `package.json`.

Jeder eigenständig Seite trägt seiner Marke in Dokument title und seiner Haupt heading, so ein
Kunde opening irgendein Modul in Isolation sofort sieht welche ecosystem es belongs zu.

**Wie sie sind stitched together:**

- `aegis-shell/src/app.js` ist der **nur** place der modules talk. Es besitzt Sieben-Stufen
  Zustand Maschine, ein vereinheitlicht router, ein einzeln `EventBus` (`bus.js`), der geteilt
  `AegisContext` (`context.js`), und der typed Adapters (`adapters.js`, `identity.js`).
- `aegis-shell/src/identity.js` (`IdentityAdapter`) Importe der rein Web Kryptografie helpers
  von `modules/e2e-signed-delivery/src/sdk/crypto.js` und Artefakt packing /
  Prüfung functions von `modules/e2e-signed-delivery/src/sdk/pdf.js`.
  **Kein kryptografisch Logik ist reimplemented in Shell.**
- Der Tresor und Audit cores sind imported der gleich way
  (`modules/encrypted-archive/src/vault.js`, `store.js`,
  `modules/audit-timeline/src/trail.js`, `timeline.js`).
- `aegis-shell/src/sdk.js` veröffentlicht `window.AegisSDK`, ein dokumentiert facade über der gleich
  EventBus. Siehe Abschnitt 12.
- Cross-Modul Ereignisse sind namespaced durch Herkunft:
  - `topology:node-selected` `{nodeId, x, y}` - Shell decides Antwort.
  - `redaktor:load-doc` `{file, name, source}` - der einzeln intake seam, verwendet durch beide der
    Topologie Übergabe und `AegisSDK.injectFile()`.
  - `redaktor:export-ready` `{name, blob}` - startet Hash-Bildung und Signatur.
  - `p2p:file-sent` / `p2p:file-received` `{name, size, blob}` / `p2p:error`.
  - Shell-produced Ereignisse für extern subscribers: `identity:signed`,
    `signed:verified`, `signed:rejected`, `vault:sealed`, `audit:append`.
- Two P2P iframes (Absender + Empfänger) ausführen **verborgen** und connect lokal über
  `BroadcastChannel`. Für cross-machine LAN, switch zu LAN Modus und serve über HTTPS.

**Der geteilt Kontext.** `AegisContext` trägt der gesamte ausführen: `selectedNode`, `document`,
`flowStage` (0..7), `transfer`, `hash`, `signature`, `publicKey`, `artifact`,
`pendingArtifact`, `verified`, `sealed`. `FLOW_STAGES` freezes der seven Stufe numbers;
`setSigning`, `markReceived`, `markVerified`, `markSealed` und `resetFlow` sind der nur
mutators. Jeder Übergabe ist eine explizit, debuggable mutation stattdessen von ad-hoc Nachrichten.

**Dies ist der architectural payoff:** Geschäft ist complex, der substrate ist boring -
eine bus, eine Meldung Kanal, eine deliberately blind Server, und ein offentlich SDK auf top.

---

## 4 - Quick Start

```bash
cd /path/to/Aegis
node server.js            # http://localhost:8080
```

`/session` (der room-Token Aussteller) ist **Fail-Closed** since Sicherheit bestanden: mit
kein Aussteller credential es refuses zu mint Token, so LAN Signalisierung kann nicht sein
self-authorised durch anyone wer kann reach der port. Two ways zu offen es:

```bash
# A) shared secret (recommended outside an isolated lab):
AEGIS_ISSUER_SECRET='<long-random-string>' node server.js
#    then open the shell once as http://host:8080/#issuer=<same secret>
#    (the fragment is moved into sessionStorage and stripped from the URL)

# B) isolated demo LAN (lab only — this is logged as a warning on boot):
AEGIS_TRUSTED_LAN=1 node server.js
```

TLS Material ist kein länger lesen von Web Wurzel: put `key.pem` + `cert.pem` in
`~/.aegis/tls/` (oder Punkt `AEGIS_TLS_DIR` bei sie).


Offen `http://localhost:8080` in **Chrome oder Kante 113+**. Dann:

1. Warten für Topologie zu rendern; ziehen / wheel zu navigate.
2. **Klick irgendein node** - Schwärzung Bereich auto-loads das node's Vertrag.
3. Prüfung der detected schwarz Boxen; toggle Regeln wenn Sie wie.
4. Klick **Senden zu Aegis Peer**. Von hier Schleife ist automatic: der PDF ist hashed,
   signiert, streamed, geprüft, und der **Archiv zu Tresor** Schaltfläche lights up.
5. Klick **Archiv zu Tresor**, betreten ein Passphrase (>= 8 Zeichen), **Siegel zu Tresor**.
   Der seven-step Stepper turns vollständig grün und Audit Zeitleiste zeigt jeder Verknüpfung.

> Warum `node server.js` und nicht `file://`? Der Topologie benötigt `SharedArrayBuffer`, welche
> Nur existiert in ein **cross-origin-isolated** Kontext. Der vereinheitlicht `server.js` ist daher
> ein **deliberately isoliert** Server, nicht ein naive statisch Datei Server: es Stempel
> `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
> (+ `Cross-Origin-Resource-Policy: same-origin`) auf **jeder** Antwort - statisch Bytes
> *und* der JSON Signalisierung Relay alike. Drop `key.pem` + `cert.pem` beside es für HTTPS
> LAN Modus. Jeder Modul auch behält seiner eigen `server.js` für eigenständig verwenden; jene
> absichtlich omit Isolation Kopfzeilen weil sie don't brauchen `SharedArrayBuffer`.

---

## 5 - Der zero-trust garantiert (und ihrer Grenzen)

- **Topologie**: purely lokal WebGPU; Server liefert aus nur statisch Bytes.
- **Dokument**: Tesseract/pdf.js/pdf-lib sind vendiert lokal; ein offline Wächter wraps
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon` und blockiert irgendein Cross-Origin Aufruf.
  Exportiert PDFs enthalten **kein recoverable Text Ebene** - der source Seite ist niemals copied;
  nur ein re-rasterised Bild mit burned schwarz Boxen ist embedded.
- **Übertragung**: Signalisierung Server relays nur SDP/ICE (Raum IDs, IP hints). Datei Bytes
  und der AES Schlüssel (PBKDF2 von ein Passphrase) **niemals touch Server**.
- **Signatur**: Schlüssel sind erzeugt in-page durch Web Kryptografie. Der privat Schlüssel ist
  non-extractable und niemals serialized; nur Basis64 SPKI offentlich Schlüssel travels innen
  Artefakt. Der Signatur deckt ab der roh SHA-256 Prüfsumme von der PDF region, so ein
  einzeln flipped Byte schlägt fehl Prüfung.
- **Archiv**: AES-GCM-256 unter ein PBKDF2-SHA-256 Schlüssel (250,000 iterations, per-record
  Salt), geschrieben as ein opak `.aegis` Container in OPFS. Der Passphrase ist verwendet einmal und
  niemals speichert.
- **Audit**: jeder Stufe appends eine Verknüpfung zu ein lokal Hash-Kette —
  `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` wenn ein Gerät Schlüssel ist Set,
  Klartext `SHA-256` für legacy Einträge (jeder Eintrag Datensätze `alg`). Bearbeitung eine Verknüpfung
  invalidates jeder später Verknüpfung. Der chain ist **manipulationserkennbar, nicht immutable**: es
  erkennt Änderungen, aber bietet kein protection gegen ein Bediener wer kann rewrite der
  gesamte Speicher. Siehe `docs/CLAIMS-WORDING.md`.

**Ehrlich Grenzen** (auch in `DELIVERY_REPORT.md`):

- Der Schwärzung Modul's PII Erkennung ist tuned für Deutsch business/legal paperwork;
  accuracy hängt ab auf Scan quality und darf brauchen Handbuch `Mark` Boxen.
- **Übertragung Empfänger ist memory-safe**: P2P Modul Streams jeder entschlüsselt Block
  gerade zu Datenträger (`showSaveFilePicker` auf Chromium) - kein im Arbeitsspeicher `Blob`, so multi-GB
  Übertragungen do nicht Out-of-Memory. Non-Chromium browsers fall zurück zu ein im Arbeitsspeicher Pfad **capped bei
  1 GiB**. `showSaveFilePicker` benötigt ein Benutzer gesture, so Empfänger hat ein
  "Wählen save Ort" Schaltfläche zu pre-lock Datei vor sending.
- Weil ein disk-streamed Empfänger hat kein in-page Bytes, Shell prüft gegen der
  **sender-side beibehalten Artefakt**. Dies ist der korrekt Baseline für der same-machine
  Demo und für Produktion streaming; ein cross-machine Bereitstellung das benötigt unabhängig
  receiver-side Prüfung muss re-read der saved Datei.
- `IdentityAdapter` Probleme eine Signierer für der automatisiert Schleife. Der Trailer Format unterstützt
  multiple Signierer, aber additional Signierer sind nicht noch wired in Shell Ablauf.
- COEP `require-corp` kann interfere mit *extern* STUN für LAN Modus auf einige browsers -
  verwenden der eigenständig P2P Server (kein COOP/COEP) für cross-machine wenn Sie hit das.
- Live WebGPU / OCR / WebRTC execution erfordert ein echt Browser; Repository war
  validated durch statisch analysis, Modul-level Test suites, ein signed-artifact
  Hin- und Rückweg, und live Server Smoke-Test Tests. Der visuell Ende-zu-Ende Schleife ist ein Handbuch
  Abnahme Schritt aufgezeichnet in Abschnitt 8.

---

### Null Abhängigkeiten — der accurate Behauptung

Aegis ist **nicht** "null Abhängigkeiten" as ein gesamte Produkt, und wir do nicht Behauptung es ist.
Concretely:

- **9 von 11 modules, plus Shell (`aegis-shell/`) und Server (`server.js`),
  ship mit null Drittanbieter Laufzeit Abhängigkeiten.** Sie verwenden nur Web Kryptografie und
  andere eingebaut Browser / Node Primitive.
- **Two modules vendor Drittanbieter Code:**
  - `doc-redactor` vendors **pdf.JS, pdf-lib, tesseract.JS, tesseract-core, tessdata**
    (~35 MB, alle Apache-2.0 / MIT) für lokal OCR und PDF Darstellung.
  - `e2e-signed-delivery` vendors **pdf-lib** (~524 KB, MIT) zu rendern der signiert
    Artefakt zu PDF.
- **Nichts ist fetched von ein CDN bei Laufzeit** — jeder vendiert library ist ausgeliefert
  lokal von Bild. Der `video-tool/` Verzeichnis liefert aus nur seiner Browser
  Prüfung scripts (sie brauchen Playwright as ein dev Abhängigkeit); der promo-video
  pipeline (Remotion, TTS, capture) ist **nicht** Teil von Lieferung Paket.
- Der vollständig Zuordnung und Lizenz matrix ist in `docs/DEPENDENCY_AUDIT.md`.

## 6 - Projekt Karte

```
Aegis/
|-- server.js                  # unified server: COOP/COEP + static + signaling (zero-dep)
|-- README.md                  # this file
|-- LICENSE                    # Apache License 2.0 (Apache-2.0)
|-- LICENSES/                  # Apache-2.0 license text
|-- DELIVERY_REPORT.md         # engineering + test report
|-- aegis-shell/               # the unifying SPA (dark command-center)
|   |-- index.html             # seven-stage Stepper + sidebar surfaces
|   `-- src/
|       |-- app.js             # seven-stage orchestration + audit wiring
|       |-- adapters.js        # Topology / REDAKTOR / P2P adapters
|       |-- identity.js        # IdentityAdapter (pure submodule imports)
|       |-- sdk.js             # window.AegisSDK public embedding API
|       |-- bus.js             # EventBus
|       |-- context.js         # AegisContext + FLOW_STAGES
|       `-- style.css
`-- modules/
    |-- webgpu-topology/        # Aegis-Topology
    |-- doc-redactor/           # Aegis-REDAKTOR
    |-- zero-knowledge-identity/# Aegis-Identity
    |-- e2e-signed-delivery/    # Aegis-SignedDelivery
    |-- p2p-crypto-transfer/    # Aegis-Transport
    |-- encrypted-archive/      # Aegis-Vault
    |-- audit-timeline/         # Aegis-AuditTrail
    |-- sync-canvas/            # Aegis-Canvas
    |-- detached-hash-signer/   # Aegis-DetachedSign  (detached hash signing; NOT a blind-signature scheme)
    |-- token-gate/             # Aegis-TokenGate  (ECDSA room tokens)
    `-- blind-relay/            # Aegis-BlindRelay (server-blind WebSocket relay)
```

---

## 7 - Erweiterung Punkte

- **Echt Dokumente**: ersetzt der shell's `contractForNode()` mit ein loader das pulls ein
  node's actual Datei (noch client-side) in Schwärzung Modul, oder Aufruf
  `AegisSDK.injectFile(file)` von ein host Anwendung.
- **WebGL2 Rückfallebene** für Topologie; **GPU-compute** Physik für wahr 10M Knoten.
- **More Peers / Räume**, TURN für symmetric NAT, und ein echt Schlüssel-exchange UI für Übertragung.
- **Multiple Signierer**: extend `IdentityAdapter.signHash()` zu zurückgeben ein Signierer array; der
  Artefakt Format und `verifyArtifact()` bereits Support es.
- **Audit Export** produces ein content-free JSON Bericht sicher zu attach zu ein Fall Datei.

---

## 8 - Wie zu Test

Aegis mixes **Headless, repeatable Prüfungen** (ausführen hier / in CI) mit ein **Handbuch Browser
bestanden** (benötigt ein echt GPU + OCR + WebRTC). Beide sind dokumentiert so der geschlossen Schleife ist
reproduzierbar, nicht mystic.

### Ein - Headless Prüfungen (kein Browser) - was CI kann assert today

```bash
# 1) Static syntax of every shell entry point (ES module mode)
for f in server.js aegis-shell/src/app.js aegis-shell/src/adapters.js \
         aegis-shell/src/identity.js aegis-shell/src/sdk.js \
         aegis-shell/src/context.js aegis-shell/src/bus.js \
         modules/webgpu-topology/src/main.js modules/doc-redactor/src/js/app.js \
         modules/doc-redactor/src/js/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/main.js \
         modules/p2p-crypto-transfer/src/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/transfer.js; do
  node --input-type=module --check < "$f" || echo "SYNTAX FAIL: $f"
done

# 2) English-only convention on all code + docs (no CJK / fullwidth punctuation)

# 3) P2P module unit tests - the OOM guard is proven here
cd modules/p2p-crypto-transfer && npm test
#   -> tests 11, pass 11, fail 0

# 3b) Audit chain unit tests - hash linkage + tamper detection
cd modules/audit-timeline && npm test
#   -> tests 15, pass 15, fail 0

# 4) Cross-origin isolation headers on EVERY response (enables SharedArrayBuffer)
PORT=8082 node server.js & SRV=$!; sleep 1
for u in "/" "/aegis-shell/src/app.js" "/signal?room=probe&from=a" "/nope-404"; do
  curl -s -D - -o /dev/null "http://localhost:8082$u" \
    | grep -iE "^(cross-origin-opener-policy|cross-origin-embedder-policy|cross-origin-resource-policy|HTTP/)"
done
kill $SRV
#   expect: COOP/COEP/CORP present on all four (200 / 200 / 204 / 404).
```

### B - Handbuch Browser bestanden (Chrome / Kante 113+, echt WebGPU/OCR/WebRTC)

1. `node server.js` -> offen `http://localhost:8080`.
2. **Bestätigen Isolation**: DevTools Konsole -> `crossOriginIsolated` muss sein `true`.
3. **Ausführen der geschlossen Schleife**:
   - Klick irgendein Topologie node -> `Aegis-REDAKTOR` auto-loads das node's Vertrag
     (`Wartungsvertrag-N###.png`, filename stamped mit der node id);
   - Prüfung der detected schwarz Boxen, dann Klick **Senden zu Aegis Peer**;
   - Shell hasht und signiert der PDF, Streams es, und prüft es. Watch Protokoll:
     `Redacted PDF ... hashed and signed`, dann either ein im Arbeitsspeicher oder ein
     "streamed gerade zu Datenträger" Prüfung Meldung;
   - **Archiv zu Tresor** appears nur nach `Signature verified`. Betreten ein Passphrase
     (>= 8 Zeichen) und **Siegel zu Tresor**;
   - der top stepper turns grün Stufe 1 -> 7.
4. **Beweisen Out-of-Memory Kcorrektur auf ein big Datei**: Empfänger clicks "Wählen save Ort" zu
   pre-lock der writer, dann senden ein multi-GB Datei und watch der OS Speicher meter stay flat.
5. **Watch Audit-Trail**: jeder Stufe appends ein Verknüpfung zu der right-hand Zeitleiste
   (`Topology node selected` -> `Document hash signed` -> `Verification passed` ->
   `Sealed in the local vault`). Neu laden Seite; der chain ist wiederhergestellt und
   **Prüfen chain** noch Berichte unversehrt.

### C - Ehrlich Lücken (kann nicht sein automatisiert noch)

WebGPU Darstellung, OCR accuracy auf echt scannt, cross-machine WebRTC, und der
`showSaveFilePicker` gesture require ein human in ein echt Browser. Der Repository ist
daher validated durch **statisch analysis + Modul-level Test suites + signed-artifact
Hin- und Rückweg + live Kopfzeile Prüfungen + Server Smoke-Test Tests**; der visuell Ende-zu-Ende Schleife ist ein
Handbuch Abnahme Schritt aufgezeichnet hier.

---

## 8b - Funktion Referenz

Der eleven modules sind listed in §3; drei (Identität, Tresor, AuditTrail) haben ihrer
eigen deep-dive sections unten. Dies Abschnitt deckt ab der **Workbench Shell, Bediener
Compliance Konsole, der verbleibend eight modules, Unternehmen auth, und Docker** — der
parts der quick-tour Tabelle macht nicht expand.

### Workbench Shell (`aegis-shell/`)

Der vereinheitlicht SPA. Jeder Oberfläche — Topologie, Redaktor, SignedDelivery, Tresor, Audit,
Admin — ist ein **free-floating, draggable und resizable Fenster**: grab seiner Kopfzeile zu
bewegen es, ziehen der bottom-right grip zu resize; position und Größe persist in
`localStorage` und sind wiederhergestellt auf Neu laden. Panels stay in ihrer Standard two-column
Layout bis Sie erste grab eine.

### Bediener Compliance Konsole (`console.html`) — *der EU/DE revenue Funktion*

Dies ist Produkt Oberfläche German/EU Kunden pay für, und es ist ein first-class
Funktion, nicht ein Test Artefakt. Es ist ein authenticated Bediener Konsole (Issuer-Geheimnis
bearer) mit Registerkarten:

- **ROPA** — strukturiert register von Verarbeitung activities (GDPR Art. 30); Felder
  `controller.legalName / address / regNo`, `dpo.email`, `sla.mailbox / timezone`,
  `euRep.name`. Fehlt Fakten Oberfläche as `409` auf der doc Gate und as ein human-readable
  Banner (`COMPLIANCE_LABELS` maps roh Feld Namen zu Klartext language).
- **DSAR** — Daten-subject access-request ledger (GDPR Art. 12/15), 30-Tag `dueInDays`
  tracking; creation erfordert ein subject Name **oder** E-Mail.
- **DPIA** — Daten-protection impact assessment Datensatz.
- **Dokumente** — Upload ein signiert ROPA/DPA/SLA/SCC/DPIA; der corresponding `/doc/*`
  Gate flips von `409` zu `200` (`X-Aegis-Source: uploaded`). Blank Vorlagen
  (`/template/*`) zurückgeben `{{…}}` placeholders (`TEMPLATE — UNFILLED`).
- **Audit / Revocations / Hinterlegung / Sitzungen / Konfiguration / Setup** — Bediener Kontrollen,
  Schlüssel Widerruf, Geheimnis Hinterlegung, live Sitzung Ansicht, Laufzeit Konfiguration, first-run setup.
- **Export & Erase** — Herunterladen ein ausgefüllt `ROPA-filled.md`, und erase ein betroffene Person
  (GDPR Löschung) unter Audit. Der GDPR Art. 20 Daten-portability Paket
  (`/export/bundle`) jetzt trägt ein `provenance` Block identifying AEGIS (Jerome Young)
  as der producer.

Der Konsole ist **role-gated**: Admin Bereich ist verborgen von der `operator` Rolle
(`.win[hidden]`), sichtbar zu `admin`. Switching Registerkarten offline zeigt ein "Server
unreachable" Banner stattdessen von throwing.

### Verbleibend eight modules

- **Aegis-Topologie** (`modules/webgpu-topology`) — WebGPU digital twin von up zu 1M+
  Knoten; self-check besteht 300/300 sampling; WebGL2 Rückfallebene wenn WebGPU ist absent.
- **Aegis-REDAKTOR** (`modules/doc-redactor`) — lokal OCR (tesseract.JS) + destructive
  PDF Schwärzung. Last ein Dokument, draw/auto-detect PII Boxen, Set zoom / Modus / klar,
  Export ein redacted PDF whose `Producer` ist stamped `REDAKTOR — local redaction engine`
  (kein Bytes leave Browser).
- **Aegis-SignedDelivery** (`modules/e2e-signed-delivery`) — assembles ein *signiert
  Artefakt* = `[PDF document bytes] + [UTF-8 JSON signature trailer]`; two ECDSA-P256
  Signierer (Ein & B) co-sign Dokument Hash; manipulationserkennbar (eine flipped Byte schlägt fehl
  prüfen). Der Trailer trägt ein `producer: "AEGIS v1.0.0 (Jerome Young)"` watermark.
- **Aegis-Transport** (`modules/p2p-crypto-transfer`) — WebRTC + AES-GCM chunked
  Übertragung. Der Empfänger Streams jeder entschlüsselt Block gerade zu Datenträger (memory-safe,
  kein Out-of-Memory auf multi-GB Dateien); LAN/P2P Modus dropdown.
- **Aegis-Canvas** (`modules/sync-canvas`) — real-time kollaborativ board mit
  operational-transform Synchronisation, multi-cursor Präsenz, und ein `fit` viewport control.
- **Aegis-DetachedSign** (`modules/detached-hash-signer`) — *abgetrennt Hash Signatur*:
  Signierer signiert nur Dokument's SHA-256 Hash; Dokument Bytes niemals betreten
  Signatur Paket (blind/detached, nicht ein blind-Signatur scheme).
- **Aegis-TokenGate** (`modules/token-gate`) — ECDSA room-admission Token; Demo
  beweist admit / expired / wrong-room / gefälscht Pfade.
- **Aegis-BlindRelay** (`modules/blind-relay`) — Serverblind WebSocket Relay das
  leitet weiter **Chiffretext nur**; der worked Beispiel beweist Relay niemals sieht
  Klartext.

### Unternehmen auth: OIDC & SCIM

- **OIDC** (`AEGIS_AUTH_MODE=oidc`, Logik in `server.js`, Tests in `modules/oidc/`):
  unconfigured → `/auth/oidc/start` gibt zurück `503` (kein silent Rückfallebene). Configure ein
  IdP vor ermöglicht.
- **SCIM 2.0 Bereitstellung** (Tests in `modules/scim/`): geschützt durch `AEGIS_SCIM_TOKEN`;
  `rotate` sofort revokes der alt Token.
- Beide sind aus durch Standard. Konfiguration Schritte sind in `CONFIGURE-BEFORE-DEPLOY.md`.

### Docker Bereitstellung

```bash
docker build -t aegis .
docker run -d -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET=<strong-secret> \
  -v aegis-data:/app/data \
  aegis
```

Der Bild läuft as ein non-root Benutzer, bakes `docs/` in Bild (so Compliance
Vorlagen resolve bei Laufzeit), und persists Daten auf der `/app/data` Lautstärke. **Netzwerk
exposure:** Server bindet alle interfaces durch Entwurf — place es hinter ein umkehren
Proxy mit TLS und ein ACL, as dokumentiert in `SECURITY.md`. Do **nicht** expose der port
direkt zu untrusted networks.

---

## 9 - Modul 01 - Aegis-Identity (Lokal Self-Custodied Schlüssel)

Ein classified plant kann nicht join ein corporate Identität Anbieter, so jeder engineer prägt ein
lokal **digital Siegel** stattdessen: ein ECDSA P-256 Schlüssel pair erzeugt durch Web Kryptografie, mit der
privat half verpackt durch PBKDF2 + AES-GCM und speichert in IndexedDB. Der offentlich half becomes
ein shareable Geschäft Karte - avatar, Name, Basis64 SPKI Schlüssel und ein SHA-256 Fingerabdruck.

**In Sieben-Stufen Schleife dies Modul ist automatic.** Der shell's `IdentityAdapter`
(`aegis-shell/src/identity.js`) reuses der gleich rein Web Kryptografie Primitive exposed durch der
signed-delivery SDK. Signatur ist triggered automatisch durch Haupt shell's
`IdentityAdapter` sofort nach `redaktor:export-ready`; dort ist kein Schaltfläche zu press
anymore. Prüfung läuft auf `p2p:file-received`, und einmal Prüfung succeeds der
**Archiv zu Tresor** Schaltfläche lights up automatisch.

```bash
node server.js
# then open: http://localhost:8080/modules/zero-knowledge-identity/index.html
```

- Type ein Name (für Beispiel `Engineer-A`), wählen ein Passphrase von bei mindestens eight
  Zeichen, press **Erzeugen**.
- Neu laden Seite - Karte gibt zurück von IndexedDB mit der gleich Fingerabdruck, und der
  gleich Passphrase noch unlocks der privat Schlüssel.

Der Passphrase ist niemals speichert, Verpackung Schlüssel ist non-extractable, und Modul macht
null Netzwerk Anfragen. Vollständig Detail: `modules/zero-knowledge-identity/README.md`.
Gemessen Ergebnisse: `modules/zero-knowledge-identity/TEST_REPORT.md` (26/26 Headless
Assertions, Browser Neu laden Abnahme bestanden).

---

## 10 - Modul 02 - Aegis-Tresor (Lokal Verschlüsselt Tresor)

> **Aegis-Tresor: zero-cloud archiving von signiert Dokumente.**

Ein signiert Vertrag kann nicht sein links auf der desktop. Nach `Aegis-Identity` prüft der
artifact's ECDSA Signatur, Shell bietet **Archiv zu Tresor**. Der Datei plus seiner
Signatur Metadaten sind framed in eine Nutzdaten, verschlüsselt mit AES-GCM-256 unter ein
PBKDF2-SHA-256 Schlüssel (250,000 iterations, per-record Salt), und geschrieben as ein opak
`.aegis` Container in Browser's Herkunft Privat Datei System (OPFS). Nichts ist
hochgeladen; dort ist kein Konto und kein Synchronisation Warteschlange.

**Kein Handbuch Demo Schaltfläche.** Signatur ist jetzt triggered automatisch durch Haupt shell's
`IdentityAdapter` Recht nach `redaktor:export-ready`; dort ist kein Schaltfläche zu press
anymore. Einmal Prüfung succeeds, der **Archiv zu Tresor** Schaltfläche lights up
automatisch. Nur ein bestehend Urteil unlocks Tresor action.

```bash
node server.js
# command center:  http://localhost:8080/
# vault browser:   http://localhost:8080/modules/encrypted-archive/index.html
```

- In Shell: Klick irgendein Topologie node, Schwärzen und Export, warten für *Geprüft*, dann
  **Archiv zu Tresor** -> Passphrase (>= 8 Zeichen) -> **Siegel zu Tresor**.
- Der Seitenleiste Berichte `N sealed records | X KB ciphertext | opfs`; Neu laden Seite und
  Anzahl überlebt, weil OPFS ist persistent pro Herkunft.
- Offen der eigenständig Tresor Seite zu browse der gleich Verzeichnis: IDs und Chiffretext sizes
  sind sichtbar während gesperrt; Datei Namen, hasht und Signierer details appear nur nach
  unlocking ein Datensatz.

Fehler modes sind deliberately distinguishable: `integrity check failed` means der
Container changed auf Datenträger, `unlock failed` means Passphrase oder der AES-GCM Tag tat
nicht match. Vollständig Detail: `modules/encrypted-archive/README.md`.
Gemessen Ergebnisse: `modules/encrypted-archive/TEST_REPORT.md` (23/23 Headless Assertions,
Browser Siegel -> Neu laden Abnahme bestanden).

---

## 11 - Modul 03 - Aegis-AuditTrail (Manipulationserkennbar Audit-Trail)

> **Aegis-AuditTrail: ein manipulationserkennbar Hash-verkettet Zeitleiste für Compliance reviews.**

Ein Compliance Prüfung asks wer tat was, und wenn. Der right-hand **Audit-Trail** Karte
appends eine Hash Verknüpfung für jeder meaningful action in Sieben-Stufen Schleife:
Topologie node selected, Dokument geladen in Redaktor, destructive PDF erzeugt,
Dokument Hash signiert, signiert Artefakt handed zu Transport, verschlüsselt P2P Lieferung,
Lieferung entschlüsselt, Prüfung bestanden (oder abgelehnt / fehlgeschlagen / übersprungen), und Tresor
Versiegelung.

Jeder Verknüpfung ist `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` (legacy Einträge
verwenden Klartext `SHA-256`), so Bearbeitung, deleting oder reordering irgendein Eintrag breaks jeder später
Hash. Der trail ist **manipulationserkennbar, nicht immutable**. Jeder anhängen auch emittiert `audit:append` auf
Shell `EventBus`, so ein extern `AegisSDK` subscriber kann watch der chain in echt
Zeit. Der trail ist speichert in `localStorage` und überlebt ein Neu laden; **Prüfen chain**
recomputes es von genesis und Kennzeichen der erste defekt Verknüpfung. **Export JSON** produces ein
content-free case-file Artefakt.

```bash
node server.js
# command center:  http://localhost:8080/aegis-shell/index.html
# review page:     http://localhost:8080/modules/audit-timeline/index.html
```

- Klick ein Topologie node und vollständig der geschlossen Schleife; Zeitleiste fills as jeder Ereignis
  fires. Dort ist kein separat signed-delivery Demo zu ausführen - Signatur und Prüfung
  happen inline in Haupt Schleife.
- Offen der eigenständig Prüfung Seite zu siehe der gleich chain, prüfen es, Export es, oder klar es
  mit ein two-step confirmation.

Der chain Implementierung ist reused von `modules/sync-canvas/src/audit/HashChain.js`
durch ein einzeln Import seam; es ist nicht forked. Vollständig Detail:
`modules/audit-timeline/README.md`. Gemessen Ergebnisse:
`modules/audit-timeline/TEST_REPORT.md` (15/15 Headless Tests, Browser Zeitleiste und
Neu laden Abnahme bestanden).

---

## 12 - AegisSDK: embedding Workbench

> **Ein embeddable, null Abhängigkeiten Unternehmen ecosystem.**

`aegis-shell/src/sdk.js` veröffentlicht `window.AegisSDK` auf der command-center Seite. Es ist ein
thin, vollständig dokumentiert facade über der shell's intern `EventBus` - kein global Zustand ist
copied, kein Abhängigkeit ist hinzugefügt, und SDK niemals Aufrufe in ein submodule direkt.

| API | Zweck |
|-----|---------|
| `AegisSDK.init(config)` | Anwenden `{theme, locale, authToken, ...}` und zurückgeben SDK. Der Token bleibt in Speicher und ist niemals logged oder emitted. |
| `AegisSDK.on(eventName, callback)` | Subscribe zu irgendein Shell oder Modul Ereignis; gibt zurück ein unsubscribe function. |
| `AegisSDK.injectFile(file)` | Push ein extern `File` in `Aegis-REDAKTOR` durch emitting `redaktor:load-doc`. |

```js
const sdk = window.AegisSDK.init({
  theme: 'dark',
  locale: 'en',
  authToken: '<your-token>',
});

const off = sdk.on('audit:append', (entry) => {
  console.log('audit link', entry.index, entry.hash);
});

const file = new File(
  ['%PDF-1.4 sample bytes'],
  'contract.pdf',
  { type: 'application/pdf' },
);
const receipt = await sdk.injectFile(file);
console.log('injected', receipt.name);
off();
```

Observable Ereignisse include `topology:node-selected`, `redaktor:load-doc`,
`redaktor:export-ready`, `identity:signed`, `p2p:file-sent`, `p2p:file-received`,
`signed:verified`, `signed:rejected`, `vault:sealed` und `audit:append`.
`redaktor:load-doc` ist der einzeln intake seam: beide Topologie Übergabe und
`AegisSDK.injectFile()` verwenden es, so externally injiziert Dokumente betreten genau der gleich
audited Sieben-Stufen Schleife as node-selected Dokumente.

Weil Shell besitzt EventBus, Kontext und Adapters, ein host Anwendung kann
embed Workbench, inject Dokumente, und observe jeder Stufe ohne forking ein Modul
oder installing ein npm Paket.

---

## 13 - Drittanbieter Komponenten

Aegis declares **null npm Laufzeit Abhängigkeiten**. Two modules vendor Drittanbieter Code
lokal so der gesamte pipeline läuft mit kein installieren und kein Netzwerk Zugriff — `doc-redactor`
(five Assets unter `modules/doc-redactor/vendor/`) und `e2e-signed-delivery` (pdf-lib unter
`modules/e2e-signed-delivery/vendor/`, byte-identisch zu der doc-Redaktor Kopie). Jeder asset
behält seiner eigen Upstream Lizenz, unmodified.

| Component | Version | Lizenz | Verwendet durch | Upstream |
|---|---|---|---|---|
| pdf.JS | 3.11.174 | Apache-2.0 | doc-Redaktor | `mozilla/pdf.js` |
| pdf-lib | 1.17.1 | MIT | doc-Redaktor, e2e-signed-delivery | `Hopding/pdf-lib` |
| tesseract.JS | 5.1.1 | Apache-2.0 | doc-Redaktor | `naptha/tesseract.js` |
| tesseract.js-core | 5.1.1 | Apache-2.0 | doc-Redaktor | `naptha/tesseract.js-core` |
| tessdata (`deu`, `eng`) | 4.0.0 best_int | Apache-2.0 | doc-Redaktor | `tesseract-ocr/tessdata` |

Two modules vendor Drittanbieter Code — `doc-redactor` (five Assets) und
`e2e-signed-delivery` (pdf-lib nur, byte-identisch zu Kopie in `doc-redactor`,
gleich SHA-256). Der andere ten modules — `aegis-shell`, `audit-timeline`, `blind-relay`,
`detached-hash-signer`, `encrypted-archive`, `p2p-crypto-transfer`, `sync-canvas`,
`token-gate`, `webgpu-topology`, `zero-knowledge-identity` — enthalten **kein Drittanbieter Code**.

### Extern Integrationen (isoliert adapters, nicht in Kernel)

Der null Abhängigkeiten Kernel (Kryptografie / Hash-Kette / Audit / Signalisierung / Schwärzung rendern)
bleibt kostenlos von Netzwerk Services. Jeder extern Fähigkeit ist ein drop-in Adapter das
sits Hinter ein Schnittstelle, lebt outside Kernel source, und ist **vollständig removable** —
deleting seiner Verzeichnis plus seiner launch Schalter lässt Aegis vollständig functional.

| Adapter | Status | Zweck | Implementierung Hinweis |
|---|---|---|---|
| RFC 3161 TSA Zeitstempel | **Zugestellt** (optional, aus durch Standard) | Anchor ein Prüfsumme zu ein trusted Zeitstempel | `adapters/tsa-rfc3161/` — ein rein Node forwarder (hand-rolled DER, kein Drittanbieter libs) POSTs ein `TimeStampReq` zu ein Bediener-configured TSA und gibt zurück der roh CMS Token. Aktiviert mit `node server.js --adapter-tsa on --tsa-config <file>`; `POST /adapter/tsa/submit`. Dev: FreeTSA; prod: DigiCert. Niemals prüft TSA Zertifikat chain — offline Prüfung ist der user's Verantwortung. |
| Cloudflare R2 Speicher (EU) | PLANNED | Client-side-encrypted long-term Tresor Archiv | Verschlüsseln mit Web Kryptografie, dann PUT zu R2 (EU). Adapter hooks nur; vollständig SigV4 ist nicht hand-rolled in Kernel. |
| Tauri desktop Shell | PLANNED | Offline kiosk / signiert desktop Build | Wraps der existing Web App; Kernel ist unchanged. |

**Extern TSA Services sind extern Abhängigkeiten, nicht Aegis Code.** Der TSA Adapter
liefert aus mit kein hardcoded Anbieter URL, Schlüssel, oder Zertifikat; es leitet weiter **nur ein SHA-256
Prüfsumme** (niemals Dokument Bytes). Aegis maintains kein TSA root-CA Vertrauen Speicher und macht
kein Behauptung about rechtlich admissibility. Es schlägt fehl sicher: irgendein timeout / Netzwerk Fehler / 4xx
yields `{ tsaStatus: 'failed' }` und niemals disrupts Hash-Kette oder Relay. Entfernen
`adapters/tsa-rfc3161/` und der `--adapter-tsa` Schalter zu strip es completely. Siehe
`adapters/tsa-rfc3161/README.md` (EN/DE) für GDPR Notizen und der rechtlich disclaimer.

Ein CI Gate (`scripts/zero-dep-lint.mjs`) enforces dies Grenze: es schlägt fehl wenn irgendein Kernel
oder Adapter source Importe ein non-platform (`node:*`) oder non-relative Modul. Irgendein future
CMS-verification Code muss live in `adapters/tsa-rfc3161/vendor/` (isoliert, übersprungen
durch der lint, niemals geladen durch Standard) so ein Netzwerk Service kann niemals creep in Kern.

### Dateien das muss travel mit irgendein Kopie

```
modules/doc-redactor/vendor/<component>/LICENSE     upstream licence text, unmodified
modules/doc-redactor/vendor/<component>/NOTICE      copyright attribution
modules/doc-redactor/vendor/THIRD_PARTY_NOTICES.md  full attribution index
modules/doc-redactor/vendor/MANIFEST.json           version + SHA-256 per file
modules/e2e-signed-delivery/vendor/pdf-lib/LICENSE  MIT, Copyright (c) 2019 Andrew Dillon
modules/e2e-signed-delivery/vendor/MANIFEST.json    version + SHA-256
```

Der bundled builds sind Upstream Ausgabe. Ihrer Copyright Kopfzeilen waren stripped durch der
Upstream Build Schritt, nicht durch dies Repository — Zuordnung daher lebt in der per-component
`LICENSE` und `NOTICE` Dateien. Nichts hier entfernt oder altered ein Zuordnung Hinweis, und kein
vendiert Datei war geändert.

### Lizenz

Aegis ist **offen source**, lizenziert unter der **Apache Lizenz 2.0** — siehe
[`LICENSE`](LICENSE). Sie darf verwenden, modify, redistribute und sell es,
einschließlich commercially, ohne paying us anything und ohne asking
permission. Der nur Pflichten sind jene Apache-2.0 selbst imposes:
behalten Lizenz und Zuordnung notices, und Zustand significant Änderungen.

**Was ist kostenlos:** Software. Jeder Erstpartei Datei in dies Repository ist
Apache-2.0. Dort ist kein bezahlt tier, kein Arbeitsplatz Grenze, kein revenue threshold und kein
"Kontakt sales" Gate.

**Was ist bezahlt (optional):** unser Zeit. Bereitstellung, Integration, Härtung
reviews, SBOM/CRA Bereitschaft Pakete und jährlich Support sind offered as Services
(siehe [`PRICING.md`](PRICING.md)). Ein Support Vertrag ist niemals erforderlich zu ausführen
Software.

**Drittanbieter Komponenten** behalten ihrer eigen licences — siehe [`NOTICE`](NOTICE)
und jeder `vendor/<component>/LICENSE`. Apache-2.0 macht nicht relicense sie.

Aegis™ ist ein Marke von Copyright holder; Lizenz grants kein
Marke Rechte. Do nicht verwenden Name zu endorse ein geändert Build.

---

## 14 - Post-Audit P3 closure (Lieferung, CSP, diagnostics, Formulierung)

Five Elemente waren deliberately links offen in der 2026-11-13 Audit weil sie benötigt ein
Produkt decision. Der decisions unten sind jetzt implementiert und geschützt in CI.

### 13.1 Lieferung footprint (AEG-19) — der working Baum ist nicht der deliverable

Der working Baum ist ~845 MiB weil es trägt **regenerable** Build caches
(`video-tool/node_modules/.cache`, `.remotion`, `out/*.mp4`) und Playwright copies.
Nichts ist deleted von der working Baum: jene caches sind benötigt zu re-render der
Demo video und re-run Browser Gates. Stattdessen dort ist ein einzeln reproduzierbar
Release packer:

```bash
npm run pack:delivery       # dist/aegis-delivery-<version>.tar.gz + dist/MANIFEST.json
npm run verify:delivery     # re-verify every file's SHA-256 against the manifest
```

Der packer ausschließt Build caches vor archiving, so Archiv ist ein small
fraction von der working Baum. Ein zweite Build ist byte-identisch (behoben tar epoch,
sorted Namen, zeroed gzip mtime). Ausführen `npm run verify:delivery` für der aktuell
Datei Anzahl und Größe — jeder SHA256 passt der manifest. Der Archiv
ausschließt `node_modules/`, Build caches, gerendert media und private-Schlüssel Material, aber
**behält `vendor/`** (pdf.JS, pdf-lib, tesseract, tessdata sind Laufzeit Assets, einschließlich
`*.traineddata.gz`). `dist/` ist in `server.js`'s deny Liste und ist niemals HTTP-reachable.
Ein fehlt erforderlich Datei, ein forbidden Pfad, oder ein Archiv über 80 MiB schlägt fehl Gate.

### 13.2 Content-Sicherheit-Policy (AEG-23) — per-response Nonce, nicht `unsafe-inline`

Der Seiten mix extern `<script src>` mit genuine inline
`<script type="module">` blockiert. Hash CSP würde break auf jeder bearbeiten und
`'unsafe-inline'` würde defeat Zweck, so `server.js` prägt ein frisch
`crypto.randomBytes(16)` Nonce **pro HTML Antwort**, injiziert es in jeder opening
Skript Tag, und sendet es in `Content-Security-Policy`. HTML ist `no-store` so ein spent
Nonce kann niemals sein replayed von Cache. Der Richtlinie behält `'self'`, `blob:` und
`'wasm-unsafe-eval'` (der vendiert OCR/PDF workers brauchen sie), Mengen
`frame-ancestors 'self'` so der shell's eigen iframes noch work, und blockiert
`object-src` / `base-uri`. `doc-redactor`'s stricter `<meta>` CSP bleibt und ist
intersected durch Browser mit Kopfzeile Richtlinie.

Gate: `node video-tool/verify-csp.mjs` (nach `node server.js`). Es bestätigt ein frisch
Nonce auf jeder Antwort, Nonce auf jeder Skript Tag, kein `unsafe-inline` in
`script-src`, echt inline Modul scripts noch executing, ein injiziert Skript
**ohne** ein Nonce werdend refused, und `dist/` returning 404.

### 13.3 Diagnostics (AEG-21) — Produkt Metriken stay, roh timings bewegen zu `?diag=1`

Der HUD noch zeigt FPS / Knoten / Edges / Draw Aufrufe. `Frame ms` und `Worker tick ms`
sind developer-only: Physik Arbeiter läuft auf seiner eigen clock, so ein cold-start tick
könnte lesen thousands von ms während der rendern Schleife held 60 FPS. Jene two rows und der
on-page pick-debug Bereich sind verborgen sofern Sie offen Topologie Seite mit
`?diag=1`; Arbeiter tick Wert ist auch warm-up-filtered und exponentially smoothed.
Der picking self-test jetzt states seiner Umfang honestly: es prüft projection math,
während DOM Ereignis Lieferung ist abgedeckt durch `video-tool/verify-webgl2.mjs`.

### 13.4 Identität Gate (AEG-24) — kein auto-unlock, aber Gate ist explained

Creating ein Identität seals der privat Schlüssel sofort, so **Sign bleibt deaktiviert**.
Auto-unlocking würde behalten Schlüssel Material in Speicher und defeat der sealed-Tresor
guarantee. Stattdessen Seite jetzt states Gate (`#signGateHint`, `title`,
`aria-describedby`), Punkte bei Entsperren Bereich, und aktualisiert Meldung auf entsperren.
`btnSign` ist deaktiviert für ein sichtbar, angegeben reason vielmehr als looking defekt.

### 13.5 Behauptungen Formulierung (AEG-22) — normative Baseline

[`docs/CLAIMS-WORDING.md`](docs/CLAIMS-WORDING.md) ist der normative Formulierung Tabelle.
Do nicht sagen `forward secrecy` → sagen **per-chunk authenticated Verschlüsselung mit ein
frisch Zufall IV** (eine PBKDF2 Sitzung Schlüssel, kein ratchet); do nicht sagen `blind signature`
→ sagen **abgetrennt Hash Signatur** (kein blinding factor); do nicht sagen `immutable` → sagen
**manipulationserkennbar HMAC/SHA-256 Hash-Kette**; do nicht sagen `Prove who signed it` → sagen
**prüfen Integrität gegen ein selbst.assertiert Signierer Schlüssel**.
Verzeichnis Namen solche as `zero-knowledge-identity` und `blind-relay` sind historical
und kept für compatibility, aber jeder README jetzt ausdrücklich denies der kryptografisch
Behauptung. `npm run verify:claims` schlägt fehl CI wenn ein over-claim gibt zurück zu user-facing Kopie;
explizit denials sind allowed. Kein API, Export, wire Format oder access-control decision
changed.

### 13.6 Topologie Backend selection — WebGL2 flaky Regression Kcorrektur

Post-closure, `video-tool/verify-webgl2.mjs` intermittently timed außer waiting auf
`window.__topoBackend` (worst observed 7581 ms gegen ein 6 s cap). Hands-on
diagnosis showed two echt causes, neither ein CSP/`?diag=1` Regression:

1. `navigator.gpu.requestAdapter()` hat **kein eingebaut timeout**; Headless
   SwiftShader blockiert 3–8 s vor returning `null`, so der WebGPU-then-WebGL2
   Rückfallebene chain occasionally blew past der test's warten.
2. Der test's `delete navigator.gpu` war ein **no-op** — `navigator.gpu` ist ein
   read-only prototype getter, so der löschen stillschweigend fehlgeschlagen und Test nur
   fell zurück durch luck wenn Headless hatte kein Adapter.

Vier fixes (A/B/C/D) waren angewendet zu `modules/webgpu-topology/src/gpu/device.js`
und `video-tool/verify-webgl2.mjs`:

- **Ein** — `pickGpu()` honors ein explizit `?gpu=webgl2` / `?gpu=webgpu` URL
  override as ein synchronous short-circuit, und Test jetzt navigates zu
  `index.html?gpu=webgl2` so WebGL2 Pfad ist exercised deterministically
  (kein Adapter warten, kein reliance auf der deleted getter).
- **B** — `requestAdapter()` ist raced gegen ein 2 s `setTimeout(() => null)`, so
  ein missing/absent Adapter löst auf fast und falls zurück zu WebGL2 stattdessen von
  hanging Start Pfad.
- **C** — `window.__topoBackend = 'pending'` ist published der instant `pickGpu`
  startet, und `window.__topoBackendReason` Datensätze der resolution Pfad
  (`forced webgl2`, `webgpu default`, `webgpu fell back`, …) für
  self-explaining Fehler.
- **D** — `device.lost` ist downgraded von `console.error` zu `console.warn`; ein
  lost Gerät während normal teardown ist benign noise und muss nicht Auslösung der
  "kein fatal Konsole Fehler" Laufzeit Gate.

Gate: `verify-webgl2.mjs` ist jetzt stabil — `window.__topoBackend` löst auf zu
`webgl2` in well unter 1 s, und ein 3/3 repeated ausführen besteht. `?gpu=` ist auch ein
handy Handbuch diagnostic: offen irgendein Topologie URL mit `?gpu=webgl2` oder
`?gpu=webgpu` zu force ein Backend.

### 13.7 Endgültig Regression Gate Status

Alle Gates grün nach WebGL2 Kcorrektur (ausführen auf sauber, port-collision-free servers):

| Gate | Befehl | Ergebnis |
|------|---------|--------|
| Einheit Suite | `npm test` | 151 / 151 bestanden |
| Behauptungen Formulierung (AEG-22) | `npm run verify:claims` | 216 Dateien scanned, kein forbidden Behauptungen |
| Lieferung packer (AEG-19) | `npm run verify:delivery` | Prüfen Bestanden — jeder SHA256 passt, kein caches/media/keys; source-vs-package freshness prüfen (B-02) |
| CSP Nonce (AEG-23) | `node video-tool/verify-csp.mjs` | Alle Bestanden |
| P3 closure | `node video-tool/verify-p3.mjs` | Alle Bestanden (12 Seiten + AEG-21/24 + P0 PoCs + F-01 gefälscht→DENY Regression) |
| WebGL2 Rückfallebene | `node video-tool/verify-webgl2.mjs` | 3 / 3 bestanden (war flaky) |
| Laufzeit Smoke-Test | `node video-tool/verify-runtime.mjs` | Alle Bestanden (goto retry ×3 hinzugefügt — kein länger flaky) |
| Konsole (geschützt) | `node video-tool/verify-p3.mjs` | `/aegis-shell/console.html` 200 + sign-in control zeichnet (N-01 Abdeckung hinzugefügt) |
| Seite Abdeckung | — | **13 / 13 Erstpartei Seiten** (12 modules + Shell + Konsole) |
| Deep flows | `npm run verify:flows` | **12 / 12 geprüft auf Chromium (2026-11-14)** — Token-gate 4-states, 3-Partei blind sign+prüfen, Tresor Siegel, Canvas Stempel bearbeiten, Topologie 100k, Shell Oberfläche, zero-external, cosign 2/2, p2p lokal (same-context) + LAN (sessionStorage Geheimnis). Selectors matched zu bestätigt Modul DOM. p2p local/LAN assert page-load + zero-pageerror (peer-connect benötigt ein live 2-Peer / Sitzung Geheimnis). Erfordert Playwright + Chromium (nur-Entwicklung; siehe Hinweis unten). |
| Accessibility | — | `aria-busy` auf **jeder** long-task Schaltfläche über alle 12 modules + Konsole + Shell (N-04 → EN 301 549 / WCAG 4.1.2 + 4.1.3) |
| Sicherheit Härtung | — | Audit-Trail ist manipulationserkennbar und nur-appendierbar für operator/system Betroffene — `/audit/erase` refuses protected Betroffene (403); GDPR Löschung noch Ziele Daten Betroffene. Anmeldung throttled pro IP + per-(IP,Benutzer) (429 + lockout) **plus ein pro IP enumeration Wächter** (distinct-username 429) das schließt der account-existence side-channel; **ein per-user lockout jetzt spreads zu der gesamte IP**, so probing non-existent usernames auch gibt zurück 429 (v5 Kcorrektur). **Token-gate lehnt ab non-canonical (manipuliert) Signaturen** — schließt ein forged-Token Abnahme flaw (~21% von trailing-char flips admitted vor Kcorrektur). Konsole Audit CSV/JSON Export behoben (`res.clone`); `GET /export/bundle` adds Art.20 portability (jetzt enthält Konto Metadaten). `npm run doctor` self-diagnostic. (B-04 + must-fix #5 + Token-gate + M-01 + enum Wächter + lockout-spread) |
| Static-surface lockdown (v7) | `server.js` | **B-01/B-01b/B-02/B-04 geschlossen**: `config/`, `data/`, `server/` sind denied as Privat Obstersten dirs (depth-0 match, so `modules/webgpu-topology/src/data/` noch liefert aus), `.db*` extensions denied, encoded traversal (`%2e%2e`, double-encoded) abgelehnt auf der decoded Pfad. `GET /config/local.json`, `/data/aegis.db`, `/server/store.js` jetzt 403/404 — Aussteller Geheimnis ist kein länger reachable von der port. `Referrer-Policy` / `Permissions-Policy` / `nosniff` / `HSTS` auf jeder Antwort; `/audit?limit=` erfordert ein positiv integer und clamps zu 1000; DB startup Fehler prints ein actionable Meldung. |
| Secret/DB niemals ship (v7) | `scripts/package-delivery.mjs` | **B-03 geschlossen**: packer ausschließt `config/local.json` und obstersten `data/*` regardless von `.gitignore`, mit two schwer Assertions auf beide Build und `--verify` (gegen actual tar Einträge). `scripts/setup.mjs` prints `rotating` und rotates irgendein pre-existing `issuerSecret` stattdessen von stillschweigend reusing es, und chmods Datei zu `0600` auf beide erstellen und rotieren. `Dockerfile` verwendet `node:22-alpine` (node:SQLite) und erstellt `config/` bei Build Zeit stattdessen von `COPY`-ing ein Geheimnis. `npm run verify:zero-deps` / `npm run verify:p3` sind jetzt first-class Gates. |
| Compliance Paket | `docs/compliance/` | Privatsphäre Richtlinie (Aufbewahrung Tabelle, Art.12(3), cookie statement, DPO, DE), DPA (TOM Anhang + 24h/72h Verstoß + Signatur), ROPA (Verantwortlicher + Übertragung Basis), SOC2 Bereitschaft, **SCIM 2.0 (implementiert, `AEGIS_SCIM_TOKEN`)**, **OIDC SSO (implementiert, `AEGIS_AUTH_MODE=oidc`)**, Vorfall Antwort / DR-Backup / Access-Review / Sub-Auftragsverarbeiter inventory, VPAT 2.5 EU / WCAG 2.2 AA, SLA, Daten-Residency; `GET /healthz` + `GET /health` probes; `GET /export/bundle` (Art.20); `scripts/cleanup.mjs` + `scripts/uninstall.mjs` + `Dockerfile`. (schließt der EU/US Compliance gap) |
| Identität / SSO | `server/oidc.js` | OIDC authorization-code Ablauf mit RS256 id_token Prüfung über `node:crypto` (null extern Abhängigkeit) und SCIM 2.0 Bereitstellung (`/scim/v2/Users`, `AEGIS_SCIM_TOKEN` bearer). Beide sind Opt-in Funktion flags — der zero-config lokal Bereitstellung ist unchanged. SCIM Deprovisionierung disables Anmeldung (immediate 401) ohne purging der manipulationserkennbar Audit-Trail. |

> **E2E prerequisite für `verify:flows`:** der deep-flow Gate benötigt ein Browser.
> Playwright ist **nur-Entwicklung** und macht nicht affect der zero-runtime-dependency
> Behauptung. Installieren einmal mit `npm i -D playwright && npx playwright install chromium`,
> dann ausführen gegen ein live Server:
> `BASE=http://localhost:8099 AEGIS_ISSUER_SECRET=<issuer> node video-tool/verify-flows.mjs`.

---

## 15 - Von Sicherheit-kernel Demo zu EU/US industrial Bereitstellung

Der Kern zero-trust Kernel + der P3 Audit closure sind erledigt (§14). Zu sein shippable
zu European/American industrial-Compliance Kunden, Workbench muss bewegen von
ein **local-first Demo** zu ein **Produktion System**. Dies ist ein phased program, ausgeführt
Phase durch Phase; jeder Phase ist geprüft ("wired up") vor der nächste startet. Status Tabelle
bei Ende von dies Abschnitt.

### 14.1 One-click installieren (Phase 0 — Erledigt)

Null extern Abhängigkeiten. Der nur Anforderung ist **Node.js ≥ 22** (für der
eingebaut `node:sqlite`); nichts sonst ist installed oder ausführen.

```bash
npm run setup     # creates data/ + config/local.json (auto-generated issuer secret)
npm start         # node server.js
```

- `data/aegis.db` ist ein embedded SQLite Speicher (Node eingebaut) — kein Postgres/Redis
  zu installieren, so "one-click" bleibt one-click.
- `config/local.json` (git-ignored) trägt ein auto-generated `issuerSecret`;
  `server.js` liest es automatisch, oder override über `AEGIS_ISSUER_SECRET`.
- Der Server jetzt schreibt ein **Serverseitig Audit Protokoll** (`audit_events` Tabelle) das
  überlebt restarts — der foundation für Phase 1's beibehalten + GDPR-erasure-aware trail.

### 14.2 Phased roadmap

| Phase | Umfang | Status |
|-------|-------|--------|
| **P0** | Foolproof installieren + embedded `node:sqlite` Speicher + Serverseitig Audit Protokoll | ✅ erledigt (dies Abschnitt) |
| **P1** | Audit-Trail durable in SQLite + GDPR right-to-erasure (targeted deletion von ein subject's rows + beibehalten Löschung marker) + Aufbewahrung purge (ausschließt Compliance markers) + Bediener-gated `/audit` API (Liste / CSV Export / erase / purge) | ✅ erledigt |
| **P2** | Identität foundation (Serverseitig): lokal Konto (scrypt + Salt) + Serverseitig Sitzungen (TTL) + Bediener auth accepts Sitzung Oder bootstrap Geheimnis; OIDC authorize-redirect scaffold (config-driven, 501 bis IdP konfiguriert); SAML/LDAP dokumentiert Konfiguration stubs (nicht faked). Browser `token-gate` wiring zu Sitzungen deferred zu Modul Integration. | ✅ erledigt |
| **P3** | TSA RFC 3161 Prüfung: Signatur-over-signedAttrs + Meldung imprint + X.509 **chain-to-trust-store** + validity (eIDAS admissibility). Zero-dep (`node:crypto`). `verifyTimestampToken`, Adapter `submit` gibt zurück `verification`, plus `/adapter/tsa/verify` Endpunkt. OCSP/CRL Widerruf prüfen deferred. | ✅ erledigt |
| **P4** | Cross-site Transport: Token-gated `/relay` Server-mediated Daten Relay (Serverblind Rückfallebene wenn kein TURN) + STUN/TURN Konfiguration surfaced über `/session` + Serverseitig **Schlüssel-escrow** Richtlinie (`/escrow` deposit/retrieve, Bediener break-glass) | ✅ erledigt |
| **P5** | Widerruf: lokal CRL/OCSP-style deny-list von Schlüssel fingerprints (`/admin/revoke`) + **admission-time prüfen** in `/session` | ✅ erledigt |
| **P6** | Production-leaning UI foundation: vereinheitlicht **Entwurf System** + **Bediener Konsole** (`/aegis-shell/console.html`) das macht P1–P5 Server Funktionen usable (Anmeldung, Audit, Widerruf, Hinterlegung, TSA prüfen). Modul Produkt UIs sind functional aber nicht redesigned in dies bestanden. | ✅ erledigt (foundation) |
| **P7** | Compliance Shell: **i18n** (en/de/fr/es) + **PWA** (manifest + offline Service Arbeiter) + **SBOM** Generation (CycloneDX) + **Bedrohung Modell** + **CRA/NIS2** + **Sicherheit.md** self-assessment. Unabhängig Drittanbieter Penetration Test bleibt erforderlich (kann nicht sein durchgeführt durch dies Projekt — ausdrücklich außer von Umfang). | ✅ erledigt (pen-test extern) |

Der Betrieb Konsole ist available in Englisch, Deutsch, French und Spanish. Modul interfaces sind in Englisch. Support und correspondence sind bereitgestellt in Englisch und Deutsch.

### 14.3 Ehrlich Umfang Hinweis

Two Elemente kann nicht sein geschlossen durch Code alone:

- **Unabhängig Penetration Test** (Teil von P7) muss sein durchgeführt durch ein third Partei
  — dies Projekt kann nur produce Bedrohung Modell und ein intern self-assessment.
- P6 (vollständig UI) und P7 (localization/a11y/PWA) sind der largest phases und sind
  absichtlich late in der order so Sicherheit + Daten foundations sind solid erste.
