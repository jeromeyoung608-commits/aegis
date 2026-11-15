<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/VPAT-2.5-EU.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# VPAT 2.5 UE + WCAG 2.2 Niveau AA — Conformance Rapport

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur (opérateur console + 12 modules)
**Standard:** EN 301 549 / WCAG 2.2 Niveau AA (UE Accessibility Act, EAA)
**Evaluation méthode:** manuel keyboard + screen-reader résumi sur le 13 livré pages / 96 contrôles; automatisé `aria-busy`/`role` contrôles.

---

## Summary

| Conformance niveau | Résultat |
|------------------|--------|
| WCAG 2.2 Niveau Un | Prend en charge |
| WCAG 2.2 Niveau AA | Prend en charge (voir 3.3.2 note) |
| EN 301 549 | Prend en charge |

Aucun contenu est conveyed par color alone; tous long-running contrôles expose
`aria-busy` pour état; tous interactive contrôles sont reachable par keyboard.

## WCAG 2.2 AA — selected critères

| § | Criterion | Résultat | Remarks |
|---|-----------|--------|---------|
| 1.1.1 | Non-text contenu | **N/A** | Aucun informative images; icons sont decorative / labelled. |
| 1.3.1 | Info et relationships | Prend en charge | Forms utiliser associated `<label>` / `aria-label`. |
| 1.4.4 | Resize texte | **Prend en charge** | 200% zoom — aucun perte de content/function (vérifié). |
| 1.4.10 | Reflow | **Prend en charge** | 375px width — aucun horizontal overflow sur sampled pages. |
| 1.4.11 | Non-text contrast | Prend en charge | UI meets 3:1 pour controls/state. |
| 2.1.1 | Keyboard | Prend en charge | Tous contrôles operable par keyboard. |
| 2.4.7 | Focus visible | Prend en charge | Visible focus ring sur tous contrôles; marque lien a `:focus-visible` outline. |
| 3.3.1 | Erreur identification | Prend en charge | Clair texte erreurs (e.g. XSS/SQLi rejeté avec message). |
| 3.3.2 | Labels ou instructions | **Prend en charge** | Chaque input/control porte un programmatic libellé (`<label for>`, encapsulation `<label>`, ou `aria-label`) — y compris le canvas note editor, remediated dans ce build. |
| 4.1.2 | Nom, rôle, valeur | Prend en charge | `aria-busy`, `role`, `aria-label` présent sur dynamic contrôles. |

## Connu limitations
- Legacy builds avant 2026-11-14 livré un small nombre de unlabelled contrôles; remediated dans le actuel build. Re-test sur le deployed paquet.

Ce statement est un self-assessment. Où le EAA conformity declaration est
émis publicly, il est accompanied par un indépendant auditor's revue.
