import type { AgentId, MissionDefinition } from "../types";

export const MISSION_CATALOG: MissionDefinition[] = [
  {
    id: "gpu-fleet",
    title: "GPU Fleet Intelligence",
    prompt: "Show me unhealthy or underutilized GPUs across production.",
    category: "fleet",
    description: "Analyze GPU fleet health, utilization, and cost efficiency",
    agents: ["kubernetes", "gpu", "cost"],
    rationale:
      "Detected 4 GPUs with >90% memory pressure → 2 underutilized (<15%) → fragmentation on node gpu-7 → recommends rebalancing workloads.",
  },
  {
    id: "rag-incident",
    title: "Investigate RAG Failure",
    prompt: "Why is the RAG inference service failing?",
    category: "incident",
    description: "Correlate CUDA OOMs, KV-cache growth, and pod restarts",
    agents: ["kubernetes", "gpu", "runtime", "incident", "policy"],
    rationale:
      "Detected rising KV-cache allocation → correlated with replica imbalance → checked GPU headroom → recommends redistributing two replicas.",
  },
  {
    id: "gpu-provision",
    title: "Provision 70B Model Capacity",
    prompt: "Provision capacity for a 70B model with 2,000 concurrent users.",
    category: "capacity",
    description: "Create capacity plan and compare GPU configurations",
    agents: ["kubernetes", "gpu", "cost", "policy"],
    rationale:
      "Analyzed model requirements (140GB VRAM) → compared A100/H100/L40S configs → estimated $12.4K/mo for H100×4 → policy check passed.",
  },
];

export function getMissionDefinition(id: string): MissionDefinition | undefined {
  return MISSION_CATALOG.find((m) => m.id === id);
}

export function resolveMissionFromPrompt(prompt: string): MissionDefinition {
  const exact = MISSION_CATALOG.find((m) => m.prompt === prompt);
  if (exact) return exact;

  const lower = prompt.toLowerCase();
  if (lower.includes("gpu") && (lower.includes("unhealthy") || lower.includes("underutil"))) {
    return MISSION_CATALOG[0];
  }
  if (lower.includes("provision") || lower.includes("70b") || lower.includes("capacity")) {
    return MISSION_CATALOG[2];
  }
  if (lower.includes("rag") || lower.includes("fail") || lower.includes("incident")) {
    return MISSION_CATALOG[1];
  }
  return MISSION_CATALOG[1];
}

export const AGENT_NAMES: Record<AgentId, string> = {
  kubernetes: "Kubernetes Agent",
  gpu: "GPU Agent",
  runtime: "Runtime Agent",
  incident: "Incident Agent",
  cost: "Cost Agent",
  policy: "Policy Agent",
};
