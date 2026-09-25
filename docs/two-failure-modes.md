# Two failure modes observed

Field notes from the two production reports on
[vercel/next.js#99028](https://github.com/vercel/next.js/issues/99028).
Both reports describe the same user-visible symptom — a mutation persists
server-side, `router.refresh()` is called, and the current page keeps showing
pre-mutation data until a hard reload — but the network traces differ.

## Mode 1: the refresh is never requested

Observed in this repository's captures. After the mutation POST returns,
**no `_rsc` request is initiated at all** for the refresh. The router silently
keeps or reapplies its stale cached payload.

## Mode 2: the payload arrives but is never committed

Observed in the second production report (App Router, next-intl, Supabase,
~40 routes). The refresh `_rsc` request **does** fire and returns a **fresh**
payload — the new rows' database ids are visible inside the page's
client-component props — yet the current page never re-renders. A soft
navigation away and back (no reload) then shows the new data, so the router
cache holds the fresh tree; the current page simply never commits it.

## Where the modes converge

Both modes end with the router holding a fresh tree that the current page
never renders. Whether the fetch happens or not, the commit step is the common
failure point.

## Shared conditions

- `next start` only; `next dev` never reproduces either mode.
- Streaming responses are load-bearing in this repo's repro (shrinking the
  page makes the defect disappear).
- Query-string URLs are the clearest trigger in both reports, though the
  second report also sees Mode 2 on plain-path pages.
- The same commit deployed to Vercel passed 12/12 in the second report, while
  self-hosted `next start` failed deterministically — suggesting the
  self-hosted serving path (buffering/flushing) interacts with the defect.
- Timing sensitivity cuts both ways: 16.3.x made things worse for this repo's
  plain-path case and better for the second report's app — consistent with a
  race rather than a deterministic logic bug.
