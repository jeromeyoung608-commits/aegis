<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/PRIVACY-POLICY.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Privatsphäre Richtlinie

**Status:** Ausgestellt für Signatur · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine
**Gilt zu:** der selbst gehostet Aegis Software und seiner Bediener (der "Service").

---

## 1. Wer ist Verantwortlicher?

Aegis ist ein **local-first** Produkt. In der standard Bereitstellung Software läuft
entirely auf infrastructure Sie control (Ihr Server, Ihr machines). Der
**Kunde** wer operates ein Aegis Instanz ist der **Daten Verantwortlicher** für der
persönlich Daten verarbeitet durch es; Aegis Software acts as der **Auftragsverarbeiter**
auf Kunde's behalf. Wenn Aegis ist operated durch seiner vendor as ein managed
Service, der vendor ist Verantwortlicher und ein separat Verantwortlicher Hinweis gilt.

Dies Richtlinie erklärt was der *Software* processes und wie es ist konfiguriert zu
honour Daten-protection Pflichten. Es ist nicht ein substitute für Kunde's eigen
Privatsphäre Hinweis wo Kunde determines der purposes von Verarbeitung.

## 2. Was Daten ist verarbeitet

| Daten | Wo es lebt | Notizen |
|------|---------------|-------|
| Dokumente / media hochgeladen für Bereinigung | Kunde's Laufzeit Lautstärke, dann ein **encrypted-archive Tresor** | Niemals lässt Instanz sofern ausdrücklich exportiert. |
| Abgeleitet hasht / manifests | Gleich Laufzeit Lautstärke | Content-Hash nur; original Bytes sind nicht re-transmitted. |
| Bediener & Aussteller Konten | SQLite Speicher (`accounts`) | Hashed Zugangsdaten; kein Klartext passwords. |
| Audit Ereignisse | SQLite Speicher (`audit_events`, Hash-verkettet) | Operator/system Ereignisse sind **manipulationserkennbar und nur-appendierbar** (siehe §6). |
| Optional RFC3161 timestamps | Gesendet zu ein Kunde-configured TSA | Nur ein **Hash** ist transmitted, niemals Dokument Bytes (Opt-in, Standard aus). |

Aegis macht **nicht** phone home, macht nicht embed Drittanbieter analytics, und liefert aus
mit **null Netzwerk Ausgang** durch Standard.

## 3. Rechtlich bases (GDPR Art. 6)

- **Vertrag (Art. 6(1)(b))** — operating Service Sie requested.
- **Legitimate interests (Art. 6(1)(f))** — Sicherheit, fraud prevention, und
  maintaining Integrität von Audit-Trail.
- **Consent (Art. 6(1)(ein))** — irgendein optional Integration (e.g. extern TSA) ist
  Opt-in und aus durch Standard.

## 4. Daten minimisation & Zero-Knowledge

Identität proofs (e.g. der eingebaut Zero-Knowledge Identität Modul) sind entworfen
zu **beweisen attributes ohne revealing sie**. Persönlich Daten ist verarbeitet nur
zu Umfang erforderlich für der requested Vorgang und ist nicht verwendet für secondary
purposes.

## 5. International Übertragungen

Durch Standard dort sind **kein international Übertragungen** — Verarbeitung ist lokal. Wenn ein
Kunde ermöglicht der optional RFC3161 Zeitstempel Adapter, ein **Hash** (nicht
persönlich Daten in klar) darf sein gesendet zu ein TSA Endpunkt Kunde configures;
appropriate Übertragung mechanisms (SCCs) sind Kunde's Verantwortung.

## 6. Aufbewahrung & Löschung

- **Daten Betroffene** (Räume, Signierer, Ende individuals) darf exercise Recht zu
  Löschung (GDPR Art. 17). Der Service implementiert Löschung über seiner Daten-subject
  Löschung function, welche deletes der subject's personal-Daten rows während
  retaining ein Schwärzung marker für Rechenschaftspflicht.
- **Bediener / System Audit Ereignisse** form ein **manipulationserkennbar, nur-appendierbar**
  Rechenschaftspflicht Protokoll und sind **nicht erasable** — erasing Bediener's eigen trail
  ist refused (HTTP 403). Dies ist ein deliberate forensic-integrity control, nicht ein
  limitation von Löschung Recht: es gilt nur zu Sicherheit Audit-Trail,
  niemals zu Daten-subject Datensätze.

## 7. Sicherheit

- Verschlüsselung bei Rest für Tresor; Hash-verkettet Audit Protokoll.
- Hashed Zugangsdaten; bearer-Token Bediener auth mit TTL.
- Anmeldung throttling (pro IP und pro IP:username) zu resist brute force und
  enumeration.
- Kein extern Ausgang ohne explizit Opt-in.

## 8. Ihr Rechte

Zugriff, rectification, Löschung, restriction, portability, und objection
(GDPR Arts. 15–21). Exercise sie durch Instanz Bediener; für ein
vendor-managed Instanz, Kontakt der DPO unten.

## 9. Kontakt & DPO

**Daten Protection Officer:** {{DPO_Name}} — `{{DPO_EMAIL}}` ({{DPO_Adresse}}). Aufsichtsbehörde:
{{SUPERVISORY_AUTHORITY}}. Für vendor-managed instances der DPO ist der
Punkt von Kontakt für Rechte unten.

## 10. Aufbewahrung Zeitplan

| Daten | Standard Aufbewahrung | Auslöser / rechtlich Basis |
|------|------------------|----------------------|
| Bediener / Aussteller Konten | 30 Tage nach deactivation, dann deleted | Verantwortlicher Richtlinie; ein Schwärzung marker nur ist beibehalten |
| Tresor / encrypted-archive contents | bis Bediener deletes sie | lokal Lautstärke; kein automatic Ablauf |
| Audit Ereignisse (operator/system) | 365 Tage rolling, dann pruned | manipulationserkennbar forensic-integrity Protokoll; **nicht erasable** (siehe §6) |
| Sitzung Token | TTL-bound (≤ 1 Stunde); auto-expire | Sicherheit |
| Dokumente / media | entfernt wenn Bediener deletes sie | lokal Verarbeitung |

## 11. Responding zu Ihr Anfragen (GDPR Art. 12(3))

Wir acknowledge Anfragen ohne undue delay und provide der substantive
Information **innerhalb eine Monat** von receipt (extendable durch two further months für
complex Anfragen, mit Hinweis). Anfragen darf sein submitted zu der DPO (§9).
Acknowledgement Vorlage:

> **Subject:** Confirmation von receipt — Daten-protection Anfrage (Aegis)
> Thank Sie für Ihr Anfrage erhalten auf {Datum}. Wir acknowledge es unter
> GDPR Art. 12(3) und wird respond substantively innerhalb eine Monat. Wenn wir brauchen zu
> prüfen Ihr Identität oder extend der deadline, wir wird Kontakt Sie.

## 12. Cookies & lokal Speicher

Aegis Mengen **kein HTTP cookies** (geprüft: null `Set-Cookie` auf irgendein Antwort). Der
Bediener Konsole speichert strictly-necessary Zustand nur in Browser's
`sessionStorage` — e.g. `sessionStorage['aegis.issuer']` (Bediener Sitzung Token),
der selected Registerkarte, und in-progress form Zustand. Diese sind nicht tracking cookies,
sind nicht geteilt mit irgendein third Partei, und sind cleared wenn Sitzung ends.
Weil kein tracking oder non-essential cookies sind verwendet, kein cookie-consent Banner
ist erforderlich; dies Abschnitt Dokumente der position transparently.

## 13. Deutsche Fassung (Zusammenfassung)

Diese Datenschutzerklärung gilt für sterben lokale Aegis-Software. Der betreibende
Kunde ist in Regel sterben verantwortliche Stelle (Verantwortlicher); Aegis ist
Auftragsverarbeiter. Es erfolgt **keine Datenübertragung ins Ausland** ohne
ausdrückliche Option (z. B. optionaler RFC3161-TSA, nur Hash, kein Dokument).
Betroffene haben sterben Rechte nach Art. 15–21 DSGVO. Eine vollständige
deutschsprachige Fassung ist vor Veröffentlichung durch sterben zuständige Stelle
bereitzustellen und rechtlich prüfen zu lassen.

> Dies Dokument ist ein Vorlage. Ersetzt placeholders, bestätigen der controller/processor
> posture für Ihr Bereitstellung, und haben es reviewed durch qualifiziert Rechtsberatung vor verwenden.
