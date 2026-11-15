<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# blind-Relay — Test Bericht

### 1. Was ist getestet
Der Zero-Knowledge Relay's behavioral Vertrag: Token Zulassung, Ende-zu-Ende Chiffretext Routing, Serverblind Nachweis, no-echo zu Absender, und cross-room Isolation.

### 2. Wer läuft dies
Integrators / Sicherheit Audit: `node --test` (oder `npm test`).

### 3. Ausführen in 60 Sekunden
```bash
cd modules/blind-relay && node --test
```

### 4. Test Vertrag
| Fall | Assertion |
|---|---|
| admitted Token + Chiffretext Routing + blind | B receives A's Chiffretext und entschlüsselt; `getObserved()` enthält kein Klartext `SECRET`/`coordinates` |
| no/bad Token abgelehnt | `connectAuth` lehnt ab, `reason:admission denied` |
| wrong-room Token abgelehnt | gleich |
| kein echo zu Absender | Absender `aGot.length === 0` |
| cross-room Isolation | R2's `r2Got.length === 0` |

### 5. Test Architektur
`tests/relay.test.mjs` verwendet ein echt WebSocket: startet `createRelay` → two Token-holding Clients über `ws-lite.connectWs` → Ende-zu-Ende AES-GCM encrypt/decrypt. `verifyToken` injiziert Token-gate's echt Prüfung. Jeder Test schließt Relay in `finally` zu avoid lingering verarbeitet.

### 6. Garantiert & Abdeckung
- Abgedeckt: Zulassung (valid/bad/wrong-room), blind Nachweis, no-echo, cross-room Isolation.
- Nicht abgedeckt: WS Rahmen fragmentation Grenzen, huge gleichzeitig connections, WSS (TLS) front.

### 7. Bekannt Lücken
- Single-connection serial Rahmen Verarbeitung (noted unter Bekannt Grenzen in README).
- Kein formal Nachweis das ein kompromittiert Relay noch can't lesen Daten (relies auf E2E Verschlüsselung; Schlüssel niemals leave Client).

### 8. Prüfung Status
```text
ℹ tests 5   ℹ pass 5   ℹ fail 0
```
**Alle bestehend.**

### 9. Leistung von Suite
5 Fälle vollständig in ~1106 ms (echt TCP/WS handshake + multiple Runde trips).

### 10. Abhängigkeiten
0 extern Abhängigkeiten in Tests; nur `node:test`, `node:assert`, `node:http`, `node:crypto`, `globalThis.crypto`.

### 11. Lizenz
Konsistent mit Repository Lizenz.

### 12. CHANGELOG
- v1.0.0 — 5/5 Fälle bestanden, einschließlich der auditable "Serverblind" Nachweis.
