import type { CostModel, WasteEstimate, ProvisionEstimate } from "../../capabilities/cost";

export class DemoCostModel implements CostModel {
  readonly name = "demo-cost";

  async estimateIdleWaste(input: {
    idleGpus: number;
    fragmentation?: boolean;
  }): Promise<WasteEstimate> {
    const base = input.idleGpus * 900;
    const frag = input.fragmentation ? 300 : 0;
    return {
      monthlyUsd: base + frag,
      detail: `$${base + frag}/mo from ${input.idleGpus} idle GPUs${
        input.fragmentation ? " + fragmentation" : ""
      }`,
      idleGpus: input.idleGpus,
    };
  }

  async estimateProvision(input: {
    configName: string;
    gpuCount: number;
    gpuType: string;
  }): Promise<ProvisionEstimate> {
    const unitCost =
      input.gpuType === "H100" ? 3100 : input.gpuType === "A100" ? 2100 : 1200;
    const gpuCompute = unitCost * input.gpuCount;
    const storage = 1200;
    const network = 800;
    const overhead = 600;
    const monthly = gpuCompute + storage + network + overhead;
    return {
      monthly,
      hourly: Math.round((monthly / 730) * 10) / 10,
      breakdown: [
        { label: "GPU compute", amount: gpuCompute },
        { label: "Storage", amount: storage },
        { label: "Network", amount: network },
        { label: "Overhead", amount: overhead },
      ],
      savings: "23% vs current over-provisioned setup",
      configName: input.configName,
    };
  }
}
