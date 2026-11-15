<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/THREAT-MODEL.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Bedrohung Modell

Umfang: Aegis null Abhängigkeiten gateway + Shell. Außer von Umfang: Kunde's IdP,
umkehren Proxy, und host OS.

## Assets
1. Operator/audit Datenbank (`data/aegis.db`): Konten, Sitzungen, Audit-Trail.
2. Aussteller Geheimnis / Bediener Zugangsdaten — Gate Token minting + Bediener API.
3. Kunde media + C2PA manifests (der provenance Datensatz selbst).
4. Compliance Fakten + hochgeladen Dokumente (`data/compliance/`).

## Threats & Kontrollen
| # | Bedrohung | Control |
|---|---|---|
| T1 | Statisch Pfad traversal offenlegt source/secrets | Obstersten deny Liste + ext deny + repeated-`..` decode; geprüft 404/403 |
| T2 | Ausgeliefert Bild leaks ein geteilt secret/DB | Lieferung ausschließt `data/`, `config/local.json`, `*.db*`; B-03 assert |
| T3 | Gefälscht JWT / Bediener Sitzung | `operatorAuthorized`; HS256-nur lokal; OIDC lehnt ab `HS256`/manipuliert |
| T4 | MFA seed theft | TOTP versiegelt AES-256-GCM; Wiederherstellung codes salted-Hash + one-time |
| T5 | Audit tampering / Bediener wipes eigen trace | Nur-appendierbar; operator/system trail non-erasable (B-04) |
| T6 | Brute force / abuse | Pro IP Rate Grenze (Opt-in `AEGIS_RATE_LIMIT`); SCIM pro IP Grenze |
| T7 | Insecure Transport | Optional TLS + HSTS; reverse-proxy TLS Referenz |
| T8 | Fake Compliance declaration | Produkt niemals fabricates rechtlich Fakten; Bediener supplies über Konsole |

## Assumptions / residual Risiko
- Der host, umkehren Proxy, und IdP sind Kunde's Verantwortung.
- Wenn `AEGIS_TRUSTED_LAN=1` ist Set, `/session` ist offen zu irgendein reachable Client (lab
  nur) — dokumentiert und warned bei Start.
- Ein kompromittiert Aussteller Geheimnis allows Token minting; rotieren pro RUNBOOK-Schlüssel-ROTATION.
