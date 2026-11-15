<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/QUICK-START.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Quick Start

## 1. Installieren & bootstrap
```
git clone <your-registry>/aegis && cd aegis
npm run setup          # prompts for an operator account; default password = AEGIS_ISSUER_SECRET
npm start              # serves http://localhost:8080
```
Offen `http://localhost:8080` in **Chrome oder Kante 113+** (SharedArrayBuffer für der
WebGPU Topologie erfordert COOP/COEP, welche Aegis Mengen).

## 2. Workbench — der seven-step geschlossen Schleife
1. Select ein source node in Topologie. 2. Last ein Dokument. 3. Schwärzen. 4. Sign
(hasht + Signatur). 5. Senden. 6. Erhalten. 7. Prüfen → Siegel. Der Schleife kann nicht go
backwards; dies invariant ist gesperrt durch `aegis-shell/tests/flow.test.mjs`.

## 3. Bediener Konsole — `aegis-shell/console.html`
Protokoll in as Bediener, dann verwenden Registerkarten:
- **Audit** — nur-appendierbar Audit-Trail (Export CSV/JSON).
- **Revoke** — Widerruf Liste management.
- **Schlüssel Hinterlegung** — break-glass deposit/retrieve.
- **TSA prüfen** — RFC 3161 Zeitstempel Prüfung.
- **Compliance** — betreten Ihr echt rechtlich Fakten (Verantwortlicher, DPO, EU rep, SLA, bestimmend
  Gesetz, authority) + Upload signiert ROPA/DPA/SLA/DPO letter/logo; erzeugen ausgefüllt
  Vorlagen.
- **Setup** — pre-deploy Checkliste (Export sign-off).
- **Daten Betroffene** — DSAR Export (Art.20) + Löschung (Art.17) + tombstone prüfen.
- **Sitzungen** — list/revoke Bediener Sitzungen.
- **Konfiguration** — read-only Konfiguration reflection + sicher toggles (Hinterlegung, MFA enforce), SIEM
  forward URL, Vorfall Test, Admin MFA reset, DB Sicherung.

## 4. Pre-deploy Checkliste
Work durch `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` (auch der in-Konsole Setup
Registerkarte). Set `AEGIS_ISSUER_SECRET` eindeutig pro Umgebung, push Bild zu **Ihr eigen**
Registry, enable TLS über ein umkehren Proxy, und vollständig Compliance Fakten.

## 5. Produktion Bereitstellung
Siehe `deploy/` (docker-compose, Kubernetes/Helm, systemd, nginx/Caddy) und
`docs/compliance/ACR-PRIVATE-REGISTRY.md`. Niemals bake Geheimnisse in Bild.
