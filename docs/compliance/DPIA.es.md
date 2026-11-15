<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DPIA.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis datos Protection Impact Assessment (DPIA) — Disparador & Plantilla

**Estado:** Plantilla · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Framework:** UE GDPR Article 35 / UK GDPR

Un DPIA es obligatorio aintes starting procesamiento que es "likely a resultado en un alto
riesgo". Este documento (un) lists el statutory disparador criterios, (b) registros el
responsable del tratamiento's answers, y (c) proporciona el assessment cuerpo. El Aegis instancia
expone un disparador calculation en `GET /api/compliance/dpia` de el responsable del tratamiento's
propio `dpia` flags — esto es advisory solo y hace no reemplaza counsel's judgement.

---

## 1. Disparador criterios (Art. 35(3)) — tick cualquiera que aplicar

| # | Criterion | responsable del tratamiento answer |
|---|---|---|
| 1 | Large-scale evaluation de personal aspects based en automatizado procesamiento (profiling) | [ ] |
| 2 | Large-scale procesamiento de special-category datos (Art. 9) o criminal-offence datos (Art. 10) | [ ] |
| 3 | Systematic, large-scale monitorización de un publicly accessible area | [ ] |
| 4 | Large-scale procesamiento (e.g. > 100k datos interesados) | [ ] |
| 5 | Procesamiento que evita datos interesados de exercising un derecho o usando un service/contract | [ ] |
| 6 | Procesamiento que crea o exploits vulnerable-subject profiles | [ ] |
| 7 | Innovative technology (e.g. biometric, AI-driven decisions) | [ ] |
| 8 | Cuando combined con otro procesamiento, esto gives rise a alto riesgo | [ ] |
| 9 | Procesamiento de children's datos / offering servicios a children | [ ] |

**Disparador resultado:** si cualquiera criterion es ticked, un DPIA es **obligatorio**. El
`/api/compliance/dpia` endpoint retorna `{ required: true, reasons: [...] }`.

## 2. Assessment cuerpo (Art. 35(7))

- **Description de procesamiento:** {{ROPA_Finalidad}}
- **Necessity & proportionality:** local-only por diseño; salida desactivado por predeterminado;
  hashing/minimisation aplicado aintes cualquiera opcional externo llamada.
- **Risks a datos interesados:** unauthorised acceso (mitigated por operador auth + auditoríun);
  retención más allá de necesitar (mitigated por GDPR borrado / tombstone).
- **Mide:** cifrado en resto, cero predeterminado salida, resistente a la manipulación auditoríun chain,
  role-based acceso, y el operador cumplimiento consola.
- **Residual riesgo & sign-off:** _a ser completado por el responsable del tratamiento's DPO._

## 3. Consultation (Art. 35(9))

Donde un DPIA indica alto residual riesgo, el responsable del tratamiento consults el competent
autoridad de control aintes procesamiento.

---

_Completado DPIA a ser conservado por el responsable del tratamiento y supplied a el autoridad de control en solicitud._
