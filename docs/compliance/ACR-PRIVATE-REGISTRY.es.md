<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ACR-PRIVATE-REGISTRY.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Independiente Contenedor Registry despliegue (B-03 Mitigation)

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14

## Por qué un privado registry

El Round-7 auditoríun (finding **B-03**) showed que un único compartido compilación artefacto tenía leaked
el `issuerSecret` y un development base de datos a cada Cliente. El structural corrección es twofold:

1. **El packer nunca envía `config/local.json` o `*.db*`** — `scripts/package-delivery.mjs`
   excluye ellos (`EXCLUDE_TOP_LEVEL_DIRS=['data']`, `EXCLUDE_REL_PATHS=['config/local.json']`,
   `.db*` extensions). `verify:delivery` re-checks este en cada compilación.
2. **El contenedor imagen debe también ser secreto-free**, y cada Cliente debería ejecutar su **propio**
   imagen en **su propio** registry — no un shared/public uno. Este guide muestra cómo a compilación y
   push el Aegis imagen a un Cliente-controlled registry (Azure ACR, AWS ECR, o GCP Artefacto
   Registry) con **ningún secreto baked en**.

El `Dockerfile` ya honours este: esto hace **no** `COPY config/`, se ejecuta as el non-root
`node` usuario, y expects el `issuerSecret` a arrive en tiempo de ejecución as `AEGIS_ISSUER_SECRET`
(un Docker/compose secreto) o a ser minted en primero ejecutar por `npm run setup`.

---

## 1 — Compilación el imagen localmente (ningún secretos)

```bash
cd /path/to/Aegis
docker build -t aegis:1.0.0 .
# Sanity: confirm config/ and *.db are NOT in the image
docker run --rm --entrypoint sh aegis:1.0.0 -c 'ls config 2>/dev/null; ls data 2>/dev/null; echo "ok"'
```

El imagen contiene solo tiempo de ejecución código. Secretos son inyectado en tiempo de ejecución (sección 3).

---

## 2 — Push a el Cliente's propio registry

### Azure Contenedor Registry (ACR)
```bash
az acr login --name <acrName>
docker tag aegis:1.0.0 <acrName>.azurecr.io/aegis:1.0.0
docker push <acrName>.azurecr.io/aegis:1.0.0
```

### AWS Elastic Contenedor Registry (ECR)
```bash
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <accountId>.dkr.ecr.<region>.amazonaws.com
docker tag aegis:1.0.0 <accountId>.dkr.ecr.<region>.amazonaws.com/aegis:1.0.0
docker push <accountId>.dkr.ecr.<region>.amazonaws.com/aegis:1.0.0
```

### GCP Artefacto Registry
```bash
gcloud auth configure-docker <region>-docker.pkg.dev
docker tag aegis:1.0.0 <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
docker push <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
```

---

## 3 — Ejecutar con el secreto inyectado en tiempo de ejecución (nunca baked)

```bash
# Per-deployment secret, injected via env or a Docker secret mount.
docker run -d --name aegis -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" \
  -e AEGIS_DB=/app/data/aegis.db \
  -v aegis-data:/app/data -v aegis-config:/app/config \
  <registry>/aegis:1.0.0
```

O, con Docker Compose (`docker-compose.yml` excerpt):

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

> El servidor lee `AEGIS_ISSUER_SECRET` primero, entonces falls atrás a `config/local.json`.
> `scripts/setup.mjs` regenerates el secreto en primero ejecutar y `chmod 0600`s el archivo, así un
> freshly deployed contenedor nunca envía o reuses un compartido secreto.

---

## 4 — Aceptación comprobar (refleja el auditoríun puerta de calidad)

Después deploy, confirmar el static-exposure superficie es cerrado:

```bash
for p in /server.js /config/local.json /data/aegis.db /server/store.js /README.md; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8099$p"
done
# every line must be 404
curl -s -o /dev/null -w "session-no-cred:%{http_code}\n" "http://localhost:8099/session?room=x"
# must be 401
```

Estos aserciones son también enforced continuously por `video-tool/verify-p3.mjs` (P0
regresión) y `scripts/package-delivery.mjs --verify` (B-03).
