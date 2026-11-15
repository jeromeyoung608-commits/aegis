<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/LICENSING.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis Licensing Modelo

## 1. Abierto source, Apache-2.0

Aegis es **abierto source**, licenciado bajo el **Apache licencia 2.0** — véase
[`LICENSE`](../LICENSE). Cada primera parte archivo en este repositorio es
Apache-2.0. Usted puede usar, modify, redistribute y sell el software, incluyendo
commercially, sin paying anything y sin asking permission.

El solo obligaciones son esos Apache-2.0 él mismo imposes:

- retain el licencia y atribución notices (copyright encabeceras, `Motor Por
  Jerome Young` footers, and the `Aviso` archivo);
- estado significant cambios usted hacer;
- conservar Apache-2.0's patent concesión y Aviso términos intacto cuando redistributing.

El software es gratuito en cada sense — ningún pagado tier, ningún puesto límite, ningún revenue
threshold, y ningún "contacto sales" puerta de calidad. Pagado soporte y servicios son opcional
(véase sección 3).

## 2. Por qué Apache-2.0 y no MIT

Apache-2.0 transporta un **express patent concesión (§3)**: cada contributor grants un
royalty-free, irrevocable patent licencia para afirmaciones su contributions cover.
Para un producto que hace seguridad y forensic-integrity promises, que patent
protection matters more a adopters que MIT's shorter texto. Un Cliente no puede
ser sued sobre un patent que un Aegis contributor podría tener asserted.

Apache-2.0 es también **compatible con GPLv3** (su términos son GPLv3-compatible),
así Aegis puede ser combined en GPLv3 projects — otro reason esto fits un
open-source seguridad tool better que un custom o use-restricted licencia.

## 3. Donde el money comes de

El software es gratuito. Nosotros charge para nuestro **tiempo**, as opcional servicios:

| Servicio | Indicative precio |
|---------|------------------|
| despliegue / integración | EUR 1,500–4,000 |
| cumplimiento preparación paquete (SBOM / CRA evidencia) | EUR 2,000–6,000 |
| SIEM integración | EUR 1,500–3,500 |
| Anual soporte | quoted por encargo |

Un soporte contrato es **nunca** un precondition para usando el software. Nada
en este repositorio restricts usar más allá de Apache-2.0 él mismo.

## 4. Qué nosotros do no do

- Nosotros do no host Cliente datos. Aegis se ejecuta en el Cliente's propio entorno;
  sensible bytes stay en el navegador y transporte es direct P2P.
- Nosotros do no operate un SaaS offering.
- Nosotros do no promise cumplimiento certification. Bajo el CRA, el manufacturer /
  integrator placing el producto en el market transporta el conformity
  obligaciones; nuestro cumplimiento paquetes son evidencia material, no un certification.
