<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ROPA.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Registros de Procesamiento Activities (ROPA)

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Base:** GDPR Article 30 · **responsable del tratamiento:** {{CONTROLLER_Legal_Nombre}} — {{CONTROLLER_Dirección}} — {{CONTROLLER_REG_Ningún}}

Este registro cubre procesamiento ejecutado por el Aegis local datos-cleansing
Servicio. Uno row por procesamiento activity.

---

## Procesamiento activity register (Art. 30 — estructurado)

| Procesamiento activity | Finalidad | Retención | Destinatarios | Legal base |
| --- | --- | --- | --- | --- |
| Aegis núcleo servicio | {{ROPA_Finalidad}} | {{ROPA_Retención}} | {{ROPA_Destinatarios}} | {{ROPA_Legal_Base}} |

> El cuatro columns encima son el estructurado minimum el autoridad de control
> expects. Fill ellos vía el operador consola (cumplimiento → ROPA sección); hasta
> ellos son conjunto, el fábrica puerta de calidad bloquea issuing el rellenado ROPA (HTTP 409 +
> `X-Aegis-Compliance: not-ready`).

---

## Activity Un — documento limpieza & hash

- **Purposes:** eliminar sensible attributes de documentos; compute integridad
  hashes/manifests.
- **Categorías de datos interesados:** individuals appearing en Cliente documentos.
- **Categorías de personal datos:** documento contents; derivado hashes/manifests.
- **Destinatarios:** ninguno por predeterminado (local procesamiento).
- **Transferencias:** ninguno (opt-in TSA envía hash solo).
- **Retención:** por responsable del tratamiento política; erasable en solicitud.
- **Transferencia base:** ninguno — local procesamiento; el solo opcional cross-border flujo es el TSA hash (responsable del tratamiento responsabilidad, SCC).
- **seguridad:** cifrado en resto; cero predeterminado salida.

## Activity B — operador authentication & acceso

- **Purposes:** authenticate operators/issuers; authorise acciones.
- **Categorías de datos interesados:** Cliente staff (operadores).
- **Categorías de personal datos:** cuenta identifiers; hashed credenciales;
  sesión tokens.
- **Destinatarios:** ninguno externo.
- **Transferencias:** ninguno.
- **Retención:** cuentas conservado por política; sesiones TTL-bound.
- **Transferencia base:** ninguno — local procesamiento.
- **seguridad:** credential hash; bearer auth con TTL; inicio de sesión throttling.

## Activity C — auditoríun & responsabilidad logging

- **Purposes:** maintain un resistente a la manipulación, encadenado por hash responsabilidad trail.
- **Categorías de datos interesados:** operadores (as actors en auditoríun eventos).
- **Categorías de personal datos:** action metadatos, remoto dirección, subject.
- **Destinatarios:** responsable del tratamiento (vía `/audit/export`).
- **Transferencias:** ninguno.
- **Retención:** rolling; **operator/system eventos son resistente a la manipulación y
  append-only, y no erasable** (forensic-integrity control).
- **Transferencia base:** ninguno — local procesamiento.
- **seguridad:** encadenado por hash registro; exportación protegido por operador alcance.

## Activity D — Opcional RFC3161 timestamping (opt-in)

- **Purposes:** enlazar cleansed artefactos a un trusted marca de tiempo.
- **Categorías de personal datos:** ninguno en claro — solo un **hash** es enviado.
- **Destinatarios:** Cliente-configured TSA endpoint.
- **Transferencias:** a el configurado TSA (Cliente responsabilidad para SCC).
- **Retención:** marca de tiempo receipt almacenado con el artefacto.
- **Transferencia base:** a el configurado TSA solo (Cliente responsabilidad, SCC).
- **seguridad:** outbound desactivado por predeterminado (`gateway.externalTsa.enabled=false`).

---

_Completado ROPA a ser firmado por el responsable del tratamiento's DPO y kept available a el
autoridad de control._
