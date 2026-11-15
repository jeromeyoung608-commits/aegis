<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/DEPLOYMENT-DELIVERY-CHECKLIST.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis — despliegue & Entrega Lista de verificación

> Usar para cada Cliente despliegue. Ambos partes sign §7 en handover. Tick el
> cajas que aplicar; escribir N/A donde un paso hace no aplicar, con un reason.
> Todo aquí es verifiable — ningún paso requiere trusting un estado afirmación.

**Cliente:** ⟨legal entity nombre⟩  **Entorno:** ⟨host / cluster / air-gapped?>
**Encargo / Formulario de pedido ref:** ⟨ref⟩  **Fecha:** ⟨YYYY-MM-DD⟩

---

## 1. Pre-flight

| ☐ | Comprobar | Cómo a verificar | Resultado |
|---|---|---|---|
| ☐ | Node.js tiempo de ejecución presente y versión en el supported range | `node -v` → major ≥ 22 (`package.json` `engines.node`) | ⟨versión⟩ |
| ☐ | Ningún tercero tiempo de ejecución dependencias obligatorio | `npm run verify:zero-deps` → Aprobado | ☐ |
| ☐ | Objetivo port gratuito | `lsof -ti:<port>` → vacío (predeterminado 8080) | ☐ |
| ☐ | navegador presente (WebGPU / WebRTC / OCR necesitar un real navegador) | `chrome --version` | ⟨versión⟩ |
| ☐ | Disco space para OCR activos + evidencia bóveda | ≥ 500 MiB gratuito | ⟨gratuito⟩ |
| ☐ | Copia de seguridad taken de el objetivo entorno | Cliente registro | ☐ |

## 2. Installation

| ☐ | Paso | Comando / evidencia |
|---|---|---|
| ☐ | One-click instalar completado | `npm run setup` → success registro |
| ☐ | servidor arranca y sirve theshell | `node server.js` → `curl -sf http://localhost:<port>/` |
| ☐ | Ningún source, clave o archivo ruta es downloadable | `curl` en `/server.js`, `/config/local.json` → 404 |
| ☐ | Unauthorised rutas refused | `verify:p3` puerta de calidad → Aprobado |

## 3. Configuración

| ☐ | Paso | Donde | Valor |
|---|---|---|---|
| ☐ | Local secreto generado & almacenado **solo** en el operador's máquina | `config/local.json` (nunca committed, nunca entregado) | ☐ |
| ☐ | Emisor keypair generado (ECDSA) | `npm run setup` salida | ☐ |
| ☐ | Port / enlazar dirección conjunto | `config/local.json` | ⟨port⟩ |
| ☐ | OIDC / SSO opcional integración | `server/oidc.js` | ☐ / N/A |
| ☐ | Opcional RFC 3161 TSA endpoint configurado | `adapters/tsa-rfc3161/config-default.js` | ☐ / N/A |
| ☐ | **Fail-closed modo verificado**: externo TSA unreachable → local tiempo respaldo, relé intacto | `verify:tsa` sin conexión humo | ☐ |

## 4. seguridad verificación (ejecutar todos — registro el salida línea)

| ☐ | Puerta de calidad | Comando | Resultado |
|---|---|---|---|
| ☐ | Licensing encabeceras | `npm run verify:headers` | ☐ Aprobado |
| ☐ | Licensing cumplimiento | `npm run verify:licensing` | ☐ Aprobado |
| ☐ | Afirmaciones redacción | `npm run verify:claims` | ☐ Aprobado |
| ☐ | Sin dependencias lint | `npm run verify:zero-deps` | ☐ Aprobado |
| ☐ | Diagnostics | `npm run doctor` | ☐ 0 fallos |
| ☐ | Unidad + integración suite | `npm test` | ☐ aprobado / ☐ fallo |
| ☐ | Entrega paquete reproducible | `npm run pack:delivery && npm run verify:delivery` | ☐ Aprobado |
| ☐ | CSP nonce enforced (ningún inline script sin nonce) | `verify:csp` | ☐ Aprobado |
| ☐ | COOP/COEP encabeceras presente (cross-origin aislamiento) | `curl -I` → encabeceras | ☐ |
| ☐ | `.well-known/security.txt` presente con un monitored contacto | `curl` → archivo | ☐ |
| ☐ | SBOM regenerated para este compilación | `npm run sbom` → `SBOM.cdx.json` | ☐ |

## 5. Functional verificación (el siete etapas bucle)

| ☐ | Etapa | Verificado por |
|---|---|---|
| ☐ | 1 topologíun (dispositivo graph genera en escala) | ☐ |
| ☐ | 2 Redactor — destructive redacción (ningún recoverable texto capa) | ☐ |
| ☐ | 3 Sign (desacoplado hash firma, auto-declarado clave) | ☐ |
| ☐ | 4 Enviar (P2P relé, servidor ve texto cifrado solo) | ☐ |
| ☐ | 5 Recibir / verificar | ☐ |
| ☐ | 6 Archivo (cifrado OPFS bóveda) | ☐ |
| ☐ | 7 auditoríun (resistente a la manipulación cadena de hash) | ☐ |
| ☐ | evidencia exportación (portability paquete con `producer` / `provenance`) | ☐ |
| ☐ | WebGL2 respaldo ruta (ningún WebGPU máquina) | ☐ |

## 6. Handover paquete entregado a el Cliente

| ☐ | Elemento | Donde |
|---|---|---|
| ☐ | software + licencia (Apache-2.0) | `LICENSE`, `LICENSES/Apache-2.0.txt` |
| ☐ | SBOM para el entregado compilación | `SBOM.cdx.json` |
| ☐ | Entrega archivo + SHA256 digest | `dist/aegis-delivery-<version>.tar.gz` + digest |
| ☐ | Tercero atribución índice | `NOTICE`, `modules/*/vendor/MANIFEST.json` |
| ☐ | API / SDK documentación | `docs/API.md`, `docs/SDK.md` |
| ☐ | Claims-wording línea base (marketing guardrails) | `docs/CLAIMS-WORDING.md` |
| ☐ | seguridad política + soporte SLA + escalation contacts | `SECURITY.md`, `.well-known/security.txt`, Formulario de pedido §4 |
| ☐ | operador training (registrado) | ⟨sesión fecha, attendees⟩ |
| ☐ | clave material handover + rotación procedimiento | ⟨procedimiento ref⟩ |

## 7. Handover sign-off

| | Proveedor | Cliente |
|---|---|---|
| Nombre | Jerome Young (Yang Jie) | ⟨nombre⟩ |
| Rol | mantenedor | ⟨rol⟩ |
| firma | | |
| Fecha | | |

**Outstanding elementos en handover** (escribir ellos aquí; ambos partes conservar un copia):

1. ⟨elemento + propietario + due fecha⟩
2. ⟨elemento + propietario + due fecha⟩

**No cubierto por este despliegue** (estado expresamente, e.g. tercero
atestación, custom development, on-site work): ⟨lista o "ninguno">⟩

---

*Appendix: el authoritative puerta de calidad lista es `package.json` `scripts` y
`.github/workflows/ci-runtime.yml`. Si un comando en este lista de verificación ningún más largo
existe, que es un defecto en el lista de verificación — corrección esto, do no tick esto.*
