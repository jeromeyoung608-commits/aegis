<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/VPAT-2.5-EU.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# VPAT 2.5 UE + WCAG 2.2 Nivel AA — Conformance Informe

**Estado:** Emitido · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor (operador consola + 12 modules)
**Standard:** EN 301 549 / WCAG 2.2 Nivel AA (UE Accessibility Act, EAA)
**Evaluation método:** manual keyboard + screen-reader aprobado en el 13 entregado páginas / 96 controles; automatizado `aria-busy`/`role` comprobaciones.

---

## Summary

| Conformance nivel | Resultado |
|------------------|--------|
| WCAG 2.2 Nivel Un | Soporta |
| WCAG 2.2 Nivel AA | Soporta (véase 3.3.2 nota) |
| EN 301 549 | Soporta |

Ningún contenido es conveyed por color alone; todos long-running controles expose
`aria-busy` para estado; todos interactive controles son reachable por keyboard.

## WCAG 2.2 AA — selected criterios

| § | Criterion | Resultado | Remarks |
|---|-----------|--------|---------|
| 1.1.1 | Non-text contenido | **N/A** | Ningún informative images; icons son decorative / labelled. |
| 1.3.1 | Info y relationships | Soporta | Forms usar associated `<label>` / `aria-label`. |
| 1.4.4 | Resize texto | **Soporta** | 200% zoom — ningún pérdida de content/function (verificado). |
| 1.4.10 | Reflow | **Soporta** | 375px width — ningún horizontal overflow en sampled páginas. |
| 1.4.11 | Non-text contrast | Soporta | UI meets 3:1 para controls/state. |
| 2.1.1 | Keyboard | Soporta | Todos controles operable por keyboard. |
| 2.4.7 | Foco visible | Soporta | Visible foco ring en todos controles; marca enlace tiene `:focus-visible` outline. |
| 3.3.1 | Error identification | Soporta | Claro texto errores (e.g. XSS/SQLi rechazado con mensaje). |
| 3.3.2 | Labels o instructions | **Soporta** | Cada input/control transporta un programmatic etiqueta (`<label for>`, envoltura `<label>`, o `aria-label`) — incluyendo el lienzo nota editor, remediated en este compilación. |
| 4.1.2 | Nombre, rol, valor | Soporta | `aria-busy`, `role`, `aria-label` presente en dynamic controles. |

## Conocido limitaciones
- Legacy builds aintes 2026-11-14 entregado un small número de unlabelled controles; remediated en el actual compilación. Re-test en el deployed paquete.

Este statement es un self-assessment. Donde el EAA conformity declaration es
emitido publicly, esto es accompanied por un independiente auditor's revisión.
