<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# p2p-crypto-transfer — Peer-to-Peer Verschlüsselt Übertragung

## 1. Was es löst
Dateien muss bewegen zwischen two Parteien ohne ein Server ever seeing sie. p2p-crypto-transfer Mengen up ein WebRTC Daten Kanal und Streams AES-GCM-encrypted chunks gerade zu Datenträger, mit ein minimal null Abhängigkeiten Signalisierung Server das relays nur opak SDP/ICE.

## 2. Wer kauft dies
Irgendein Workflow das benötigt direct, end-to-end-encrypted Datei Übergabe (der "Transport" leg von Aegis geschlossen Schleife).

## 3. Ausführen in 60 Sekunden
```bash
cd modules/p2p-crypto-transfer
node --test                 # 11/11 green
node server.js &            # minimal signaling server (relays SDP/ICE only)
python3 -m http.server 8080 # open index.html (two tabs to transfer)
```

## 4. Integration Vertrag
`src/transfer.js` (stream encrypt/send + receive/decrypt zu Datenträger), `src/p2p.js` (RTCPeerConnection/DataChannel), `src/crypto.js` (Umschlag). Der Shell steuert es über iframe + postMessage.

## 5. Architektur
Schlüssel exchange → AES-GCM Umschlag → WebRTC DataChannel → Empfänger entschlüsselt zu Datenträger über ein 1 GiB-capped im Arbeitsspeicher Blob Rückfallebene. Signalisierung Server relays nur SDP/ICE.

## 6. Garantiert & Bedrohung Modell
Ende-zu-Ende Verschlüsselung (falsch Schlüssel schlägt fehl), Integrität (Manipulation abgelehnt), OOM-safe streaming. Der Signalisierung Server sieht kein Datei Bytes oder Schlüssel. Außer von Umfang: Signalisierung Server Kompromittierung, host OS Kompromittierung.

## 7. Bekannt Grenzen
Erfordert ein secure Kontext (HTTPS/WSS) und ein Browser für der live Übertragung; der node Suite simulates der crypto/transport Vertrag.

## 8. Prüfung
`node --test` → 11/11 grün (Kryptografie Runde Auslösung, wrong-Schlüssel Ablehnung, Manipulation Ablehnung, Salt Runde Auslösung, Peer interop, streaming-to-disk Logik).

## 9. Gemessen Leistung
Suite ~1.0 s (Node 26), deterministisch.

## 10. Abhängigkeiten
**Ein · Rein Null** Erstpartei Code: 0 npm Abhängigkeiten. Browser verwendet nur WebRTC + Web Kryptografie.

## 11. Lizenz
Repository Lizenz.

## 12. CHANGELOG
- 2026-11-11 — README zugestellt (Englisch); Test_Bericht zugestellt; 11/11 grün (Anzahl korrigiert von veraltet 10).
