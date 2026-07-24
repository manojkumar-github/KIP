import type {
  InferenceRuntime,
  KvCacheSnapshot,
  DeploymentUtilization,
  OomSignal,
} from "../../capabilities/runtime";

export class DemoInferenceRuntime implements InferenceRuntime {
  readonly name = "demo-runtime";

  async getKvCache(_workload: string): Promise<KvCacheSnapshot> {
    return {
      current: 1.8,
      baseline: 0.4,
      limit: 2.0,
      trend: [0.4, 0.6, 0.9, 1.2, 1.5, 1.8],
      growthPct: 340,
    };
  }

  async getUtilization(_workload: string): Promise<DeploymentUtilization> {
    return {
      cpu: { usage: 45, requests: 60, limits: 80 },
      memory: { usage: 94, requests: 70, limits: 96 },
      gpu: { usage: 94, requests: 80, limits: 100 },
    };
  }

  async getCudaOomSignals(_workload: string): Promise<OomSignal> {
    return {
      count: 7,
      windowMinutes: 60,
      source: "Loki",
    };
  }
}
