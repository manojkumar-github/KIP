"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgentName } from "@/lib/mission-simulator";
import type {
  AgentState,
  EvidenceItem,
  MissionState,
  TimelineEvent,
  ToolCall,
} from "@/lib/types";

interface AgentActivityPanelProps {
  missionState: MissionState | null;
  missionTitle?: string;
}

export function AgentActivityPanel({ missionState, missionTitle }: AgentActivityPanelProps) {
  if (!missionState) {
    return (
      <aside className="flex w-[300px] shrink-0 flex-col border-l border-dt-border bg-dt-surface">
        <PanelHeader title="Agent Activity" />
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Bot className="mb-3 h-8 w-8 text-dt-text-dim" />
          <p className="text-[12px] text-dt-text-muted">
            Start a mission to see agents collaborate in real time
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-dt-border bg-dt-surface">
      <PanelHeader title={missionTitle ?? "Agent Activity"} />

      <div className="flex-1 overflow-y-auto">
        {/* Agent collaboration status */}
        <section className="border-b border-dt-border p-3">
          <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
            Participating Agents
          </h4>
          <div className="space-y-2">
            {missionState.agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        {/* Confidence */}
        {missionState.confidence > 0 && (
          <section className="border-b border-dt-border p-3">
            <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
              Evidence Score
            </h4>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-dt-surface-3">
                <motion.div
                  className="h-full rounded-full bg-dt-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${missionState.confidence}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[13px] font-semibold text-dt-accent">
                {missionState.confidence}%
              </span>
            </div>
            <p className="mt-1 text-[10px] text-dt-text-dim">
              Supported by {missionState.evidence.length} independent sources
            </p>
          </section>
        )}

        {/* Tool calls */}
        {missionState.toolCalls.length > 0 && (
          <section className="border-b border-dt-border p-3">
            <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
              Tool Calls
            </h4>
            <div className="space-y-1.5">
              {missionState.toolCalls.map((tool) => (
                <ToolCallRow key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        {/* Evidence */}
        {missionState.evidence.length > 0 && (
          <section className="border-b border-dt-border p-3">
            <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
              Evidence
            </h4>
            <div className="space-y-1.5">
              {missionState.evidence.map((ev) => (
                <EvidenceRow key={ev.id} evidence={ev} />
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        {missionState.timeline.length > 0 && (
          <section className="p-3">
            <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
              Mission Timeline
            </h4>
            <div className="space-y-0">
              <AnimatePresence>
                {missionState.timeline.map((event, i) => (
                  <TimelineRow
                    key={event.id}
                    event={event}
                    isLast={i === missionState.timeline.length - 1}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-dt-border px-3 py-2.5">
      <h3 className="text-[12px] font-semibold text-dt-text">{title}</h3>
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentState }) {
  const statusIcon = {
    waiting: <Clock className="h-3 w-3 text-dt-text-dim" />,
    running: <Loader2 className="h-3 w-3 animate-spin text-dt-accent" />,
    complete: <Check className="h-3 w-3 text-dt-green" />,
    error: <span className="text-dt-red">!</span>,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-md bg-dt-surface-2 p-2"
    >
      <div className="flex items-center gap-2">
        {statusIcon[agent.status]}
        <span className="flex-1 text-[11px] font-medium text-dt-text">
          {getAgentName(agent.id)}
        </span>
        <span
          className={cn(
            "text-[10px] capitalize",
            agent.status === "complete"
              ? "text-dt-green"
              : agent.status === "running"
                ? "text-dt-accent"
                : "text-dt-text-dim"
          )}
        >
          {agent.status}
        </span>
      </div>

      {agent.status === "running" && (
        <div className="mt-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-dt-surface-3">
            <motion.div
              className="h-full rounded-full bg-dt-accent"
              animate={{ width: `${agent.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {agent.currentAction && (
            <p className="mt-1 text-[10px] text-dt-text-dim">{agent.currentAction}</p>
          )}
        </div>
      )}

      {agent.completedActions.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {agent.completedActions.map((action, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px] text-dt-text-muted">
              <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-dt-green" />
              {action}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ToolCallRow({ tool }: { tool: ToolCall }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Wrench className="h-3 w-3 shrink-0 text-dt-text-dim" />
      <span className="flex-1 text-dt-text-muted">{tool.tool}</span>
      {tool.status === "complete" && <Check className="h-3 w-3 text-dt-green" />}
      {tool.status === "running" && (
        <Loader2 className="h-3 w-3 animate-spin text-dt-accent" />
      )}
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: EvidenceItem }) {
  const statusColors = {
    confirmed: "text-dt-green",
    warning: "text-dt-amber",
    critical: "text-dt-red",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 text-[11px]"
    >
      <Check className={cn("mt-0.5 h-3 w-3 shrink-0", statusColors[evidence.status])} />
      <div>
        <span className="font-medium text-dt-text-muted">{evidence.source}</span>
        <span className="text-dt-text-dim"> — </span>
        <span className="text-dt-text-muted">{evidence.finding}</span>
      </div>
    </motion.div>
  );
}

function TimelineRow({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const typeColors = {
    observation: "bg-dt-accent",
    hypothesis: "bg-dt-amber",
    tool: "bg-dt-purple",
    correlation: "bg-dt-green",
    recommendation: "bg-dt-accent",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      <div className="flex flex-col items-center">
        <div className={cn("h-2 w-2 rounded-full", typeColors[event.type])} />
        {!isLast && <div className="w-px flex-1 bg-dt-border" />}
      </div>
      <div className="pb-3">
        <div className="text-[10px] text-dt-text-dim">{event.timestamp}</div>
        <div className="text-[11px] font-medium text-dt-text-muted">
          {getAgentName(event.agentId)}
        </div>
        <div className="text-[11px] text-dt-text">{event.message}</div>
        {event.detail && (
          <div className="text-[10px] text-dt-text-dim">{event.detail}</div>
        )}
      </div>
    </motion.div>
  );
}

interface AgentAccordionProps {
  agentId: string;
  actions: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function AgentAccordion({
  agentId,
  actions,
  isExpanded,
  onToggle,
}: AgentAccordionProps) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md bg-dt-surface-2 px-3 py-2 text-left transition-colors hover:bg-dt-surface-3"
    >
      {isExpanded ? (
        <ChevronDown className="h-3.5 w-3.5 text-dt-text-dim" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-dt-text-dim" />
      )}
      <Bot className="h-3.5 w-3.5 text-dt-accent" />
      <span className="flex-1 text-[12px] font-medium text-dt-text">
        {getAgentName(agentId as Parameters<typeof getAgentName>[0])}
      </span>
      <Check className="h-3.5 w-3.5 text-dt-green" />
    </button>
  );
}
