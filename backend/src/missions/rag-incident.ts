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
import type { MissionPlan } from "./gpu-fleet";

export async function buildRagIncidentPlan(): Promise<MissionPlan> {
  const workload = "rag-prod-inference";

  return {
    id: "rag-incident",
    steps: [
      {
        delay: 300,
        run: async ({ state }) => ({
          ...state,
          status: "running",
          agents: updateAgent(state.agents, "kubernetes", {
            status: "running",
            progress: 25,
            currentAction: `Locating ${workload} deployment...`,
          }),
        }),
      },
      {
        delay: 700,
        run: async ({ state, stack }) => {
          const wl = await stack.cluster.getWorkload(workload);
          return {
            ...state,
            agents: updateAgent(state.agents, "kubernetes", {
              status: "complete",
              progress: 100,
              completedActions: [
                `Found ${wl?.kind ?? "Deployment"} ${workload} (${wl?.replicas ?? 3} replicas)`,
              ],
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "kubernetes",
              message: "Found Deployment",
              detail: `${workload} · ${wl?.replicas ?? 3} replicas · ns: ${wl?.namespace ?? "ml-serving"}`,
              type: "observation",
            }),
            toolCalls: addToolCall(state.toolCalls, {
              tool: "Kubernetes API",
              status: "complete",
              result: `Deployment ${workload}`,
            }),
            cards: addCard(state.cards, {
              id: "status-badges",
              type: "status-badges",
              data: {
                name: workload,
                type: wl?.kind ?? "Deployment",
                badges: [
                  { label: "Memory", status: "critical" },
                  { label: "Conditions", status: "healthy" },
                  { label: "CPU", status: "healthy" },
                  { label: "Pods", status: "warning" },
                  { label: "GPU", status: "critical" },
                ],
              },
            }),
            confidence: 20,
          };
        },
      },
      {
        delay: 600,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "gpu", {
            status: "running",
            progress: 40,
            currentAction: "Checking GPU memory on assigned nodes...",
          }),
        }),
      },
      {
        delay: 900,
        run: async ({ state, stack }) => {
          const metrics = await stack.gpu.getNodeMetrics("gpu-3");
          const mem = metrics?.memory ?? 94;
          const node = metrics?.node ?? "gpu-west-2a-7";
          return {
            ...state,
            agents: updateAgent(state.agents, "gpu", {
              status: "complete",
              progress: 100,
              completedActions: [`GPU 6 at ${mem}% memory on node ${node}`],
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "gpu",
              message: "Detected GPU 6 memory pressure",
              detail: `${mem}% memory · node ${node}`,
              type: "observation",
            }),
            toolCalls: addToolCall(state.toolCalls, {
              tool: "NVIDIA DCGM",
              status: "complete",
              result: `GPU 6: ${mem}% memory`,
            }),
            evidence: addEvidence(state.evidence, {
              source: "DCGM",
              finding: `GPU 6 memory at ${mem}% — approaching OOM threshold`,
              status: "critical",
            }),
            confidence: 45,
          };
        },
      },
      {
        delay: 700,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "runtime", {
            status: "running",
            progress: 35,
            currentAction: "Analyzing KV-cache growth...",
          }),
          toolCalls: addToolCall(state.toolCalls, {
            tool: "Grafana / Mimir",
            status: "running",
          }),
        }),
      },
      {
        delay: 800,
        run: async ({ state, stack }) => {
          const kv = await stack.runtime.getKvCache(workload);
          return {
            ...state,
            agents: updateAgent(state.agents, "runtime", {
              status: "running",
              progress: 75,
              currentAction: "Correlating CUDA OOM events...",
            }),
            timeline: addTimeline(state.timeline, {
              timestamp: nowTimestamp(),
              agentId: "runtime",
              message: `KV cache grew to ${kv.current}GB`,
              detail: `+${kv.growthPct}% over 15 minutes`,
              type: "hypothesis",
            }),
            evidence: addEvidence(state.evidence, {
              source: "Runtime Telemetry",
              finding: `KV-cache grew from ${kv.baseline}GB to ${kv.current}GB in 15 min`,
              status: "critical",
            }),
            cards: addCard(state.cards, {
              id: "kv-cache",
              type: "kv-cache",
              title: "KV-Cache Growth",
              data: {
                current: kv.current,
                baseline: kv.baseline,
                limit: kv.limit,
                trend: kv.trend,
              },
            }),
            confidence: 65,
          };
        },
      },
      {
        delay: 600,
        run: async ({ state, stack }) => {
          const oom = await stack.runtime.getCudaOomSignals(workload);
          const util = await stack.runtime.getUtilization(workload);
          const events = await stack.cluster.getEvents(workload);
          const logs = await stack.observability.queryLogs("CUDA OOM");
          return {
            ...state,
            agents: updateAgent(state.agents, "runtime", {
              status: "complete",
              progress: 100,
              completedActions: [
                `CUDA OOM detected ${oom.count} times in last hour`,
              ],
            }),
            toolCalls: state.toolCalls.map((t) =>
              t.tool === "Grafana / Mimir"
                ? { ...t, status: "complete" as const }
                : t
            ),
            evidence: addEvidence(
              addEvidence(state.evidence, {
                source: logs[0] ? "Loki" : oom.source,
                finding: `${oom.count} CUDA OOM errors in last ${oom.windowMinutes} minutes`,
                status: "critical",
              }),
              {
                source: "Kubernetes Events",
                finding:
                  events[0]?.message ??
                  `Pod ${workload}-7f8d9 restarted 4 times`,
                status: "warning",
              }
            ),
            cards: addCard(state.cards, {
              id: "utilization",
              type: "utilization",
              title: "Deployment Utilization",
              data: {
                cpu: util.cpu,
                memory: util.memory,
                gpu: util.gpu,
              },
            }),
            confidence: 78,
          };
        },
      },
      {
        delay: 500,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "incident", {
            status: "running",
            progress: 60,
            currentAction: "Building incident timeline...",
          }),
        }),
      },
      {
        delay: 700,
        run: async ({ state, mission }) => ({
          ...state,
          agents: updateAgent(state.agents, "incident", {
            status: "complete",
            progress: 100,
            completedActions: ["Root cause identified with 91% confidence"],
          }),
          timeline: addTimeline(state.timeline, {
            timestamp: nowTimestamp(),
            agentId: "incident",
            message: "Root cause correlated",
            detail: "Replica imbalance + KV-cache growth → CUDA OOM",
            type: "correlation",
          }),
          cards: addCard(state.cards, {
            id: "root-cause",
            type: "root-cause",
            title: "Root Cause Analysis",
            data: {
              cause: "KV-cache memory exhaustion due to replica imbalance",
              chain: [
                "Traffic spike increased concurrent requests by 3.2×",
                "2 of 3 replicas landed on same GPU node",
                "KV-cache allocation grew 340% without redistribution",
                "CUDA OOM triggered pod restarts (4× in 1 hour)",
              ],
              confidence: 91,
            },
          }),
          confidence: 91,
          rationale: mission.rationale,
        }),
      },
      {
        delay: 500,
        run: async ({ state }) => ({
          ...state,
          agents: updateAgent(state.agents, "policy", {
            status: "running",
            progress: 50,
            currentAction: "Validating remediation against policies...",
          }),
        }),
      },
      {
        delay: 600,
        run: async ({ state, stack }) => {
          const check = await stack.policy.validateRemediation({
            action: "Redistribute 2 replicas",
            from: "gpu-west-2a-7",
            to: "gpu-west-2a-3",
            namespace: "ml-serving",
          });
          return {
            ...state,
            agents: updateAgent(state.agents, "policy", {
              status: "complete",
              progress: 100,
              completedActions: [check.reason],
            }),
            cards: addCard(state.cards, {
              id: "approval",
              type: "approval",
              title: "Remediation Approval",
              data: {
                action: "Redistribute 2 replicas",
                from: "gpu-west-2a-7",
                to: "gpu-west-2a-3",
                expectedImprovement: "+38% memory headroom",
                risk: "Low",
                requiresApproval: true,
              },
            }),
            status: "awaiting-approval",
            confidence: 91,
          };
        },
      },
    ],
  };
}

