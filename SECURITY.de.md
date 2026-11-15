<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `SECURITY.md`
> Übersetzung zur besseren Lesbarkeit. Bei Abweichungen gilt der englische Text.

# Sicherheitsrichtlinie

## Sicherheits-Supportzeitraum (CRA Art. 13)

Aegis v1.0.0 hat einen erklärten Sicherheits-Supportzeitraum von **5 Jahren ab
Erstveröffentlichung: 2026-11-15 → 2031-11-15**. In diesem Zeitraum stellt der
Hersteller Sicherheitsupdates und Fehlerbehebungen bereit. Das Enddatum wird
Kunden beim Kauf mitgeteilt (CRA Art. 13(19)); die Begründung des Zeitraums ist
in der technischen Dokumentation festgehalten (Art. 13(8)).

| Version | Unterstützt | Sicherheits-Support bis |
|---------|-----------|------------------------|
| 1.0.x   | ✅ | 2031-11-15 |

## Schwachstellen melden (koordinierte Offenlegung / CVD)

Aegis ist ein datenschutzorientiertes Werkzeug, das lokal verarbeitet. Wenn Sie
eine Schwachstelle finden, eröffnen Sie **kein öffentliches Issue** mit
Ausnutzungsdetails. Melden Sie sie stattdessen vertraulich an den Maintainer unter
**jeromeyoung608@gmail.com** (ebenfalls in `.well-known/security.txt`
veröffentlicht) und geben Sie an:

- Beschreibung und Auswirkung,
- Schritte zur Reproduktion,
- betroffene Version (Aegis-Version aus `package.json`).

Wir bestätigen den Eingang innerhalb von **5 Werktagen** und nennen für bestätigte
Probleme innerhalb von **30 Tagen** einen Zeitplan zur Behebung.

## Geltungsbereich

Innerhalb des Geltungsbereichs: der Aegis-Server (`server.js`, `server/store.js`),
der TSA-Adapter (`adapters/tsa-rfc3161`) und die Betreiberkonsole
(`aegis-shell/console.html`). Außerhalb: der verwendete Browser, die
Node.js-Laufzeit und jeder TSA-Dienst, den Sie selbst konfigurieren.

## Sicherheitslage (Zusammenfassung)

- Keine **npm**-Laufzeitabhängigkeiten. Die Browser-Module führen Fremdbibliotheken
  (PDF.js, pdf-lib, Tesseract.js) in ihrem jeweiligen `vendor/`-Verzeichnis mit;
  die SBOM (`scripts/gen-sbom.mjs`) listet sie vollständig auf — einschließlich
  der `playwright`-Werkzeuge für Entwicklung und Tests. Die Aussage
  „null Abhängigkeiten" bezieht sich auf den **Kern** (crypto / Hash-Chain /
  Audit / Signalisierung / Redaction-Rendering) und nicht darauf, dass das gesamte
  Produkt keinen Fremdcode enthielte.
- Server-blind: die Relay-Komponente speichert ausschließlich undurchsichtigen
  Geheimtext.
- Token-geschützte Signalisierung und Ratenbegrenzung je IP-Adresse.
- Audit-, Widerrufs- und Escrow-Schnittstellen nur für Betreiber.
- Lokale Sperrliste (CRL) wird bei der Sitzungszulassung geprüft.
- Löschung nach GDPR Art. 17 mit erhaltenen Compliance-Markern.

## Netzwerkexposition und Härtung der Bereitstellung

**Standardmäßig bindet sich der Server an alle Netzwerkschnittstellen**
(`server.listen(PORT)` ohne Host-Angabe → `0.0.0.0` / `::`). Damit ist die
statische Konsole, das token-geschützte Signalisierungs-Relay und der
Metrik-Endpunkt von **jedem Host aus erreichbar, der die Portnummer erreicht**
(Standard `8099`, oder `PORT`). Das ist für eine lokale Arbeitsstation mit einem
Betreiber beabsichtigt, aber **nicht** sicher, wenn der Port offen in einem
gemeinsam genutzten oder nicht vertrauenswürdigen Netz liegt.

Regeln für die Bereitstellung:

- **Betreiben Sie Aegis hinter einem Reverse-Proxy** (nginx, Caddy, Traefik oder
  Ihr Load-Balancer), der TLS terminiert, den Zugriff authentisiert und
  Quell-IP-Adressen bzw. CIDR-Bereiche einschränkt. Veröffentlichen Sie den
  Node-Port nicht direkt ins Internet oder in ein gemeinsam genutztes LAN-Segment.
- Der Reverse-Proxy ist auch der Ort, an dem `/metrics` **nur dann** exponiert
  werden sollte, wenn `AEGIS_METRICS_TOKEN` gesetzt ist (andernfalls fail-closed —
  siehe `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md`). Halten Sie die Metriken
  hinter der ACL des Proxys.
- Setzen Sie **niemals** `AEGIS_TRUSTED_LAN=1` in einem gemeinsam genutzten oder
  produktiven Netz — die Variable lockert die Zulassungskontrolle von `/session`
  und ist ausschließlich für Laborumgebungen gedacht.
- Betreiberkonsole und Signalisierungs-Relay verlangen eine Betreiber-Sitzung
  bzw. ein Issuer-Secret; die statische Oberfläche ist bewusst unauthentifiziert
  (sie ist ein Anmeldebildschirm), weshalb der Proxy regeln muss, wer sie erreicht.

Vollständige Analyse in `docs/compliance/THREAT-MODEL.md` und
`docs/compliance/CRA-NIS2.md`. **Ein unabhängiger Penetrationstest durch Dritte
ist weiterhin erforderlich, bevor ein Produktiveinsatz zugesichert werden kann.**

## Meldepflichten bei Sicherheitsvorfällen nach CRA

Für Schwachstellen, die als **schwerwiegender Sicherheitsvorfall** im Sinne der
EU-Verordnung über Cybersicherheit (Cyber Resilience Act, Verordnung (EU)
2024/2847, Art. 14/71) gelten, verpflichtet sich der Hersteller zu folgendem
Meldeablauf gegenüber der zuständigen Behörde (in Deutschland: BSI):

- **innerhalb von 24 Stunden** nach Kenntnisnahme: eine Vorabwarnung (Art. 14(2));
- **innerhalb von 72 Stunden**: eine Schwachstellenmeldung bzw. ein
  Vorfallbericht mit den verfügbaren Angaben (Art. 14(3));
- **innerhalb von 14 Tagen**: ein Abschlussbericht mit Ursache und Behebung
  (Art. 14(4)) oder eine begründete Verzögerung, solange die Fakten noch geprüft
  werden.

Hinweis: Die Meldepflichten des CRA gelten seit **2026-09-11**. Soweit Aegis
bereits in der EU bereitgestellt wird, handelt es sich um aktuelle Pflichten und
nicht um künftige Pläne.

⚠️ Diese Verpflichtung ist eine geschäftliche bzw. prozessuale Erklärung, keine
Rechtsberatung. Der genaue Auslöser, die zuständige Behörde und mögliche
Ausnahmen für kleine und Kleinstunternehmen sind durch qualifizierte
Rechtsberatung zu bestätigen.
