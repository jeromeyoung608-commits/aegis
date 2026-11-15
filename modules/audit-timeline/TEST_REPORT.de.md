<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/audit-timeline/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Test Bericht - Manipulationserkennbar Audit-Trail

## 1. Summary

| Punkt | Ergebnis |
| --- | --- |
| Suite | `modules/audit-timeline/tests/trail.test.mjs` |
| Befehl | `npm test` (`node --test`) |
| Tests | 15 |
| Bestanden | 15 |
| Fehlgeschlagen | 0 |
| Duration | 184 ms |
| Abhängigkeiten | Keiner (Node built-ins nur) |
| Browser Abnahme | Bestanden auf Befehl Mitte und der eigenständig Prüfung Seite |

Umgebung: macOS 15.6.1, Node v26.0.0, Chromium-based Browser Sitzung.

---

## 2. Headless Ergebnisse

```
> @aegis/audit-timeline@1.0.0 test
> node --test

ok 1  appends links in order and chains each hash to the previous one
ok 2  concurrent appends are serialized into one unbroken chain
ok 3  canonical serialization makes key order irrelevant to the link hash
ok 4  verify reports the first edited link
ok 5  verify reports reordered links
ok 6  a link hash covers actor, event, detail and fingerprint
ok 7  persists a chain and restores it intact
ok 8  restores a tampered persisted chain in a broken state
ok 9  a corrupt stored log is reported instead of silently ignored
ok 10 rejects an unknown schema
ok 11 reset returns the trail to a fresh genesis state
ok 12 appends after load continue the restored chain
ok 13 append requires an actor and an event name
ok 14 snapshot is a content-free, exportable structure
ok 15 clock and digest formatting stay compact

tests 15 | pass 15 | fail 0
```

### Abdeckung matrix

| Anforderung | Test |
| --- | --- |
| Jeder Verknüpfung bindet zu der previous Hash | 1 |
| Erste Verknüpfung bindet zu der 64-null genesis | 1 |
| Gleichzeitig UI Ereignisse kann nicht Fork der chain | 2 |
| Deterministisch Nutzdaten serialization | 3 |
| Bearbeitung ein Eintrag ist detected bei Recht Index | 4 |
| Reordering Einträge ist detected | 5 |
| Actor / Ereignis / Detail / Fingerabdruck alle affect Hash | 6 |
| Neu laden wiederherstellt der gleich Kopf und unversehrt Urteil | 7 |
| Ein manipuliert speichert chain loads as `brokenAt = 1`, nicht as gültig | 8 |
| Corrupt JSON ist surfaced, niemals stillschweigend ignored | 9 |
| Unbekannt schema versions sind abgelehnt | 10 |
| Klar removes gespeichert Zustand und resets genesis | 11 |
| Neu Ereignisse continue ein wiederhergestellt chain | 12 |
| Leer actor oder Ereignis ist abgelehnt | 13 |
| Export snapshot trägt schema, genesis, Kopf und Verknüpfungen | 14 |
| `HH:MM:SS` und short-Hash formatting | 15 |

---

## 3. Browser Abnahme

### 3.1 Eigenständig Prüfung Seite (leer Zustand)

Opened `/modules/audit-timeline/index.html` mit kein speichert trail.

- Heading `Who did what, and when.` gerendert.
- Status badge: `chain empty - append-only log ready`.
- Empty-state sentence: `No audit events yet. Open the workbench and run a document through the closed loop.`
- Konsole contained nur Aegis Signatur Zeile; kein page-level Fehler.

### 3.2 Befehl Mitte ausführen

Opened `/aegis-shell/index.html`, waited für Workbench, dann clicked
**Test signiert Lieferung**.

Observed:

- `Verified - 2 signer(s) - SHA-256 72fe7dbd7fdc...`
- **Archiv zu Tresor** Schaltfläche became sichtbar nur nach Urteil.
- Audit-Trail Einträge:
  - `[HH:MM:SS] Engineer-A - ECDSA signature generated` mit
    `Fingerprint 677A18AB552A` und ein SHA-256 prefix.
  - `[HH:MM:SS] Boss-B - Verification passed` mit `2/2 signatures valid`.
- Status badge: `chain intact - 2 links - head 7C866913...`.

### 3.3 Neu laden und cross-page Persistenz

- Reloaded Befehl Mitte: der gleich `2 links` und Kopf `7C866913...` waren wiederhergestellt,
  noch `chain intact`.
- Opened der eigenständig Prüfung Seite in ein zweite Registerkarte: der gleich two Einträge und
  `chain intact - 2 links` waren displayed, confirming beide surfaces lesen eine chain.
- Ran der signed-delivery Demo einmal more in Befehl Mitte: Status became
  `chain intact - 4 links - head 1F9AB3E9...`, und der neu Signatur Eintrag carried
  `Fingerprint 00022595F310`. Dies auch exercises der serialized anhängen Warteschlange: two
  Verknüpfungen waren hinzugefügt zu der wiederhergestellt chain ohne forking es.

---

## 4. Fehler gefunden und resolved

### 4.1 Signatur und Prüfung collapsed in eine Zeitstempel

**Symptom:** der erste Implementierung abgeleitet der `ECDSA signature generated` Verknüpfung von
der endgültig Prüfung Meldung. Beide Verknüpfungen appeared in der gleich Darstellung bestanden, so der
Zeitleiste könnte nicht show Signatur vor Lieferung und Prüfung nach es.

**Kcorrektur:** der signed-delivery Modul jetzt posts ein `signed:sealed` Meldung sofort nach
building Signatur Trailer, vor Artefakt ist transferred. Der Shell listens für
es und appends Signatur Verknüpfung bei der echt moment; `signed:verified` appends Urteil
später.

### 4.2 Urteil Nutzdaten hatte kein fingerprints

**Symptom:** `verifyArtifact()` gibt zurück `{ id, ok }` pro Signierer, welche ist enough für der
Archiv Gate aber nicht für ein Zeitleiste das muss show `Fingerprint: 9C4E...`.

**Kcorrektur:** der signed-delivery Modul computes beide SPKI SHA-256 fingerprints einmal bei Start,
speichert sie, und enthält sie in `signed:sealed`. Fingerprints sind uppercased so der
iframe readout und Zeitleiste zustimmen.

### 4.3 Ein corrupted Protokoll könnte look wie ein leer Protokoll

**Symptom:** invalid JSON in `localStorage` erzeugt ein leer Zeitleiste, welche ist
indistinguishable von ein frisch installieren.

**Kcorrektur:** `AuditTrail.load()` Datensätze `loadError` und Mengen `brokenAt = 0`; Status badge
zeigt Speicher Fehler, und Zeitleiste behält Fehler sichtbar.

---

## 5. Lücken und ehrlich Grenzen

- Der Suite Tests der chain, nicht DOM. Zeitleiste Darstellung ist geprüft in ein echt
  Browser (Abschnitt 3), nicht mit ein Headless DOM library.
- Browser Abnahme war durchgeführt auf ein Chromium-based Browser. Firefox und Safari waren
  nicht exercised.
- `localStorage` ist last-writer-wins. Gleichzeitig command-center Registerkarten kann diverge; jeder
  im Arbeitsspeicher chain bleibt gültig, aber nur eine gespeichert branch überlebt.
- Der chain ist lokal manipulationserkennbar, nicht remotely attested. Replacing der entire speichert
  chain mit ein unterschiedlich internally gültig chain ist outside Bedrohung Modell bis der
  Kopf Hash ist anchored in ein signiert Artefakt oder ein extern Zeitstempel Service.
- Timestamps come von der lokal clock und order Ereignisse; sie sind nicht ein trusted Zeit
  source.

---

## 6. Reproduce

```bash
cd modules/audit-timeline
npm test

# browser
cd ../..
node server.js
# command center:   http://localhost:8080/aegis-shell/index.html
# review page:      http://localhost:8080/modules/audit-timeline/index.html
```
