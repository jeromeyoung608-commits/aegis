<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SUBCONTRACTOR-INVENTORY.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Sub-encargado del tratamiento & Tercero Inventory

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor
**Base:** GDPR Art. 28(2) / SOC 2 CC9 — know y documento cada externo parte
que puede touch personal datos.

---

## 1. Tiempo de ejecución sub-processors: Ninguno (por diseño)

Aegis se ejecuta **completamente localmente** con **cero obligatorio red salida**. Fuera de el
box esto:

- hace **ningún outbound llamadas** a cualquiera vendor;
- embeds **ningún tercero analytics, telemetry, o SaaS SDK**;
- envía su dependencias as **incorporado, hashed libraries** dentro el paquete
  (véase `dist/sbom.cdx.json` y `verify:delivery` integridad comprobar) — estos son
  compiled-in, no remoto servicios.

Por lo tanto allí es **ningún tiempo de ejecución sub-encargado del tratamiento** requiring un separado DPA más allá de
el Aegis DPA él mismo.

## 2. Opcional integraciones (Cliente-configured, Cliente-controlled)

| Integración | Cuando activo | datos enviado | Parte |
|-------------|-------------|-----------|-------|
| RFC3161 Marca de tiempo Authority | solo si `gateway.externalTsa.enabled=true` | un **hash solo** (nunca documento bytes) | Cliente-chosen TSA endpoint |
| SCIM / OIDC IdP | solo si SCIM/OIDC configurado | cuenta attributes | Cliente's IdP |

Cada es **opt-in y apagado por predeterminado**. El Cliente es el responsable del tratamiento de cualquiera
transferencia y es responsable para el transferencia mecanismo (e.g. SCC) para el TSA.

## 3. Incorporado libraries (bundled, no sub-processors)

El few tercero libs (e.g. `pdf-lib`) son **incorporado bajo
`modules/*/vendor/`**, idéntico byte a byte a través de copies, y registrado en el SBOM con
su licenses y SHA-256. Ellos execute in-process; ellos son **no** externo
servicios y do no recibir datos.

## 4. Revisión cadence

Re-confirm este inventory en cada lanzamiento y en cada Cliente onboarding: el
conjunto de opcional salida puntos debe permanecer exactamente el two encima, y ambos apagado por
predeterminado.
