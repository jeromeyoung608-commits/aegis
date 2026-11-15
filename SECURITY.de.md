<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: SECURITY.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Sicherheit Richtlinie

## Sicherheit Support Zeitraum (CRA Art. 13)
Aegis v1.0.0 hat ein declared Sicherheit Support Zeitraum von **5 years von erste
publication: 2026-11-15 → 2031-11-15**. Während dies Zeitraum der manufacturer
bietet Sicherheit aktualisiert und vulnerability remediation. Der Ende Datum ist
disclosed zu Kunden bei Zeit von purchase (CRA Art. 13(19)); der rationale
für Zeitraum ist aufgezeichnet in der technical Dokumentation (Art. 13(8)).

| Version | Supported | Sicherheit Support bis |
|---------|-----------|------------------------|
| 1.0.x | ✅ | 2031-11-15 |

## Reporting ein vulnerability (coordinated disclosure / CVD)
Aegis ist ein Privacy-first, local-processing tool. Wenn Sie find ein vulnerability,
**do nicht offen ein offentlich Problem** mit exploit details. Stattdessen, Bericht privately zu
Maintainer bei **jeromeyoung608@gmail.com** (auch published in
`.well-known/security.txt`) und include:
- ein description und impact,
- Schritte zu reproduce,
- affected Version (`Aegis` Version von `package.json`).

Wir aim zu acknowledge innerhalb **5 Geschäft Tage** und zu provide ein remediation
Zeitleiste innerhalb **30 Tage** für bestätigt Probleme.

## Umfang
In Umfang: Aegis Server (`server.js`, `server/store.js`), TSA Adapter
(`adapters/tsa-rfc3161`), und Bediener Konsole (`aegis-shell/console.html`).
Außer von Umfang: der underlying Browser, Node.js Laufzeit, und irgendein Drittanbieter TSA Sie
configure.

## Sicherheit posture (summary)
- Null **npm** Laufzeit Abhängigkeiten. Browser modules vendor Drittanbieter libraries (PDF.JS, pdf-lib, Tesseract.JS) committed unter jeder Modul's `vendor/` Verzeichnis; der SBOM (`scripts/gen-sbom.mjs`) lists alle von sie — und der dev/test `playwright` tooling — honestly. Der "null Abhängigkeiten" Behauptung gilt zu der **Kern Kernel** (`crypto / hash-chain / audit / signaling / redaction render`); es ist nicht ein Behauptung das der entire Produkt enthält kein Drittanbieter Code.
- Serverblind Übertragung: Relay speichert nur opak Chiffretext.
- Token-gated Signalisierung + pro IP Rate limiting.
- Bediener-only Audit / Widerruf / Hinterlegung APIs.
- Lokal CRL-style Widerruf checked bei Sitzung Zulassung.
- GDPR Art. 17 Löschung mit beibehalten Compliance markers.

## Netzwerk exposure & Bereitstellung Härtung

**Durch Standard Server bindet zu alle Netzwerk interfaces** (`server.listen(PORT)` mit kein
host argument → `0.0.0.0` / `::`). Der statisch Konsole UI, Token-gated Signalisierung
Relay, und Metriken Endpunkt sind daher reachable von **irgendein host das kann route
zu der port** (Standard `8099`, oder `PORT`). Dies ist intentional für ein single-Bediener
lokal Workbench, aber es ist **nicht** sicher zu expose roh auf ein geteilt / untrusted Netzwerk.

Bereitstellung Regeln:
- **Put Aegis hinter ein umkehren Proxy** (nginx, Caddy, Traefik, oder Ihr LoadBalancer) das
  terminates TLS, enforces authenticated Zugriff, und restricts source IPs / CIDR ranges.
  Do nicht publish der roh Node port zu der internet oder ein geteilt LAN segment.
- Der umkehren Proxy ist auch wo Sie soll expose `/metrics` **nur wenn** Sie haben Set
  `AEGIS_METRICS_TOKEN` (es ist Fail-Closed anderenfalls — siehe
  `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md`). Behalten Metriken hinter der proxy's ACL.
- **Niemals** Set `AEGIS_TRUSTED_LAN=1` auf ein geteilt oder Produktion Netzwerk — es relaxes der
  `/session` Zulassung control für lab verwenden nur und ist ausdrücklich unsafe über hinaus localhost.
- Der Bediener Konsole und Signalisierung Relay beide require ein Bediener Sitzung / Aussteller
  Geheimnis; der statisch UI ist unauthenticated durch Entwurf (es ist ein Anmeldung screen), so der
  Proxy muss enforce wer darf reach es.

Siehe `docs/compliance/THREAT-MODEL.md` und `docs/compliance/CRA-NIS2.md` für der
vollständig analysis. **Ein unabhängig Drittanbieter Penetration Test ist noch erforderlich
vor irgendein Produktion Bereitstellung Behauptung.**

## CRA Vorfall reporting commitment
Für vulnerabilities das qualify as ein **severe Vorfall** unter EU Cyber
Resilience Act (Regulation (EU) 2024/2847, Art. 14/71), der manufacturer commits
zu der following reporting Zeitleiste zu der competent authority (BSI in Germany):

- **Innerhalb 24 hours** von becoming aware: ein early warning (Art. 14(2));
- **Innerhalb 72 hours**: ein vulnerability Benachrichtigung / Vorfall Bericht mit der
  available details (Art. 14(3));
- **Innerhalb 14 Tage**: ein endgültig Bericht mit Wurzel verursachen und remediation (Art. 14(4)),
  oder ein reasoned delay wo Fakten sind noch unter investigation.

Hinweis: der CRA reporting Pflichten haben angewendet since **2026-09-11**. Wo Aegis
ist bereits supplied in EU, diese sind aktuell Pflichten, nicht future plans.
⚠️ Dies commitment ist ein commercial/process statement, nicht rechtlich advice; der genau
Auslöser, authority und irgendein micro/small-enterprise exemptions muss sein bestätigt durch
qualifiziert Rechtsberatung.
