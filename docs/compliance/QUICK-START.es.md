<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/QUICK-START.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Quick inicio

## 1. Instalar & bootstrap
```
git clone <your-registry>/aegis && cd aegis
npm run setup          # prompts for an operator account; default password = AEGIS_ISSUER_SECRET
npm start              # serves http://localhost:8080
```
Abierto `http://localhost:8080` en **Chrome o Borde 113+** (SharedArrayBuffer para el
WebGPU topologíun requiere COOP/COEP, cuál Aegis conjuntos).

## 2. Banco de trabajo — el seven-step cerrado bucle
1. Select un source node en el topologíun. 2. Carga un documento. 3. Redactar. 4. Sign
(calcula le hash + firma). 5. Enviar. 6. Recibir. 7. Verificar → sello. El bucle no puede go
backwards; este invariant es bloqueado por `aegis-shell/tests/flow.test.mjs`.

## 3. operador consola — `aegis-shell/console.html`
Registro en as el operador, entonces usar el pestañas:
- **auditoríun** — append-only rastro de auditoríun (exportación CSV/JSON).
- **Revoke** — revocación lista management.
- **clave escrow** — break-glass deposit/retrieve.
- **TSA verificar** — RFC 3161 marca de tiempo verificación.
- **cumplimiento** — entrar su real legal hechos (responsable del tratamiento, DPO, UE rep, SLA, aplicable
  ley, authority) + subida firmado ROPA/DPA/SLA/DPO letter/logo; generar rellenado
  plantillas.
- **Setup** — pre-deploy lista de verificación (exportación sign-off).
- **datos interesados** — DSAR exportación (Art.20) + borrado (Art.17) + tombstone verificar.
- **Sesiones** — list/revoke operador sesiones.
- **Configuración** — read-only configuración reflection + seguro toggles (escrow, MFA enforce), SIEM
  forward URL, incidente prueba, admin MFA reset, DB copia de seguridad.

## 4. Pre-deploy lista de verificación
Work a través de `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` (también el in-consola Setup
pestaña). Conjunto `AEGIS_ISSUER_SECRET` único por entorno, push el imagen a **su propio**
registry, enable TLS vía un invertir proxy, y completo el cumplimiento hechos.

## 5. Producción despliegue
Véase `deploy/` (docker-compose, Kubernetes/Helm, systemd, nginx/Caddy) y
`docs/compliance/ACR-PRIVATE-REGISTRY.md`. Nunca bake secretos en el imagen.
