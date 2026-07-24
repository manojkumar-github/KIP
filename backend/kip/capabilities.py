from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass
class ClusterNode:
    id: str
    pool: str
    gpuCount: int
    ready: bool


@dataclass
class ClusterWorkload:
    id: str
    name: str
    namespace: str
    kind: str
    replicas: int
    status: str
    age: str | None = None


@dataclass
class ClusterEvent:
    reason: str
    message: str
    object: str
    count: int


@dataclass
class ClusterCapacity:
    freeGpus: int
    pools: list[dict]


@dataclass
class Topology:
    nodes: list[ClusterNode]
    nodePools: int
    totalGpus: int


@runtime_checkable
class ClusterInventory(Protocol):
    name: str

    async def get_topology(self) -> Topology: ...

    async def get_workload(
        self, name: str, namespace: str = "ml-serving"
    ) -> ClusterWorkload | None: ...

    async def list_workloads(self, namespace: str | None = None) -> list[ClusterWorkload]: ...

    async def get_events(self, object_name: str) -> list[ClusterEvent]: ...

    async def get_available_capacity(self) -> ClusterCapacity: ...


@dataclass
class GpuNodeMetrics:
    id: str
    util: float
    memory: float
    temp: float
    status: str
    node: str | None = None


@dataclass
class ModelMemoryRequirements:
    modelSize: str
    vramGb: float
    concurrentUsers: int
    recommendedGpus: int
    gpuType: str


@runtime_checkable
class GpuTelemetry(Protocol):
    name: str

    async def get_fleet_metrics(self) -> list[GpuNodeMetrics]: ...

    async def get_node_metrics(self, node_id: str) -> GpuNodeMetrics | None: ...

    async def estimate_model_requirements(
        self, *, model_params_b: float, concurrent_users: int
    ) -> ModelMemoryRequirements: ...


@dataclass
class MetricSample:
    t: float
    value: float


@dataclass
class MetricSeries:
    name: str
    samples: list[MetricSample]
    unit: str | None = None


@dataclass
class LogHit:
    timestamp: str
    message: str
    count: int | None = None


@runtime_checkable
class Observability(Protocol):
    name: str

    async def query_metric(self, query: str, range_minutes: int = 15) -> MetricSeries: ...

    async def query_logs(self, query: str, range_minutes: int = 60) -> list[LogHit]: ...


@dataclass
class WasteEstimate:
    monthlyUsd: float
    detail: str
    idleGpus: int | None = None


@dataclass
class ProvisionEstimate:
    monthly: float
    breakdown: list[dict]
    savings: str
    configName: str
    hourly: float | None = None


@runtime_checkable
class CostModel(Protocol):
    name: str

    async def estimate_idle_waste(
        self, *, idle_gpus: int, fragmentation: bool = False
    ) -> WasteEstimate: ...

    async def estimate_provision(
        self, *, config_name: str, gpu_count: int, gpu_type: str
    ) -> ProvisionEstimate: ...


@dataclass
class PolicyCheckResult:
    allowed: bool
    reason: str
    quotaAvailable: int | None = None
    namespaceApproved: bool | None = None


@runtime_checkable
class PolicyGate(Protocol):
    name: str

    async def validate_remediation(self, **kwargs) -> PolicyCheckResult: ...

    async def validate_provision(
        self, *, namespace: str, node_pool: str, gpu_count: int
    ) -> PolicyCheckResult: ...


@dataclass
class KvCacheSnapshot:
    current: float
    baseline: float
    limit: float
    trend: list[float]
    growthPct: float


@dataclass
class UtilizationSlice:
    usage: float
    requests: float
    limits: float


@dataclass
class DeploymentUtilization:
    cpu: UtilizationSlice
    memory: UtilizationSlice
    gpu: UtilizationSlice


@dataclass
class OomSignal:
    count: int
    windowMinutes: int
    source: str


@runtime_checkable
class InferenceRuntime(Protocol):
    name: str

    async def get_kv_cache(self, workload: str) -> KvCacheSnapshot: ...

    async def get_utilization(self, workload: str) -> DeploymentUtilization: ...

    async def get_cuda_oom_signals(self, workload: str) -> OomSignal: ...


@dataclass
class RemediationAction:
    action: str
    from_: str | None = None
    to: str | None = None
    namespace: str | None = None
    nodePool: str | None = None
    expectedImprovement: str | None = None
    risk: str | None = None
    cost: str | None = None
    requiresApproval: bool = False


@dataclass
class RemediationResult:
    status: str
    message: str


@runtime_checkable
class RemediationExecutor(Protocol):
    name: str

    async def apply(self, action: RemediationAction) -> RemediationResult: ...

    async def reject(self, action: RemediationAction) -> RemediationResult: ...


@dataclass
class ResolvedStack:
    id: str
    displayName: str
    cluster: ClusterInventory
    gpu: GpuTelemetry
    observability: Observability
    cost: CostModel
    policy: PolicyGate
    runtime: InferenceRuntime
    remediation: RemediationExecutor
