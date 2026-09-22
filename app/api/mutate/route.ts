import { NextResponse } from "next/server";

export async function POST() {
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json({ ok: true });
}
