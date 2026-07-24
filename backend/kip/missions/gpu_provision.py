from __future__ import annotations

from kip.capabilities import ResolvedStack
from kip.core import state_helpers as sh
from kip.missions.gpu_fleet import MissionPlan, MissionStep
from kip.types import MissionDefinition, MissionState


def build_gpu_provision_plan() -> MissionPlan:
    async def step_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "status": "running",
                "agents": sh.update_agent(
                    state.agents,
                    "kubernetes",
                    status="running",
                    progress=30,
                    currentAction="Scanning available GPU capacity...",
                ),
            }
        )

    async def step_capacity(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        capacity = await stack.cluster.get_available_capacity()
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "kubernetes",
                    status="complete",
                    progress=100,
                    completedActions=[
                        f"{capacity.freeGpus} GPUs available across {len(capacity.pools)} node pools"
                    ],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="kubernetes",
                    message="Cluster capacity scanned",
                    detail=f"{capacity.freeGpus} free GPUs · {len(capacity.pools)} node pools",
                    type="observation",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls,
                    tool="Kubernetes API",
                    status="complete",
                    result=f"{capacity.freeGpus} GPUs available",
                ),
                "confidence": 25,
            }
        )

    async def step_reqs(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        reqs = await stack.gpu.estimate_model_requirements(
            model_params_b=70, concurrent_users=2000
        )
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="running",
                    progress=45,
                    currentAction="Calculating model memory requirements...",
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="gpu",
                    message="Model requirements calculated",
                    detail=(
                        f"{reqs.modelSize} model · {reqs.vramGb}GB VRAM · "
                        f"{reqs.concurrentUsers} concurrent users"
                    ),
                    type="observation",
                ),
                "confidence": 40,
            }
        )

    async def step_compare(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        reqs = await stack.gpu.estimate_model_requirements(
            model_params_b=70, concurrent_users=2000
        )
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="complete",
                    progress=100,
                    completedActions=[
                        f"Requires ~{reqs.vramGb}GB VRAM for {reqs.modelSize} model",
                        f"Estimated {reqs.recommendedGpus}× {reqs.gpuType} for "
                        f"{reqs.concurrentUsers} concurrent users",
                    ],
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="capacity-comparison",
                    type="capacity-comparison",
                    title="GPU Configuration Comparison",
                    data={
                        "configs": [
                            {
                                "name": "A100 80GB × 4",
                                "vram": 320,
                                "throughput": "1,200 req/s",
                                "latency": "245ms p99",
                                "cost": 8400,
                                "fit": "adequate",
                            },
                            {
                                "name": "H100 80GB × 4",
                                "vram": 320,
                                "throughput": "2,400 req/s",
                                "latency": "128ms p99",
                                "cost": 12400,
                                "fit": "recommended",
                            },
                            {
                                "name": "L40S 48GB × 8",
                                "vram": 384,
                                "throughput": "1,800 req/s",
                                "latency": "190ms p99",
                                "cost": 9600,
                                "fit": "alternative",
                            },
                        ]
                    },
                ),
                "confidence": 65,
            }
        )

    async def step_cost_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "cost",
                    status="running",
                    progress=55,
                    currentAction="Estimating monthly cost...",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls, tool="Cost Calculator", status="running"
                ),
            }
        )

    async def step_cost_done(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        estimate = await stack.cost.estimate_provision(
            config_name="H100 80GB × 4", gpu_count=4, gpu_type="H100"
        )
        tools = [
            t.model_copy(update={"status": "complete"})
            if t.tool == "Cost Calculator"
            else t
            for t in state.toolCalls
        ]
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "cost",
                    status="complete",
                    progress=100,
                    completedActions=[
                        f"H100×4 estimated at ${estimate.monthly:,.0f}/mo"
                    ],
                ),
                "toolCalls": tools,
                "cards": sh.add_card(
                    state.cards,
                    id="cost-analysis",
                    type="cost-analysis",
                    title="Cost Projection",
                    data={
                        "monthly": estimate.monthly,
                        "hourly": estimate.hourly,
                        "breakdown": estimate.breakdown,
                        "savings": estimate.savings,
                    },
                ),
                "evidence": sh.add_evidence(
                    state.evidence,
                    source="Cost Model",
                    finding=(
                        f"H100×4 at ${estimate.monthly:,.0f}/mo — {estimate.savings}"
                    ),
                    status="confirmed",
                ),
                "confidence": 82,
            }
        )

    async def step_policy_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "policy",
                    status="running",
                    progress=60,
                    currentAction="Checking cluster policies and quotas...",
                ),
            }
        )

    async def step_approval(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        check = await stack.policy.validate_provision(
            namespace="ml-serving",
            node_pool="gpu-h100-west-2",
            gpu_count=4,
        )
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "policy",
                    status="complete",
                    progress=100,
                    completedActions=["Policy check passed · quota available"],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="policy",
                    message="Policy validation passed",
                    detail=(
                        f"GPU quota: {check.quotaAvailable or 16} available · "
                        "namespace approved"
                    ),
                    type="recommendation",
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="approval",
                    type="approval",
                    title="Provisioning Approval",
                    data={
                        "action": "Provision H100 80GB × 4",
                        "namespace": "ml-serving",
                        "nodePool": "gpu-h100-west-2",
                        "expectedImprovement": "2,400 req/s capacity",
                        "risk": "Low",
                        "requiresApproval": True,
                        "cost": "$12,400/mo",
                    },
                ),
                "rationale": mission.rationale,
                "confidence": 94,
                "status": "awaiting-approval",
            }
        )

    return MissionPlan(
        id="gpu-provision",
        steps=[
            MissionStep(0.4, step_start),
            MissionStep(0.8, step_capacity),
            MissionStep(0.7, step_reqs),
            MissionStep(0.9, step_compare),
            MissionStep(0.6, step_cost_start),
            MissionStep(0.8, step_cost_done),
            MissionStep(0.5, step_policy_start),
            MissionStep(0.7, step_approval),
        ],
    )
