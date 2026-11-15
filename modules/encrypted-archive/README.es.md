<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# encrypted-archive — Local Conocimiento cero bóveda

## 1. Qué esto resuelve
Firmado artefactos y secretos debe ser sellado así que incluso un local dump revela nada. encrypted-archive es un local, conocimiento cero bóveda: archivos son cifrado aintes ellos touch disco (OPFS/IndexedDB) y el cifrado claves nunca persist en texto sin cifrar.

## 2. Quién compra este
Cualquiera flujo de trabajo que necesita a almacén firmado artefactos, claves, o intermediate estado localmente sin leaking texto sin cifrar en disco.

## 3. Ejecutar en 60 segundos
```bash
cd modules/encrypted-archive
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser vault)
```

## 4. Integración contrato
`createVault`, `openOpfsStore`, y sealing/verification helpers son importable. El shell llamadas `createVault` después un verificado artefacto es producido.

## 5. Arquitectura
texto sin cifrar → AES-GCM sello con un frase de contraseña-derived clave → texto cifrado solo en OPFS/IndexedDB. El público tarjeta expone nada que podría descifrar el bóveda.

## 6. Garantiza & amenaza modelo
Ningún texto sin cifrar clave material en resto; `isSealed` rechaza registros que filtración clave material. Fuera de alcance: frase de contraseñun weakness, host OS compromiso.

## 7. Conocido límites
navegador-only persistencia (OPFS/IndexedDB); un falta navegador entorno es rechazado loudly más bien que faked.

## 8. Verificación
`node --test` → suite verde (bóveda get/put/list/remove, overwrite, clone aislamiento, OPFS refusal sin navegador).

## 9. Medido rendimiento
bóveda operaciones son sub-millisecond en node; navegador OPFS bound por dispositivo almacenamiento.

## 10. Dependencias
**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes (plataforma criptografía + almacenamiento).

## 11. licencia
repositorio licencia.

## 12. CHANGELOG
- 2026-11-11 — README entregado (Inglés); MDS-1 contrato.
