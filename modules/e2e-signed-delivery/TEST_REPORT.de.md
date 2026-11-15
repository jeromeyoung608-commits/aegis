<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# e2e-signed-delivery — Test Bericht

> Maschinenprüfbar form mirroring der 12-chapter README.

### 1. Was ist getestet
Ende-zu-Ende Artefakt assembly und Prüfung: Dokument packaging, multi-Signierer Trailer, Hash-Kette Integrität, Signatur Prüfung, Manipulation Erkennung, und der parse/verify Runde Auslösung.

### 2. Wer läuft dies
Integrators / Sicherheit Audit: `node --test` (oder `npm test`).

### 3. Ausführen in 60 Sekunden
```bash
cd modules/e2e-signed-delivery && node --test
```

### 4. Test Vertrag
| Fall | Assertion |
|---|---|
| assemble + prüfen Runde Auslösung | erzeugt Artefakt prüft `ok:true` |
| multi-Signierer Trailer | alle `trailer.signers` validate |
| Hash-Kette Integrität | tampering mit irgendein Verknüpfung schlägt fehl prüfen |
| manipuliert Signatur | `ok:false`, reason Set |
| parst / prüfen separation | `parseArtifact` gibt zurück docBytes + Trailer |

### 5. Test Architektur
`tests/*.test.mjs` mit `node:test` + `node:assert`, rein Web Kryptografie, kein Netzwerk. Der heavy browser/Playwright Ablauf ist übersprungen in CI (kein Browser), so Suite bleibt deterministisch und fast.

### 6. Garantiert & Abdeckung
- Abgedeckt: assemble, prüfen, chain Integrität, Manipulation, multi-Signierer.
- Nicht abgedeckt hier: der visuell Browser Ablauf (übersprungen ohne ein Browser), large-file stress.

### 7. Bekannt Lücken
- Playwright-driven UI Ablauf ist geschützt hinter ein Browser Verfügbarkeit prüfen und übersprungen anderenfalls.

### 8. Prüfung Status
```text
ℹ tests 14   ℹ pass 14   ℹ fail 0
```
**Alle bestehend.**

### 9. Leistung von Suite
~683 ms (Node 26), deterministisch.

### 10. Abhängigkeiten
0 extern Test Abhängigkeiten; `node:test`, `node:assert`, `globalThis.crypto`. Erstpartei Code ist **Ein · Rein Null** (vendiert pdf-lib über Import Karte nur).

### 11. Lizenz
Repository Lizenz. Vendiert pdf-lib behält seiner eigen MIT Lizenz.

### 12. CHANGELOG
- 2026-11-11 — geprüft 14/14 grün; Test_Bericht zugestellt.
