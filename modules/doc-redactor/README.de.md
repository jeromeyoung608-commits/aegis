<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# doc-Redaktor — Local-First Dokument Schwärzung

## 1. Was es löst
Vertraulich PDFs muss sein redacted und sanitized vor sharing, aber Kunden wird nicht Upload sie zu ein Server. doc-Redaktor macht der entire job in Browser: null Upload, null extern Anfrage. Optional on-device OCR; Export ist erzeugt lokal.

## 2. Wer kauft dies
Compliance / rechtlich / Privatsphäre Teams wer muss beweisen ein Dokument niemals links Gerät während Schwärzung.

## 3. Ausführen in 60 Sekunden
```bash
cd modules/doc-redactor
node --test                 # 62/62 green
python3 -m http.server 8080 # open index.html (works offline)
```

## 4. Integration Vertrag
Browser App exposing `window.REDAKTOR` und ein `aegis` Kanal (`redaktor:load-doc`, `export-ready`). Kern Schwärzung functions sind importable; Shell steuert es über iframe + postMessage.

## 5. Architektur
PDF parsed in-Browser → regions redacted (Vektor + raster) → lokal erzeugt Export. OCR läuft on-device wenn aktiviert; nichts ist gesendet zu ein Server.

## 6. Garantiert & Bedrohung Modell
Null extern Anfragen (geprüft offline), local-only Verarbeitung. Außer von Umfang: kompromittiert host OS, malicious Browser Erweiterung.

## 7. Bekannt Grenzen
Heavy OCR / groß scannt depend auf Gerät CPU; very groß PDFs sind bounded durch Registerkarte Speicher.

## 8. Prüfung
`node --test` → 62/62 grün (Schwärzung correctness, zero-external-request CSP, Export Integrität).

## 9. Gemessen Leistung
Suite < 2 s; Schwärzung Betrieb sind sub-frame in Browser.

## 10. Abhängigkeiten
**Ein · Rein Null** Erstpartei Code: 0 npm Abhängigkeiten. Vendiert `pdf-lib` über Import Karte (kept innen Modul, nicht ein Laufzeit Abhängigkeit).

## 11. Lizenz
Repository [Lizenz](../LICENSE) — **MIT**, abdeckend alle Erstpartei Code. Vendiert Komponenten behalten ihrer eigen Upstream licences (siehe README §11 und `vendor/THIRD_PARTY_NOTICES.md`).

## 12. CHANGELOG
- 2026-11-11 — geprüft 62/62 grün; README zugestellt (Englisch).
