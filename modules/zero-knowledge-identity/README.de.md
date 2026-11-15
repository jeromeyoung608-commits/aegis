<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/zero-knowledge-identity/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# zero-knowledge-identity — Lokal Self-Custodied Schlüssel Primitive

> **Terminology**: Verzeichnis Name ist historical. Dies Modul wraps Schlüssel lokal
> mit PBKDF2 + AES-GCM; es führt durch **kein Zero-Knowledge Nachweis** und implementiert kein
> Server protocol. Sagen "lokal self-custodied Schlüssel". Siehe `docs/CLAIMS-WORDING.md`.

## 1. Was es löst
Signatur und Prüfung brauchen Schlüssel das niemals sit in Klartext und identities das survive Neu laden ohne leaking. zero-knowledge-identity wraps Passphrase-protected Schlüssel, stabil offentlich fingerprints, und versiegelt (public-only) Datensätze.

## 2. Wer kauft dies
Irgendein Modul das benötigt non-extractable Schlüssel Material, ein human-checkable Fingerabdruck, und ein safe-to-share offentlich Identität Karte.

## 3. Ausführen in 60 Sekunden
```bash
cd modules/zero-knowledge-identity
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser identity UI)
```

## 4. Integration Vertrag
Schlüssel Generation, Passphrase wrapping/unwrapping, Fingerabdruck, und sealed-record construction sind importable. e2e-signed-delivery verbraucht Kryptografie Ebene.

## 5. Architektur
privat Schlüssel → AES-GCM wrap mit Passphrase → Blob (kein Klartext PKCS#8) → Fingerabdruck von offentlich Schlüssel → versiegelt offentlich Karte. Neu laden re-derives Schlüssel von Passphrase.

## 6. Garantiert & Bedrohung Modell
Klartext PKCS#8 ist wiped vor Verpackung löst auf; falsch Passphrase schlägt fehl loudly; versiegelt Datensätze reject irgendein Schlüssel Material Leck. Außer von Umfang: Passphrase weakness.

## 7. Bekannt Grenzen
Sicherheit rests auf Passphrase strength und ein non-compromised host.

## 8. Prüfung
`node --test` → Suite grün (wrap/unwrap, Fingerabdruck stability, Neu laden, Leck Erkennung).

## 9. Gemessen Leistung
Wrapping/verification sind tens von milliseconds (nativ Web Kryptografie).

## 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen (Plattform Web Kryptografie).

## 11. Lizenz
Repository Lizenz.

## 12. CHANGELOG
- 2026-11-11 — README zugestellt (Englisch); MDS-1 Vertrag.
