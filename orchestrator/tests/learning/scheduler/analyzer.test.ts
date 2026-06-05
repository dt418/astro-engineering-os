import { describe, it, expect, vi } from 'vitest';
import { createScheduledAnalyzer } from '../../../src/learning/scheduler/analyzer.js';
import type { AnalyticsEngine } from '../../../src/learning/analytics/engine.js';
import type { PatternDetector } from '../../../src/learning/patterns/detector.js';
import type { RecommendationEngine } from '../../../src/learning/recommendations/engine.js';

function createMockLayer() {
  return {
    analytics: {
      computeMetrics: vi.fn().mockResolvedValue({
        execution: {
          duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 },
          successRate: 0.9,
          failureRate: 0.1,
        },
        byIntent: {},
        bySkill: {},
        classificationConfidence: { avg: 0.85, distribution: [] },
      }),
    } as unknown as AnalyticsEngine,
    patterns: {
      detectPatterns: vi.fn().mockResolvedValue([]),
    } as unknown as PatternDetector,
    recommendations: {
      generateRecommendations: vi.fn().mockResolvedValue([]),
    } as unknown as RecommendationEngine,
  };
}

describe('ScheduledAnalyzer', () => {
  it('runs analysis and returns results', async () => {
    const layer = createMockLayer();
    const analyzer = createScheduledAnalyzer(layer, { intervalHours: 24 });

    const result = await analyzer.runAnalysis();

    expect(result.metrics).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.executedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns last analysis time', async () => {
    const layer = createMockLayer();
    const analyzer = createScheduledAnalyzer(layer, { intervalHours: 24 });

    const lastTime = await analyzer.getLastAnalysisTime();
    expect(lastTime).toBeNull();

    await analyzer.runAnalysis();

    const afterTime = await analyzer.getLastAnalysisTime();
    expect(afterTime).toBeInstanceOf(Date);
  });

  it('tracks last analysis time across runs', async () => {
    const layer = createMockLayer();
    const analyzer = createScheduledAnalyzer(layer, { intervalHours: 24 });

    await analyzer.runAnalysis();
    const firstRun = await analyzer.getLastAnalysisTime();

    expect(firstRun).toBeInstanceOf(Date);

    await new Promise((r) => setTimeout(r, 5));

    await analyzer.runAnalysis();
    const secondRun = await analyzer.getLastAnalysisTime();

    expect(secondRun).toBeInstanceOf(Date);
    expect(secondRun!.getTime()).toBeGreaterThanOrEqual(firstRun!.getTime());
  });
});
