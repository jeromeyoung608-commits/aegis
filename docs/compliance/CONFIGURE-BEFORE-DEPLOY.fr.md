<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/CONFIGURE-BEFORE-DEPLOY.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Configure avant deploy — opérateur-supplied faits

> **Portée.** Ce est le unique liste de contrôle pour chaque fact Aegis asks le **deploying
> responsable du traitement** (vous) à provide. Rien ici est livré pre-filled et Aegis jamais
> fabricates juridique faits. Le produit fournit un rél entrée point — le **opérateur
> console → conformité** onglet — plus fill-in jetons dans le conformité modèles. Fill
> eux avec votre rél juridique entity avant going à production / answering un GDPR
> Article 30 / DPA requête.

## 1. Two ways à supply le faits

| Méthode | Best pour | Où |
|---|---|---|
| **opérateur console → conformité onglet** (recommended) | Day-to-day entrée, persistance, signed-doc téléversement, one-click "rempli" modèle génération | `/aegis-shell/console.html`, journal dans as un **opérateur**, ouvert le **conformité** onglet |
| **Éditer le modèles directement** | White-label / juridique revue de le brut markdown | `docs/compliance/ROPA.md`, `PRIVACY-POLICY.md`, `DPA.md`, `SLA.md` |

Le console écrit à `data/compliance/legal.json` et téléversé documents à
`data/compliance/files/` — un runtime volume que est **jamais servi statically**
(`config` / `data` / `server` premier niveau dirs sont denied) et **jamais livré**
(`data/` est excluded de le livraison paquet). Donc aucun opérateur fact ou secret
laisse votre déploiement (B-03 classe).

## 2. Pre-deploy liste de contrôle

| # | Élément | console champ | Modèle jeton | Modèle fichier | Exemple | Requis |
|---|---|---|---|---|---|---|
| 1 | responsable du traitement juridique nom | responsable du traitement → Juridique nom | `{{CONTROLLER_LEGAL_NAME}}` | `ROPA.md` (ligne 6), `DPA.md` | Acme GmbH | **Oui** |
| 2 | responsable du traitement enregistré adresse | responsable du traitement → Enregistré adresse | `{{CONTROLLER_ADDRESS}}` | `ROPA.md` (ligne 6) | Hauptstr. 1, 10117 Berlin, DE | **Oui** |
| 3 | Company registration aucun. | responsable du traitement → Company registration aucun. | `{{CONTROLLER_REG_NO}}` | `ROPA.md` (ligne 6) | HRB 123456 | Recommended |
| 4 | DPO nom | DPO → DPO nom | `{{DPO_NAME}}` | `PRIVACY-POLICY.md` (§9), `DPA.md` | Jane Doe | Si un DPO est appointed |
| 5 | DPO e-mail | DPO → DPO e-mail | `{{DPO_EMAIL}}` | `PRIVACY-POLICY.md` (§9) | dpo@acme.exemple | Si un DPO est appointed |
| 6 | DPO postal adresse | DPO → DPO postal adresse | `{{DPO_ADDRESS}}` | `PRIVACY-POLICY.md` (§9) | c/o Acme, … | Si un DPO est appointed |
| 7 | UE représentant (GDPR Art.27) | UE représentant → Représentant nom | `{{EU_REP_NAME}}` | referenced dans ROPA / Vie privée Politique | Acme UE Rep Ltd | Si aucun UE establishment |
| 8 | UE représentant adresse | UE représentant → Représentant adresse | `{{EU_REP_ADDRESS}}` | referenced dans ROPA / Vie privée Politique | … | Si aucun UE establishment |
| 9 | SLA contact mailbox | SLA & juridique → SLA contact mailbox | `{{SLA_MAILBOX}}` | `SLA.md` (§0) | opérations@acme.exemple | **Oui** |
| 10 | opérateur timezone | SLA & juridique → opérateur timezone | `{{SLA_TIMEZONE}}` | `SLA.md` (§0) | Europe/Berlin (UTC+1/+2) | **Oui** |
| 11 | Applicable loi | SLA & juridique → Applicable loi | `{{GOVERNING_LAW}}` | `DPA.md` | Laws de Germany | **Oui** |
| 12 | autorité de contrôle | SLA & juridique → autorité de contrôle | `{{SUPERVISORY_AUTHORITY}}` | `PRIVACY-POLICY.md` (§9) | Berliner Beauftragte für Datenschutz | **Oui** |
| 13 | RFC 3161 TSA point de terminaison (facultatif) | Facultatif — TSA gateway → RFC 3161 TSA point de terminaison | `{{TSA_ENDPOINT}}` | (runtime configuration) | https://tsa.example/timestamp | Facultatif |
| 14 | Signé ROPA / DPA / SLA, DPO appointment, logo | conformité → Téléversement document | — | stocké serveur-side, listed dans console | ROPA-signé.pdf | Recommended |

**Si un champ est gauche blank, le généré modèle affiche un visible
`[ … — to be completed ]` marker** plutôt de fake données, donc un incomplete
document est jamais mistaken pour un finished un.

## 2b. sécurité-relevant environnement variables

Ensemble ces sur le serveur processus (ou as container/env secrets). Ils sont jamais
stocké dans `config/local.json` et jamais livré.

| Variable | But | Par défaut | Notes |
|---|---|---|---|
| `AEGIS_ISSUER_SECRET` | opérateur auth + le émetteur secret que signe session/room jetons | _(vide)_ | **Requis dans aucun partagé déploiement.** Sans il, `/session` est verrouillé (aucun jeton peut être minted). Générer out-of-band; résumi as un secret, jamais bake dans le image. |
| `AEGIS_METRICS_TOKEN` | Gates `/metrics` (Prometheus scrape) | _(unset)_ | **Métriques sont fail-closed.** Jusqu.à ce est ensemble, `GET /metrics` retourne `401`. Une fois ensemble, scrape avec `Authorization: Bearer <token>` ou `?token=<token>`. Uniquement enable derrière votre inverser proxy's ACL — il discloses uptime, audit-event nombre, et active-session nombre. |
| `AEGIS_TRUSTED_LAN` | Relaxes `/session` admission pour lab utiliser | `0` | Ensemble `1` **uniquement sur un isolé localhost lab**. Jamais sur un shared/production réseau — il disables le opérateur-credential gate. |
| `AEGIS_DB` | SQLite chemin | `data/aegis.db` | Mount as un volume donc il survive restarts. |
| `PORT` | Listen port | `8080` (Docker `8099`) | Le serveur lie à **tous interfaces** par par défaut — place il derrière un inverser proxy (voir `SECURITY.md`). |
| `AEGIS_TLS_DIR` | Facultatif PEM key/cert pour HTTPS | `~/.aegis/tls` | Si `key.pem`+`cert.pem` exist là, le serveur sert HTTPS (sûr pour cross-machine LAN). |
| `AEGIS_MFA_MODE` / `AEGIS_MFA_KEY` | opérateur MFA (`totp`/`webauthn`) | `off` | Enable pour production opérateur comptes. |
| `AEGIS_AUTH_MODE` / `AEGIS_OIDC_*` | Externe IdP (OIDC) | `local` | Facultatif SSO pour opérateurs. |
| `AEGIS_SCIM_TOKEN` | SCIM 2.0 approvisionnement jeton | _(vide)_ | Uniquement si automatisé compte approvisionnement est utilisé. |
| `AEGIS_RATE_LIMIT` | Par IP request-rate cap | `0` (désactivé) | Ensemble un positif valeur à throttle abuse. |

## 3. En utilisant le opérateur console (recommended chemin)

1. Ouvert `/aegis-shell/console.html` et journal dans as un **opérateur** (opérateur comptes
   sont created par `npm run setup`; le par défaut password equals le configuré émetteur
   secret jusqu.à changed).
2. Ouvert le **conformité** onglet.
3. Fill éléments 1–13 ci-dessus, alors clic **Save faits**.
4. Sous **Téléversement rempli conformité documents**, choisir un fichier, pick son type
   (ROPA / DPA / SLA / DPO-appointment / Logo / Autres), et clic **Téléversement**.
   Téléversé fichiers appear dans le table avec **télécharger** / **supprimer** contrôles.
5. Sous **Générer rempli modèles**, clic **Télécharger rempli ROPA / DPA / SLA /
   Vie privée Politique** — chaque downloads le modèle avec votre faits substituted dans
   le `{{TOKEN}}` placeholders. Hand ces à legal/customers.

### API (même authentication as le console)
Tous require un opérateur session ou le émetteur secret.

| Point de terminaison | Méthode | But |
|---|---|---|
| `/api/compliance` | Obtenir / PUT | lire / écrire le faits object |
| `/api/compliance/files` | Obtenir | liste téléversé documents |
| `/api/compliance/upload` | Publier | téléversement un base64 document (≤ 9 MB) |
| `/api/compliance/file/:id` | Obtenir / Supprimer | retrieve / retirer un téléversé document |
| `/api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA\|SCC\|DPIA>` | Obtenir | télécharger le jeton-filled modèle (bloqué par le usine gate jusqu.à faits sont complet; un téléversé signé copie de le même `kind` également lifts il) |
| `/api/compliance/template/<ROPA\|…>` | Obtenir | télécharger le **blank, unfilled** modèle (`{{TOKEN}}` placeholders, `TEMPLATE — UNFILLED` pied de page) — always available, bypasses le gate |
| `/api/compliance/status` | Obtenir | état de préparation sonde: lequel requis faits sont encore manquant |
| `/metrics` | Obtenir | Prometheus scrape — **fail-closed**; exige `AEGIS_METRICS_TOKEN` (voir §2b) |

## 4. jeton référence (pour direct modèle édition)

Si vous éditer `docs/compliance/*.md` par hand plutôt de en utilisant le console, remplace ces
jetons avec votre rél values:

```
{{CONTROLLER_LEGAL_NAME}}   Controller legal name
{{CONTROLLER_ADDRESS}}      Controller registered address
{{CONTROLLER_REG_NO}}       Company registration number
{{DPO_NAME}}                Data Protection Officer name
{{DPO_EMAIL}}               Data Protection Officer email
{{DPO_ADDRESS}}             Data Protection Officer postal address
{{EU_REP_NAME}}             EU representative name (GDPR Art.27)
{{EU_REP_ADDRESS}}          EU representative address
{{SLA_MAILBOX}}             SLA contact mailbox
{{SLA_TIMEZONE}}            Operator timezone
{{GOVERNING_LAW}}           Governing law of the DPA
{{SUPERVISORY_AUTHORITY}}   Lead EU/UK supervisory authority
{{TSA_ENDPOINT}}            Optional RFC 3161 TSA endpoint
```

## 5. Sign-off

- [ ] Éléments 1, 2, 9, 10, 11, 12 terminé (responsable du traitement identité, SLA, applicable loi, authority)
- [ ] DPO details (4–6) terminé ou explicitement "ne pas appointed"
- [ ] UE représentant (7–8) terminé **ou** confirmé ne pas requis (UE establishment existe)
- [ ] Signé ROPA / DPA / SLA téléversé (élément 14) où contractually requis
- [ ] "Télécharger rempli" documents généré et reviewed par juridique
- [ ] `AUTH_JWT_SECRET` / émetteur secret ensemble à un unique valeur par environnement (jamais le dev par défaut)
- [ ] déploiement image pushed à **votre propre** registry avec secrets supplied via env/secret, ne pas baked dans (voir `ACR-PRIVATE-REGISTRY.md`)
