from __future__ import annotations

from kip.missions.catalog import (
    MISSION_CATALOG,
    get_mission_definition,
    resolve_mission_from_prompt,
)
from kip.missions.gpu_fleet import MissionPlan, build_gpu_fleet_plan
from kip.missions.gpu_provision import build_gpu_provision_plan
from kip.missions.rag_incident import build_rag_incident_plan


def get_mission_plan(mission_id: str) -> MissionPlan:
    if mission_id == "gpu-fleet":
        return build_gpu_fleet_plan()
    if mission_id == "rag-incident":
        return build_rag_incident_plan()
    if mission_id == "gpu-provision":
        return build_gpu_provision_plan()
    raise ValueError(f"Unknown mission plan: {mission_id}")


__all__ = [
    "MISSION_CATALOG",
    "get_mission_definition",
    "resolve_mission_from_prompt",
    "get_mission_plan",
    "MissionPlan",
]
