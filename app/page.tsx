import { Suspense } from "react";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

async function SlowChunk() {
  await new Promise((r) => setTimeout(r, 300));
  return <p id="slow">slow chunk loaded {"x".repeat(4000)}</p>;
}

export default function Page() {
  const stamp = new Date().toISOString();
  return (
    <main>
      <p id="stamp" data-stamp={stamp}>
        Server render: {stamp}
      </p>
      <p>{"filler-".repeat(3000)}</p>
      <Suspense fallback={<p>loading chunk…</p>}>
        <SlowChunk />
      </Suspense>
      <RefreshButton />
    </main>
  );
}
