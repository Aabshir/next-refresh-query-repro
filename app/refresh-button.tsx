"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Simulates a real mutate-then-refresh flow: POST a mutation, then
// router.refresh() so the server-rendered UI reflects the change.
export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState(0);
  return (
    <button
      id="refresh-btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/mutate", { method: "POST" });
          router.refresh();
          setN((x) => x + 1);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? `Working… (${n})` : `Mutate + refresh (${n})`}
    </button>
  );
}
