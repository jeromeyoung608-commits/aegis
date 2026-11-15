<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: SECURITY.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# sécurité Politique

## sécurité support période (CRA Art. 13)
Aegis v1.0.0 a un declared sécurité support période de **5 years de premier
publication: 2026-11-15 → 2031-11-15**. Pendant ce période le manufacturer
fournit sécurité met à jour et vulnerability remediation. Le fin date est
disclosed à clients à le temps de purchase (CRA Art. 13(19)); le rationale
pour le période est enregistré dans le technical documentation (Art. 13(8)).

| Version | Supported | sécurité support jusqu.à |
|---------|-----------|------------------------|
| 1.0.x | ✅ | 2031-11-15 |

## Reporting un vulnerability (coordinated disclosure / CVD)
Aegis est un protection de la vie privée, local-processing tool. Si vous find un vulnerability,
**do ne pas ouvert un public problème** avec exploit details. Plutôt, rapport privately à
le mainteneur à **jeromeyoung608@gmail.com** (également published dans
`.well-known/security.txt`) et include:
- un description et impact,
- étapes à reproduce,
- affected version (`Aegis` version de `package.json`).

Nous aim à acknowledge dans **5 entreprise jours** et à provide un remediation
chronologie dans **30 jours** pour confirmé problèmes.

## Portée
Dans portée: le Aegis serveur (`server.js`, `server/store.js`), le TSA adaptateur
(`adapters/tsa-rfc3161`), et le opérateur console (`aegis-shell/console.html`).
Hors de portée: le underlying navigateur, Node.js runtime, et aucun tiers TSA vous
configure.

## sécurité posture (summary)
- Zéro **npm** runtime dépendances. navigateur modules vendor tiers libraries (PDF.JS, pdf-lib, Tesseract.JS) committed sous chaque module's `vendor/` répertoire; le SBOM (`scripts/gen-sbom.mjs`) lists tous de eux — et le dev/test `playwright` tooling — honestly. Le "zéro dépendance" allégation s.applique à le **cœur noyau** (`crypto / hash-chain / audit / signaling / redaction render`); il est ne pas un allégation que le entire produit contient aucun tiers code.
- serveur-blind transfert: le relais stocke uniquement opaque texte chiffré.
- jeton-gated signalisation + par IP débit limiting.
- opérateur-only audit / révocation / séquestre APIs.
- Local CRL-style révocation checked à session admission.
- GDPR Art. 17 effacement avec conservé conformité markers.

## réseau exposure & déploiement durcissement

**Par par défaut le serveur lie à tous réseau interfaces** (`server.listen(PORT)` avec aucun
host argument → `0.0.0.0` / `::`). Le statique console UI, le jeton-gated signalisation
relais, et le métriques point de terminaison sont donc reachable de **aucun host que peut route
à le port** (par défaut `8099`, ou `PORT`). Ce est intentional pour un single-opérateur
local établi, mais il est **ne pas** sûr à expose brut sur un partagé / untrusted réseau.

déploiement règles:
- **Put Aegis derrière un inverser proxy** (nginx, Caddy, Traefik, ou votre LoadBalancer) que
  terminates TLS, enforces authenticated accès, et restricts source IPs / CIDR ranges.
  Do ne pas publish le brut Node port à le internet ou un partagé LAN segment.
- Le inverser proxy est également où vous devrait expose `/metrics` **uniquement si** vous avoir ensemble
  `AEGIS_METRICS_TOKEN` (il est fail-closed sinon — voir
  `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md`). Conserver métriques derrière le proxy's ACL.
- **Jamais** ensemble `AEGIS_TRUSTED_LAN=1` sur un partagé ou production réseau — il relaxes le
  `/session` admission control pour lab utiliser uniquement et est explicitement unsafe au-delà localhost.
- Le opérateur console et signalisation relais les deux require un opérateur session / émetteur
  secret; le statique UI est unauthenticated par conception (il est un connexion screen), donc le
  proxy doit enforce qui peut reach il.

Voir `docs/compliance/THREAT-MODEL.md` et `docs/compliance/CRA-NIS2.md` pour le
complet analysis. **Un indépendant tiers pénétration test est encore requis
avant aucun production déploiement allégation.**

## CRA incident reporting commitment
Pour vulnerabilities que qualify as un **severe incident** sous le UE Cyber
Resilience Act (Regulation (UE) 2024/2847, Art. 14/71), le manufacturer commits
à le following reporting chronologie à le competent authority (BSI dans Germany):

- **Dans 24 hours** de becoming aware: un early warning (Art. 14(2));
- **Dans 72 hours**: un vulnerability notification / incident rapport avec le
  available details (Art. 14(3));
- **Dans 14 jours**: un final rapport avec racine provoquer et remediation (Art. 14(4)),
  ou un reasoned delay où faits sont encore sous investigation.

Note: le CRA reporting obligations avoir appliqué since **2026-09-11**. Où Aegis
est déjà supplied dans le UE, ces sont actuel obligations, ne pas future plans.
⚠️ Ce commitment est un commercial/process statement, ne pas juridique advice; le exact
déclencheur, authority et aucun micro/small-enterprise exemptions doit être confirmé par
qualifié juridique.
