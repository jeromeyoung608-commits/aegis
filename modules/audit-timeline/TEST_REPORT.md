# Test Report - Tamper-Evident Audit Trail

## 1. Summary

| Item | Result |
| --- | --- |
| Suite | `modules/audit-timeline/tests/trail.test.mjs` |
| Command | `npm test` (`node --test`) |
| Tests | 15 |
| Passed | 15 |
| Failed | 0 |
| Duration | 184 ms |
| Dependencies | None (Node built-ins only) |
| Browser acceptance | Passed on the command center and the standalone review page |

Environment: macOS 15.6.1, Node v26.0.0, Chromium-based browser session.

---

## 2. Headless results

```
> @aegis/audit-timeline@1.0.0 test
> node --test

ok 1  appends links in order and chains each hash to the previous one
ok 2  concurrent appends are serialized into one unbroken chain
ok 3  canonical serialization makes key order irrelevant to the link hash
ok 4  verify reports the first edited link
ok 5  verify reports reordered links
ok 6  a link hash covers actor, event, detail and fingerprint
ok 7  persists a chain and restores it intact
ok 8  restores a tampered persisted chain in a broken state
ok 9  a corrupt stored log is reported instead of silently ignored
ok 10 rejects an unknown schema
ok 11 reset returns the trail to a fresh genesis state
ok 12 appends after load continue the restored chain
ok 13 append requires an actor and an event name
ok 14 snapshot is a content-free, exportable structure
ok 15 clock and digest formatting stay compact

tests 15 | pass 15 | fail 0
```

### Coverage matrix

| Requirement | Test |
| --- | --- |
| Every link binds to the previous hash | 1 |
| First link binds to the 64-zero genesis | 1 |
| Concurrent UI events cannot fork the chain | 2 |
| Deterministic payload serialization | 3 |
| Editing an entry is detected at the right index | 4 |
| Reordering entries is detected | 5 |
| Actor / event / detail / fingerprint all affect the hash | 6 |
| Reload restores the same head and intact verdict | 7 |
| A tampered stored chain loads as `brokenAt = 1`, not as valid | 8 |
| Corrupt JSON is surfaced, never silently ignored | 9 |
| Unknown schema versions are rejected | 10 |
| Clear removes persisted state and resets genesis | 11 |
| New events continue a restored chain | 12 |
| Empty actor or event is rejected | 13 |
| Export snapshot carries schema, genesis, head and links | 14 |
| `HH:MM:SS` and short-hash formatting | 15 |

---

## 3. Browser acceptance

### 3.1 Standalone review page (empty state)

Opened `/modules/audit-timeline/index.html` with no stored trail.

- Heading `Who did what, and when.` rendered.
- Status badge: `chain empty - append-only log ready`.
- Empty-state sentence: `No audit events yet. Open the workbench and run a document through the closed loop.`
- Console contained only the Aegis signature line; no page-level errors.

### 3.2 Command center run

Opened `/aegis-shell/index.html`, waited for the workbench, then clicked
**Test signed delivery**.

Observed:

- `Verified - 2 signer(s) - SHA-256 72fe7dbd7fdc...`
- **Archive to Vault** button became visible only after the verdict.
- Audit Trail entries:
  - `[HH:MM:SS] Engineer-A - ECDSA signature generated` with
    `Fingerprint 677A18AB552A` and a SHA-256 prefix.
  - `[HH:MM:SS] Boss-B - Verification passed` with `2/2 signatures valid`.
- Status badge: `chain intact - 2 links - head 7C866913...`.

### 3.3 Reload and cross-page persistence

- Reloaded the command center: the same `2 links` and head `7C866913...` were restored,
  still `chain intact`.
- Opened the standalone review page in a second tab: the same two entries and
  `chain intact - 2 links` were displayed, confirming both surfaces read one chain.
- Ran the signed-delivery demo once more in the command center: the status became
  `chain intact - 4 links - head 1F9AB3E9...`, and the new signing entry carried
  `Fingerprint 00022595F310`. This also exercises the serialized append queue: two
  links were added to the restored chain without forking it.

---

## 4. Defects found and resolved

### 4.1 Signing and verification collapsed into one timestamp

**Symptom:** the first implementation derived the `ECDSA signature generated` link from
the final verification message. Both links appeared in the same rendering pass, so the
timeline could not show signing before delivery and verification after it.

**Fix:** the signed-delivery module now posts a `signed:sealed` message immediately after
building the signature trailer, before the artifact is transferred. The shell listens for
it and appends the signing link at the real moment; `signed:verified` appends the verdict
later.

### 4.2 Verdict payload had no fingerprints

**Symptom:** `verifyArtifact()` returns `{ id, ok }` per signer, which is enough for the
archive gate but not for a timeline that must show `Fingerprint: 9C4E...`.

**Fix:** the signed-delivery module computes both SPKI SHA-256 fingerprints once at boot,
stores them, and includes them in `signed:sealed`. Fingerprints are uppercased so the
iframe readout and the timeline agree.

### 4.3 A corrupted log could look like an empty log

**Symptom:** invalid JSON in `localStorage` produced an empty timeline, which is
indistinguishable from a fresh install.

**Fix:** `AuditTrail.load()` records `loadError` and sets `brokenAt = 0`; the status badge
shows the storage error, and the timeline keeps the failure visible.

---

## 5. Gaps and honest limits

- The suite tests the chain, not the DOM. Timeline rendering is verified in a real
  browser (section 3), not with a headless DOM library.
- Browser acceptance was performed on a Chromium-based browser. Firefox and Safari were
  not exercised.
- `localStorage` is last-writer-wins. Concurrent command-center tabs can diverge; each
  in-memory chain remains valid, but only one persisted branch survives.
- The chain is locally tamper-evident, not remotely attested. Replacing the entire stored
  chain with a different internally valid chain is outside the threat model until the
  head hash is anchored in a signed artifact or an external timestamp service.
- Timestamps come from the local clock and order events; they are not a trusted time
  source.

---

## 6. Reproduce

```bash
cd modules/audit-timeline
npm test

# browser
cd ../..
node server.js
# command center:   http://localhost:8080/aegis-shell/index.html
# review page:      http://localhost:8080/modules/audit-timeline/index.html
```
