<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/zero-knowledge-identity/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# zero-knowledge-identity — Localement Self-Custodied clé Primitives

> **Terminology**: le répertoire nom est historical. Ce module wraps clés localement
> avec PBKDF2 + AES-GCM; il exécute **aucun zéro-connaissance preuve** et implémente aucun
> serveur protocol. Dire "localement self-custodied clés". Voir `docs/CLAIMS-WORDING.md`.

## 1. Quoi il résout
Signature et vérification besoin clés que jamais sit dans en clair et identities que survive recharger sans leaking. zero-knowledge-identity wraps phrase secrète-protected clés, stable public fingerprints, et scellé (public-only) enregistrements.

## 2. Qui achète ce
Aucun module que nécessite non-extractable clé matériel, un human-checkable empreinte, et un safe-to-share public identité carte.

## 3. Exécuter dans 60 secondes
```bash
cd modules/zero-knowledge-identity
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser identity UI)
```

## 4. Intégration contrat
clé génération, phrase secrète wrapping/unwrapping, empreinte, et sealed-record construction sont importable. e2e-signed-delivery consomme le cryptographie couche.

## 5. Architecture
privé clé → AES-GCM wrap avec phrase secrète → blob (aucun en clair PKCS#8) → empreinte de public clé → scellé public carte. Recharger re-derives le clé de le phrase secrète.

## 6. Garantit & menace modèle
En clair PKCS#8 est wiped avant encapsulation résout; faux phrase secrète échoue loudly; scellé enregistrements reject aucun clé matériel fuite. Hors de portée: phrase secrète weakness.

## 7. Connu limites
sécurité rests sur phrase secrète strength et un non-compromised host.

## 8. Vérification
`node --test` → suite vert (wrap/unwrap, empreinte stability, recharger, fuite détection).

## 9. Mesuré performance
Wrapping/verification sont tens de milliseconds (natif Web Cryptographie).

## 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes (plateforme Web Cryptographie).

## 11. licence
dépôt licence.

## 12. CHANGELOG
- 2026-11-11 — README livré (Anglais); MDS-1 contrat.
