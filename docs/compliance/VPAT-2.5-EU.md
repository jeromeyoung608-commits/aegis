<!-- Issued — Voluntary Product Accessibility Template; verify against the deployed build before publication. -->

# VPAT 2.5 EU + WCAG 2.2 Level AA — Conformance Report

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine (operator console + 12 modules)
**Standard:** EN 301 549 / WCAG 2.2 Level AA (EU Accessibility Act, EAA)
**Evaluation method:** manual keyboard + screen-reader pass on the 13 shipped pages / 96 controls; automated `aria-busy`/`role` checks.

---

## Summary

| Conformance level | Result |
|------------------|--------|
| WCAG 2.2 Level A | Supports |
| WCAG 2.2 Level AA | Supports (see 3.3.2 note) |
| EN 301 549 | Supports |

No content is conveyed by color alone; all long-running controls expose
`aria-busy` for state; all interactive controls are reachable by keyboard.

## WCAG 2.2 AA — selected criteria

| § | Criterion | Result | Remarks |
|---|-----------|--------|---------|
| 1.1.1 | Non-text content | **N/A** | No informative images; icons are decorative / labelled. |
| 1.3.1 | Info and relationships | Supports | Forms use associated `<label>` / `aria-label`. |
| 1.4.4 | Resize text | **Supports** | 200% zoom — no loss of content/function (verified). |
| 1.4.10 | Reflow | **Supports** | 375px width — no horizontal overflow on sampled pages. |
| 1.4.11 | Non-text contrast | Supports | UI meets 3:1 for controls/state. |
| 2.1.1 | Keyboard | Supports | All controls operable by keyboard. |
| 2.4.7 | Focus visible | Supports | Visible focus ring on all controls; brand link has `:focus-visible` outline. |
| 3.3.1 | Error identification | Supports | Clear text errors (e.g. XSS/SQLi rejected with message). |
| 3.3.2 | Labels or instructions | **Supports** | Every input/control carries a programmatic label (`<label for>`, wrapping `<label>`, or `aria-label`) — including the canvas note editor, remediated in this build. |
| 4.1.2 | Name, role, value | Supports | `aria-busy`, `role`, `aria-label` present on dynamic controls. |

## Known limitations
- Legacy builds before 2026-11-14 shipped a small number of unlabelled controls; remediated in the current build. Re-test on the deployed package.

This statement is a self-assessment. Where the EAA conformity declaration is
issued publicly, it is accompanied by an independent auditor's review.
