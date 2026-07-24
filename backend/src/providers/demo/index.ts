import type { CapabilityKind } from "../../types";
import type { CapabilityInstance } from "../../core/registry";
import { DemoClusterInventory } from "./cluster";
import { DemoGpuTelemetry } from "./gpu";
import { DemoObservability } from "./observability";
import { DemoCostModel } from "./cost";
import { DemoPolicyGate } from "./policy";
import { DemoInferenceRuntime } from "./runtime";
import { DemoRemediationExecutor } from "./remediation";

const DEMO_CAPABILITIES: CapabilityKind[] = [
  "cluster",
  "gpu",
  "observability",
  "cost",
  "policy",
  "runtime",
  "remediation",
];

/**
 * Demo provider factory — one type id implements all capabilities with
 * realistic mock data matching the original client-side simulator.
 */
export function createDemoCapability(
  kind: CapabilityKind
): CapabilityInstance {
  switch (kind) {
    case "cluster":
      return new DemoClusterInventory();
    case "gpu":
      return new DemoGpuTelemetry();
    case "observability":
      return new DemoObservability();
    case "cost":
      return new DemoCostModel();
    case "policy":
      return new DemoPolicyGate();
    case "runtime":
      return new DemoInferenceRuntime();
    case "remediation":
      return new DemoRemediationExecutor();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown capability: ${_exhaustive}`);
    }
  }
}

export { DEMO_CAPABILITIES };
