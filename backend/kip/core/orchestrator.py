from __future__ import annotations

import asyncio

from kip.capabilities import RemediationAction, ResolvedStack
from kip.core.run_store import get_run_store
from kip.core.state_helpers import create_initial_agents, now_timestamp
from kip.missions import get_mission_plan
from kip.types import MissionDefinition, MissionState, TimelineEvent


def create_initial_mission_state(mission: MissionDefinition) -> MissionState:
    return MissionState(
        id=mission.id,
        status="idle",
        agents=create_initial_agents(mission.agents),
        timeline=[],
        toolCalls=[],
        evidence=[],
        cards=[],
        confidence=0,
    )


def _extract_pending_action(state: MissionState) -> RemediationAction | None:
    approval = next(
        (c for c in reversed(state.cards) if c.type == "approval"),
        None,
    )
    if not approval:
        return None
    d = approval.data
    return RemediationAction(
        action=str(d.get("action") or ""),
        from_=d.get("from"),
        to=d.get("to"),
        namespace=d.get("namespace"),
        nodePool=d.get("nodePool"),
        expectedImprovement=d.get("expectedImprovement"),
        risk=d.get("risk"),
        cost=d.get("cost"),
        requiresApproval=bool(d.get("requiresApproval")),
    )


class MissionOrchestrator:
    async def start(
        self,
        *,
        run_id: str,
        mission: MissionDefinition,
        stack: ResolvedStack,
    ) -> None:
        store = get_run_store()
        plan = get_mission_plan(mission.id)
        state = create_initial_mission_state(mission)
        state = state.model_copy(update={"status": "running"})
        store.update_state(run_id, state)

        for step in plan.steps:
            run = store.get(run_id)
            if not run or run.abort:
                return

            await asyncio.sleep(step.delay)
            state = await step.run(state, stack, mission)
            store.update_state(run_id, state)

            if state.status == "awaiting-approval":
                store.set_pending_action(run_id, _extract_pending_action(state))
                return

        if state.status not in ("awaiting-approval", "complete"):
            state = state.model_copy(update={"status": "complete"})
            store.update_state(run_id, state)

    async def approve(self, run_id: str, stack: ResolvedStack) -> MissionState:
        store = get_run_store()
        run = store.get(run_id)
        if not run:
            raise ValueError(f"Unknown run: {run_id}")

        action = run.pending_action or RemediationAction(action="Approved remediation")
        result = await stack.remediation.apply(action)
        timeline = list(run.state.timeline) + [
            TimelineEvent(
                id=f"tl-{len(run.state.timeline) + 1}",
                timestamp=now_timestamp(),
                agentId="policy",
                message=result.message,
                type="recommendation",
            )
        ]
        state = run.state.model_copy(
            update={"status": "complete", "timeline": timeline}
        )
        store.update_state(run_id, state)
        store.set_pending_action(run_id, None)
        return state

    async def reject(self, run_id: str, stack: ResolvedStack) -> MissionState:
        store = get_run_store()
        run = store.get(run_id)
        if not run:
            raise ValueError(f"Unknown run: {run_id}")

        action = run.pending_action or RemediationAction(action="Rejected remediation")
        result = await stack.remediation.reject(action)
        timeline = list(run.state.timeline) + [
            TimelineEvent(
                id=f"tl-{len(run.state.timeline) + 1}",
                timestamp=now_timestamp(),
                agentId="policy",
                message=result.message,
                type="observation",
            )
        ]
        state = run.state.model_copy(
            update={"status": "complete", "timeline": timeline}
        )
        store.update_state(run_id, state)
        store.set_pending_action(run_id, None)
        return state


def get_orchestrator() -> MissionOrchestrator:
    return MissionOrchestrator()
