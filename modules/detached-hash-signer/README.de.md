<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# detached-Hash-Signierer — Abgetrennt Hash Signatur

> **Terminology**: dies ist **abgetrennt Hash Signatur**, *nicht* ein kryptografisch blind
> Signatur scheme. Dort ist kein blinding factor und kein unblinding Schritt — Signierer
> signiert ein SHA-256 Hash sie kann siehe. Der historical Modul Name ist kept für
> compatibility. Siehe `docs/CLAIMS-WORDING.md`.

---

### 1. Was es löst
Mehrpartei Genehmigung often involves extremely vertraulich Dokumente (M&Ein Bedingungen, medical Datensätze, financials). Traditional e-signing forces Signierer zu erhalten der vollständig Datei, creating ein Leck Oberfläche der moment es ist behandelt. Dies Modul lets jeder Signierer sign nur ein **ein SHA-256 Dokument Hash**; Dokument Bytes niemals leave der lokal Maschine, niemals betreten Signatur Paket, und sind niemals seen durch der server/relay.

### 2. Wer kauft dies
B2B scenarios needing **Mehrpartei Genehmigung ohne exposing Dokument Bytes**: legal/finance/executive Mitzeichnung von confidential Dateien, regulatory filing, cross-institution joint endorsement.

### 3. Ausführen in 60 Sekunden
```bash
cd modules/detached-hash-signer
node --test            # 8 assertions, all green
# Standalone browser demo: serve this directory with any static server
python3 -m http.server 8080  # then open http://127.0.0.1:8080/
```

### 4. Integration Vertrag
Rein ESM, null Abhängigkeiten, works in beide Browser und Node (Plattform Web Kryptografie). Named exports:
- `sha256Hex(bytes)` / `sha256HexOfText(text)` — Dokument Hash
- `generateKeyPair()` / `exportPublicKey(k)` / `importPublicKey(b64)` — ECDSA P-256 Schlüssel
- `signHash(privateKey, hashHex)` / `verifySignature(publicKey, hashHex, sigB64)` — sign / prüfen ein Hash (abgetrennt Signatur)
- `makeBundle({docName, docHash, signers})` / `verifyBundle(json)` — abgetrennt Signatur Paket
- `isDetached(json)` — beweist Paket enthält kein Dokument Bytes

Auch exposed as `window.DetachedHashSigner` in Browser, so extern systems kann integrate direkt.

### 5. Architektur
```
confidential doc ──SHA-256──▶ docHash(64 chars)  ──┐
                                                  ├─▶ each exec signs docHash ─▶ signers[]
                                                  │     (doc bytes never leave local)
makeBundle(docHash, signers) ─▶ {kind,docHash,signers}  ← no original
verifyBundle() ─▶ all signatures valid?
```
Der Paket enthält nur `docHash + each signer(publicKey, signature)` — kein Dokument Inhalt.

### 6. Garantiert & Bedrohung Modell
- **Abgetrennt Eigenschaft**: `isDetached` beweist Paket trägt nur Hash + Signaturen, niemals Dokument.
- **Signatur Zuordnung**: jeder Signierer signiert Hash mit ihrer eigen privat Schlüssel; der offentlich Schlüssel prüft. Dies beweist Schlüssel possession nur — Signierer Identität ist selbst.assertiert.
- **Manipulation resistance**: irgendein Signatur Fehler macht `verifyBundle` zurückgeben `ok:false` sofort.
- Außer von Umfang: private-Schlüssel Kompromittierung (holder's Verantwortung), kompromittiert host OS.

### 7. Bekannt Grenzen
- Dies Modul nur signiert Hash; Dokument distribution/storage/transport ist behandelt Upstream (e.g. blind-Relay + encrypted-archive).
- Es macht nicht enforce ein Signatur chain order; chained Mitzeichnung (jeder Partei signiert prior Signaturen) kann sein layered auf top.

### 8. Prüfung
Siehe `TEST_REPORT.md`: `node --test` alle grün (8/8), abdeckend Hash stability, Signatur Prüfung, Manipulation Fehler, three-party abgetrennt Signatur, missing-Signatur Fehler, abgetrennt Eigenschaft, und malformed Eingabe.

### 9. Gemessen Leistung
Einzeln sign / prüfen ist sub-millisecond (nativ Web Kryptografie ECDSA P-256, gemessen auf Node 26).

### 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen — nur Plattform Web Kryptografie.

### 11. Lizenz
Konsistent mit Repository Lizenz. Dies Modul ist Aegis's eigen Implementierung, mit kein Drittanbieter Zuordnung encumbrance.

### 12. CHANGELOG
- v1.0.0 — detached-sign API, abgetrennt Paket, detached-property prüfen, eigenständig `index.html` Demo, und `TEST_REPORT.md`.
