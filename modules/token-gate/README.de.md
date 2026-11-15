<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Token-gate — Token-Gated Räume (ECDSA Raum Token)

> ECDSA Token-gated WebRTC / Zusammenarbeit Räume. Nur geprüft Schlüssel-holders darf betreten Mitzeichnung Sitzung.

---

### 1. Was es löst
Klartext WebRTC / Zusammenarbeit Verknüpfungen sind "whoever hat der URL joins" — fatal in B2B. Dies Modul Probleme short-lived, ECDSA (P-256) signiert Token bound zu ein Raum id und ein optional audience (ein specific approver offentlich Schlüssel). Der relay/server prüft Token Signatur mit ein Wurzel offentlich Schlüssel und admits Nur geprüft Schlüssel-holders. Der Server niemals learns wer ein person ist — es nur validiert cryptography.

### 2. Wer kauft dies
Teams needing trusted Zulassung Zusammenarbeit: Mehrpartei Mitzeichnung Räume, privat whiteboards, controlled Daten Räume — irgendein "link-leak shouldn't Gewährung Eintrag" Szenario.

### 3. Ausführen in 60 Sekunden
```bash
cd modules/token-gate
node --test            # 7 assertions, all green
python3 -m http.server 8080  # open http://127.0.0.1:8080/ to see issue/admit demo
```

### 4. Integration Vertrag
Rein ESM, null Abhängigkeiten, Browser + Node. Named exports:
- `generateRootKey()` / `exportPublicKey(k)` / `importPublicKey(b64)` — Aussteller Wurzel Schlüssel
- `issueToken(rootPriv, { room, exp?, ttlMs?, audience?, jti? })` — Problem Token (Kopfzeile.Nutzdaten.Signatur, alle Basis64url)
- `verifyToken(rootPub, token, { room?, requiredAud? })` → `{ok, room, exp, aud, reason}`
- `gate(rootPub, envelope, { room?, requiredAud? })` → `{admit, reason}`
Auch exposed as `window.TokenGate` in Browser.

### 5. Architektur
```
issuer: generateRootKey ─▶ root priv (sign) / root pub (relay holds)
issue:  issueToken(rootPriv, {room, exp, audience}) ─▶ token
admit:  client hello{token,room} ─▶ relay verifyToken(rootPub, token) ─▶ ADMIT / DENY
```
Der Token trägt `room / exp / aud / jti`, signiert durch Wurzel privat Schlüssel; Relay enthält nur Wurzel offentlich Schlüssel und kann nicht forge.

### 6. Garantiert & Bedrohung Modell
- **Token authenticity**: ohne Wurzel privat Schlüssel, kein Signatur forgery; tampered/expired/wrong-room/wrong-audience Token sind alle abgelehnt.
- **Minimal Vertrauen**: Server validiert nur cryptography, enthält kein Identität, niemals touches Dokument.
- Außer von Umfang: Wurzel private-Schlüssel Kompromittierung (soll sein in ein HSM/key manager), kompromittiert Client.

### 7. Bekannt Grenzen
- Token sind stateless (JWT-style); kein Widerruf Liste. Für instant Widerruf, Aussteller maintains ein nonce/denylist.
- Standard `aud:'*'` macht nicht restrict Signierer; high-Sicherheit setups soll binden ein specific offentlich Schlüssel.

### 8. Prüfung
Siehe `TEST_REPORT.md`: `node --test` alle grün (7/7), abdeckend gültig, expired, wrong-room, gefälscht, audience-limited, Gate, und cross-root.

### 9. Gemessen Leistung
Issue/verify sind sub-millisecond (nativ Web Kryptografie ECDSA P-256).

### 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen — nur Plattform Web Kryptografie.

### 11. Lizenz
Konsistent mit Repository Lizenz. Dies Modul ist Aegis's eigen Implementierung.

### 12. CHANGELOG
- v1.0.0 — ECDSA Raum Token, verify/gate, audience restriction, eigenständig Demo, und `TEST_REPORT.md`.
