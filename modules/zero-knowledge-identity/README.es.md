<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/zero-knowledge-identity/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# zero-knowledge-identity — Localmente Self-Custodied clave Primitivas

> **Terminology**: el directorio nombre es historical. Este módulo wraps claves localmente
> con PBKDF2 + AES-GCM; esto ejecuta **ningún conocimiento cero prueba** y implementa ningún
> servidor protocol. Decir "localmente self-custodied claves". Véase `docs/CLAIMS-WORDING.md`.

## 1. Qué esto resuelve
Firma y verificación necesitar claves que nunca sit en texto sin cifrar y identities que survive recargar sin leaking. zero-knowledge-identity wraps frase de contraseña-protected claves, estable público fingerprints, y sellado (public-only) registros.

## 2. Quién compra este
Cualquiera módulo que necesita non-extractable clave material, un human-checkable huella, y un safe-to-share público identidad tarjeta.

## 3. Ejecutar en 60 segundos
```bash
cd modules/zero-knowledge-identity
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser identity UI)
```

## 4. Integración contrato
clave generación, frase de contraseñun wrapping/unwrapping, huella, y sealed-record construction son importable. e2e-signed-delivery consume el criptografía capa.

## 5. Arquitectura
privado clave → AES-GCM wrap con frase de contraseñun → blob (ningún texto sin cifrar PKCS#8) → huella de público clave → sellado público tarjeta. Recargar re-derives el clave de el frase de contraseñun.

## 6. Garantiza & amenaza modelo
Texto sin cifrar PKCS#8 es wiped aintes envoltura resuelve; incorrecto frase de contraseñun falla loudly; sellado registros reject cualquiera clave material filtración. Fuera de alcance: frase de contraseñun weakness.

## 7. Conocido límites
seguridad rests en frase de contraseñun strength y un non-compromised host.

## 8. Verificación
`node --test` → suite verde (wrap/unwrap, huella stability, recargar, filtración detección).

## 9. Medido rendimiento
Wrapping/verification son tens de milliseconds (nativo Web Criptografía).

## 10. Dependencias
**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes (plataforma Web Criptografía).

## 11. licencia
repositorio licencia.

## 12. CHANGELOG
- 2026-11-11 — README entregado (Inglés); MDS-1 contrato.
