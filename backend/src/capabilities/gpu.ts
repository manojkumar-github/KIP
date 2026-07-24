export type GpuHealthStatus = "healthy" | "idle" | "critical" | "warning";

export interface GpuNodeMetrics {
  id: string;
  util: number;
  memory: number;
  temp: number;
  status: GpuHealthStatus;
  node?: string;
}

export interface ModelMemoryRequirements {
  modelSize: string;
  vramGb: number;
  concurrentUsers: number;
  recommendedGpus: number;
  gpuType: string;
}

export interface GpuTelemetry {
  readonly name: string;
  getFleetMetrics(): Promise<GpuNodeMetrics[]>;
  getNodeMetrics(nodeId: string): Promise<GpuNodeMetrics | null>;
  estimateModelRequirements(input: {
    modelParamsB: number;
    concurrentUsers: number;
  }): Promise<ModelMemoryRequirements>;
}
