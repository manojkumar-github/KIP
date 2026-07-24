import type { MissionState } from "../types";
import type { RemediationAction } from "../capabilities/remediation";

export type RunListener = (state: MissionState) => void;

export interface MissionRun {
  runId: string;
  stackId: string;
  missionId: string;
  state: MissionState;
  pendingAction?: RemediationAction;
  listeners: Set<RunListener>;
  abort: boolean;
}

/**
 * In-memory run store for v1. Replace with Redis/DB for multi-instance deploys.
 */
class RunStore {
  private runs = new Map<string, MissionRun>();

  create(run: Omit<MissionRun, "listeners" | "abort">): MissionRun {
    const full: MissionRun = {
      ...run,
      listeners: new Set(),
      abort: false,
    };
    this.runs.set(run.runId, full);
    return full;
  }

  get(runId: string): MissionRun | undefined {
    return this.runs.get(runId);
  }

  updateState(runId: string, state: MissionState): void {
    const run = this.runs.get(runId);
    if (!run) return;
    run.state = state;
    for (const listener of run.listeners) {
      listener(state);
    }
  }

  subscribe(runId: string, listener: RunListener): () => void {
    const run = this.runs.get(runId);
    if (!run) return () => undefined;
    run.listeners.add(listener);
    listener(run.state);
    return () => {
      run.listeners.delete(listener);
    };
  }

  setPendingAction(runId: string, action: RemediationAction | undefined): void {
    const run = this.runs.get(runId);
    if (run) run.pendingAction = action;
  }
}

const globalKey = "__kip_run_store__";

export function getRunStore(): RunStore {
  const g = globalThis as unknown as Record<string, RunStore | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = new RunStore();
  }
  return g[globalKey]!;
}
