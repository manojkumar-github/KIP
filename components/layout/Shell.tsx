"use client";

import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronDown,
  Cpu,
  Layers,
  Server,
  Shield,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  target: <Target className="h-4 w-4" />,
  server: <Server className="h-4 w-4" />,
  layers: <Layers className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  brain: <Brain className="h-4 w-4" />,
  cpu: <Cpu className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
};

interface LeftNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function LeftNav({ items, activeId, onSelect }: LeftNavProps) {
  return (
    <nav className="flex w-[200px] shrink-0 flex-col border-r border-dt-border bg-dt-surface">
      <div className="border-b border-dt-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-dt-accent/20">
            <Cpu className="h-4 w-4 text-dt-accent" />
          </div>
          <div>
            <div className="text-xs font-semibold text-dt-text">KIP</div>
            <div className="text-[10px] text-dt-text-dim">Intelligence Platform</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors",
              activeId === item.id
                ? "bg-dt-accent/10 text-dt-accent border-r-2 border-dt-accent"
                : "text-dt-text-muted hover:bg-dt-surface-2 hover:text-dt-text"
            )}
          >
            <span className={activeId === item.id ? "text-dt-accent" : "text-dt-text-dim"}>
              {ICONS[item.icon]}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-full bg-dt-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-dt-text-muted">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-dt-border p-3">
        <div className="rounded-md bg-dt-surface-2 p-2.5">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-dt-text-dim">
            Agentic Mode
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-dt-green animate-pulse-dot" />
            <span className="text-[11px] text-dt-text-muted">6 agents active</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface TopBarProps {
  cluster: string;
  environment: string;
  alertCount: number;
  onClusterChange?: () => void;
}

export function TopBar({ cluster, environment, alertCount }: TopBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-dt-border bg-dt-surface px-4">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 rounded-md border border-dt-border bg-dt-surface-2 px-2.5 py-1 text-[12px] text-dt-text hover:border-dt-accent/50">
          <Server className="h-3.5 w-3.5 text-dt-accent" />
          <span>{cluster}</span>
          <ChevronDown className="h-3 w-3 text-dt-text-dim" />
        </button>
        <span className="rounded-full bg-dt-green/10 px-2 py-0.5 text-[10px] font-medium text-dt-green">
          {environment}
        </span>
        <div className="h-4 w-px bg-dt-border" />
        <div className="flex items-center gap-4 text-[11px] text-dt-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-dt-green" />
            GPU Health
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-dt-green" />
            AI Runtime
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {alertCount > 0 && (
          <button className="flex items-center gap-1.5 rounded-md bg-dt-red/10 px-2.5 py-1 text-[11px] font-medium text-dt-red">
            <AlertTriangle className="h-3.5 w-3.5" />
            Alerts ({alertCount})
          </button>
        )}
        <span className="text-[10px] text-dt-text-dim">
          Powered by KIP Intelligence
        </span>
      </div>
    </header>
  );
}

interface LifecycleRibbonProps {
  stages: string[];
  activeStage?: string;
}

export function LifecycleRibbon({ stages, activeStage = "Runtime" }: LifecycleRibbonProps) {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-center gap-1 border-t border-dt-border bg-dt-surface px-4">
      {stages.map((stage, i) => (
        <div key={stage} className="flex items-center">
          <span
            className={cn(
              "px-2.5 py-0.5 text-[10px] font-medium transition-colors",
              stage === activeStage
                ? "rounded-full bg-dt-accent/15 text-dt-accent"
                : "text-dt-text-dim hover:text-dt-text-muted"
            )}
          >
            {stage}
          </span>
          {i < stages.length - 1 && (
            <span className="mx-0.5 text-[10px] text-dt-text-dim">→</span>
          )}
        </div>
      ))}
    </footer>
  );
}
