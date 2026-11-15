<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/QUICK-START.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Quick démarrage

## 1. Installer & bootstrap
```
git clone <your-registry>/aegis && cd aegis
npm run setup          # prompts for an operator account; default password = AEGIS_ISSUER_SECRET
npm start              # serves http://localhost:8080
```
Ouvert `http://localhost:8080` dans **Chrome ou Bord 113+** (SharedArrayBuffer pour le
WebGPU topologie exige COOP/COEP, lequel Aegis ensembles).

## 2. Établi — le seven-step fermé boucle
1. Select un source node dans le topologie. 2. Charge un document. 3. Caviarder. 4. Sign
(empreinte + signature). 5. Envoyer. 6. Recevoir. 7. Vérifier → sceau. Le boucle ne peut pas go
backwards; ce invariant est verrouillé par `aegis-shell/tests/flow.test.mjs`.

## 3. opérateur console — `aegis-shell/console.html`
Journal dans as le opérateur, alors utiliser le onglets:
- **audit** — append-only piste d'audit (export CSV/JSON).
- **Revoke** — révocation liste management.
- **clé séquestre** — break-glass deposit/retrieve.
- **TSA vérifier** — RFC 3161 horodatage vérification.
- **conformité** — entrer votre rél juridique faits (responsable du traitement, DPO, UE rep, SLA, applicable
  loi, authority) + téléversement signé ROPA/DPA/SLA/DPO letter/logo; générer rempli
  modèles.
- **Setup** — pre-deploy liste de contrôle (export sign-off).
- **données personnes concernées** — DSAR export (Art.20) + effacement (Art.17) + tombstone vérifier.
- **Sessions** — list/revoke opérateur sessions.
- **Configuration** — read-only configuration reflection + sûr toggles (séquestre, MFA enforce), SIEM
  forward URL, incident test, admin MFA reset, DB sauvegarde.

## 4. Pre-deploy liste de contrôle
Work à travers `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` (également le in-console Setup
onglet). Ensemble `AEGIS_ISSUER_SECRET` unique par environnement, push le image à **votre propre**
registry, enable TLS via un inverser proxy, et complet le conformité faits.

## 5. Production déploiement
Voir `deploy/` (docker-compose, Kubernetes/Helm, systemd, nginx/Caddy) et
`docs/compliance/ACR-PRIVATE-REGISTRY.md`. Jamais bake secrets dans le image.
