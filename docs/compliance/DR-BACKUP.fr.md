<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DR-BACKUP.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Disaster Récupération & Sauvegarde

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur

Local-first par conception: tous état vit sur le Client's propre volume, donc DR est un
matter de backing up et restoring que volume. Ce document specifies le
procédure et le récupération objectives.

---

## 1. Quoi à retour up

| Artefact | Par défaut emplacement | Notes |
|----------|-----------------|-------|
| Runtime SQLite DB | `data/aegis.db` (ou `AEGIS_DB`) | comptes, audit chain, séquestre |
| TLS clé matériel | `~/.aegis/tls/{key,cert}.pem` | uniquement si HTTPS activé |
| OPFS coffre-fort cache | `~/.aegis/opfs` | navigateur-side chiffré coffre-fort mirror |
| Configuration | `.env` / environnement | émetteur secret, flags |

Le **livraison build** (`dist/`) est reproductible de le source paquet et fait
ne pas besoin un séparé sauvegarde au-delà le source archive (`verify:delivery` prouve
intégrité).

## 2. Sauvegarde méthode (vérifié)

Aegis utilise SQLite; un en ligne, cohérent sauvegarde est obtained avec:

```bash
sqlite3 "$AEGIS_DB" .backup 'backup/aegis-$(date +%F).db'
```

Ce était vérifié à produce un byte-consistent snapshot (65 536-octet page image)
sans stopping le serveur. Décal il via cron/systemd (e.g. hourly ou daily).

Également copie `~/.aegis/tls` et le configuration offline/offsitely.

## 3. Récupération objectives (defaults — confirmer avec opérateur)

- **RPO (Récupération Point Objectif):** equal à le sauvegarde interval
  (e.g. 1h si hourly, 24h si daily). Pour tighter RPO, exécuter le `.backup` more
  frequently ou utiliser SQLite WAL shipping.
- **RTO (Récupération Temps Objectif):** temps à stand up un propre host + restaurer le
  DB + restart — typically **< 1 heure** pour un single-node déploiement.

## 4. Restaurer procédure

1. Stop le service: `lsof -ti:$PORT | xargs kill -9` alors ensure aucun périmé serveur.
2. Restaurer le DB: `sqlite3 "$AEGIS_DB" < backup/aegis-<date>.db`
   (ou copie le `.db` fichier au-dessus de le direct un pendant le serveur est stopped).
3. Restaurer `~/.aegis/tls` et configuration de le hors ligne copie.
4. Démarrage: `AEGIS_ISSUER_SECRET=… node server.js`.
5. Vérifier: `curl -s localhost:$PORT/healthz` → `{"ok":true,…}`; confirmer
   `GET /audit` affiche le historical audit chain intact.

## 5. Restaurer drill (requis, à au moins annually)

Perform étape 4 sur un isolé host avec un recent sauvegarde; confirmer le audit chain
vérifie et un connu opérateur peut encore authenticate. Enregistrement le résultat.

## 6. Redundancy note

Single-node local deployments avoir **aucun automatic failover**. Pour HA, exécuter derrière
le Client's propre charge balancer avec un shared/replicated DB volume; `/healthz`
est le liveness sonde pour que balancer.
