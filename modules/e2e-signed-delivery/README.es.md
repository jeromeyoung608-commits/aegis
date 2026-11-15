<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# e2e-signed-delivery — De extremo a extremo Firmado Artefacto Entrega

## 1. Qué esto resuelve
Un firmado artefacto debe survive un hop de firmante a counterparty con su firmas y cadena de hash intacto, y el receptor debe ser able a verificar todo localmente aintes trusting esto. Este módulo assembles, transports, y verifica firmado artefactos fin a fin.

## 2. Quién compra este
Cualquiera flujo de trabajo que hands un firmado, multilateral documento a otro parte sobre un untrusted canal y necesita local verificación.

## 3. Ejecutar en 60 segundos
```bash
cd modules/e2e-signed-delivery
node --test                 # 14/14 green
python3 -m http.server 8080 # open index.html (browser flow; Playwright path skipped without browser)
```

## 4. Integración contrato
`assembleArtifact`, `parseArtifact`, `verifyArtifact`, y el crypto/PDF helpers son importable. El shell llamadas estos después firma y aintes sellado.

## 5. Arquitectura
documento bytes + trailer(firmantes) → assemble → transporte (P2P/relay) → analiza → verificar (hash match + todos firmas). El trailer es un array, así multi-firmante artefactos son nativo.

**Group entrega:** `src/sdk/envelope.js` wraps el documento DEK a N recipients' ECDH P-256 público claves (fresco ephemeral ECDH por recipient, AES-GCM-wrapped DEK). Uno sellado blob abre independently para cada recipient — ningún compartido frase de contraseñun, ningún per-recipient re-encryption. Cualquiera recipient no listed en sello tiempo es rechazado, y el sobre es cerrado (adding un recipient más tarde hace no concesión acceso).

## 6. Garantiza & amenaza modelo
cadena de hash integridad, multi-firma verificación, manipulación detección. Fuera de alcance: el en vivo transporte medium (gestionado por p2p-crypto-transfer / blind-relé).

## 7. Conocido límites
El browser/Playwright flujo es omitido automáticamente cuando ningún navegador es available, así el node suite permanece determinista.

## 8. Verificación
`node --test` → 14/14 verde (assemble/verify vuelta activación, chain integridad, manipulación, multi-firmante).

## 9. Medido rendimiento
Suite ~683 ms (Node 26), determinista.

## 10. Dependencias
**Un · Puro Cero** primera parte código: 0 npm dependencias. Incorporado pdf-lib vía importación mapa solo.

## 11. licencia
repositorio licencia. Incorporado pdf-lib conserva su propio MIT licencia.

## 12. CHANGELOG
- 2026-11-11 — README entregado (Inglés); Prueba_Informe entregado; 14/14 verde.
