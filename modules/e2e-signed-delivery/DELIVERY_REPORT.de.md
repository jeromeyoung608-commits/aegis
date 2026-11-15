<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# e2e-signed-delivery — Lieferung Bericht (MDS-1)

> Maschinenprüfbar Lieferung Vertrag. Spiegelt der 12 chapters von README.

### 1. Was es löst
Ein signiert Artefakt muss survive ein hop von Signierer zu counterparty mit seiner Signaturen und Hash-Kette unversehrt, und Empfänger muss sein able zu prüfen alles lokal vor trusting es. Dies Modul assembles, transports, und prüft signiert Artefakte Ende zu Ende.

### 2. Wer kauft dies
Irgendein Workflow das hands ein signiert, Mehrpartei Dokument zu eine weitere Partei über ein untrusted Kanal und benötigt lokal Prüfung — forensic hand-off, Audit Attestierung, regulated Dokument exchange.

### 3. Ausführen in 60 Sekunden
```bash
cd modules/e2e-signed-delivery && node --test   # 14/14 green
python3 -m http.server 8080                     # open index.html (browser flow; Playwright skipped without a browser)
```

### 4. Integration Vertrag
Rein ESM, null Abhängigkeiten, Browser + Node. `assembleArtifact`, `parseArtifact`, `verifyArtifact`, und der crypto/PDF helpers sind importable. Der Shell Aufrufe diese nach Signatur und vor Versiegelung.

### 5. Architektur
Dokument Bytes + Trailer(Signierer) → assemble → Transport (P2P/relay) → parst → prüfen (Hash match + alle Signaturen). Der Trailer ist ein array, so multi-Signierer Artefakte sind nativ (kein re-wrapping für ein zweite Signierer). **Group Lieferung** (`src/sdk/envelope.js`): Dokument DEK ist verpackt zu jeder recipient's ECDH P-256 offentlich Schlüssel, so eine versiegelt Blob öffnet independently für jeder recipient; non-recipients und late-added Empfänger sind abgelehnt. Geprüft durch `tests/envelope.test.mjs` (4/4).

### 6. Garantiert & Bedrohung Modell
Hash-Kette Integrität, multi-Signatur Prüfung, Manipulation Erkennung. Prüft der recomputed SHA-256 über der PDF region gegen jeder ECDSA P-256 Signatur über der roh 32-Byte Prüfsumme. Außer von Umfang: der live Transport medium (behandelt durch p2p-crypto-transfer / blind-Relay).

### 7. Bekannt Grenzen
Der browser/Playwright Ablauf ist übersprungen automatisch wenn kein Browser ist available, so der node Suite bleibt deterministisch. Large-file stress ist nicht Teil von Einheit Suite.

### 8. Prüfung
`node --test` → **14 / 14 bestanden, 0 fehlgeschlagen** (`tests/*.test.mjs`): assemble/verify Runde Auslösung, chain Integrität, Manipulation, multi-Signierer.

### 9. Gemessen Leistung
Suite ~683 ms (Node 26), deterministisch.

### 10. Abhängigkeiten
**Ein · Rein Null** Erstpartei Code: 0 npm Abhängigkeiten. PDF assembly verwendet ein **vendiert pdf-lib**, isoliert unter `vendor/` und geladen über Import Karte nur — es ist ein extern, replaceable Artefakt, nicht Teil von der null Abhängigkeiten Kernel, und behält seiner eigen MIT Lizenz. Dies ist der einzeln, explicitly-marked vendor Abhängigkeit von dies Modul.

### 11. Lizenz
Repository Lizenz. Vendiert pdf-lib behält seiner eigen MIT Lizenz.

### 12. CHANGELOG
- 2026-11-13 — Lieferung_Bericht zugestellt (MDS-1); 14/14 grün; vendiert pdf-lib flagged as der nur vendor Abhängigkeit.
- 2026-11-13 — hinzugefügt multi-recipient group-delivery Umschlag (`src/sdk/envelope.js` + `tests/envelope.test.mjs`, 4/4).
