import { randomUUID } from 'node:crypto';
import type { Pattern } from '../patterns/types.js';

export type RecommendationType =
  | 'intent_mapping_suggestion'
  | 'confidence_threshold_adjustment'
  | 'skill_dependency_hint'
  | 'reviewer_coverage_gap'
  | 'skill_addition'
  | 'skill_removal';

export type RecommendationPriority = 'low' | 'medium' | 'high';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  target: string;
  description: string;
  rationale: string;
  confidence: number;
  patterns: string[];
  actionableSteps: string[];
  estimatedImpact?: string;
}

export interface RecommendationEngine {
  generateRecommendations(patterns: Pattern[]): Promise<Recommendation[]>;
  getRecommendationConfidence(rec: Recommendation): number;
  explainRecommendation(rec: Recommendation): string;
}

export function createRecommendationEngine(): RecommendationEngine {
  return {
    async generateRecommendations(patterns) {
      const recommendations: Recommendation[] = [];

      for (const pattern of patterns) {
        const rec = generateFromPattern(pattern);
        if (rec) recommendations.push(rec);
      }

      return recommendations;
    },

    getRecommendationConfidence(rec) {
      let confidence = 0.7;
      confidence += rec.patterns.length * 0.05;

      switch (rec.priority) {
        case 'high':
          confidence += 0.1;
          break;
        case 'low':
          confidence -= 0.1;
          break;
      }

      return Math.min(1, Math.max(0, confidence));
    },

    explainRecommendation(rec) {
      const stepList = rec.actionableSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');

      return (
        `Recommendation: ${rec.description}\n` +
        `Target: ${rec.target}\n` +
        `Rationale: ${rec.rationale}\n` +
        `Confidence: ${(rec.confidence * 100).toFixed(0)}%\n` +
        `Actionable Steps:\n${stepList}` +
        (rec.estimatedImpact ? `\nEstimated Impact: ${rec.estimatedImpact}` : '')
      );
    },
  };
}

function generateFromPattern(pattern: Pattern): Recommendation | null {
  switch (pattern.type) {
    case 'high_failure_rate':
      return {
        id: randomUUID(),
        type: 'intent_mapping_suggestion',
        priority: pattern.severity === 'critical' ? 'high' : 'medium',
        target: pattern.affectedEntity,
        description: `Review intent mapping for '${pattern.affectedEntity}' due to high failure rate`,
        rationale:
          pattern.evidence.dataPoints >= 5
            ? `Based on ${pattern.evidence.dataPoints} executions with ${(pattern.evidence.value * 100).toFixed(0)}% failure rate`
            : 'Limited data - manual review recommended',
        confidence: pattern.evidence.dataPoints >= 10 ? 0.85 : 0.6,
        patterns: [pattern.id],
        actionableSteps: [
          `Review execution plan for '${pattern.affectedEntity}'`,
          'Check skill dependencies and ordering',
          'Consider adding error recovery steps',
        ],
        estimatedImpact: 'Could reduce failure rate by 10-30%',
      };

    case 'low_confidence':
      return {
        id: randomUUID(),
        type: 'confidence_threshold_adjustment',
        priority: 'medium',
        target: 'classification',
        description: 'Classification confidence threshold may need adjustment',
        rationale: `Average confidence of ${(pattern.evidence.value * 100).toFixed(0)}% suggests ambiguous classification cases`,
        confidence: 0.75,
        patterns: [pattern.id],
        actionableSteps: [
          'Review classification signals for edge cases',
          'Consider adding fallback intent for low confidence',
          'Audit training data distribution',
        ],
      };

    case 'slow_execution':
      return {
        id: randomUUID(),
        type: 'skill_dependency_hint',
        priority: 'low',
        target: pattern.affectedEntity,
        description: `Optimize execution for '${pattern.affectedEntity}'`,
        rationale: `Average duration ${pattern.evidence.value.toFixed(0)}ms exceeds threshold ${pattern.evidence.threshold.toFixed(0)}ms`,
        confidence: 0.8,
        patterns: [pattern.id],
        actionableSteps: [
          `Profile '${pattern.affectedEntity}' execution`,
          'Check for unnecessary I/O or network calls',
          'Consider caching or memoization',
        ],
        estimatedImpact: 'Could reduce execution time by 20-40%',
      };

    case 'unused_capability':
      return {
        id: randomUUID(),
        type: 'skill_removal',
        priority: 'low',
        target: pattern.affectedEntity,
        description: `Consider removing unused capability '${pattern.affectedEntity}'`,
        rationale:
          'No invocations in observed period - may indicate misconfiguration or deprecated feature',
        confidence: 0.7,
        patterns: [pattern.id],
        actionableSteps: [
          `Verify '${pattern.affectedEntity}' is not needed`,
          'Check if activation criteria are too restrictive',
          'Consider archiving instead of removing',
        ],
      };

    default:
      return null;
  }
}
