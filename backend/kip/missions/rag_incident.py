from __future__ import annotations

from kip.capabilities import ResolvedStack
from kip.core import state_helpers as sh
from kip.missions.gpu_fleet import MissionPlan, MissionStep
from kip.types import MissionDefinition, MissionState


def build_rag_incident_plan() -> MissionPlan:
    workload = "rag-prod-inference"

    async def step_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "status": "running",
                "agents": sh.update_agent(
                    state.agents,
                    "kubernetes",
                    status="running",
                    progress=25,
                    currentAction=f"Locating {workload} deployment...",
                ),
            }
        )

    async def step_found(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        wl = await stack.cluster.get_workload(workload)
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "kubernetes",
                    status="complete",
                    progress=100,
                    completedActions=[
                        f"Found {wl.kind if wl else 'Deployment'} {workload} "
                        f"({wl.replicas if wl else 3} replicas)"
                    ],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="kubernetes",
                    message="Found Deployment",
                    detail=(
                        f"{workload} · {wl.replicas if wl else 3} replicas · "
                        f"ns: {wl.namespace if wl else 'ml-serving'}"
                    ),
                    type="observation",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls,
                    tool="Kubernetes API",
                    status="complete",
                    result=f"Deployment {workload}",
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="status-badges",
                    type="status-badges",
                    data={
                        "name": workload,
                        "type": wl.kind if wl else "Deployment",
                        "badges": [
                            {"label": "Memory", "status": "critical"},
                            {"label": "Conditions", "status": "healthy"},
                            {"label": "CPU", "status": "healthy"},
                            {"label": "Pods", "status": "warning"},
                            {"label": "GPU", "status": "critical"},
                        ],
                    },
                ),
                "confidence": 20,
            }
        )

    async def step_gpu_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="running",
                    progress=40,
                    currentAction="Checking GPU memory on assigned nodes...",
                ),
            }
        )

    async def step_gpu_done(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        metrics = await stack.gpu.get_node_metrics("gpu-3")
        mem = metrics.memory if metrics else 94
        node = metrics.node if metrics and metrics.node else "gpu-west-2a-7"
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "gpu",
                    status="complete",
                    progress=100,
                    completedActions=[f"GPU 6 at {mem}% memory on node {node}"],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="gpu",
                    message="Detected GPU 6 memory pressure",
                    detail=f"{mem}% memory · node {node}",
                    type="observation",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls,
                    tool="NVIDIA DCGM",
                    status="complete",
                    result=f"GPU 6: {mem}% memory",
                ),
                "evidence": sh.add_evidence(
                    state.evidence,
                    source="DCGM",
                    finding=f"GPU 6 memory at {mem}% — approaching OOM threshold",
                    status="critical",
                ),
                "confidence": 45,
            }
        )

    async def step_runtime_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "runtime",
                    status="running",
                    progress=35,
                    currentAction="Analyzing KV-cache growth...",
                ),
                "toolCalls": sh.add_tool_call(
                    state.toolCalls, tool="Grafana / Mimir", status="running"
                ),
            }
        )

    async def step_kv(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        kv = await stack.runtime.get_kv_cache(workload)
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "runtime",
                    status="running",
                    progress=75,
                    currentAction="Correlating CUDA OOM events...",
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="runtime",
                    message=f"KV cache grew to {kv.current}GB",
                    detail=f"+{kv.growthPct}% over 15 minutes",
                    type="hypothesis",
                ),
                "evidence": sh.add_evidence(
                    state.evidence,
                    source="Runtime Telemetry",
                    finding=f"KV-cache grew from {kv.baseline}GB to {kv.current}GB in 15 min",
                    status="critical",
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="kv-cache",
                    type="kv-cache",
                    title="KV-Cache Growth",
                    data={
                        "current": kv.current,
                        "baseline": kv.baseline,
                        "limit": kv.limit,
                        "trend": kv.trend,
                    },
                ),
                "confidence": 65,
            }
        )

    async def step_util(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        oom = await stack.runtime.get_cuda_oom_signals(workload)
        util = await stack.runtime.get_utilization(workload)
        events = await stack.cluster.get_events(workload)
        logs = await stack.observability.query_logs("CUDA OOM")
        tools = [
            t.model_copy(update={"status": "complete"})
            if t.tool == "Grafana / Mimir"
            else t
            for t in state.toolCalls
        ]
        evidence = sh.add_evidence(
            state.evidence,
            source="Loki" if logs else oom.source,
            finding=f"{oom.count} CUDA OOM errors in last {oom.windowMinutes} minutes",
            status="critical",
        )
        evidence = sh.add_evidence(
            evidence,
            source="Kubernetes Events",
            finding=events[0].message
            if events
            else f"Pod {workload}-7f8d9 restarted 4 times",
            status="warning",
        )
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "runtime",
                    status="complete",
                    progress=100,
                    completedActions=[
                        f"CUDA OOM detected {oom.count} times in last hour"
                    ],
                ),
                "toolCalls": tools,
                "evidence": evidence,
                "cards": sh.add_card(
                    state.cards,
                    id="utilization",
                    type="utilization",
                    title="Deployment Utilization",
                    data={
                        "cpu": {
                            "usage": util.cpu.usage,
                            "requests": util.cpu.requests,
                            "limits": util.cpu.limits,
                        },
                        "memory": {
                            "usage": util.memory.usage,
                            "requests": util.memory.requests,
                            "limits": util.memory.limits,
                        },
                        "gpu": {
                            "usage": util.gpu.usage,
                            "requests": util.gpu.requests,
                            "limits": util.gpu.limits,
                        },
                    },
                ),
                "confidence": 78,
            }
        )

    async def step_incident_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "incident",
                    status="running",
                    progress=60,
                    currentAction="Building incident timeline...",
                ),
            }
        )

    async def step_root_cause(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "incident",
                    status="complete",
                    progress=100,
                    completedActions=["Root cause identified with 91% confidence"],
                ),
                "timeline": sh.add_timeline(
                    state.timeline,
                    timestamp=sh.now_timestamp(),
                    agentId="incident",
                    message="Root cause correlated",
                    detail="Replica imbalance + KV-cache growth → CUDA OOM",
                    type="correlation",
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="root-cause",
                    type="root-cause",
                    title="Root Cause Analysis",
                    data={
                        "cause": "KV-cache memory exhaustion due to replica imbalance",
                        "chain": [
                            "Traffic spike increased concurrent requests by 3.2×",
                            "2 of 3 replicas landed on same GPU node",
                            "KV-cache allocation grew 340% without redistribution",
                            "CUDA OOM triggered pod restarts (4× in 1 hour)",
                        ],
                        "confidence": 91,
                    },
                ),
                "confidence": 91,
                "rationale": mission.rationale,
            }
        )

    async def step_policy_start(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "policy",
                    status="running",
                    progress=50,
                    currentAction="Validating remediation against policies...",
                ),
            }
        )

    async def step_approval(state: MissionState, stack: ResolvedStack, mission: MissionDefinition):
        check = await stack.policy.validate_remediation(
            action="Redistribute 2 replicas",
            from_="gpu-west-2a-7",
            to="gpu-west-2a-3",
            namespace="ml-serving",
        )
        return state.model_copy(
            update={
                "agents": sh.update_agent(
                    state.agents,
                    "policy",
                    status="complete",
                    progress=100,
                    completedActions=[check.reason],
                ),
                "cards": sh.add_card(
                    state.cards,
                    id="approval",
                    type="approval",
                    title="Remediation Approval",
                    data={
                        "action": "Redistribute 2 replicas",
                        "from": "gpu-west-2a-7",
                        "to": "gpu-west-2a-3",
                        "expectedImprovement": "+38% memory headroom",
                        "risk": "Low",
                        "requiresApproval": True,
                    },
                ),
                "status": "awaiting-approval",
                "confidence": 91,
            }
        )

    return MissionPlan(
        id="rag-incident",
        steps=[
            MissionStep(0.3, step_start),
            MissionStep(0.7, step_found),
            MissionStep(0.6, step_gpu_start),
            MissionStep(0.9, step_gpu_done),
            MissionStep(0.7, step_runtime_start),
            MissionStep(0.8, step_kv),
            MissionStep(0.6, step_util),
            MissionStep(0.5, step_incident_start),
            MissionStep(0.7, step_root_cause),
            MissionStep(0.5, step_policy_start),
            MissionStep(0.6, step_approval),
        ],
    )
