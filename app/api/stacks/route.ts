import { NextResponse } from "next/server";
import { listStacks } from "@/backend/src";

export const runtime = "nodejs";

export async function GET() {
  const stacks = listStacks().map((s) => ({
    id: s.metadata.name,
    displayName: s.spec.displayName,
    providers: Object.fromEntries(
      Object.entries(s.spec.providers).map(([k, v]) => [k, v.type])
    ),
  }));
  return NextResponse.json({ stacks });
}
