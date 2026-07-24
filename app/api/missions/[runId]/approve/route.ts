import { NextResponse } from "next/server";
import { approveRun } from "@/backend/src";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const state = await approveRun(runId);
    return NextResponse.json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approve failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
