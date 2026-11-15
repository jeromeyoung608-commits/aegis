<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# detached-hash-firmante — Desacoplado hash Firma

> **Terminology**: este es **desacoplado hash firma**, *no* un criptográfico ciego
> firma scheme. Allí es ningún blinding factor y ningún unblinding paso — el firmante
> firma un SHA-256 hash ellos puede véase. El historical módulo nombre es kept para
> compatibility. Véase `docs/CLAIMS-WORDING.md`.

---

### 1. Qué esto resuelve
Multilateral aprobación often involves extremely sensible documentos (M&Un términos, medical registros, financials). Traditional e-signing forces el firmante a recibir el completo archivo, creating un filtración superficie el moment esto es gestionado. Este módulo lets cada firmante sign solo un **un SHA-256 documento hash**; el documento bytes nunca leave el local máquina, nunca entrar el firma paquete, y son nunca seen por el server/relay.

### 2. Quién compra este
B2B scenarios needing **multilateral aprobación sin exposing documento bytes**: legal/finance/executive cofirma de confidential archivos, regulatory filing, cross-institution joint endorsement.

### 3. Ejecutar en 60 segundos
```bash
cd modules/detached-hash-signer
node --test            # 8 assertions, all green
# Standalone browser demo: serve this directory with any static server
python3 -m http.server 8080  # then open http://127.0.0.1:8080/
```

### 4. Integración contrato
Puro ESM, cero dependencias, works en ambos navegador y Node (plataforma Web Criptografía). Named exports:
- `sha256Hex(bytes)` / `sha256HexOfText(text)` — documento hash
- `generateKeyPair()` / `exportPublicKey(k)` / `importPublicKey(b64)` — ECDSA P-256 claves
- `signHash(privateKey, hashHex)` / `verifySignature(publicKey, hashHex, sigB64)` — sign / verificar un hash (desacoplado firma)
- `makeBundle({docName, docHash, signers})` / `verifyBundle(json)` — desacoplado firma paquete
- `isDetached(json)` — prueba el paquete contiene ningún documento bytes

También exposed as `window.DetachedHashSigner` en el navegador, así externo systems puede integrate directamente.

### 5. Arquitectura
```
confidential doc ──SHA-256──▶ docHash(64 chars)  ──┐
                                                  ├─▶ each exec signs docHash ─▶ signers[]
                                                  │     (doc bytes never leave local)
makeBundle(docHash, signers) ─▶ {kind,docHash,signers}  ← no original
verifyBundle() ─▶ all signatures valid?
```
El paquete contiene solo `docHash + each signer(publicKey, signature)` — ningún documento contenido.

### 6. Garantiza & amenaza modelo
- **Desacoplado propiedad**: `isDetached` prueba el paquete transporta solo hash + firmas, nunca el documento.
- **firma atribución**: cada firmante firma el hash con su propio privado clave; el público clave verifica. Este prueba clave possession solo — firmante identidad es auto-declarado.
- **Manipulación resistance**: cualquiera firma fallo hace `verifyBundle` devolver `ok:false` de inmediato.
- Fuera de alcance: private-clave compromiso (holder's responsabilidad), comprometido host OS.

### 7. Conocido límites
- Este módulo solo firma el hash; documento distribution/storage/transport es gestionado subida (e.g. blind-relé + encrypted-archive).
- Esto hace no enforce un firma chain order; chained cofirma (cada parte firma prior firmas) puede ser layered en top.

### 8. Verificación
Véase `TEST_REPORT.md`: `node --test` todos verde (8/8), cubriendo hash stability, firma verificación, manipulación fallo, three-party desacoplado firma, missing-firma fallo, desacoplado propiedad, y malformed entrada.

### 9. Medido rendimiento
Único sign / verificar es sub-millisecond (nativo Web Criptografía ECDSA P-256, medido en Node 26).

### 10. Dependencias
**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes — solo plataforma Web Criptografía.

### 11. licencia
Coherente con el repositorio licencia. Este módulo es Aegis's propio implementación, con ningún tercero atribución encumbrance.

### 12. CHANGELOG
- v1.0.0 — detached-sign API, desacoplado paquete, detached-property comprobar, independiente `index.html` demo, y `TEST_REPORT.md`.
