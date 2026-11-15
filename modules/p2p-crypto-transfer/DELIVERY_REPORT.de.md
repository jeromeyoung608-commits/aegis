<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Lieferung Bericht — P2P Verschlüsselt Übertragung (Geek Task #3)

**Projekt**: `p2p-crypto-transfer`
**Datum**: 2026-11-09
**Author**: CodeBuddy (engineering Audit + Build)
**Constraint Compliance**: 100% nativ Browser + Node built-ins, **null Drittanbieter Laufzeit oder dev Abhängigkeiten**.

---

## 1 · Ziel recap

Build ein minimal, null Abhängigkeiten P2P verschlüsselt file-transfer tool für LAN / no-USB,
no-cloud-drive Szenario. Schwer requirements:

1. P2P Transport über **WebRTC DataChannel**.
2. **Nativ Web Kryptografie AES-GCM** Verschlüsselung angewendet zu **jeder Block** vor Übertragung.
3. Ein hand-written **backpressure** Mechanismus based auf `bufferedAmount` (kein Speicher blow-up
   wenn Empfänger ist slow).
4. Ein minimal **Signalisierung Server** ist allowed, Oder ein offentlich STUN, Oder ein same-machine
   **BroadcastChannel** Demo.
5. **Null Abhängigkeit**; strukturiert, modular Dateien; detailed README + dies Lieferung Bericht.

---

## 2 · Was war zugestellt

| Datei | Verantwortung |
|------|----------------|
| `index.html` | Minimal UI: Modus select, Raum, geteilt Schlüssel, send/receive progress, Protokoll. |
| `server.js` | Zero-dep Node Signalisierung + statisch Server. HTTP long-poll Relay; optional HTTPS wenn `key.pem`/`cert.pem` vorhanden. |
| `package.json` | Kein Abhängigkeiten; `start` und `test` scripts. |
| `src/crypto.js` | Web Kryptografie: PBKDF2 Schlüssel derivation (Passphrase + Zufall Salt) + AES-GCM per-chunk encrypt/decrypt. |
| `src/signalers.js` | Pluggable Signalisierung: `HttpSignaler` (Server Relay) und `BroadcastSignaler` (Server-less same-machine). |
| `src/p2p.js` | WebRTC orchestration: Offer/Answer, ICE (non-trickle, ICE-gather-complete vor senden), STUN für NAT. |
| `src/transfer.js` | Streaming Block + verschlüsseln + senden mit `bufferedAmount` backpressure; erhalten + entschlüsseln Streams gerade zu Datenträger über `createSink` (1 GiB-capped im Arbeitsspeicher `Blob` Rückfallebene). |
| `src/main.js` | UI orchestration nur (kein Geschäft Logik). |
| `tests/crypto.test.mjs` + `tests/sink.test.mjs` | Zero-dep Einheit Tests (node --Test, 11/11): Kryptografie (Hin- und Rückweg, wrong-Schlüssel Ablehnung, Manipulation Ablehnung, Salt Hin- und Rückweg, Peer interop, Schlüssel-derivation) + sink (OOM-fix streaming-to-disk Logik). |
| `README.md` / `DELIVERY_REPORT.md` | Dokumentation + dies Bericht. |

---

## 3 · Geek-challenge Checkliste (alle erfüllt)

### 3.1 P2P Penetration (WebRTC)
- ✅ Verbindung built auf `RTCPeerConnection` + `RTCDataChannel` (`src/p2p.js`).
- ✅ Two Signalisierung Optionen ausgeliefert: ein **minimal zero-dep Signalisierung Server** (`server.js`,
  HTTP long-poll, relays nur SDP/ICE) **und** ein **Server-less BroadcastChannel** Modus für
  same-machine Demo — genau der alternatives der brief allowed.
- ✅ Offentlich kostenlos **STUN** (`stun:stun.l.google.com:19302`) für NAT reflexive candidates;
  verwendet nur für ICE, niemals sieht Datei bytes/keys.
- ✅ Non-trickle ICE: wir warten für `iceGatheringState === 'complete'` vor sending SDP
  so Server Logik bleibt trivial (relays genau two Nachrichten).

### 3.2 Verschlüsselung & chunking (Web Kryptografie AES-GCM)
- ✅ `File.stream()` ist lesen über `getReader()` und sliced in **16 KiB chunks**.
- ✅ Jeder Block ist verschlüsselt mit **AES-GCM (256-bit, 128-bit Tag) und ein frisch Zufall 12-Byte IV**
  (`src/crypto.js` `encryptChunk`). Der Schlüssel ist abgeleitet von der geteilt Passphrase + ein Zufall
  Salt über **PBKDF2 (120,000 iterations, SHA-256)**.
- ✅ Wire framing pro Block: `[uint32 seq | 12-byte IV | ciphertext]`. Sequence numbers machen
  out-of-order arrival sicher auch though DataChannel ist reliable+ordered.
- ✅ Der Salt ist offentlich (gesendet in der JSON `meta` Meldung); Passphrase ist **niemals transmitted**.
  Ein kompromittiert Signalisierung Server daher kann nicht entschlüsseln anything.

### 3.3 Backpressure (bufferedAmount)
- ✅ Hand-written Ablauf control in `src/transfer.js` `sendFile`:
  - `HIGH_WATER = 16 MiB`: wenn `dc.bufferedAmount` exceeds es, Absender **stops reading**
    von Datei stream und `await`s der `bufferedamountlow` Ereignis.
  - `LOW_WATER = 1 MiB`: `dc.bufferedAmountLowThreshold` Set zu dies; der `bufferedamountlow`
    Ereignis resumes sending.
  - Ergebnis: Absender niemals overwhelms Kanal oder exhausts RAM auch wenn Empfänger ist slow.
- ✅ UI surfaces der backpressure Zustand über ein Protokoll Zeile ("Empfänger ist slow — backpressure engaged").

### 3.4 Null Abhängigkeit
- ✅ `package.json` hat leer `dependencies`.
- ✅ `server.js` verwendet nur `node:http`, `node:https`, `node:fs`, `node:path`, `node:url`.
- ✅ Browser Code verwendet nur WebRTC + Web Kryptografie (Plattform APIs, nicht libraries).
- ✅ Tests ausführen auf `node --test` mit kein installed packages (`npm test` → 11/11 bestanden: Kryptografie + sink).

---

## 4 · Prüfung durchgeführt

- `node --test` → **11/11 bestanden**: Kryptografie Tests (Hin- und Rückweg, wrong-Schlüssel Ablehnung, Manipulation Ablehnung, Salt Hin- und Rückweg, Peer interop, Schlüssel-derivation) + sink Tests (OOM-fix streaming-to-disk Logik).
- `node --check` auf jeder `.js` Datei → alle parst cleanly (kein syntax Fehler).
- Statisch Prüfung von Sicherheit Modell: bestätigt Signalisierung Server relays opak SDP/ICE nur;
  Datei Bytes + Schlüssel Material niemals leave Browser; wrong-key/tampered chunks fehlgeschlagen GCM auth.

> Hinweis: live WebRTC Ende-zu-Ende Übertragung erfordert ein secure-context Browser (HTTPS oder localhost)
> und war validated durch Code Prüfung + unit-tested Kryptografie. Ein Handbuch Zwei-Tab/ two-machine ausführen ist
> recommended as der endgültig Smoke-Test Test (Schritte in README §3).

---

## 5 · Bekannt Einschränkungen (ehrlich disclosure)
- Sequential Übertragungen nur (eine Datei pro Kanal bei ein Zeit); gleichzeitig bidirectional Metadaten
  Isolation ist nicht implementiert aber ist ein easy Erweiterung (siehe README §5).
- **Empfänger Out-of-Memory — Behoben (war der "Speicher hog" bug)**: Empfänger verwendet zu Puffer jeder
  Block in ein array und assemble ein `Blob` bei Ende — ein 4 GB Datei würde Out-of-Memory Registerkarte. Es jetzt
  öffnet ein sink auf der erste entschlüsselt Block und Streams gerade zu Datenträger
  (`src/transfer.js` `createSink`): Chromium verwendet `showSaveFilePicker()` →
  `FileSystemWritableFileStream` (unbounded, kein reassembly Puffer); alle andere browsers fall
  zurück zu ein im Arbeitsspeicher `Blob **capped at 1 GiB**` das wirft ein crisp, actionable Fehler oben
  der cap stattdessen von crashing. Der eine caveat — `showSaveFilePicker` benötigt ein Benutzer gesture — ist
  behandelt durch ein "💾 Wählen save Ort" Schaltfläche das pre-locks der writer vor Peer
  sendet. Siehe README §6 für der vollständig Risiko Hinweis.
- Offentlich STUN nur; symmetric NAT würde brauchen ein TURN Server (außer von zero-dep Umfang).
- Signalisierung Server ist im Arbeitsspeicher, single-process, unauthenticated — suitable für intranet/demo;
  Produktion benötigt Raum auth + scaling.

---

## 6 · Suggested nächste Schritte (optional)
1. Multi-file / Ordner batch mit per-file `meta`.
2. Resume Fähigkeit über `resumeFrom` offset in `meta`.
3. Raum authentication + ephemeral Token auf Signalisierung Server.
4. WASM-accelerated Block Hash-Bildung für very hoch throughput.
