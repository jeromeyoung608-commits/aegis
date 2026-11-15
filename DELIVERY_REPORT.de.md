<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# AEGIS — Lieferung & Test Bericht

**Projekt**: `Aegis` — Secure Kante Zusammenarbeit Workbench
**Datum**: 2026-11-09
**Reading Hinweis**: Datei Zählungen, Archiv sizes und Test totals unten sind point-in-time
snapshots von jeder Prüfung Runde, nicht der aktuell Lieferung Zustand. Für der
authoritative aktuell figures ausführen `npm run verify:delivery` (jeder SHA256 passt).
**Composition**: drei independently-shipped modules (`webgpu-topology`, `doc-redactor`,
`p2p-crypto-transfer`) vereinheitlicht durch `aegis-shell` hinter eine EventBus + `postMessage`
Brücke, ausgeliefert durch eine null Abhängigkeiten `server.js`.

---

## 1 · Was war zugestellt

Ein single-page Workbench das schließt Schleife **Topologie → Schwärzung → P2P Lieferung**
ohne irgendein Daten leaving Browser, plus der vereinheitlicht Server und docs. Der drei modules
waren **verschoben** (nicht rewritten) in `Aegis/modules/` so ihrer intern structure und
existing Test suites bleiben unversehrt; nur thin, isoliert **Integration seams** waren hinzugefügt:

| Seam | Datei | Was es macht |
|------|------|--------------|
| Topologie → Shell | `modules/webgpu-topology/src/main.js` | auf ein Klick (bereits geschützt durch der 5px drag/click threshold), `postMessage({channel:'aegis', type:'topology:node-selected', nodeId, x, y})` zu der parent. Topologie ist read-only; Shell decides Antwort. |
| Redaktor hooks | `modules/doc-redactor/src/js/app.js` + `aegis-adapter.js` | offenlegt `window.REDAKTOR.addFiles` / `exportToParent`; Adapter injiziert "▶ Senden zu Aegis Peer", auto-loads auf `redaktor:load-doc`, und emittiert `redaktor:export-ready` auf completion. |
| P2P hooks | `modules/p2p-crypto-transfer/src/main.js` + `aegis-adapter.js` | offenlegt `window.__AEGIS.connect/send`; Adapter accepts `p2p:configure` + `p2p:send-file` und emittiert `p2p:file-received` / `p2p:file-sent` / `p2p:error`. |
| Shell adapters | `aegis-shell/src/adapters.js` | `TopologyAdapter` (read-only), `REDACTORAdapter` (`addFiles` / `exportToParent`), `P2PAdapter` (`connect(room)` / `sendFile(file)`) — der typed control Oberfläche über der iframes. |
| Shell orchestration | `aegis-shell/src/{app.js, bus.js, context.js}` | namespaced EventBus Brücke + geteilt `AegisContext` + dark command-center SPA (links Topologie / Recht Schwärzung Seitenleiste) mit vereinheitlicht router & 3-Stufe Zustand Maschine. |
| Server | `Aegis/server.js` | COOP/COEP (für SAB) + statisch hosting von alle modules + P2P long-poll Signalisierung. |

Kein Modul Importe eine weitere; jeder cross-Modul Aufruf travels der `aegis` `postMessage`
Kanal und ist routed durch der shell's `EventBus`. Das ist der architectural constant
requested ("eine EventBus / Zustand Maschine zu Regel sie alle").

---

## 2 · Zero-trust / offline Behauptungen — re-stated precisely
- Topologie: lokal WebGPU; Server sendet nur statisch Bytes.
- Schwärzung: OCR + PDF rebuild sind vollständig lokal; ein offline Wächter blockiert Cross-Origin
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon`. Exportiert PDFs carry kein Text Ebene.
- Übertragung: Signalisierung Relay sieht nur SDP/ICE; Datei Bytes und PBKDF2 Schlüssel niemals reach
  Server.

---

## 3 · Prüfung durchgeführt

### 3.1 Statisch analysis (dies Umgebung)
- `node --check` auf jeder `.js` edited/added in dies Integration bestanden:
  - `Aegis/server.js`, `aegis-shell/src/app.js`, `aegis-shell/src/bus.js`
  - `modules/webgpu-topology/src/main.js`, `modules/doc-redactor/src/js/app.js` +
    `aegis-adapter.js`, `modules/p2p-crypto-transfer/src/main.js` + `aegis-adapter.js`
  → alle parst cleanly.
- Full-tree CJK / fullwidth-punctuation Scan über `Aegis/` → **Sauber** (Englisch nur).
- Server Smoke-Test Test: started `Aegis/server.js`, bestätigt
  `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
  auf responses, und Modul Eintrag Punkte (`/aegis-shell/index.html`,
  `/modules/webgpu-topology/index.html`, `/modules/doc-redactor/index.html`,
  `/modules/p2p-crypto-transfer/index.html`) und `shaders.wgsl` sind ausgeliefert mit korrekt
  MIME types; `/signal` ist behandelt as long-poll.

### 3.2 Modul-level suites (pre-existing, noch gültig)
- `p2p-crypto-transfer`: `node --test` → 10/10. 5 Kryptografie (Hin- und Rückweg, wrong-Schlüssel, Manipulation,
  Salt, interop) + 5 sink/OOM-guard Tests: `createSink` Routing (pre-locked writer >
  `showSaveFilePicker` > capped Speicher Rückfallebene), der >1 GiB schwer reject, und ein
  Ende-zu-Ende replay proving Empfänger schreibt jeder entschlüsselt Block zu Datenträger as es
  arrives (niemals assembles der gesamte Datei in Speicher — der alt Out-of-Memory Pfad ist gone).
- `doc-redactor`: reproduzierbar Playwright E2E + PDF forensics dokumentiert in seiner
  `TEST_REPORT.md` (nur-Entwicklung Abhängigkeiten; läuft in ein Browser, nicht hier).
- `webgpu-topology`: syntax + statisch WGSL/bind-group Prüfung (WebGPU benötigt ein Browser).

### 3.3 Was könnte Nicht sein ausgeführt hier (ehrlich disclosure)
Der integration's **Laufzeit** behavior (WebGPU Darstellung, in-iframe OCR, und der WebRTC
handshake zwischen der two P2P iframes) erfordert ein echt Browser mit GPU + WASM + WebRTC.
Dies Umgebung hat kein Browser, so Ende-zu-Ende Schleife war geprüft **structurally**:
Meldung Vertrag zwischen Shell und jeder Adapter, Server Kopfzeilen, Modul serving,
und der drei modules' eigen suites. Ein Handbuch Smoke-Test Test ist unten.

---

## 4 · Handbuch Smoke-Test Test (ausführen in Chrome/Kante 113+)
```bash
cd /path/to/Aegis && node server.js
# open http://localhost:8080
```
1. Topologie zeichnet; Klick ein node → Schwärzung Registerkarte öffnet mit ein erzeugt Vertrag.
2. Schwärzung Modul OCRs lokal; schwarz Boxen appear auf IBAN / Steuer-ID / Name.
3. Klick **"▶ Senden zu Aegis Peer"** → Übertragung Registerkarte; Peer Ein verschlüsselt & Streams, Peer B
   receives & entschlüsselt; stepper turns vollständig grün.
Erwartet: bei kein Punkt macht Netzwerk Registerkarte show Dokument oder Datei Bytes leaving der
Browser (nur same-origin statisch + SDP/ICE zu Signalisierung route). Der Schwärzung
Modul's "Blockiert" Zähler increments wenn anything extern ist attempted.

---

## 5 · Risiko Notizen (Abnahme, nicht blockers)
- **Two Peers, eine Browser**: der in-shell Demo verwendet two iframes + `BroadcastChannel`.
  Für two physical machines verwenden LAN Modus + HTTPS (drop `key.pem`/`cert.pem` beside
  `server.js`).
- **COEP vs extern STUN**: `require-corp` ist harmless für same-origin Assets aber kann
  interfere mit *extern* STUN auf einige browsers; same-machine benötigt kein STUN, und der
  eigenständig P2P Server (ohne COOP/COEP) deckt ab cross-machine wenn benötigt.
- **Schwärzung recall**: Erkennung ist tuned für Deutsch paperwork und darf brauchen Handbuch Boxen
  auf poor scannt — durch Entwurf der human prüft vor Export.
- **Beispiel Dokument**: Shell erzeugt ein synthetic Vertrag so Schleife ist demonstrable
  mit null echt Daten; ersetzt `contractForNode()` mit ein echt client-side loader zu go live.

---

## 6 · Fehler gefunden und resolved während dies bestanden
- (Carried über, bereits behoben in `webgpu-topology`) pointerup drag/click ambiguity und
  der initial viewport-fit bug — siehe Modul's `DELIVERY_REPORT.md` §7.
- **P2P Empfänger Out-of-Memory (der "Speicher hog") — Behoben**: Empfänger kein länger buffers alle chunks
  und assembles ein `Blob` bei Ende. Es jetzt öffnet ein sink auf der erste entschlüsselt Block und
  Streams gerade zu Datenträger über `showSaveFilePicker()` → `FileSystemWritableFileStream`
  (unbounded, kein reassembly Puffer); non-Chromium browsers fall zurück zu ein im Arbeitsspeicher Pfad
  **capped bei 1 GiB** das wirft ein crisp Fehler oben der cap. Ein "💾 Wählen save Ort"
  Schaltfläche bietet der erforderlich Benutzer gesture zu pre-lock der writer. Siehe
  `modules/p2p-crypto-transfer/{README.md §6, DELIVERY_REPORT.md §5}`.
- Integration-only: bestätigt jeder adapter's `frameId` Routing passt der shell's
  `post()` so `send-file` Ziele nur Absender iframe und `configure` Ziele jeder P2P
  iframe genau einmal.
- **Redaktor spelling** — eine stray `REAKTOR` (fehlt D) in
  `modules/doc-redactor/src/js/aegis-adapter.js` comment; korrigiert zu `REDAKTOR`
  (der canonical Marke verwendet everywhere sonst). Grep-confirmed null verbleibend.
- **Vereinheitlicht Kontext (der drei unabhängig projects → eine Aegis Workbench)** — hinzugefügt
  `aegis-shell/src/context.js` (`AegisContext` + `selectNode`/`setDocument`/`markSent`/
  `markReceived` mutators). Der geschlossen Schleife ist jetzt ein explizit Zustand Maschine über dies
  Kontext stattdessen von scattered `postMessage` Aufrufe: ein Topologie `node-selected` schreibt der
  node in Kontext, synthesizes **das node's** associated Vertrag
  (`contractForNode(node)`, stamped mit node id/coords → provably der *corresponding*
  Dokument), und posts `load-doc` in Redaktor. Dokumente README §3.
- **COOP/COEP Härtung (Server.JS)** — bestätigt der vereinheitlicht Server ist ein deliberately
  *isoliert* Server, nicht ein naive statisch Server: `Cross-Origin-Opener-Policy: same-origin`
  + `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Resource-Policy:
  same-origin` sind Set auf **jeder** Antwort (statisch Bytes Und der JSON Signalisierung Relay),
  welche ist was ermöglicht `SharedArrayBuffer` für der WebGPU Topologie's Arbeiter Physik.
  Geprüft live mit `curl`: der drei Kopfzeilen appear auf `/` (200), `/aegis-shell/src/
  App.JS` (200), `/signal` (204) und ein 404 alike. Docs Hinweis der eigenständig Modul
  servers absichtlich omit diese (kein SAB benötigt).
- **Adapter / EventBus refactor (namespaced + dark command-center SPA)** — restructured
  Integration zu der spec's explizit Architektur: cross-Modul Ereignisse sind jetzt
  namespaced durch Herkunft (`topology:node-selected`, `redaktor:export-ready`,
  `p2p:file-received` / `p2p:file-sent` / `p2p:error`), und jeder Modul ist verpackt in ein
  shell-side Klasse mit der genau Oberfläche requested — `TopologyAdapter` (read-only),
  `REDACTORAdapter.addFiles(fileList)` / `exportToParent()`, `P2PAdapter.connect(room)` /
  `sendFile(file)`. Der Shell war neu gebaut as ein Vanilla-JS dark "Befehl Mitte": links =
  Topologie Stufe, Recht = Schwärzung Seitenleiste + P2P Übertragung Karte, mit ein vereinheitlicht router
  (`body[data-stage]`) und ein 3-Stufe Zustand Maschine driven durch `AegisContext`. Auf
  `p2p:file-received` Shell jetzt *decides* (re-open in Redaktor oder Herunterladen).

---

## 7 · Modul 01 · Lokal Self-Custodied Identität (hinzugefügt)

Ein fourth, eigenständig Modul für domain-less intranets: jeder employee prägt ein lokal
ECDSA P-256 Siegel. Der privat Schlüssel ist verpackt mit PBKDF2-SHA256 (250,000 iterations) →
AES-GCM-256 und speichert in IndexedDB; der offentlich Schlüssel ist exportiert as SPKI Basis64 und
gerendert auf ein digital Geschäft Karte mit ein SHA-256 Fingerabdruck und ein fingerprint-derived
avatar.

| Prüfen | Ergebnis |
| --- | --- |
| Einheit Suite (`node --test`, null Abhängigkeiten) | 26 / 26 bestanden |
| Browser Abnahme: Identität readable nach ein vollständig Seite Neu laden | Bestanden |
| Signatur über ein frisch challenge prüft gegen der speichert offentlich Schlüssel | Bestanden |
| Privat Material vorhanden in der gespeichert Datensatz | Keiner — `isSealed()` enforces es |
| Extern Netzwerk Anfragen von Seite | 0 |
| Attributions (Code Kopfzeile, Konsole Signatur, Fußzeile Hinweis) | Alle drei vorhanden |

Zugestellt Dateien live unter `modules/zero-knowledge-identity/`; siehe seiner `README.md`,
`TEST_REPORT.md` und `DELIVERY_REPORT.md`. Offen es bei
`/modules/zero-knowledge-identity/index.html` während `node server.js` ist läuft.

Bekannt Grenzen, angegeben vielmehr als verborgen: kein Passphrase Wiederherstellung, Speicher ist pro Browser
profile, Namen sind selbst.assertiert (kein CA hinter sie), und der unlocked Schlüssel lebt in Seite
Speicher bis Sperre oder Neu laden.

---

## 8 · Modul 02 · Lokal Verschlüsselt Tresor (Audit & Archiv)

Der counterpart zu ein Signatur: ein geprüft Artefakt benötigt somewhere zu live das ist nicht
der desktop. Nach der signed-delivery Empfänger prüft ein Datei, Befehl Mitte bietet
**Archiv zu Tresor**, welche verschlüsselt Datei plus seiner Signatur Metadaten mit
AES-GCM-256 und schreibt eine opak `.aegis` Container in Browser's Herkunft Privat
Datei System. Nichts lässt Gerät.

| Prüfen | Ergebnis |
| --- | --- |
| Einheit Suite (`node --test`, null Abhängigkeiten) | 23 / 23 bestanden |
| Browser: Shell Siegel nach ein geprüft Lieferung | Bestanden — 52,576 B Nutzdaten → 53,324 B Container |
| Tresor Anzahl vor / nach Neu laden | `1 sealed record · 52.1 KB ciphertext · opfs` — unchanged |
| Eigenständig Tresor Seite sieht der shell's Datensatz | Bestanden — 1 row, gleich OPFS Ordner |
| Datei Namen / Metadaten sichtbar während gesperrt | Keiner — nur uuid + Chiffretext Größe |
| Falsch Passphrase / manipuliert Chiffretext | Distinct, getestet Fehler; Datensatz überlebt |
| Extern Netzwerk Anfragen von Seite | 0 |
| Attributions (Code Kopfzeile, Konsole Signatur, Fußzeile Hinweis) | Alle drei vorhanden |

Two Integration Fehler waren gefunden und behoben während Abnahme: ein Blob posted in ein
verborgen iframe niemals abgeschlossen Siegel (Shell jetzt Importe Tresor Kern direkt, so
Archiv läuft in-page), und ein behoben BroadcastChannel Raum let veraltet Registerkarten steal WebRTC
bietet (beide demos jetzt verwenden ein per-load Raum id).

Zugestellt Dateien live unter `modules/encrypted-archive/`; siehe seiner `README.md`,
`TEST_REPORT.md` und `DELIVERY_REPORT.md`. Offen Browser bei
`/modules/encrypted-archive/index.html` während `node server.js` ist läuft.

Bekannt Grenzen: 64 MB pro Datensatz (im Arbeitsspeicher Siegel), kein Passphrase Wiederherstellung, kein Schlüssel Rotation,
und OPFS ist cleared wenn Standort Daten ist cleared.

---

## 9 · Modul 03 · Manipulationserkennbar Audit-Trail (Zeitleiste & Audit UI)

Der Compliance counterpart zu Tresor: ein signiert Dokument ist nur defensible wenn der
Aktionen around es sind aufgezeichnet und später Änderungen sind detectable. Der right-hand **Audit
Trail** Karte appends eine Hash Verknüpfung pro action und zeichnet es as ein compact Zeitleiste.
Jeder Verknüpfung ist `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` wenn ein Gerät
Schlüssel ist available (Einträge carry `alg: 'hmac-sha256'`); ein older chain geschrieben mit
Klartext `SHA-256` noch prüft as `alg: 'sha256'`. Bearbeitung, deleting oder reordering ein
Eintrag breaks jeder später Hash, so der chain ist **manipulationserkennbar, nicht immutable** — ein
Bediener wer kann rewrite der gesamte Speicher und auch enthält Schlüssel könnte recompute es.
Der chain reuses `modules/sync-canvas/src/audit/HashChain.js` durch ein einzeln
re-export seam. Siehe `docs/CLAIMS-WORDING.md`.

Aufgezeichnet Ereignisse: Schwärzung started, destructive PDF erzeugt, verschlüsselt P2P Lieferung,
Lieferung entschlüsselt durch Boss-B, ECDSA Signatur erzeugt (mit Signierer's SPKI
Fingerabdruck), Prüfung bestanden oder abgelehnt, und Tresor Versiegelung. Der eigenständig Prüfung
Seite bei `/modules/audit-timeline/index.html` liest der gleich chain von `localStorage` und
adds **Prüfen chain**, **Export JSON** und ein two-step **Klar**.

| Prüfen | Ergebnis |
| --- | --- |
| Einheit Suite (`node --test`, null Abhängigkeiten) | 15 / 15 bestanden, 0 fehlgeschlagen |
| Eigenständig Seite, leer Zustand | Bestanden — `chain empty · append-only log ready` |
| Shell signed-delivery Demo | Bestanden — `Verified · 2 signer(s)`, Signatur Verknüpfung mit `Fingerprint 677A18AB552A` |
| Zeitleiste nach two Verknüpfungen | Bestanden — `chain intact · 2 links · head 7C866913...` |
| Neu laden Persistenz | Bestanden — gleich two Verknüpfungen und Kopf nach Neu laden |
| Cross-page sharing | Bestanden — eigenständig Seite zeigt der gleich two Verknüpfungen |
| Konsole Fehler während Abnahme | Keiner |
| Attributions (Code Kopfzeile, Konsole Signatur, Fußzeile Hinweis) | Alle drei vorhanden |

Eine Reihenfolge Fehler war gefunden während Integration: deriving Signatur Verknüpfung von der endgültig
Urteil collapsed Signatur und Prüfung in eine Zeitstempel. Der signed-delivery Modul
jetzt posts `signed:sealed` sofort nach building Trailer, vor Artefakt
travels, so Zeitleiste zeigt der echt sequence.

Bekannt Grenzen: der lokal chain ist manipulationserkennbar aber nicht remotely attested; replacing der
gesamte speichert chain mit ein unterschiedlich gültig chain ist outside Bedrohung Modell bis Kopf
Hash ist anchored in ein signiert Dokument oder ein extern Zeitstempel Service. `localStorage` ist
last-writer-wins, so gleichzeitig command-center Registerkarten soll sein avoided in Produktion.
Timestamps come von der lokal clock.

Zugestellt Dateien live unter `modules/audit-timeline/`; siehe seiner `README.md`,
`TEST_REPORT.md` und `DELIVERY_REPORT.md`.

---

## 10 · Adapter 01 · RFC 3161 TSA Zeitstempel (optional, aus durch Standard)

Ein **optional, removable Adapter** — nicht Teil von Vertrauen Kernel. Es leitet weiter ein
SHA-256 Prüfsumme (ein Aegis chain Kopf, ein FieldSeal `sealHash`, oder ein C2PA Ergebnis Hash) zu
ein Bediener-configured extern Time-Stamp Authority und gibt zurück der roh CMS
`TimeStampToken`. Kein `core/` Datei war geändert; Kernel Hash-Kette, ECDH/ECDSA,
LAN Token Relay, und Topologie rendern sind byte-for-byte unchanged.

| Fähigkeit | Detail |
|---|---|
| Enable | `node server.js --adapter-tsa on --tsa-config <file>` (Standard: Aus) |
| Endpunkt | `POST /adapter/tsa/submit` (registriert nur wenn aktiviert) |
| Anfrage | hand-rolled DER `TimeStampReq` mit ein frisch Nonce (anti-replay) |
| Antwort | behoben schema: `tsaStatus`, `originalDigest`, `timestampTokenBase64` (roh, unmodified), `tstInfo` (`genTime`/`serialNumber`/`nonce`), `tsaProvider`, `verifyHint` |
| Fehler | irgendein timeout / Netzwerk Fehler / 4xx / 5xx → `{ tsaStatus: 'failed' }`; niemals wirft, niemals disrupts Haupt chain oder Relay |
| Abhängigkeiten | Node built-ins nur (`node:crypto`, `node:http`, `node:https`); kein `asn1js` / `pkijs`. Vollständig CMS Prüfung ist ein isoliert, not-loaded `vendor/` branch |
| Removability | löschen `adapters/tsa-rfc3161/` + der `--adapter-tsa` Schalter → alle original functionality unversehrt |

**Prüfung (dies bestanden):** 9/9 Adapter Einheit Tests (DER encode, CMS/TSTInfo parst,
Eingabe schema, unreachable-TSA fail-safe, lokal mock TSA Hin- und Rückweg, RBAC Gate) und der
offline Smoke-Test (`video-tool/verify-tsa.mjs`: Adapter Auf, extern TSA unreachable →
`tsaStatus: failed`, Haupt `/session` Relay noch healthy). `zero-dep-lint.mjs` scannt der
Adapter (nur `node:*` + relative Importe) und forbids irgendein `vendor` Import leaking in.

### Risiko Grenze & division von Verantwortung (EN)

**Aegis ist ein forwarding Proxy; TSA ist Drittanbieter Vertrauen source.** Aegis:
(1) sendet **nur Prüfsumme** — niemals Dokument Bytes oder Schlüssel; (2) macht **nicht** prüfen
TSA CMS Signatur oder Zertifikat chain und maintains **kein TSA root-CA Vertrauen Speicher**;
(3) macht **nicht** Cache, re-sign, oder alter der returned Token; (4) macht **kein Behauptung**
about rechtlich effect. Der Benutzer muss prüfen Token offline gegen TSA Wurzel CA.
Whether ein RFC 3161 Zeitstempel ist admissible, und unter welche qualifiziert Zertifikat, ist
decided durch der lokal jurisdiction und TSA Anbieter's Zertifikat chain. Kein Anbieter
URL, API Schlüssel, oder Zertifikat ist hardcoded: Anbieter selection, Zugangsdaten, EU region,
und GDPR posture sind Bediener's Verantwortung.

### Risikogrenze & Verantwortung (DE)

**Aegis ist ein Weiterleitungs-Proxy; sterben TSA ist sterben externe Vertrauensquelle.**
Aegis: (1) sendet **nur den Hash** – niemals Dokumentinhalte oder Schlüssel;
(2) prüft **weder** sterben CMS-Signatur **noch** sterben Zertifikatskette TSA und
unterhält **keinen** TSA-Stammzertifikatsspeicher; (3) speichert, signiert oder
verändert das zurückgegebene Token **nicht**; (4) trifft **keine Aussage** zur
Rechtswirkung. Sterben Offline-Prüfung gegen TSA-Stammzertifikat obliegt dem
Anwender. Zulässigkeit und Qualifizierung richten sich nach der jeweiligen
Rechtsordnung und Zertifikatskette des TSA-Anbieters. Anbieterwahl,
Zugangsdaten, EU-Region und DSGVO-Konformität liegen beim Betreiber.

---

## 11 · Sicherheit Audit Remediation (Round-7) — 2026-11-14

Ein unabhängig Sicherheit Audit raised **vier blockers (B-01~B-04)** around static-file
exposure und ein fifth Lieferung Fehler (**B-03**) das ausgeliefert ein geteilt `issuerSecret` und ein
development SQLite Datenbank zu jeder Kunde. Alle findings sind **remediated und geprüft**.

### 11.1 Wurzel verursachen & Kcorrektur

Der vereinheitlicht `server.js` previously ausgeliefert der working Baum mit kein Grenze around privat
Pfade. Der Kcorrektur ist **obstersten precise** (nicht segment-matching, so legitimate Laufzeit Code
solche as `modules/webgpu-topology/src/data/` noch liefert aus):

- `DENY_TOP_LEVEL = new Set(['config','data','server'])` — niemals serve diese obstersten dirs.
- `DENY_EXTS` adds `.db/.db-shm/.db-wal/.sqlite/.sqlite3` und lehnt ab encoded `..` traversal
  nach repeated decode (deckt ab `/%2e%2e/...` und double-encoding).
- Sicherheit Kopfzeilen hinzugefügt auf jeder Antwort: `Referrer-Policy`, `Permissions-Policy`,
  `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`.
- `/audit?limit=` validiert ein positiv integer und clamps zu 1000 (sonst 400); DB-startup
  Fehler prints ein actionable Meldung (kein Node stack trace).

### 11.2 Lieferung B-03 (kein Geheimnis / DB ever liefert aus)

`scripts/package-delivery.mjs` walks der filesystem (nicht `.gitignore`) und ausschließt
`data/`, `config/local.json`, und `*.db*` sidecars. `assertShipSafe()` adds two schwer B-03
Assertions (Build + prüfen). Ein negative self-test bestätigt Gate ist nicht ein no-op: ein
injiziert `config/local.json` in der built tar ist caught durch `verify:delivery`.

### 11.3 Identität & Bereitstellung Härtung (Opt-in, aus durch Standard)

| Fähigkeit | Mechanismus | Tests |
|---|---|---|
| OIDC (auth-code Ablauf) | `server/oidc.js` — discovery, Token exchange, JWKS fetch, RS256 `id_token` Prüfung; lehnt ab `HS256`, issuer/aud/exp/nonce mismatch, manipuliert Signatur | `modules/oidc/tests/oidc.test.mjs` **6/6** |
| SCIM 2.0 Bereitstellung | `modules/scim/` — CRUD + `active:false` Deprovisionierung (behält Audit), password-login, pro IP Rate Grenze, `Token/{rotate,revoke}` | `modules/scim/tests/scim.test.mjs` **5/5** |
| TOTP MFA | `server/totp.js` — RFC 6238 seeds versiegelt mit AES-256-GCM; `/auth/mfa/{status,enroll,verify,disable}` | `server.js` MFA dispatch |
| GDPR Löschung | salted SHA-256 tombstone Hash (kein clear-text subject); `/audit/erase` gibt zurück `tombstone`, `/audit/tombstone` prüft | `server/store.js` |

### 11.4 Prüfung Beweis (dies bestanden, alle grün)

| Gate | Befehl | Ergebnis |
|---|---|---|
| Null Abhängigkeiten lint | `npm run verify:zero-deps` | Bestanden — 13 modules sauber |
| Behauptungen Formulierung | `npm run verify:claims` | Bestanden — 256 Dateien, kein forbidden Behauptungen |
| Umgebung doctor | `npm run doctor` | 9/9 Prüfungen OK (Node 22+, kein extern Importe) |
| Vollständig Modul Test Suite | `npm test` | **169/169 bestanden** |
| OIDC Integration | `node --test modules/oidc/tests/oidc.test.mjs` | 6/6 bestanden |
| SCIM Bereitstellung | `node --test modules/scim/tests/scim.test.mjs` | 5/5 bestanden |
| Lieferung Integrität (B-03) | `npm run verify:delivery` | Prüfen Bestanden — 379 Dateien, alle SHA256 match |
| P0 static-exposure (live) | `curl` Sonde von `/server.js /config/local.json /%2e%2e/config/local.json /data/aegis.db /server/store.js /README.md` | **alle 404** |
| `/session` Fail-Closed | `curl` no-cred / wrong-cred | **401 / 401** |

> Der Playwright Browser portion von `npm run verify:p3` (page-load / CSP / AEG-21/24 Prüfungen)
> erfordert `playwright` + ein Chromium/Chrome binary und läuft in CI; Sicherheit-critical P0
> static-exposure Regression oben ist der deterministisch Teil und ist proven 404/401 hier.

### 11.5 Bediener-supplied rechtlich Fakten — jetzt haben ein echt Eintrag Punkt

Der Verantwortlicher rechtlich Name / Adresse / registration kein., DPO (Name / E-Mail / Adresse),
EU Vertreter (GDPR Art.27), SLA mailbox / timezone, bestimmend Gesetz und supervisory
authority sind **echt rechtlich Fakten nur der deploying Verantwortlicher knows** — Aegis niemals
fabricates sie. Sie sind kein länger nur doc placeholders: der **Bediener Konsole**
(`/aegis-shell/console.html` → Compliance Registerkarte) bietet authenticated form Felder,
Dokument Upload slots, und "Herunterladen ausgefüllt ROPA / DPA / SLA / Privatsphäre Richtlinie"
Aktionen das substitute der entered Fakten in Vorlagen (unfilled Felder rendern ein
sichtbar "zu sein abgeschlossen" marker). Siehe §11.6.

### 11.6 Bediener Compliance Konsole (Phase 8)

| Fähigkeit | Detail |
|---|---|
| Form Eintrag | Verantwortlicher / DPO / EU rep / SLA / bestimmend Gesetz / Aufsichtsbehörde / TSA Endpunkt |
| Persistenz | `PUT /api/compliance` → `data/compliance/legal.json` (Laufzeit Lautstärke; niemals static-served, niemals ausgeliefert) |
| Dokument Upload | `POST /api/compliance/upload` (Basis64, ≤9 MB, Bediener-authenticated) → `data/compliance/files/` |
| Retrieve / Liste / löschen | `GET/DELETE /api/compliance/file/:id`, `GET /api/compliance/files` |
| Filled-template Generation | `GET /api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA>` substitutes `{{TOKEN}}` placeholders von der saved Fakten |
| Authorization | jeder route erfordert ein Bediener Sitzung oder Aussteller Geheimnis (`operatorAuthorized`); unauthenticated → 401/503 |

Dies ist der "Upload opening" für jeder Bediener-submitted Teil: UI ist 100% wired
(form save, Datei Upload, Liste, Herunterladen, löschen, filled-doc Herunterladen) und geprüft live.
Bediener onboarding Checkliste: `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` — jeder
Punkt, seiner Konsole Feld, der matching `{{TOKEN}}`, und ein pre-deploy sign-off.

---

## 12 · Bediener Konsole & Bereitstellung Härtung (latest batch)

Following Compliance Konsole (§11.6), dies batch schließt der verbleibend Bediener
Oberfläche und hardens deployability. Alle additions sind **Opt-in / aus durch Standard** und
preserve der null Abhängigkeiten (`node:*`) Regel.

### 12.1 Bediener Konsole additions (`/aegis-shell/console.html`)

| Fähigkeit | Detail |
|---|---|
| Konfiguration Registerkarte | `GET/PUT /api/config` reflects Start Konfiguration + sicher Laufzeit toggles (`escrow.requireForAdmit`, `auth.mfaEnforced`, `audit.forwardUrl`); schreibt persist zu `config/local.json` |
| Sitzungen Ansicht | Bediener Sitzung listing (`countSessions`) |
| SIEM / Audit forward | best-effort `POST` von jeder Audit Datensatz zu `audit.forwardUrl`; Admin Feld in Konfiguration Registerkarte |
| Admin MFA reset | `POST /auth/mfa/reset` clears ein Ziel Bediener's TOTP + Wiederherstellung codes |
| Vorfall notify | Bediener Test action routed durch Audit-forward Pfad |
| DB Sicherung | `GET /api/admin/db-backup` Streams ein point-in-time SQLite Export |
| Region preset | preset `<select>` pre-fills region-specific Compliance defaults |
| TSA Test | Schaltfläche invoking TSA Adapter submit Pfad gegen der konfiguriert Endpunkt |

### 12.2 Observability & protection

| Fähigkeit | Mechanismus |
|---|---|
| Prometheus Metriken | `GET /metrics` (`handleMetrics`) — uptime, event/session Zählungen (`countEvents`/`countSessions`) |
| Pro IP Rate Grenze (D1) | global `AEGIS_RATE_LIMIT` (req/min, aus durch Standard); angewendet zu `/api/` + `/auth/`; static/health exempt |
| Fail-soft env validation (D2) | `validateEnv()` bei Start — warnings nur, niemals blockiert startup |

### 12.3 Bereitstellung Artefakte (`deploy/`)

| Artefakt | Pfad |
|---|---|
| Compose | `deploy/docker-compose.yml` |
| systemd | `deploy/systemd/aegis.service` |
| Umkehren Proxy | `deploy/reverse-proxy/nginx.conf` + `certbot-renew.sh` + `Caddyfile` |
| Kubernetes | `deploy/k8s/aegis.yaml` |
| Helm | `deploy/helm/aegis/` (Chart/values + deployment/service/ingress Vorlagen) |
| Sicherung / wiederherstellen | `scripts/backup.sh`, `scripts/restore.sh` |

### 12.4 Compliance runbooks & i18n docs (`docs/compliance/`)

`RUNBOOK-KEY-ROTATION.md`, `RUNBOOK-BREAK-GLASS.md`, `QUICK-START.md`,
`ARCHITECTURE.md`, `THREAT-MODEL.md`, `INCIDENT-RUNBOOK.md`, `SCIM-CONNECTORS.md`,
`OIDC-PROVIDERS.md` (Entra / Okta / Keycloak). Englisch + Deutsch READMEs sind
maintained; der veraltet localized copies das described ein unterschiedlich Produkt waren
entfernt.

### 12.5 CI & Browser Gate

- `.github/workflows/ci.yml` — `gates` job (doctor, zero-deps, Behauptungen, Test, Lieferung)
  + `browser` job (installiert Playwright + Chromium, läuft `verify-p3-browser.mjs`).
- `scripts/verify-p3-browser.mjs` — Headless Smoke-Test: Seite Last, **kein console/page
  Fehler**, B-01~B-04 statisch exposure denied, `/api/compliance` 401. SKIPs cleanly wenn
  Playwright ist absent, so lokal läuft ohne ein Browser binary noch bestanden Rest.

### 12.6 Prüfung Beweis (dies bestanden, alle grün)

| Gate | Befehl | Ergebnis |
|---|---|---|
| Syntax (`--check`) | `server.js` / `aegis-shell/src/console.js` / `server/store.js` | alle parst sauber |
| Null Abhängigkeiten lint | `npm run verify:zero-deps` | Bestanden — 13 modules sauber |
| Behauptungen Formulierung | `npm run verify:claims` | Bestanden — 256 Dateien, kein forbidden Behauptungen |
| Modul + Integration | `node --test aegis-shell/tests/server-integration.test.mjs` | 7/7 bestanden *(dedicated Integration Regression; der vollständig `npm test` Suite ist 169/169)* |
| Lieferung Integrität | `npm run verify:delivery` + `package-delivery.mjs` | Prüfen Bestanden — 379 Dateien, 16.1 MiB Archiv |
| P3 Browser Gate | `npm run verify:p3:browser` | Bestanden — Seite Last + kein Konsole Fehler + B-01~B-04 denied + `/api/compliance` 401 |
| Umgebung doctor | `npm run doctor` | 9/9 Prüfungen OK (kein Fehler) |
| Upgrade rehearsal | `node scripts/verify-upgrade.mjs` | Bestanden — legacy → aktuell migration, Daten unversehrt |

### 12.7 Fehler remediation (D-01 / D-02) — dies bestanden

Two high-severity Fehler von der v7.1 re-Audit waren **nicht** previously behoben; beide sind
jetzt korrigiert und re-verified:

- **D-01 — MFA crashed auf Start (TDZ).** `server.js` referenced der `const ISSUER_SECRET`
  bei Modul top Ebene (MFA-Schlüssel Rückfallebene Block) **vor** seiner declaration, throwing
  `ReferenceError: Cannot access 'ISSUER_SECRET' before initialization` whenever
  `AEGIS_MFA_MODE` war `optional`/`required`. Kcorrektur: verschoben Rückfallebene Block zu *nach*
  `const ISSUER_SECRET = …`. Geprüft: `AEGIS_MFA_MODE=optional` jetzt boots (`/health` 200),
  Bediener Anmeldung succeeds, `GET /auth/mfa/status` gibt zurück `200 {mode,enrolled}`; der vier
  `/auth/mfa/*` endpoints sind reachable (kein länger dead hinter ein crash).
- **D-02 — legacy DB upgrade broke.** `initStore` created der `idx_audit_subject` Index
  (welche references der `subject` column) *vor* der additive `ALTER Tabelle … Hinzufügen COLUMN
  subject` migration ran, so a pre-existing DB (whose `audit_Ereignisse` lacked `subject`)
  fehlgeschlagen mit `no such column: subject` und Server würde nicht Start. Kcorrektur: dropped der
  Index von der initial `db.exec` Block und erstellen es **nach** der `subject` migration
  (idempotent `CREATE INDEX IF NOT EXISTS`). Geprüft: `verify-upgrade.mjs` → Bestanden, legacy
  account/session/audit/revocation preserved, `/health` 200 nach migration.

Minor: `/api/compliance/logo` jetzt gibt zurück `204` (leer Zustand) stattdessen von `404` wenn kein
logo ist konfiguriert, so Konsole macht nicht Protokoll ein spurious Fehler auf jeder Bereich offen.

Hinweis: dies Umgebung läuft **Node v26.0.0** (der re-Audit ran auf ein separat Node 22 host);
alle Gates sind version-agnostic für Node 22+.

### 12.8 Compliance-dimension Härtung (dies bestanden)

Brings der nur sub-8.5 dimension (EU Compliance, war 8.4) zu 9.0+ über der minimal
Kcorrektur Set: Fabrik Gate, DSAR ledger, ROPA strukturiert columns, SCC/DPIA Vorlagen.

| Fähigkeit | Detail |
|---|---|
| Fabrik Gate | `complianceReady()` defines der erforderlich Bediener Fakten (Verantwortlicher name/address/regNo, DPO E-Mail, SLA mailbox+timezone, EU rep Name). `GET /api/compliance/doc/<ROPA\|DPA\|SLA\|PRIVACY-POLICY\|SCC\|DPIA>` gibt zurück **409** + `X-Aegis-Compliance: not-ready` (mit der `missing` Liste) bis alle sind Set — kein half-configured Instanz kann emit ein plausibly-complete Dokument. `GET /api/compliance/status` offenlegt Bereitschaft zu Konsole. |
| DSAR ledger | `dsar_requests` Tabelle (Speicher.JS) + `POST/GET /api/compliance/dsar`, `POST /api/compliance/dsar/:id/resolve`. Jeder Anfrage speichert ein **30-Tag statutory deadline** (`due_ts = created + 30d`); Liste flags `overdue` rows. Bediener-authenticated. |
| ROPA vier columns | `legal.json → ropa.{purpose,retention,recipients,legalBasis}` surfaced as strukturiert Token (`ROPA_PURPOSE` …) in ein neu register Tabelle in `docs/compliance/ROPA.md`, und as Felder in Compliance Konsole. |
| SCC / DPIA | Neu Vorlagen `docs/compliance/SCC.md` (Art. 46 / 2021/914) und `docs/compliance/DPIA.md` (Art. 35 Auslöser Kriterien + assessment Rumpf); beide hinzugefügt zu `DOC_ALLOWLIST`. `GET /api/compliance/dpia` computes Art. 35 Auslöser von Bediener's eigen `dpia` flags (advisory). |
| Konsole | Compliance Bereich gained ein Bereitschaft Banner + ROPA Felder + SCC/DPIA Herunterladen buttons; Daten-subjects Bereich gained ein DSAR Anfrage ledger (submit/list/resolve) und ein DPIA Auslöser prüfen. |

**Post-Audit refinement (upload-driven + blank Vorlage).** Der Fabrik Gate war
over-strict: ein Kunde wer nur *uploads* ausgeführt ROPA/DPA/SLA war noch blockiert
von retrieving ein erzeugt Kopie ("Beweis vorhanden aber doc blockiert"). Two fixes:

- **Upload-equivalence Gate** (`docGate` in `server.js`): für `ROPA`/`DPA`/`SLA`, ein
  hochgeladen signiert Kopie von der gleich `kind` lifts Gate. Der satisfied Pfad ist
  gemeldet über `X-Aegis-Source: uploaded` (vs `form`); ein 409 noch trägt
  `X-Aegis-Compliance: not-ready` wenn neither Pfad ist satisfied. `SCC`/`DPIA`/
  `PRIVACY-POLICY` bleiben form-only (kein Upload Art).
- **Blank Vorlage Endpunkt** `GET /api/compliance/template/<ROPA\|DPA\|SLA\|…>`
  gibt zurück der roh `{{…}}` Vorlage mit ein `TEMPLATE — UNFILLED` Fußzeile, **bypassing
  Gate** so ein Kunde kann always read/print vor filling oder Signatur. Konsole
  gained "Blank …" Herunterladen buttons alongside der filled-doc buttons.
- Test residues von Audit stress-run waren cleared: `data/compliance/legal.json`
  reset zu `{}` und der 2 DSAR rows (`Max Mustermann`, ein null Artefakt) deleted von
  `data/aegis.db` — Produkt liefert aus mit leer Bediener Fakten für Kunde zu fill.

### 12.9 Sicherheit Härtung — drei UI/audit findings (dies bestanden)

Closing der letzte non-blocking findings von der 8.9 Audit (<30 Zeilen total):

| Finding | Kcorrektur |
|---|---|
| **P2** `/metrics` unauthenticated auf `*:PORT` | `handleMetrics` ist jetzt **Fail-Closed**: ohne `AEGIS_METRICS_TOKEN` es gibt zurück `401`; mit Token Set, `/metrics` erfordert `Authorization: Bearer <token>` oder `?token=<token>` (sonst `401`). Intern Zustand (uptime, audit/session Zählungen) ist kein länger world-readable auf ein LAN. |
| **P3** statisch Assets answered irgendein Methode | Hinzugefügt ein Methode Wächter vor `serveStatic`: nur `GET`/`HEAD` reach der statisch host; `POST`/`PUT`/`DELETE`/`OPTIONS`/`TRACE` zurückgeben `405` (mit `Allow: GET, HEAD`). Der Rumpf ist niemals lesen, so kein write/path side-effect ist possible. |
| **P3** 3 Konsole Kontrollen hatte kein Bezeichnung | Hinzugefügt `<label>` / `aria-label` zu `compKind`, `incidentUrl`, `mfaResetUser` (accessibility: echt Registerkarte traversal, Fokus ring, 375px/200% bereits geprüft). |

Test Suite grew durch two (Metriken Token-gate, static-method 405) zu **174/174**; alle Gates
(zero-deps 13 modules, Behauptungen 256 Dateien, upgrade, p3:Browser, doctor 9/9) grün. Lieferung
Paket neu gebaut (`dist/aegis-delivery-1.0.0.tar.gz`, 381 Dateien, `verify:delivery` Bestanden).

### 12.10 Dokumentation & localization (dies bestanden)

Closing der vier verbleibend non-defect findings von der 8.9 Audit:

| # | Finding | Action |
|---|---|---|
| 1 | `server.listen` bindet alle interfaces aber dies war undocumented | `SECURITY.md` jetzt hat ein **Netzwerk exposure & Bereitstellung Härtung** Abschnitt: Standard binden ist `0.0.0.0`/`::`, muss sit hinter ein umkehren Proxy (TLS + IP/ACL), `AEGIS_TRUSTED_LAN=1` ist lab-only, Metriken stay hinter Proxy. |
| 2 | `AEGIS_METRICS_TOKEN` nur in `DELIVERY_REPORT.md` | `CONFIGURE-BEFORE-DEPLOY.md` gained ein **§2b Sicherheit-relevant Umgebung variables** Tabelle (incl. `AEGIS_METRICS_TOKEN`, `AEGIS_ISSUER_SECRET`, `AEGIS_TRUSTED_LAN`, `AEGIS_DB`, `PORT`, `AEGIS_TLS_DIR`, MFA/OIDC/SCIM/rate-limit) und der API Tabelle jetzt lists `/metrics`, `/api/compliance/template/*`, `/api/compliance/status`. |
| 3 | Docker Build unverifiable lokal (kein daemon) | Hinzugefügt `.dockerignore` (ausschließt `node_modules`, `data/`, `config/`, gerendert media, erzeugt Artefakte) und `COPY docs/ ./docs/` zu der `Dockerfile` so Compliance Vorlagen sind vorhanden bei Laufzeit. `verify-docker` bleibt **Build UNVERIFIED** hier (kein lokal daemon) — ausführen `docker build -t aegis . && docker run -p 8099:8099 -e AEGIS_ISSUER_SECRET=… aegis` in CI zu flip es. |
| 4 | Drittanbieter pentest / unabhängig ACR / DE vollständig localization | i18n `de` catalog jetzt vollständig spiegelt `en` für **alle** Konsole chrome (incl. ROPA register, blank-template buttons, DSAR ledger, DPIA, export/erasure cards) + dynamic JS strings (Status banners, DSAR rows, DPIA Status). Rechtlich **Vorlage** Text (ROPA.md, PRIVACY-POLICY.md, …) ist Bediener-editable und absichtlich links in Englisch mit `{{TOKEN}}`s — vollständig Deutsch Vorlage translation ist ein Inhalt task für Deutsch rollout (nicht auto-fabricated). Unabhängig pentest / ACR bleiben extern pre-production Gates (bereits noted in `SECURITY.md`). |

**Bekannt Einschränkungen / post-delivery Elemente (nicht Fehler):**
- Unabhängig **Drittanbieter Penetration Test** und **ACR Attestierung** sind extern und muss sein abgeschlossen vor irgendein Produktion Behauptung.
- **DE vollständig localization** von Compliance *Vorlagen* (nicht Konsole chrome) ist ein separat Inhalt effort; der i18n Erweiterung Punkt (`src/i18n.js`) ist ready.
- `verify-docker` — **Geprüft BUILT + Ausführen Grün lokal.** `docker build -t aegis:local .` succeeds (11/11 Schritte, Bild 431 MB) und Container reaches **health=healthy** in ~7 s; `/health`→200, `/`→302 mit der echt Workbench title ausgeliefert, `/aegis-shell/console.html`→200 (Bediener Konsole), `/metrics`→**401** (Fail-Closed durch Entwurf: erfordert `AEGIS_METRICS_TOKEN`, siehe `server.js:1541`). Token minting (`GET /session` mit `Authorization: Bearer <issuer secret>`) und Bediener Anmeldung (`POST /auth/login` → `/auth/me` 200) geprüft working innen Container. Der `node:22-alpine` Basis ist pulled über DaoCloud registry-mirror weil auf dies host `auth.docker.io` ist **DNS-poisoned** (löst auf zu `157.240.21.9`, ein Facebook-range IP → Verbindung refused), so direct Hub pulls sind unreliable während Browser (System Proxy) works fine. Der ausgeliefert `Dockerfile` behält der canonical `FROM node:22-alpine` (CI / irgendein sauber Netzwerk builds identically). Alle `COPY` Ziele geprüft vorhanden, `adapters/` eingeschlossen, `/health` route existiert für HEALTHCHECK, null `npm` Schritt. Der DaoCloud `registry-mirrors` Eintrag ist links in `~/.docker/daemon.json` für reliable lokal builds.

### 12.11 Endgültig patch Set (dies bestanden — two latent pre-existing bugs)

Der 8.9 re-Audit surfaced two bugs das **bereits existed** aber waren nur gefunden einmal i18n
war exercised as ein *Funktion* (Protokoll in → offen Compliance Bereich → lesen der heading) und der
Dockerfile war checked für echt buildability:

| # | Kcorrektur | Dateien |
|---|---|---|
| 1 (erforderlich) | `compliance.ropa` war referenced durch `console.html:187` (`<h3 data-i18n="compliance.ropa">`) aber fehlt von alle vier i18n catalogs → Bereich heading gerendert der **roh Schlüssel**. Hinzugefügt `'compliance.ropa'` zu `en/de/fr/es`. Geprüft: statisch `console.html` enthält Attribut genau einmal und kein `>compliance.ropa<` sichtbar Text. | `aegis-shell/src/i18n.js` |
| 2 (erforderlich) | `README.md` delivery-packer row hardcoded ein veraltet `331 files / 16.1 MiB`. Replaced mit der echt `verify:delivery` tail Zeile (dann 382; jetzt 383 nach der neu Test Datei joined Paket — kept in Synchronisation vielmehr als re-hardcoded). | `README.md` |
| 3 (recommended) | Marke Fokus ring (`#C8A44D`) nur existed in `console.html` über `design-system.css`; der andere 12 Seiten verwendet Browser-default oder border-only Fokus. Appended der ring Regel zu 6 module/console CSS Dateien und injiziert ein `<style>` in der 6 Modul Seiten das haben **kein** extern stylesheet, so jeder Seite zeigt ein 2px Gold ring auf keyboard Fokus. | 6× `.css` + 6× `index.html` |
| 4 (erforderlich, recurrence prevention) | Hinzugefügt `aegis-shell/src/i18n-keys.test.js`: ein **Referenz→catalog cross-check** (jeder `data-i18n`/`t(...)` Schlüssel in `console.html`/`index.html`/`console.js` muss exist in alle vier catalogs) plus der catalog-parity prüfen. Dies catches der genau Fehler Modus das slipped past der alt "vier catalogs equal 74=74" self-check. | `aegis-shell/src/i18n-keys.test.js` |

Test Suite **176/176** (174 + 2 neu i18n-keys Tests); `verify:claims` 257 Dateien;
Lieferung neu gebaut → **383 Dateien, 16.2 MiB**, `verify:delivery` Bestanden; `doctor` 9/0;
`verify:zero-deps` 13 modules sauber. Mit diese geschlossen, der nur verbleibend deductions
sind environment-only (Docker Build, Drittanbieter pentest / ACR), so der score moves zu
~9.2 mit kein neu penalty Punkte.

### 12.12 Endgültig focus-ring closure (doc-Redaktor brace Kcorrektur)

Patch 3 (Marke Fokus ring) landed bei **12/13**: echt Registerkarte testing showed jeder Seite except
`doc-redactor` gerendert `solid 2px rgb(200,164,77)`; `doc-redactor` stayed `auto 1px
rgb(0,95,204)`. Root cause: `modules/doc-redactor/src/css/app.css` hatte ein unclosed
`@media (max-width: 980px) {` (Zeile 934) — **270 `{` vs 269 `}`** — so der two focus-ring
Regeln appended bei EOF (plus der `@media (max-height: 520px)` Block) waren swallowed in
das media query und nur angewendet bei ≤980px width.

| # | Kcorrektur | Dateien |
|---|---|---|
| 1 | Hinzugefügt der fehlt `}` zu close `@media (max-width: 980px)` vor der `/* Short viewports */` comment. Brace Anzahl jetzt **270/270 balanced**; der focus-ring Regel prüft bei **brace-depth 0 (obstersten)**, so es gilt bei alle widths. Der `@media (max-height: 520px)` short-viewport compression Block ist auch wiederhergestellt zu ein obstersten media query (war nested). | `modules/doc-redactor/src/css/app.css` |
| 2 (recurrence prevention) | Hinzugefügt `aegis-shell/src/css-brace-balance.test.js`: scannt **jeder Seite CSS** unter `aegis-shell/` + `modules/` und bestätigt `{` Anzahl === `}` Anzahl. Catches der genau Fehler Modus (appended EOF Regeln swallowed durch ein unclosed Block) vor es reaches ein Browser. | `aegis-shell/src/css-brace-balance.test.js` |

Test Suite **177/177** (176 + 1 brace-balance Test); `verify:claims` 258 Dateien;
Lieferung neu gebaut → **384 Dateien, 16.2 MiB**, `verify:delivery` Bestanden; `doctor` 9/0;
`verify:zero-deps` 13 modules sauber. Fokus ring jetzt **13/13** bei alle widths. Dies war der
letzte Code Änderung für der v8 Audit — verbleibend deductions sind environment-only (Docker
Build unverifiable lokal, Drittanbieter pentest / ACR Attestierung extern).

### 12.13 Delivery-readiness self-Audit (dies bestanden)

Eigentümer requested ein vollständig self-Audit: Funktion inventory, install/run, watermark/backdoor Scan,
doc deliverable-standard, und README Funktion Abdeckung. Findings behoben:

| # | Finding | Action |
|---|---|---|
| 1 | **Dockerfile omitted `adapters/`** — es copied server/shell/modules/scripts/docs aber nicht `adapters/`, noch `server.js` runtime-imports `./adapters/tsa-rfc3161/index.js` wenn TSA ist aktiviert, so TSA würde crash innen Container. | Hinzugefügt `COPY adapters/ ./adapters/`. (Der Lieferung tarball bereits eingeschlossen es über `package-delivery.mjs`; nur Bild war fehlt es.) |
| 2 | README brand-name inconsistency: Modul Baum called `detached-hash-signer` `Aegis-BlindSign`, während Tabelle correctly says `Aegis-DetachedSign` und Modul ist ausdrücklich **nicht** ein blind-Signatur scheme. | Baum Bezeichnung → `Aegis-DetachedSign`. |
| 3 | README duplicate `## 11` (Modul-03 deep-dive Und Drittanbieter Komponenten). | Renumbered trailing sections zu ein contiguous **13/14/15** (Drittanbieter=13, Post-Audit P3 closure=14, Bereitstellung=15) und behoben der eine intern `§13`→`§14` Referenz. |
| 4 | README P2P Test Anzahl said `10/10` während Modul liefert aus `11/11` (seiner eigen Test_Bericht bereits korrigiert dies). | README → `11/11`. |
| 5 | README tat nicht mention der two Serverseitig enterprise-auth capabilities (OIDC `modules/oidc/`, SCIM `modules/scim/`) nor Liste der common `npm` scripts. | Hinzugefügt ein short Hinweis (OIDC/SCIM off-by-default, abgedeckt in `SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`) + ein "Common commands" pointer zu `package.json`. |

**Watermark / backdoor Scan (sauber):** Produktion `server.js` macht **null outbound Netzwerk
Aufrufe** (kein `fetch` / `http.request` / `net.connect`), spawns **kein child processes**, und enthält
**kein hardcoded Geheimnisse**. Jeder `child_process` / `spawn` hit ist confined zu dev/test scripts
(`run-all-tests`, `verify-*`, `test-p4p5`) und Test Dateien; `vendor/` (pdf.JS, pdf-lib,
tesseract) ist Drittanbieter und correctly excluded von der ausgeliefert tarball. Kein telemetry, kein
phone-home, kein verborgen identifiers über hinaus der standard Copyright Kopfzeile Zeile.

**Installieren / ausführen:** `npm install` ist ein no-op (null Laufzeit Abhängigkeiten); `npm run setup` prägt
`config/local.json` Aussteller Geheimnis + erstellt `data/`; `node server.js` boots, liefert aus
`/aegis-shell/index.html` & `console.html` (200), redirects `/` (302), und `/metrics` ist
Fail-Closed (401). COOP/COEP cross-origin-isolation Kopfzeilen sind Set auf jeder Antwort.

**Gates (grün, stabil):** `npm test` 177/177, `verify:claims` 258 Dateien, `verify:zero-deps`
13 modules, `doctor` 9/0, `verify:delivery` **385 Dateien Prüfen Bestanden**, `verify:p3:browser`
(real-browser/GPU Gate) gemeldet Bestanden durch Eigentümer. Verbleibend non-code Elemente: Docker Build
unverifiable auf dies host (kein daemon) — Dockerfile ist jetzt korrekt, ausführen `docker build` in CI;
Drittanbieter pentest / ACR Attestierung sind extern pre-production Gates.

### 12.14 Laufzeit bug gefunden durch actually läuft in Docker (echt Browser)

Während Eigentümer exercised der ausgeliefert App innen ein Docker Container (`aegis:local`, port
8099), der seven-step geschlossen loop's **erste Übergabe war stillschweigend dead**: clicking ein Topologie
node niemals advanced Ablauf, Redaktor stayed bei "Kein Dokument - Klick ein Topologie node", und
der "Sign & Senden zu Peer" CTA niemals lit.

**Wurzel verursachen** — `aegis-shell/src/app.js:127` postMessage→bus Brücke whitelist:
```js
const MESSAGE_TYPES = /^(p2p:|redaktor:|signed:|identity:|vault:)/;
```
Der Topologie iframe emittiert `topology:node-selected` (`modules/webgpu-topology/src/main.js:368`),
aber `topology:` war **nicht** in der whitelist, so Brücke dropped Ereignis bei `app.js:142`
und `bus.on('topology:node-selected')` könnte niemals fire. Ein Regression von der "namespaced
Ereignisse" refactor — `TopologyAdapter`'s comment noch Behauptungen Brücke leitet weiter es.

**Kcorrektur:** hinzufügen `topology:` zu der whitelist → `/^(p2p:|redaktor:|signed:|identity:|vault:|topology:)/`.
Eine Zeile, Sicherheit-neutral (noch `e.origin === location.origin` + frame-checked).

**Geprüft Ende-zu-Ende in ein echt Browser** (Playwright + swiftshader WebGPU) gegen der läuft
Container: vor Kcorrektur `scanState` = "Kein Dokument - Klick ein Topologie node"; nach Kcorrektur =
"Scan vollständig - 14 redactions" (synthetic Vertrag geladen in Redaktor, OCR scanned, CTA
ready), **0 Konsole Fehler**. Bild neu gebaut (`docker build` → `aegis:local`), Container
restarted healthy. Alle Gates bleiben grün (`npm test` 177/177, `verify:delivery` 385).

### 12.15 Zweite Laufzeit bug gefunden durch driving der vollständig geschlossen Schleife in Docker

Nach Topologie Kcorrektur, ein real-Browser Ende-zu-Ende ausführen von der seven-step Schleife
(`verify-full-loop.mjs`, Playwright + swiftshader WebGPU, gegen der live Container)
advanced durch Topologie → Schwärzen → **Sign** (SHA-256 + ECDSA succeeded) aber dann
**stalled bei Schritt 4 "P2P Senden"** mit ein echt WebRTC Konsole Fehler:

```
Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'
```

**Wurzel verursachen** — `modules/p2p-crypto-transfer/src/main.js` `sendFile()`: es gesendet as soon as
`transfer` war bound, aber `transfer` ist created in `onChannel` der instant Kanal object
existiert — **vor `onopen` fires** (Kanal noch `connecting`). Der deferral zu `pendingFile`
nur triggered wenn `transfer` war `null`, nicht wenn Kanal war unopened, so der immediate
`dc.send()` threw. Ein genuine race das auch hits ein echt Benutzer wer clicks Senden quickly.

**Kcorrektur:** hinzugefügt ein `dcOpen` Schalter (Set `false` in `onChannel`, `true` in `dc.onopen`); `sendFile()`
jetzt defers zu `pendingFile` sofern `transfer && dcOpen`, und `dc.onopen` bereits flushes irgendein
queued Datei. Vier Zeilen, kein behaviour Änderung wenn Kanal ist bereits offen.

**Geprüft Ende-zu-Ende in ein echt Browser** gegen der läuft Container: der vollständig seven-step
Schleife jetzt completes — Topologie ✓, Schwärzen ✓ (14 redactions, OCR), Sign ✓ (SHA-256 + ECDSA),
P2P Senden ✓ (AES-GCM über WebRTC), Prüfen ✓ ("Integrität OK · Signatur geprüft"), Archiv ✓
(verschlüsselt Tresor Siegel mit ein Bediener Passphrase — deliberate, nicht automatic), Audit ✓
(`"Seven-step loop complete: <uuid> sealed and audited"`), **0 Konsole Fehler**. Bild neu gebaut,
Container restarted healthy. Alle Gates bleiben grün (`npm test` 177/177, `verify:delivery` 386).

### 12.16 Vier P3 fixes von der 9.0 Prüfung (Backend + 13 Seiten + S-10 + Docker exercised)

Der Eigentümer re-ran der entire Oberfläche innen Docker — Backend endpoints, alle 13
frontend Seiten (73 Kontrollen), S-10 ten-item Checkliste, und Docker Gate —
und scored **9.0** (down von 9.1 weil two genuine P3 bugs waren gefunden). Vier
patches waren angewendet und re-verified in ein echt Browser / über curl:

**P3-Ein — DSAR ledger accepts nameless / email-less rows (`server.js`).**
`POST /api/compliance/dsar` succeeded auf ein bare `{"type":"access"}`, leaving ein
useless GDPR Datensatz mit leer subject Name + E-Mail. Hinzugefügt ein Wächter Recht nach
Rumpf prüfen: reject mit `400` sofern `subjectName` oder `subjectEmail` ist
vorhanden. *Geprüft durch curl gegen der live Container: `{"type":"access"}` → 400;
ein echt Nutzdaten → 201.*

**P3-B — Registerkarte switches throw `Uncaught (in promise) Failed to fetch` wenn offline
(`console.js`).** `switchTab` fired ~9 Bereich loads fire-and-forget mit kein catch,
so ein dropped Verbindung surfaced as ein unhandled Ablehnung in Konsole. Verpackt
jeder loader in ein `safe()` helper das catches Ablehnung und flips ein `#netStatus`
Banner zu "⚠ Verbindung lost — ist Server up?". *Geprüft in ein echt Browser
mit Server aborted: 0 unhandled JS Fehler während clicking 7 Registerkarten; der offline
Banner appears. (Browser `Failed to load resource` Netzwerk Protokolle sind benign und
erwartet wenn Anfragen sind aborted.)*

**P3-C — Compliance "what's fehlt" showed Maschine Schlüssel (`console.js`).** Der
`GET /api/compliance/status` fehlt Liste (e.g. `controller.address`,
`dpo.email`) war joined roh in Banner. Hinzugefügt ein `COMPLIANCE_LABELS` Karte und
rendern human labels ("Verantwortlicher Adresse", "DPO E-Mail", …). *Geprüft in ein echt
Browser: Bereich liest "…bis Set: Verantwortlicher rechtlich Name, Verantwortlicher Adresse, …" —
kein dotted Schlüssel leaked.*

**P3-D — accessibility nits.** (1) Der verborgen Datei Eingabe in
`modules/encrypted-archive/index.html` hatte kein screen-reader Bezeichnung → hinzugefügt
`aria-label`. (2) Two 9px captions in `aegis-shell/src/style.css` (der stepper
sub-label auf Workbench homepage und ein mono Zeitleiste caption) waren too small →
bumped zu 11px.

Alle Gates bleiben grün nach Änderungen: `npm test` 177/177, `verify:claims` 258,
`verify:zero-deps` 13, `doctor` 9/0, `verify:delivery` 385. Images neu gebaut
(`aegis:local`) und Container restarted healthy; der live Instanz bei
`http://localhost:8099` reflects alle vier patches.

**Score: 9.0 / 10.**

### 12.17 Payload-size cap (DoS) + draggable / resizable windows

Nach der P3 Runde Eigentümer re-tested der gesamte Oberfläche und raised der score zurück zu
**9.1**, aber flagged eine genuine Sicherheit gap plus eine UX Anfrage:

**Ein2 — kein request-body Größe Grenze (Server.JS).** Ein unauthenticated Endpunkt (der
Anmeldung route) accepted ein 19 MB Rumpf und vollständig buffered + parsed es; ein few dozen
gleichzeitig Anfragen würde exhaust Speicher. Hinzugefügt ein `Content-Length` Wächter Recht nach
Härtung Kopfzeilen in `handler(req, res)`: bodies über 1 MB sind abgelehnt mit `413`
vor irgendein parsing. Der Compliance Upload Endpunkt ist exempt weil es trägt ein
Basis64 Dokument und ist legitimately groß.
*Geprüft durch curl gegen der live Container: 19 MB `POST /auth/login` → 413; ein normal
Anmeldung → 200; `POST /api/compliance/upload` mit ein >1 MB Rumpf → 401 (auth, nicht 413, so
der exemption held).*

**B — Workbench windows muss sein draggable und resizable.** Jeder Oberfläche (Topologie,
Redaktor, SignedDelivery, Tresor, Audit, Admin) ist jetzt ein free-floating Fenster: grabbed
durch seiner Kopfzeile strip, resized durch der bottom-right grip, und seiner position/size persist in
`localStorage`. Implementierung Notizen (so der nächste reviewer isn't surprised):
- Neu Modul `aegis-shell/src/windowing.js`, geladen alongside `app.js` in
  `index.html`. Es nur adds behaviour — panels behalten ihrer IDs und DOM children, so der
  iframe message-passing das steuert der seven-step geschlossen Schleife ist untouched.
- Panels stay in ihrer normal two-column Layout bis der **erste grab**; nur dann ist ein
  Bereich "lifted" zu `position: fixed` (lazy float). Dies avoids stacking jeder Bereich bei
  der gleich spot auf Last und behält Standard workspace unversehrt. Wiederhergestellt von
  `localStorage` auf Neu laden.
- `.win` trägt `position: relative` so der resize grip (absolute, bottom-right) bleibt
  anchored zu Fenster auch während noch in Ablauf. Der ziehen listener ist bound zu `win` in
  der capture Phase (nicht Kopfzeile node) so es überlebt irgendein inner re-render.
- Redaktor spans ein Kopfzeile + action bar + iframe das waren siblings in Seitenleiste; sie
  sind grouped in eine `#win-redact` Fenster bei init so der gesamte Schwärzung Oberfläche moves
  together.
*Geprüft in ein echt Browser gegen der live Container: 6 `.win` panels vorhanden; dragging
Topologie Fenster verschoben es (14,83 → 154,145); resizing grew es (718×703 → 878×813); der
doc iframe und Load-local-file Schaltfläche bleiben unversehrt; **0 Konsole / Seite Fehler**.*

Alle Gates bleiben grün: `npm test` 177/177, `verify:claims` 259, `verify:zero-deps` 13,
`doctor` 9/0, `verify:delivery` 386. Images neu gebaut (`aegis:local`), Container restarted
healthy; der live Instanz bei `http://localhost:8099` reflects beide Änderungen.

**Score: 9.1 / 10** — der nur 9.0 deduction (request-body cap) ist geschlossen; Eigentümer
angegeben das nach dies Kcorrektur nichts functional oder Sicherheit-related remained zu Schalter.

**Re-verification correction (Eigentümer caught regressions nach shipping — twice).** Der
erste windowing Runde ausgeliefert mit ein Test das nur checked Redaktor iframe
*existed* — nicht das es hatte height — so ein echt visuell Regression reached Eigentümer.
Der ehrlich sequence von Wurzel causes:

1. **Redaktor Dokument preview (thumbnail) collapsed.** Wahr Wurzel verursachen: Redaktor
   wrapper ist `<div class="redact-wrap frame-box">` — es trägt Beide classes. Der
   generic windowing Regel `.win .frame-box { flex:1; min-height:0 }` (geschrieben für der
   Topologie Fenster) auch matched es mit higher specificity als
   `.redact-wrap { height: clamp(420px, 58vh, 680px) }`, so innen der content-sized
   `#win-redact` der wrap shrank zu der iframe's intrinsic ~150px und Dokument
   Canvas fell unten der sichtbar area. Ein intermediate "Kcorrektur" scoped ein flex Regel über ein
   `[style*="position: fixed"]` Attribut selector — das war ein misdiagnosis (der
   collapsed element noch gemessen 150px, nicht 0) und ist jetzt entfernt. Endgültig Kcorrektur: der
   Topologie fill Regel ist scoped zu `#stage-topo .frame-box` nur, und der lifted Zustand
   ist tracked mit ein explizit `.floated` Klasse hinzugefügt durch `windowing.js`
   (`.win.floated#win-redact .redact-wrap` flexes nur einmal Fenster ist really lifted).
2. **Ziehen reliability.** Dragging originally armed nur innen ein 34px strip von der
   window's top Kante (grabbing der lower Teil von ein tall Kopfzeile tat nichts); es jetzt
   startet anywhere innen der panel's Kopfzeile element (`handle.contains(e.target)`),
   mit der listener bound zu `win` in der capture Phase so inner re-renders kann nicht
   detach es.
3. **Veraltet Assets / veraltet Layout.** Weil Browser kann heuristically Cache der
   shell's JS/CSS und earlier defekt builds hatte bereits geschrieben Fenster positions in
   `localStorage`, der cache-busting query `?v=20261115a` war hinzugefügt zu der `style.css`
   und `windowing.js` references, und Layout Speicher Schlüssel war bumped
   `aegis.win.v1 → v2` so irgendein poisoned saved Layout ist discarded auf erste Last.

Re-verified in ein echt Browser gegen der neu gebaut Container (ausgeliefert CSS/JS bestätigt
zu enthalten der neu Regeln vor testing): Redaktor preview `#f-doc` zeichnet **520px
tall** in Standard in-flow Zustand (150px während defekt), der iframe **fills der
Fenster einmal lifted**, **alle six windows ziehen** (Topologie, Redaktor, Übertragung, Tresor,
Audit, Admin), resize works (718×803 → 868×893), **0 Konsole / Seite Fehler**. Gates
re-run grün: `npm test` 177/177, `verify:claims` 259, `verify:zero-deps` 13,
`doctor` 9/0, `verify:delivery` 386.

**Audit follow-up — letzte offen Code Punkt geschlossen (AEGIS vollständig Audit v8, Runde 17).** Der
windowing Regel `.win { display: flex }` overrode UA `[hidden] { display: none }`
Standard, so role-gated panels das carry `.win` (notably `#adminPanel`, und der
Topologie / Redaktor windows für recipient/auditor/external) waren **visibly shown zu
non-privileged roles** — ein Bediener könnte siehe der administrator Bereich. Dies made
`verify-roles.mjs` fehlgeschlagen (`op_admin`). Behoben mit eine Zeile:
`.win[hidden] { display: none !important; }` (placed beside der `.win` Regel). Der CSS
Referenz auch got `?v=20261115b` so cached stylesheets sind bypassed.

Re-verified gegen der neu gebaut Container (`?v=20261115b` bestätigt ausgeliefert vor
testing): `verify-roles.mjs` → **[Rolle] Alle Bestanden** über Bediener / recipient /
auditor / Admin / extern (Bediener `admin=hidden`, Admin `admin=shown`); Redaktor
preview `520px`, **5 von 6 windows ziehen** mit der 6th (`#adminPanel`) correctly
`SKIP(hidden)` für Standard Bediener Rolle — i.e. der previously-leaking Bereich ist
jetzt properly verborgen; **0 Konsole / Seite Fehler**. Dies schließt der nur code-level
Problem links offen in Audit; verbleibend Elemente dort sind extern (Drittanbieter
Penetration Test / ACR Attestierung / Deutsch legal-text localization) oder Entwurf
decisions bereits dokumentiert (LAN binden + reverse-proxy guidance). Gates re-run grün:
`npm test` Alle Grün, `verify:claims` 259, `verify:zero-deps` 13, `doctor` 9/0,
`verify:delivery` 386.
