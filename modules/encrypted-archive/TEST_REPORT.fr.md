<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Test Rapport · Local Chiffré coffre-fort (audit & Archive)

module: `modules/encrypted-archive`
Date: 2026-11-10
Runtime: Node 26 (intégré `node:test`, intégré Web Cryptographie), Chrome 141 sur macOS
Dépendances: aucun

---

## 1 · Verdict

**Résumi** — 23 / 23 headless assertions et le navigateur reception chemin.

| Couche | Résultat |
| --- | --- |
| Conteneur (sceau / ouvert / falsification) | 11 / 11 résumi |
| coffre-fort API (sceau / liste / ouvert / retirer) | 6 / 6 résumi |
| Stockage adapters (mémoire / OPFS garde / ID) | 6 / 6 résumi |
| navigateur: sceau de shell → recharger → re-list | Résumi |
| navigateur: autonome coffre-fort lit shell's OPFS enregistrement | Résumi |

---

## 2 · Comment à reproduce

```bash
cd modules/encrypted-archive
node --test
```

Mesuré tail:

```
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3299.02975
```

navigateur chemin:

```bash
# repository root
node server.js
# open http://localhost:8080/, then:
#   Test signed delivery → Verified → Archive to Vault → passphrase → Seal to vault
```

---

## 3 · Assertion matrix

### 3.1 `tests/container.test.mjs` — 11 assertions

| # | Assertion | Quoi il prouve |
| --- | --- | --- |
| 1 | scellé conteneur round-trips octets et métadonnées | lossless seal/open |
| 2 | public en-tête parses sans un phrase secrète | index peut show sizes pendant verrouillé |
| 3 | fichier octets et métadonnées sont absent de le conteneur | confidentiality de noms et contenu |
| 4 | faux phrase secrète → `Vault unlock failed` | distinct, actionable échec |
| 5 | un flipped texte chiffré octet → `integrity check failed` | empreinte pre-check works |
| 6 | falsifié empreinte + altéré octets → `unlock failed` | GCM balise est le rél frontière |
| 7 | cassé magic rejeté | malformed entrée échoue early |
| 8 | truncated conteneur rejeté | longueur validation |
| 9 | phrase secrète shorter que 8 caractères rejeté | politique enforced à le API |
| 10 | en clair staging tampon est zeroed quand scellage retourne | mémoire hygiene |
| 11 | (même test corps) zeroing couvre métadonnées + fichier octets | aucun partial wipe |

Assertion 10/11 sont two contrôles à l.íntérieur un `test()` corps; le runner comptes eux as un
test, hence 10 conteneur tests et 11 assertions à travers le fichier.

### 3.2 `tests/vault.test.mjs` — 6 tests

| # | Assertion | Quoi il prouve |
| --- | --- | --- |
| 1 | sceau → liste → ouvert aller-retour | produit API est coherent |
| 2 | listing hides fichier noms | le index est opaque |
| 3 | two seals obtenir distinct ID | aucun id collision dans practice |
| 4 | faux phrase secrète laisse le enregistrement intact | échoué déverrouiller est non-destructive |
| 5 | retirer deletes exactement un enregistrement | scoped deletion |
| 6 | vide fichier et taille cap sont refused | guardrails avec clair messages |

### 3.3 `tests/store.test.mjs` — 6 tests

| # | Assertion | Quoi il prouve |
| --- | --- | --- |
| 1 | mémoire adaptateur implémente put/get/list/remove/clear | interface completeness |
| 2 | lit retourner copies, ne pas partagé buffers | caller ne peut pas mutate stocké octets |
| 3 | `recordFileName` rejette `../`, absolute chemins, uppercase, vide | chemin traversal impossible |
| 4 | fichier noms carte retour à ID | listing reste cohérent |
| 5 | `opfsSupported()` est faux dans Node | fonctionnalité détection est honête |
| 6 | `openOpfsStore()` rejette dans Node | aucun silent fake persistance |

---

## 4 · navigateur reception

Environnement: Chrome 141, `http://localhost:8099/` (`node server.js` avec COOP/COEP).

| Étape | Action | Observed |
| --- | --- | --- |
| 1 | Clic **Test signé livraison** | `Verified · 2 signer(s) · SHA-256 6930443e3a3b…` |
| 2 | Vérification verdict reaches le shell | or **Archive à coffre-fort** bouton appears uniquement après un réussi verdict |
| 3 | Clic **Archive à coffre-fort** | natif `<dialog>` ouvre, affiche le artefact nom |
| 4 | Entrer `vault-pass-123`, press **Sceau à coffre-fort** | `Archived to the local vault: 5a8af386-add8-483b-9279-e1ca70f53e25 (52576 B payload → 53324 B sealed, AES-GCM-256).` |
| 5 | Inspect barre latérale | `1 sealed record · 52.1 KB ciphertext · opfs` |
| 6 | Recharger le commande centre | même ligne: `1 sealed record · 52.1 KB ciphertext · opfs` |
| 7 | Ouvert le autonome coffre-fort page | `1 record`, un `.row-item`, `OPFS · aegis-vault` |

Overhead pour que enregistrement: 53324 − 52576 = **748 octets**, couvrant le 8-octet magic,
version octet, 4-octet en-tête longueur, le JSON en-tête (sel, IV, empreinte, sizes) et le
16-octet GCM balise.

Negative contrôles que étaient ne pas acceptable dans le UI: le archive bouton est caché avant un
vérification, et un rejeté signature ensembles `signedState` à `Rejected: …` sans
offering le bouton.

---

## 5 · Défauts trouvé pendant le build

### 5.1 Blob transfert dans un caché iframe stalled

**Symptom.** Le premier intégration embedded le coffre-fort page dans un caché iframe et posted
`archive:store` avec le artefact Blob. Le dialog stayed sur `Sealing…` indefinitely; le
coffre-fort iframe logged aucun receipt, although son `archive:list` aller-retour worked.

**Diagnosis.** Control messages (strings uniquement) crossed le frontière; le enregistrement données utiles
fait ne pas. Plutôt que guess à structured-clone behaviour, le architecture était simplified:
le shell maintenant imports `createVault` et `openOpfsStore` directement. OPFS est per-origin, donc
le autonome page encore browses le même `/aegis-vault` répertoire. Ce retiré un
message hop, un cadre, et un classe de échec.

**Vérification.** Après le modification, le même clic chemin produit le archive journal sur le
premier attempt, et étape 7 de le navigateur table prouve les deux surfaces partager un coffre-fort.

### 5.2 Corrigé BroadcastChannel salle caused cross-tab interference

**Symptom.** Avec two command-center onglets ouvert, le récepteur sometimes ended dans
`signaling-error: Failed to execute 'setRemoteDescription'`. Un périmé onglet answered le même
room's offer.

**Correctif.** Les deux le signed-delivery page et le shell derive leur salle de un per-load
aléatoire suffix (`aegis-signed-delivery-<nonce>`, `aegis-demo-<nonce>`). Sessions aucun plus long
collide, et le démo est repeatable sans closing chaque autres onglet.

**Vérification.** Repeated s.exécute avec two onglets ouvert: signature, vérification et archiving
complet sans signalisation erreurs.

---

## 6 · sécurité notes vérifié par test

- En clair jamais laisse mémoire dans cleartext form sur disque: le conteneur texte contient aucun
  fichier nom, aucun données utiles substring et aucun métadonnées clés (assertion 3.1.3).
- Le dérivé KEK est non-extractable; le module jamais appels `exportKey` sur il.
- Chemin traversal est bloqué à le adaptateur frontière, ne pas par string replacement à le UI.
- Intégrité échecs sont signalé avant un phrase secrète est dérivé, donc un corrupted enregistrement
  costs aucun KDF work.
- Un faux phrase secrète ne peut pas destroy ou rewrite un enregistrement (3.2.4).

---

## 7 · Quoi est ne pas couvert

- Rél multi-megabyte PDF (le cap est 64 MB; tests utiliser small payloads).
- OPFS quota exhaustion et storage-eviction événements.
- Cross-navigateur OPFS behaviour (Firefox/Safari étaient ne pas partie de reception).
- Screenshot-level visuel régression de le coffre-fort page.
