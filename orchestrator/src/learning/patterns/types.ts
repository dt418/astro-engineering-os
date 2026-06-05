export type PatternType =
  | 'high_failure_rate'
  | 'low_confidence'
  | 'slow_execution'
  | 'unused_capability'
  | 'routing_degeneracy'
  | 'confidence_drift';

export type PatternSeverity = 'info' | 'warning' | 'critical';

export interface PatternEvidence {
  metric: string;
  value: number;
  threshold: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  dataPoints: number;
}

export interface Pattern {
  id: string;
  type: PatternType;
  severity: PatternSeverity;
  detectedAt: Date;
  affectedEntity: string;
  evidence: PatternEvidence;
  recommendation?: string;
}
