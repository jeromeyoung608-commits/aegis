<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCC.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis Standard Contractual Clauses (SCC) — International Transferencia módulo

**Estado:** Plantilla para firma · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Framework:** UE GDPR Article 46 / Commission Implementing Decision (UE) 2021/914

Este módulo se aplica cuando personal datos procesado por Aegis es transferred a un
third country (incluyendo a un encargado del tratamiento, sub-encargado del tratamiento, o un externo servicio
tales as un Time-Stamp Authority). Esto es appended a el DPA y es completado por
el responsable del tratamiento con su cualificado asesoría jurídica aintes cualquiera tales transferencia es activado.

---

## 1. Partes

- **datos exporter (responsable del tratamiento):** {{CONTROLLER_Legal_Nombre}} — {{CONTROLLER_Dirección}} — {{CONTROLLER_REG_Ningún}}
- **datos importer (encargado del tratamiento / TSA / sub-encargado del tratamiento):** _a ser completado por transferencia_

## 2. Transferencia details

- **Finalidad de el transferencia:** {{ROPA_Finalidad}}
- **Categorías de datos transferred:** documento hashes/manifests; operador cuenta
  metadatos; y, donde el responsable del tratamiento permite un externo TSA, el one-way hash
  submitted para timestamping. Ningún documento texto sin cifrar deja el Aegis instancia por
  predeterminado (`gateway.externalTsa.enabled=false`).
- **Destinatarios en el third country:** {{ROPA_Destinatarios}}
- **Legal base para el transferencia (Art. 46):** Standard Contractual Clauses (este
  módulo) + supplementary mide (cifrado en transit, minimisation a hash-only)

## 3. módulo selection (Art. 2021/914)

- [ ] **módulo Uno** — responsable del tratamiento → encargado del tratamiento
- [ ] **módulo Two** — encargado del tratamiento → encargado del tratamiento (sub-processing)
- [ ] **módulo Tres** — responsable del tratamiento → responsable del tratamiento

## 4. Supplementary mide

- Cifrado en transit (TLS 1.2+); outbound transferencias desactivado por predeterminado.
- datos minimisation: solo non-reversible calcula le hash son transmitted a un TSA.
- Transparency: cada transferencia es registrado en el servidor auditoríun registro.

## 5. Docking punto

El SCC es solo relevant si el responsable del tratamiento permite un cross-border flujo. El Aegis
fábrica puerta de calidad (§cumplimiento estado) hace **no** bloque en SCC completion, porque
Aegis envía con todos salida desactivado; SCC completion es el responsable del tratamiento's
responsabilidad y es evidenced aquí para el autoridad de control.

---

_Completado SCC a ser firmado por ambos partes y conservado por el responsable del tratamiento._
