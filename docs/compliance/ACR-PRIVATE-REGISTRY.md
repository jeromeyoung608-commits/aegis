# Independent Container Registry Deployment (B-03 Mitigation)

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14

## Why a private registry

The Round-7 audit (finding **B-03**) showed that a single shared build artifact had leaked
the `issuerSecret` and a development database to every customer. The structural fix is twofold:

1. **The packer never ships `config/local.json` or `*.db*`** — `scripts/package-delivery.mjs`
   excludes them (`EXCLUDE_TOP_LEVEL_DIRS=['data']`, `EXCLUDE_REL_PATHS=['config/local.json']`,
   `.db*` extensions). `verify:delivery` re-checks this on every build.
2. **The container image must also be secret-free**, and each customer should run their **own**
   image in **their own** registry — not a shared/public one. This guide shows how to build and
   push the Aegis image to a customer-controlled registry (Azure ACR, AWS ECR, or GCP Artifact
   Registry) with **no secret baked in**.

The `Dockerfile` already honours this: it does **not** `COPY config/`, runs as the non-root
`node` user, and expects the `issuerSecret` to arrive at runtime as `AEGIS_ISSUER_SECRET`
(a Docker/compose secret) or to be minted on first run by `npm run setup`.

---

## 1 — Build the image locally (no secrets)

```bash
cd /path/to/Aegis
docker build -t aegis:1.0.0 .
# Sanity: confirm config/ and *.db are NOT in the image
docker run --rm --entrypoint sh aegis:1.0.0 -c 'ls config 2>/dev/null; ls data 2>/dev/null; echo "ok"'
```

The image contains only runtime code. Secrets are injected at runtime (section 3).

---

## 2 — Push to the customer's own registry

### Azure Container Registry (ACR)
```bash
az acr login --name <acrName>
docker tag aegis:1.0.0 <acrName>.azurecr.io/aegis:1.0.0
docker push <acrName>.azurecr.io/aegis:1.0.0
```

### AWS Elastic Container Registry (ECR)
```bash
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <accountId>.dkr.ecr.<region>.amazonaws.com
docker tag aegis:1.0.0 <accountId>.dkr.ecr.<region>.amazonaws.com/aegis:1.0.0
docker push <accountId>.dkr.ecr.<region>.amazonaws.com/aegis:1.0.0
```

### GCP Artifact Registry
```bash
gcloud auth configure-docker <region>-docker.pkg.dev
docker tag aegis:1.0.0 <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
docker push <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
```

---

## 3 — Run with the secret injected at runtime (never baked)

```bash
# Per-deployment secret, injected via env or a Docker secret mount.
docker run -d --name aegis -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" \
  -e AEGIS_DB=/app/data/aegis.db \
  -v aegis-data:/app/data -v aegis-config:/app/config \
  <registry>/aegis:1.0.0
```

Or, with Docker Compose (`docker-compose.yml` excerpt):

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

> The server reads `AEGIS_ISSUER_SECRET` first, then falls back to `config/local.json`.
> `scripts/setup.mjs` regenerates the secret on first run and `chmod 0600`s the file, so a
> freshly deployed container never ships or reuses a shared secret.

---

## 4 — Acceptance check (mirrors the audit gate)

After deploy, confirm the static-exposure surface is closed:

```bash
for p in /server.js /config/local.json /data/aegis.db /server/store.js /README.md; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8099$p"
done
# every line must be 404
curl -s -o /dev/null -w "session-no-cred:%{http_code}\n" "http://localhost:8099/session?room=x"
# must be 401
```

These assertions are also enforced continuously by `video-tool/verify-p3.mjs` (P0
regression) and `scripts/package-delivery.mjs --verify` (B-03).
