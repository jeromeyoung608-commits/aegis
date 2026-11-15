<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/INCIDENT-RUNBOOK.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Incidente respuesta runbook

## Detección
- Forward auditoríun eventos a un SIEM (`audit.forwardUrl` en el consola Configuración pestaña, o
  `CONFIG.audit.forwardUrl`); Aegis POSTs cada evento best-effort.
- Monitor `/metrics` (Prometheus): `aegis_audit_events_total`, `aegis_sessions_active`,
  `aegis_uptime_seconds`.

## Triage (primero 1 hora)
1. Identify el evento de el rastro de auditoríun (consola → auditoríun, o `/audit` query).
2. Si un credential es suspected comprometido: rotar el emisor secreto
   (RUNBOOK-clave-ROTATION) y revoke el operador sesión (consola → Sesiones).
3. Si un interesado es affected: usar el datos interesados pestaña a exportación (DSAR) y, si
   obligatorio, erase (Art.17) — el operator/system trail permanece intacto (B-04).

## Incumplimiento notificación (GDPR Art.33/34)
- Usar el consola Configuración pestaña → "Enviar incidente prueba" a validate el notificación
  canal, entonces disparador el real notificación a su DPO + autoridad de control
  dentro 72h de awareness (Art.33) / sin undue delay para high-risk (Art.34).
- Conservar el Aegis auditoríun registro as el evidencia de containment acciones.

## Recuperación
- Restaurar el base de datos de un copia de seguridad si corrupted: `scripts/restore.sh <backup.db>`,
  o descargar vía el consola (Configuración → Descargar DB copia de seguridad).
- Re-run el entrega puerta de calidad (`npm run verify:delivery`) después cualquiera rebuild.

## Post-incident
- Actualización RUNBOOK-clave-ROTATION y THREAT-MODEL; añadir detections para el fallo modo.
- Registro el cronología en el rastro de auditoríun (esto es append-only por diseño).
