from __future__ import annotations

from typing import Any

from kip.capabilities import (
    ClusterCapacity,
    ClusterEvent,
    ClusterWorkload,
    Topology,
)


class KubernetesClusterInventory:
    """
    Kubernetes ClusterInventory stub.

    Configure via Stack Manifest:
      cluster: { type: kubernetes, config: { kubeconfigPath: "~/.kube/config" } }
      — or —
      cluster: { type: kubernetes, config: { inCluster: true } }

    Wire kubernetes Python client in the TODO methods below.
    """

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        config = config or {}
        self.config = config
        self.name = str(config.get("clusterName") or "kubernetes")
        self.kubeconfig_path = config.get("kubeconfigPath")
        self.in_cluster = bool(config.get("inCluster"))
        self.namespace = config.get("namespace")

    async def get_topology(self) -> Topology:
        # TODO: kubernetes CoreV1Api.list_node()
        return Topology(nodes=[], nodePools=0, totalGpus=0)

    async def get_workload(
        self, name: str, namespace: str = "ml-serving"
    ) -> ClusterWorkload | None:
        # TODO: AppsV1Api.read_namespaced_deployment
        return None

    async def list_workloads(
        self, namespace: str | None = None
    ) -> list[ClusterWorkload]:
        # TODO: list Deployments / StatefulSets / DaemonSets / Jobs
        return []

    async def get_events(self, object_name: str) -> list[ClusterEvent]:
        # TODO: CoreV1Api.list_namespaced_event
        return []

    async def get_available_capacity(self) -> ClusterCapacity:
        # TODO: sum allocatable nvidia.com/gpu minus requests
        return ClusterCapacity(freeGpus=0, pools=[])


def create_kubernetes_cluster(config: dict[str, Any] | None = None):
    return KubernetesClusterInventory(config)
