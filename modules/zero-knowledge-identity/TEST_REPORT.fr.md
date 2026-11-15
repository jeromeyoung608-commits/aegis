<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/zero-knowledge-identity/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Test Rapport — Zéro-connaissance Identité (module 01)

Engineering test enregistrement pour le identité module. Tout ci-dessous était exécuté
contre le livré source; aucun résultat est estimated.

---

## 1 · Verdict

| Area | Résultat |
| --- | --- |
| Headless unité suite (`node --test`) | **Résumi** — 26 / 26 assertions, 0 échecs |
| navigateur reception (rél Chromium, IndexedDB) | **Résumi** — identité restauré après un complet page recharger |
| signature preuve après recharger | **Résumi** — ECDSA signature vérifié contre le stocké public clé |
| Deliverable language | Anglais uniquement |

---

## 2 · Environnement

| Élément | Valeur |
| --- | --- |
| Runtime (unité tests) | Node.js 26.0.0, intégré `node:test` runner |
| Cryptographie Prestataire (unité tests) | `globalThis.crypto.subtle` dans Node — le même Web Cryptographie API le navigateur appels |
| navigateur (reception) | Chromium, servi au-dessus de `http://localhost` (secure contexte) |
| serveur | Zéro dépendance `server.js` à le dépôt racine |
| Dépendances installed | aucun |

Le unité suite délibérément utilise le platform's rél cryptographie implémentation. Mocking
Web Cryptographie serait uniquement prouver que le mocks accepter avec chaque autres.

---

## 3 · Comment à reproduce

```bash
# unit suite
cd modules/zero-knowledge-identity
node --test

# browser acceptance
cd ../..            # repository root
node server.js      # http://localhost:8080
# open /modules/zero-knowledge-identity/index.html
```

---

## 4 · Unité test matrix

### 4.1 `tests/crypto.test.mjs` — 12 test cas

| # | Assertion | Résultat |
| --- | --- | --- |
| 1 | Base64 round-trips chaque octet longueur de 0 à 64 | Résumi |
| 2 | Base64 rejette caractères outside son alphabet | Résumi |
| 3 | P-256 clé pair généré; SPKI export re-imports à le même empreinte | Résumi |
| 4 | Empreinte est stable, 64 hex caractères, grouped dans fours | Résumi |
| 5 | Two clé pairs jamais partager un empreinte | Résumi |
| 6 | Wrap → unwrap retourne un clé que signe verifiable données | Résumi |
| 7 | Emballé blob contient aucun PKCS#8 marker ou `BEGIN` string | Résumi |
| 8 | Faux phrase secrète rejette plutôt de returning un clé | Résumi |
| 9 | Bit-flipped texte chiffré est rejeté par AES-GCM | Résumi |
| 10 | Passphrases shorter que 8 caractères sont refused | Résumi |
| 11 | Le en clair PKCS#8 tampon est tous zeros une fois encapsulation retourne | Résumi |
| 12 | signature vérifie pour le signé octets, échoue pour différent octets | Résumi |

### 4.2 `tests/identity.test.mjs` — 8 test cas

| # | Assertion | Résultat |
| --- | --- | --- |
| 13 | Noms sont trimmed, collapsed et length-limited | Résumi |
| 14 | Émis enregistrement est scellé et porte aucun privé champs | Résumi |
| 15 | Enregistrement JSON contient neither `pkcs8` nor le phrase secrète | Résumi |
| 16 | `publicCard()` expose exactement le six public champs | Résumi |
| 17 | Problème → persist → recharger → déverrouiller → prouver possession | Résumi |
| 18 | Reloaded identité encore refuses un faux phrase secrète | Résumi |
| 19 | Two identities sur un appareil sont indépendant (clé, empreinte, texte chiffré) | Résumi |
| 20 | Exporté entreprise carte est public-only JSON | Résumi |
| 21 | `isSealed()` rejette enregistrements que fuite clé matériel | Résumi |

### 4.3 `tests/keystore.test.mjs` — 6 test cas

| # | Assertion | Résultat |
| --- | --- | --- |
| 22 | coffre-fort implémente obtenir / put / liste / retirer | Résumi |
| 23 | `put` overwrites par clé plutôt de appending | Résumi |
| 24 | Enregistrements sont cloned dans et hors (aucun partagé mutable état) | Résumi |
| 25 | Un coffre-fort peut être seeded de persistant enregistrements | Résumi |
| 26 | IndexedDB adaptateur refuses à pretend il works sans `indexedDB` | Résumi |
| 27 | Base de données et magasin noms sont stable | Résumi |

> Le runner rapports 26 test cas pour le 27 table rows ci-dessus: row 14 et row 15 sont
> asserted à l.íntérieur un test corps. Le pass/fail nombre comes de le runner, ne pas de
> ce table.

Mesuré exécuter:

```
tests 26
pass 26
fail 0
duration_ms 615
```

---

## 5 · navigateur reception exécuter

Exécuté dans un rél navigateur contre le en cours d.exécution serveur.

| Étape | Action | Observed |
| --- | --- | --- |
| 1 | Ouvert le module page | Page loads, title `AEGIS · Zero-Knowledge Identity`, zéro console erreurs |
| 2 | Entrer `Engineer-A`, phrase secrète twice, générer | Carte rend avec un `SHA256:` empreinte et un déterministe avatar |
| 3 | Déverrouiller avec le même phrase secrète | Possession preuve s.exécute; signature vérifie |
| 4 | Recharger le page | Carte retourne avec un identique empreinte |
| 5 | Reception panneau | `[PASS] identity restored on page load #2 — IndexedDB outlived the page (reload or new tab)` |
| 6 | Sign un test challenge | signature vérifié contre le stocké public clé |
| 7 | Ouvert le supprimer dialog | Styled in-page modal, ne pas un natif prompt; Supprimer reste désactivé jusqu.à `Engineer-A` est retyped |
| 8 | Press Cancel | Dialog ferme; identité untouched |

Le enregistrement est lire retour de IndexedDB, ne pas de mémoire: le recharger destroys le page
contexte, et le identity's nom, public clé et empreinte sont re-rendered de le
stocké object. Le charge compteur vit dans `localStorage`, donc closing le onglet et
reopening il également advances le nombre — le preuve est aucun plus long limité à un in-session
refresh.

### Reception preuve lignes

```
[PASS] Web Crypto: ECDSA P-256 available
[PASS] IndexedDB vault "aegis-identity" opened
[PASS] identity "Engineer-A" read from indexeddb
[PASS] private key sealed: AES-GCM-256, PBKDF2-SHA256 250k
[PASS] public key exported as SPKI Base64
[PASS] private key unreadable until the passphrase is supplied
[PASS] ECDSA signature over a fresh challenge verifies against the stored public key
[PASS] identity restored on page load #2 — IndexedDB outlived the page (reload or new tab)
```

---

## 6 · Défaut trouvé et corrigé pendant testing

**Symptom.** Le avatar identicon looked shifted par un cell et le hex-length assertion
échoué (`68 !== 64`) pendant le empreinte lui-même était correct.

**Provoquer.** `fingerprintDigits()` stripped chaque non-hex character de
`SHA256:9C4E …`. Le `A` dans le `SHA256` libellé est un valide hex digit, donc le libellé leaked
un extra character dans le identicon entrée, et le assertion counted il too.

**Correctif.** Strip le `SHA256:` prefix avant filtering caractères, dans
`src/crypto.js: fingerprintDigits()`. Le régression test maintenant assure le 64-character
longueur sur le données utiles uniquement.

**Pourquoi il mattered.** Un silencieusement shifted identicon encore "looks fine", lequel est exactement
le type de visuel défaut que undermines un fingerprint-comparison flux de travail.

### 6.1 Durcissement appliqué après revue

Quatre edge-case improvements étaient made après le premier reception exécuter. Chaque est couvert par
le suite ou re-verified dans le navigateur, ne pas merely asserted dans prose.

| Area | Modification | Vérification |
| --- | --- | --- |
| Null enregistrement | `onCopy` / `onExport` maintenant retourner un `No identity found.` message plutôt de throwing sur `state.record.publicKeySpki` | Garde est le premier statement dans les deux handlers |
| Natif `prompt()` | Replaced par un in-page `<dialog>`; le Supprimer bouton reste désactivé jusqu.à le opérateur retypes le identité nom | navigateur étape 7-8 ci-dessus |
| `sessionStorage` démarrage compteur | Déplacé à `localStorage`, avec `try/catch` around chaque accès donc un bloqué stockage API degrades plutôt de crashing | navigateur étape 5 (`page load #2`, survive un nouveau onglet) |
| PKCS#8 wiping | `fill(0)` déplacé dans un `finally` bloc donc le en clair tampon est zeroed même si derivation ou chiffrement lève | Unité test 11 inspects le exact tampon handed à AES-GCM après le appel retourne |

Le zeroing test est le notable un: il fait ne pas vérifier un comment, il captures le
`Uint8Array` résumi dans `subtle.encrypt` et assure chaque octet est `0` une fois
`wrapPrivateKey()` a resolved.

---

## 7 · Couverture et lacunes

**Couvert**

- clé génération, export, import, fingerprinting.
- phrase secrète derivation, encapsulation, unwrapping, wrong-phrase secrète et falsification rejet.
- Enregistrement shaping, scellage invariants, business-card export.
- Stockage adaptateur contrat, y compris le recharger chemin.
- Complet navigateur cycle avec rél IndexedDB.

**Ne pas couvert**

- **IndexedDB dans un rél navigateur sous adversarial stockage pressure.** Quota eviction,
  private-browsing restrictions et cross-tab upgrade blocking sont traité avec explicite
  erreurs mais ne pas automatiquement testé; ils besoin navigateur-level fault injection.
- **Timing side channels.** PBKDF2 et ECDSA timings sont ne pas mesuré. Le conception relies
  sur le platform's constant-time primitives plutôt que adding son propre mitigation.
- **Hardware-backed clé stockage.** Non-extractable plateforme clés (WebAuthn / passkeys)
  sont hors de portée pour ce module; le encapsulation format assumes un extractable P-256 clé.
- **Multi-device identité.** Là est aucun enrolment, pairing ou révocation flux, donc
  "même person sur two machines" est two indépendant seals par conception.

---

## 8 · Conclusion

Le module meets le indiqué reception criterion — un identité created dans le navigateur est
readable, unlockable et usable pour signatures après un complet page recharger — et le
cryptographique couche contient sous wrong-phrase secrète et tampering tests. Le restant lacunes
sont architectural (récupération, révocation, attestation) plutôt que implémentation défauts.
