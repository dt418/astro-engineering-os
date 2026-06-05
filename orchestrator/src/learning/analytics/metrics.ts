export interface ExecutionMetrics {
  duration: {
    p50: number;
    p90: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };
  successRate: number;
  failureRate: number;
}

export interface IntentMetrics {
  totalExecutions: number;
  successRate: number;
  avgConfidence: number;
  avgDurationMs: number;
}

export interface SkillMetrics {
  invocationCount: number;
  successRate: number;
  avgDurationMs: number;
  lastInvoked?: Date;
}

export interface AnalyticsMetrics {
  execution: ExecutionMetrics;
  byIntent: Record<string, IntentMetrics>;
  bySkill: Record<string, SkillMetrics>;
  classificationConfidence: {
    avg: number;
    distribution: { bucket: string; count: number }[];
  };
}
