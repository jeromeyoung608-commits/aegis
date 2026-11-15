<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `README.md`
> Deutsche Fassung. Bei Abweichungen gilt der englische Text.

# AEGIS — Werkbank für sichere Zusammenarbeit am Edge

**English** · [Deutsch](README.de.md)

> **Geschlossener Kreislauf, Zero-Trust, lokal zuerst — für klassifizierte
> Industriedokumente.** Jede Berechnung bleibt auf der Maschine des Betreibers;
> die Anwendung kontaktiert keinen Dritt-Ursprung. (Ein gehosteter Dienst oder
> ein Offline-Cache liegt außerhalb des Umfangs.)
> Ein Klick in eine Digital-Twin-Topologie mit einer Million Knoten zieht den
> zugehörigen Wartungsvertrag in eine vollständig lokale Schwärzungs-Engine. Das
> geschwärzte PDF wird gehasht, signiert, direkt Peer-to-Peer zugestellt,
> verifiziert, in einem verschlüsselten OPFS-Tresor versiegelt und an eine
> manipulationssichere Hash-Kette übergeben: **sieben Stufen, zehn auditierte
> Aktionen, eine Oberfläche**.
>
> **Der Server sieht weder die Topologie noch das Dokument, die Datei, einen
> Schlüssel oder eine Passphrase.** Jedes sensible Byte bleibt im Browser; der
> Transport läuft direkt Peer-to-Peer.

> **Lizenz:** Open Source unter der [Apache License 2.0](./LICENSE) (SPDX
> `Apache-2.0`). Kostenlose Nutzung, auch kommerziell; bezahlter Support ist
> optional. Siehe Abschnitt „Lizenz und Bezahlung" weiter unten.

---

## 1 — Warum es dieses Projekt gibt

Ein klassifizierter Fertigungsbetrieb oder eine Klinik in einem **air-gapped
Netz oder Intranet** muss vier Dinge gleichzeitig lösen:

1. Eine **sehr große Geräte- und Netzwerk-Topologie** beobachten — Canvas2D und
   SVG brechen bei dieser Größe ein.
2. Den **Wartungsvertrag** eines Geräts öffnen, der Ausweisdaten und
   Bankverbindungen externer Dienstleister enthält — und ihn **niemals** zu einem
   Cloud-OCR-Dienst hochladen.
3. Das bereinigte Dokument an eine Kollegin am selben Standort weitergeben — ohne
   Chat-Anwendung und erst recht nicht über einen Fremdanbieter.
4. **Nachprüfen**, welcher Schlüssel signiert hat, ob das Dokument unterwegs
   verändert wurde, wo die versiegelte Kopie liegt und welche Aktion in welcher
   Reihenfolge erfolgte.

AEGIS löst diese vier Probleme in **einer einzigen Arbeitsfläche**: alle Module
teilen eine Architektur, alles läuft lokal, nichts wird hochgeladen, und ein
EventBus treibt den gesamten Ablauf.

## 2 — Der geschlossene Kreislauf in sieben Stufen

```
 [1] TOPOLOGIE     Knoten auswählen          topology:node-selected
 [2] SCHWÄRZEN     Vertrag laden, Regeln     redaktor:export-ready
 [3] SIGNIEREN     SHA-256 → Signatur        identity:signed
 [4] ZUSTELLEN     P2P-Übertragung           transfer:receiving
 [5] PRÜFEN        Hash + Signatur prüfen    verify:done
 [6] ARCHIVIEREN   verschlüsselter Tresor    vault:sealed
 [7] AUDIT         Hash-Kette fortschreiben  audit:appended
```

Der Signalisierungsserver vermittelt ausschließlich SDP/ICE — niemals Bytes.

## 3 — Architektur und Schnittstellen

- **`aegis-shell/`** — die Werkbank-Oberfläche und ihre Zustandsmaschine.
- **`modules/`** — dreizehn eigenständige Module, jeweils als eigenes Produkt
  nutzbar.
- **`server.js`** — ein bewusst isolierter Server: er setzt
  `Cross-Origin-Opener-Policy: same-origin` und
  `Cross-Origin-Embedder-Policy: require-corp` auf **jede** Antwort, weil die
  Topologie `SharedArrayBuffer` benötigt und dieser nur in einem
  cross-origin-isolierten Kontext existiert.
- **`adapters/`** — austauschbare Anbindungen, u. a. TSA (RFC 3161).

## 4 — Schnellstart

```bash
cd /pfad/zu/Aegis
node server.js            # http://localhost:8080
```

`/session` (der Raum-Token-Aussteller) ist **fail-closed**: ohne
Aussteller-Zugangsdaten werden keine Token ausgegeben. Zwei Wege, ihn zu öffnen:

```bash
# A) gemeinsames Secret (empfohlen außerhalb eines isolierten Labors):
AEGIS_ISSUER_SECRET='<lange-zufaellige-zeichenkette>' node server.js
#    danach die Oberfläche einmal als http://host:8080/#issuer=<dasselbe-secret> öffnen

# B) isoliertes Demo-LAN (nur Labor — beim Start wird eine Warnung protokolliert):
AEGIS_TRUSTED_LAN=1 node server.js
```

TLS-Material wird nicht mehr aus dem Web-Root gelesen: `key.pem` und `cert.pem`
gehören nach `~/.aegis/tls/` (oder `AEGIS_TLS_DIR` darauf zeigen lassen).

Danach `http://localhost:8080` in **Chrome oder Edge 113+** öffnen:

1. Topologie rendern lassen; mit Ziehen und Mausrad navigieren.
2. **Einen Knoten anklicken** — das Schwärzungs-Panel lädt automatisch den
   zugehörigen Vertrag.
3. Erkannte Schwärzungsbereiche prüfen, Regeln bei Bedarf umschalten.
4. **An Aegis-Peer senden**. Ab hier läuft der Kreislauf automatisch: das PDF
   wird gehasht, signiert, übertragen, verifiziert; die Schaltfläche
   **Im Tresor archivieren** leuchtet auf.
5. **Im Tresor archivieren**, Passphrase eingeben (mindestens 8 Zeichen),
   **Versiegeln**. Der Sieben-Stufen-Anzeiger wird vollständig grün, die
   Audit-Zeitleiste zeigt jedes Glied der Kette.

## 5 — Die Zero-Trust-Zusagen und ihre Grenzen

- **Keine npm-Laufzeitabhängigkeiten.** Die Module führen Fremdbibliotheken in
  ihrem `vendor/`-Verzeichnis mit (PDF.js, pdf-lib, Tesseract.js, tessdata); die
  SBOM listet sie vollständig auf. Die Aussage „null Abhängigkeiten" gilt für den
  **Kern**, nicht für das gesamte Produkt.
- **Server-blind:** das Relay speichert nur undurchsichtigen Geheimtext.
- **Lokal zuerst:** keine Cloud-OCR, kein Telemetrie-Upload, keine Dritt-Origin.
- **Grenzen:** Der Schutz endet dort, wo der Browser oder das Betriebssystem
  kompromittiert ist. Ein unabhängiger Penetrationstest durch Dritte steht noch
  aus und ist Voraussetzung für jede Produktivzusicherung.

## 6 — Projektkarte

| Pfad | Inhalt |
|---|---|
| `aegis-shell/` | Werkbank-Oberfläche, Betreiberkonsole, PWA |
| `modules/` | 13 eigenständige Module (Identität, Tresor, Audit, Schwärzung, P2P, Topologie …) |
| `adapters/` | TSA (RFC 3161) und weitere Anbindungen |
| `docs/` | API, SDK, Betrieb, Compliance |
| `docs/legal/` | Bestellformular, Datenschutz-Erklärung, Dokumentenindex |
| `scripts/` | Aufbau, Prüfungen, SBOM, Paketierung |

## 7 — Prüfungen

```bash
npm test                     # Kopfzeilen, Lizenz, Übersetzungen, Englisch, alle Tests
node scripts/verify-claims.mjs
node scripts/verify-zero-deps.mjs
node scripts/doctor.mjs
npm run pack:delivery && npm run verify:delivery
```

## 8 — Lizenz und Bezahlung

**Kostenlos:** die Software. Jede Erstdartei in diesem Repository steht unter
Apache-2.0 — keine Tarifstufe, keine Sitzungsbegrenzung, keine Umsatzschwelle.
Sie dürfen AEGIS kommerziell einsetzen, ändern und weitergeben; Sie müssen lediglich
die Lizenz- und Urheberhinweise beibehalten (Apache-2.0 § 4).

**Kostenpflichtig (optional):** die Zeit der Maintainer. Bereitstellung,
Härtungsprüfung, Compliance-Paket, SIEM-Integration und jährlicher Support —
Preise in [`PRICING.md`](./PRICING.md), Bedingungen in
[`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md). **Ein Supportvertrag ist
niemals Voraussetzung dafür, die Software zu betreiben.**

Die Marke „AEGIS" ist nicht durch die Lizenz abgedeckt; siehe
[`TRADEMARK.md`](./TRADEMARK.md).

## 9 — Sprachen

Die Dokumentation ist auf Englisch verfügbar (verbindlich) und für die
kundenrelevanten Dokumente zusätzlich auf Deutsch (`.de.md`). Die
Betreiberkonsole ist auf Englisch und Deutsch verfügbar; die Moduloberflächen
sind auf Englisch. Siehe [`docs/LANGUAGES.md`](./docs/LANGUAGES.md).

## 10 — Sicherheit und Kontakt

Schwachstellen bitte vertraulich an **jeromeyoung608@gmail.com** melden —
Details in [`SECURITY.md`](./SECURITY.md). Sicherheits-Supportzeitraum:
**2026-11-15 → 2031-11-15** (5 Jahre, CRA Art. 13).
