<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/INCIDENT-RESPONSE.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Incident Réponse Runbook

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur
**But:** define comment le operating équipe détecte, contient, eradicates, recovers
de, et learns de security/privacy incidents, y compris le GDPR 72-heure
breach-notification duty.

---

## 1. Roles

| Rôle | Responsabilité |
|------|----------------|
| Incident Commander (IC) | possède le réponse, coordinates, decides severity |
| sécurité lead | technical containment & forensics |
| Comms / DPO | regulator, Client et interne communication |
| On-call opérateur | executes containment étapes sur le instance |

## 2. Severity classification

| SEV | Exemple | Réponse cible |
|-----|---------|-----------------|
| SEV1 | Confirmé violation de opérateur compte / émetteur secret fuite / données exfiltration | 1h acknowledge, 24h containment |
| SEV2 | Exploit attempted & bloqué, audit-integrity alarm | 4h acknowledge |
| SEV3 | Service degradation, échoué sauvegarde, /healthz red | 1 entreprise jour |
| SEV4 | Cosmetic / doc / low-risk | backlog |

## 3. Réponse phases

1. **Détecter / Triage** — alerts de `/healthz` surveillance, audit anomalies
   (`auth_login_throttled`, `auth_login_failed` spikes), ou externe rapport.
2. **Contenir** — faire tourner `AEGIS_ISSUER_SECRET`; disable/lock le implicated
   opérateur compte; isolate le instance (stop `node server.js` ou bloc port).
3. **Eradicate** — patch le vulnerable component; purge aucun injecté artefact;
   confirmer avec `verify:delivery` que le deployed build correspond un known-good manifest.
4. **Recover** — restaurer de le dernier known-good sauvegarde (`sqlite3 .backup` chain,
   voir `DR-BACKUP.md`); bring le service retour derrière surveillance.
5. **Post-mortem** — blameless write-up dans 5 entreprise jours; le **détecteur de falsification
   audit journal** (`/audit/export`) est le authoritative forensic source — il ne peut pas
   être erased (operator/system personnes concernées sont protected).

## 4. Violation notification (GDPR Art. 33/34)

- Assess whether un **personal-données violation** occurred dans **24h** de détection.
- Notify le competent **autorité de contrôle dans 72h** si requis.
- Notify **affected données personnes concernées** sans undue delay quand haut risque à eux.
- Le responsable du traitement (Client operating le instance) possède le notification; le
  sous-traitant (Aegis) assists par le DPA.

## 5. Comms

- Interne: incident canal + IC met à jour chaque 4h pendant Sev1/2.
- Externe: via DPO; jamais disclose forensic détail publicly.

## 6. Drills

- Quarterly tabletop; annuel direct restaurer drill (voir `DR-BACKUP.md`).
- Test le throttle/alarm chemin par délibérément tripping `auth_login_throttled`.
