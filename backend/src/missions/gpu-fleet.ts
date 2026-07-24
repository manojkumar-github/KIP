import type { ResolvedStack } from "../capabilities";
import type { MissionDefinition, MissionState } from "../types";
import {
  updateAgent,
  addTimeline,
  addToolCall,
  addEvidence,
  addCard,
  nowTimestamp,
} from "../core/state-helpers";

export type MissionStep = {
  delay: number;
  run: (ctx: {
    state: MissionState;
    stack: ResolvedStack;
    mission: MissionDefinition;
  }) => Promise<MissionState>;
};

export type MissionPlan = {
  id: string;
  steps: MissionStep[];
};

export async function buildGpuFleetPlan(): Promise<MissionPlan> {
  return {
    id: "gpu-fleet",
    steps: [
      {
        delay: 400,
        run: async ({ state }) => ({
          ...state,
          status: "running",
          agents: updateAgent(state.agents, "kubernetes", {
            status: "running",
            progress: 20,
            currentAction: "Loading cluster topology...",
          }),
        }),
      },
      {
        delay: 800,
        run: async ({ state, stack }) => {
          const topology = await stack.cluster.getTopology();
          const workloads = await stack.cluster.listWorkloads();
          return {
            ...state,
            agents: updateAgent(state.agents, "kubernetes", {
              status: "complete",
              progress: 100,
              currentAction: undefined,
              completedActions: [
                `Loaded ${topology.totalGpus} GPU nodes across ${topology.nodePools} node pools`,
              ],
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "kubernetes",
              message: "Loaded cluster topology",
              detail: `${topology.totalGpus} GPUs across ${topology.nodePools} node pools`,
              type: "observation",
            }),
            toolCalls: addToolCall(state.toolCalls, {
              tool: "Kubernetes API",
              status: "complete",
              result: `${topology.nodes.length} nodes, ${workloads.length} workloads`,
            }),
          };
        },
      },
      {
        delay: 600,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "gpu", {
            status: "running",
            progress: 30,
            currentAction: "Querying DCGM metrics...",
          }),
          toolCalls: addToolCall(state.toolCalls, {
            tool: "NVIDIA DCGM",
            status: "running",
          }),
        }),
      },
      {
        delay: 900,
        run: async ({ state, stack }) => {
          const fleet = await stack.gpu.getFleetMetrics();
          const critical = fleet.filter((g) => g.memory > 90);
          return {
            ...state,
            agents: updateAgent(state.agents, "gpu", {
              status: "running",
              progress: 70,
              currentAction: "Analyzing utilization patterns...",
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "gpu",
              message: "Detected GPU memory pressure",
              detail: `${critical.length} GPUs above 90% memory threshold`,
              type: "observation",
            }),
            evidence: addEvidence(state.evidence, {
              source: "DCGM",
              finding: `${critical.length} GPUs with >90% memory utilization`,
              status: "critical",
            }),
          };
        },
      },
      {
        delay: 700,
        run: async ({ state, stack }) => {
          const fleet = await stack.gpu.getFleetMetrics();
          const critical = fleet.filter((g) => g.status === "critical").length;
          const idle = fleet.filter((g) => g.status === "idle").length;
          return {
            ...state,
            agents: updateAgent(state.agents, "gpu", {
              status: "complete",
              progress: 100,
              currentAction: undefined,
              completedActions: [
                `Found ${critical} unhealthy GPUs`,
                `Identified ${idle} underutilized GPUs (<15%)`,
              ],
            }),
            toolCalls: state.toolCalls.map((t) =>
              t.tool === "NVIDIA DCGM"
                ? {
                    ...t,
                    status: "complete" as const,
                    result: `${critical} critical, ${idle} idle`,
                  }
                : t
            ),
            cards: addCard(state.cards, {
              id: "gpu-heatmap",
              type: "gpu-heatmap",
              title: "GPU Fleet Heatmap",
              data: { nodes: fleet },
            }),
            confidence: 45,
          };
        },
      },
      {
        delay: 600,
        run: async ({ state, stack }) => {
          await stack.observability.queryMetric("gpu_utilization");
          return {
            ...state,
            agents: updateAgent(state.agents, "cost", {
              status: "running",
              progress: 50,
              currentAction: "Calculating cost efficiency...",
            }),
            toolCalls: addToolCall(state.toolCalls, {
              tool: "Prometheus",
              status: "complete",
              result: "Utilization metrics fetched",
            }),
          };
        },
      },
      {
        delay: 800,
        run: async ({ state, stack }) => {
          const fleet = await stack.gpu.getFleetMetrics();
          const idle = fleet.filter((g) => g.status === "idle").length;
          const critical = fleet.filter((g) => g.status === "critical").length;
          const topology = await stack.cluster.getTopology();
          const waste = await stack.cost.estimateIdleWaste({
            idleGpus: idle,
            fragmentation: true,
          });
          const avgUtil = Math.round(
            fleet.reduce((s, g) => s + g.util, 0) / Math.max(fleet.length, 1)
          );
          return {
            ...state,
            agents: updateAgent(state.agents, "cost", {
              status: "complete",
              progress: 100,
              completedActions: [
                `Estimated $${(waste.monthlyUsd / 1000).toFixed(1)}K/mo waste from idle GPUs`,
              ],
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "cost",
              message: "Cost inefficiency detected",
              detail: waste.detail,
              type: "correlation",
            }),
            evidence: addEvidence(state.evidence, {
              source: "Cost Analysis",
              finding: `$${waste.monthlyUsd.toLocaleString()}/mo waste from idle GPU capacity`,
              status: "warning",
            }),
            cards: addCard(state.cards, {
              id: "gpu-fleet",
              type: "gpu-fleet",
              title: "Fleet Summary",
              data: {
                total: topology.totalGpus,
                healthy: topology.totalGpus - critical,
                critical,
                idle,
                avgUtil,
                costWaste: waste.monthlyUsd,
              },
            }),
            confidence: 78,
          };
        },
      },
      {
        delay: 500,
        run: async ({ state, mission }) => ({
          ...state,
          cards: addCard(state.cards, {
            id: "recommendation",
            type: "recommendation",
            title: "Recommended Actions",
            data: {
              actions: [
                "Rebalance rag-prod-inference replicas from gpu-3 to gpu-2",
                "Consolidate idle workloads on gpu-6 to free gpu-7",
                "Enable dynamic GPU fractions for embedding-v2",
              ],
              impact: "+38% fleet efficiency",
              risk: "Low",
            },
          }),
          confidence: 87,
          rationale: mission.rationale,
        }),
      },
      {
        delay: 400,
        run: async ({ state }) => ({
          ...state,
          status: "complete",
          confidence: 91,
          timeline: addTimeline(state.timeline, {
            timestamp: nowTimestamp(),
            agentId: "gpu",
            message: "Recommendation generated",
            detail: "Rebalance 2 replicas, consolidate idle GPUs",
            type: "recommendation",
          }),
        }),
      },
    ],
  };
}
