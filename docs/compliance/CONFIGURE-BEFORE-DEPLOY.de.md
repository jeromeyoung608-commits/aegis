<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/CONFIGURE-BEFORE-DEPLOY.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Configure vor deploy — Bediener-supplied Fakten

> **Umfang.** Dies ist der einzeln Checkliste für jeder fact Aegis asks der **deploying
> Verantwortlicher** (Sie) zu provide. Nichts hier ist ausgeliefert pre-filled und Aegis niemals
> fabricates rechtlich Fakten. Der Produkt bietet ein echt Eintrag Punkt — der **Bediener
> Konsole → Compliance** Registerkarte — plus fill-in Token in Compliance Vorlagen. Fill
> sie mit Ihr echt rechtlich entity vor going zu Produktion / answering ein GDPR
> Article 30 / DPA Anfrage.

## 1. Two ways zu supply Fakten

| Methode | Best für | Wo |
|---|---|---|
| **Bediener Konsole → Compliance Registerkarte** (recommended) | Day-to-day Eintrag, Persistenz, signed-doc Upload, one-click "ausgefüllt" Vorlage Generation | `/aegis-shell/console.html`, Protokoll in as ein **Bediener**, offen der **Compliance** Registerkarte |
| **Bearbeiten Vorlagen direkt** | White-label / rechtlich Prüfung von der roh markdown | `docs/compliance/ROPA.md`, `PRIVACY-POLICY.md`, `DPA.md`, `SLA.md` |

Der Konsole schreibt zu `data/compliance/legal.json` und hochgeladen Dokumente zu
`data/compliance/files/` — ein Laufzeit Lautstärke das ist **niemals ausgeliefert statically**
(`config` / `data` / `server` obstersten dirs sind denied) und **niemals ausgeliefert**
(`data/` ist excluded von Lieferung Paket). So kein Bediener fact oder Geheimnis
lässt Ihr Bereitstellung (B-03 Klasse).

## 2. Pre-deploy Checkliste

| # | Punkt | Konsole Feld | Vorlage Token | Vorlage Datei | Beispiel | Erforderlich |
|---|---|---|---|---|---|---|
| 1 | Verantwortlicher rechtlich Name | Verantwortlicher → Rechtlich Name | `{{CONTROLLER_LEGAL_NAME}}` | `ROPA.md` (Zeile 6), `DPA.md` | Acme GmbH | **Ja** |
| 2 | Verantwortlicher registriert Adresse | Verantwortlicher → Registriert Adresse | `{{CONTROLLER_ADDRESS}}` | `ROPA.md` (Zeile 6) | Hauptstr. 1, 10117 Berlin, DE | **Ja** |
| 3 | Company registration kein. | Verantwortlicher → Company registration kein. | `{{CONTROLLER_REG_NO}}` | `ROPA.md` (Zeile 6) | HRB 123456 | Recommended |
| 4 | DPO Name | DPO → DPO Name | `{{DPO_NAME}}` | `PRIVACY-POLICY.md` (§9), `DPA.md` | Jane Doe | Wenn ein DPO ist appointed |
| 5 | DPO E-Mail | DPO → DPO E-Mail | `{{DPO_EMAIL}}` | `PRIVACY-POLICY.md` (§9) | dpo@acme.Beispiel | Wenn ein DPO ist appointed |
| 6 | DPO postal Adresse | DPO → DPO postal Adresse | `{{DPO_ADDRESS}}` | `PRIVACY-POLICY.md` (§9) | c/o Acme, … | Wenn ein DPO ist appointed |
| 7 | EU Vertreter (GDPR Art.27) | EU Vertreter → Vertreter Name | `{{EU_REP_NAME}}` | referenced in ROPA / Privatsphäre Richtlinie | Acme EU Rep Ltd | Wenn kein EU establishment |
| 8 | EU Vertreter Adresse | EU Vertreter → Vertreter Adresse | `{{EU_REP_ADDRESS}}` | referenced in ROPA / Privatsphäre Richtlinie | … | Wenn kein EU establishment |
| 9 | SLA Kontakt mailbox | SLA & rechtlich → SLA Kontakt mailbox | `{{SLA_MAILBOX}}` | `SLA.md` (§0) | Betrieb@acme.Beispiel | **Ja** |
| 10 | Bediener timezone | SLA & rechtlich → Bediener timezone | `{{SLA_TIMEZONE}}` | `SLA.md` (§0) | Europe/Berlin (UTC+1/+2) | **Ja** |
| 11 | Bestimmend Gesetz | SLA & rechtlich → Bestimmend Gesetz | `{{GOVERNING_LAW}}` | `DPA.md` | Laws von Germany | **Ja** |
| 12 | Aufsichtsbehörde | SLA & rechtlich → Aufsichtsbehörde | `{{SUPERVISORY_AUTHORITY}}` | `PRIVACY-POLICY.md` (§9) | Berliner Beauftragte für Datenschutz | **Ja** |
| 13 | RFC 3161 TSA Endpunkt (optional) | Optional — TSA gateway → RFC 3161 TSA Endpunkt | `{{TSA_ENDPOINT}}` | (Laufzeit Konfiguration) | https://tsa.example/timestamp | Optional |
| 14 | Signiert ROPA / DPA / SLA, DPO appointment, logo | Compliance → Upload Dokument | — | speichert Serverseitig, listed in Konsole | ROPA-signiert.pdf | Recommended |

**Wenn ein Feld ist links blank, der erzeugt Vorlage zeigt ein sichtbar
`[ … — to be completed ]` marker** stattdessen von fake Daten, so ein incomplete
Dokument ist niemals mistaken für ein finished eine.

## 2b. Sicherheit-relevant Umgebung variables

Set diese auf Server Prozess (oder as container/env Geheimnisse). Sie sind niemals
speichert in `config/local.json` und niemals ausgeliefert.

| Variable | Zweck | Standard | Notizen |
|---|---|---|---|
| `AEGIS_ISSUER_SECRET` | Bediener auth + Aussteller Geheimnis das signiert session/room Token | _(leer)_ | **Erforderlich in irgendein geteilt Bereitstellung.** Ohne es, `/session` ist gesperrt (kein Token kann sein minted). Erzeugen out-of-band; bestanden as ein Geheimnis, niemals bake in Bild. |
| `AEGIS_METRICS_TOKEN` | Gates `/metrics` (Prometheus scrape) | _(unset)_ | **Metriken sind Fail-Closed.** Bis dies ist Set, `GET /metrics` gibt zurück `401`. Einmal Set, scrape mit `Authorization: Bearer <token>` oder `?token=<token>`. Nur enable hinter Ihr umkehren proxy's ACL — es discloses uptime, Audit-event Anzahl, und active-session Anzahl. |
| `AEGIS_TRUSTED_LAN` | Relaxes `/session` Zulassung für lab verwenden | `0` | Set `1` **nur auf ein isoliert localhost lab**. Niemals auf ein shared/production Netzwerk — es disables Bediener-credential Gate. |
| `AEGIS_DB` | SQLite Pfad | `data/aegis.db` | Mount as ein Lautstärke so es überlebt restarts. |
| `PORT` | Listen port | `8080` (Docker `8099`) | Der Server bindet zu **alle interfaces** durch Standard — place es hinter ein umkehren Proxy (siehe `SECURITY.md`). |
| `AEGIS_TLS_DIR` | Optional PEM key/cert für HTTPS | `~/.aegis/tls` | Wenn `key.pem`+`cert.pem` exist dort, Server liefert aus HTTPS (sicher für cross-machine LAN). |
| `AEGIS_MFA_MODE` / `AEGIS_MFA_KEY` | Bediener MFA (`totp`/`webauthn`) | `off` | Enable für Produktion Bediener Konten. |
| `AEGIS_AUTH_MODE` / `AEGIS_OIDC_*` | Extern IdP (OIDC) | `local` | Optional SSO für Bediener. |
| `AEGIS_SCIM_TOKEN` | SCIM 2.0 Bereitstellung Token | _(leer)_ | Nur wenn automatisiert Konto Bereitstellung ist verwendet. |
| `AEGIS_RATE_LIMIT` | Pro IP request-rate cap | `0` (aus) | Set ein positiv Wert zu throttle abuse. |

## 3. Mit Bediener Konsole (recommended Pfad)

1. Offen `/aegis-shell/console.html` und Protokoll in as ein **Bediener** (Bediener Konten
   sind created durch `npm run setup`; Standard password equals der konfiguriert Aussteller
   Geheimnis bis changed).
2. Offen der **Compliance** Registerkarte.
3. Fill Elemente 1–13 oben, dann Klick **Save Fakten**.
4. Unter **Upload ausgefüllt Compliance Dokumente**, wählen ein Datei, pick seiner Art
   (ROPA / DPA / SLA / DPO-appointment / Logo / Andere), und Klick **Upload**.
   Hochgeladen Dateien appear in Tabelle mit **Herunterladen** / **löschen** Kontrollen.
5. Unter **Erzeugen ausgefüllt Vorlagen**, Klick **Herunterladen ausgefüllt ROPA / DPA / SLA /
   Privatsphäre Richtlinie** — jeder downloads Vorlage mit Ihr Fakten substituted in
   der `{{TOKEN}}` placeholders. Hand diese zu legal/customers.

### API (gleich authentication as Konsole)
Alle require ein Bediener Sitzung oder Aussteller Geheimnis.

| Endpunkt | Methode | Zweck |
|---|---|---|
| `/api/compliance` | Holen / PUT | lesen / schreiben Fakten object |
| `/api/compliance/files` | Holen | Liste hochgeladen Dokumente |
| `/api/compliance/upload` | Veröffentlichen | Upload ein Basis64 Dokument (≤ 9 MB) |
| `/api/compliance/file/:id` | Holen / Löschen | retrieve / entfernen ein hochgeladen Dokument |
| `/api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA\|SCC\|DPIA>` | Holen | Herunterladen Token-filled Vorlage (blockiert durch Fabrik Gate bis Fakten sind vollständig; ein hochgeladen signiert Kopie von der gleich `kind` auch lifts es) |
| `/api/compliance/template/<ROPA\|…>` | Holen | Herunterladen der **blank, unfilled** Vorlage (`{{TOKEN}}` placeholders, `TEMPLATE — UNFILLED` Fußzeile) — always available, bypasses Gate |
| `/api/compliance/status` | Holen | Bereitschaft Sonde: welche erforderlich Fakten sind noch fehlt |
| `/metrics` | Holen | Prometheus scrape — **Fail-Closed**; erfordert `AEGIS_METRICS_TOKEN` (siehe §2b) |

## 4. Token Referenz (für direct Vorlage Bearbeitung)

Wenn Sie bearbeiten `docs/compliance/*.md` durch hand stattdessen von mit Konsole, ersetzt diese
Token mit Ihr echt values:

```
{{CONTROLLER_LEGAL_NAME}}   Controller legal name
{{CONTROLLER_ADDRESS}}      Controller registered address
{{CONTROLLER_REG_NO}}       Company registration number
{{DPO_NAME}}                Data Protection Officer name
{{DPO_EMAIL}}               Data Protection Officer email
{{DPO_ADDRESS}}             Data Protection Officer postal address
{{EU_REP_NAME}}             EU representative name (GDPR Art.27)
{{EU_REP_ADDRESS}}          EU representative address
{{SLA_MAILBOX}}             SLA contact mailbox
{{SLA_TIMEZONE}}            Operator timezone
{{GOVERNING_LAW}}           Governing law of the DPA
{{SUPERVISORY_AUTHORITY}}   Lead EU/UK supervisory authority
{{TSA_ENDPOINT}}            Optional RFC 3161 TSA endpoint
```

## 5. Sign-off

- [ ] Elemente 1, 2, 9, 10, 11, 12 abgeschlossen (Verantwortlicher Identität, SLA, bestimmend Gesetz, authority)
- [ ] DPO details (4–6) abgeschlossen oder ausdrücklich "nicht appointed"
- [ ] EU Vertreter (7–8) abgeschlossen **oder** bestätigt nicht erforderlich (EU establishment existiert)
- [ ] Signiert ROPA / DPA / SLA hochgeladen (Punkt 14) wo contractually erforderlich
- [ ] "Herunterladen ausgefüllt" Dokumente erzeugt und reviewed durch Rechtsberatung
- [ ] `AUTH_JWT_SECRET` / Aussteller Geheimnis Set zu ein eindeutig Wert pro Umgebung (niemals der dev Standard)
- [ ] Bereitstellung Bild pushed zu **Ihr eigen** Registry mit Geheimnisse supplied über env/secret, nicht baked in (siehe `ACR-PRIVATE-REGISTRY.md`)
