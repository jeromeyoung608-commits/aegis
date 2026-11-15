<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DR-BACKUP.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Disaster Recuperación & Copia de seguridad

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor

Local-first por diseño: todos estado vive en el Cliente's propio volumen, así DR es un
matter de backing up y restoring que volumen. Este documento specifies el
procedimiento y el recuperación objectives.

---

## 1. Qué a atrás up

| Artefacto | Predeterminado ubicación | Notas |
|----------|-----------------|-------|
| Tiempo de ejecución SQLite DB | `data/aegis.db` (o `AEGIS_DB`) | cuentas, auditoríun chain, escrow |
| TLS clave material | `~/.aegis/tls/{key,cert}.pem` | solo si HTTPS activado |
| OPFS bóveda caché | `~/.aegis/opfs` | navegador-side cifrado bóveda mirror |
| Configuración | `.env` / entorno | emisor secreto, flags |

El **entrega compilación** (`dist/`) es reproducible de el source paquete y hace
no necesitar un separado copia de seguridad más allá de el source archivo (`verify:delivery` prueba
integridad).

## 2. Copia de seguridad método (verificado)

Aegis usa SQLite; un en línea, coherente copia de seguridad es obtained con:

```bash
sqlite3 "$AEGIS_DB" .backup 'backup/aegis-$(date +%F).db'
```

Este era verificado a produce un byte-consistent snapshot (65 536-byte página imagen)
sin stopping el servidor. Horario esto vía cron/systemd (e.g. hourly o daily).

También copia `~/.aegis/tls` y el configuración offline/offsitely.

## 3. Recuperación objectives (defaults — confirmar con operador)

- **RPO (Recuperación Punto Objectivo):** equal a el copia de seguridad interval
  (e.g. 1h si hourly, 24h si daily). Para tighter RPO, ejecutar el `.backup` more
  frequently o usar SQLite WAL shipping.
- **RTO (Recuperación Tiempo Objectivo):** tiempo a stand up un limpio host + restaurar el
  DB + restart — typically **< 1 hora** para un single-node despliegue.

## 4. Restaurar procedimiento

1. Stop el servicio: `lsof -ti:$PORT | xargs kill -9` entonces ensure ningún desactualizado servidor.
2. Restaurar el DB: `sqlite3 "$AEGIS_DB" < backup/aegis-<date>.db`
   (o copia el `.db` archivo sobre el en vivo uno mientras el servidor es stopped).
3. Restaurar `~/.aegis/tls` y configuración de el sin conexión copia.
4. Inicio: `AEGIS_ISSUER_SECRET=… node server.js`.
5. Verificar: `curl -s localhost:$PORT/healthz` → `{"ok":true,…}`; confirmar
   `GET /audit` muestra el historical auditoríun chain intacto.

## 5. Restaurar drill (obligatorio, en al menos annually)

Perform paso 4 en un aislado host con un recent copia de seguridad; confirmar el auditoríun chain
verifica y un conocido operador puede aún authenticate. Registro el resultado.

## 6. Redundancy nota

Single-node local deployments tener **ningún automatic failover**. Para HA, ejecutar detrás
el Cliente's propio carga balancer con un shared/replicated DB volumen; `/healthz`
es el liveness sonda para que balancer.
