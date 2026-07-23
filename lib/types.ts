export type AgentStatus = "waiting" | "running" | "complete" | "error";

export type AgentId =
  | "kubernetes"
  | "gpu"
  | "runtime"
  | "incident"
  | "cost"
  | "policy";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  icon: string;
}

export interface AgentState {
  id: AgentId;
  status: AgentStatus;
  progress: number;
  currentAction?: string;
  completedActions: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  agentId: AgentId;
  message: string;
  detail?: string;
  type: "observation" | "hypothesis" | "tool" | "correlation" | "recommendation";
}

export interface ToolCall {
  id: string;
  tool: string;
  status: "pending" | "running" | "complete" | "error";
  result?: string;
}

export interface EvidenceItem {
  id: string;
  source: string;
  finding: string;
  status: "confirmed" | "warning" | "critical";
}

export type CardType =
  | "root-cause"
  | "gpu-fleet"
  | "gpu-heatmap"
  | "utilization"
  | "kv-cache"
  | "incident-timeline"
  | "capacity-comparison"
  | "cost-analysis"
  | "approval"
  | "evidence"
  | "recommendation"
  | "status-badges"
  | "pod-summary"
  | "rationale";

export interface A2UICard {
  id: string;
  type: CardType;
  title?: string;
  data: Record<string, unknown>;
  visible: boolean;
}

export interface MissionDefinition {
  id: string;
  title: string;
  prompt: string;
  category: "fleet" | "incident" | "capacity";
  description: string;
  agents: AgentId[];
  rationale: string;
}

export interface MissionState {
  id: string;
  status: "idle" | "running" | "complete" | "awaiting-approval";
  agents: AgentState[];
  timeline: TimelineEvent[];
  toolCalls: ToolCall[];
  evidence: EvidenceItem[];
  cards: A2UICard[];
  confidence: number;
  rationale?: string;
}

export interface ClusterInfo {
  name: string;
  environment: string;
  gpuCount: number;
  healthyGpus: number;
  alertCount: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface WorkloadItem {
  id: string;
  name: string;
  age: string;
  status: "healthy" | "warning" | "critical";
  type: string;
}
