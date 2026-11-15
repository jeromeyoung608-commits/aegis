<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DPA.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis datos Procesamiento Acuerdo (DPA)

**Estado:** Emitido para firma · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Framework:** UE GDPR Article 28(3) / UK GDPR

Este DPA es entered en entre el **responsable del tratamiento** (el Cliente operating un
Aegis instancia) y el **encargado del tratamiento** (el Aegis software / vendor) y governs
procesamiento ejecutado cuando el Cliente usa Aegis a proceso personal datos.

---

## 1. Subject matter & duration

El subject matter es el provision de el Aegis local datos-cleansing Servicio.
Procesamiento ocurre para el duration de el encargo y para cualquiera retención período
obligatorio por el responsable del tratamiento o ley.

## 2. Nature, finalidad & types de procesamiento

- **Nature/purpose:** local limpieza, hash, firma, vaulting y auditoríun de
  Cliente-supplied documents/media.
- **Types de personal datos:** documento contents, derivado hashes/manifests,
  operador cuenta datos, y auditoríun metadatos.
- **Categorías de datos interesados:** el responsable del tratamiento's staff (operadores), y cualquiera
  individuals appearing en Cliente-supplied documentos.
- **Special-category datos:** ninguno procesado por el software por diseño; el
  responsable del tratamiento es responsable para cualquiera special-category datos esto chooses a subida.

## 3. responsable del tratamiento obligaciones

Determine el purposes y means de procesamiento; ensure un lawful base; provide
solo datos lawfully obtained; configure opcional integraciones (e.g. TSA) en línea
con transferencia requirements.

## 4. encargado del tratamiento obligaciones

1. **Confidentiality** — acceso limitado a esos con un necesitar a know.
2. **seguridad** — implement appropriate technical/organisational mide
   (cifrado en resto, encadenado por hash auditoríun, credential hash, inicio de sesión throttling,
   ningún predeterminado salida).
3. **Sub-processing** — el software tiene **ningún obligatorio sub-processors**; cualquiera
   opcional externo TSA es Cliente-configured y Cliente-controlled.
4. **auditoríun** — el encargado del tratamiento maintains un resistente a la manipulación, encadenado por hash auditoríun registro el
   responsable del tratamiento puede exportación para verificación (`/audit/export`).
5. **Incumplimiento notificación (Art. 33/34)** — el encargado del tratamiento shall notify el
   responsable del tratamiento **sin delay y en cualquiera evento dentro 24 hours** de becoming aware
   de un personal-datos incumplimiento, permitiendo el responsable del tratamiento a meet su propio 72-hora
   supervisory-authority notificación duty bajo GDPR Art. 33.
6. **Deletion / devolver** — en terminación, el responsable del tratamiento's datos resides en su
   propio tiempo de ejecución volumen y es eliminado por el responsable del tratamiento's retención política; el
   encargado del tratamiento's immutability control se aplica solo a el seguridad rastro de auditoríun.
7. **Assistance** — el encargado del tratamiento assists el responsable del tratamiento con datos-subject
   solicitudes y Article 32–36 obligaciones a el alcance technically feasible.

## 5. International transferencias

Ningún transferencias occur por predeterminado. Donde el responsable del tratamiento permite un opcional TSA, el
responsable del tratamiento es responsable para un lawful transferencia mecanismo (e.g. SCC) para cualquiera
hash transmitted.

## 6. Registros & evidencia

El Servicio proporciona `GET /audit` y `GET /audit/export` para el responsable del tratamiento's
registros, y un `GET /healthz` sonda para disponibilidad monitorización.

## 7. Aplicable ley

As agreed en el principal commercial acuerdo; este plantilla references el GDPR
as el línea base.

---

## Anexo 1 — Technical & Organisational Mide (Art. 32)

| Measure | Implementación evidencia (Aegis source) |
|---------|------------------------------------------|
| Cifrado en resto | encrypted-archive bóveda (AES-GCM); TLS clave material en `~/.aegis/tls` |
| Credential hash | `server/store.js` — `crypto.scrypt` clave derivation (per-salt, N=16384) |
| Acceso control | bearer-token operador auth con TTL; operator/admin alcance separation |
| Inicio de sesión throttling | `server.js` — por IP y por IP:username fixed-window velocidad límites + por IP enumeration guarda |
| auditoríun integridad | encadenado por hash, resistente a la manipulación `audit_events`; exportación vía `/audit/export` |
| red minimisation | cero predeterminado salida; verificado por `npm run verify:zero-deps` |
| clave management | emisor secreto acuña sesión tokens; rotated por el responsable del tratamiento |

## Anexo 2 — Sub-processors (Art. 28(2))

Ninguno obligatorio. El solo opcional externo integración es un Cliente-configured
RFC3161 TSA (envía un **hash solo**); el Cliente es el responsable del tratamiento de que
transferencia y responsable para el transferencia mecanismo (e.g. SCC).

## Anexo 3 — Personal-datos incumplimiento procedimiento (Art. 33/34)

1. Detectar & contener (rotar emisor secreto; isolate el instancia).
2. Notify el responsable del tratamiento **dentro 24 hours**.
3. Assist el responsable del tratamiento's 72-hora supervisory-authority notificación.
4. Post-incident revisión; el resistente a la manipulación auditoríun registro es el forensic source.

## Anexo 4 — Deletion & devolver (Art. 28(3)(g))

En terminación, el responsable del tratamiento's datos resides en su propio tiempo de ejecución volumen y es
eliminado por el responsable del tratamiento's retención política. El encargado del tratamiento's resistente a la manipulación
rastro de auditoríun es conservado para responsabilidad y es no deleted.

## firma

| responsable del tratamiento | encargado del tratamiento (Aegis) |
|-----------|-------------------|
| Nombre / entity: {{CONTROLLER_Legal_Nombre}} | Nombre / entity: Aegis (Jerome Young) |
| Authorised signatory: ______ | Authorised signatory: ______ |
| Fecha: ______________________ | Fecha: ______________________ |

> Nota: aplicable ley: {{Aplicable_Ley}}; asesoría jurídica confirmar aintes firma.
