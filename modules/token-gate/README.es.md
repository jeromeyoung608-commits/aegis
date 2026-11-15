<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# token-gate — token-Gated Salas (ECDSA Sala Tokens)

> ECDSA token-gated WebRTC / colaboración salas. Solo verificado clave-holders puede entrar el cofirma sesión.

---

### 1. Qué esto resuelve
Plano WebRTC / colaboración enlaces son "whoever tiene el URL joins" — fatal en B2B. Este módulo problemas short-lived, ECDSA (P-256) firmado tokens bound a un sala id y un opcional audience (un specific approver público clave). El relay/server verifica el token firma con un raíz público clave y admits Solo verificado clave-holders. El servidor nunca learns quién un person es — esto solo valida cryptography.

### 2. Quién compra este
Equipos needing trusted admisión colaboración: multilateral cofirma salas, privado whiteboards, controlled datos salas — cualquiera "link-leak shouldn't concesión entrada" escenario.

### 3. Ejecutar en 60 segundos
```bash
cd modules/token-gate
node --test            # 7 assertions, all green
python3 -m http.server 8080  # open http://127.0.0.1:8080/ to see issue/admit demo
```

### 4. Integración contrato
Puro ESM, cero dependencias, navegador + Node. Named exports:
- `generateRootKey()` / `exportPublicKey(k)` / `importPublicKey(b64)` — emisor raíz clave
- `issueToken(rootPriv, { room, exp?, ttlMs?, audience?, jti? })` — problema token (encabezado.carga útil.firma, todos base64url)
- `verifyToken(rootPub, token, { room?, requiredAud? })` → `{ok, room, exp, aud, reason}`
- `gate(rootPub, envelope, { room?, requiredAud? })` → `{admit, reason}`
También exposed as `window.TokenGate` en el navegador.

### 5. Arquitectura
```
issuer: generateRootKey ─▶ root priv (sign) / root pub (relay holds)
issue:  issueToken(rootPriv, {room, exp, audience}) ─▶ token
admit:  client hello{token,room} ─▶ relay verifyToken(rootPub, token) ─▶ ADMIT / DENY
```
El token transporta `room / exp / aud / jti`, firmado por el raíz privado clave; el relé contiene solo el raíz público clave y no puede forge.

### 6. Garantiza & amenaza modelo
- **token authenticity**: sin el raíz privado clave, ningún firma forgery; tampered/expired/wrong-room/wrong-audience tokens son todos rechazado.
- **Mínimo confianza**: el servidor valida solo cryptography, contiene ningún identidad, nunca touches el documento.
- Fuera de alcance: raíz private-clave compromiso (debería ser en un HSM/key manager), comprometido cliente.

### 7. Conocido límites
- Tokens son stateless (JWT-style); ningún revocación lista. Para instant revocación, el emisor maintains un nonce/denylist.
- Predeterminado `aud:'*'` hace no restrict el firmante; high-seguridad setups debería enlazar un specific público clave.

### 8. Verificación
Véase `TEST_REPORT.md`: `node --test` todos verde (7/7), cubriendo válido, expired, wrong-room, falsificado, audience-limited, puerta de calidad, y cross-root.

### 9. Medido rendimiento
Issue/verify son sub-millisecond (nativo Web Criptografía ECDSA P-256).

### 10. Dependencias
**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes — solo plataforma Web Criptografía.

### 11. licencia
Coherente con repositorio licencia. Este módulo es Aegis's propio implementación.

### 12. CHANGELOG
- v1.0.0 — ECDSA sala tokens, verify/gate, audience restriction, independiente demo, y `TEST_REPORT.md`.
