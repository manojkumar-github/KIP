import type {
  AgentDefinition,
  ClusterInfo,
  MissionDefinition,
  NavItem,
  WorkloadItem,
} from "./types";

export const AGENTS: Record<string, AgentDefinition> = {
  kubernetes: { id: "kubernetes", name: "Kubernetes Agent", icon: "k8s" },
  gpu: { id: "gpu", name: "GPU Agent", icon: "gpu" },
  runtime: { id: "runtime", name: "Runtime Agent", icon: "runtime" },
  incident: { id: "incident", name: "Incident Agent", icon: "incident" },
  cost: { id: "cost", name: "Cost Agent", icon: "cost" },
  policy: { id: "policy", name: "Policy Agent", icon: "policy" },
};

export const CLUSTER: ClusterInfo = {
  name: "prod-gpu-west-2",
  environment: "Production",
  gpuCount: 48,
  healthyGpus: 44,
  alertCount: 12,
};

export const NAV_ITEMS: NavItem[] = [
  { id: "missions", label: "Missions", icon: "target" },
  { id: "fleet", label: "Fleet", icon: "server", badge: 4 },
  { id: "workloads", label: "Workloads", icon: "layers", badge: 142 },
  { id: "incidents", label: "Incidents", icon: "alert", badge: 3 },
  { id: "models", label: "Models", icon: "brain", badge: 8 },
  { id: "gpus", label: "GPUs", icon: "cpu", badge: 48 },
  { id: "policies", label: "Policies", icon: "shield" },
  { id: "knowledge", label: "Knowledge", icon: "book" },
];

export const WORKLOADS: WorkloadItem[] = [
  { id: "1", name: "rag-prod-inference", age: "12 w 3 d", status: "critical", type: "Deployment" },
  { id: "2", name: "llama-70b-serving", age: "8 w 1 d", status: "healthy", type: "Deployment" },
  { id: "3", name: "embedding-v2", age: "6 w 5 d", status: "healthy", type: "Deployment" },
  { id: "4", name: "vllm-gateway", age: "4 w 2 d", status: "warning", type: "Deployment" },
  { id: "5", name: "kv-cache-redis", age: "23 w 4 d", status: "healthy", type: "StatefulSet" },
  { id: "6", name: "model-router", age: "3 w 0 d", status: "healthy", type: "Deployment" },
  { id: "7", name: "gpu-exporter", age: "52 w 1 d", status: "healthy", type: "DaemonSet" },
  { id: "8", name: "triton-inference", age: "15 w 2 d", status: "warning", type: "Deployment" },
  { id: "9", name: "fine-tune-worker", age: "2 w 6 d", status: "healthy", type: "Job" },
  { id: "10", name: "rag-prod-kafka", age: "23 w 4 d", status: "healthy", type: "Deployment" },
];

export const MISSIONS: MissionDefinition[] = [
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

export const LIFECYCLE_STAGES = [
  "Model",
  "Evaluation",
  "Deployment",
  "Runtime",
  "Optimization",
  "Incident",
  "Capacity",
  "Remediation",
];

export const SAMPLE_PROMPTS = [
  "Show me unhealthy or underutilized GPUs across production.",
  "Why is the RAG inference service failing?",
  "Provision capacity for a 70B model with 2,000 concurrent users.",
];
