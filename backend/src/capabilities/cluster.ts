export type WorkloadStatus = "healthy" | "warning" | "critical";

export interface ClusterNode {
  id: string;
  pool: string;
  gpuCount: number;
  ready: boolean;
}

export interface ClusterWorkload {
  id: string;
  name: string;
  namespace: string;
  kind: string;
  replicas: number;
  status: WorkloadStatus;
  age?: string;
}

export interface ClusterEvent {
  reason: string;
  message: string;
  object: string;
  count: number;
}

export interface ClusterCapacity {
  freeGpus: number;
  pools: Array<{ name: string; freeGpus: number }>;
}

export interface ClusterInventory {
  readonly name: string;
  getTopology(): Promise<{ nodes: ClusterNode[]; nodePools: number; totalGpus: number }>;
  getWorkload(name: string, namespace?: string): Promise<ClusterWorkload | null>;
  listWorkloads(namespace?: string): Promise<ClusterWorkload[]>;
  getEvents(objectName: string): Promise<ClusterEvent[]>;
  getAvailableCapacity(): Promise<ClusterCapacity>;
}
