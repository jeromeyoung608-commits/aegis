<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/INCIDENT-RESPONSE.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Incidente Respuesta Runbook

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor
**Finalidad:** define cómo el operating equipo detecta, contiene, eradicates, recovers
de, y learns de security/privacy incidents, incluyendo el GDPR 72-hora
breach-notification duty.

---

## 1. Roles

| Rol | Responsabilidad |
|------|----------------|
| Incidente Commander (IC) | posee el respuesta, coordinates, decides severity |
| seguridad lead | technical containment & forensics |
| Comms / DPO | regulator, Cliente y interno communication |
| On-call operador | executes containment pasos en el instancia |

## 2. Severity classification

| SEV | Ejemplo | Respuesta objetivo |
|-----|---------|-----------------|
| SEV1 | Confirmado incumplimiento de operador cuenta / emisor secreto filtración / datos exfiltration | 1h acknowledge, 24h containment |
| SEV2 | Exploit attempted & bloqueado, auditoría-integrity alarm | 4h acknowledge |
| SEV3 | Servicio degradation, fallido copia de seguridad, /healthz red | 1 negocio día |
| SEV4 | Cosmetic / doc / low-risk | backlog |

## 3. Respuesta phases

1. **Detectar / Triage** — alerts de `/healthz` monitorización, auditoríun anomalies
   (`auth_login_throttled`, `auth_login_failed` spikes), o externo informe.
2. **Contener** — rotar `AEGIS_ISSUER_SECRET`; disable/lock el implicated
   operador cuenta; isolate el instancia (stop `node server.js` o bloque port).
3. **Eradicate** — patch el vulnerable component; purge cualquiera inyectado artefacto;
   confirmar con `verify:delivery` que el deployed compilación coincide un known-good manifest.
4. **Recover** — restaurar de el último known-good copia de seguridad (`sqlite3 .backup` chain,
   véase `DR-BACKUP.md`); bring el servicio atrás detrás monitorización.
5. **Post-mortem** — blameless write-up dentro 5 negocio días; el **resistente a la manipulación
   auditoríun registro** (`/audit/export`) es el authoritative forensic source — esto no puede
   ser erased (operator/system interesados son protected).

## 4. Incumplimiento notificación (GDPR Art. 33/34)

- Assess whether un **personal-datos incumplimiento** occurred dentro **24h** de detección.
- Notify el competent **autoridad de control dentro 72h** si obligatorio.
- Notify **affected datos interesados** sin undue delay cuando alto riesgo a ellos.
- El responsable del tratamiento (Cliente operating el instancia) posee el notificación; el
  encargado del tratamiento (Aegis) assists por el DPA.

## 5. Comms

- Interno: incidente canal + IC actualiza cada 4h durante Sev1/2.
- Externo: vía DPO; nunca disclose forensic detalle publicly.

## 6. Drills

- Quarterly tabletop; anual en vivo restaurar drill (véase `DR-BACKUP.md`).
- Prueba el throttle/alarm ruta por deliberadamente tripping `auth_login_throttled`.
