<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/CONFIGURE-BEFORE-DEPLOY.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Configure aintes deploy — operador-supplied hechos

> **Alcance.** Este es el único lista de verificación para cada fact Aegis asks el **deploying
> responsable del tratamiento** (usted) a provide. Nada aquí es entregado pre-filled y Aegis nunca
> fabricates legal hechos. El producto proporciona un real entrada punto — el **operador
> consola → cumplimiento** pestaña — más fill-in tokens en el cumplimiento plantillas. Fill
> ellos con su real legal entity aintes going a producción / answering un GDPR
> Article 30 / DPA solicitud.

## 1. Two ways a supply el hechos

| Método | Best para | Donde |
|---|---|---|
| **operador consola → cumplimiento pestaña** (recommended) | Day-to-day entrada, persistencia, signed-doc subida, one-click "rellenado" plantilla generación | `/aegis-shell/console.html`, registro en as un **operador**, abierto el **cumplimiento** pestaña |
| **Editar el plantillas directamente** | White-label / legal revisión de el crudo markdown | `docs/compliance/ROPA.md`, `PRIVACY-POLICY.md`, `DPA.md`, `SLA.md` |

El consola escribe a `data/compliance/legal.json` y subido documentos a
`data/compliance/files/` — un tiempo de ejecución volumen que es **nunca servido statically**
(`config` / `data` / `server` nivel superior dirs son denied) y **nunca entregado**
(`data/` es excluded de el entrega paquete). Así ningún operador fact o secreto
deja su despliegue (B-03 clase).

## 2. Pre-deploy lista de verificación

| # | Elemento | consola campo | Plantilla token | Plantilla archivo | Ejemplo | Obligatorio |
|---|---|---|---|---|---|---|
| 1 | responsable del tratamiento legal nombre | responsable del tratamiento → Legal nombre | `{{CONTROLLER_LEGAL_NAME}}` | `ROPA.md` (línea 6), `DPA.md` | Acme GmbH | **Sí** |
| 2 | responsable del tratamiento registrado dirección | responsable del tratamiento → Registrado dirección | `{{CONTROLLER_ADDRESS}}` | `ROPA.md` (línea 6) | Hauptstr. 1, 10117 Berlin, DE | **Sí** |
| 3 | Company registration ningún. | responsable del tratamiento → Company registration ningún. | `{{CONTROLLER_REG_NO}}` | `ROPA.md` (línea 6) | HRB 123456 | Recommended |
| 4 | DPO nombre | DPO → DPO nombre | `{{DPO_NAME}}` | `PRIVACY-POLICY.md` (§9), `DPA.md` | Jane Doe | Si un DPO es appointed |
| 5 | DPO correo electrónico | DPO → DPO correo electrónico | `{{DPO_EMAIL}}` | `PRIVACY-POLICY.md` (§9) | dpo@acme.ejemplo | Si un DPO es appointed |
| 6 | DPO postal dirección | DPO → DPO postal dirección | `{{DPO_ADDRESS}}` | `PRIVACY-POLICY.md` (§9) | c/o Acme, … | Si un DPO es appointed |
| 7 | UE representante (GDPR Art.27) | UE representante → Representante nombre | `{{EU_REP_NAME}}` | referenced en ROPA / Privacidad Política | Acme UE Rep Ltd | Si ningún UE establishment |
| 8 | UE representante dirección | UE representante → Representante dirección | `{{EU_REP_ADDRESS}}` | referenced en ROPA / Privacidad Política | … | Si ningún UE establishment |
| 9 | SLA contacto mailbox | SLA & legal → SLA contacto mailbox | `{{SLA_MAILBOX}}` | `SLA.md` (§0) | operaciones@acme.ejemplo | **Sí** |
| 10 | operador timezone | SLA & legal → operador timezone | `{{SLA_TIMEZONE}}` | `SLA.md` (§0) | Europe/Berlin (UTC+1/+2) | **Sí** |
| 11 | Aplicable ley | SLA & legal → Aplicable ley | `{{GOVERNING_LAW}}` | `DPA.md` | Laws de Germany | **Sí** |
| 12 | autoridad de control | SLA & legal → autoridad de control | `{{SUPERVISORY_AUTHORITY}}` | `PRIVACY-POLICY.md` (§9) | Berliner Beauftragte für Datenschutz | **Sí** |
| 13 | RFC 3161 TSA endpoint (opcional) | Opcional — TSA gateway → RFC 3161 TSA endpoint | `{{TSA_ENDPOINT}}` | (tiempo de ejecución configuración) | https://tsa.example/timestamp | Opcional |
| 14 | Firmado ROPA / DPA / SLA, DPO appointment, logo | cumplimiento → Subida documento | — | almacenado servidor-side, listed en consola | ROPA-firmado.pdf | Recommended |

**Si un campo es izquierda blank, el generado plantilla muestra un visible
`[ … — to be completed ]` marker** en cambio de fake datos, así un incomplete
documento es nunca mistaken para un finished uno.

## 2b. seguridad-relevant entorno variables

Conjunto estos en el servidor proceso (o as container/env secretos). Ellos son nunca
almacenado en `config/local.json` y nunca entregado.

| Variable | Finalidad | Predeterminado | Notas |
|---|---|---|---|
| `AEGIS_ISSUER_SECRET` | operador auth + el emisor secreto que firma session/room tokens | _(vacío)_ | **Obligatorio en cualquiera compartido despliegue.** Sin esto, `/session` es bloqueado (ningún token puede ser minted). Generar out-of-band; aprobado as un secreto, nunca bake en el imagen. |
| `AEGIS_METRICS_TOKEN` | Gates `/metrics` (Prometheus scrape) | _(unset)_ | **Métricas son fail-closed.** Hasta este es conjunto, `GET /metrics` retorna `401`. Una vez conjunto, scrape con `Authorization: Bearer <token>` o `?token=<token>`. Solo enable detrás su invertir proxy's ACL — esto discloses uptime, auditoría-event recuento, y active-session recuento. |
| `AEGIS_TRUSTED_LAN` | Relaxes `/session` admisión para lab usar | `0` | Conjunto `1` **solo en un aislado localhost lab**. Nunca en un shared/production red — esto disables el operador-credential puerta de calidad. |
| `AEGIS_DB` | SQLite ruta | `data/aegis.db` | Mount as un volumen así esto sobrevive restarts. |
| `PORT` | Listen port | `8080` (Docker `8099`) | El servidor enlaza a **todos interfaces** por predeterminado — place esto detrás un invertir proxy (véase `SECURITY.md`). |
| `AEGIS_TLS_DIR` | Opcional PEM key/cert para HTTPS | `~/.aegis/tls` | Si `key.pem`+`cert.pem` exist allí, el servidor sirve HTTPS (seguro para cross-machine LAN). |
| `AEGIS_MFA_MODE` / `AEGIS_MFA_KEY` | operador MFA (`totp`/`webauthn`) | `off` | Enable para producción operador cuentas. |
| `AEGIS_AUTH_MODE` / `AEGIS_OIDC_*` | Externo IdP (OIDC) | `local` | Opcional SSO para operadores. |
| `AEGIS_SCIM_TOKEN` | SCIM 2.0 aprovisionamiento token | _(vacío)_ | Solo si automatizado cuenta aprovisionamiento es usado. |
| `AEGIS_RATE_LIMIT` | Por IP request-rate cap | `0` (apagado) | Conjunto un positivo valor a throttle abuse. |

## 3. Usando el operador consola (recommended ruta)

1. Abierto `/aegis-shell/console.html` y registro en as un **operador** (operador cuentas
   son created por `npm run setup`; el predeterminado password equals el configurado emisor
   secreto hasta changed).
2. Abierto el **cumplimiento** pestaña.
3. Fill elementos 1–13 encima, entonces clic **Save hechos**.
4. Bajo **Subida rellenado cumplimiento documentos**, elegir un archivo, pick su tipo
   (ROPA / DPA / SLA / DPO-appointment / Logo / Otros), y clic **Subida**.
   Subido archivos appear en el tabla con **descargar** / **borrar** controles.
5. Bajo **Generar rellenado plantillas**, clic **Descargar rellenado ROPA / DPA / SLA /
   Privacidad Política** — cada downloads el plantilla con su hechos substituted en
   el `{{TOKEN}}` placeholders. Hand estos a legal/customers.

### API (mismo authentication as el consola)
Todos require un operador sesión o el emisor secreto.

| Endpoint | Método | Finalidad |
|---|---|---|
| `/api/compliance` | Obtener / PUT | leer / escribir el hechos object |
| `/api/compliance/files` | Obtener | lista subido documentos |
| `/api/compliance/upload` | Publicar | subida un base64 documento (≤ 9 MB) |
| `/api/compliance/file/:id` | Obtener / Borrar | retrieve / eliminar un subido documento |
| `/api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA\|SCC\|DPIA>` | Obtener | descargar el token-filled plantilla (bloqueado por el fábrica puerta de calidad hasta hechos son completo; un subido firmado copia de el mismo `kind` también lifts esto) |
| `/api/compliance/template/<ROPA\|…>` | Obtener | descargar el **blank, unfilled** plantilla (`{{TOKEN}}` placeholders, `TEMPLATE — UNFILLED` pie de página) — always available, bypasses el puerta de calidad |
| `/api/compliance/status` | Obtener | preparación sonda: cuál obligatorio hechos son aún falta |
| `/metrics` | Obtener | Prometheus scrape — **fail-closed**; requiere `AEGIS_METRICS_TOKEN` (véase §2b) |

## 4. token referencia (para direct plantilla edición)

Si usted editar `docs/compliance/*.md` por hand en cambio de usando el consola, reemplaza estos
tokens con su real values:

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

- [ ] Elementos 1, 2, 9, 10, 11, 12 completado (responsable del tratamiento identidad, SLA, aplicable ley, authority)
- [ ] DPO details (4–6) completado o expresamente "no appointed"
- [ ] UE representante (7–8) completado **o** confirmado no obligatorio (UE establishment existe)
- [ ] Firmado ROPA / DPA / SLA subido (elemento 14) donde contractually obligatorio
- [ ] "Descargar rellenado" documentos generado y reviewed por asesoría jurídica
- [ ] `AUTH_JWT_SECRET` / emisor secreto conjunto a un único valor por entorno (nunca el dev predeterminado)
- [ ] despliegue imagen pushed a **su propio** registry con secretos supplied vía env/secret, no baked en (véase `ACR-PRIVATE-REGISTRY.md`)
