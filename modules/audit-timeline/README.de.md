<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/audit-timeline/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Audit-timeline — Hash-verkettet Audit Zeitleiste

## 1. Was es löst
Jeder meaningful action in der geschlossen Schleife muss sein aufgezeichnet so das tampering ist detectable. Audit-timeline ist ein nur-appendierbar, SHA-256 Hash-verkettet Zeitleiste: jeder Eintrag bindet zu der previous Hash, so deleting oder altering irgendein Eintrag breaks der chain.

## 2. Wer kauft dies
Irgendein Workflow das benötigt ein manipulationserkennbar, lokal verifiable Audit-Trail von wer tat was, wenn.

## 3. Ausführen in 60 Sekunden
```bash
cd modules/audit-timeline
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser timeline UI)
```

## 4. Integration Vertrag
`AuditTrail` (anhängen + prüfen) und `renderTimeline` sind importable; Shell commits ein Hash-verkettet Eintrag bei jeder closed-loop Stufe.

## 5. Architektur
Eintrag → `Hash(prevHash || canonical(entry))` → chain. `verify()` recomputes der chain und flags irgendein defekt Verknüpfung.

## 6. Garantiert & Bedrohung Modell
Nur-appendierbar Integrität, tamper-Beweis. Außer von Umfang: ein kompromittiert host das rewrites der gesamte chain.

## 7. Bekannt Grenzen
Chain Integrität ist lokal; cross-party notarization würde brauchen ein extern anchor.

## 8. Prüfung
`node --test` → Suite grün (anhängen, prüfen, Manipulation Erkennung).

## 9. Gemessen Leistung
Hash chaining ist sub-millisecond pro Eintrag (nativ Web Kryptografie).

## 10. Abhängigkeiten
**Ein · Rein Null**: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen (Plattform Web Kryptografie).

## 11. Lizenz
Repository Lizenz.

## 12. CHANGELOG
- 2026-11-11 — README zugestellt (Englisch); MDS-1 Vertrag.
