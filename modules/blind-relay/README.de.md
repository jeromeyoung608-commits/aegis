<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# blind-Relay — Serverblind Chiffretext Relay

> **Terminology**: "blind" beschreibt Transport blindness (Relay leitet weiter
> Chiffretext es kann nicht lesen), nicht ein blind-Signatur scheme und nicht ein
> Zero-Knowledge Nachweis. Siehe `docs/CLAIMS-WORDING.md`.

> Serverblind WebSocket Relay für cross-device Synchronisation. Der Server routes verschlüsselt packets und niemals sieht Canvas Zustand.

---

### 1. Was es löst
Multi-device Synchronisation benötigt ein Relay, aber viele Clients fear WebSockets weil sie worry Server wird capture Daten. Dies Modul ist ein **null Abhängigkeiten** Relay: es nur führt durch WebSocket handshake und leitet weiter **verschlüsselt envelopes** durch Raum — es niemals entschlüsselt und niemals sieht Canvas Zustand oder Dokument Inhalt. Paired mit Token-gate für Zulassung und blind-relay/client für Ende-zu-Ende Umschlag Kryptografie.

### 2. Wer kauft dies
B2B needing cross-device Zusammenarbeit mit ein "Serverblind" Anforderung: regulated industries, cross-institution Mitzeichnung, irgendein "Relay kann nicht sein trusted" Compliance Szenario.

### 3. Ausführen in 60 Sekunden
```bash
cd modules/blind-relay
node --test                                   # 5 assertions, all green
node src/relay.js --port 8081                 # start the zero-dependency blind relay
# browser demo (shows the server only sees ciphertext): python3 -m http.server 8080
```
Optional Token-gated Zulassung:
```bash
AEGIS_ROOT_PUB=<base64url-SPKI> node src/relay.js --port 8081
```

### 4. Integration Vertrag
- **Server (Node)**: `createRelay({ verifyToken, onObserve })` → `{ listen(port?), address(), getObserved(), close() }`. Inject `verifyToken(token, room)` (Standard: offen; recommend injecting Token-gate's `verifyToken`).
- **Client (browser/Node)**: `src/ws-lite.js` `connectWs(url, handlers)` (test/tooling); `src/client.js` `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope` (Browser; auch `window.BlindRelayClient`).

### 5. Architektur
```
client A ──E2E-encrypted envelope──▶ relay (forwards ciphertext only, logs what it sees) ──▶ client B
                                     │
                                     ├─ admission: verifyToken(token,room)
                                     └─ blind proof: getObserved() holds only ciphertext
```
Der Relay ist "blind": auf receiving ein `data` Umschlag es leitet weiter es verbatim zu andere same-room Peers, niemals parsing oder decrypting. Raum Zustand lebt nur in aktiv sockets.

### 6. Garantiert & Bedrohung Modell
- **Server blind**: Relay enthält kein symmetric Schlüssel; es leitet weiter nur client-encrypted envelopes; `getObserved()` ist auditable Nachweis es nur ever saw Chiffretext.
- **Zulassung**: wenn `verifyToken` ist injiziert, no/malformed/expired Token sind abgelehnt bei der hello Stufe (close + disconnect).
- **Kein echo**: Nachrichten go nur zu andere same-room Peers, niemals zurück zu Absender.
- Außer von Umfang: kompromittiert Client, Netzwerk-layer sniffing (Clients soll verwenden HTTPS/WSS), Wurzel private-Schlüssel Kompromittierung.

### 7. Bekannt Grenzen
- In-flight frames auf ein einzeln Verbindung sind verarbeitet serially (hello muss arrive vor welcome, dann Daten); extreme high-volume tiny-frame throughput ist nicht stress-tested.
- Der Relay ist stateless: Räume dissolve mit connections, kein Datenbank.
- Dies ist ein single-process Relay; horizontal Skalierung benötigt Raum→Relay sharding in front.

### 8. Prüfung
Siehe `TEST_REPORT.md`: `node --test` alle grün (5/5), abdeckend Zulassung, Chiffretext Routing, blind Nachweis, no-echo, und cross-room Isolation.

### 9. Gemessen Leistung
Ende-zu-Ende handshake + forward ist milliseconds; Suite von 5 Fälle läuft in ~1.1 s (multiple echt WebSocket Runde trips).

### 10. Abhängigkeiten
**Ein · Rein Null**: Server verwendet nur Node built-ins `node:http` / `node:crypto`; Client verwendet nur Plattform Web Kryptografie und Browser `WebSocket`. 0 npm Abhängigkeiten, 0 vendor.

### 11. Lizenz
Konsistent mit Repository Lizenz. Dies Modul ist Aegis's eigen Implementierung.

### 12. CHANGELOG
- v1.0.0 — null Abhängigkeiten WS Relay, Token Zulassung, blind-visible Protokoll, Browser Demo, und `TEST_REPORT.md`.
