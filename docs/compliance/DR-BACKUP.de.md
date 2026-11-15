<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DR-BACKUP.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Disaster Wiederherstellung & Sicherung

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine

Local-first durch Entwurf: alle Zustand lebt auf Kunde's eigen Lautstärke, so DR ist ein
matter von backing up und restoring Lautstärke. Dies Dokument specifies der
Verfahren und Wiederherstellung objectives.

---

## 1. Was zu zurück up

| Artefakt | Standard Ort | Notizen |
|----------|-----------------|-------|
| Laufzeit SQLite DB | `data/aegis.db` (oder `AEGIS_DB`) | Konten, Audit chain, Hinterlegung |
| TLS Schlüssel Material | `~/.aegis/tls/{key,cert}.pem` | nur wenn HTTPS aktiviert |
| OPFS Tresor Cache | `~/.aegis/opfs` | Browser-side verschlüsselt Tresor mirror |
| Konfiguration | `.env` / Umgebung | Aussteller Geheimnis, flags |

Der **Lieferung Build** (`dist/`) ist reproduzierbar von der source Paket und macht
nicht brauchen ein separat Sicherung über hinaus der source Archiv (`verify:delivery` beweist
Integrität).

## 2. Sicherung Methode (geprüft)

Aegis verwendet SQLite; ein online, konsistent Sicherung ist obtained mit:

```bash
sqlite3 "$AEGIS_DB" .backup 'backup/aegis-$(date +%F).db'
```

Dies war geprüft zu produce ein byte-consistent snapshot (65 536-Byte Seite Bild)
ohne stopping Server. Zeitplan es über cron/systemd (e.g. hourly oder daily).

Auch Kopie `~/.aegis/tls` und Konfiguration offline/offsitely.

## 3. Wiederherstellung objectives (defaults — bestätigen mit Bediener)

- **RPO (Wiederherstellung Punkt Ziel):** equal zu Sicherung interval
  (e.g. 1h wenn hourly, 24h wenn daily). Für tighter RPO, ausführen der `.backup` more
  frequently oder verwenden SQLite WAL shipping.
- **RTO (Wiederherstellung Zeit Ziel):** Zeit zu stand up ein sauber host + wiederherstellen der
  DB + restart — typically **< 1 Stunde** für ein single-node Bereitstellung.

## 4. Wiederherstellen Verfahren

1. Stop Service: `lsof -ti:$PORT | xargs kill -9` dann ensure kein veraltet Server.
2. Wiederherstellen DB: `sqlite3 "$AEGIS_DB" < backup/aegis-<date>.db`
   (oder Kopie der `.db` Datei über der live eine während Server ist stopped).
3. Wiederherstellen `~/.aegis/tls` und Konfiguration von der offline Kopie.
4. Start: `AEGIS_ISSUER_SECRET=… node server.js`.
5. Prüfen: `curl -s localhost:$PORT/healthz` → `{"ok":true,…}`; bestätigen
   `GET /audit` zeigt der historical Audit chain unversehrt.

## 5. Wiederherstellen drill (erforderlich, bei mindestens annually)

Perform Schritt 4 auf ein isoliert host mit ein recent Sicherung; bestätigen Audit chain
prüft und ein bekannt Bediener kann noch authenticate. Datensatz Ergebnis.

## 6. Redundancy Hinweis

Single-node lokal deployments haben **kein automatic failover**. Für HA, ausführen hinter
Kunde's eigen Last balancer mit ein shared/replicated DB Lautstärke; `/healthz`
ist der liveness Sonde für das balancer.
