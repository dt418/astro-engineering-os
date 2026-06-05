import { describe, it, expect, beforeEach } from 'vitest';
import { createRecommendationEngine } from '../../../src/learning/recommendations/engine.js';
import type { Pattern } from '../../../src/learning/patterns/types.js';

describe('RecommendationEngine', () => {
  let engine: ReturnType<typeof createRecommendationEngine>;

  beforeEach(() => {
    engine = createRecommendationEngine();
  });

  it('generates recommendations from patterns', async () => {
    const patterns: Pattern[] = [
      {
        id: 'p1',
        type: 'high_failure_rate',
        severity: 'warning',
        detectedAt: new Date(),
        affectedEntity: 'code-review',
        evidence: { metric: 'successRate', value: 0.7, threshold: 0.8, dataPoints: 10 },
        recommendation: 'Review execution plan',
      },
    ];

    const recommendations = await engine.generateRecommendations(patterns);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]!.type).toBe('intent_mapping_suggestion');
    expect(recommendations[0]!.priority).toBe('medium');
    expect(recommendations[0]!.confidence).toBeGreaterThan(0);
  });

  it('computes recommendation confidence', () => {
    const rec = {
      id: 'r1',
      type: 'intent_mapping_suggestion' as const,
      priority: 'high' as const,
      target: 'test-intent',
      description: 'Add skill',
      rationale: 'Based on pattern',
      confidence: 0.9,
      patterns: ['p1'],
      actionableSteps: ['Add skill to registry'],
    };

    const confidence = engine.getRecommendationConfidence(rec);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('explains recommendations', () => {
    const rec = {
      id: 'r1',
      type: 'skill_addition' as const,
      priority: 'high' as const,
      target: 'test-skill',
      description: 'Add test-skill to intent',
      rationale: 'Low coverage detected',
      confidence: 0.85,
      patterns: [],
      actionableSteps: ['Update intents.yaml'],
    };

    const explanation = engine.explainRecommendation(rec);

    expect(explanation).toContain('test-skill');
    expect(explanation.length).toBeGreaterThan(30);
  });
});
