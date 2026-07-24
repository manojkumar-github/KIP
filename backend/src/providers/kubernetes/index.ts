import type {
  ClusterInventory,
  ClusterNode,
  ClusterWorkload,
  ClusterEvent,
  ClusterCapacity,
} from "../../capabilities/cluster";

export interface KubernetesProviderConfig {
  /** Absolute path to kubeconfig. Ignored when inCluster is true. */
  kubeconfigPath?: string;
  /** Use in-cluster service account credentials. */
  inCluster?: boolean;
  /** Optional default namespace scope. */
  namespace?: string;
  /** Display name for the connected cluster. */
  clusterName?: string;
}

/**
 * Kubernetes ClusterInventory provider stub.
 *
 * Configure via Stack Manifest:
 *   cluster: { type: kubernetes, config: { kubeconfigPath: "~/.kube/config" } }
 *   — or —
 *   cluster: { type: kubernetes, config: { inCluster: true } }
 *
 * Wire a real client (@kubernetes/client-node) in listNodes/listWorkloads.
 * Until then, returns empty/safe defaults so missions degrade gracefully.
 */
export class KubernetesClusterInventory implements ClusterInventory {
  readonly name: string;
  private readonly config: KubernetesProviderConfig;

  constructor(config: KubernetesProviderConfig = {}) {
    this.config = config;
    this.name = config.clusterName ?? "kubernetes";
  }

  /** Future: CoreV1Api.listNode() via kubeconfig / in-cluster. */
  async getTopology(): Promise<{
    nodes: ClusterNode[];
    nodePools: number;
    totalGpus: number;
  }> {
    // TODO: replace with @kubernetes/client-node CoreV1Api
    void this.config.kubeconfigPath;
    void this.config.inCluster;
    return { nodes: [], nodePools: 0, totalGpus: 0 };
  }

  async getWorkload(
    name: string,
    namespace?: string
  ): Promise<ClusterWorkload | null> {
    // TODO: AppsV1Api.readNamespacedDeployment
    void name;
    void namespace;
    void this.config.namespace;
    return null;
  }

  async listWorkloads(namespace?: string): Promise<ClusterWorkload[]> {
    // TODO: list Deployments / StatefulSets / DaemonSets / Jobs
    void namespace;
    return [];
  }

  async getEvents(objectName: string): Promise<ClusterEvent[]> {
    // TODO: CoreV1Api.listNamespacedEvent filtered by involvedObject
    void objectName;
    return [];
  }

  async getAvailableCapacity(): Promise<ClusterCapacity> {
    // TODO: sum allocatable nvidia.com/gpu minus requests
    return { freeGpus: 0, pools: [] };
  }
}

export function createKubernetesCluster(
  config?: Record<string, unknown>
): KubernetesClusterInventory {
  return new KubernetesClusterInventory({
    kubeconfigPath: config?.kubeconfigPath as string | undefined,
    inCluster: Boolean(config?.inCluster),
    namespace: config?.namespace as string | undefined,
    clusterName: config?.clusterName as string | undefined,
  });
}
