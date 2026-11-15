<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: adapters/tsa-rfc3161/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis · RFC 3161 TSA Adaptador (`tsa-rfc3161`)

> **Este es un Opcional, removable adaptador. Esto es No parte de el Aegis confianza
> núcleo. Removing este directorio y el `--adapter-tsa` indicador deja Aegis completamente
> functional — el cadena de hash, ECDH/ECDSA criptografía, LAN relé, y topologíun renderizar
> son untouched. El adaptador solo reenvía un hash a un externo Time-Stamp
> Authority y retorna el crudo token.**

EN – Inglés
----------

### Qué esto hace
Receives un SHA-256 digest (e.g. el Aegis chain cabeza, un FieldSeal `sealHash`, o un
C2PA resultado hash), envía un RFC 3161 `TimeStampReq` a un configurado TSA sobre
HTTP/HTTPS, y retorna el CMS `TimeStampToken` (base64) más best-effort
metadatos (`genTime`, `serialNumber`, `nonce`).

### Diseño reglas (difícil)
- **Forwarder solo.** Esto nunca firma, nunca timestamps, y nunca verifica el
  TSA certificado chain. El token es returned **as recibido** — no re-signed,
  no cached, no mutated.
- **Cero tercero código.** Solo Node built-ins (`node:crypto`, `node:http`,
  `node:https`). El ASN.1 DER codec es hand-rolled. Ningún `asn1js` / `pkijs`.
- **Falla seguro.** Cualquiera red error, timeout, o 4xx/5xx yields
  `{ tsaStatus: 'failed', ... }`. Esto nunca lanza y nunca takes el Aegis
  servicio down.
- **Ningún hardcoded Proveedor.** Ningún TSA URL, API clave, o certificado es embedded.
  Operadores supply ellos vía `--tsa-config` o env vars.

### Enable / desactivar
```bash
# OFF (default) — Aegis behaves exactly as before
node server.js

# ON with a config file (recommended; supports multiple TSA failover entries)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### Interfaz
`POST /adapter/tsa/submit` (registrado solo cuando el adaptador es activado):
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

### Acceso control (RBAC hook)
El completo account/RBAC sistema es un separado deliverable. Today el endpoint es
abierto como el resto de el relé, pero two opcional gates exist:
- `AEGIS_ADAPTER_TOKEN` env → require `Authorization: Bearer <token>`.
- `allowRoles: ["operator","admin"]` en configuración → reject others vía
  `X-Aegis-Role` encabezado (así un read-only Auditor no puede submit).

### GDPR / datos minimization
Aegis envía **solo el digest** a el TSA — nunca el documento, archivo bytes, o
cualquiera clave. El TSA por lo tanto no puede véase su contenido, solo un one-way hash. Elegir
un EU/DigiCert-class Proveedor si usted necesitar un cualificado marca de tiempo para UE matters.

### Legal disclaimer
Aegis proporciona un RFC 3161 marca de tiempo *credential*. Esto hace **ningún afirmación** about
legal effect. Whether el marca de tiempo es admissible, y bajo cuál cualificado
certificado, es decided por su jurisdiction y el TSA Proveedor's certificado
chain. Verificar el token sin conexión contra el TSA raíz CA.

---

DE – Deutsch
-----------

### Era es macht
Empfängt einen SHA-256-hash (z. B. den Aegis-Kettenkopf, ein FieldSeal-`sealHash`
oder ein C2PA-Ergebnis-hash), sendet eine RFC-3161-`TimeStampReq` un eine
konfigurierte TSA über HTTP/HTTPS und liefert das CMS-`TimeStampToken` (base64)
sowie Metadaten (`genTime`, `serialNumber`, `nonce`) zurück.

### Harte Designregeln
- **Nur Weiterleitung.** Es signiert, erzeugt oder prüft keine TSA-Zertifikatskette.
  Das token wird **wie empfangen** zurückgegeben — nicht neu signiert, nicht
  zwischengespeichert, nicht verändert.
- **Keine Fremdabhängigkeiten.** Nur Node-Built-ins. Der ASN.1-DER-Codec ist
  selbst implementiert. Kein `asn1js` / `pkijs`.
- **Sicheres Fehlerverhalten.** Jeder Netzwerkfehler, Timeout oder 4xx/5xx liefert
  `{ tsaStatus: 'failed', ... }`. Nie ein Absturz des Aegis-Dienstes.
- **Kein eingebetteter Anbieter.** Keine TSA-URL, kein API-clave, kein Zertifikat
  fest im Código.

### Aktivieren / Deaktivieren
```bash
node server.js                                          # AUS (Standard)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### DSGVO / Datenminimierung
Aegis sendet **nur den hash** un morir TSA — nie das Dokument, Dateiinhalte oder
Schlüssel. Morir TSA sieht nur einen Einweg-hash, nicht Ihren Inhalt.

### Rechtlicher Hinweis
Aegis stellt eine RFC-3161-Zeitstempel-*Bescheinigung* bereit und trifft **keine
Aussage über rechtliche Wirkung**. Zulässigkeit und Qualifizierung richten sich
nach Ihrer Rechtsordnung und der Zertifikatskette des TSA-Anbieters.
