<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/CLAIMS-WORDING.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis — Behauptungen Formulierung (normative)

**Status**: normative Formulierung Baseline, 2026-11-13. Gilt zu README, Lieferung
Berichte, UI Kopie, comments und sales Material. Technical behaviour ist unchanged;
nur Wörter verwendet zu describe es sind korrigiert.

Dies Datei existiert weil drei Bedingungen waren verwendet as marketing shorthand für things
Aegis macht **nicht** implement. Verzeichnis und Modul Namen sind historical und sind
kept (renaming sie würde break Importe und Tests), aber sie muss niemals sein lesen
as kryptografisch Behauptungen.

## 1. Forbidden Behauptungen und erforderlich replacements

| Do nicht sagen | Warum es ist falsch | Sagen stattdessen |
|---|---|---|
| `forward secrecy` | Eine PBKDF2 Sitzung Schlüssel ist reused für jeder Block. Ein frisch IV pro Block verhindert IV reuse; es macht nicht provide Schlüssel Löschung oder compromise-resistance. | **per-chunk authenticated Verschlüsselung mit ein frisch Zufall IV** (hinzufügen "kein forward secrecy" wenn Bedrohung Modell ist discussed) |
| `blind signature` | Dort ist kein blinding factor und kein unblinding Schritt. Der Signierer signiert ein Hash sie kann siehe. | **abgetrennt Hash Signatur** (hinzufügen "nicht ein kryptografisch blind Signatur scheme") |
| `immutable` / `Immutable Audit Trail` | Ein Hash-Kette ist manipulationserkennbar, nicht immutable: ein Bediener mit schreiben Zugriff kann recompute der gesamte chain. Mit `hmacKey` Set es ist HMAC-bound; ohne es, Klartext SHA-256 Verknüpfungen sind nur ein Erkennung aid. | **manipulationserkennbar Hash-Kette** (und Zustand welche Modus ist in verwenden) |
| `Prove who signed it` | ECDSA prüft possession von ein Schlüssel, nicht ein rechtlich Identität. Kein CA, kein KYC. | **prüfen Integrität gegen ein selbst.assertiert Signierer Schlüssel** (`trust: 'self-asserted'`) |
| `Role views are enforced` | Rolle switching ist CSS-level presentation nur. | **Rolle views Änderung UI nur — nicht ein access-control Grenze** |
| `zero-knowledge` | Der Modul wraps Schlüssel lokal; es führt durch kein ZK Nachweis und hat kein Server protocol. | **lokal self-custodied Schlüssel** (Verzeichnis Name `zero-knowledge-identity` ist historical) |
| `Blind relay` (as ein Kryptografie Behauptung) | Der Relay leitet weiter Chiffretext es kann nicht lesen; das ist Transport blindness, nicht ein blind-Signatur scheme. | **Serverblind Chiffretext Relay** |

## 2. Formulierung das bleibt (geprüft durch Audit)

- `destructive redaction` — byte-level Prüfung bestanden; der exportiert PDF hat
  kein recoverable Text Ebene.
- `server never sees plaintext` — Relay leitet weiter Chiffretext nur.
- `100k+ nodes at 60fps` — gemessen 100k / 54–60fps.

## 3. Naming exception

`modules/detached-hash-signer`, `modules/blind-relay` und
`modules/zero-knowledge-identity` behalten ihrer Verzeichnis Namen für compatibility.
Jeder user-facing Dokument muss pair Name mit der accurate Begriff oben und
muss nicht describe Implementierung as forward-Geheimnis, blind-Signatur oder
Zero-Knowledge cryptography.

## 4. Umfang

Diese sind Formulierung corrections nur. Kein API, Export, Datei Pfad, wire Format,
Kryptografie primitive oder access-control decision ist changed durch dies Baseline.
