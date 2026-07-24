export interface RemediationAction {
  action: string;
  from?: string;
  to?: string;
  namespace?: string;
  nodePool?: string;
  expectedImprovement?: string;
  risk?: string;
  cost?: string;
  requiresApproval?: boolean;
}

export interface RemediationResult {
  status: "applied" | "rejected" | "failed";
  message: string;
}

export interface RemediationExecutor {
  readonly name: string;
  apply(action: RemediationAction): Promise<RemediationResult>;
  reject(action: RemediationAction): Promise<RemediationResult>;
}
