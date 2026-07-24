from __future__ import annotations

from datetime import datetime
from typing import Any

from kip.types import (
    A2UICard,
    AgentId,
    AgentState,
    EvidenceItem,
    TimelineEvent,
    ToolCall,
)


def create_initial_agents(agent_ids: list[AgentId]) -> list[AgentState]:
    return [
        AgentState(id=aid, status="waiting", progress=0, completedActions=[])
        for aid in agent_ids
    ]


def update_agent(
    agents: list[AgentState], agent_id: AgentId, **update: Any
) -> list[AgentState]:
    out: list[AgentState] = []
    for a in agents:
        if a.id == agent_id:
            data = a.model_dump()
            data.update(update)
            out.append(AgentState(**data))
        else:
            out.append(a)
    return out


def now_timestamp() -> str:
    return datetime.now().strftime("%H:%M:%S")


def add_timeline(
    timeline: list[TimelineEvent], **event: Any
) -> list[TimelineEvent]:
    return [
        *timeline,
        TimelineEvent(id=f"tl-{len(timeline) + 1}", **event),
    ]


def add_tool_call(tool_calls: list[ToolCall], **call: Any) -> list[ToolCall]:
    return [
        *tool_calls,
        ToolCall(id=f"tool-{len(tool_calls) + 1}", **call),
    ]


def add_evidence(evidence: list[EvidenceItem], **item: Any) -> list[EvidenceItem]:
    return [
        *evidence,
        EvidenceItem(id=f"ev-{len(evidence) + 1}", **item),
    ]


def add_card(cards: list[A2UICard], **card: Any) -> list[A2UICard]:
    return [
        *cards,
        A2UICard(visible=True, **card),
    ]
