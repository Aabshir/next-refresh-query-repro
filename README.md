# router.refresh() + streamed Flight payload repro

Minimal reproduction for the `router.refresh()` stale-commit defect in Next 16
(first filed as vercel/next.js#99026, auto-closed for a missing repro link;
re-filed with this repository).

## Reproduce

```bash
npm install
npm run build
npm start   # production build required; next dev does not exercise the cached path
```

The home page renders a `#stamp` timestamp (`force-dynamic`, so every server
render is fresh) and a button that POSTs a mutation and then calls
`router.refresh()`. The page deliberately streams: a ~12 KB filler block plus a
Suspense chunk that resolves after 300 ms, so the Flight response arrives in
multiple chunks.

1. Open `http://localhost:3000/` and click **Mutate + refresh** several times.
2. Open `http://localhost:3000/?status=draft` (any query string; the page does
   not read `searchParams`) and click **Mutate + refresh** several times.

Expected: the stamp updates on every click in both cases.

Actual: see the matrix — on most Next 16 versions the stamp never updates.
Browser network capture shows that after the mutation POST, **no `_rsc` fetch
is initiated at all** for the refresh; the router silently keeps/reapplies its
stale cached payload. In a real application the symptom is: the mutation
persists server-side, the UI shows pre-mutation data indefinitely, and only a
hard reload fixes it.

## Version matrix (this repo, production build, automated browser, 3–6 rounds each)

| Version | `/` (no query) | `/?status=draft` |
|---|---|---|
| 16.1.7 | ❌ stale | ❌ stale |
| **16.2.12** | ✅ fresh every time | ❌ stale every time |
| 16.3.5 | ❌ stale | ❌ stale |
| 16.3.6 (latest stable, re-tested 2026-09-22) | ❌ stale | ❌ stale |
| 16.4.0-canary.37 | ❌ stale | ❌ stale |
| 16.4.0-canary.38 (latest canary, re-tested 2026-09-22) | ❌ stale | ❌ stale |

16.2.12 is the only tested version where refresh works at all on this page, and
there the **query string alone** is the trigger: same page, same build, refresh
works on `/` and never works on `/?status=draft`.

## Notes

- **Streaming is load-bearing.** If you shrink the page (remove the filler
  `{"filler-".repeat(3000)}` and shorten the Suspense chunk so the Flight
  response is small/fast), the same build starts passing even with a query
  string. The defect appears tied to the refresh committing (or failing to
  commit) while the response is still streaming.
- PR #94144 ("Incorrect search params stored in cache", shipped in
  16.3.0-canary.31+) is present in 16.3.5 / 16.4.0-canary.37 and does not fix
  this. Possibly related to the still-open #92152 family (segment-cache keying
  on rendered search vs canonical URL).
- `experimental.staleTimes` makes no difference (tested with
  `{dynamic: 0, static: 30}` and with no config at all).
- `app/loading.tsx` present or absent makes no difference.
- Reproduces whether the query-string URL is reached by a fresh page load or by
  a client-side `router.push`.
- In a large real-world app (~144 routes, Next 16.2.12) the same symptom shows
  up intermittently (~50%) on list pages whose URL carries filter query params
  (`?status=draft`, `?q=…`): mutate → `router.refresh()` → UI keeps showing the
  pre-mutation rows until a hard reload. Plain-path pages in the same app are
  reliable.

## Next: serving-path matrix (planned)

A second production report on
[vercel/next.js#99028](https://github.com/vercel/next.js/issues/99028)
(2026-09-24) shows the same commit passing 12/12 when deployed to Vercel but
failing deterministically under self-hosted `next start`. That split points at
the self-hosted serving path, so the next matrix for this repo adds a
serving-path dimension:

| Cell | Serving setup |
|---|---|
| A | bare `next start` (current matrix) |
| B | `next start` behind nginx, `proxy_buffering on` |
| C | `next start` behind nginx, `proxy_buffering off` |

The second report also documents a related variant where the refresh `_rsc`
request **does** fire and returns a fresh payload, but the current page never
commits it (a soft navigation away and back then shows the new data). Both
variants end the same way — the router holds a fresh tree the current page
never renders — which suggests the commit step, not the fetch, is where the
two reports converge.
