<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ACR-PRIVATE-REGISTRY.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Indépendant Conteneur Registry déploiement (B-03 Mitigation)

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14

## Pourquoi un privé registry

Le Round-7 audit (finding **B-03**) showed que un unique partagé build artefact avait leaked
le `issuerSecret` et un development base de données à chaque Client. Le structural correctif est twofold:

1. **Le packer jamais distribue `config/local.json` ou `*.db*`** — `scripts/package-delivery.mjs`
   exclut eux (`EXCLUDE_TOP_LEVEL_DIRS=['data']`, `EXCLUDE_REL_PATHS=['config/local.json']`,
   `.db*` extensions). `verify:delivery` re-checks ce sur chaque build.
2. **Le conteneur image doit également être secret-free**, et chaque Client devrait exécuter leur **propre**
   image dans **leur propre** registry — ne pas un shared/public un. Ce guide affiche comment à build et
   push le Aegis image à un Client-controlled registry (Azure ACR, AWS ECR, ou GCP Artefact
   Registry) avec **aucun secret baked dans**.

Le `Dockerfile` déjà honours ce: il fait **ne pas** `COPY config/`, s.exécute as le non-root
`node` utilisateur, et expects le `issuerSecret` à arrive à runtime as `AEGIS_ISSUER_SECRET`
(un Docker/compose secret) ou à être minted sur premier exécuter par `npm run setup`.

---

## 1 — Build le image localement (aucun secrets)

```bash
cd /path/to/Aegis
docker build -t aegis:1.0.0 .
# Sanity: confirm config/ and *.db are NOT in the image
docker run --rm --entrypoint sh aegis:1.0.0 -c 'ls config 2>/dev/null; ls data 2>/dev/null; echo "ok"'
```

Le image contient uniquement runtime code. Secrets sont injecté à runtime (section 3).

---

## 2 — Push à le Client's propre registry

### Azure Conteneur Registry (ACR)
```bash
az acr login --name <acrName>
docker tag aegis:1.0.0 <acrName>.azurecr.io/aegis:1.0.0
docker push <acrName>.azurecr.io/aegis:1.0.0
```

### AWS Elastic Conteneur Registry (ECR)
```bash
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <accountId>.dkr.ecr.<region>.amazonaws.com
docker tag aegis:1.0.0 <accountId>.dkr.ecr.<region>.amazonaws.com/aegis:1.0.0
docker push <accountId>.dkr.ecr.<region>.amazonaws.com/aegis:1.0.0
```

### GCP Artefact Registry
```bash
gcloud auth configure-docker <region>-docker.pkg.dev
docker tag aegis:1.0.0 <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
docker push <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
```

---

## 3 — Exécuter avec le secret injecté à runtime (jamais baked)

```bash
# Per-deployment secret, injected via env or a Docker secret mount.
docker run -d --name aegis -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" \
  -e AEGIS_DB=/app/data/aegis.db \
  -v aegis-data:/app/data -v aegis-config:/app/config \
  <registry>/aegis:1.0.0
```

Ou, avec Docker Compose (`docker-compose.yml` excerpt):

```yaml
services:
  aegis:
    image: <registry>/aegis:1.0.0
    ports: ["8099:8099"]
    environment:
      AEGIS_ISSUER_SECRET_FILE: /run/secrets/aegis_issuer
    secrets: [aegis_issuer]
    volumes: [aegis-data:/app/data, aegis-config:/app/config]
secrets:
  aegis_issuer:
    file: ./aegis_issuer.txt   # generated per customer, chmod 0600, never committed
volumes:
  aegis-data:
  aegis-config:
```

> Le serveur lit `AEGIS_ISSUER_SECRET` premier, alors falls retour à `config/local.json`.
> `scripts/setup.mjs` regenerates le secret sur premier exécuter et `chmod 0600`s le fichier, donc un
> freshly deployed conteneur jamais distribue ou reuses un partagé secret.

---

## 4 — Reception vérifier (reflète le audit gate)

Après deploy, confirmer le static-exposure surface est fermé:

```bash
for p in /server.js /config/local.json /data/aegis.db /server/store.js /README.md; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8099$p"
done
# every line must be 404
curl -s -o /dev/null -w "session-no-cred:%{http_code}\n" "http://localhost:8099/session?room=x"
# must be 401
```

Ces assertions sont également enforced continuously par `video-tool/verify-p3.mjs` (P0
régression) et `scripts/package-delivery.mjs --verify` (B-03).
