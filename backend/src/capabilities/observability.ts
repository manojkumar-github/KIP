export interface MetricSample {
  t: number;
  value: number;
}

export interface MetricSeries {
  name: string;
  unit?: string;
  samples: MetricSample[];
}

export interface LogHit {
  timestamp: string;
  message: string;
  count?: number;
}

export interface Observability {
  readonly name: string;
  queryMetric(query: string, rangeMinutes?: number): Promise<MetricSeries>;
  queryLogs(query: string, rangeMinutes?: number): Promise<LogHit[]>;
}
