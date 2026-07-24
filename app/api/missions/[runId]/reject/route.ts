import { NextResponse } from "next/server";
import { rejectRun } from "@/backend/src";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const state = await rejectRun(runId);
    return NextResponse.json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reject failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
