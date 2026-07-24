import { getRunState, subscribeToRun } from "@/backend/src";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const existing = getRunState(runId);
  if (!existing) {
    return new Response(JSON.stringify({ error: `Unknown run: ${runId}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      unsubscribe = subscribeToRun(runId, (state) => {
        try {
          send({ type: "state", state });
          if (state.status === "complete" || state.status === "awaiting-approval") {
            // Keep connection open on awaiting-approval; close on complete after a tick
            if (state.status === "complete") {
              setTimeout(() => {
                try {
                  controller.close();
                } catch {
                  /* already closed */
                }
              }, 50);
            }
          }
        } catch {
          /* client disconnected */
        }
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* closed */
        }
      }, 15000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
