export interface PolicyCheckResult {
  allowed: boolean;
  reason: string;
  quotaAvailable?: number;
  namespaceApproved?: boolean;
}

export interface PolicyGate {
  readonly name: string;
  validateRemediation(input: {
    action: string;
    namespace?: string;
    from?: string;
    to?: string;
  }): Promise<PolicyCheckResult>;
  validateProvision(input: {
    namespace: string;
    nodePool: string;
    gpuCount: number;
  }): Promise<PolicyCheckResult>;
}
