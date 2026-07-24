import type { ClusterInventory, ClusterWorkload, ClusterNode, ClusterEvent, ClusterCapacity } from "../../capabilities/cluster";

const NODES: ClusterNode[] = Array.from({ length: 48 }, (_, i) => ({
  id: `gpu-node-${i + 1}`,
  pool: `pool-${(i % 6) + 1}`,
  gpuCount: 1,
  ready: true,
}));

const WORKLOADS: ClusterWorkload[] = [
  {
    id: "1",
    name: "rag-prod-inference",
    namespace: "ml-serving",
    kind: "Deployment",
    replicas: 3,
    status: "critical",
    age: "12 w 3 d",
  },
  {
    id: "2",
    name: "llama-70b-serving",
    namespace: "ml-serving",
    kind: "Deployment",
    replicas: 4,
    status: "healthy",
    age: "8 w 1 d",
  },
  {
    id: "3",
    name: "embedding-v2",
    namespace: "ml-serving",
    kind: "Deployment",
    replicas: 2,
    status: "healthy",
    age: "6 w 5 d",
  },
];

export class DemoClusterInventory implements ClusterInventory {
  readonly name = "demo-cluster";

  async getTopology() {
    return { nodes: NODES, nodePools: 6, totalGpus: 48 };
  }

  async getWorkload(name: string, namespace = "ml-serving") {
    return (
      WORKLOADS.find((w) => w.name === name && w.namespace === namespace) ?? null
    );
  }

  async listWorkloads(namespace?: string) {
    if (!namespace) return WORKLOADS;
    return WORKLOADS.filter((w) => w.namespace === namespace);
  }

  async getEvents(objectName: string): Promise<ClusterEvent[]> {
    if (objectName.includes("rag-prod")) {
      return [
        {
          reason: "BackOff",
          message: `Pod ${objectName}-7f8d9 restarted 4 times`,
          object: objectName,
          count: 4,
        },
      ];
    }
    return [];
  }

  async getAvailableCapacity(): Promise<ClusterCapacity> {
    return {
      freeGpus: 12,
      pools: [
        { name: "gpu-h100-west-2", freeGpus: 6 },
        { name: "gpu-a100-west-2", freeGpus: 4 },
        { name: "gpu-l40s-west-2", freeGpus: 2 },
      ],
    };
  }
}
