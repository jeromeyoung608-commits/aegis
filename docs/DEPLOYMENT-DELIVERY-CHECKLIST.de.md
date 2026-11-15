<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/DEPLOYMENT-DELIVERY-CHECKLIST.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis — Bereitstellung & Lieferung Checkliste

> Verwenden für jeder Kunde Bereitstellung. Beide Parteien sign §7 bei handover. Tick der
> Boxen das anwenden; schreiben N/A wo ein Schritt macht nicht anwenden, mit ein reason.
> Alles hier ist verifiable — kein Schritt erfordert trusting ein Status Behauptung.

**Kunde:** ⟨rechtlich entity Name⟩  **Umgebung:** ⟨host / cluster / air-gapped?>
**Mandat / Bestellformular ref:** ⟨ref⟩  **Datum:** ⟨YYYY-MM-DD⟩

---

## 1. Pre-flight

| ☐ | Prüfen | Wie zu prüfen | Ergebnis |
|---|---|---|---|
| ☐ | Node.js Laufzeit vorhanden und Version in der supported range | `node -v` → major ≥ 22 (`package.json` `engines.node`) | ⟨Version⟩ |
| ☐ | Kein Drittanbieter Laufzeit Abhängigkeiten erforderlich | `npm run verify:zero-deps` → Bestanden | ☐ |
| ☐ | Ziel port kostenlos | `lsof -ti:<port>` → leer (Standard 8080) | ☐ |
| ☐ | Browser vorhanden (WebGPU / WebRTC / OCR brauchen ein echt Browser) | `chrome --version` | ⟨Version⟩ |
| ☐ | Datenträger space für OCR Assets + Beweis Tresor | ≥ 500 MiB kostenlos | ⟨kostenlos⟩ |
| ☐ | Sicherung taken von Ziel Umgebung | Kunde Datensatz | ☐ |

## 2. Installation

| ☐ | Schritt | Befehl / Beweis |
|---|---|---|
| ☐ | One-click installieren abgeschlossen | `npm run setup` → success Protokoll |
| ☐ | Server startet und liefert aus theshell | `node server.js` → `curl -sf http://localhost:<port>/` |
| ☐ | Kein source, Schlüssel oder Archiv Pfad ist downloadable | `curl` auf `/server.js`, `/config/local.json` → 404 |
| ☐ | Unauthorised Pfade refused | `verify:p3` Gate → Bestanden |

## 3. Konfiguration

| ☐ | Schritt | Wo | Wert |
|---|---|---|---|
| ☐ | Lokal Geheimnis erzeugt & speichert **nur** auf Bediener's Maschine | `config/local.json` (niemals committed, niemals ausgeliefert) | ☐ |
| ☐ | Aussteller keypair erzeugt (ECDSA) | `npm run setup` Ausgabe | ☐ |
| ☐ | Port / binden Adresse Set | `config/local.json` | ⟨port⟩ |
| ☐ | OIDC / SSO optional Integration | `server/oidc.js` | ☐ / N/A |
| ☐ | Optional RFC 3161 TSA Endpunkt konfiguriert | `adapters/tsa-rfc3161/config-default.js` | ☐ / N/A |
| ☐ | **Fail-Closed Modus geprüft**: extern TSA unreachable → lokal Zeit Rückfallebene, Relay unversehrt | `verify:tsa` offline Smoke-Test | ☐ |

## 4. Sicherheit Prüfung (ausführen alle — Datensatz Ausgabe Zeile)

| ☐ | Gate | Befehl | Ergebnis |
|---|---|---|---|
| ☐ | Licensing Kopfzeilen | `npm run verify:headers` | ☐ Bestanden |
| ☐ | Licensing Compliance | `npm run verify:licensing` | ☐ Bestanden |
| ☐ | Behauptungen Formulierung | `npm run verify:claims` | ☐ Bestanden |
| ☐ | Null Abhängigkeiten lint | `npm run verify:zero-deps` | ☐ Bestanden |
| ☐ | Diagnostics | `npm run doctor` | ☐ 0 Fehler |
| ☐ | Einheit + Integration Suite | `npm test` | ☐ bestanden / ☐ fehlgeschlagen |
| ☐ | Lieferung Paket reproduzierbar | `npm run pack:delivery && npm run verify:delivery` | ☐ Bestanden |
| ☐ | CSP Nonce enforced (kein inline Skript ohne Nonce) | `verify:csp` | ☐ Bestanden |
| ☐ | COOP/COEP Kopfzeilen vorhanden (Cross-Origin Isolation) | `curl -I` → Kopfzeilen | ☐ |
| ☐ | `.well-known/security.txt` vorhanden mit ein monitored Kontakt | `curl` → Datei | ☐ |
| ☐ | SBOM regenerated für dies Build | `npm run sbom` → `SBOM.cdx.json` | ☐ |

## 5. Functional Prüfung (Sieben-Stufen Schleife)

| ☐ | Stufe | Geprüft durch |
|---|---|---|
| ☐ | 1 Topologie (Gerät graph zeichnet bei Skalierung) | ☐ |
| ☐ | 2 Redaktor — destructive Schwärzung (kein recoverable Text Ebene) | ☐ |
| ☐ | 3 Sign (abgetrennt Hash Signatur, selbst.assertiert Schlüssel) | ☐ |
| ☐ | 4 Senden (P2P Relay, Server sieht Chiffretext nur) | ☐ |
| ☐ | 5 Erhalten / prüfen | ☐ |
| ☐ | 6 Archiv (verschlüsselt OPFS Tresor) | ☐ |
| ☐ | 7 Audit (manipulationserkennbar Hash-Kette) | ☐ |
| ☐ | Beweis Export (portability Paket mit `producer` / `provenance`) | ☐ |
| ☐ | WebGL2 Rückfallebene Pfad (kein WebGPU Maschine) | ☐ |

## 6. Handover Paket zugestellt zu Kunde

| ☐ | Punkt | Wo |
|---|---|---|
| ☐ | Software + Lizenz (Apache-2.0) | `LICENSE`, `LICENSES/Apache-2.0.txt` |
| ☐ | SBOM für der zugestellt Build | `SBOM.cdx.json` |
| ☐ | Lieferung Archiv + SHA256 Prüfsumme | `dist/aegis-delivery-<version>.tar.gz` + Prüfsumme |
| ☐ | Drittanbieter Zuordnung Index | `NOTICE`, `modules/*/vendor/MANIFEST.json` |
| ☐ | API / SDK Dokumentation | `docs/API.md`, `docs/SDK.md` |
| ☐ | Claims-wording Baseline (marketing guardrails) | `docs/CLAIMS-WORDING.md` |
| ☐ | Sicherheit Richtlinie + Support SLA + escalation contacts | `SECURITY.md`, `.well-known/security.txt`, Bestellformular §4 |
| ☐ | Bediener training (aufgezeichnet) | ⟨Sitzung Datum, attendees⟩ |
| ☐ | Schlüssel Material handover + Rotation Verfahren | ⟨Verfahren ref⟩ |

## 7. Handover sign-off

| | Anbieter | Kunde |
|---|---|---|
| Name | Jerome Young (Yang Jie) | ⟨Name⟩ |
| Rolle | Maintainer | ⟨Rolle⟩ |
| Signatur | | |
| Datum | | |

**Outstanding Elemente bei handover** (schreiben sie hier; beide Parteien behalten ein Kopie):

1. ⟨Punkt + Eigentümer + due Datum⟩
2. ⟨Punkt + Eigentümer + due Datum⟩

**Nicht abgedeckt durch dies Bereitstellung** (Zustand ausdrücklich, e.g. Drittanbieter
Attestierung, custom development, on-site work): ⟨Liste oder "keiner">⟩

---

*Appendix: der authoritative Gate Liste ist `package.json` `scripts` und
`.github/workflows/ci-runtime.yml`. Wenn ein Befehl in dies Checkliste kein länger
existiert, das ist ein Fehler in Checkliste — Kcorrektur es, do nicht tick es.*
