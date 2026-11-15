<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ACCESS-REVIEW.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Acceso Revisión & Cuenta Lifecycle

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor

Cubre operator/issuer acceso a un Aegis instancia y el periodic revisión
obligatorio por SOC 2 CC1.2 / CC6.1–6.3 y ISO 27001 Un.9.

---

## 1. Cuenta types

| Cuenta | Finalidad | Aprovisionamiento |
|---------|---------|--------------|
| `operator` | day-to-day operaciones (limpieza, firma, bóveda, auditoríun exportación) | local `accounts` tabla; o SCIM/OIDC (véase `SCIM.md`) |
| `admin` | mismo as operador + revocation/escrow admin | local `accounts` tabla |
| Emisor secreto (`AEGIS_ISSUER_SECRET`) | acuña sesión tokens (LAN clientes) | entorno secreto, **no** un inicio de sesión cuenta |

Allí es **ningún multi-tenant** modelo; cada instancia tiene su propio operador conjunto.

## 2. Joiner / Mover / Leaver (JML)

- **Joiner:** crear cuenta con al menos privilege (`operator` a menos que admin necesario);
  problema credenciales sobre un secured canal; registro propietario + approver.
- **Mover:** re-scope roles solo después aprobación; nunca accumulate privileges.
- **Leaver:** desactivar el cuenta de inmediato; el operador's **rastro de auditoríun permanece
  intacto** (esto es protected y no erasable — véase `server/store.js` `eraseSubject`);
  GDPR borrado se aplica a *datos interesados*, no el operador responsabilidad registro.

## 3. Periodic recertification

- **Quarterly** revisión de todos operator/admin cuentas: confirmar cada es aún
  obligatorio, rol appropriate, y propietario conocido.
- Eliminar o desactivar desactualizado cuentas; documento el revisión (who/when/result).
- **Emisor secreto rotación** en al menos **annually** o en suspicion de exposure;
  rotating invalidates todos emitido sesión tokens (TTL-bounded anyway).

## 4. Revisión lista de verificación

- [ ] Cuenta lista coincide approved roster (ningún orphaned cuentas).
- [ ] Ningún cuenta contiene `admin` sin un registrado negocio necesitar.
- [ ] Emisor secreto rotated dentro política ventana.
- [ ] Ningún shared/generic operador cuentas.
- [ ] Failed-login throttle activo (`auth_login_throttled` eventos presente bajo carga).
- [ ] auditoríun exportación reviewed para anomalous privileged acciones.

## 5. Al menos privilege & separation

operador acciones son scope-gated (e.g. revocation/escrow require admin). El
resistente a la manipulación, append-only auditoríun registro proporciona el detective control; el revisión proporciona el
preventive/periodic control.
