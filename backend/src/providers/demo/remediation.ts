import type {
  RemediationExecutor,
  RemediationAction,
  RemediationResult,
} from "../../capabilities/remediation";

export class DemoRemediationExecutor implements RemediationExecutor {
  readonly name = "demo-remediation";

  async apply(action: RemediationAction): Promise<RemediationResult> {
    return {
      status: "applied",
      message: `Applied: ${action.action}`,
    };
  }

  async reject(action: RemediationAction): Promise<RemediationResult> {
    return {
      status: "rejected",
      message: `Rejected: ${action.action}`,
    };
  }
}
