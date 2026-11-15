<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Token-gate — Test Bericht

### 1. Was ist getestet
Vollständig Token issue/verify Pfad: gültig Zulassung, Ablauf, falsch Raum, gefälscht Signatur, audience restriction, Gate, und cross-root Ablehnung.

### 2. Wer läuft dies
Integrators vor adoption: `node --test` (oder `npm test`).

### 3. Ausführen in 60 Sekunden
```bash
cd modules/token-gate && node --test
```

### 4. Test Vertrag
| Fall | Assertion |
|---|---|
| gültig Token prüft | `verifyToken` ok, Raum passt |
| expired Token abgelehnt | `reason:expired` |
| wrong-room Token abgelehnt | `reason:wrong-room` |
| gefälscht (manipuliert) Token abgelehnt | `reason:bad-signature` |
| audience: korrekt admits / falsch denies | `audience-mismatch` |
| Gate() admits good / denies bad Umschlag | admit boolean korrekt |
| cross-root Signatur schlägt fehl | `bad-signature` |

### 5. Test Architektur
`tests/token-gate.test.mjs`, `node:test` + `node:assert`, rein Web Kryptografie, kein Netzwerk, kein IO.

### 6. Garantiert & Abdeckung
- Abgedeckt: Problem, prüfen, vier Ablehnung classes, audience, Gate, cross-root.
- Nicht abgedeckt: gleichzeitig issuance, Token Widerruf, oversized Nutzdaten.

### 7. Bekannt Lücken
- Stateless Token haben kein instant-revocation Test (Entwurf relies auf ein Aussteller denylist, nicht implementiert hier).

### 8. Prüfung Status
```text
ℹ tests 7   ℹ pass 7   ℹ fail 0
```
**Alle bestehend.**

### 9. Leistung von Suite
7 Fälle vollständig in ~130 ms (multiple Schlüssel generations und issuances).

### 10. Abhängigkeiten
0 extern Abhängigkeiten; nur `node:test`, `node:assert`, `globalThis.crypto`.

### 11. Lizenz
Konsistent mit Repository Lizenz.

### 12. CHANGELOG
- v1.0.0 — 7/7 Fälle bestanden, abdeckend der vollständig Token-admission Ablehnung Pfad.
