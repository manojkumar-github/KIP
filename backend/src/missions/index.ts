import type { MissionPlan } from "./gpu-fleet";
import { buildGpuFleetPlan } from "./gpu-fleet";
import { buildRagIncidentPlan } from "./rag-incident";
import { buildGpuProvisionPlan } from "./gpu-provision";

export async function getMissionPlan(missionId: string): Promise<MissionPlan> {
  switch (missionId) {
    case "gpu-fleet":
      return buildGpuFleetPlan();
    case "rag-incident":
      return buildRagIncidentPlan();
    case "gpu-provision":
      return buildGpuProvisionPlan();
    default:
      throw new Error(`Unknown mission plan: ${missionId}`);
  }
}

export { MISSION_CATALOG, getMissionDefinition, resolveMissionFromPrompt } from "./catalog";
export type { MissionPlan, MissionStep } from "./gpu-fleet";
