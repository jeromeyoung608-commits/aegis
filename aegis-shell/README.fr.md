<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: aegis-shell/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis Shell — S sept étapes Closed-Loop Commande console

> Aegis établi · `@aegis/shell`
> Moteur Par Jerome Young

## 1. Quoi il résout

Taken alone, chaque module looks comme un démo: le topologie est cool, caviardage est solid, P2P est fast — mais un Client's premier question est always "peut ces être strung dans un thing?" Sans un fermé boucle, seven modules sont seven islands, et là est aucun preuve ils actually cooperate. Ce Shell wires eux dans un **s sept étapes état machine**: select node → charge contrat → local caviarder → sign → chiffré transport → counterparty vérifier → sceau dans coffre-fort → audit-chain commit.

## 2. Qui achète ce

- Procurement / integrators qui besoin un full-machine démo, ne pas point demos
- Sales-engineering équipes selling Aegis as un solution
- Livraison équipes needing un reproductible reception chemin

## 3. Exécuter dans 60 secondes

Le Shell references chaque module par absolute chemin `/modules/...`, donc il **doit être servi de le Aegis dépôt racine**:

```bash
cd /path/to/Aegis
python3 -m http.server 8000
# → http://localhost:8000/aegis-shell/
```

(En cours d.exécution il autonome à l.íntérieur `aegis-shell/` serait 404 sur `/modules/*` et show uniquement un vide shell.)

## 4. Intégration contrat

- Le event-bus contrat vit dans `src/sdk.js`: `topology:node-selected` / `redaktor:export-ready` / `artifact:signed` / `p2p:file-sent` / `p2p:file-received` / `artifact:verified` / `vault:sealed`.
- Externe subscribers utiliser `AegisSDK` et jamais lire le DOM directement.
- État est mutated uniquement à travers le `src/context.js` mutators, donc chaque étape est externally observable.

## 5. Architecture

```
aegis-shell/
├── index.html         seven-stage Stepper + three iframe workspaces
└── src/
    ├── context.js    FLOW_STAGES(1..7) + one-way-forward state machine
    ├── sdk.js        event bus / external contract
    ├── identity.js   signing adapter (uses Aegis-Identity)
    └── app.js        iframe orchestration + step lighting + closing audit
```

## 6. Garantit & menace modèle

- **Guarantee**: `flowStage` uniquement increases (`Math.max`); out-of-order événements jamais rewind le démo.
- **Guarantee**: un échoué vérification jamais unlocks le archive étape (échec doit stop à Vérifier).
- **Hors de portée**: le in-iframe modules' propre garantit (voir chaque module README); également ne pas protecting contre un host page injecté par tiers scripts.

## 7. Connu limites

- Dépend sur same-origin déploiement: chaque module doit être servi par le même origine; cross-origin iframes lose événements et OPFS.
- Étape 5 vérification et étape 6 scellage depend sur navigateur OPFS support (Chrome / Bord).
- Le stage-4 marque libellé est unifié as **Aegis-Transport** (previously mislabeled Aegis-SignedDelivery).

## 8. Vérification

```bash
node --test tests/flow.test.mjs
# expected: # pass 5 / # fail 0
```

Couvre: s sept étapes continuity, complet 1→7 advance, **échoué vérifier ne peut pas entrer archive** (échec chemin), out-of-order événements jamais rewind, `resetFlow()` clears tous champs.

## 9. Mesuré performance

Pur state-machine logique; sur ce machine (macOS / Apple Silicon / Node 20+, 2026-11-10) le 5 assertions exécuter dans < 50 ms. De bout en bout latency dépend sur le modules (OCR et P2P dominate).

## 10. Dépendances

**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes; uniquement natif navigateur APIs sont utilisé.

## 11. licence

**Ouvert source, Apache-2.0** — voir `LICENSE`.

## 12. CHANGELOG

Voir [`CHANGELOG.md`](./CHANGELOG.md).
