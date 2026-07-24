import type { GpuTelemetry, GpuNodeMetrics, ModelMemoryRequirements } from "../../capabilities/gpu";

const FLEET: GpuNodeMetrics[] = [
  { id: "gpu-1", util: 78, memory: 82, temp: 72, status: "healthy" },
  { id: "gpu-2", util: 12, memory: 8, temp: 45, status: "idle" },
  { id: "gpu-3", util: 94, memory: 96, temp: 84, status: "critical", node: "gpu-west-2a-7" },
  { id: "gpu-4", util: 88, memory: 91, temp: 79, status: "warning" },
  { id: "gpu-5", util: 65, memory: 70, temp: 68, status: "healthy" },
  { id: "gpu-6", util: 11, memory: 6, temp: 42, status: "idle" },
  { id: "gpu-7", util: 92, memory: 94, temp: 86, status: "critical", node: "gpu-west-2a-7" },
  { id: "gpu-8", util: 71, memory: 74, temp: 70, status: "healthy" },
];

export class DemoGpuTelemetry implements GpuTelemetry {
  readonly name = "demo-gpu";

  async getFleetMetrics(): Promise<GpuNodeMetrics[]> {
    return FLEET;
  }

  async getNodeMetrics(nodeId: string): Promise<GpuNodeMetrics | null> {
    return FLEET.find((g) => g.id === nodeId || g.node === nodeId) ?? null;
  }

  async estimateModelRequirements(input: {
    modelParamsB: number;
    concurrentUsers: number;
  }): Promise<ModelMemoryRequirements> {
    const vramGb = Math.ceil(input.modelParamsB * 2);
    const recommendedGpus = input.concurrentUsers >= 2000 ? 4 : 2;
    return {
      modelSize: `${input.modelParamsB}B`,
      vramGb,
      concurrentUsers: input.concurrentUsers,
      recommendedGpus,
      gpuType: "H100",
    };
  }
}
