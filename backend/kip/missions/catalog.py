from __future__ import annotations

from kip.types import MissionDefinition

MISSION_CATALOG: list[MissionDefinition] = [
    MissionDefinition(
        id="gpu-fleet",
        title="GPU Fleet Intelligence",
        prompt="Show me unhealthy or underutilized GPUs across production.",
        category="fleet",
        description="Analyze GPU fleet health, utilization, and cost efficiency",
        agents=["kubernetes", "gpu", "cost"],
        rationale=(
            "Detected 4 GPUs with >90% memory pressure → 2 underutilized (<15%) "
            "→ fragmentation on node gpu-7 → recommends rebalancing workloads."
        ),
    ),
    MissionDefinition(
        id="rag-incident",
        title="Investigate RAG Failure",
        prompt="Why is the RAG inference service failing?",
        category="incident",
        description="Correlate CUDA OOMs, KV-cache growth, and pod restarts",
        agents=["kubernetes", "gpu", "runtime", "incident", "policy"],
        rationale=(
            "Detected rising KV-cache allocation → correlated with replica imbalance "
            "→ checked GPU headroom → recommends redistributing two replicas."
        ),
    ),
    MissionDefinition(
        id="gpu-provision",
        title="Provision 70B Model Capacity",
        prompt="Provision capacity for a 70B model with 2,000 concurrent users.",
        category="capacity",
        description="Create capacity plan and compare GPU configurations",
        agents=["kubernetes", "gpu", "cost", "policy"],
        rationale=(
            "Analyzed model requirements (140GB VRAM) → compared A100/H100/L40S configs "
            "→ estimated $12.4K/mo for H100×4 → policy check passed."
        ),
    ),
]


def get_mission_definition(mission_id: str) -> MissionDefinition | None:
    return next((m for m in MISSION_CATALOG if m.id == mission_id), None)


def resolve_mission_from_prompt(prompt: str) -> MissionDefinition:
    exact = next(
        (m for m in MISSION_CATALOG if m.prompt.lower() == prompt.lower()),
        None,
    )
    if exact:
        return exact
    lower = prompt.lower()
    if "gpu" in lower and ("unhealthy" in lower or "underutil" in lower):
        return MISSION_CATALOG[0]
    if "provision" in lower or "70b" in lower or "capacity" in lower:
        return MISSION_CATALOG[2]
    return MISSION_CATALOG[1]
