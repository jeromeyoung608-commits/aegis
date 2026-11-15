<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: aegis-shell/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis Shell — Siete etapas Closed-Loop Comando consola

> Aegis banco de trabajo · `@aegis/shell`
> Motor Por Jerome Young

## 1. Qué esto resuelve

Taken alone, cada módulo looks como un demo: el topologíun es cool, redacción es solid, P2P es fast — pero un Cliente's primero question es always "puede estos ser strung en uno thing?" Sin un cerrado bucle, seven modules son seven islands, y allí es ningún prueba ellos actually cooperate. Este Shell wires ellos en uno **siete etapas estado máquina**: select node → carga contrato → local redactar → sign → cifrado transporte → counterparty verificar → sello en bóveda → auditoría-chain commit.

## 2. Quién compra este

- Procurement / integrators quién necesitar un full-machine demo, no punto demos
- Sales-engineering equipos selling Aegis as uno solution
- Entrega equipos needing un reproducible aceptación ruta

## 3. Ejecutar en 60 segundos

El Shell references cada módulo por absolute ruta `/modules/...`, así esto **debe ser servido de el Aegis repositorio raíz**:

```bash
cd /path/to/Aegis
python3 -m http.server 8000
# → http://localhost:8000/aegis-shell/
```

(En ejecución esto independiente dentro `aegis-shell/` sería 404 en `/modules/*` y show solo un vacío shell.)

## 4. Integración contrato

- El event-bus contrato vive en `src/sdk.js`: `topology:node-selected` / `redaktor:export-ready` / `artifact:signed` / `p2p:file-sent` / `p2p:file-received` / `artifact:verified` / `vault:sealed`.
- Externo subscribers usar `AegisSDK` y nunca leer el DOM directamente.
- Estado es mutated solo a través de el `src/context.js` mutators, así cada etapa es externally observable.

## 5. Arquitectura

```
aegis-shell/
├── index.html         seven-stage Stepper + three iframe workspaces
└── src/
    ├── context.js    FLOW_STAGES(1..7) + one-way-forward state machine
    ├── sdk.js        event bus / external contract
    ├── identity.js   signing adapter (uses Aegis-Identity)
    └── app.js        iframe orchestration + step lighting + closing audit
```

## 6. Garantiza & amenaza modelo

- **Guarantee**: `flowStage` solo increases (`Math.max`); out-of-order eventos nunca rewind el demo.
- **Guarantee**: un fallido verificación nunca unlocks el archivo paso (fallo debe stop en Verificar).
- **Fuera de alcance**: el in-iframe modules' propio garantiza (véase cada módulo README); también no protecting contra un host página inyectado por tercero scripts.

## 7. Conocido límites

- Depende en same-origin despliegue: cada módulo debe ser servido por el mismo origen; cross-origin iframes lose eventos y OPFS.
- Etapa 5 verificación y etapa 6 sellado depend en navegador OPFS soporte (Chrome / Borde).
- El stage-4 marca etiqueta es unificado as **Aegis-Transport** (previously mislabeled Aegis-SignedDelivery).

## 8. Verificación

```bash
node --test tests/flow.test.mjs
# expected: # pass 5 / # fail 0
```

Cubre: siete etapas continuity, completo 1→7 advance, **fallido verificar no puede entrar archivo** (fallo ruta), out-of-order eventos nunca rewind, `resetFlow()` clears todos campos.

## 9. Medido rendimiento

Puro state-machine lógica; en este máquina (macOS / Apple Silicon / Node 20+, 2026-11-10) el 5 aserciones ejecutar en < 50 ms. De extremo a extremo latency depende en el modules (OCR y P2P dominate).

## 10. Dependencias

**Un · Puro Cero**: 0 npm dependencias, 0 vendor, 0 externo solicitudes; solo nativo navegador APIs son usado.

## 11. licencia

**Abierto source, Apache-2.0** — véase `LICENSE`.

## 12. CHANGELOG

Véase [`CHANGELOG.md`](./CHANGELOG.md).
