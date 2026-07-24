import type { Observability, MetricSeries, LogHit } from "../../capabilities/observability";

export class DemoObservability implements Observability {
  readonly name = "demo-observability";

  async queryMetric(query: string): Promise<MetricSeries> {
    if (query.toLowerCase().includes("util")) {
      return {
        name: query,
        unit: "percent",
        samples: [
          { t: 0, value: 55 },
          { t: 1, value: 60 },
          { t: 2, value: 62 },
        ],
      };
    }
    return {
      name: query,
      samples: [{ t: 0, value: 0 }],
    };
  }

  async queryLogs(query: string): Promise<LogHit[]> {
    if (query.toLowerCase().includes("oom") || query.toLowerCase().includes("cuda")) {
      return [
        {
          timestamp: "08:40:12",
          message: "CUDA out of memory",
          count: 7,
        },
      ];
    }
    return [];
  }
}
