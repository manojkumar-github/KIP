import type { PolicyGate, PolicyCheckResult } from "../../capabilities/policy";

export class DemoPolicyGate implements PolicyGate {
  readonly name = "demo-policy";

  async validateRemediation(): Promise<PolicyCheckResult> {
    return {
      allowed: true,
      reason: "Remediation plan approved by policy engine",
      namespaceApproved: true,
    };
  }

  async validateProvision(input: {
    namespace: string;
    nodePool: string;
    gpuCount: number;
  }): Promise<PolicyCheckResult> {
    return {
      allowed: true,
      reason: `Policy check passed · quota available for ${input.gpuCount} GPUs in ${input.nodePool}`,
      quotaAvailable: 16,
      namespaceApproved: true,
    };
  }
}
