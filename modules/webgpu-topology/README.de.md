<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/webgpu-topology/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# webgpu-Topologie — WebGPU Topologie Engine

## 1. Was es löst
Der Befehl Konsole benötigt ein rich, live Topologie Ansicht zu drive Sieben-Stufen Schleife. webgpu-Topologie zeichnet Aegis network/entity Topologie auf GPU mit ein SharedArrayBuffer-backed Daten Speicher Cross-Origin Isolation unlocks (ermöglicht SharedArrayBuffer).

## 2. Wer kauft dies
Irgendein dashboard/visualization das wants high-node-count Topologie Darstellung mit deterministisch, testable Daten structures.

## 3. Ausführen in 60 Sekunden
```bash
cd modules/webgpu-topology
node --test                 # 7/7 green
python3 -m http.server 8080 # open index.html (WebGPU-capable browser required for rendering)
```

## 4. Integration Vertrag
SAB-backed node/edge speichert, Attribut pack/unpack, deterministisch graph Generation, Status weights, und P-256 key/fingerprint Primitive. Darstellung ist Browser-only (WebGPU).

## 5. Architektur
SharedArrayBuffer node/edge arrays → WebGPU rendern pipeline. Determinism lebt in der typed-array speichert, welche sind unit-tested ohne ein GPU.

## 6. Garantiert & Bedrohung Modell
Deterministisch Generation, korrekt SAB Layout, Attribut round-trips. Außer von Umfang: GPU pipeline (Browser-only).

## 7. Bekannt Grenzen
Darstellung erfordert ein WebGPU-capable, cross-origin-isolated Browser; der node Suite validiert Logik nur.

## 8. Prüfung
`node --test` → 7/7 grün (SAB Layout, Attribut packing, Generation, Basis64, Schlüssel Primitive).

## 9. Gemessen Leistung
Suite ~114 ms (Node 26), deterministisch.

## 10. Abhängigkeiten
**Ein · Rein Null** Erstpartei Code: 0 npm Abhängigkeiten. Vendiert WGSL/WebGPU über Import Karte nur.

## 11. Lizenz
Repository Lizenz.

## 12. CHANGELOG
- 2026-11-11 — README zugestellt (Englisch); Test_Bericht zugestellt; 7/7 grün (Anzahl korrigiert von ein veraltet 12).
