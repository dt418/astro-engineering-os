import { randomUUID } from 'node:crypto';
import type { AnalyticsMetrics } from '../analytics/metrics.js';
import type { Pattern, PatternType, PatternSeverity, PatternEvidence } from './types.js';
import { PATTERN_THRESHOLDS } from './thresholds.js';

export interface PatternDetector {
  detectPatterns(metrics: AnalyticsMetrics): Promise<Pattern[]>;
  getPatternsByType(type: PatternType): Promise<Pattern[]>;
  explainPattern(pattern: Pattern): string;
}

export function createPatternDetector(): PatternDetector {
  let detectedPatterns: Pattern[] = [];

  return {
    async detectPatterns(metrics) {
      const patterns: Pattern[] = [];
      const t = PATTERN_THRESHOLDS;

      for (const [intent, stats] of Object.entries(metrics.byIntent)) {
        if (
          stats.totalExecutions >= t.MIN_DATA_POINTS &&
          stats.successRate < 1 - t.HIGH_FAILURE_RATE
        ) {
          patterns.push(
            createPattern('high_failure_rate', 'warning', intent, {
              metric: 'successRate',
              value: stats.successRate,
              threshold: 1 - t.HIGH_FAILURE_RATE,
              dataPoints: stats.totalExecutions,
            }),
          );
        }
      }

      if (metrics.classificationConfidence.avg < t.LOW_CONFIDENCE) {
        patterns.push(
          createPattern('low_confidence', 'warning', 'classification', {
            metric: 'avgConfidence',
            value: metrics.classificationConfidence.avg,
            threshold: t.LOW_CONFIDENCE,
            dataPoints: metrics.classificationConfidence.distribution.reduce(
              (a, b) => a + b.count,
              0,
            ),
          }),
        );
      }

      for (const [skill, stats] of Object.entries(metrics.bySkill)) {
        if (stats.avgDurationMs > t.SLOW_EXECUTION_P90_MS) {
          patterns.push(
            createPattern('slow_execution', 'info', skill, {
              metric: 'avgDurationMs',
              value: stats.avgDurationMs,
              threshold: t.SLOW_EXECUTION_P90_MS,
              dataPoints: stats.invocationCount,
            }),
          );
        }
      }

      detectedPatterns = patterns;
      return patterns;
    },

    async getPatternsByType(type) {
      return detectedPatterns.filter((p) => p.type === type);
    },

    explainPattern(pattern) {
      switch (pattern.type) {
        case 'high_failure_rate':
          return `Intent '${pattern.affectedEntity}' has a ${(pattern.evidence.value * 100).toFixed(0)}% failure rate, exceeding threshold of ${((1 - pattern.evidence.threshold) * 100).toFixed(0)}%. Based on ${pattern.evidence.dataPoints} data points.`;
        case 'low_confidence':
          return `Average classification confidence is ${(pattern.evidence.value * 100).toFixed(0)}%, below threshold of ${(pattern.evidence.threshold * 100).toFixed(0)}%. This may indicate ambiguous or out-of-distribution inputs.`;
        case 'slow_execution':
          return `Skill '${pattern.affectedEntity}' averages ${pattern.evidence.value.toFixed(0)}ms execution time, exceeding threshold of ${pattern.evidence.threshold.toFixed(0)}ms.`;
        case 'unused_capability':
          return `Registered capability '${pattern.affectedEntity}' has never been invoked in the observed period.`;
        case 'routing_degeneracy':
          return `Multiple intents route to the same execution plan as '${pattern.affectedEntity}'.`;
        case 'confidence_drift':
          return `Classification confidence has dropped by ${(pattern.evidence.value * 100).toFixed(0)}% compared to baseline.`;
        default:
          return `Unknown pattern type: ${pattern.type}`;
      }
    },
  };
}

function createPattern(
  type: PatternType,
  severity: PatternSeverity,
  affectedEntity: string,
  evidence: PatternEvidence,
): Pattern {
  return {
    id: randomUUID(),
    type,
    severity,
    detectedAt: new Date(),
    affectedEntity,
    evidence,
    recommendation: generateRecommendation(type, affectedEntity, evidence),
  };
}

function generateRecommendation(
  type: PatternType,
  entity: string,
  evidence: PatternEvidence,
): string {
  switch (type) {
    case 'high_failure_rate':
      return `Consider reviewing the execution plan for '${entity}' or adding error handling improvements.`;
    case 'low_confidence':
      return `Consider adding more training examples or refining the intent classifier signals.`;
    case 'slow_execution':
      return `Consider optimizing '${entity}' or adjusting the timeout threshold.`;
    case 'unused_capability':
      return `Consider removing '${entity}' from the registry or updating its activation criteria.`;
    default:
      return `Manual review recommended for ${type} affecting '${entity}'.`;
  }
}
