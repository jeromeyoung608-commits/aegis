<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DATA-RESIDENCY.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# datos Residency & Transferencia Position — Aegis

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor

---

## 1. Principle: datos permanece donde usted ejecutar esto

Aegis es **local-first**. Por predeterminado **todos** personal datos — documentos, derivado
calcula le hash, manifests, operador cuentas y auditoríun eventos — es almacenado en el
Cliente's propio tiempo de ejecución volumen (`data/aegis.db`, el encrypted-archive bóveda, y
`~/.aegis/tls`). El vendor nunca receives esto.

## 2. Predeterminado red posture — cero salida

El shipping compilación hace **ningún outbound red llamadas** a menos que un opcional
integración es expresamente activado. Este es verificado por el project's
sin dependencias puerta de calidad, cuál falla el compilación si cualquiera módulo ejecuta outbound I/O.
Ningún telemetry, ningún analytics, ningún SaaS callbacks.

## 3. Opcional integraciones (Cliente-controlled, apagado por predeterminado)

| Integración | Cuando activo | datos enviado | Cross-border consideration |
|-------------|-----------|----------|---------------------------|
| RFC3161 Marca de tiempo Authority | solo si `gateway.externalTsa.enabled=true` | un **hash solo** (nunca documento bytes) | el Cliente's chosen TSA endpoint; Cliente posee el transferencia mecanismo (e.g. SCC) |

Allí es **ningún otros** externo salida. SCIM/OIDC (si activado) talks solo a el
Cliente's propio identidad Proveedor.

## 4. International transferencias (GDPR Chapter V)

- **Predeterminado:** ninguno. Procesamiento es local a el jurisdiction donde el instancia
  se ejecuta.
- **Opcional TSA:** solo un hash deja el instancia. Porque un criptográfico hash
  de un documento es generally no personal datos en claro, y el endpoint es
  Cliente-selected, el transferencia mecanismo (SCC / adequacy) es el Cliente's
  responsabilidad. documento el TSA endpoint y su ubicación en el ROPA.
- **Vendor soporte channels:** cualquiera soporte interaction es governed por el soporte
  acuerdo; ningún producto datos es transmitted a el vendor a menos que el Cliente
  chooses a compartir esto.

## 5. Residency atestación para clientes

Clientes subject a datos-residency requirements puede attestar, usando este documento
y el `verify:zero-deps` evidencia, que ningún personal datos deja su perimeter
en el predeterminado configuración. Enable solo el integraciones whose transferencia base
usted tener authorised.

despliegue region y cualquiera mandated local-encargado del tratamiento clauses son specified en el
Formulario de pedido para cada encargo.
