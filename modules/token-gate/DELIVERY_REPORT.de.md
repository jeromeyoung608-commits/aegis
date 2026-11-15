<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Token-gate — Lieferung Bericht (MDS-1)

> Maschinenprüfbar Lieferung Vertrag. Spiegelt der 12 chapters von README.

### 1. Was es löst
Klartext Zusammenarbeit Verknüpfungen admit anyone mit der URL. Dies Modul Probleme short-lived, ECDSA-signiert, room-bound Token; Relay prüft Signatur mit ein Wurzel offentlich Schlüssel und admits nur geprüft Schlüssel-holders. Der Server niemals learns identities.

### 2. Wer kauft dies
Teams needing trusted Zulassung Zusammenarbeit: Mehrpartei Mitzeichnung Räume, privat whiteboards, controlled Daten Räume.

### 3. Ausführen in 60 Sekunden
```bash
cd modules/token-gate && node --test   # 7/7 green
python3 -m http.server 8080            # open index.html
```

### 4. Integration Vertrag
Rein ESM, null Abhängigkeiten, Browser + Node. `generateRootKey`, `export/importPublicKey`, `export/importPrivateKey`, `issueToken`, `verifyToken`, `gate`. Auch `window.TokenGate`.

### 5. Architektur
Aussteller Wurzel Schlüssel → `issueToken` → Token (Kopfzeile.Nutzdaten.Signatur, Basis64url) → Relay `verifyToken(rootPub, token, {room})` → ADMIT/DENY. Relay enthält nur Wurzel offentlich Schlüssel.

### 6. Garantiert & Bedrohung Modell
Token authenticity (kein forgery ohne Wurzel Schlüssel), Ablehnung von expired/wrong-room/wrong-audience/tampered Token. Außer von Umfang: root-Schlüssel Kompromittierung, kompromittiert Client.

### 7. Bekannt Grenzen
Stateless Token, kein Widerruf Liste. Standard `aud:'*'` ist offen; hoch Sicherheit soll binden ein specific offentlich Schlüssel.

### 8. Prüfung
`node --test` → **7 / 7 bestanden, 0 fehlgeschlagen** (`tests/token-gate.test.mjs`).

### 9. Gemessen Leistung
Sub-millisecond issue/verify (nativ Web Kryptografie ECDSA P-256); vollständig Suite ~130 ms.

### 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen (Plattform Web Kryptografie).

### 11. Lizenz
Repository Lizenz. Aegis's eigen Implementierung.

### 12. CHANGELOG
- 2026-11-11 — zugestellt; 7/7 Assertions grün; eigenständig Index.html; MDS-1 Vertrag.
