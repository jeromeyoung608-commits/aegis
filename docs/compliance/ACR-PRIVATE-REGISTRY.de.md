<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ACR-PRIVATE-REGISTRY.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Unabhängig Container Registry Bereitstellung (B-03 Mitigation)

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14

## Warum ein privat Registry

Der Round-7 Audit (finding **B-03**) showed das ein einzeln geteilt Build Artefakt hatte leaked
der `issuerSecret` und ein development Datenbank zu jeder Kunde. Der structural Kcorrektur ist twofold:

1. **Der packer niemals liefert aus `config/local.json` oder `*.db*`** — `scripts/package-delivery.mjs`
   ausschließt sie (`EXCLUDE_TOP_LEVEL_DIRS=['data']`, `EXCLUDE_REL_PATHS=['config/local.json']`,
   `.db*` extensions). `verify:delivery` re-checks dies auf jeder Build.
2. **Der Container Bild muss auch sein Geheimnis-free**, und jeder Kunde soll ausführen ihrer **eigen**
   Bild in **ihrer eigen** Registry — nicht ein shared/public eine. Dies guide zeigt wie zu Build und
   push Aegis Bild zu ein Kunde-controlled Registry (Azure ACR, AWS ECR, oder GCP Artefakt
   Registry) mit **kein Geheimnis baked in**.

Der `Dockerfile` bereits honours dies: es macht **nicht** `COPY config/`, läuft as der non-root
`node` Benutzer, und expects der `issuerSecret` zu arrive bei Laufzeit as `AEGIS_ISSUER_SECRET`
(ein Docker/compose Geheimnis) oder zu sein minted auf erste ausführen durch `npm run setup`.

---

## 1 — Build Bild lokal (kein Geheimnisse)

```bash
cd /path/to/Aegis
docker build -t aegis:1.0.0 .
# Sanity: confirm config/ and *.db are NOT in the image
docker run --rm --entrypoint sh aegis:1.0.0 -c 'ls config 2>/dev/null; ls data 2>/dev/null; echo "ok"'
```

Der Bild enthält nur Laufzeit Code. Geheimnisse sind injiziert bei Laufzeit (Abschnitt 3).

---

## 2 — Push zu Kunde's eigen Registry

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

### GCP Artefakt Registry
```bash
gcloud auth configure-docker <region>-docker.pkg.dev
docker tag aegis:1.0.0 <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
docker push <region>-docker.pkg.dev/<project>/aegis/aegis:1.0.0
```

---

## 3 — Ausführen mit Geheimnis injiziert bei Laufzeit (niemals baked)

```bash
# Per-deployment secret, injected via env or a Docker secret mount.
docker run -d --name aegis -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" \
  -e AEGIS_DB=/app/data/aegis.db \
  -v aegis-data:/app/data -v aegis-config:/app/config \
  <registry>/aegis:1.0.0
```

Oder, mit Docker Compose (`docker-compose.yml` excerpt):

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

> Der Server liest `AEGIS_ISSUER_SECRET` erste, dann falls zurück zu `config/local.json`.
> `scripts/setup.mjs` regenerates Geheimnis auf erste ausführen und `chmod 0600`s Datei, so ein
> freshly deployed Container niemals liefert aus oder reuses ein geteilt Geheimnis.

---

## 4 — Abnahme prüfen (spiegelt Audit Gate)

Nach deploy, bestätigen der static-exposure Oberfläche ist geschlossen:

```bash
for p in /server.js /config/local.json /data/aegis.db /server/store.js /README.md; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8099$p"
done
# every line must be 404
curl -s -o /dev/null -w "session-no-cred:%{http_code}\n" "http://localhost:8099/session?room=x"
# must be 401
```

Diese Assertions sind auch enforced continuously durch `video-tool/verify-p3.mjs` (P0
Regression) und `scripts/package-delivery.mjs --verify` (B-03).
