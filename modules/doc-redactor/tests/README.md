# Tests

Dev-only verification scripts. The shipped application itself has **no dependencies**; these
scripts install nothing into the app and are never loaded by `index.html`.

## Prerequisites

```bash
cd tests
npm install --no-save playwright-core@1.55.0 pdf-lib@1.17.1
```

`playwright-core` drives an already-installed Chrome/Chromium. Resolution order:

1. `CHROME_PATH` environment variable, if set.
2. The first `chromium-*` build in the Playwright cache (`~/Library/Caches/ms-playwright`).
3. The installed `chrome` channel.

## Run

```bash
# terminal 1 — from the project root
python3 -m http.server 8010

# terminal 2 — from this folder
node generate-sample-pii.cjs
node e2e.cjs
```

Environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://127.0.0.1:8010/` | Where the app is served |
| `CHROME_PATH` | auto | Explicit browser executable |

Artifacts (`sample-pii.pdf`, the exported redacted PDF, `ui.png`) are written to
`tests/artifacts/` and are intentionally git-ignorable.

## What `e2e.cjs` asserts

1. Intake produces one page and OCR finishes (`status === 'done'`).
2. At least one sensitive detection exists.
3. The exported PDF has **zero** text items when re-parsed by pdf.js.
4. Every redaction centre renders as near-black (`RGB < 40` on all channels); the page margin
   stays white.
5. A deliberate probe to `https://example.com` is blocked and counted by the offline guard.
6. No console errors and no non-local network requests (all non-local requests are aborted by a
   route interceptor, simulating a disconnected network).

Exit code is `0` only when all assertions pass (`E2E_PASS`); failures print a reason list.
See `../TEST_REPORT.md` for the recorded results and methodology.
