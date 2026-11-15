<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/RUNBOOK-BREAK-GLASS.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Break-glass (Schlüssel Hinterlegung) runbook

Aegis unterstützt **Schlüssel Hinterlegung** für "break-glass" Wiederherstellung von ein session/asset wenn der
primary holder ist unavailable. Dies ist ein accountability-sensitive Fähigkeit und ist
audited; verwenden es nur unter ein dokumentiert, authorized Verfahren.

## Wenn zu verwenden
- Ein gesperrt Sitzung muss sein admitted aber Bediener wer versiegelt Hinterlegung ist absent.
- Ein regulatory/litigation hold erfordert retrieving ein versiegelt Nutzdaten.

## Verfahren
1. **Authorize:** obtain ein second-person Genehmigung (two-Bediener Regel). Datensatz der
   ticket/incident ID.
2. **Deposit/retrieve:** Hinterlegung API deposits ein versiegelt Blob unter ein Raum Schlüssel; der
   Wiederherstellung Endpunkt gibt zurück es zu ein authorized holder. Jeder deposit und retrieval
   ist geschrieben zu der nur-appendierbar Audit Protokoll (`escrow.deposit` / `escrow.retrieve`).
3. **Prüfen:** bestätigen Audit Eintrag zeigt der retrieving Bediener, Zeitstempel, und
   Raum — Audit-Trail ist Beweis der break-glass war legitimate.
4. **Close:** nach verwenden, rotieren der relevant Geheimnis (siehe RUNBOOK-Schlüssel-ROTATION.md) und
   Hinweis der break-glass Ereignis in Vorfall Datensatz.

## Guardrails
- Hinterlegung ist **Opt-in** (`gateway.escrow.enabled`); ermöglicht
  `gateway.escrow.requireForAdmit` macht Zulassung impossible ohne ein deposited
  Schlüssel — nur turn dies auf wenn Ihr Prozess kann actually deposit.
- Der operator/system Audit-Trail ist **niemals erasable** (GDPR Art.17 Ziele Daten
  Betroffene, nicht Rechenschaftspflicht Protokolle — siehe der B-04 Härtung Hinweis in
  Lieferung_Bericht.md). Ein break-glass Ereignis daher always lässt ein trace; das ist
  intentional.
- Deaktivieren Hinterlegung in high-risk environments wo der hinzugefügt Wiederherstellung Oberfläche outweighs
  Verfügbarkeit benefit.
