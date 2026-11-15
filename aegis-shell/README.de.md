<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: aegis-shell/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Shell — Sieben-Stufen Closed-Loop Befehl Konsole

> Aegis Workbench · `@aegis/shell`
> Engine Durch Jerome Young

## 1. Was es löst

Taken alone, jeder Modul looks wie ein Demo: Topologie ist cool, Schwärzung ist solid, P2P ist fast — aber ein Kunde's erste question ist always "kann diese sein strung in eine thing?" Ohne ein geschlossen Schleife, seven modules sind seven islands, und dort ist kein Nachweis sie actually cooperate. Dies Shell wires sie in eine **Sieben-Stufen Zustand Maschine**: select node → Last Vertrag → lokal Schwärzen → sign → verschlüsselt Transport → counterparty prüfen → Siegel in Tresor → Audit-chain commit.

## 2. Wer kauft dies

- Procurement / integrators wer brauchen ein full-machine Demo, nicht Punkt demos
- Sales-engineering Teams selling Aegis as eine solution
- Lieferung Teams needing ein reproduzierbar Abnahme Pfad

## 3. Ausführen in 60 Sekunden

Der Shell references jeder Modul durch absolute Pfad `/modules/...`, so es **muss sein ausgeliefert von Aegis Repository Wurzel**:

```bash
cd /path/to/Aegis
python3 -m http.server 8000
# → http://localhost:8000/aegis-shell/
```

(Läuft es eigenständig innen `aegis-shell/` würde 404 auf `/modules/*` und show nur ein leer Shell.)

## 4. Integration Vertrag

- Der event-bus Vertrag lebt in `src/sdk.js`: `topology:node-selected` / `redaktor:export-ready` / `artifact:signed` / `p2p:file-sent` / `p2p:file-received` / `artifact:verified` / `vault:sealed`.
- Extern subscribers verwenden `AegisSDK` und niemals lesen DOM direkt.
- Zustand ist mutated nur durch der `src/context.js` mutators, so jeder Stufe ist externally observable.

## 5. Architektur

```
aegis-shell/
├── index.html         seven-stage Stepper + three iframe workspaces
└── src/
    ├── context.js    FLOW_STAGES(1..7) + one-way-forward state machine
    ├── sdk.js        event bus / external contract
    ├── identity.js   signing adapter (uses Aegis-Identity)
    └── app.js        iframe orchestration + step lighting + closing audit
```

## 6. Garantiert & Bedrohung Modell

- **Guarantee**: `flowStage` nur increases (`Math.max`); out-of-order Ereignisse niemals rewind Demo.
- **Guarantee**: ein fehlgeschlagen Prüfung niemals unlocks Archiv Schritt (Fehler muss stop bei Prüfen).
- **Außer von Umfang**: der in-iframe modules' eigen garantiert (siehe jeder Modul README); auch nicht protecting gegen ein host Seite injiziert durch Drittanbieter scripts.

## 7. Bekannt Grenzen

- Hängt ab auf same-origin Bereitstellung: jeder Modul muss sein ausgeliefert durch der gleich Herkunft; Cross-Origin iframes lose Ereignisse und OPFS.
- Stufe 5 Prüfung und Stufe 6 Versiegelung depend auf Browser OPFS Support (Chrome / Kante).
- Der stage-4 Marke Bezeichnung ist vereinheitlicht as **Aegis-Transport** (previously mislabeled Aegis-SignedDelivery).

## 8. Prüfung

```bash
node --test tests/flow.test.mjs
# expected: # pass 5 / # fail 0
```

Deckt ab: Sieben-Stufen continuity, vollständig 1→7 advance, **fehlgeschlagen prüfen kann nicht betreten Archiv** (Fehler Pfad), out-of-order Ereignisse niemals rewind, `resetFlow()` clears alle Felder.

## 9. Gemessen Leistung

Rein state-machine Logik; auf dies Maschine (macOS / Apple Silicon / Node 20+, 2026-11-10) der 5 Assertions ausführen in < 50 ms. Ende-zu-Ende latency hängt ab auf der modules (OCR und P2P dominate).

## 10. Abhängigkeiten

**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen; nur nativ Browser APIs sind verwendet.

## 11. Lizenz

**Offen source, Apache-2.0** — siehe `LICENSE`.

## 12. CHANGELOG

Siehe [`CHANGELOG.md`](./CHANGELOG.md).
