import type { MissionDefinition, MissionState } from "../types";
import type { ResolvedStack } from "../capabilities";
import type { RemediationAction } from "../capabilities/remediation";
import { createInitialAgents } from "./state-helpers";
import { getMissionPlan } from "../missions";
import { getRunStore } from "./run-store";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createInitialMissionState(
  mission: MissionDefinition
): MissionState {
  return {
    id: mission.id,
    status: "idle",
    agents: createInitialAgents(mission.agents),
    timeline: [],
    toolCalls: [],
    evidence: [],
    cards: [],
    confidence: 0,
  };
}

function extractPendingAction(state: MissionState): RemediationAction | undefined {
  const approval = [...state.cards]
    .reverse()
    .find((c) => c.type === "approval");
  if (!approval) return undefined;
  const d = approval.data;
  return {
    action: String(d.action ?? ""),
    from: d.from as string | undefined,
    to: d.to as string | undefined,
    namespace: d.namespace as string | undefined,
    nodePool: d.nodePool as string | undefined,
    expectedImprovement: d.expectedImprovement as string | undefined,
    risk: d.risk as string | undefined,
    cost: d.cost as string | undefined,
    requiresApproval: Boolean(d.requiresApproval),
  };
}

/**
 * MissionOrchestrator — runs capability-driven mission plans and streams
 * MissionState snapshots through the run store (SSE consumers).
 */
export class MissionOrchestrator {
  async start(params: {
    runId: string;
    mission: MissionDefinition;
    stack: ResolvedStack;
  }): Promise<void> {
    const store = getRunStore();
    const plan = await getMissionPlan(params.mission.id);
    let state = createInitialMissionState(params.mission);
    state = { ...state, status: "running" };
    store.updateState(params.runId, state);

    for (const step of plan.steps) {
      const run = store.get(params.runId);
      if (!run || run.abort) return;

      await sleep(step.delay);
      state = await step.run({
        state,
        stack: params.stack,
        mission: params.mission,
      });
      store.updateState(params.runId, { ...state });

      if (state.status === "awaiting-approval") {
        store.setPendingAction(params.runId, extractPendingAction(state));
        return;
      }
    }

    if (state.status !== "awaiting-approval" && state.status !== "complete") {
      state = { ...state, status: "complete" };
      store.updateState(params.runId, state);
    }
  }

  async approve(runId: string, stack: ResolvedStack): Promise<MissionState> {
    const store = getRunStore();
    const run = store.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);

    const action = run.pendingAction ?? {
      action: "Approved remediation",
    };
    const result = await stack.remediation.apply(action);
    const state: MissionState = {
      ...run.state,
      status: "complete",
      timeline: [
        ...run.state.timeline,
        {
          id: `tl-${run.state.timeline.length + 1}`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          agentId: "policy",
          message: result.message,
          type: "recommendation",
        },
      ],
    };
    store.updateState(runId, state);
    store.setPendingAction(runId, undefined);
    return state;
  }

  async reject(runId: string, stack: ResolvedStack): Promise<MissionState> {
    const store = getRunStore();
    const run = store.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);

    const action = run.pendingAction ?? { action: "Rejected remediation" };
    const result = await stack.remediation.reject(action);
    const state: MissionState = {
      ...run.state,
      status: "complete",
      timeline: [
        ...run.state.timeline,
        {
          id: `tl-${run.state.timeline.length + 1}`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          agentId: "policy",
          message: result.message,
          type: "observation",
        },
      ],
    };
    store.updateState(runId, state);
    store.setPendingAction(runId, undefined);
    return state;
  }
}

export function getOrchestrator(): MissionOrchestrator {
  return new MissionOrchestrator();
}
