"use client";

import { cn } from "@/lib/utils";
import type { WorkloadItem } from "@/lib/types";

interface WorkloadListProps {
  workloads: WorkloadItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function WorkloadList({ workloads, selectedId, onSelect }: WorkloadListProps) {
  const critical = workloads.filter((w) => w.status === "critical").length;
  const healthy = workloads.filter((w) => w.status === "healthy").length;

  return (
    <div className="flex w-[240px] shrink-0 flex-col border-r border-dt-border bg-dt-surface">
      <div className="border-b border-dt-border px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-dt-text">Workloads</span>
          <span className="text-[11px] text-dt-text-muted">{workloads.length}</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-dt-surface-3">
          {critical > 0 && (
            <div
              className="bg-dt-red"
              style={{ width: `${(critical / workloads.length) * 100}%` }}
            />
          )}
          <div
            className="bg-dt-green"
            style={{ width: `${(healthy / workloads.length) * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex gap-3 text-[10px] text-dt-text-dim">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-dt-red" />
            {critical} alerts
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-dt-green" />
            {healthy} healthy
          </span>
        </div>
      </div>

      <div className="flex border-b border-dt-border">
        {["Health", "Utilization", "Metadata"].map((tab, i) => (
          <button
            key={tab}
            className={cn(
              "flex-1 py-2 text-[10px] font-medium transition-colors",
              i === 0
                ? "border-b-2 border-dt-accent text-dt-accent"
                : "text-dt-text-dim hover:text-dt-text-muted"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {workloads.map((w) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className={cn(
              "flex w-full items-center gap-2 border-b border-dt-border-subtle px-3 py-2 text-left transition-colors",
              selectedId === w.id
                ? "bg-dt-accent/5"
                : "hover:bg-dt-surface-2"
            )}
          >
            {w.status !== "healthy" && (
              <div
                className={cn(
                  "h-full w-0.5 shrink-0 self-stretch rounded-full",
                  w.status === "critical" ? "bg-dt-red" : "bg-dt-amber"
                )}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] text-dt-text">{w.name}</div>
              <div className="text-[10px] text-dt-text-dim">{w.type}</div>
            </div>
            <span className="shrink-0 text-[10px] text-dt-text-dim">{w.age}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
