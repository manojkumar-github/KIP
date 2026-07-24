import { registerBuiltinProviders } from "./providers/register-builtins";
import { getProviderRegistry } from "./core/registry";
import { getStackManifest, loadAllStackManifests } from "./stack/loader";
import { getMissionDefinition, MISSION_CATALOG, resolveMissionFromPrompt } from "./missions";
import { getOrchestrator, createInitialMissionState } from "./core/orchestrator";
import { getRunStore } from "./core/run-store";
import type { MissionState, StackManifest } from "./types";
import type { ResolvedStack } from "./capabilities";

let bootstrapped = false;

export function bootstrapBackend(): void {
  const g = globalThis as unknown as { __kip_bootstrapped__?: boolean };
  if (g.__kip_bootstrapped__ || bootstrapped) {
    bootstrapped = true;
    g.__kip_bootstrapped__ = true;
    // Ensure providers exist after HMR
    registerBuiltinProviders();
    return;
  }
  registerBuiltinProviders();
  bootstrapped = true;
  g.__kip_bootstrapped__ = true;
}

export function listStacks(): StackManifest[] {
  bootstrapBackend();
  return loadAllStackManifests();
}

export function listMissions() {
  return MISSION_CATALOG;
}

export function resolveStack(stackId: string): ResolvedStack {
  bootstrapBackend();
  const manifest = getStackManifest(stackId);
  if (!manifest) {
    throw new Error(`Unknown stack: ${stackId}`);
  }
  return getProviderRegistry().resolve(manifest);
}

export function startMissionRun(input: {
  missionId?: string;
  prompt?: string;
  stackId: string;
}): { runId: string; missionId: string; stackId: string } {
  bootstrapBackend();
  const mission = input.missionId
    ? getMissionDefinition(input.missionId)
    : input.prompt
      ? resolveMissionFromPrompt(input.prompt)
      : undefined;

  if (!mission) {
    throw new Error("missionId or prompt is required");
  }

  const stack = resolveStack(input.stackId);
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const initial = createInitialMissionState(mission);

  getRunStore().create({
    runId,
    stackId: input.stackId,
    missionId: mission.id,
    state: initial,
  });

  // Fire-and-forget orchestration
  void getOrchestrator().start({ runId, mission, stack });

  return { runId, missionId: mission.id, stackId: input.stackId };
}

export function getRunState(runId: string): MissionState | undefined {
  return getRunStore().get(runId)?.state;
}

export function subscribeToRun(
  runId: string,
  listener: (state: MissionState) => void
): () => void {
  return getRunStore().subscribe(runId, listener);
}

export async function approveRun(runId: string): Promise<MissionState> {
  bootstrapBackend();
  const run = getRunStore().get(runId);
  if (!run) throw new Error(`Unknown run: ${runId}`);
  const stack = resolveStack(run.stackId);
  return getOrchestrator().approve(runId, stack);
}

export async function rejectRun(runId: string): Promise<MissionState> {
  bootstrapBackend();
  const run = getRunStore().get(runId);
  if (!run) throw new Error(`Unknown run: ${runId}`);
  const stack = resolveStack(run.stackId);
  return getOrchestrator().reject(runId, stack);
}

export type { MissionState, StackManifest, ResolvedStack };
export { getProviderRegistry } from "./core/registry";
export { registerBuiltinProviders } from "./providers/register-builtins";
