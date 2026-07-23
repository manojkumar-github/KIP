import type {
  A2UICard,
  AgentId,
  AgentState,
  EvidenceItem,
  MissionDefinition,
  MissionState,
  TimelineEvent,
  ToolCall,
} from "./types";
import { AGENTS } from "./mock-data";

function createInitialAgents(agentIds: AgentId[]): AgentState[] {
  return agentIds.map((id) => ({
    id,
    status: "waiting" as const,
    progress: 0,
    completedActions: [],
  }));
}

export function createInitialMissionState(mission: MissionDefinition): MissionState {
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

interface SimulationStep {
  delay: number;
  action: (state: MissionState, mission: MissionDefinition) => MissionState;
}

function updateAgent(
  agents: AgentState[],
  id: AgentId,
  update: Partial<AgentState>
): AgentState[] {
  return agents.map((a) => (a.id === id ? { ...a, ...update } : a));
}

function addTimeline(
  timeline: TimelineEvent[],
  event: Omit<TimelineEvent, "id">
): TimelineEvent[] {
  return [...timeline, { ...event, id: `tl-${timeline.length + 1}` }];
}

function addCard(cards: A2UICard[], card: Omit<A2UICard, "visible">): A2UICard[] {
  return [...cards, { ...card, visible: true }];
}

function addToolCall(toolCalls: ToolCall[], call: Omit<ToolCall, "id">): ToolCall[] {
  return [...toolCalls, { ...call, id: `tool-${toolCalls.length + 1}` }];
}

function addEvidence(
  evidence: EvidenceItem[],
  item: Omit<EvidenceItem, "id">
): EvidenceItem[] {
  return [...evidence, { ...item, id: `ev-${evidence.length + 1}` }];
}

export function getSimulationSteps(mission: MissionDefinition): SimulationStep[] {
  switch (mission.id) {
    case "gpu-fleet":
      return getGpuFleetSteps(mission);
    case "rag-incident":
      return getRagIncidentSteps(mission);
    case "gpu-provision":
      return getGpuProvisionSteps(mission);
    default:
      return [];
  }
}

function getGpuFleetSteps(mission: MissionDefinition): SimulationStep[] {
  return [
    {
      delay: 400,
      action: (s) => ({
        ...s,
        status: "running",
        agents: updateAgent(s.agents, "kubernetes", {
          status: "running",
          progress: 20,
          currentAction: "Loading cluster topology...",
        }),
      }),
    },
    {
      delay: 800,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "kubernetes", {
          status: "complete",
          progress: 100,
          currentAction: undefined,
          completedActions: ["Loaded 48 GPU nodes across 6 node pools"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:21",
          agentId: "kubernetes",
          message: "Loaded cluster topology",
          detail: "48 GPUs across 6 node pools",
          type: "observation",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "Kubernetes API",
          status: "complete",
          result: "48 nodes, 142 workloads",
        }),
      }),
    },
    {
      delay: 600,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "running",
          progress: 30,
          currentAction: "Querying DCGM metrics...",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "NVIDIA DCGM",
          status: "running",
        }),
      }),
    },
    {
      delay: 900,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "running",
          progress: 70,
          currentAction: "Analyzing utilization patterns...",
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:24",
          agentId: "gpu",
          message: "Detected GPU memory pressure",
          detail: "4 GPUs above 90% memory threshold",
          type: "observation",
        }),
        evidence: addEvidence(s.evidence, {
          source: "DCGM",
          finding: "4 GPUs with >90% memory utilization",
          status: "critical",
        }),
      }),
    },
    {
      delay: 700,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "complete",
          progress: 100,
          currentAction: undefined,
          completedActions: [
            "Found 4 unhealthy GPUs",
            "Identified 2 underutilized GPUs (<15%)",
          ],
        }),
        toolCalls: s.toolCalls.map((t) =>
          t.tool === "NVIDIA DCGM" ? { ...t, status: "complete" as const, result: "4 critical, 2 idle" } : t
        ),
        cards: addCard(s.cards, {
          id: "gpu-heatmap",
          type: "gpu-heatmap",
          title: "GPU Fleet Heatmap",
          data: {
            nodes: [
              { id: "gpu-1", util: 78, memory: 82, temp: 72, status: "healthy" },
              { id: "gpu-2", util: 12, memory: 8, temp: 45, status: "idle" },
              { id: "gpu-3", util: 94, memory: 96, temp: 84, status: "critical" },
              { id: "gpu-4", util: 88, memory: 91, temp: 79, status: "warning" },
              { id: "gpu-5", util: 65, memory: 70, temp: 68, status: "healthy" },
              { id: "gpu-6", util: 11, memory: 6, temp: 42, status: "idle" },
              { id: "gpu-7", util: 92, memory: 94, temp: 86, status: "critical" },
              { id: "gpu-8", util: 71, memory: 74, temp: 70, status: "healthy" },
            ],
          },
        }),
        confidence: 45,
      }),
    },
    {
      delay: 600,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "cost", {
          status: "running",
          progress: 50,
          currentAction: "Calculating cost efficiency...",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "Prometheus",
          status: "complete",
          result: "Utilization metrics fetched",
        }),
      }),
    },
    {
      delay: 800,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "cost", {
          status: "complete",
          progress: 100,
          completedActions: ["Estimated $2.1K/mo waste from idle GPUs"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:28",
          agentId: "cost",
          message: "Cost inefficiency detected",
          detail: "$2,100/mo from 2 idle GPUs + fragmentation",
          type: "correlation",
        }),
        evidence: addEvidence(s.evidence, {
          source: "Cost Analysis",
          finding: "$2,100/mo waste from idle GPU capacity",
          status: "warning",
        }),
        cards: addCard(s.cards, {
          id: "gpu-fleet",
          type: "gpu-fleet",
          title: "Fleet Summary",
          data: {
            total: 48,
            healthy: 44,
            critical: 4,
            idle: 2,
            avgUtil: 62,
            costWaste: 2100,
          },
        }),
        confidence: 78,
      }),
    },
    {
      delay: 500,
      action: (s) => ({
        ...s,
        cards: addCard(s.cards, {
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
      action: (s) => ({
        ...s,
        status: "complete",
        confidence: 91,
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:32",
          agentId: "gpu",
          message: "Recommendation generated",
          detail: "Rebalance 2 replicas, consolidate idle GPUs",
          type: "recommendation",
        }),
      }),
    },
  ];
}

function getRagIncidentSteps(mission: MissionDefinition): SimulationStep[] {
  return [
    {
      delay: 300,
      action: (s) => ({
        ...s,
        status: "running",
        agents: updateAgent(s.agents, "kubernetes", {
          status: "running",
          progress: 25,
          currentAction: "Locating rag-prod-inference deployment...",
        }),
      }),
    },
    {
      delay: 700,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "kubernetes", {
          status: "complete",
          progress: 100,
          completedActions: ["Found Deployment rag-prod-inference (3 replicas)"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:21",
          agentId: "kubernetes",
          message: "Found Deployment",
          detail: "rag-prod-inference · 3 replicas · ns: ml-serving",
          type: "observation",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "Kubernetes API",
          status: "complete",
          result: "Deployment rag-prod-inference",
        }),
        cards: addCard(s.cards, {
          id: "status-badges",
          type: "status-badges",
          data: {
            name: "rag-prod-inference",
            type: "Deployment",
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
      }),
    },
    {
      delay: 600,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "running",
          progress: 40,
          currentAction: "Checking GPU memory on assigned nodes...",
        }),
      }),
    },
    {
      delay: 900,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "complete",
          progress: 100,
          completedActions: ["GPU 6 at 94% memory on node gpu-west-2a-7"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:23",
          agentId: "gpu",
          message: "Detected GPU 6 memory pressure",
          detail: "94% memory · node gpu-west-2a-7",
          type: "observation",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "NVIDIA DCGM",
          status: "complete",
          result: "GPU 6: 94% memory",
        }),
        evidence: addEvidence(s.evidence, {
          source: "DCGM",
          finding: "GPU 6 memory at 94% — approaching OOM threshold",
          status: "critical",
        }),
        confidence: 45,
      }),
    },
    {
      delay: 700,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "runtime", {
          status: "running",
          progress: 35,
          currentAction: "Analyzing KV-cache growth...",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "Grafana / Mimir",
          status: "running",
        }),
      }),
    },
    {
      delay: 800,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "runtime", {
          status: "running",
          progress: 75,
          currentAction: "Correlating CUDA OOM events...",
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:26",
          agentId: "runtime",
          message: "KV cache grew to 1.8GB",
          detail: "+340% over 15 minutes",
          type: "hypothesis",
        }),
        evidence: addEvidence(s.evidence, {
          source: "Runtime Telemetry",
          finding: "KV-cache grew from 0.4GB to 1.8GB in 15 min",
          status: "critical",
        }),
        cards: addCard(s.cards, {
          id: "kv-cache",
          type: "kv-cache",
          title: "KV-Cache Growth",
          data: {
            current: 1.8,
            baseline: 0.4,
            limit: 2.0,
            trend: [0.4, 0.6, 0.9, 1.2, 1.5, 1.8],
          },
        }),
        confidence: 65,
      }),
    },
    {
      delay: 600,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "runtime", {
          status: "complete",
          progress: 100,
          completedActions: ["CUDA OOM detected 7 times in last hour"],
        }),
        toolCalls: s.toolCalls.map((t) =>
          t.tool === "Grafana / Mimir" ? { ...t, status: "complete" as const } : t
        ),
        evidence: addEvidence(
          addEvidence(s.evidence, {
            source: "Loki",
            finding: "7 CUDA OOM errors in last 60 minutes",
            status: "critical",
          }),
          {
            source: "Kubernetes Events",
            finding: "Pod rag-prod-inference-7f8d9 restarted 4 times",
            status: "warning",
          }
        ),
        cards: addCard(s.cards, {
          id: "utilization",
          type: "utilization",
          title: "Deployment Utilization",
          data: {
            cpu: { usage: 45, requests: 60, limits: 80 },
            memory: { usage: 94, requests: 70, limits: 96 },
            gpu: { usage: 94, requests: 80, limits: 100 },
          },
        }),
        confidence: 78,
      }),
    },
    {
      delay: 500,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "incident", {
          status: "running",
          progress: 60,
          currentAction: "Building incident timeline...",
        }),
      }),
    },
    {
      delay: 700,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "incident", {
          status: "complete",
          progress: 100,
          completedActions: ["Root cause identified with 91% confidence"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:28",
          agentId: "incident",
          message: "Root cause correlated",
          detail: "Replica imbalance + KV-cache growth → CUDA OOM",
          type: "correlation",
        }),
        cards: addCard(s.cards, {
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
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "policy", {
          status: "running",
          progress: 50,
          currentAction: "Validating remediation against policies...",
        }),
      }),
    },
    {
      delay: 600,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "policy", {
          status: "complete",
          progress: 100,
          completedActions: ["Remediation plan approved by policy engine"],
        }),
        cards: addCard(s.cards, {
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
      }),
    },
  ];
}

function getGpuProvisionSteps(mission: MissionDefinition): SimulationStep[] {
  return [
    {
      delay: 400,
      action: (s) => ({
        ...s,
        status: "running",
        agents: updateAgent(s.agents, "kubernetes", {
          status: "running",
          progress: 30,
          currentAction: "Scanning available GPU capacity...",
        }),
      }),
    },
    {
      delay: 800,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "kubernetes", {
          status: "complete",
          progress: 100,
          completedActions: ["12 GPUs available across 3 node pools"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:21",
          agentId: "kubernetes",
          message: "Cluster capacity scanned",
          detail: "12 free GPUs · 3 node pools",
          type: "observation",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "Kubernetes API",
          status: "complete",
          result: "12 GPUs available",
        }),
        confidence: 25,
      }),
    },
    {
      delay: 700,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "running",
          progress: 45,
          currentAction: "Calculating model memory requirements...",
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:23",
          agentId: "gpu",
          message: "Model requirements calculated",
          detail: "70B model · 140GB VRAM · 2000 concurrent users",
          type: "observation",
        }),
        confidence: 40,
      }),
    },
    {
      delay: 900,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "gpu", {
          status: "complete",
          progress: 100,
          completedActions: [
            "Requires ~140GB VRAM for 70B model",
            "Estimated 4× H100 for 2000 concurrent users",
          ],
        }),
        cards: addCard(s.cards, {
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
      }),
    },
    {
      delay: 600,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "cost", {
          status: "running",
          progress: 55,
          currentAction: "Estimating monthly cost...",
        }),
        toolCalls: addToolCall(s.toolCalls, {
          tool: "Cost Calculator",
          status: "running",
        }),
      }),
    },
    {
      delay: 800,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "cost", {
          status: "complete",
          progress: 100,
          completedActions: ["H100×4 estimated at $12,400/mo"],
        }),
        cards: addCard(s.cards, {
          id: "cost-analysis",
          type: "cost-analysis",
          title: "Cost Projection",
          data: {
            monthly: 12400,
            hourly: 17.2,
            breakdown: [
              { label: "GPU compute", amount: 9800 },
              { label: "Storage", amount: 1200 },
              { label: "Network", amount: 800 },
              { label: "Overhead", amount: 600 },
            ],
            savings: "23% vs current over-provisioned setup",
          },
        }),
        evidence: addEvidence(s.evidence, {
          source: "Cost Model",
          finding: "H100×4 at $12,400/mo — 23% savings vs current",
          status: "confirmed",
        }),
        confidence: 82,
      }),
    },
    {
      delay: 500,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "policy", {
          status: "running",
          progress: 60,
          currentAction: "Checking cluster policies and quotas...",
        }),
      }),
    },
    {
      delay: 700,
      action: (s) => ({
        ...s,
        agents: updateAgent(s.agents, "policy", {
          status: "complete",
          progress: 100,
          completedActions: ["Policy check passed · quota available"],
        }),
        timeline: addTimeline(s.timeline, {
          timestamp: "08:41:30",
          agentId: "policy",
          message: "Policy validation passed",
          detail: "GPU quota: 16 available · namespace approved",
          type: "recommendation",
        }),
        cards: addCard(s.cards, {
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
      }),
    },
  ];
}

export async function runMissionSimulation(
  mission: MissionDefinition,
  onUpdate: (state: MissionState) => void,
  initialState: MissionState
): Promise<MissionState> {
  let state: MissionState = { ...initialState, status: "running" };
  onUpdate(state);

  const steps = getSimulationSteps(mission);

  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, step.delay));
    state = step.action(state, mission);
    onUpdate({ ...state });
  }

  if (state.status === "awaiting-approval") {
    return state;
  }

  state = { ...state, status: "complete" };
  onUpdate(state);
  return state;
}

export function getAgentName(id: AgentId): string {
  return AGENTS[id]?.name ?? id;
}
