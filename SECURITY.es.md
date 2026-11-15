<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: SECURITY.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# seguridad Política

## seguridad soporte período (CRA Art. 13)
Aegis v1.0.0 tiene un declared seguridad soporte período de **5 years de primero
publication: 2026-11-15 → 2031-11-15**. Durante este período el manufacturer
proporciona seguridad actualiza y vulnerability remediation. El fin fecha es
disclosed a clientes en el tiempo de purchase (CRA Art. 13(19)); el rationale
para el período es registrado en el technical documentación (Art. 13(8)).

| Versión | Supported | seguridad soporte hasta |
|---------|-----------|------------------------|
| 1.0.x | ✅ | 2031-11-15 |

## Reporting un vulnerability (coordinated disclosure / CVD)
Aegis es un privacidad primero, local-processing tool. Si usted find un vulnerability,
**do no abierto un público problema** con exploit details. En cambio, informe privately a
el mantenedor en **jeromeyoung608@gmail.com** (también published en
`.well-known/security.txt`) y include:
- un description y impact,
- pasos a reproduce,
- affected versión (`Aegis` versión de `package.json`).

Nosotros aim a acknowledge dentro **5 negocio días** y a provide un remediation
cronología dentro **30 días** para confirmado problemas.

## Alcance
En alcance: el Aegis servidor (`server.js`, `server/store.js`), el TSA adaptador
(`adapters/tsa-rfc3161`), y el operador consola (`aegis-shell/console.html`).
Fuera de alcance: el underlying navegador, Node.js tiempo de ejecución, y cualquiera tercero TSA usted
configure.

## seguridad posture (summary)
- Cero **npm** tiempo de ejecución dependencias. navegador modules vendor tercero libraries (PDF.JS, pdf-lib, Tesseract.JS) committed bajo cada módulo's `vendor/` directorio; el SBOM (`scripts/gen-sbom.mjs`) lists todos de ellos — y el dev/test `playwright` tooling — honestly. El "sin dependencias" afirmación se aplica a el **núcleo núcleo** (`crypto / hash-chain / audit / signaling / redaction render`); esto es no un afirmación que el entire producto contiene ningún tercero código.
- servidor-blind transferencia: el relé almacena solo opaco texto cifrado.
- token-gated señalización + por IP velocidad limiting.
- operador-only auditoríun / revocación / escrow APIs.
- Local CRL-style revocación checked en sesión admisión.
- GDPR Art. 17 borrado con conservado cumplimiento markers.

## red exposure & despliegue endurecimiento

**Por predeterminado el servidor enlaza a todos red interfaces** (`server.listen(PORT)` con ningún
host argument → `0.0.0.0` / `::`). El estático consola UI, el token-gated señalización
relé, y el métricas endpoint son por lo tanto reachable de **cualquiera host que puede route
a el port** (predeterminado `8099`, o `PORT`). Este es intentional para un single-operador
local banco de trabajo, pero esto es **no** seguro a expose crudo en un compartido / untrusted red.

despliegue reglas:
- **Put Aegis detrás un invertir proxy** (nginx, Caddy, Traefik, o su LoadBalancer) que
  terminates TLS, enforces authenticated acceso, y restricts source IPs / CIDR ranges.
  Do no publish el crudo Node port a el internet o un compartido LAN segment.
- El invertir proxy es también donde usted debería expose `/metrics` **solo si** usted tener conjunto
  `AEGIS_METRICS_TOKEN` (esto es fail-closed del contrario — véase
  `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md`). Conservar métricas detrás el proxy's ACL.
- **Nunca** conjunto `AEGIS_TRUSTED_LAN=1` en un compartido o producción red — esto relaxes el
  `/session` admisión control para lab usar solo y es expresamente unsafe más allá de localhost.
- El operador consola y señalización relé ambos require un operador sesión / emisor
  secreto; el estático UI es unauthenticated por diseño (esto es un inicio de sesión screen), así el
  proxy debe enforce quién puede reach esto.

Véase `docs/compliance/THREAT-MODEL.md` y `docs/compliance/CRA-NIS2.md` para el
completo analysis. **Un independiente tercero penetración prueba es aún obligatorio
aintes cualquiera producción despliegue afirmación.**

## CRA incidente reporting commitment
Para vulnerabilities que qualify as un **severe incidente** bajo el UE Cyber
Resilience Act (Regulation (UE) 2024/2847, Art. 14/71), el manufacturer commits
a el following reporting cronología a el competent authority (BSI en Germany):

- **Dentro 24 hours** de becoming aware: un early warning (Art. 14(2));
- **Dentro 72 hours**: un vulnerability notificación / incidente informe con el
  available details (Art. 14(3));
- **Dentro 14 días**: un final informe con raíz causar y remediation (Art. 14(4)),
  o un reasoned delay donde hechos son aún bajo investigation.

Nota: el CRA reporting obligaciones tener aplicado since **2026-09-11**. Donde Aegis
es ya supplied en el UE, estos son actual obligaciones, no future plans.
⚠️ Este commitment es un commercial/process statement, no legal advice; el exacto
disparador, authority y cualquiera micro/small-enterprise exemptions debe ser confirmado por
cualificado asesoría jurídica.
