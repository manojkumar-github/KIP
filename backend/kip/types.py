from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

AgentId = Literal["kubernetes", "gpu", "runtime", "incident", "cost", "policy"]
AgentStatus = Literal["waiting", "running", "complete", "error"]
MissionStatus = Literal["idle", "running", "complete", "awaiting-approval"]
CapabilityKind = Literal[
    "cluster",
    "gpu",
    "observability",
    "cost",
    "policy",
    "runtime",
    "remediation",
]

CAPABILITY_KINDS: tuple[CapabilityKind, ...] = (
    "cluster",
    "gpu",
    "observability",
    "cost",
    "policy",
    "runtime",
    "remediation",
)


class AgentState(BaseModel):
    id: AgentId
    status: AgentStatus
    progress: float = 0
    currentAction: str | None = None
    completedActions: list[str] = Field(default_factory=list)


class TimelineEvent(BaseModel):
    id: str
    timestamp: str
    agentId: AgentId
    message: str
    detail: str | None = None
    type: Literal["observation", "hypothesis", "tool", "correlation", "recommendation"]


class ToolCall(BaseModel):
    id: str
    tool: str
    status: Literal["pending", "running", "complete", "error"]
    result: str | None = None


class EvidenceItem(BaseModel):
    id: str
    source: str
    finding: str
    status: Literal["confirmed", "warning", "critical"]


class A2UICard(BaseModel):
    id: str
    type: str
    title: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    visible: bool = True


class MissionDefinition(BaseModel):
    id: str
    title: str
    prompt: str
    category: Literal["fleet", "incident", "capacity"]
    description: str
    agents: list[AgentId]
    rationale: str


class MissionState(BaseModel):
    id: str
    status: MissionStatus
    agents: list[AgentState] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    toolCalls: list[ToolCall] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    cards: list[A2UICard] = Field(default_factory=list)
    confidence: float = 0
    rationale: str | None = None


class ProviderRef(BaseModel):
    type: str
    config: dict[str, Any] = Field(default_factory=dict)


class StackMetadata(BaseModel):
    name: str


class StackSpec(BaseModel):
    displayName: str
    providers: dict[CapabilityKind, ProviderRef]


class StackManifest(BaseModel):
    apiVersion: Literal["kip.ai/v1"] = "kip.ai/v1"
    kind: Literal["StackManifest"] = "StackManifest"
    metadata: StackMetadata
    spec: StackSpec
