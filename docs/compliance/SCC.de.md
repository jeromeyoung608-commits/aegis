<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCC.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Standard Contractual Clauses (SCC) — International Übertragung Modul

**Status:** Vorlage für Signatur · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Framework:** EU GDPR Article 46 / Commission Implementing Decision (EU) 2021/914

Dies Modul gilt wenn persönlich Daten verarbeitet durch Aegis ist transferred zu ein
third country (einschließlich zu ein Auftragsverarbeiter, sub-Auftragsverarbeiter, oder ein extern Service
solche as ein Time-Stamp Authority). Es ist appended zu der DPA und ist abgeschlossen durch
Verantwortlicher mit seiner qualifiziert Rechtsberatung vor irgendein solche Übertragung ist aktiviert.

---

## 1. Parteien

- **Daten exporter (Verantwortlicher):** {{CONTROLLER_Rechtlich_Name}} — {{CONTROLLER_Adresse}} — {{CONTROLLER_REG_Kein}}
- **Daten importer (Auftragsverarbeiter / TSA / sub-Auftragsverarbeiter):** _zu sein abgeschlossen pro Übertragung_

## 2. Übertragung details

- **Zweck von Übertragung:** {{ROPA_Zweck}}
- **Kategorien von Daten transferred:** Dokument hashes/manifests; Bediener Konto
  Metadaten; und, wo Verantwortlicher ermöglicht ein extern TSA, der one-way Hash
  submitted für timestamping. Kein Dokument Klartext lässt Aegis Instanz durch
  Standard (`gateway.externalTsa.enabled=false`).
- **Empfänger in der third country:** {{ROPA_Empfänger}}
- **Rechtlich Basis für Übertragung (Art. 46):** Standard Contractual Clauses (dies
  Modul) + supplementary misst (Verschlüsselung in transit, minimisation zu Hash-only)

## 3. Modul selection (Art. 2021/914)

- [ ] **Modul Eine** — Verantwortlicher → Auftragsverarbeiter
- [ ] **Modul Two** — Auftragsverarbeiter → Auftragsverarbeiter (sub-processing)
- [ ] **Modul Drei** — Verantwortlicher → Verantwortlicher

## 4. Supplementary misst

- Verschlüsselung in transit (TLS 1.2+); outbound Übertragungen deaktiviert durch Standard.
- Daten minimisation: nur non-reversible hasht sind transmitted zu ein TSA.
- Transparency: jeder Übertragung ist aufgezeichnet in Server Audit Protokoll.

## 5. Docking Punkt

Der SCC ist nur relevant wenn Verantwortlicher ermöglicht ein cross-border Ablauf. Der Aegis
Fabrik Gate (§Compliance Status) macht **nicht** Block auf SCC completion, weil
Aegis liefert aus mit alle Ausgang deaktiviert; SCC completion ist Verantwortlicher's
Verantwortung und ist evidenced hier für Aufsichtsbehörde.

---

_Abgeschlossen SCC zu sein signiert durch beide Parteien und beibehalten durch Verantwortlicher._
