# Aegis — Sichere Edge-Kollaborations-Werkbank

> **Geschlossene Schleife, Zero-Trust, offline-fähig** für klassifizierte industrielle
> Umgebungen. Ein Klick in eine Millionen-Knoten-Digital-Twin-Topologie zieht den
> zugehörigen Wartungsvertrag in eine vollständig lokale Redaktions-Engine. Das
> zerstörende (redacted) PDF wird gehasht, signiert, peer-to-peer zugestellt, verifiziert,
> in einem verschlüsselten OPFS-Tresor versiegelt und an eine unveränderliche Audit-Kette
> übergeben: **sieben Stufen, zehn auditierte Aktionen, eine Shell**.
>
> **Der Server sieht niemals die Topologie, das Dokument, eine Datei, einen Schlüssel oder
> ein Passwort.** Jedes sensibele Byte bleibt im Browser; der Transport ist direktes P2P.

---

## 1 — Warum es existiert (der deutsche Industrie-/Medizin-Anwendungsfall)

Ein klassifizierter Hersteller oder eine Klinik in einem **air-gegappten oder Intranet**-
Netzwerk muss:

1. Eine **riesige Geräte-/Netzwerktopologie** überwachen (vernetzte Autos, Fabriksensoren) —
   Canvas2D/SVG scheitern bei dieser Skalierung.
2. Den **Wartungsvertrag** eines Geräts öffnen, der Ausweisnummern und Konten von
   Fremdfirmenmitarbeitern enthält — und ihn **niemals** in einen Cloud-OCR-Dienst hochladen.
3. Das bereinigte Dokument einem Kollegen am selben Standort übergeben — ohne Chat-App
   (und ganz sicher nicht WeChat/Slack).
4. **Beweisen**, wer es signiert hat, dass es unverändert übertragen wurde, wo die versiegelte
   Kopie liegt und welche Aktionen in welcher Reihenfolge stattfanden.

Aegis löst dies als **eine Single-Page-Werkbank**, deren unabhängige Module eine gemeinsame
Architektur teilen: **alles läuft lokal, nichts wird hochgeladen, und ein EventBus steuert
den gesamten Ablauf.**

---

## 2 — Die siebenstufige geschlossene Schleife

```
 [1] TOPOLOGIE          Aegis-Topology          topology:node-selected {nodeId, x, y}
        |  redaktor:load-doc (zugehöriger Vertrag File)
        v
 [2] REDAKTION          Aegis-REDAKTOR          redaktor:export-ready {name, blob}
        |  SHA-256(pdfBytes) -> signHash(raw digest) -> assembleArtifact()
        v
 [3] SIGNATUR           Aegis-Identity          identity:signed {hash, signature, publicKey}
        |  artifact als AegisContext.pendingArtifact gehalten
        |  P2PAdapter.sendFile(artifact)
        v
 [4] P2P-SENDEN         Aegis-SignedDelivery    p2p:file-sent
        |  AES-GCM-Chunks über einen WebRTC-DataChannel
        v
 [5] VERIFIKATION        Aegis-Identity          p2p:file-received -> signed:verified
        |  "Archive to Vault" wird erst bei bestandenem Urteil freigeschaltet
        v
 [6] ARCHIVIERUNG       Aegis-Vault             vault:sealed -> OPFS (.aegis Container)
        |  jede Stufe ruft AuditTrail.append() auf
        v
 [7] AUDIT              Aegis-AuditTrail        audit:append -> SHA-256-Hashkette
```

**Zehn auditierte Aktionen:** Topology-Knoten gewählt → Dokument in REDAKTOR geladen →
zerstörendes PDF erzeugt → Dokument-Hash signiert → signiertes Artefakt an Transport
übergeben → verschlüsselt P2P zugestellt → Empfang entschlüsselt → Verifikation bestanden
(oder abgelehnt) → in Tresor versiegelt → Hashkette abgeschlossen.

---

## 3 — Architektur und Integrationsnähte

Acht unabhängige, wiederverwendbare Module liegen unter `modules/` und werden von
`aegis-shell/` über einen `EventBus` + `postMessage`-Brücke zusammengesetzt. Kein Modul
importiert ein anderes; sie kommunizieren nur auf dem `aegis`-Nachrichtenkanal.

| Modul | Marke | Ordner | Rolle |
|-------|-------|--------|------|
| Topologie | `Aegis-Topology` | `modules/webgpu-topology` | WebGPU Digital-Twin, 1M+ Knoten |
| Redaktion | `Aegis-REDAKTOR` | `modules/doc-redactor` | Lokale OCR + zerstörendes PDF |
| Identität | `Aegis-Identity` | `modules/zero-knowledge-identity` | ECDSA P-256-Siegel, gewrapter Schlüssel |
| Signierte Zustellung | `Aegis-SignedDelivery` | `modules/e2e-signed-delivery` | Signatur-Trailer + Artefaktformat |
| Transport | `Aegis-Transport` | `modules/p2p-crypto-transfer` | WebRTC + AES-GCM-Chunks |
| Tresor | `Aegis-Vault` | `modules/encrypted-archive` | OPFS + AES-GCM-256-Archiv |
| Audit | `Aegis-AuditTrail` | `modules/audit-timeline` | SHA-256 hash-verkettete Zeitachse |
| Canvas | `Aegis-Canvas` | `modules/sync-canvas` | Echtzeit-Kollaborationsboard |

`aegis-shell/src/sdk.js` veröffentlicht `window.AegisSDK`, eine dokumentierte Fassade über
denselben EventBus. Siehe Abschnitt 12 der englischen `README.md`.

---

## 4 — Schnellstart

```bash
cd /pfad/zu/Aegis
node server.js            # http://localhost:8099
```

Öffnen Sie `http://localhost:8099` in **Chrome oder Edge 113+**. Dann:

1. Warten Sie, bis die Topologie gerendert ist; ziehen Sie/scrollen Sie zur Navigation.
2. **Klicken Sie einen Knoten** — das Redaktionspanel lädt automatisch den Vertrag dieses Knotens.
3. Prüfen Sie die erkannten schwarzen Kästen; schalten Sie Regeln bei Bedarf um.
4. Klicken Sie **Send & Sign to Peer**. Ab hier läuft die Schleife automatisch: das PDF wird
   gehasht, signiert, gestreamt, verifiziert, und der Button **Archive to Vault** leuchtet auf.
5. Klicken Sie **Archive to Vault**, geben Sie ein Passwort (>= 8 Zeichen) ein, **Seal to vault**.
   Der siebenstufige Stepper wird vollständig grün.

---

## 5 — Zero-Trust-Garantien (und ihre Grenzen)

- **Topologie**: rein lokales WebGPU; der Server liefert nur statische Bytes.
- **Dokument**: Tesseract/pdf.js/pdf-lib sind lokal eingebettet; ein Offline-Guard blockiert
  jeden Cross-Origin-Aufruf. Exportierte PDFs enthalten **keine wiederherstellbare Textschicht**.
- **Übertragung**: der Signaling-Server leitet nur SDP/ICE weiter. Datei-Bytes und der
  AES-Schlüssel (PBKDF2 aus einem Passwort) **erreichen niemals den Server**.
- **Signatur**: Schlüssel werden im Browser durch Web Crypto erzeugt. Der private Schlüssel ist
  nicht extrahierbar und wird nie serialisiert; nur der Base64-SPKI-Öffentliche Schlüssel reist.
- **Archiv**: AES-GCM-256 unter einem PBKDF2-SHA-256-Schlüssel (250.000 Iterationen, Salt pro
  Datensatz), geschrieben als opaker `.aegis`-Container in OPFS. Das Passwort wird einmal genutzt.
- **Audit**: jede Stufe hängt `SHA-256(vorherigerHash | canonical(eintrag))` an eine lokale
  Hashkette an; das Bearbeiten einer Verknüpfung ungültigt jede spätere Verknüpfung.

---

## 6 — Sicherheits-Härtung (Audit-Status)

Die Lieferung hat ein unabhängiges Sicherheitsaudit durchlaufen. Die statische
Dateiauslieferung ist hart gesperrt: `config/`, `data/` und `server/` werden auf
Top-Level-Ebene nie ausgeliefert, ebenso Datenbank-Sidecars (`.db/.db-shm/.db-wal`) und
Quellcode-Dateien. `config/local.json` (enthält das `issuerSecret`) und die SQLite-DB werden
**niemals** in das Lieferpaket aufgenommen (B-03). `/session` ist fail-closed (401 ohne/
mit falschem Token). Optional: OIDC (auth-code flow, RS256 id_token-Verifikation), SCIM 2.0
-Bereitstellung mit Token-Rotation/-Widerruf, und TOTP-MFA (AES-256-GCM-versiegelte Seeds).

---

## 7 — Konformitätsdokumente

`docs/compliance/` enthält ROPA (GDPR Art. 30), DPA, SLA, PRIVACY-POLICY, THREAT-MODEL,
SOC2-EVIDENCE, SCIM, CRA-NIS2, DATA-RESIDENCY, INCIDENT-RESPONSE, DR-BACKUP, ACCESS-REVIEW,
VPAT-2.5-EU und die NODE-SECURITY-BASELINE. **Hinweis:** ROPA/SLA/DPO-Kontaktdaten sind als
Platzhalter ausgewiesen und müssen vom Controller vor Inbetriebnahme ausgefüllt werden.

---

## 8 — Lizenz

Aegis ist **Open Source** unter der **Apache License 2.0** — siehe `LICENSE`.
Sie dürfen die Software nutzen, verändern, weitergeben und auch kommerziell
verkaufen, ohne zu zahlen und ohne Genehmigung. Pflichten sind nur die der
Apache-2.0: Lizenz- und Urheberhinweise erhalten, wesentliche Änderungen
kennzeichnen.

**Kostenlos:** die Software — jede First-Party-Datei in diesem Repository.
Kein Lizenzpreis, keine Sitzplatzgrenze, keine Umsatzschwelle.

**Kostenpflichtig (optional):** unsere Zeit. Deployment, Integration,
Security-Reviews, SBOM/CRA-Pakete und Jahres-Support sind Dienstleistungen
(siehe `PRICING.md`). Ein Supportvertrag ist für die Nutzung nie erforderlich.

**Drittanbieter** behalten ihre eigenen Lizenzen (siehe `NOTICE` und die
`LICENSE`-Dateien unter `vendor/`). Apache-2.0 lizenziert sie nicht neu.
