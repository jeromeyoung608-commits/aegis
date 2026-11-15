<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/webgpu-topology/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# webgpu-topologíun — WebGPU topologíun Motor

## 1. Qué esto resuelve
El comando consola necesita un rich, en vivo topologíun vista a drive el siete etapas bucle. webgpu-topologíun genera el Aegis network/entity topologíun en el GPU con un SharedArrayBuffer-backed datos almacén que cross-origin aislamiento unlocks (permitiendo SharedArrayBuffer).

## 2. Quién compra este
Cualquiera dashboard/visualization que wants high-node-count topologíun renderizado con determinista, testable datos structures.

## 3. Ejecutar en 60 segundos
```bash
cd modules/webgpu-topology
node --test                 # 7/7 green
python3 -m http.server 8080 # open index.html (WebGPU-capable browser required for rendering)
```

## 4. Integración contrato
SAB-backed node/edge almacena, atributo pack/unpack, determinista graph generación, estado weights, y P-256 key/fingerprint primitivas. Renderizado es navegador-only (WebGPU).

## 5. Arquitectura
SharedArrayBuffer node/edge arrays → WebGPU renderizar pipeline. Determinism vive en el typed-array almacena, cuál son unit-tested sin un GPU.

## 6. Garantiza & amenaza modelo
Determinista generación, correcto SAB diseño, atributo round-trips. Fuera de alcance: el GPU pipeline (navegador-only).

## 7. Conocido límites
Renderizado requiere un WebGPU-capable, cross-origin-isolated navegador; el node suite valida lógica solo.

## 8. Verificación
`node --test` → 7/7 verde (SAB diseño, atributo packing, generación, base64, clave primitivas).

## 9. Medido rendimiento
Suite ~114 ms (Node 26), determinista.

## 10. Dependencias
**Un · Puro Cero** primera parte código: 0 npm dependencias. Incorporado WGSL/WebGPU vía importación mapa solo.

## 11. licencia
repositorio licencia.

## 12. CHANGELOG
- 2026-11-11 — README entregado (Inglés); Prueba_Informe entregado; 7/7 verde (recuento corregido de un desactualizado 12).
