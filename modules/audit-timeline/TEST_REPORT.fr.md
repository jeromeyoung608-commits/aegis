<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/audit-timeline/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Test Rapport - Détecteur de falsification piste d'audit

## 1. Summary

| Élément | Résultat |
| --- | --- |
| Suite | `modules/audit-timeline/tests/trail.test.mjs` |
| Commande | `npm test` (`node --test`) |
| Tests | 15 |
| Résumi | 15 |
| Échoué | 0 |
| Duration | 184 ms |
| Dépendances | Aucun (Node built-ins uniquement) |
| navigateur reception | Résumi sur le commande centre et le autonome revue page |

Environnement: macOS 15.6.1, Node v26.0.0, Chromium-based navigateur session.

---

## 2. Headless résultats

```
> @aegis/audit-timeline@1.0.0 test
> node --test

ok 1  appends links in order and chains each hash to the previous one
ok 2  concurrent appends are serialized into one unbroken chain
ok 3  canonical serialization makes key order irrelevant to the link hash
ok 4  verify reports the first edited link
ok 5  verify reports reordered links
ok 6  a link hash covers actor, event, detail and fingerprint
ok 7  persists a chain and restores it intact
ok 8  restores a tampered persisted chain in a broken state
ok 9  a corrupt stored log is reported instead of silently ignored
ok 10 rejects an unknown schema
ok 11 reset returns the trail to a fresh genesis state
ok 12 appends after load continue the restored chain
ok 13 append requires an actor and an event name
ok 14 snapshot is a content-free, exportable structure
ok 15 clock and digest formatting stay compact

tests 15 | pass 15 | fail 0
```

### Couverture matrix

| Exigence | Test |
| --- | --- |
| Chaque lien lie à le previous empreinte | 1 |
| Premier lien lie à le 64-zéro genesis | 1 |
| Concurrent UI événements ne peut pas fork le chain | 2 |
| Déterministe données utiles serialization | 3 |
| Édition un entrée est detected à le droit index | 4 |
| Reordering entrées est detected | 5 |
| Actor / événement / détail / empreinte tous affect le empreinte | 6 |
| Recharger restaure le même tête et intact verdict | 7 |
| Un altéré stocké chain loads as `brokenAt = 1`, ne pas as valide | 8 |
| Corrupt JSON est surfaced, jamais silencieusement ignored | 9 |
| Inconnu schema versions sont rejeté | 10 |
| Clair removes persistant état et resets genesis | 11 |
| Nouveau événements continue un restauré chain | 12 |
| Vide actor ou événement est rejeté | 13 |
| Export snapshot porte schema, genesis, tête et liens | 14 |
| `HH:MM:SS` et short-empreinte formatting | 15 |

---

## 3. navigateur reception

### 3.1 Autonome revue page (vide état)

Opened `/modules/audit-timeline/index.html` avec aucun stocké trail.

- Heading `Who did what, and when.` rendu.
- Statut badge: `chain empty - append-only log ready`.
- Empty-state sentence: `No audit events yet. Open the workbench and run a document through the closed loop.`
- console contained uniquement le Aegis signature ligne; aucun page-level erreurs.

### 3.2 Commande centre exécuter

Opened `/aegis-shell/index.html`, waited pour le établi, alors clicked
**Test signé livraison**.

Observed:

- `Verified - 2 signer(s) - SHA-256 72fe7dbd7fdc...`
- **Archive à coffre-fort** bouton became visible uniquement après le verdict.
- piste d'audit entrées:
  - `[HH:MM:SS] Engineer-A - ECDSA signature generated` avec
    `Fingerprint 677A18AB552A` et un SHA-256 prefix.
  - `[HH:MM:SS] Boss-B - Verification passed` avec `2/2 signatures valid`.
- Statut badge: `chain intact - 2 links - head 7C866913...`.

### 3.3 Recharger et cross-page persistance

- Reloaded le commande centre: le même `2 links` et tête `7C866913...` étaient restauré,
  encore `chain intact`.
- Opened le autonome revue page dans un deuxième onglet: le même two entrées et
  `chain intact - 2 links` étaient displayed, confirming les deux surfaces lire un chain.
- Ran le signed-delivery démo une fois more dans le commande centre: le statut became
  `chain intact - 4 links - head 1F9AB3E9...`, et le nouveau signature entrée carried
  `Fingerprint 00022595F310`. Ce également exercises le serialized ajouter file d'attente: two
  liens étaient ajouté à le restauré chain sans forking il.

---

## 4. Défauts trouvé et resolved

### 4.1 Signature et vérification collapsed dans un horodatage

**Symptom:** le premier implémentation dérivé le `ECDSA signature generated` lien de
le final vérification message. Les deux liens appeared dans le même rendu résumi, donc le
chronologie pourrait ne pas show signature avant livraison et vérification après il.

**Correctif:** le signed-delivery module maintenant posts un `signed:sealed` message immédiatement après
building le signature trailer, avant le artefact est transferred. Le shell listens pour
il et appends le signature lien à le rél moment; `signed:verified` appends le verdict
plus tard.

### 4.2 Verdict données utiles avait aucun fingerprints

**Symptom:** `verifyArtifact()` retourne `{ id, ok }` par signataire, lequel est enough pour le
archive gate mais ne pas pour un chronologie que doit show `Fingerprint: 9C4E...`.

**Correctif:** le signed-delivery module computes les deux SPKI SHA-256 fingerprints une fois à démarrage,
stocke eux, et inclut eux dans `signed:sealed`. Fingerprints sont uppercased donc le
iframe readout et le chronologie accepter.

### 4.3 Un corrupted journal pourrait look comme un vide journal

**Symptom:** invalid JSON dans `localStorage` produit un vide chronologie, lequel est
indistinguishable de un frais installer.

**Correctif:** `AuditTrail.load()` enregistrements `loadError` et ensembles `brokenAt = 0`; le statut badge
affiche le stockage erreur, et le chronologie conserve le échec visible.

---

## 5. Lacunes et honête limites

- Le suite tests le chain, ne pas le DOM. Chronologie rendu est vérifié dans un rél
  navigateur (section 3), ne pas avec un headless DOM library.
- navigateur reception était exécuté sur un Chromium-based navigateur. Firefox et Safari étaient
  ne pas exercised.
- `localStorage` est last-writer-wins. Concurrent command-center onglets peut diverge; chaque
  en mémoire chain reste valide, mais uniquement un persistant branch survive.
- Le chain est localement détecteur de falsification, ne pas remotely attested. Replacing le entire stocké
  chain avec un différent internally valide chain est outside le menace modèle jusqu.à le
  tête empreinte est anchored dans un signé artefact ou un externe horodatage service.
- Timestamps come de le local clock et order événements; ils sont ne pas un trusted temps
  source.

---

## 6. Reproduce

```bash
cd modules/audit-timeline
npm test

# browser
cd ../..
node server.js
# command center:   http://localhost:8080/aegis-shell/index.html
# review page:      http://localhost:8080/modules/audit-timeline/index.html
```
