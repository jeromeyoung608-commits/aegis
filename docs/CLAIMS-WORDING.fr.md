<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/CLAIMS-WORDING.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis — allégations formulation (normative)

**Statut**: normative formulation base de référence, 2026-11-13. S.applique à README, livraison
rapports, UI copie, comments et sales matériel. Technical behaviour est unchanged;
uniquement le mots utilisé à describe il sont corrigé.

Ce fichier existe parce que trois conditions étaient utilisé as marketing shorthand pour things
Aegis fait **ne pas** implement. Répertoire et module noms sont historical et sont
kept (renaming eux serait break imports et tests), mais ils doit jamais être lire
as cryptographique allégations.

## 1. Forbidden allégations et requis replacements

| Do ne pas dire | Pourquoi il est faux | Dire plutôt |
|---|---|---|
| `forward secrecy` | Un PBKDF2 session clé est reused pour chaque bloc. Un frais IV par bloc empêche IV reuse; il fait ne pas provide clé effacement ou compromise-resistance. | **per-chunk authenticated chiffrement avec un frais aléatoire IV** (ajouter "aucun forward secrecy" quand le menace modèle est discussed) |
| `blind signature` | Là est aucun blinding factor et aucun unblinding étape. Le signataire signe un empreinte ils peut voir. | **détaché empreinte signature** (ajouter "ne pas un cryptographique aveugle signature scheme") |
| `immutable` / `Immutable Audit Trail` | Un chaîne d'empreintes est détecteur de falsification, ne pas immutable: un opérateur avec écrire accès peut recompute le ensemble chain. Avec `hmacKey` ensemble il est HMAC-bound; sans il, en clair SHA-256 liens sont uniquement un détection aid. | **détecteur de falsification chaîne d'empreintes** (et état lequel mode est dans utiliser) |
| `Prove who signed it` | ECDSA vérifie possession de un clé, ne pas un juridique identité. Aucun CA, aucun KYC. | **vérifier intégrité contre un auto-déclaré signataire clé** (`trust: 'self-asserted'`) |
| `Role views are enforced` | Rôle switching est CSS-level presentation uniquement. | **rôle views modification le UI uniquement — ne pas un access-control frontière** |
| `zero-knowledge` | Le module wraps clés localement; il exécute aucun ZK preuve et a aucun serveur protocol. | **localement self-custodied clés** (répertoire nom `zero-knowledge-identity` est historical) |
| `Blind relay` (as un cryptographie allégation) | Le relais transmet texte chiffré il ne peut pas lire; que est transport blindness, ne pas un blind-signature scheme. | **serveur-blind texte chiffré relais** |

## 2. Formulation que reste (vérifié par audit)

- `destructive redaction` — byte-level vérification résumi; le exporté PDF a
  aucun recoverable texte couche.
- `server never sees plaintext` — le relais transmet texte chiffré uniquement.
- `100k+ nodes at 60fps` — mesuré 100k / 54–60fps.

## 3. Naming exception

`modules/detached-hash-signer`, `modules/blind-relay` et
`modules/zero-knowledge-identity` conserver leur répertoire noms pour compatibility.
Chaque user-facing document doit pair le nom avec le accurate terme ci-dessus et
doit ne pas describe le implémentation as forward-secret, blind-signature ou
zéro-connaissance cryptography.

## 4. Portée

Ces sont formulation corrections uniquement. Aucun API, export, fichier chemin, wire format,
cryptographie primitive ou access-control decision est changed par ce base de référence.
