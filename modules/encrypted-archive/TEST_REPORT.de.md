<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Test Bericht · Lokal Verschlüsselt Tresor (Audit & Archiv)

Modul: `modules/encrypted-archive`
Datum: 2026-11-10
Laufzeit: Node 26 (eingebaut `node:test`, eingebaut Web Kryptografie), Chrome 141 auf macOS
Abhängigkeiten: keiner

---

## 1 · Urteil

**Bestanden** — 23 / 23 Headless Assertions und Browser Abnahme Pfad.

| Ebene | Ergebnis |
| --- | --- |
| Container (Siegel / offen / Manipulation) | 11 / 11 bestanden |
| Tresor API (Siegel / Liste / offen / entfernen) | 6 / 6 bestanden |
| Speicher adapters (Speicher / OPFS Wächter / IDs) | 6 / 6 bestanden |
| Browser: Siegel von Shell → Neu laden → re-list | Bestanden |
| Browser: eigenständig Tresor liest shell's OPFS Datensatz | Bestanden |

---

## 2 · Wie zu reproduce

```bash
cd modules/encrypted-archive
node --test
```

Gemessen tail:

```
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3299.02975
```

Browser Pfad:

```bash
# repository root
node server.js
# open http://localhost:8080/, then:
#   Test signed delivery → Verified → Archive to Vault → passphrase → Seal to vault
```

---

## 3 · Assertion matrix

### 3.1 `tests/container.test.mjs` — 11 Assertions

| # | Assertion | Was es beweist |
| --- | --- | --- |
| 1 | versiegelt Container round-trips Bytes und Metadaten | lossless seal/open |
| 2 | offentlich Kopfzeile parses ohne ein Passphrase | Index kann show sizes während gesperrt |
| 3 | Datei Bytes und Metadaten sind absent von Container | confidentiality von Namen und Inhalt |
| 4 | falsch Passphrase → `Vault unlock failed` | distinct, actionable Fehler |
| 5 | eine flipped Chiffretext Byte → `integrity check failed` | Prüfsumme pre-check works |
| 6 | gefälscht Prüfsumme + manipuliert Bytes → `unlock failed` | GCM Tag ist der echt Grenze |
| 7 | defekt magic abgelehnt | malformed Eingabe schlägt fehl early |
| 8 | truncated Container abgelehnt | Länge validation |
| 9 | Passphrase shorter als 8 Zeichen abgelehnt | Richtlinie enforced bei der API |
| 10 | Klartext staging Puffer ist zeroed wenn Versiegelung gibt zurück | Speicher hygiene |
| 11 | (gleich Test Rumpf) zeroing deckt ab Metadaten + Datei Bytes | kein partial wipe |

Assertion 10/11 sind two Prüfungen innen eine `test()` Rumpf; der runner Zählungen sie as eine
Test, hence 10 Container Tests und 11 Assertions über Datei.

### 3.2 `tests/vault.test.mjs` — 6 Tests

| # | Assertion | Was es beweist |
| --- | --- | --- |
| 1 | Siegel → Liste → offen Hin- und Rückweg | Produkt API ist coherent |
| 2 | listing hides Datei Namen | Index ist opak |
| 3 | two seals holen distinct IDs | kein id collision in practice |
| 4 | falsch Passphrase lässt Datensatz unversehrt | fehlgeschlagen entsperren ist non-destructive |
| 5 | entfernen deletes genau eine Datensatz | scoped deletion |
| 6 | leer Datei und Größe cap sind refused | guardrails mit klar Nachrichten |

### 3.3 `tests/store.test.mjs` — 6 Tests

| # | Assertion | Was es beweist |
| --- | --- | --- |
| 1 | Speicher Adapter implementiert put/get/list/remove/clear | Schnittstelle completeness |
| 2 | liest zurückgeben copies, nicht geteilt buffers | caller kann nicht mutate speichert Bytes |
| 3 | `recordFileName` lehnt ab `../`, absolute Pfade, uppercase, leer | Pfad traversal impossible |
| 4 | Datei Namen Karte zurück zu IDs | listing bleibt konsistent |
| 5 | `opfsSupported()` ist falsch in Node | Funktion Erkennung ist ehrlich |
| 6 | `openOpfsStore()` lehnt ab in Node | kein silent fake Persistenz |

---

## 4 · Browser Abnahme

Umgebung: Chrome 141, `http://localhost:8099/` (`node server.js` mit COOP/COEP).

| Schritt | Action | Observed |
| --- | --- | --- |
| 1 | Klick **Test signiert Lieferung** | `Verified · 2 signer(s) · SHA-256 6930443e3a3b…` |
| 2 | Prüfung Urteil reaches Shell | Gold **Archiv zu Tresor** Schaltfläche appears nur nach ein bestehend Urteil |
| 3 | Klick **Archiv zu Tresor** | nativ `<dialog>` öffnet, zeigt Artefakt Name |
| 4 | Betreten `vault-pass-123`, press **Siegel zu Tresor** | `Archived to the local vault: 5a8af386-add8-483b-9279-e1ca70f53e25 (52576 B payload → 53324 B sealed, AES-GCM-256).` |
| 5 | Inspect Seitenleiste | `1 sealed record · 52.1 KB ciphertext · opfs` |
| 6 | Neu laden Befehl Mitte | gleich Zeile: `1 sealed record · 52.1 KB ciphertext · opfs` |
| 7 | Offen der eigenständig Tresor Seite | `1 record`, eine `.row-item`, `OPFS · aegis-vault` |

Overhead für Datensatz: 53324 − 52576 = **748 Bytes**, abdeckend der 8-Byte magic,
Version Byte, 4-Byte Kopfzeile Länge, der JSON Kopfzeile (Salt, IV, Prüfsumme, sizes) und der
16-Byte GCM Tag.

Negative Prüfungen das waren nicht acceptable in UI: Archiv Schaltfläche ist verborgen vor ein
Prüfung, und ein abgelehnt Signatur Mengen `signedState` zu `Rejected: …` ohne
offering Schaltfläche.

---

## 5 · Fehler gefunden während Build

### 5.1 Blob Übertragung in ein verborgen iframe stalled

**Symptom.** Der erste Integration embedded Tresor Seite in ein verborgen iframe und posted
`archive:store` mit Artefakt Blob. Der dialog stayed auf `Sealing…` indefinitely; der
Tresor iframe logged kein receipt, although seiner `archive:list` Hin- und Rückweg worked.

**Diagnosis.** Control Nachrichten (strings nur) crossed Grenze; Datensatz Nutzdaten
tat nicht. Vielmehr als guess bei structured-clone behaviour, Architektur war simplified:
Shell jetzt Importe `createVault` und `openOpfsStore` direkt. OPFS ist per-origin, so
der eigenständig Seite noch browses der gleich `/aegis-vault` Verzeichnis. Dies entfernt eine
Meldung hop, eine Rahmen, und eine Klasse von Fehler.

**Prüfung.** Nach Änderung, der gleich Klick Pfad erzeugt Archiv Protokoll auf der
erste attempt, und Schritt 7 von Browser Tabelle beweist beide surfaces teilen eine Tresor.

### 5.2 Behoben BroadcastChannel Raum caused cross-tab interference

**Symptom.** Mit two command-center Registerkarten offen, Empfänger sometimes ended in
`signaling-error: Failed to execute 'setRemoteDescription'`. Ein veraltet Registerkarte answered der gleich
room's offer.

**Kcorrektur.** Beide der signed-delivery Seite und Shell derive ihrer Raum von ein per-load
Zufall suffix (`aegis-signed-delivery-<nonce>`, `aegis-demo-<nonce>`). Sitzungen kein länger
collide, und Demo ist repeatable ohne closing jeder andere Registerkarte.

**Prüfung.** Repeated läuft mit two Registerkarten offen: Signatur, Prüfung und archiving
vollständig ohne Signalisierung Fehler.

---

## 6 · Sicherheit Notizen geprüft durch Test

- Klartext niemals lässt Speicher in cleartext form auf Datenträger: Container Text enthält kein
  Datei Name, kein Nutzdaten substring und kein Metadaten Schlüssel (Assertion 3.1.3).
- Der abgeleitet KEK ist non-extractable; Modul niemals Aufrufe `exportKey` auf es.
- Pfad traversal ist blockiert bei Adapter Grenze, nicht durch string replacement bei UI.
- Integrität Fehler sind gemeldet vor ein Passphrase ist abgeleitet, so ein corrupted Datensatz
  costs kein KDF work.
- Ein falsch Passphrase kann nicht destroy oder rewrite ein Datensatz (3.2.4).

---

## 7 · Was ist nicht abgedeckt

- Echt multi-megabyte PDFs (der cap ist 64 MB; Tests verwenden small payloads).
- OPFS quota exhaustion und storage-eviction Ereignisse.
- Cross-Browser OPFS behaviour (Firefox/Safari waren nicht Teil von Abnahme).
- Screenshot-level visuell Regression von Tresor Seite.
