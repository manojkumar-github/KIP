export interface CostBreakdownItem {
  label: string;
  amount: number;
}

export interface WasteEstimate {
  monthlyUsd: number;
  detail: string;
  idleGpus?: number;
}

export interface ProvisionEstimate {
  monthly: number;
  hourly?: number;
  breakdown: CostBreakdownItem[];
  savings: string;
  configName: string;
}

export interface CostModel {
  readonly name: string;
  estimateIdleWaste(input: {
    idleGpus: number;
    fragmentation?: boolean;
  }): Promise<WasteEstimate>;
  estimateProvision(input: {
    configName: string;
    gpuCount: number;
    gpuType: string;
  }): Promise<ProvisionEstimate>;
}
