from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from kip.capabilities import ResolvedStack
from kip.core import state_helpers as sh
from kip.types import MissionDefinition, MissionState

StepFn = Callable[..., Awaitable[MissionState]]


@dataclass
class MissionStep:
    delay: float  # seconds
    run: StepFn


@dataclass
class MissionPlan:
    id: str
    steps: list[MissionStep]


def build_gpu_fleet_plan() -> MissionPlan:
    async def step_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "status": "running",
                "agents": sh.update_agent(
                    state.agents,
                    "kubernetes",
                    status="running",
                    progress=20,
                    currentAction="Loading cluster topology...",
                ),
            }
        )

    async def step_topology(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        topology = await stack.cluster.get_topology()
        workloads = await stack.cluster.list_workloads()
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "kubernetes",
                    status="complete",
                    progress=100,
                    currentAction=None,
                    completedActions=[
                        f"Loaded {topology.totalGpus} GPU nodes across {topology.nodePools} node pools"
                    ],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="kubernetes",
                    message="Loaded cluster topology",
                    detail=f"{topology.totalGpus} GPUs across {topology.nodePools} node pools",
                    type="observation",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls,
                    tool="Kubernetes API",
                    status="complete",
                    result=f"{len(topology.nodes)} nodes, {len(workloads)} workloads",
                ),
            }
        )

    async def step_dcgm_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="running",
                    progress=30,
                    currentAction="Querying DCGM metrics...",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls, tool="NVIDIA DCGM", status="running"
                ),
            }
        )

    async def step_pressure(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        fleet = await stack.gpu.get_fleet_metrics()
        critical = [g for g in fleet if g.memory > 90]
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="running",
                    progress=70,
                    currentAction="Analyzing utilization patterns...",
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="gpu",
                    message="Detected GPU memory pressure",
                    detail=f"{len(critical)} GPUs above 90% memory threshold",
                    type="observation",
                ),
                "evidence": sh.add_evidence(
                    state.evidence,
                    source="DCGM",
                    finding=f"{len(critical)} GPUs with >90% memory utilization",
                    status="critical",
                ),
            }
        )

    async def step_heatmap(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        fleet = await stack.gpu.get_fleet_metrics()
        critical = len([g for g in fleet if g.status == "critical"])
        idle = len([g for g in fleet if g.status == "idle"])
        tools = []
        for t in state.toolCalls:
            if t.tool == "NVIDIA DCGM":
                tools.append(
                    t.model_copy(
                        update={
                            "status": "complete",
                            "result": f"{critical} critical, {idle} idle",
                        }
                    )
                )
            else:
                tools.append(t)
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="complete",
                    progress=100,
                    currentAction=None,
                    completedActions=[
                        f"Found {critical} unhealthy GPUs",
                        f"Identified {idle} underutilized GPUs (<15%)",
                    ],
                ),
                "toolCalls": tools,
                "cards": sh.add_card(
                    state.cards,
                    id="gpu-heatmap",
                    type="gpu-heatmap",
                    title="GPU Fleet Heatmap",
                    data={
                        "nodes": [
                            {
                                "id": g.id,
                                "util": g.util,
                                "memory": g.memory,
                                "temp": g.temp,
                                "status": g.status,
                            }
                            for g in fleet
                        ]
                    },
                ),
                "confidence": 45,
            }
        )

    async def step_cost_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        await stack.observability.query_metric("gpu_utilization")
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "cost",
                    status="running",
                    progress=50,
                    currentAction="Calculating cost efficiency...",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls,
                    tool="Prometheus",
                    status="complete",
                    result="Utilization metrics fetched",
                ),
            }
        )

    async def step_fleet_summary(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        fleet = await stack.gpu.get_fleet_metrics()
        idle = len([g for g in fleet if g.status == "idle"])
        critical = len([g for g in fleet if g.status == "critical"])
        topology = await stack.cluster.get_topology()
        waste = await stack.cost.estimate_idle_waste(idle_gpus=idle, fragmentation=True)
        avg_util = round(sum(g.util for g in fleet) / max(len(fleet), 1))
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "cost",
                    status="complete",
                    progress=100,
                    completedActions=[
                        f"Estimated ${waste.monthlyUsd / 1000:.1f}K/mo waste from idle GPUs"
                    ],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="cost",
                    message="Cost inefficiency detected",
                    detail=waste.detail,
                    type="correlation",
                ),
                "evidence": sh.add_evidence(
                    state.evidence,
                    source="Cost Analysis",
                    finding=f"${waste.monthlyUsd:,.0f}/mo waste from idle GPU capacity",
                    status="warning",
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="gpu-fleet",
                    type="gpu-fleet",
                    title="Fleet Summary",
                    data={
                        "total": topology.totalGpus,
                        "healthy": topology.totalGpus - critical,
                        "critical": critical,
                        "idle": idle,
                        "avgUtil": avg_util,
                        "costWaste": waste.monthlyUsd,
                    },
                ),
                "confidence": 78,
            }
        )

    async def step_recommend(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "cards": sh.add_card(
                    state.cards,
                    id="recommendation",
                    type="recommendation",
                    title="Recommended Actions",
                    data={
                        "actions": [
                            "Rebalance rag-prod-inference replicas from gpu-3 to gpu-2",
                            "Consolidate idle workloads on gpu-6 to free gpu-7",
                            "Enable dynamic GPU fractions for embedding-v2",
                        ],
                        "impact": "+38% fleet efficiency",
                        "risk": "Low",
                    },
                ),
                "confidence": 87,
                "rationale": mission.rationale,
            }
        )

    async def step_complete(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "status": "complete",
                "confidence": 91,
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="gpu",
                    message="Recommendation generated",
                    detail="Rebalance 2 replicas, consolidate idle GPUs",
                    type="recommendation",
                ),
            }
        )

    return MissionPlan(
        id="gpu-fleet",
        steps=[
            MissionStep(0.4, step_start),
            MissionStep(0.8, step_topology),
            MissionStep(0.6, step_dcgm_start),
            MissionStep(0.9, step_pressure),
            MissionStep(0.7, step_heatmap),
            MissionStep(0.6, step_cost_start),
            MissionStep(0.8, step_fleet_summary),
            MissionStep(0.5, step_recommend),
            MissionStep(0.4, step_complete),
        ],
    )
