"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { A2UICard } from "@/lib/types";

interface DynamicCardRendererProps {
  cards: A2UICard[];
  onApprove?: () => void;
  onReject?: () => void;
}

export function DynamicCardRenderer({ cards, onApprove, onReject }: DynamicCardRendererProps) {
  const visibleCards = cards.filter((c) => c.visible);

  if (visibleCards.length === 0) return null;

  return (
    <div className="space-y-3">
      {visibleCards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
        >
          <CardContent card={card} onApprove={onApprove} onReject={onReject} />
        </motion.div>
      ))}
    </div>
  );
}

function CardContent({
  card,
  onApprove,
  onReject,
}: {
  card: A2UICard;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  switch (card.type) {
    case "root-cause":
      return <RootCauseCard data={card.data} title={card.title} />;
    case "gpu-heatmap":
      return <GPUHeatmapCard data={card.data} title={card.title} />;
    case "gpu-fleet":
      return <GPUFleetCard data={card.data} title={card.title} />;
    case "utilization":
      return <UtilizationCard data={card.data} title={card.title} />;
    case "kv-cache":
      return <KVCacheCard data={card.data} title={card.title} />;
    case "capacity-comparison":
      return <CapacityComparisonCard data={card.data} title={card.title} />;
    case "cost-analysis":
      return <CostAnalysisCard data={card.data} title={card.title} />;
    case "approval":
      return (
        <ApprovalCard
          data={card.data}
          title={card.title}
          onApprove={onApprove}
          onReject={onReject}
        />
      );
    case "recommendation":
      return <RecommendationCard data={card.data} title={card.title} />;
    case "status-badges":
      return <StatusBadgesCard data={card.data} />;
    default:
      return null;
  }
}

function CardShell({
  title,
  children,
  accent,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: "red" | "green" | "blue" | "amber";
}) {
  const accentColors = {
    red: "border-l-dt-red",
    green: "border-l-dt-green",
    blue: "border-l-dt-accent",
    amber: "border-l-dt-amber",
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-dt-border bg-dt-surface-2 p-4",
        accent && `border-l-2 ${accentColors[accent]}`
      )}
    >
      {title && (
        <h3 className="mb-3 text-[13px] font-semibold text-dt-text">{title}</h3>
      )}
      {children}
    </div>
  );
}

function RootCauseCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const cause = data.cause as string;
  const chain = data.chain as string[];
  const confidence = data.confidence as number;

  return (
    <CardShell title={title} accent="red">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-dt-red" />
        <p className="text-[13px] font-medium text-dt-text">{cause}</p>
      </div>
      <div className="mb-3 space-y-1.5">
        {chain.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px] text-dt-text-muted">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-dt-surface-3 text-[10px] text-dt-text-dim">
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-dt-text-dim">Confidence</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dt-surface-3">
          <div
            className="h-full rounded-full bg-dt-green transition-all"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-dt-green">{confidence}%</span>
      </div>
    </CardShell>
  );
}

function GPUHeatmapCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const nodes = data.nodes as Array<{
    id: string;
    util: number;
    memory: number;
    temp: number;
    status: string;
  }>;

  const statusColor = (s: string) => {
    if (s === "critical") return "bg-dt-red/80 border-dt-red";
    if (s === "warning") return "bg-dt-amber/60 border-dt-amber";
    if (s === "idle") return "bg-dt-surface-3 border-dt-border";
    return "bg-dt-green/40 border-dt-green/50";
  };

  return (
    <CardShell title={title} accent="blue">
      <div className="grid grid-cols-4 gap-2">
        {nodes.map((node) => (
          <div
            key={node.id}
            className={cn(
              "rounded-md border p-2 transition-colors",
              statusColor(node.status)
            )}
          >
            <div className="text-[11px] font-medium text-dt-text">{node.id}</div>
            <div className="mt-1 space-y-0.5 text-[10px] text-dt-text-muted">
              <div>Util: {node.util}%</div>
              <div>Mem: {node.memory}%</div>
              <div>{node.temp}°C</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-dt-text-dim">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-dt-red/80" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-dt-amber/60" /> Warning
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-dt-green/40" /> Healthy
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-dt-surface-3" /> Idle
        </span>
      </div>
    </CardShell>
  );
}

function GPUFleetCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const items: Array<{ label: string; value: React.ReactNode; color: string }> = [
    { label: "Total GPUs", value: data.total as React.ReactNode, color: "text-dt-text" },
    { label: "Critical", value: data.critical as React.ReactNode, color: "text-dt-red" },
    { label: "Idle", value: data.idle as React.ReactNode, color: "text-dt-amber" },
    { label: "Avg Utilization", value: `${data.avgUtil}%`, color: "text-dt-accent" },
    { label: "Healthy", value: data.healthy as React.ReactNode, color: "text-dt-green" },
    {
      label: "Cost Waste",
      value: `$${((data.costWaste as number) || 0).toLocaleString()}/mo`,
      color: "text-dt-amber",
    },
  ];

  return (
    <CardShell title={title}>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-md bg-dt-surface-3 p-2.5">
            <div className="text-[10px] text-dt-text-dim">{item.label}</div>
            <div className={cn("text-[16px] font-semibold", item.color)}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function UtilizationCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const metrics = ["cpu", "memory", "gpu"] as const;

  return (
    <CardShell title={title}>
      <div className="space-y-3">
        {metrics.map((m) => {
          const d = data[m] as { usage: number; requests: number; limits: number };
          return (
            <div key={m}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="uppercase text-dt-text-muted">{m}</span>
                <span className="text-dt-text-dim">
                  {d.usage}% usage · {d.requests}% req · {d.limits}% limit
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-dt-surface-3">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-dt-accent/30"
                  style={{ width: `${d.requests}%` }}
                />
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    d.usage > 90 ? "bg-dt-red" : d.usage > 70 ? "bg-dt-amber" : "bg-dt-accent"
                  )}
                  style={{ width: `${d.usage}%` }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-dt-purple"
                  style={{ left: `${d.limits}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-dt-text-dim">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-sm bg-dt-accent" /> Usage
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-sm bg-dt-accent/30" /> Requests
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-0.5 bg-dt-purple" /> Limits
        </span>
      </div>
    </CardShell>
  );
}

function KVCacheCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const current = data.current as React.ReactNode;
  const baseline = data.baseline as React.ReactNode;
  const limit = data.limit as React.ReactNode;
  const trend = data.trend as number[];
  const chartData = trend.map((v, i) => ({ t: i, gb: v }));

  return (
    <CardShell title={title} accent="red">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-dt-red">{current} GB</span>
        <span className="text-[12px] text-dt-text-muted">
          baseline {baseline} GB · limit {limit} GB
        </span>
        <span className="rounded-full bg-dt-red/10 px-2 py-0.5 text-[10px] font-medium text-dt-red">
          +340% growth
        </span>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={[0, 2.5]} />
            <Tooltip
              contentStyle={{
                background: "#181b24",
                border: "1px solid #2a2f3d",
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(v: number) => [`${v} GB`, "KV-Cache"]}
            />
            <Bar dataKey="gb" radius={[2, 2, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === chartData.length - 1 ? "#e74c6f" : "#1496ff"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

function CapacityComparisonCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const configs = data.configs as Array<{
    name: string;
    vram: number;
    throughput: string;
    latency: string;
    cost: number;
    fit: string;
  }>;

  return (
    <CardShell title={title} accent="blue">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-dt-border text-left text-[10px] text-dt-text-dim">
              <th className="pb-2 pr-4">Configuration</th>
              <th className="pb-2 pr-4">VRAM</th>
              <th className="pb-2 pr-4">Throughput</th>
              <th className="pb-2 pr-4">Latency</th>
              <th className="pb-2">Cost/mo</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr
                key={c.name}
                className={cn(
                  "border-b border-dt-border-subtle",
                  c.fit === "recommended" && "bg-dt-accent/5"
                )}
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-dt-text">{c.name}</span>
                    {c.fit === "recommended" && (
                      <span className="rounded-full bg-dt-accent/15 px-1.5 py-0.5 text-[9px] font-medium text-dt-accent">
                        Recommended
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-dt-text-muted">{c.vram} GB</td>
                <td className="py-2.5 pr-4 text-dt-text-muted">{c.throughput}</td>
                <td className="py-2.5 pr-4 text-dt-text-muted">{c.latency}</td>
                <td className="py-2.5 font-medium text-dt-text">
                  ${c.cost.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardShell>
  );
}

function CostAnalysisCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const monthly = data.monthly as React.ReactNode;
  const savings = data.savings as React.ReactNode;
  const breakdown = data.breakdown as Array<{ label: string; amount: number }>;

  return (
    <CardShell title={title}>
      <div className="mb-4 flex items-baseline gap-2">
        <DollarSign className="h-5 w-5 text-dt-green" />
        <span className="text-2xl font-semibold text-dt-text">
          ${String(monthly)}
        </span>
        <span className="text-[12px] text-dt-text-muted">/month</span>
        <span className="ml-auto rounded-full bg-dt-green/10 px-2 py-0.5 text-[10px] text-dt-green">
          {savings}
        </span>
      </div>
      <div className="space-y-2">
        {breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-[12px]">
            <span className="text-dt-text-muted">{item.label}</span>
            <span className="text-dt-text">${item.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function ApprovalCard({
  data,
  title,
  onApprove,
  onReject,
}: {
  data: Record<string, unknown>;
  title?: string;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const action = data.action as React.ReactNode;
  const from = data.from as string | undefined;
  const to = data.to as string | undefined;
  const namespace = data.namespace as string | undefined;
  const nodePool = data.nodePool as string | undefined;
  const expectedImprovement = data.expectedImprovement as React.ReactNode;
  const risk = data.risk as React.ReactNode;
  const cost = data.cost as string | undefined;

  return (
    <CardShell title={title} accent="green">
      <div className="mb-4 rounded-md bg-dt-surface-3 p-3">
        <div className="mb-2 text-[12px] font-medium text-dt-text">
          {action}
        </div>
        {from != null && to != null ? (
          <div className="flex items-center gap-2 text-[12px] text-dt-text-muted">
            <span className="rounded bg-dt-surface-2 px-2 py-1">{from}</span>
            <ArrowRight className="h-3.5 w-3.5 text-dt-text-dim" />
            <span className="rounded bg-dt-surface-2 px-2 py-1">{to}</span>
          </div>
        ) : null}
        {namespace != null ? (
          <div className="mt-2 text-[11px] text-dt-text-dim">
            Namespace: {namespace} · Pool: {nodePool ?? ""}
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-dt-surface-3 p-2.5">
          <div className="text-[10px] text-dt-text-dim">Expected Improvement</div>
          <div className="flex items-center gap-1 text-[13px] font-medium text-dt-green">
            <TrendingUp className="h-3.5 w-3.5" />
            {expectedImprovement}
          </div>
        </div>
        <div className="rounded-md bg-dt-surface-3 p-2.5">
          <div className="text-[10px] text-dt-text-dim">Risk Level</div>
          <div className="text-[13px] font-medium text-dt-green">{risk}</div>
        </div>
        {cost != null ? (
          <div className="col-span-2 rounded-md bg-dt-surface-3 p-2.5">
            <div className="text-[10px] text-dt-text-dim">Estimated Cost</div>
            <div className="text-[13px] font-medium text-dt-text">{cost}</div>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-dt-green py-2 text-[12px] font-medium text-white transition-colors hover:bg-dt-green-dim"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dt-border py-2 text-[12px] font-medium text-dt-text-muted transition-colors hover:bg-dt-surface-3"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    </CardShell>
  );
}

function RecommendationCard({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  const actions = data.actions as string[];
  const impact = data.impact as React.ReactNode;
  const risk = data.risk as React.ReactNode;

  return (
    <CardShell title={title} accent="green">
      <ul className="mb-3 space-y-2">
        {actions.map((action, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-dt-text-muted">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dt-green" />
            {action}
          </li>
        ))}
      </ul>
      <div className="flex gap-4 text-[11px]">
        <span className="text-dt-green">
          Impact: {impact}
        </span>
        <span className="text-dt-text-dim">
          Risk: {risk}
        </span>
      </div>
    </CardShell>
  );
}

function StatusBadgesCard({ data }: { data: Record<string, unknown> }) {
  const name = data.name as React.ReactNode;
  const type = data.type as React.ReactNode;
  const badges = data.badges as Array<{ label: string; status: string }>;

  return (
    <CardShell>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[14px] font-semibold text-dt-text">{name}</span>
        <span className="text-[11px] text-dt-text-dim">{type}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={b.label}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
              b.status === "critical"
                ? "bg-dt-red/10 text-dt-red"
                : b.status === "warning"
                  ? "bg-dt-amber/10 text-dt-amber"
                  : "bg-dt-green/10 text-dt-green"
            )}
          >
            {b.status === "healthy" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {b.label}
          </span>
        ))}
      </div>
    </CardShell>
  );
}
