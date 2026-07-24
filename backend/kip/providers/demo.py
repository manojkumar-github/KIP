from __future__ import annotations

from kip.capabilities import (
    ClusterCapacity,
    ClusterEvent,
    ClusterNode,
    ClusterWorkload,
    CostModel,
    DeploymentUtilization,
    GpuNodeMetrics,
    GpuTelemetry,
    InferenceRuntime,
    KvCacheSnapshot,
    LogHit,
    MetricSample,
    MetricSeries,
    ModelMemoryRequirements,
    Observability,
    OomSignal,
    PolicyCheckResult,
    PolicyGate,
    ProvisionEstimate,
    RemediationAction,
    RemediationExecutor,
    RemediationResult,
    Topology,
    UtilizationSlice,
    WasteEstimate,
)
from kip.types import CapabilityKind


class DemoClusterInventory:
    name = "demo-cluster"

    async def get_topology(self) -> Topology:
        nodes = [
            ClusterNode(
                id=f"gpu-node-{i + 1}",
                pool=f"pool-{(i % 6) + 1}",
                gpuCount=1,
                ready=True,
            )
            for i in range(48)
        ]
        return Topology(nodes=nodes, nodePools=6, totalGpus=48)

    async def get_workload(
        self, name: str, namespace: str = "ml-serving"
    ) -> ClusterWorkload | None:
        workloads = await self.list_workloads(namespace)
        return next((w for w in workloads if w.name == name), None)

    async def list_workloads(
        self, namespace: str | None = None
    ) -> list[ClusterWorkload]:
        items = [
            ClusterWorkload(
                id="1",
                name="rag-prod-inference",
                namespace="ml-serving",
                kind="Deployment",
                replicas=3,
                status="critical",
                age="12 w 3 d",
            ),
            ClusterWorkload(
                id="2",
                name="llama-70b-serving",
                namespace="ml-serving",
                kind="Deployment",
                replicas=4,
                status="healthy",
                age="8 w 1 d",
            ),
            ClusterWorkload(
                id="3",
                name="embedding-v2",
                namespace="ml-serving",
                kind="Deployment",
                replicas=2,
                status="healthy",
                age="6 w 5 d",
            ),
        ]
        if namespace:
            return [w for w in items if w.namespace == namespace]
        return items

    async def get_events(self, object_name: str) -> list[ClusterEvent]:
        if "rag-prod" in object_name:
            return [
                ClusterEvent(
                    reason="BackOff",
                    message=f"Pod {object_name}-7f8d9 restarted 4 times",
                    object=object_name,
                    count=4,
                )
            ]
        return []

    async def get_available_capacity(self) -> ClusterCapacity:
        return ClusterCapacity(
            freeGpus=12,
            pools=[
                {"name": "gpu-h100-west-2", "freeGpus": 6},
                {"name": "gpu-a100-west-2", "freeGpus": 4},
                {"name": "gpu-l40s-west-2", "freeGpus": 2},
            ],
        )


class DemoGpuTelemetry:
    name = "demo-gpu"
    _fleet = [
        GpuNodeMetrics("gpu-1", 78, 82, 72, "healthy"),
        GpuNodeMetrics("gpu-2", 12, 8, 45, "idle"),
        GpuNodeMetrics("gpu-3", 94, 96, 84, "critical", "gpu-west-2a-7"),
        GpuNodeMetrics("gpu-4", 88, 91, 79, "warning"),
        GpuNodeMetrics("gpu-5", 65, 70, 68, "healthy"),
        GpuNodeMetrics("gpu-6", 11, 6, 42, "idle"),
        GpuNodeMetrics("gpu-7", 92, 94, 86, "critical", "gpu-west-2a-7"),
        GpuNodeMetrics("gpu-8", 71, 74, 70, "healthy"),
    ]

    async def get_fleet_metrics(self) -> list[GpuNodeMetrics]:
        return list(self._fleet)

    async def get_node_metrics(self, node_id: str) -> GpuNodeMetrics | None:
        return next(
            (g for g in self._fleet if g.id == node_id or g.node == node_id),
            None,
        )

    async def estimate_model_requirements(
        self, *, model_params_b: float, concurrent_users: int
    ) -> ModelMemoryRequirements:
        return ModelMemoryRequirements(
            modelSize=f"{int(model_params_b)}B",
            vramGb=model_params_b * 2,
            concurrentUsers=concurrent_users,
            recommendedGpus=4 if concurrent_users >= 2000 else 2,
            gpuType="H100",
        )


class DemoObservability:
    name = "demo-observability"

    async def query_metric(self, query: str, range_minutes: int = 15) -> MetricSeries:
        return MetricSeries(
            name=query,
            unit="percent",
            samples=[
                MetricSample(0, 55),
                MetricSample(1, 60),
                MetricSample(2, 62),
            ],
        )

    async def query_logs(self, query: str, range_minutes: int = 60) -> list[LogHit]:
        q = query.lower()
        if "oom" in q or "cuda" in q:
            return [LogHit(timestamp="08:40:12", message="CUDA out of memory", count=7)]
        return []


class DemoCostModel:
    name = "demo-cost"

    async def estimate_idle_waste(
        self, *, idle_gpus: int, fragmentation: bool = False
    ) -> WasteEstimate:
        base = idle_gpus * 900
        frag = 300 if fragmentation else 0
        total = base + frag
        detail = f"${total}/mo from {idle_gpus} idle GPUs"
        if fragmentation:
            detail += " + fragmentation"
        return WasteEstimate(monthlyUsd=total, detail=detail, idleGpus=idle_gpus)

    async def estimate_provision(
        self, *, config_name: str, gpu_count: int, gpu_type: str
    ) -> ProvisionEstimate:
        unit = {"H100": 3100, "A100": 2100}.get(gpu_type, 1200)
        gpu_compute = unit * gpu_count
        storage, network, overhead = 1200, 800, 600
        monthly = gpu_compute + storage + network + overhead
        return ProvisionEstimate(
            monthly=monthly,
            hourly=round(monthly / 730, 1),
            breakdown=[
                {"label": "GPU compute", "amount": gpu_compute},
                {"label": "Storage", "amount": storage},
                {"label": "Network", "amount": network},
                {"label": "Overhead", "amount": overhead},
            ],
            savings="23% vs current over-provisioned setup",
            configName=config_name,
        )


class DemoPolicyGate:
    name = "demo-policy"

    async def validate_remediation(self, **kwargs) -> PolicyCheckResult:
        return PolicyCheckResult(
            allowed=True,
            reason="Remediation plan approved by policy engine",
            namespaceApproved=True,
        )

    async def validate_provision(
        self, *, namespace: str, node_pool: str, gpu_count: int
    ) -> PolicyCheckResult:
        return PolicyCheckResult(
            allowed=True,
            reason=(
                f"Policy check passed · quota available for {gpu_count} "
                f"GPUs in {node_pool}"
            ),
            quotaAvailable=16,
            namespaceApproved=True,
        )


class DemoInferenceRuntime:
    name = "demo-runtime"

    async def get_kv_cache(self, workload: str) -> KvCacheSnapshot:
        return KvCacheSnapshot(
            current=1.8,
            baseline=0.4,
            limit=2.0,
            trend=[0.4, 0.6, 0.9, 1.2, 1.5, 1.8],
            growthPct=340,
        )

    async def get_utilization(self, workload: str) -> DeploymentUtilization:
        return DeploymentUtilization(
            cpu=UtilizationSlice(45, 60, 80),
            memory=UtilizationSlice(94, 70, 96),
            gpu=UtilizationSlice(94, 80, 100),
        )

    async def get_cuda_oom_signals(self, workload: str) -> OomSignal:
        return OomSignal(count=7, windowMinutes=60, source="Loki")


class DemoRemediationExecutor:
    name = "demo-remediation"

    async def apply(self, action: RemediationAction) -> RemediationResult:
        return RemediationResult(status="applied", message=f"Applied: {action.action}")

    async def reject(self, action: RemediationAction) -> RemediationResult:
        return RemediationResult(
            status="rejected", message=f"Rejected: {action.action}"
        )


DEMO_CAPABILITIES: list[CapabilityKind] = [
    "cluster",
    "gpu",
    "observability",
    "cost",
    "policy",
    "runtime",
    "remediation",
]


def create_demo_capability(kind: CapabilityKind):
    mapping = {
        "cluster": DemoClusterInventory,
        "gpu": DemoGpuTelemetry,
        "observability": DemoObservability,
        "cost": DemoCostModel,
        "policy": DemoPolicyGate,
        "runtime": DemoInferenceRuntime,
        "remediation": DemoRemediationExecutor,
    }
    return mapping[kind]()
