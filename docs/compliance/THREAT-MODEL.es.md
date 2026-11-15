<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/THREAT-MODEL.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Amenaza modelo

Alcance: el Aegis sin dependencias gateway + shell. Fuera de alcance: el Cliente's IdP,
invertir proxy, y host OS.

## Activos
1. Operator/audit base de datos (`data/aegis.db`): cuentas, sesiones, rastro de auditoríun.
2. Emisor secreto / operador credenciales — puerta de calidad token minting + operador API.
3. Cliente media + C2PA manifests (el provenance registro él mismo).
4. cumplimiento hechos + subido documentos (`data/compliance/`).

## Threats & controles
| # | Amenaza | Control |
|---|---|---|
| T1 | Estático ruta traversal expone source/secrets | Nivel superior deny lista + ext deny + repeated-`..` decode; verificado 404/403 |
| T2 | Entregado imagen leaks un compartido secret/DB | Entrega excluye `data/`, `config/local.json`, `*.db*`; B-03 assert |
| T3 | Falsificado JWT / operador sesión | `operatorAuthorized`; HS256-solo local; OIDC rechaza `HS256`/manipulado |
| T4 | MFA seed theft | TOTP sellado AES-256-GCM; recuperación codes salted-hash + one-time |
| T5 | auditoríun tampering / operador wipes propio trace | Append-only; operator/system trail non-erasable (B-04) |
| T6 | Brute force / abuse | Por IP velocidad límite (opt-in `AEGIS_RATE_LIMIT`); SCIM por IP límite |
| T7 | Insecure transporte | Opcional TLS + HSTS; reverse-proxy TLS referencia |
| T8 | Fake cumplimiento declaration | Producto nunca fabricates legal hechos; operador supplies vía consola |

## Assumptions / residual riesgo
- El host, invertir proxy, y IdP son el Cliente's responsabilidad.
- Si `AEGIS_TRUSTED_LAN=1` es conjunto, `/session` es abierto a cualquiera reachable cliente (lab
  solo) — documentado y warned en arranque.
- Un comprometido emisor secreto allows token minting; rotar por RUNBOOK-clave-ROTATION.
