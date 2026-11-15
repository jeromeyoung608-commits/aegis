<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# e2e-signed-delivery — Ende-zu-Ende Signiert Artefakt Lieferung

## 1. Was es löst
Ein signiert Artefakt muss survive ein hop von Signierer zu counterparty mit seiner Signaturen und Hash-Kette unversehrt, und Empfänger muss sein able zu prüfen alles lokal vor trusting es. Dies Modul assembles, transports, und prüft signiert Artefakte Ende zu Ende.

## 2. Wer kauft dies
Irgendein Workflow das hands ein signiert, Mehrpartei Dokument zu eine weitere Partei über ein untrusted Kanal und benötigt lokal Prüfung.

## 3. Ausführen in 60 Sekunden
```bash
cd modules/e2e-signed-delivery
node --test                 # 14/14 green
python3 -m http.server 8080 # open index.html (browser flow; Playwright path skipped without browser)
```

## 4. Integration Vertrag
`assembleArtifact`, `parseArtifact`, `verifyArtifact`, und der crypto/PDF helpers sind importable. Der Shell Aufrufe diese nach Signatur und vor Versiegelung.

## 5. Architektur
Dokument Bytes + Trailer(Signierer) → assemble → Transport (P2P/relay) → parst → prüfen (Hash match + alle Signaturen). Der Trailer ist ein array, so multi-Signierer Artefakte sind nativ.

**Group Lieferung:** `src/sdk/envelope.js` wraps Dokument DEK zu N recipients' ECDH P-256 offentlich Schlüssel (frisch ephemeral ECDH pro recipient, AES-GCM-wrapped DEK). Eine versiegelt Blob öffnet independently für jeder recipient — kein geteilt Passphrase, kein per-recipient re-encryption. Irgendein recipient nicht listed bei Siegel Zeit ist abgelehnt, und Umschlag ist geschlossen (adding ein recipient später macht nicht Gewährung Zugriff).

## 6. Garantiert & Bedrohung Modell
Hash-Kette Integrität, multi-Signatur Prüfung, Manipulation Erkennung. Außer von Umfang: der live Transport medium (behandelt durch p2p-crypto-transfer / blind-Relay).

## 7. Bekannt Grenzen
Der browser/Playwright Ablauf ist übersprungen automatisch wenn kein Browser ist available, so der node Suite bleibt deterministisch.

## 8. Prüfung
`node --test` → 14/14 grün (assemble/verify Runde Auslösung, chain Integrität, Manipulation, multi-Signierer).

## 9. Gemessen Leistung
Suite ~683 ms (Node 26), deterministisch.

## 10. Abhängigkeiten
**Ein · Rein Null** Erstpartei Code: 0 npm Abhängigkeiten. Vendiert pdf-lib über Import Karte nur.

## 11. Lizenz
Repository Lizenz. Vendiert pdf-lib behält seiner eigen MIT Lizenz.

## 12. CHANGELOG
- 2026-11-11 — README zugestellt (Englisch); Test_Bericht zugestellt; 14/14 grün.
