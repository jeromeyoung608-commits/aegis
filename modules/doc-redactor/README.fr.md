<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# doc-rédacteur — Local-First document caviardage

## 1. Quoi il résout
Sensible PDF doit être redacted et sanitized avant sharing, mais clients va ne pas téléversement eux à un serveur. doc-rédacteur fait le entire job dans le navigateur: zéro téléversement, zéro externe requête. Facultatif on-device OCR; le export est produit localement.

## 2. Qui achète ce
conformité / juridique / vie privée équipes qui doit prouver un document jamais gauche le appareil pendant caviardage.

## 3. Exécuter dans 60 secondes
```bash
cd modules/doc-redactor
node --test                 # 62/62 green
python3 -m http.server 8080 # open index.html (works offline)
```

## 4. Intégration contrat
navigateur application exposing `window.REDAKTOR` et un `aegis` canal (`redaktor:load-doc`, `export-ready`). Cœur caviardage functions sont importable; le shell pilote il via iframe + postMessage.

## 5. Architecture
PDF parsed in-navigateur → regions redacted (vecteur + raster) → localement produit export. OCR s.exécute on-device quand activé; rien est envoyé à un serveur.

## 6. Garantit & menace modèle
Zéro externe requêtes (vérifié hors ligne), local-only traitement. Hors de portée: compromis host OS, malicious navigateur extension.

## 7. Connu limites
Heavy OCR / grand balaye depend sur appareil CPU; very grand PDF sont bounded par onglet mémoire.

## 8. Vérification
`node --test` → 62/62 vert (caviardage correctness, zero-external-request CSP, export intégrité).

## 9. Mesuré performance
Suite < 2 s; caviardage opérations sont sub-frame dans le navigateur.

## 10. Dépendances
**Un · Pur Zéro** première partie code: 0 npm dépendances. Embarqué `pdf-lib` via import carte (kept à l.íntérieur le module, ne pas un runtime dépendance).

## 11. licence
dépôt [licence](../LICENSE) — **MIT**, couvrant tous première partie code. Embarqué composants conserver leur propre amont licences (voir README §11 et `vendor/THIRD_PARTY_NOTICES.md`).

## 12. CHANGELOG
- 2026-11-11 — vérifié 62/62 vert; README livré (Anglais).
