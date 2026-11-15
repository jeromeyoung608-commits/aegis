<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/DEPLOYMENT-DELIVERY-CHECKLIST.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis — déploiement & Livraison Liste de contrôle

> Utiliser pour chaque Client déploiement. Les deux parties sign §7 à handover. Tick le
> boîtes que appliquer; écrire N/A où un étape fait ne pas appliquer, avec un reason.
> Tout ici est verifiable — aucun étape exige trusting un statut allégation.

**Client:** ⟨juridique entity nom⟩  **Environnement:** ⟨host / cluster / air-gapped?>
**Engagement / Bon de commande ref:** ⟨ref⟩  **Date:** ⟨YYYY-MM-DD⟩

---

## 1. Pre-flight

| ☐ | Vérifier | Comment à vérifier | Résultat |
|---|---|---|---|
| ☐ | Node.js runtime présent et version dans le supported range | `node -v` → major ≥ 22 (`package.json` `engines.node`) | ⟨version⟩ |
| ☐ | Aucun tiers runtime dépendances requis | `npm run verify:zero-deps` → Résumi | ☐ |
| ☐ | Cible port gratuit | `lsof -ti:<port>` → vide (par défaut 8080) | ☐ |
| ☐ | navigateur présent (WebGPU / WebRTC / OCR besoin un rél navigateur) | `chrome --version` | ⟨version⟩ |
| ☐ | Disque space pour OCR actifs + preuve coffre-fort | ≥ 500 MiB gratuit | ⟨gratuit⟩ |
| ☐ | Sauvegarde taken de le cible environnement | Client enregistrement | ☐ |

## 2. Installation

| ☐ | Étape | Commande / preuve |
|---|---|---|
| ☐ | One-click installer terminé | `npm run setup` → success journal |
| ☐ | serveur démarre et sert theshell | `node server.js` → `curl -sf http://localhost:<port>/` |
| ☐ | Aucun source, clé ou archive chemin est downloadable | `curl` sur `/server.js`, `/config/local.json` → 404 |
| ☐ | Unauthorised chemins refused | `verify:p3` gate → Résumi |

## 3. Configuration

| ☐ | Étape | Où | Valeur |
|---|---|---|---|
| ☐ | Local secret généré & stocké **uniquement** sur le opérateur's machine | `config/local.json` (jamais committed, jamais livré) | ☐ |
| ☐ | Émetteur keypair généré (ECDSA) | `npm run setup` sortie | ☐ |
| ☐ | Port / lier adresse ensemble | `config/local.json` | ⟨port⟩ |
| ☐ | OIDC / SSO facultatif intégration | `server/oidc.js` | ☐ / N/A |
| ☐ | Facultatif RFC 3161 TSA point de terminaison configuré | `adapters/tsa-rfc3161/config-default.js` | ☐ / N/A |
| ☐ | **Fail-closed mode vérifié**: externe TSA unreachable → local temps repli, relais intact | `verify:tsa` hors ligne smoke test | ☐ |

## 4. sécurité vérification (exécuter tous — enregistrement le sortie ligne)

| ☐ | Gate | Commande | Résultat |
|---|---|---|---|
| ☐ | Licensing en-têtes | `npm run verify:headers` | ☐ Résumi |
| ☐ | Licensing conformité | `npm run verify:licensing` | ☐ Résumi |
| ☐ | Allégations formulation | `npm run verify:claims` | ☐ Résumi |
| ☐ | Zéro dépendance lint | `npm run verify:zero-deps` | ☐ Résumi |
| ☐ | Diagnostics | `npm run doctor` | ☐ 0 échecs |
| ☐ | Unité + intégration suite | `npm test` | ☐ résumi / ☐ échec |
| ☐ | Livraison pack reproductible | `npm run pack:delivery && npm run verify:delivery` | ☐ Résumi |
| ☐ | CSP nonce enforced (aucun inline script sans nonce) | `verify:csp` | ☐ Résumi |
| ☐ | COOP/COEP en-têtes présent (cross-origin isolation) | `curl -I` → en-têtes | ☐ |
| ☐ | `.well-known/security.txt` présent avec un monitored contact | `curl` → fichier | ☐ |
| ☐ | SBOM regenerated pour ce build | `npm run sbom` → `SBOM.cdx.json` | ☐ |

## 5. Functional vérification (le s sept étapes boucle)

| ☐ | Étape | Vérifié par |
|---|---|---|
| ☐ | 1 topologie (appareil graph rend à échelle) | ☐ |
| ☐ | 2 Rédacteur — destructive caviardage (aucun recoverable texte couche) | ☐ |
| ☐ | 3 Sign (détaché empreinte signature, auto-déclaré clé) | ☐ |
| ☐ | 4 Envoyer (P2P relais, serveur voit texte chiffré uniquement) | ☐ |
| ☐ | 5 Recevoir / vérifier | ☐ |
| ☐ | 6 Archive (chiffré OPFS coffre-fort) | ☐ |
| ☐ | 7 audit (détecteur de falsification chaîne d'empreintes) | ☐ |
| ☐ | preuve export (portability lot avec `producer` / `provenance`) | ☐ |
| ☐ | WebGL2 repli chemin (aucun WebGPU machine) | ☐ |

## 6. Handover pack livré à le Client

| ☐ | Élément | Où |
|---|---|---|
| ☐ | logiciel + licence (Apache-2.0) | `LICENSE`, `LICENSES/Apache-2.0.txt` |
| ☐ | SBOM pour le livré build | `SBOM.cdx.json` |
| ☐ | Livraison archive + SHA256 empreinte | `dist/aegis-delivery-<version>.tar.gz` + empreinte |
| ☐ | Tiers attribution index | `NOTICE`, `modules/*/vendor/MANIFEST.json` |
| ☐ | API / SDK documentation | `docs/API.md`, `docs/SDK.md` |
| ☐ | Claims-wording base de référence (marketing guardrails) | `docs/CLAIMS-WORDING.md` |
| ☐ | sécurité politique + support SLA + escalation contacts | `SECURITY.md`, `.well-known/security.txt`, Bon de commande §4 |
| ☐ | opérateur training (enregistré) | ⟨session date, attendees⟩ |
| ☐ | clé matériel handover + rotation procédure | ⟨procédure ref⟩ |

## 7. Handover sign-off

| | Prestataire | Client |
|---|---|---|
| Nom | Jerome Young (Yang Jie) | ⟨nom⟩ |
| Rôle | mainteneur | ⟨rôle⟩ |
| signature | | |
| Date | | |

**Outstanding éléments à handover** (écrire eux ici; les deux parties conserver un copie):

1. ⟨élément + propriétaire + due date⟩
2. ⟨élément + propriétaire + due date⟩

**Ne pas couvert par ce déploiement** (état explicitement, e.g. tiers
attestation, custom development, on-site work): ⟨liste ou "aucun">⟩

---

*Appendix: le authoritative gate liste est `package.json` `scripts` et
`.github/workflows/ci-runtime.yml`. Si un commande dans ce liste de contrôle aucun plus long
existe, que est un défaut dans le liste de contrôle — correctif il, do ne pas tick il.*
