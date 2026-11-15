<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# blind-Relay — Lieferung Bericht (MDS-1)

> Maschinenprüfbar Lieferung Vertrag. Spiegelt der 12 chapters von README.

### 1. Was es löst
Cross-device Synchronisation benötigt ein Relay, aber Clients fear Server captures Daten. Dies null Abhängigkeiten Relay führt durch WS handshake und leitet weiter **verschlüsselt envelopes** durch Raum — es niemals entschlüsselt und niemals sieht der canvas/document.

### 2. Wer kauft dies
B2B cross-device Zusammenarbeit mit ein Serverblind Anforderung: regulated industries, cross-institution Mitzeichnung.

### 3. Ausführen in 60 Sekunden
```bash
cd modules/blind-relay && node --test        # 5/5 green
node src/relay.js --port 8081                 # start the blind relay
python3 -m http.server 8080                   # open index.html (shows server only sees ciphertext)
```

### 4. Integration Vertrag
Server `createRelay({verifyToken, onObserve})` → `{listen, address, getObserved, close}`. Client `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope`. Auch `window.BlindRelayClient`.

### 5. Architektur
Client Ein → E2E Umschlag → Relay (leitet weiter Chiffretext nur, Protokolle was es sieht) → Client B. Zulassung über `verifyToken`; blind Nachweis über `getObserved()`.

### 6. Garantiert & Bedrohung Modell
Server blind (kein symmetric Schlüssel, leitet weiter Chiffretext nur), Token Zulassung, kein echo zu Absender. Außer von Umfang: kompromittiert Client, Netzwerk sniffing (verwenden WSS), root-Schlüssel Kompromittierung.

### 7. Bekannt Grenzen
Serial in-flight Rahmen Verarbeitung; stateless (Räume dissolve mit connections); single-process (shard für horizontal Skalierung).

### 8. Prüfung
`node --test` → **5 / 5 bestanden, 0 fehlgeschlagen** (`tests/relay.test.mjs`), einschließlich der auditable Serverblind Nachweis.

### 9. Gemessen Leistung
Ende-zu-Ende ms-scale; Suite ~1.1 s (echt WS Runde trips).

### 10. Abhängigkeiten
**Ein · Rein Null**: Server verwendet nur Node built-ins `node:http`/`node:crypto`; Client nur Web Kryptografie + Browser `WebSocket`.

### 11. Lizenz
Repository Lizenz. Aegis's eigen Implementierung.

### 12. CHANGELOG
- 2026-11-11 — zugestellt; 5/5 Assertions grün; eigenständig Index.html; MDS-1 Vertrag.
