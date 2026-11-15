<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/SERVICES-AGREEMENT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis — Support & Services Vereinbarung

> Vorlage Vereinbarung. Haben ein qualifiziert EU attorney Prüfung es — especially der
> Haftung Einschränkungen — vor Signatur. Dies Dokument governs **bezahlt Support
> und Services nur**.

**Anbieter:** Jerome Young (Yang Jie), AEGIS Maintainer.
**Kunde:** ⟨rechtlich entity Name⟩.
**Effective Datum:** ⟨YYYY-MM-DD⟩.

Dies Services Vereinbarung ("Vereinbarung") ist entered in zwischen Anbieter und
Kunde. Es ist accompanied durch ein Bestellformular, welche forms Teil von es.

## 1. Umfang und relation zu Software Lizenz

1.1 Der AEGIS Software ("Software") ist **offen source**, lizenziert unter der
**Apache Lizenz, Version 2.0** (SPDX `Apache-2.0`). Der vollständig Text ist in
`LICENSE`. Nichts in dies Vereinbarung restricts, conditions oder re-licences der
Kunde's verwenden von Software.

1.2 Der Kunde darf verwenden, modify, redistribute und sell Software,
einschließlich commercially, ohne paying ein Lizenz fee und ohne obtaining
permission. Kein purchase Pflicht arises von Software's Lizenz.

1.3 Dies Vereinbarung deckt ab nur der **Services** Anbieter führt durch für der
Kunde: Bereitstellung, Integration, Härtung Prüfung, Compliance Bereitschaft Pakete,
SIEM Integration und Support. Der Umfang von jeder Mandat ist angegeben in der
Bestellformular.

1.4 Wenn Kunde hat nicht signiert ein Bestellformular, kein Services sind engaged und
kein Pflicht arises unter dies Vereinbarung.

## 2. Services

2.1 Der Anbieter führt durch Services listed in Bestellformular §2 mit
reasonable skill und care, in accordance mit Abnahme Kriterien in §4.

2.2 Services sind bereitgestellt **remotely durch Standard**. On-site work erfordert ein
separat statement von work.

2.3 Der Anbieter darf verwenden subcontractors für non-specialist work (e.g. hosting
oder translation), verbleibend verantwortlich für ihrer Leistung.

2.4 **Änderung control.** Work outside der agreed Umfang ist quoted separately und
begins nur nach geschrieben Genehmigung. Der Anbieter darf stop work das exceeds der
agreed Umfang bis Änderung ist approved.

## 3. Kunde Pflichten

3.1 Der Kunde bietet ein technically competent Kontakt, timely Zugriff zu der
Ziel Umgebung, und Information und Zugangsdaten erforderlich für der
Mandat.

3.2 Der Kunde ist verantwortlich für der rechtlich und contractual Basis auf welche es
processes Dokumente und persönlich Daten. **Der Anbieter macht nicht host Kunde
Daten** und macht nicht Prozess Dokument Inhalt auf Kunde's behalf.

3.3 Der Kunde behält ein Sicherung vor jeder Mandat Schritt das modifies
persistent Zustand.

## 4. Ergebnisse und Abnahme

4.1 Jeder Mandat produces geschrieben Ergebnisse: ein Bereitstellung Datensatz, ein
hardening-review Bericht, ein Compliance Bereitschaft Paket (SBOM + Beweis Index),
oder ein Support summary — as angegeben in Bestellformular.

4.2 Der Kunde hat **10 Geschäft Tage** von Lieferung zu accept ein deliverable
oder give geschrieben Hinweis von specific non-conformity. Ein deliverable ist accepted wenn
kein Hinweis ist erhalten in Zeitraum.

4.3 Wenn ein deliverable macht nicht conform, Anbieter re-performs der affected
work innerhalb ein reasonable Zeitraum. Wenn es noch macht nicht conform, Kunde's
sole remedy für das deliverable ist ein proportionate reduction von der fee für
der affected Punkt.

4.4 Der handover von ein Bereitstellung follows
[`docs/DEPLOYMENT-DELIVERY-CHECKLIST.md`](./DEPLOYMENT-DELIVERY-CHECKLIST.md),
welche beide Parteien sign aus.

## 5. Fees, invoicing und Verlängerung

5.1 Fees sind jene in Bestellformular, net von VAT und excluding der taxes,
duties und levies Kunde muss pay.

5.2 Invoices sind ausgestellt as angegeben in Bestellformular und sind payable innerhalb 30
Tage. Late payment über hinaus 30 Tage, nach geschrieben Hinweis, suspends Support
Services. Der Anbieter darf invoice für work bereits durchgeführt.

5.3 **Verlängerung (§307 BGB — attorney Prüfung erforderlich).** Wo Bestellformular
selects auto-renewal: Begriff macht nicht renew stillschweigend. Der Anbieter gives
geschrieben Hinweis von der upcoming Verlängerung **60 Tage** vor Begriff Ende; der
Kunde darf terminate mit effect bei Begriff Ende auf **30 days' Hinweis**. Preis
enthält für der committed Begriff. Irgendein Preis Änderung bei Verlängerung ist begrenzt zu der
Änderung in Deutsch CPI (Verbraucherpreisindex) über der prior 12 months,
angewendet durch ein angegeben formula, und Kunde darf terminate stattdessen von
accepting es. Avoid "wir darf Änderung Preise bei irgendein Zeit" Formulierung — solche ein clause
ist generally invalid as ein unreasonable standard-term disadvantage unter §307
BGB.

5.4 Expenses sind charged bei Kosten wo Bestellformular says so, und sind niemals
marketed up.

## 6. Support und Service levels

6.1 Antwort Ziele pro severity sind jene in Bestellformular §4. Ein Ziel ist ein
Antwort Zeit, nicht ein resolution Zeit, sofern expressly angegeben anderenfalls.

6.2 Support deckt ab der deployed Version von Software und der configurations
zugestellt unter dies Mandat. Support für Drittanbieter Komponenten ist bereitgestellt
zu Umfang Anbieter kann influence es; Kunde bleibt verantwortlich
für licensing und Support von jene Komponenten unter ihrer eigen Bedingungen.

6.3 Der Anbieter darf suspend Support für ein sustained Sicherheit Problem in der
Kunde's Umgebung wo continued Vorgang würde expose Anbieter's
andere Kunden; Anbieter gives Hinweis und  mildert wo practicable.

## 7. Confidentiality

7.1 Jeder Partei behält der other's non-public Information confidential, verwendet es
nur für dies Mandat, und protects es bei mindestens zu der gleich standard es
gilt zu seiner eigen confidential Information von Art.

7.2 Der Pflicht überlebt Beendigung für drei years.

7.3 Diese Pflichten do nicht anwenden zu Information das ist offentlich, independently
developed, lawfully erhalten von ein third Partei, oder erforderlich zu sein disclosed durch
Gesetz (wo der disclosing Partei gives prompt Hinweis wo lawful).

7.4 **Kunde Daten verarbeitet während ein Bereitstellung bleibt Kunde's Daten.**
Der Anbieter macht nicht host es und macht nicht retain copies nach Mandat
sofern agreed in writing.

## 8. Intellectual Eigenschaft und Marke

8.1 Der Software, einschließlich seiner Dokumentation, bleibt lizenziert unter
Apache-2.0. Der Anbieter grants kein additional intellectual-property Rechte in
Software über hinaus Lizenz.

8.2 Ergebnisse erzeugt specifically für Kunde in der course von ein
Mandat sind bereitgestellt zu Kunde unter der Apache-2.0 Lizenz, zu der
Umfang sie enthalten Anbieter Material. Der Anbieter darf reuse general
know-how, methods und non-Kunde-specific Komponenten.

8.3 Der Anbieter behält alle Rechte in AEGIS Name, logo und der
"Engine Durch Jerome Young" Zuordnung mark. Der Apache-2.0 Lizenz grants kein
Marke Rechte. Der Kunde darf Zustand factually das ein Bereitstellung ist "based
auf Aegis" oder "powered durch Aegis", bereitgestellt Zuordnung notices erforderlich durch
Apache-2.0 sind beibehalten.

8.4 Neither Partei darf verwenden der other's Kennzeichen in ein way das suggests endorsement.

## 9. Warranties und Haftung

9.1 Der Software und Services sind bereitgestellt "AS Ist", ohne Gewährleistung von irgendein
Art, zu der maximum Umfang permitted durch Gesetz.

9.2 Der Anbieter warrants das es wird perform Services mit reasonable
skill und care, und Ergebnisse wird materially conform zu der
Abnahme Kriterien in §4 für 30 Tage nach Lieferung.

9.3 Zu der maximum Umfang permitted durch Gesetz, Anbieter ist **nicht liable** für
indirect, incidental, special oder consequential damages, oder für Verlust von profit,
revenue, Daten oder Geschäft interruption, arising von Software oder der
Services.

9.4 Der Anbieter's aggregate Haftung unter dies Vereinbarung ist begrenzt zu der
cap angegeben in Bestellformular / ausgeführt Zeitplan für der applicable Mandat.

9.5 Nichts in dies clause Grenzen Haftung das kann nicht sein excluded durch
applicable Gesetz (intent, gross negligence, death oder persönlich injury caused durch
negligence, Produkt Haftung unter ProdHaftG, fraud, oder der simple-negligence
Verstoß von ein cardinal Pflicht — der latter begrenzt zu typical foreseeable
Verlust).

## 10. Begriff und Beendigung

10.1 Dies Vereinbarung läuft für Begriff angegeben in Bestellformular und terminates
auf completion von Services oder Ablauf von Begriff.

10.2 Either Partei darf terminate für Material Verstoß mit ein 14-Tag cure Zeitraum.
Der Anbieter darf suspend Services für non-payment nach geschrieben Hinweis und ein
14-Tag cure Zeitraum.

10.3 Auf Beendigung Anbieter liefert der work in progress und der
Ergebnisse erzeugt, und Kunde pays für Services durchgeführt up zu das
Datum.

10.4 Beendigung macht nicht affect Kunde's Rechte unter der Apache-2.0
Lizenz zu Software, nor §§7 (confidentiality), 9 (Haftung) oder 11
(bestimmend Gesetz).

## 11. Bestimmend Gesetz und disputes

11.1 Dies Vereinbarung ist governed durch der laws von Federal Republic von Germany,
excluding seiner conflict-of-laws Regeln und UN CISG.

11.2 Der courts von Anbieter's registriert Arbeitsplatz haben exclusive jurisdiction,
sofern verpflichtend lokal consumer oder Daten-protection Gesetz bietet anderenfalls.

11.3 Der Parteien wird attempt zu resolve irgendein dispute durch good-faith negotiation
innerhalb 30 Tage von geschrieben Hinweis von der dispute, vor commencing proceedings.

## 12. General

12.1 Dies Vereinbarung und seiner Bestellformular sind der entire Vereinbarung zwischen der
Parteien auf ihrer subject matter und supersede earlier discussions.

12.2 Amendments muss sein in writing und signiert durch beide Parteien.

12.3 Wenn ein provision ist unenforceable, es ist geändert zu der minimum Umfang
necessary; Rest bleibt in force.

12.4 Neither Partei darf assign dies Vereinbarung ohne der other's prior geschrieben
consent, except zu ein successor in ein Geschäft Übertragung von substantially alle
Assets.

12.5 Der Anbieter darf Referenz Kunde as ein Referenz Kunde, mit der
Kunde's geschrieben Genehmigung von Formulierung, sofern Kunde objects.

## 13. Signaturen

| | Anbieter | Kunde |
|---|---|---|
| Name | Jerome Young (Yang Jie) | ⟨Name⟩ |
| Title | Maintainer | ⟨title⟩ |
| Signatur | | |
| Datum | | |

---

*Dies ist ein commercial-structure Vorlage, nicht rechtlich advice. Haben ein qualifiziert
German/EU attorney Prüfung es vor Signatur.*
