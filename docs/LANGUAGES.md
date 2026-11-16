# Languages

**Documentation is English only.** Every `.md` file, every code comment, every
identifier, `LICENSE` and `NOTICE` is written in English and nothing else. No
translated documentation is maintained — not German, not French, not Spanish.

**The product interface ships in English and German.** `aegis-shell/src/i18n.js`
holds exactly two catalogs (`en`, `de`) with the same key set, and a phrase
catalogue (`PHRASE_CATALOG`) that maps every visible English string of both
shell pages to German. Both the console and the workbench carry an `EN` / `DE`
selector, they share one saved choice (`localStorage.aegis_locale`), and the
locale defaults to English when neither a saved choice nor a matching browser
language is available.

The phrase catalogue exists because the key catalogue alone covered only the
console chrome: on 2026-11-16 switching to DE translated the header and left the
tabs, panel headings, buttons and hints in English. Text nodes and the
`placeholder` / `title` / `aria-label` / `alt` attributes are now translated by
their English source string, content rendered after boot is caught by a
`MutationObserver`, and switching back to EN restores the original bytes.

The split is deliberate:

- Documentation is read by engineers, integrators and auditors. A machine-generated
  translation is worse than the English original, and a stale translation is a
  liability — it claims things the software no longer does.
- The interface is read by the operator at the console, in the language they work
  in. Two catalogs, both maintained, both tested.

## Enforcement

`scripts/verify-translations.mjs` (wired into `npm test` as the `translations`
step) fails the build when:

- any `*.de.md`, `*.fr.md` or `*.es.md` file exists anywhere in the tree;
- `aegis-shell/src/i18n.js` carries any catalog other than `en` and `de`;
- either shell's language selector offers anything other than `EN` and `DE`;
- any visible string in `console.html` or `index.html` has no German entry in
  `PHRASE_CATALOG` (`aegis-shell/src/i18n-coverage.test.js`).

`scripts/verify-english.mjs` separately enforces English-only prose in every
`.md` file outside the i18n catalogs, which also rejects any German text that
creeps into a document.

## History

2026-11-16: the interface turned out to be only half bilingual — 54 of ~180
console strings were wired through `[data-i18n]` and the workbench had no
selector at all. The phrase catalogue, the DOM translator and the coverage gate
were added, and the workbench got its own `EN` / `DE` selector.

2026-11-15: the four-language documentation set (246 machine-generated `.de/.fr/.es`
files) was deleted, and a hand-written German set of 16 documents was briefly
maintained and then also removed. Documentation is single-language English since
that date; the interface keeps its two catalogs. The commits are
`85d5dfb`, `0cac7d1` and the one that removed the German documents.
