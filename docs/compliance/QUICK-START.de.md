<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `docs/compliance/QUICK-START.md`
> Übersetzung zur besseren Lesbarkeit. Bei Abweichungen gilt der englische Text.

# Schnellstart

## 1. Installation und Einrichtung

```
git clone <ihre-registry>/aegis && cd aegis
npm run setup          # fragt ein Betreiberkonto ab; Standardpasswort = AEGIS_ISSUER_SECRET
npm start              # liefert http://localhost:8080
```

`http://localhost:8080` in **Chrome oder Edge 113+** öffnen (SharedArrayBuffer
für die WebGPU-Topologie setzt COOP/COEP voraus, die Aegis setzt).

## 2. Arbeitsfläche — der geschlossene Kreislauf in sieben Stufen

1. Quellknoten in der Topologie auswählen. 2. Dokument laden. 3. Schwärzen.
4. Signieren (Hash + Signatur). 5. Senden. 6. Empfangen. 7. Prüfen → versiegeln.
Der Kreislauf kann nicht rückwärts laufen; diese Invariante ist durch
`aegis-shell/tests/flow.test.mjs` abgesichert.

## 3. Betreiberkonsole — `aegis-shell/console.html`

Als Betreiber anmelden, dann die Registerkarten nutzen:

- **Audit** — fortlaufender Audit-Trail (Export als CSV/JSON).
- **Widerruf** — Verwaltung der Sperrliste.
- **Key Escrow** — Break-Glass-Hinterlegung und Abruf.
- **TSA-Prüfung** — Verifikation von RFC-3161-Zeitstempeln.
- **Compliance** — tatsächliche Rechtsangaben eintragen (Verantwortlicher, DSB,
  EU-Vertreter, SLA, anwendbares Recht, Behörde) und unterzeichnete
  ROPA/ADV/SLA/DSB-Bestellung/Logo hochladen; ausgefüllte Vorlagen erzeugen.
- **Setup** — Checkliste vor der Bereitstellung (Freigabe exportieren).
- **Betroffene** — DSAR-Export (Art. 20), Löschung (Art. 17), Tombstone-Prüfung.
- **Sitzungen** — Betreiber-Sitzungen anzeigen und widerrufen.
- **Konfiguration** — schreibgeschützte Konfigurationsanzeige und sichere
  Schalter (Escrow, MFA-Zwang), SIEM-Weiterleitungs-URL, Incident-Test,
  MFA-Reset für Administratoren, Datenbanksicherung.

## 4. Checkliste vor der Bereitstellung

`docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` durcharbeiten (auch als Setup-Tab
in der Konsole). `AEGIS_ISSUER_SECRET` je Umgebung eindeutig setzen, das Image in
**die eigene** Registry pushen, TLS über einen Reverse-Proxy aktivieren und die
Compliance-Angaben vervollständigen.

## 5. Produktivbetrieb

Siehe `deploy/` (docker-compose, Kubernetes/Helm, systemd, nginx/Caddy) und
`docs/compliance/ACR-PRIVATE-REGISTRY.md`. Geheimnisse niemals ins Image
einbacken.
