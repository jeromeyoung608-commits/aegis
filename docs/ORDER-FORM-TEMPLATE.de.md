<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/ORDER-FORM-TEMPLATE.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis — Bestellformular (Vorlage)

> Vorlage nur. Haben Rechtsberatung Prüfung vor verwenden. Dies form accompanies der
> **Aegis Bezahlt Support & Services Bedingungen** ([`COMMERCIAL-LICENSE.md`](../COMMERCIAL-LICENSE.md))
> und der vollständig Vereinbarung ([`docs/SERVICES-AGREEMENT.md`](./SERVICES-AGREEMENT.md)).

Der Aegis **Software ist offen source unter Apache-2.0** — dies form deckt ab bezahlt
Support und Services nur. Kein Lizenz fee ist due; kein purchase Pflicht
existiert für läuft Software.

---

## 1. Parteien

| | |
|---|---|
| **Anbieter** | Jerome Young (Yang Jie), AEGIS Maintainer — Adresse pro `SECURITY.md` / `.well-known/security.txt` |
| **Kunde** | ⟨rechtlich entity Name⟩ |
| **Registriert Adresse** | ⟨Adresse⟩ |
| **Country / VAT ID** | ⟨country⟩ / ⟨VAT ID⟩ |
| **Kunde Kontakt** | ⟨Name, Rolle, E-Mail, phone⟩ |
| **Technical Kontakt** | ⟨Name, Rolle, E-Mail, phone⟩ — day-to-day Lieferung Kontakt |

## 2. Services ordered

Select eine plan; Umfang unten spiegelt [`PRICING.md`](../PRICING.md). Abdeckung
ist expressed as deployments und Services eingeschlossen — **nicht** ein Arbeitsplatz Anzahl, und es
macht nicht Grenze wie viele Bediener verwenden Software.

| Plan | Abdeckung | Jährlich fee (net, ex-VAT) | Antwort Ziel | Selected |
|---|---|---|---|---|
| Starter | 1 Team / 1 Bereitstellung | €4,900 | best-effort / community | ☐ |
| Geschäft | up zu 5 deployments | €24,000 | 2 Geschäft Tage | ☐ |
| Unternehmen | unlimited | €75,000+ (quoted) | 4h Sev-1 / 1d Sev-2 | ☐ |

### 2.1 Eingeschlossen Ergebnisse

☐ Bereitstellung & Integration (Umgebung, Modul wiring, one-click installieren)
☐ Härtung Prüfung (CSP / COOP-COEP / Schlüssel handling / Versiegelung Konfiguration)
☐ Compliance Bereitschaft Paket — SBOM + CRA Beweis Material
☐ SIEM Integration (Protokoll forwarding)
☐ Jährlich Support (siehe §4)
☐ Compliance Pakete pro Jahr: ⟨n⟩  ☐ Extra Paket: quoted

### 2.2 Ausdrücklich nicht eingeschlossen

- Drittanbieter Penetration Test oder ACR/CRA Attestierung — engagement-specific, quoted separately.
- German-language localisation von Compliance Vorlagen über hinaus was liefert aus in Produkt.
- Custom Produkt development über hinaus Umfang oben (available as ein separately
  scoped statement von work).

## 3. Fees und payment

| | |
|---|---|
| Jährlich Service fee | € ⟨amount⟩ (net, exclusive von VAT) |
| One-off onboarding fee | € ⟨amount⟩ ☐ keiner |
| Billing frequency | ☐ jährlich in advance ☐ monthly ☐ pro milestone (SOW) |
| Payment Bedingungen | 30 Tage von invoice Datum |
| Currency | EUR |

Preise hold für der committed Begriff. Verlängerung und price-change handling follow
§5 von Services Vereinbarung (Deutsch CPI-linked cap, 60-Tag advance Hinweis, 30-Tag
Beendigung Recht).

## 4. Support und Service levels

| Severity | Definition | Antwort Ziel (plan) |
|---|---|---|
| Sev-1 | Produkt unusable oder Beweis chain defekt | ⟨pro plan⟩ |
| Sev-2 | Major Funktion degraded, kein Daten Verlust | ⟨pro plan⟩ |
| Sev-3 | Minor Fehler oder question | ⟨pro plan⟩ |
| Sev-4 | Funktion Anfrage / advisory | nächste planned Release |

Escalation Pfad und on-call arrangements (Unternehmen nur): ⟨fill⟩.

## 5. Begriff

| | |
|---|---|
| Start Datum | ⟨YYYY-MM-DD⟩ |
| Initial Begriff | 12 months ☐ ⟨n⟩ months |
| Auto-renewal | ☐ ja ☐ kein — wenn ja, siehe §5 von Services Vereinbarung |

## 6. Commercial und rechtlich Bedingungen

1. Der **Aegis Software ist lizenziert unter Apache-2.0** (SPDX `Apache-2.0`) —
   siehe [`LICENSE`](../LICENSE). Der Kunde darf verwenden, modify, redistribute und
   sell es, einschließlich commercially, ohne paying ein Lizenz fee.
2. Dies Bestellformular governs **Services nur**, unter der
   [Services Vereinbarung](./SERVICES-AGREEMENT.md).
3. Haftung ist capped as angegeben in Services Vereinbarung; der cap amount ist
   aufgezeichnet in ein ausgeführt Zeitplan: € ⟨amount oder "as angegeben in der ausgeführt Zeitplan">⟩.
4. Der Kunde behält alle Rechte unter Apache-2.0. Kein Marke Rechte sind
   granted; siehe [`TRADEMARK.md`](../TRADEMARK.md).
5. Daten handling: Anbieter macht nicht host Kunde Daten. Bereitstellung und
   Support work ist durchgeführt auf Kunde's infrastructure oder unter der
   Kunde's control. Siehe §8 von Services Vereinbarung.
6. Anbieter invoices und Lieferung Berichte sind bereitgestellt as **PDF mit ein SHA256
   Prüfsumme**; Kunde darf publish Prüfsumme.

## 7. Signaturen

| | Anbieter | Kunde |
|---|---|---|
| Name | Jerome Young (Yang Jie) | ⟨Name⟩ |
| Title | Maintainer | ⟨title⟩ |
| Signatur | | |
| Datum | | |

---

*Non-binding bis signiert durch beide Parteien. Preise shown sind Liste Preise und darf
sein adjusted für Umfang; siehe `PRICING.md` für der indicative structure.*
