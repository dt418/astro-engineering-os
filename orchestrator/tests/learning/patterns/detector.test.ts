import { describe, it, expect, beforeEach } from 'vitest';
import { createPatternDetector } from '../../../src/learning/patterns/detector.js';
import type { AnalyticsMetrics } from '../../../src/learning/analytics/metrics.js';

describe('PatternDetector', () => {
  let detector: ReturnType<typeof createPatternDetector>;

  beforeEach(() => {
    detector = createPatternDetector();
  });

  it('detects high failure rate pattern', async () => {
    const metrics: AnalyticsMetrics = {
      execution: {
        duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 },
        successRate: 0.6,
        failureRate: 0.4,
      },
      byIntent: {
        'test-intent': { totalExecutions: 10, successRate: 0.3, avgConfidence: 0.8, avgDurationMs: 100 },
      },
      bySkill: {},
      classificationConfidence: { avg: 0.85, distribution: [] },
    };

    const patterns = await detector.detectPatterns(metrics);

    const highFailure = patterns.find((p) => p.type === 'high_failure_rate');
    expect(highFailure).toBeDefined();
    expect(highFailure!.severity).toBe('warning');
    expect(highFailure!.affectedEntity).toBe('test-intent');
  });

  it('detects low confidence classification pattern', async () => {
    const metrics: AnalyticsMetrics = {
      execution: {
        duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 },
        successRate: 0.9,
        failureRate: 0.1,
      },
      byIntent: {},
      bySkill: {},
      classificationConfidence: { avg: 0.5, distribution: [] },
    };

    const patterns = await detector.detectPatterns(metrics);

    const lowConf = patterns.find((p) => p.type === 'low_confidence');
    expect(lowConf).toBeDefined();
    expect(lowConf!.severity).toBe('warning');
  });

  it('detects slow execution pattern', async () => {
    const metrics: AnalyticsMetrics = {
      execution: {
        duration: { p50: 100, p90: 8000, p99: 10000, avg: 3000, min: 50, max: 15000 },
        successRate: 0.9,
        failureRate: 0.1,
      },
      byIntent: {},
      bySkill: {
        'slow-skill': { invocationCount: 10, successRate: 0.9, avgDurationMs: 6000 },
      },
      classificationConfidence: { avg: 0.85, distribution: [] },
    };

    const patterns = await detector.detectPatterns(metrics);

    const slowExec = patterns.find((p) => p.type === 'slow_execution');
    expect(slowExec).toBeDefined();
    expect(slowExec!.affectedEntity).toBe('slow-skill');
  });

  it('explains patterns human-readably', async () => {
    const patterns = await detector.detectPatterns({
      execution: {
        duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 },
        successRate: 0.5,
        failureRate: 0.5,
      },
      byIntent: {
        'bad-intent': { totalExecutions: 10, successRate: 0.3, avgConfidence: 0.8, avgDurationMs: 100 },
      },
      bySkill: {},
      classificationConfidence: { avg: 0.85, distribution: [] },
    });

    expect(patterns.length).toBeGreaterThan(0);
    const explanation = detector.explainPattern(patterns[0]!);
    expect(explanation.length).toBeGreaterThan(20);
  });
});
