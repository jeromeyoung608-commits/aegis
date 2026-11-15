<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/audit-timeline/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# audit-timeline — empreinte-Chained audit Chronologie

## 1. Quoi il résout
Chaque meaningful action dans le fermé boucle doit être enregistré donc que tampering est detectable. audit-timeline est un append-only, SHA-256 empreinte-chained chronologie: chaque entrée lie à le previous empreinte, donc deleting ou altering aucun entrée breaks le chain.

## 2. Qui achète ce
Aucun flux de travail que nécessite un détecteur de falsification, localement verifiable piste d'audit de qui fait quoi, quand.

## 3. Exécuter dans 60 secondes
```bash
cd modules/audit-timeline
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser timeline UI)
```

## 4. Intégration contrat
`AuditTrail` (ajouter + vérifier) et `renderTimeline` sont importable; le shell commits un empreinte-chained entrée à chaque closed-loop étape.

## 5. Architecture
entrée → `Hash(prevHash || canonical(entry))` → chain. `verify()` recomputes le chain et flags aucun cassé lien.

## 6. Garantit & menace modèle
Append-only intégrité, tamper-preuve. Hors de portée: un compromis host que rewrites le ensemble chain.

## 7. Connu limites
Chain intégrité est local; cross-party notarization serait besoin un externe anchor.

## 8. Vérification
`node --test` → suite vert (ajouter, vérifier, falsification détection).

## 9. Mesuré performance
empreinte chaining est sub-millisecond par entrée (natif Web Cryptographie).

## 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes (plateforme Web Cryptographie).

## 11. licence
dépôt licence.

## 12. CHANGELOG
- 2026-11-11 — README livré (Anglais); MDS-1 contrat.
