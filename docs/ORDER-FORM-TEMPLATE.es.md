<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/ORDER-FORM-TEMPLATE.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis — Formulario de pedido (plantilla)

> Plantilla solo. Tener asesoría jurídica revisión aintes usar. Este form accompanies el
> **Aegis Pagado soporte & Servicios Términos** ([`COMMERCIAL-LICENSE.md`](../COMMERCIAL-LICENSE.md))
> y el completo acuerdo ([`docs/SERVICES-AGREEMENT.md`](./SERVICES-AGREEMENT.md)).

El Aegis **software es abierto source bajo Apache-2.0** — este form cubre pagado
soporte y servicios solo. Ningún licencia fee es due; ningún purchase obligación
existe para en ejecución el software.

---

## 1. Partes

| | |
|---|---|
| **Proveedor** | Jerome Young (Yang Jie), AEGIS mantenedor — dirección por `SECURITY.md` / `.well-known/security.txt` |
| **Cliente** | ⟨legal entity nombre⟩ |
| **Registrado dirección** | ⟨dirección⟩ |
| **Country / VAT ID** | ⟨country⟩ / ⟨VAT ID⟩ |
| **Cliente contacto** | ⟨nombre, rol, correo electrónico, phone⟩ |
| **Technical contacto** | ⟨nombre, rol, correo electrónico, phone⟩ — day-to-day entrega contacto |

## 2. Servicios ordered

Select uno plan; el alcance abajo refleja [`PRICING.md`](../PRICING.md). Cobertura
es expressed as deployments y servicios incluido — **no** un puesto recuento, y esto
hace no límite cómo muchos operadores usar el software.

| Plan | Cobertura | Anual fee (net, ex-VAT) | Respuesta objetivo | Selected |
|---|---|---|---|---|
| Starter | 1 equipo / 1 despliegue | €4,900 | best-effort / community | ☐ |
| Negocio | up a 5 deployments | €24,000 | 2 negocio días | ☐ |
| Empresa | unlimited | €75,000+ (quoted) | 4h Sev-1 / 1d Sev-2 | ☐ |

### 2.1 Incluido entregables

☐ despliegue & integración (entorno, módulo wiring, one-click instalar)
☐ Endurecimiento revisión (CSP / COOP-COEP / clave handling / sellado configuración)
☐ cumplimiento preparación paquete — SBOM + CRA evidencia material
☐ SIEM integración (registro forwarding)
☐ Anual soporte (véase §4)
☐ cumplimiento paquetes por año: ⟨n⟩  ☐ Extra paquete: quoted

### 2.2 Expresamente no incluido

- Tercero penetración prueba o ACR/CRA atestación — engagement-specific, quoted separately.
- German-language localisation de cumplimiento plantillas más allá de qué envía en el producto.
- Custom producto development más allá de el alcance encima (available as un separately
  scoped statement de work).

## 3. Fees y payment

| | |
|---|---|
| Anual servicio fee | € ⟨amount⟩ (net, exclusive de VAT) |
| One-off onboarding fee | € ⟨amount⟩ ☐ ninguno |
| Billing frequency | ☐ anual en advance ☐ monthly ☐ por milestone (SOW) |
| Payment términos | 30 días de invoice fecha |
| Currency | EUR |

Precios hold para el committed término. Renovación y price-change handling follow
§5 de el servicios acuerdo (Alemán CPI-linked cap, 60-día advance aviso, 30-día
terminación derecho).

## 4. soporte y servicio levels

| Severity | Definition | Respuesta objetivo (plan) |
|---|---|---|
| Sev-1 | Producto unusable o evidencia chain roto | ⟨por plan⟩ |
| Sev-2 | Major funcionalidad degraded, ningún datos pérdida | ⟨por plan⟩ |
| Sev-3 | Minor defecto o question | ⟨por plan⟩ |
| Sev-4 | Funcionalidad solicitud / advisory | siguiente planned lanzamiento |

Escalation ruta y on-call arrangements (Empresa solo): ⟨fill⟩.

## 5. Término

| | |
|---|---|
| Inicio fecha | ⟨YYYY-MM-DD⟩ |
| Initial término | 12 months ☐ ⟨n⟩ months |
| Auto-renewal | ☐ sí ☐ ningún — si sí, véase §5 de el servicios acuerdo |

## 6. Commercial y legal términos

1. El **Aegis software es licenciado bajo Apache-2.0** (SPDX `Apache-2.0`) —
   véase [`LICENSE`](../LICENSE). El Cliente puede usar, modify, redistribute y
   sell esto, incluyendo commercially, sin paying un licencia fee.
2. Este Formulario de pedido governs **servicios solo**, bajo el
   [servicios acuerdo](./SERVICES-AGREEMENT.md).
3. Responsabilidad es capped as establecido en el servicios acuerdo; el cap amount es
   registrado en un ejecutado horario: € ⟨amount o "as establecido en el ejecutado horario">⟩.
4. El Cliente conserva todos derechos bajo Apache-2.0. Ningún marca derechos son
   granted; véase [`TRADEMARK.md`](../TRADEMARK.md).
5. datos handling: el Proveedor hace no host Cliente datos. despliegue y
   soporte work es ejecutado en el Cliente's infrastructure o bajo el
   Cliente's control. Véase §8 de el servicios acuerdo.
6. Proveedor invoices y entrega informes son proporcionado as **PDF con un SHA256
   digest**; el Cliente puede publish el digest.

## 7. Firmas

| | Proveedor | Cliente |
|---|---|---|
| Nombre | Jerome Young (Yang Jie) | ⟨nombre⟩ |
| Title | mantenedor | ⟨title⟩ |
| firma | | |
| Fecha | | |

---

*Non-binding hasta firmado por ambos partes. Precios shown son lista precios y puede
ser adjusted para alcance; véase `PRICING.md` para el indicative structure.*
