<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: adapters/tsa-rfc3161/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis · RFC 3161 TSA Adapter (`tsa-rfc3161`)

> **Dies ist ein Optional, removable Adapter. Es ist Nicht Teil von Aegis Vertrauen
> Kernel. Removing dies Verzeichnis und der `--adapter-tsa` Schalter lässt Aegis vollständig
> functional — Hash-Kette, ECDH/ECDSA Kryptografie, LAN Relay, und Topologie rendern
> sind untouched. Der Adapter nur leitet weiter ein Hash zu ein extern Time-Stamp
> Authority und gibt zurück der roh Token.**

EN – Englisch
----------

### Was es macht
Receives ein SHA-256 Prüfsumme (e.g. Aegis chain Kopf, ein FieldSeal `sealHash`, oder ein
C2PA Ergebnis Hash), sendet ein RFC 3161 `TimeStampReq` zu ein konfiguriert TSA über
HTTP/HTTPS, und gibt zurück CMS `TimeStampToken` (Basis64) plus best-effort
Metadaten (`genTime`, `serialNumber`, `nonce`).

### Entwurf Regeln (schwer)
- **Forwarder nur.** Es niemals signiert, niemals timestamps, und niemals prüft der
  TSA Zertifikat chain. Der Token ist returned **as erhalten** — nicht re-signed,
  nicht cached, nicht mutated.
- **Null Drittanbieter Code.** Nur Node built-ins (`node:crypto`, `node:http`,
  `node:https`). Der ASN.1 DER codec ist hand-rolled. Kein `asn1js` / `pkijs`.
- **Schlägt fehl sicher.** Irgendein Netzwerk Fehler, timeout, oder 4xx/5xx yields
  `{ tsaStatus: 'failed', ... }`. Es niemals wirft und niemals takes Aegis
  Service down.
- **Kein hardcoded Anbieter.** Kein TSA URL, API Schlüssel, oder Zertifikat ist embedded.
  Bediener supply sie über `--tsa-config` oder env vars.

### Enable / deaktivieren
```bash
# OFF (default) — Aegis behaves exactly as before
node server.js

# ON with a config file (recommended; supports multiple TSA failover entries)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### Schnittstelle
`POST /adapter/tsa/submit` (registriert nur wenn Adapter ist aktiviert):
```jsonc
// request
{
  "digest": "<64-char hex sha256>",
  "digestAlgorithm": "sha256",
  "tsaEndpoint": "https://freetsa.org/tsr",      // optional if config provides one
  "tsaAuth": { "type": "none" | "basic" | "token", "value": "..." },
  "requestNonce": true
}
// response (fixed schema; tsaStatus is the only discriminator)
{
  "tsaStatus": "ok" | "failed",
  "originalDigest": "<hex>",
  "timestampTokenBase64": "<CMS token, raw>",
  "tstInfo": { "genTime": "ISO", "serialNumber": "string", "nonce": "hex|null" },
  "tsaProvider": "label",
  "verifyHint": "...",
  "error": "..."   // present only on failure
}
```

### Zugriff control (RBAC hook)
Der vollständig account/RBAC System ist ein separat deliverable. Today Endpunkt ist
offen wie Rest von Relay, aber two optional Gates exist:
- `AEGIS_ADAPTER_TOKEN` env → require `Authorization: Bearer <token>`.
- `allowRoles: ["operator","admin"]` in Konfiguration → reject others über
  `X-Aegis-Role` Kopfzeile (so ein read-only Auditor kann nicht submit).

### GDPR / Daten minimization
Aegis sendet **nur Prüfsumme** zu TSA — niemals Dokument, Datei Bytes, oder
irgendein Schlüssel. Der TSA daher kann nicht siehe Ihr Inhalt, nur ein one-way Hash. Wählen
ein EU/DigiCert-class Anbieter wenn Sie brauchen ein qualifiziert Zeitstempel für EU matters.

### Rechtlich disclaimer
Aegis bietet ein RFC 3161 Zeitstempel *credential*. Es macht **kein Behauptung** about
rechtlich effect. Whether Zeitstempel ist admissible, und unter welche qualifiziert
Zertifikat, ist decided durch Ihr jurisdiction und TSA Anbieter's Zertifikat
chain. Prüfen Token offline gegen TSA Wurzel CA.

---

DE – Deutsch
-----------

### War es macht
Empfängt einen SHA-256-Hash (z. B. den Aegis-Kettenkopf, ein FieldSeal-`sealHash`
oder ein C2PA-Ergebnis-Hash), sendet eine RFC-3161-`TimeStampReq` ein eine
konfigurierte TSA über HTTP/HTTPS und liefert CMS-`TimeStampToken` (Basis64)
sowie Metadaten (`genTime`, `serialNumber`, `nonce`) zurück.

### Harte Designregeln
- **Nur Weiterleitung.** Es signiert, erzeugt oder prüft keine TSA-Zertifikatskette.
  Das Token wird **wie empfangen** zurückgegeben — nicht neu signiert, nicht
  zwischengespeichert, nicht verändert.
- **Keine Fremdabhängigkeiten.** Nur Node-Built-ins. Der ASN.1-DER-Codec ist
  selbst implementiert. Kein `asn1js` / `pkijs`.
- **Sicheres Fehlerverhalten.** Jeder Netzwerkfehler, Timeout oder 4xx/5xx liefert
  `{ tsaStatus: 'failed', ... }`. Nie ein Absturz des Aegis-Dienstes.
- **Kein eingebetteter Anbieter.** Keine TSA-URL, kein API-Schlüssel, kein Zertifikat
  fest im Code.

### Aktivieren / Deaktivieren
```bash
node server.js                                          # AUS (Standard)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### DSGVO / Datenminimierung
Aegis sendet **nur den Hash** ein sterben TSA — nie Dokument, Dateiinhalte oder
Schlüssel. Sterben TSA sieht nur einen Einweg-Hash, nicht Ihren Inhalt.

### Rechtlicher Hinweis
Aegis stellt eine RFC-3161-Zeitstempel-*Bescheinigung* bereit und trifft **keine
Aussage über rechtliche Wirkung**. Zulässigkeit und Qualifizierung richten sich
nach Ihrer Rechtsordnung und Zertifikatskette des TSA-Anbieters.
