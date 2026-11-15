<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ARCHITECTURE.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Architektur

Aegis ist ein einzeln Node.js Prozess (`server.js`) mit **null npm Abhängigkeiten** —
nur `node:*` built-ins. Es liefert aus two surfaces von eine port: der `aegis-shell`
workbench/console (statisch) und der JSON API.

## Layers
- **Transport** — `http`/`https` (optional TLS von `AEGIS_TLS_DIR`); COOP/COEP +
  per-response Nonce CSP.
- **Statisch** — `serveStatic` confined zu Web Wurzel mit ein **obstersten deny Liste**
  (`config`, `data`, `server`) und ein deny-extension Liste (`.db*`) — privat Pfade sind
  niemals ausgeliefert (B-01~B-04).
- **API** — Bediener-gated endpoints (`operatorAuthorized`): Compliance, Sitzungen,
  Konfiguration, Admin Sicherung; plus OIDC, SCIM, TSA, Hinterlegung, Audit, MFA.
- **Speicher** — embedded `node:sqlite` (`server/store.js`): Konten (TOTP versiegelt
  AES-256-GCM), Sitzungen, Audit-Trail (nur-appendierbar, non-erasable für Bediener),
  revocations, Hinterlegung, SCIM Token, MFA Wiederherstellung codes.
- **Modules** — `modules/oidc` (RS256 `id_token` Prüfung über `node:crypto`),
  `modules/scim` (SCIM 2.0 CRUD + Deprovisionierung).
- **Adapters** — `adapters/tsa-rfc3161` (RFC 3161 Zeitstempel signing/verification).

## Vertrauen boundaries
- Der Web Wurzel ist untrusted Eingabe; der deny Liste ist der schwer Grenze.
- Bediener endpoints require ein Sitzung oder Aussteller Geheimnis — ein presentation Rolle
  switch in Shell ist **nicht** ein access-control Grenze.
- `data/` und `config/` sind Laufzeit volumes, excluded von Lieferung Paket
  (B-03): kein Bediener Geheimnis oder fact ever liefert aus.

## Identität & Bereitstellung
Lokal Konten (`npm run setup`), OIDC (Opt-in), SCIM Bereitstellung, TOTP MFA, GDPR
Löschung mit tombstone Hash-Bildung. Siehe `docs/compliance/OIDC-PROVIDERS.md` und
`SCIM-CONNECTORS.md`.
