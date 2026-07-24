import { NextResponse } from "next/server";
import { listMissions, startMissionRun } from "@/backend/src";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ missions: listMissions() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      missionId?: string;
      prompt?: string;
      stackId?: string;
    };

    const stackId = body.stackId ?? "demo-prod-gpu-west-2";
    const result = startMissionRun({
      missionId: body.missionId,
      prompt: body.prompt,
      stackId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start mission";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
