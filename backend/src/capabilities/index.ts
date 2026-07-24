export type { ClusterInventory } from "./cluster";
export type {
  ClusterNode,
  ClusterWorkload,
  ClusterEvent,
  ClusterCapacity,
  WorkloadStatus,
} from "./cluster";
export type { GpuTelemetry, GpuNodeMetrics, ModelMemoryRequirements, GpuHealthStatus } from "./gpu";
export type { Observability, MetricSeries, LogHit } from "./observability";
export type { CostModel, WasteEstimate, ProvisionEstimate } from "./cost";
export type { PolicyGate, PolicyCheckResult } from "./policy";
export type {
  InferenceRuntime,
  KvCacheSnapshot,
  DeploymentUtilization,
  OomSignal,
} from "./runtime";
export type {
  RemediationExecutor,
  RemediationAction,
  RemediationResult,
} from "./remediation";

import type { ClusterInventory } from "./cluster";
import type { GpuTelemetry } from "./gpu";
import type { Observability } from "./observability";
import type { CostModel } from "./cost";
import type { PolicyGate } from "./policy";
import type { InferenceRuntime } from "./runtime";
import type { RemediationExecutor } from "./remediation";

/** Fully resolved stack: every capability bound to a concrete provider. */
export interface ResolvedStack {
  id: string;
  displayName: string;
  cluster: ClusterInventory;
  gpu: GpuTelemetry;
  observability: Observability;
  cost: CostModel;
  policy: PolicyGate;
  runtime: InferenceRuntime;
  remediation: RemediationExecutor;
}
