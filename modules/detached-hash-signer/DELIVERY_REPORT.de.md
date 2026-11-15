<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# detached-Hash-Signierer — Lieferung Bericht (MDS-1)

> Maschinenprüfbar Lieferung Vertrag. Spiegelt der 12 chapters von README und answers der buyer's questions direkt.

### 1. Was es löst
Mehrpartei Genehmigung von vertraulich Dokumente: jeder Signierer signiert nur ein SHA-256 Hash, so Dokument Bytes niemals leave der lokal Maschine und niemals betreten Signatur Paket.

### 2. Wer kauft dies
B2B Teams needing Mehrpartei Genehmigung ohne exposing Dokument Bytes (legal/finance/exec Mitzeichnung, regulatory filing).

### 3. Ausführen in 60 Sekunden
```bash
cd modules/detached-hash-signer && node --test   # 8/8 green
python3 -m http.server 8080                       # open index.html
```

### 4. Integration Vertrag
Rein ESM, null Abhängigkeiten, Browser + Node. `sha256Hex`, `generateKeyPair`, `export/importPublicKey`, `signHash`, `verifySignature`, `makeBundle`, `verifyBundle`, `isDetached`. Auch `window.DetachedHashSigner`.

### 5. Architektur
doc → SHA-256 → docHash → jeder exec signiert Hash → `makeBundle` (Hash + Signaturen nur) → `verifyBundle`. Kein Dokument Bytes travel.

### 6. Garantiert & Bedrohung Modell
Abgetrennt Eigenschaft (`isDetached`), Signatur Prüfung, Manipulation resistance. Außer von Umfang: private-Schlüssel Kompromittierung, host OS Kompromittierung.

### 7. Bekannt Grenzen
Signiert Hash nur; Dokument Transport behandelt Upstream. Kein enforced Signatur Reihenfolge chain.

### 8. Prüfung
`node --test` → **8 / 8 bestanden, 0 fehlgeschlagen** (`tests/detached-hash-signer.test.mjs`).

### 9. Gemessen Leistung
Sub-millisecond sign/verify; vollständig Suite ~23 ms (Node 26).

### 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen (Plattform Web Kryptografie).

### 11. Lizenz
Repository Lizenz. Aegis's eigen Implementierung, kein Drittanbieter Zuordnung encumbrance.

### 12. CHANGELOG
- 2026-11-11 — zugestellt; 8/8 Assertions grün; eigenständig Index.html; MDS-1 Vertrag.
