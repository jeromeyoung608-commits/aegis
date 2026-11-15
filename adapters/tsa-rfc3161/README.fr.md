<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: adapters/tsa-rfc3161/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis · RFC 3161 TSA Adaptateur (`tsa-rfc3161`)

> **Ce est un Facultatif, removable adaptateur. Il est Ne pas partie de le Aegis confiance
> noyau. Removing ce répertoire et le `--adapter-tsa` indicateur laisse Aegis entièrement
> functional — le chaîne d'empreintes, ECDH/ECDSA cryptographie, LAN relais, et topologie rendre
> sont untouched. Le adaptateur uniquement transmet un empreinte à un externe Time-Stamp
> Authority et retourne le brut jeton.**

EN – Anglais
----------

### Quoi il fait
Receives un SHA-256 empreinte (e.g. le Aegis chain tête, un FieldSeal `sealHash`, ou un
C2PA résultat empreinte), envoie un RFC 3161 `TimeStampReq` à un configuré TSA au-dessus de
HTTP/HTTPS, et retourne le CMS `TimeStampToken` (base64) plus best-effort
métadonnées (`genTime`, `serialNumber`, `nonce`).

### Conception règles (difficile)
- **Forwarder uniquement.** Il jamais signe, jamais timestamps, et jamais vérifie le
  TSA certificat chain. Le jeton est returned **as reçu** — ne pas re-signed,
  ne pas cached, ne pas mutated.
- **Zéro tiers code.** Uniquement Node built-ins (`node:crypto`, `node:http`,
  `node:https`). Le ASN.1 DER codec est hand-rolled. Aucun `asn1js` / `pkijs`.
- **Échoue sûr.** Aucun réseau erreur, timeout, ou 4xx/5xx yields
  `{ tsaStatus: 'failed', ... }`. Il jamais lève et jamais takes le Aegis
  service down.
- **Aucun hardcoded Prestataire.** Aucun TSA URL, API clé, ou certificat est embedded.
  Opérateurs supply eux via `--tsa-config` ou env vars.

### Enable / désactiver
```bash
# OFF (default) — Aegis behaves exactly as before
node server.js

# ON with a config file (recommended; supports multiple TSA failover entries)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### Interface
`POST /adapter/tsa/submit` (enregistré uniquement quand le adaptateur est activé):
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

### Accès control (RBAC hook)
Le complet account/RBAC système est un séparé deliverable. Today le point de terminaison est
ouvert comme le reste de le relais, mais two facultatif gates exist:
- `AEGIS_ADAPTER_TOKEN` env → require `Authorization: Bearer <token>`.
- `allowRoles: ["operator","admin"]` dans configuration → reject others via
  `X-Aegis-Role` en-tête (donc un read-only Auditor ne peut pas submit).

### GDPR / données minimization
Aegis envoie **uniquement le empreinte** à le TSA — jamais le document, fichier octets, ou
aucun clé. Le TSA donc ne peut pas voir votre contenu, uniquement un one-way empreinte. Choisir
un EU/DigiCert-class Prestataire si vous besoin un qualifié horodatage pour UE matters.

### Juridique disclaimer
Aegis fournit un RFC 3161 horodatage *credential*. Il fait **aucun allégation** about
juridique effect. Whether le horodatage est admissible, et sous lequel qualifié
certificat, est decided par votre jurisdiction et le TSA Prestataire's certificat
chain. Vérifier le jeton hors ligne contre le TSA racine CA.

---

DE – Deutsch
-----------

### Était es macht
Empfängt einen SHA-256-empreinte (z. B. den Aegis-Kettenkopf, ein FieldSeal-`sealHash`
oder ein C2PA-Ergebnis-empreinte), sendet eine RFC-3161-`TimeStampReq` un eine
konfigurierte TSA über HTTP/HTTPS und liefert das CMS-`TimeStampToken` (base64)
sowie Metadaten (`genTime`, `serialNumber`, `nonce`) zurück.

### Harte Designregeln
- **Nur Weiterleitung.** Es signiert, erzeugt oder prüft keine TSA-Zertifikatskette.
  Das jeton wird **wie empfangen** zurückgegeben — nicht neu signiert, nicht
  zwischengespeichert, nicht verändert.
- **Keine Fremdabhängigkeiten.** Nur Node-Built-ins. Der ASN.1-DER-Codec ist
  selbst implementiert. Kein `asn1js` / `pkijs`.
- **Sicheres Fehlerverhalten.** Jeder Netzwerkfehler, Timeout oder 4xx/5xx liefert
  `{ tsaStatus: 'failed', ... }`. Nie ein Absturz des Aegis-Dienstes.
- **Kein eingebetteter Anbieter.** Keine TSA-URL, kein API-clé, kein Zertifikat
  fest im Code.

### Aktivieren / Deaktivieren
```bash
node server.js                                          # AUS (Standard)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### DSGVO / Datenminimierung
Aegis sendet **nur den empreinte** un mourir TSA — nie das Dokument, Dateiinhalte oder
Schlüssel. Mourir TSA sieht nur einen Einweg-empreinte, nicht Ihren Inhalt.

### Rechtlicher Hinweis
Aegis stellt eine RFC-3161-Zeitstempel-*Bescheinigung* bereit und trifft **keine
Aussage über rechtliche Wirkung**. Zulässigkeit und Qualifizierung richten sich
nach Ihrer Rechtsordnung und der Zertifikatskette des TSA-Anbieters.
