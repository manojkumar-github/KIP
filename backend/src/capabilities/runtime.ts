export interface KvCacheSnapshot {
  current: number;
  baseline: number;
  limit: number;
  trend: number[];
  growthPct: number;
}

export interface UtilizationSlice {
  usage: number;
  requests: number;
  limits: number;
}

export interface DeploymentUtilization {
  cpu: UtilizationSlice;
  memory: UtilizationSlice;
  gpu: UtilizationSlice;
}

export interface OomSignal {
  count: number;
  windowMinutes: number;
  source: string;
}

export interface InferenceRuntime {
  readonly name: string;
  getKvCache(workload: string): Promise<KvCacheSnapshot>;
  getUtilization(workload: string): Promise<DeploymentUtilization>;
  getCudaOomSignals(workload: string): Promise<OomSignal>;
}
