import {
  updateAgent,
  addTimeline,
  addToolCall,
  addEvidence,
  addCard,
  nowTimestamp,
} from "../core/state-helpers";
import type { MissionPlan } from "./gpu-fleet";

export async function buildGpuProvisionPlan(): Promise<MissionPlan> {
  return {
    id: "gpu-provision",
    steps: [
      {
        delay: 400,
        run: async ({ state }) => ({
          ...state,
          status: "running",
          agents: updateAgent(state.agents, "kubernetes", {
            status: "running",
            progress: 30,
            currentAction: "Scanning available GPU capacity...",
          }),
        }),
      },
      {
        delay: 800,
        run: async ({ state, stack }) => {
          const capacity = await stack.cluster.getAvailableCapacity();
          return {
            ...state,
            agents: updateAgent(state.agents, "kubernetes", {
              status: "complete",
              progress: 100,
              completedActions: [
                `${capacity.freeGpus} GPUs available across ${capacity.pools.length} node pools`,
              ],
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "kubernetes",
              message: "Cluster capacity scanned",
              detail: `${capacity.freeGpus} free GPUs · ${capacity.pools.length} node pools`,
              type: "observation",
            }),
            toolCalls: addToolCall(state.toolCalls, {
              tool: "Kubernetes API",
              status: "complete",
              result: `${capacity.freeGpus} GPUs available`,
            }),
            confidence: 25,
          };
        },
      },
      {
        delay: 700,
        run: async ({ state, stack }) => {
          const reqs = await stack.gpu.estimateModelRequirements({
            modelParamsB: 70,
            concurrentUsers: 2000,
          });
          return {
            ...state,
            agents: updateAgent(state.agents, "gpu", {
              status: "running",
              progress: 45,
              currentAction: "Calculating model memory requirements...",
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "gpu",
              message: "Model requirements calculated",
              detail: `${reqs.modelSize} model · ${reqs.vramGb}GB VRAM · ${reqs.concurrentUsers} concurrent users`,
              type: "observation",
            }),
            confidence: 40,
          };
        },
      },
      {
        delay: 900,
        run: async ({ state, stack }) => {
          const reqs = await stack.gpu.estimateModelRequirements({
            modelParamsB: 70,
            concurrentUsers: 2000,
          });
          return {
            ...state,
            agents: updateAgent(state.agents, "gpu", {
              status: "complete",
              progress: 100,
              completedActions: [
                `Requires ~${reqs.vramGb}GB VRAM for ${reqs.modelSize} model`,
                `Estimated ${reqs.recommendedGpus}× ${reqs.gpuType} for ${reqs.concurrentUsers} concurrent users`,
              ],
            }),
            cards: addCard(state.cards, {
              id: "capacity-comparison",
              type: "capacity-comparison",
              title: "GPU Configuration Comparison",
              data: {
                configs: [
                  {
                    name: "A100 80GB × 4",
                    vram: 320,
                    throughput: "1,200 req/s",
                    latency: "245ms p99",
                    cost: 8400,
                    fit: "adequate",
                  },
                  {
                    name: "H100 80GB × 4",
                    vram: 320,
                    throughput: "2,400 req/s",
                    latency: "128ms p99",
                    cost: 12400,
                    fit: "recommended",
                  },
                  {
                    name: "L40S 48GB × 8",
                    vram: 384,
                    throughput: "1,800 req/s",
                    latency: "190ms p99",
                    cost: 9600,
                    fit: "alternative",
                  },
                ],
              },
            }),
            confidence: 65,
          };
        },
      },
      {
        delay: 600,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "cost", {
            status: "running",
            progress: 55,
            currentAction: "Estimating monthly cost...",
          }),
          toolCalls: addToolCall(state.toolCalls, {
            tool: "Cost Calculator",
            status: "running",
          }),
        }),
      },
      {
        delay: 800,
        run: async ({ state, stack }) => {
          const estimate = await stack.cost.estimateProvision({
            configName: "H100 80GB × 4",
            gpuCount: 4,
            gpuType: "H100",
          });
          return {
            ...state,
            agents: updateAgent(state.agents, "cost", {
              status: "complete",
              progress: 100,
              completedActions: [
                `H100×4 estimated at $${estimate.monthly.toLocaleString()}/mo`,
              ],
            }),
            toolCalls: state.toolCalls.map((t) =>
              t.tool === "Cost Calculator"
                ? { ...t, status: "complete" as const }
                : t
            ),
            cards: addCard(state.cards, {
              id: "cost-analysis",
              type: "cost-analysis",
              title: "Cost Projection",
              data: {
                monthly: estimate.monthly,
                hourly: estimate.hourly,
                breakdown: estimate.breakdown,
                savings: estimate.savings,
              },
            }),
            evidence: addEvidence(state.evidence, {
              source: "Cost Model",
              finding: `H100×4 at $${estimate.monthly.toLocaleString()}/mo — ${estimate.savings}`,
              status: "confirmed",
            }),
            confidence: 82,
          };
        },
      },
      {
        delay: 500,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "policy", {
            status: "running",
            progress: 60,
            currentAction: "Checking cluster policies and quotas...",
          }),
        }),
      },
      {
        delay: 700,
        run: async ({ state, stack, mission }) => {
          const check = await stack.policy.validateProvision({
            namespace: "ml-serving",
            nodePool: "gpu-h100-west-2",
            gpuCount: 4,
          });
          return {
            ...state,
            agents: updateAgent(state.agents, "policy", {
              status: "complete",
              progress: 100,
              completedActions: ["Policy check passed · quota available"],
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "policy",
              message: "Policy validation passed",
              detail: `GPU quota: ${check.quotaAvailable ?? 16} available · namespace approved`,
              type: "recommendation",
            }),
            cards: addCard(state.cards, {
              id: "approval",
              type: "approval",
              title: "Provisioning Approval",
              data: {
                action: "Provision H100 80GB × 4",
                namespace: "ml-serving",
                nodePool: "gpu-h100-west-2",
                expectedImprovement: "2,400 req/s capacity",
                risk: "Low",
                requiresApproval: true,
                cost: "$12,400/mo",
              },
            }),
            rationale: mission.rationale,
            confidence: 94,
            status: "awaiting-approval",
          };
        },
      },
    ],
  };
}
