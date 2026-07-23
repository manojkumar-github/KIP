"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Plus,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicCardRenderer } from "@/components/cards/DynamicCardRenderer";
import { AgentAccordion } from "@/components/agents/AgentActivityPanel";
import type { MissionDefinition, MissionState } from "@/lib/types";
import { MISSIONS } from "@/lib/mock-data";

interface MissionWorkspaceProps {
  missionState: MissionState | null;
  activeMission: MissionDefinition | null;
  isRunning: boolean;
  onStartMission: (mission: MissionDefinition) => void;
  onApprove: () => void;
  onReject: () => void;
}

export function MissionWorkspace({
  missionState,
  activeMission,
  isRunning,
  onStartMission,
  onApprove,
  onReject,
}: MissionWorkspaceProps) {
  const [input, setInput] = useState("");
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const handleSubmit = (prompt: string) => {
    const mission = MISSIONS.find(
      (m) => m.prompt.toLowerCase() === prompt.toLowerCase()
    ) ?? MISSIONS.find((m) =>
      prompt.toLowerCase().includes(m.category)
    ) ?? MISSIONS[1];

    onStartMission(mission);
    setInput("");
  };

  const toggleAgent = (id: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showEmpty = !activeMission && !isRunning;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-dt-bg">
      {/* Mission header */}
      {activeMission && (
        <div className="border-b border-dt-border bg-dt-surface px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-dt-accent" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
              Mission
            </span>
            <span className="text-[13px] font-semibold text-dt-text">
              {activeMission.title}
            </span>
            {isRunning && (
              <span className="ml-2 flex items-center gap-1 rounded-full bg-dt-accent/10 px-2 py-0.5 text-[10px] text-dt-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-dt-accent animate-pulse-dot" />
                Investigating
              </span>
            )}
            {missionState?.status === "awaiting-approval" && (
              <span className="ml-2 rounded-full bg-dt-amber/10 px-2 py-0.5 text-[10px] text-dt-amber">
                Awaiting Approval
              </span>
            )}
            {missionState?.status === "complete" && (
              <span className="ml-2 rounded-full bg-dt-green/10 px-2 py-0.5 text-[10px] text-dt-green">
                Complete
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showEmpty ? (
          <EmptyState onSelectPrompt={handleSubmit} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {/* User prompt */}
            {activeMission && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-dt-accent/10 px-4 py-2.5">
                  <p className="text-[13px] text-dt-text">{activeMission.prompt}</p>
                </div>
              </div>
            )}

            {/* Operational rationale */}
            {missionState?.rationale && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-dt-border bg-dt-surface-2 p-3"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
                  <Sparkles className="h-3 w-3" />
                  Operational Rationale
                </div>
                <p className="text-[12px] leading-relaxed text-dt-text-muted italic">
                  {missionState.rationale}
                </p>
              </motion.div>
            )}

            {/* Agent response summary */}
            {missionState && missionState.agents.some((a) => a.status === "complete") && (
              <div className="rounded-lg border border-dt-border bg-dt-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-dt-accent" />
                  <span className="text-[12px] font-medium text-dt-text">
                    KIP Intelligence
                  </span>
                </div>

                {activeMission?.id === "rag-incident" && missionState.cards.length > 0 && (
                  <div className="mb-3 space-y-2 text-[13px] text-dt-text-muted">
                    <p className="font-medium text-dt-text">Root cause identified:</p>
                    <ul className="list-inside list-disc space-y-1 text-[12px]">
                      <li>KV-cache memory exhaustion on GPU node gpu-west-2a-7</li>
                      <li>Replica imbalance — 2 of 3 pods on same GPU</li>
                      <li>7 CUDA OOM events in the last hour</li>
                    </ul>
                  </div>
                )}

                {activeMission?.id === "gpu-fleet" && missionState.cards.length > 0 && (
                  <div className="mb-3 text-[13px] text-dt-text-muted">
                    <p>
                      Found <strong className="text-dt-red">4 unhealthy GPUs</strong> with
                      memory pressure and <strong className="text-dt-amber">2 underutilized</strong> GPUs
                      (&lt;15% utilization). Estimated waste:{" "}
                      <strong className="text-dt-text">$2,100/month</strong>.
                    </p>
                  </div>
                )}

                {activeMission?.id === "gpu-provision" && missionState.cards.length > 0 && (
                  <div className="mb-3 text-[13px] text-dt-text-muted">
                    <p>
                      For a 70B model with 2,000 concurrent users, recommend{" "}
                      <strong className="text-dt-accent">H100 80GB × 4</strong> at{" "}
                      <strong className="text-dt-text">$12,400/month</strong> with 2,400 req/s
                      throughput.
                    </p>
                  </div>
                )}

                {/* Agent accordions */}
                <div className="space-y-1.5">
                  {missionState.agents
                    .filter((a) => a.status === "complete")
                    .map((agent) => (
                      <div key={agent.id}>
                        <AgentAccordion
                          agentId={agent.id}
                          actions={agent.completedActions}
                          isExpanded={expandedAgents.has(agent.id)}
                          onToggle={() => toggleAgent(agent.id)}
                        />
                        {expandedAgents.has(agent.id) && (
                          <div className="ml-6 mt-1 space-y-0.5 border-l border-dt-border pl-3">
                            {agent.completedActions.map((action, i) => (
                              <p key={i} className="text-[11px] text-dt-text-dim">
                                {action}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Dynamic A2UI cards */}
            {missionState && (
              <DynamicCardRenderer
                cards={missionState.cards}
                onApprove={onApprove}
                onReject={onReject}
              />
            )}

            {/* Loading shimmer */}
            {isRunning && missionState && missionState.cards.length === 0 && (
              <div className="space-y-3">
                <div className="shimmer h-24 rounded-lg" />
                <div className="shimmer h-16 rounded-lg" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-dt-border bg-dt-surface p-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button className="rounded-md p-2 text-dt-text-dim hover:bg-dt-surface-2 hover:text-dt-text-muted">
            <Plus className="h-4 w-4" />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim() && !isRunning) {
                  handleSubmit(input.trim());
                }
              }}
              placeholder="State an operational goal..."
              disabled={isRunning}
              className="w-full rounded-lg border border-dt-border bg-dt-surface-2 px-4 py-2.5 pr-10 text-[13px] text-dt-text placeholder:text-dt-text-dim focus:border-dt-accent/50 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => input.trim() && !isRunning && handleSubmit(input.trim())}
              disabled={!input.trim() || isRunning}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-dt-accent hover:bg-dt-accent/10 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-dt-accent/10 px-2.5 py-1.5">
            <Sparkles className="h-3 w-3 text-dt-accent" />
            <span className="text-[10px] font-medium text-dt-accent">Agentic</span>
          </div>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-dt-text-dim">
          Always verify important information. Powered by KIP Intelligence.
        </p>
      </div>
    </main>
  );
}

function EmptyState({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-dt-accent/10">
        <Target className="h-7 w-7 text-dt-accent" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-dt-text">
        Kubernetes Intelligence Platform
      </h2>
      <p className="mb-8 max-w-md text-center text-[13px] text-dt-text-muted">
        State an operational goal. Multiple specialized agents will investigate,
        build evidence, and guide you through infrastructure decisions.
      </p>

      <div className="w-full max-w-lg space-y-2">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-dt-text-dim">
          Try a mission
        </p>
        {MISSIONS.map((mission) => (
          <button
            key={mission.id}
            onClick={() => onSelectPrompt(mission.prompt)}
            className="group flex w-full items-center gap-3 rounded-lg border border-dt-border bg-dt-surface-2 px-4 py-3 text-left transition-all hover:border-dt-accent/30 hover:bg-dt-surface-3"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                mission.category === "incident"
                  ? "bg-dt-red/10 text-dt-red"
                  : mission.category === "fleet"
                    ? "bg-dt-accent/10 text-dt-accent"
                    : "bg-dt-green/10 text-dt-green"
              )}
            >
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-dt-text">{mission.title}</div>
              <div className="truncate text-[11px] text-dt-text-dim">{mission.prompt}</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-dt-text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-dt-accent" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function MissionPicker({
  onSelect,
  activeId,
}: {
  onSelect: (mission: MissionDefinition) => void;
  activeId?: string;
}) {
  return (
    <div className="space-y-1 p-2">
      {MISSIONS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m)}
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-[12px] transition-colors",
            activeId === m.id
              ? "bg-dt-accent/10 text-dt-accent"
              : "text-dt-text-muted hover:bg-dt-surface-2"
          )}
        >
          {m.title}
        </button>
      ))}
    </div>
  );
}
