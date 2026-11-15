<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DPA.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis données Traitement Accord (DPA)

**Statut:** Émis pour signature · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Framework:** UE GDPR Article 28(3) / UK GDPR

Ce DPA est entered dans entre le **responsable du traitement** (le Client operating un
Aegis instance) et le **sous-traitant** (le Aegis logiciel / vendor) et governs
traitement exécuté quand le Client utilise Aegis à processus personnel données.

---

## 1. Subject matter & duration

Le subject matter est le provision de le Aegis local données-cleansing Service.
Traitement se produit pour le duration de le engagement et pour aucun conservation période
requis par le responsable du traitement ou loi.

## 2. Nature, but & types de traitement

- **Nature/purpose:** local nettoyage, délégation d'empreintes, signature, vaulting et audit de
  Client-supplied documents/media.
- **Types de personnel données:** document contents, dérivé hashes/manifests,
  opérateur compte données, et audit métadonnées.
- **Catégories de données personnes concernées:** le responsable du traitement's staff (opérateurs), et aucun
  individuals appearing dans Client-supplied documents.
- **Special-category données:** aucun traité par le logiciel par conception; le
  responsable du traitement est responsable pour aucun special-category données il chooses à téléversement.

## 3. responsable du traitement obligations

Determine le purposes et means de traitement; ensure un lawful base; provide
uniquement données lawfully obtained; configure facultatif intégrations (e.g. TSA) dans ligne
avec transfert requirements.

## 4. sous-traitant obligations

1. **Confidentiality** — accès limité à ceux avec un besoin à know.
2. **sécurité** — implement appropriate technical/organisational mesure
   (chiffrement à reste, empreinte-chained audit, credential délégation d'empreintes, connexion throttling,
   aucun par défaut sortie).
3. **Sub-processing** — le logiciel a **aucun obligatoire sub-processors**; aucun
   facultatif externe TSA est Client-configured et Client-controlled.
4. **audit** — le sous-traitant maintains un détecteur de falsification, empreinte-chained audit journal le
   responsable du traitement peut export pour vérification (`/audit/export`).
5. **Violation notification (Art. 33/34)** — le sous-traitant shall notify le
   responsable du traitement **sans delay et dans aucun événement dans 24 hours** de becoming aware
   de un personal-données violation, permettant le responsable du traitement à meet son propre 72-heure
   supervisory-authority notification duty sous GDPR Art. 33.
6. **Deletion / retourner** — sur résiliation, le responsable du traitement's données resides dans son
   propre runtime volume et est retiré par le responsable du traitement's conservation politique; le
   sous-traitant's immutability control s.applique uniquement à le sécurité piste d'audit.
7. **Assistance** — le sous-traitant assists le responsable du traitement avec données-subject
   requêtes et Article 32–36 obligations à le étendue technically feasible.

## 5. International transferts

Aucun transferts occur par par défaut. Où le responsable du traitement permet un facultatif TSA, le
responsable du traitement est responsable pour un lawful transfert mécanisme (e.g. SCC) pour aucun
empreinte transmitted.

## 6. Enregistrements & preuve

Le Service fournit `GET /audit` et `GET /audit/export` pour le responsable du traitement's
enregistrements, et un `GET /healthz` sonde pour disponibilité surveillance.

## 7. Applicable loi

As agreed dans le principal commercial accord; ce modèle references le GDPR
as le base de référence.

---

## Annexe 1 — Technical & Organisational Mesure (Art. 32)

| Measure | Implémentation preuve (Aegis source) |
|---------|------------------------------------------|
| Chiffrement à reste | encrypted-archive coffre-fort (AES-GCM); TLS clé matériel dans `~/.aegis/tls` |
| Credential délégation d'empreintes | `server/store.js` — `crypto.scrypt` clé derivation (per-salt, N=16384) |
| Accès control | bearer-jeton opérateur auth avec TTL; operator/admin portée separation |
| Connexion throttling | `server.js` — par IP et par IP:username fixed-window débit limites + par IP enumeration garde |
| audit intégrité | empreinte-chained, détecteur de falsification `audit_events`; export via `/audit/export` |
| réseau minimisation | zéro par défaut sortie; vérifié par `npm run verify:zero-deps` |
| clé management | émetteur secret frappe session jetons; rotated par le responsable du traitement |

## Annexe 2 — Sub-processors (Art. 28(2))

Aucun obligatoire. Le uniquement facultatif externe intégration est un Client-configured
RFC3161 TSA (envoie un **empreinte uniquement**); le Client est le responsable du traitement de que
transfert et responsable pour le transfert mécanisme (e.g. SCC).

## Annexe 3 — Personal-données violation procédure (Art. 33/34)

1. Détecter & contenir (faire tourner émetteur secret; isolate le instance).
2. Notify le responsable du traitement **dans 24 hours**.
3. Assist le responsable du traitement's 72-heure supervisory-authority notification.
4. Post-incident revue; le détecteur de falsification audit journal est le forensic source.

## Annexe 4 — Deletion & retourner (Art. 28(3)(g))

Sur résiliation, le responsable du traitement's données resides dans son propre runtime volume et est
retiré par le responsable du traitement's conservation politique. Le sous-traitant's détecteur de falsification
piste d'audit est conservé pour responsabilité et est ne pas deleted.

## signature

| responsable du traitement | sous-traitant (Aegis) |
|-----------|-------------------|
| Nom / entity: {{CONTROLLER_Juridique_Nom}} | Nom / entity: Aegis (Jerome Young) |
| Authorised signatory: ______ | Authorised signatory: ______ |
| Date: ______________________ | Date: ______________________ |

> Note: applicable loi: {{Applicable_Loi}}; juridique confirmer avant signature.
