<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# p2p-crypto-transfer — Test Bericht

> Maschinenprüfbar form mirroring der 12-chapter README.

### 1. Was ist getestet
Peer-to-peer verschlüsselt Datei Übertragung: Schlüssel exchange / derivation, Umschlag encrypt/decrypt, Integrität, wrong-Schlüssel Ablehnung, und der vollständig WebRTC handshake/transfer simulation.

### 2. Wer läuft dies
Integrators / Sicherheit Audit: `node --test` (oder `npm test`).

### 3. Ausführen in 60 Sekunden
```bash
cd modules/p2p-crypto-transfer && node --test
```

### 4. Test Vertrag
| Fall | Assertion |
|---|---|
| Umschlag verschlüsseln → entschlüsseln Runde Auslösung | Klartext recovered |
| falsch Schlüssel schlägt fehl zu entschlüsseln | Prüfung Fehler |
| Integrität Tag lehnt ab tampering | AES-GCM erkennt |
| Schlüssel derivation deterministisch | gleich inputs → gleich Schlüssel |
| vollständig Übertragung simulation | Datei arrives unversehrt |

### 5. Test Architektur
`tests/*.test.mjs`, `node:test` + `node:assert`, rein Web Kryptografie, kein Netzwerk. Der browser/WebRTC UI Ablauf ist übersprungen ohne ein Browser.

### 6. Garantiert & Abdeckung
- Abgedeckt: Umschlag Kryptografie, Integrität, Schlüssel derivation, simulated Übertragung.
- Nicht abgedeckt: live WebRTC Peer Verbindung (übersprungen ohne ein Browser).

### 7. Bekannt Lücken
- Live WebRTC Pfad ist exercised nur in ein Browser; der node Suite simulates der crypto/transport Vertrag.

### 8. Prüfung Status
```text
ℹ tests 11   ℹ pass 11   ℹ fail 0
```
**Alle bestehend.** (Hinweis: ein earlier Lieferung Bericht angegeben 10/10; der gemessen Anzahl ist 11/11 — korrigiert hier.)

### 9. Leistung von Suite
~1040 ms (Node 26), deterministisch.

### 10. Abhängigkeiten
0 extern Test Abhängigkeiten. Erstpartei Code ist **Ein · Rein Null** (vendiert lib über Import Karte nur).

### 11. Lizenz
Repository Lizenz.

### 12. CHANGELOG
- 2026-11-11 — geprüft 11/11 grün; Test_Bericht zugestellt; korrigiert Anzahl (war 10).
