<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `docs/compliance/DATA-RESIDENCY.md`
> Übersetzung zur besseren Lesbarkeit. Bei Abweichungen gilt der englische Text.

# Datenresidenz und Übermittlung — Aegis

**Status:** erlassen · **Version:** 1.0 · **Zuletzt aktualisiert:** 2026-11-14
**Produkt:** Aegis — datenschutzorientierte lokale Bereinigungs-Engine

---

## 1. Grundsatz: Daten bleiben, wo Sie sie betreiben

Aegis arbeitet **lokal zuerst**. Standardmäßig werden **alle** personenbezogenen
Daten — Dokumente, abgeleitete Hashes, Manifeste, Betreiberkonten und
Audit-Ereignisse — auf dem eigenen Laufzeit-Volume des Kunden gespeichert
(`data/aegis.db`, der verschlüsselte Archiv-Tresor und `~/.aegis/tls`). Der
Anbieter erhält sie nie.

## 2. Netzwerkverhalten im Standard — kein ausgehender Verkehr

Der ausgelieferte Build unternimmt **keine ausgehenden Netzwerkaufrufe**, solange
keine optionale Integration ausdrücklich aktiviert ist. Das wird durch das
Zero-Dependency-Gate geprüft, das den Build abbricht, wenn ein Modul ausgehende
E/A betreibt. Keine Telemetrie, keine Analyse, keine SaaS-Rückrufe.

## 3. Optionale Integrationen (kundengesteuert, standardmäßig aus)

| Integration | Aktiv, wenn | Übertragene Daten | Grenzüberschreitung |
|-------------|-----------|----------|---------------------------|
| RFC-3161-Zeitstempeldienst | nur bei `gateway.externalTsa.enabled=true` | **nur ein Hash** (nie Dokumentbytes) | Endpunkt vom Kunden gewählt; der Kunde verantwortet den Übermittlungsmechanismus (z. B. SCC) |

Es gibt **keine weitere** ausgehende Verbindung. SCIM/OIDC (falls aktiviert)
spricht ausschließlich mit dem Identitätsanbieter des Kunden.

## 4. Internationale Übermittlungen (DSGVO Kapitel V)

- **Standard:** keine. Die Verarbeitung erfolgt in der Rechtsordnung, in der die
  Instanz läuft.
- **Optionaler TSA:** nur ein Hash verlässt die Instanz. Da ein kryptografischer
  Hash eines Dokuments in der Regel keine personenbezogenen Daten in Klartext
  darstellt und der Endpunkt vom Kunden gewählt wird, liegt der
  Übermittlungsmechanismus (SCC / Angemessenheitsbeschluss) in der
  Verantwortung des Kunden. TSA-Endpunkt und Standort im ROPA dokumentieren.
- **Support-Kanäle des Anbieters:** jede Support-Interaktion unterliegt der
  Support-Vereinbarung; Produktdaten werden nur übertragen, wenn der Kunde sie
  bewusst weitergibt.

## 5. Residenz-Bescheinigung für Kunden

Kunden mit Anforderungen an die Datenresidenz können anhand dieses Dokuments und
des Nachweises aus `verify:zero-deps` belegen, dass in der Standardkonfiguration
keine personenbezogenen Daten ihren Perimeter verlassen. Aktivieren Sie nur
Integrationen, deren Übermittlungsgrundlage Sie genehmigt haben.

Bereitstellungsregion und gegebenenfalls geforderte Klauseln zu lokalen
Verarbeitern werden je Beauftragung im Bestellformular festgelegt.
