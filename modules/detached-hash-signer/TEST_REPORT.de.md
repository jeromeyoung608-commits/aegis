<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# detached-Hash-Signierer — Test Bericht

> Maschinenprüfbar form, mirroring der 12-chapter structure von README.

### 1. Was ist getestet
Kern abgetrennt Hash Signatur: Hash stability, single-sign prüfen, Manipulation Ablehnung, three-party abgetrennt Signatur, missing-Signatur Fehler, abgetrennt Eigenschaft, und malformed Eingabe Ablehnung.

### 2. Wer läuft dies
Integrators vor adoption: `node --test` (oder `npm test`).

### 3. Ausführen in 60 Sekunden
```bash
cd modules/detached-hash-signer && node --test
```

### 4. Test Vertrag
| Fall | Assertion |
|---|---|
| SHA256Hex stabil und 64 chars | gleich Eingabe → gleich Hash, passt `^[0-9a-f]{64}$` |
| one-byte Änderung → totally unterschiedlich Hash | `hello` vs `hellp` differ |
| einzeln Signierer signiert Hash und prüft | `verifySignature` gibt zurück wahr |
| manipuliert Signatur schlägt fehl Prüfung | flipping erste Signatur char → falsch |
| three-party blind sign alle gültig | 3 Signaturen ok, Paket `ok:true` |
| missing/wrong Signatur schlägt fehl | falsch Signatur über unterschiedlich Hash → `ok:false`, `reason:signature-mismatch` |
| Paket ist abgetrennt (blind) | `isDetached` wahr, Paket enthält kein Dokument keyword |
| malformed Eingabe abgelehnt | non-JSON / fehlt Signierer → `ok:false` |

### 5. Test Architektur
`tests/detached-hash-signer.test.mjs` verwendet `node:test` + `node:assert`, rein Plattform Web Kryptografie, kein mocks, kein Netzwerk, kein Datei IO.

### 6. Garantiert & Abdeckung
- Abgedeckt: sign/verify, Manipulation, Mehrpartei, abgetrennt Eigenschaft, Fehler Pfade.
- Nicht abgedeckt: cross-Modul assembly (abgedeckt durch blind-relay/detached Integration), Leistung stress.

### 7. Bekannt Lücken
- Kein stress Test auf very groß Dokumente (>MB); Web Kryptografie verarbeitet normal Dokumente ohne pressure.
- Kein chained (ordered) Mitzeichnung semantics (aktuell ist unabhängig multi-sign, nicht chained).

### 8. Prüfung Status
```text
ℹ tests 8   ℹ pass 8   ℹ fail 0
```
**Alle bestehend.**

### 9. Leistung von Suite
8 Fälle vollständig in ~23 ms (Node 26, einschließlich Schlüssel Generation und multi-sign).

### 10. Abhängigkeiten
0 extern Abhängigkeiten; nur `node:test`, `node:assert`, `globalThis.crypto`.

### 11. Lizenz
Konsistent mit Repository Lizenz.

### 12. CHANGELOG
- v1.0.0 — 8/8 Fälle bestanden, abdeckend der vollständig detached-sign Pfad und der detached-property Nachweis.
