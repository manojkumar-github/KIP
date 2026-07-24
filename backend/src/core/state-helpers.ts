import type {
  A2UICard,
  AgentId,
  AgentState,
  EvidenceItem,
  TimelineEvent,
  ToolCall,
} from "../types";

export function updateAgent(
  agents: AgentState[],
  id: AgentId,
  update: Partial<AgentState>
): AgentState[] {
  return agents.map((a) => (a.id === id ? { ...a, ...update } : a));
}

export function addTimeline(
  timeline: TimelineEvent[],
  event: Omit<TimelineEvent, "id">
): TimelineEvent[] {
  return [...timeline, { ...event, id: `tl-${timeline.length + 1}` }];
}

export function addCard(
  cards: A2UICard[],
  card: Omit<A2UICard, "visible">
): A2UICard[] {
  return [...cards, { ...card, visible: true }];
}

export function addToolCall(
  toolCalls: ToolCall[],
  call: Omit<ToolCall, "id">
): ToolCall[] {
  return [...toolCalls, { ...call, id: `tool-${toolCalls.length + 1}` }];
}

export function addEvidence(
  evidence: EvidenceItem[],
  item: Omit<EvidenceItem, "id">
): EvidenceItem[] {
  return [...evidence, { ...item, id: `ev-${evidence.length + 1}` }];
}

export function nowTimestamp(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function createInitialAgents(agentIds: AgentId[]): AgentState[] {
  return agentIds.map((id) => ({
    id,
    status: "waiting" as const,
    progress: 0,
    completedActions: [],
  }));
}
