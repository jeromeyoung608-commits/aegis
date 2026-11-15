<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# encrypted-archive — Lokal Zero-Knowledge Tresor

## 1. Was es löst
Signiert Artefakte und Geheimnisse muss sein versiegelt so das auch ein lokal dump enthüllt nichts. encrypted-archive ist ein lokal, Zero-Knowledge Tresor: Dateien sind verschlüsselt vor sie touch Datenträger (OPFS/IndexedDB) und Verschlüsselung Schlüssel niemals persist in Klartext.

## 2. Wer kauft dies
Irgendein Workflow das benötigt zu Speicher signiert Artefakte, Schlüssel, oder intermediate Zustand lokal ohne leaking Klartext auf Datenträger.

## 3. Ausführen in 60 Sekunden
```bash
cd modules/encrypted-archive
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser vault)
```

## 4. Integration Vertrag
`createVault`, `openOpfsStore`, und sealing/verification helpers sind importable. Der Shell Aufrufe `createVault` nach ein geprüft Artefakt ist erzeugt.

## 5. Architektur
Klartext → AES-GCM Siegel mit ein Passphrase-derived Schlüssel → Chiffretext nur auf OPFS/IndexedDB. Der offentlich Karte offenlegt nichts das könnte entschlüsseln Tresor.

## 6. Garantiert & Bedrohung Modell
Kein Klartext Schlüssel Material bei Rest; `isSealed` lehnt ab Datensätze Leck Schlüssel Material. Außer von Umfang: Passphrase weakness, host OS Kompromittierung.

## 7. Bekannt Grenzen
Browser-only Persistenz (OPFS/IndexedDB); ein fehlt Browser Umgebung ist abgelehnt loudly vielmehr als faked.

## 8. Prüfung
`node --test` → Suite grün (Tresor get/put/list/remove, overwrite, clone Isolation, OPFS refusal ohne Browser).

## 9. Gemessen Leistung
Tresor Betrieb sind sub-millisecond in node; Browser OPFS bound durch Gerät Speicher.

## 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen (Plattform Kryptografie + Speicher).

## 11. Lizenz
Repository Lizenz.

## 12. CHANGELOG
- 2026-11-11 — README zugestellt (Englisch); MDS-1 Vertrag.
