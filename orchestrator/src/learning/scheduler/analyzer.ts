import type { AnalyticsEngine } from '../analytics/engine.js';
import type { AnalyticsMetrics } from '../analytics/metrics.js';
import type { PatternDetector } from '../patterns/detector.js';
import type { Pattern } from '../patterns/types.js';
import type { RecommendationEngine } from '../recommendations/engine.js';
import type { Recommendation } from '../recommendations/engine.js';
import { createScheduler, type SchedulerOptions } from './scheduler.js';

export interface AnalysisResult {
  metrics: AnalyticsMetrics;
  patterns: Pattern[];
  recommendations: Recommendation[];
  executedAt: Date;
  durationMs: number;
}

export interface AnalysisOptions {
  timeRange?: { days: number };
  includeRecommendations?: boolean;
}

export interface ScheduledAnalyzer {
  runAnalysis(options?: AnalysisOptions): Promise<AnalysisResult>;
  getLastAnalysisTime(): Promise<Date | null>;
  scheduleNext(): void;
}

export interface AnalyzerLayer {
  analytics: AnalyticsEngine;
  patterns: PatternDetector;
  recommendations: RecommendationEngine;
}

export interface ScheduledAnalyzerOptions extends SchedulerOptions {
  timeRange?: { days: number };
}

export function createScheduledAnalyzer(
  layer: AnalyzerLayer,
  options: ScheduledAnalyzerOptions = {},
): ScheduledAnalyzer {
  let lastAnalysisTime: Date | null = null;
  const scheduler = createScheduler(options);

  return {
    async runAnalysis(options: AnalysisOptions = {}) {
      const startTime = Date.now();
      const timeRange =
        options.timeRange ??
        { days: options.intervalHours ? options.intervalHours / 24 : 1 };

      const metrics = await layer.analytics.computeMetrics(timeRange);
      const patterns = await layer.patterns.detectPatterns(metrics);
      const recommendations =
        options.includeRecommendations !== false
          ? await layer.recommendations.generateRecommendations(patterns)
          : [];

      const durationMs = Date.now() - startTime;
      lastAnalysisTime = new Date();

      return {
        metrics,
        patterns,
        recommendations,
        executedAt: lastAnalysisTime,
        durationMs,
      };
    },

    async getLastAnalysisTime() {
      return lastAnalysisTime;
    },

    scheduleNext() {
      scheduler.scheduleNext();
    },
  };
}
