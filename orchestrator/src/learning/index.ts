export type {
  TelemetryEvent,
  EventType,
  ExecutionPayload,
  ClassificationPayload,
  ReviewerPayload,
  WorkflowPayload,
  EventPayload,
} from './telemetry/events.js';
export type { TelemetryStore, TelemetryQuery, TelemetryStats, TimeRange } from './telemetry/store.js';
export { createTelemetryStore, type TelemetryStoreOptions } from './telemetry/store.js';
export { createTelemetryCollector, type TelemetryCollector } from './telemetry/collector.js';

export type { AnalyticsMetrics, ExecutionMetrics, IntentMetrics, SkillMetrics } from './analytics/metrics.js';
export {
  queryExecutionEvents,
  queryClassificationEvents,
  isExecutionEvent,
  isClassificationEvent,
} from './analytics/queries.js';
export { createAnalyticsEngine, type AnalyticsEngine } from './analytics/engine.js';

export type { Pattern, PatternType, PatternSeverity, PatternEvidence } from './patterns/types.js';
export { PATTERN_THRESHOLDS, getThresholds } from './patterns/thresholds.js';
export { createPatternDetector, type PatternDetector } from './patterns/detector.js';

export type {
  Recommendation,
  RecommendationType,
  RecommendationPriority,
} from './recommendations/engine.js';
export { createRecommendationEngine, type RecommendationEngine } from './recommendations/engine.js';

export type { GovernanceTicket, TicketStatus } from './governance/tickets.js';
export { createTicket } from './governance/tickets.js';
export { AuditTrail, type AuditEntry } from './governance/audit.js';
export { createGovernanceLayer, type GovernanceLayer } from './governance/layer.js';

export { createScheduler, type Scheduler, type SchedulerOptions } from './scheduler/scheduler.js';
export {
  createScheduledAnalyzer,
  type ScheduledAnalyzer,
  type AnalysisResult,
  type AnalysisOptions,
  type AnalyzerLayer,
  type ScheduledAnalyzerOptions,
} from './scheduler/analyzer.js';

import { createTelemetryStore, type TelemetryStore } from './telemetry/store.js';
import { createTelemetryCollector, type TelemetryCollector } from './telemetry/collector.js';
import { createAnalyticsEngine, type AnalyticsEngine } from './analytics/engine.js';
import { createPatternDetector, type PatternDetector } from './patterns/detector.js';
import { createRecommendationEngine, type RecommendationEngine } from './recommendations/engine.js';
import { createGovernanceLayer, type GovernanceLayer } from './governance/layer.js';
import { createScheduledAnalyzer, type ScheduledAnalyzer, type AnalysisResult } from './scheduler/analyzer.js';
import type { TelemetryStoreOptions } from './telemetry/store.js';

export interface LearningLayer {
  collector: TelemetryCollector;
  store: TelemetryStore;
  analytics: AnalyticsEngine;
  patterns: PatternDetector;
  recommendations: RecommendationEngine;
  governance: GovernanceLayer;
  scheduler: ScheduledAnalyzer;
}

export interface LearningLayerOptions extends TelemetryStoreOptions {
  intervalHours?: number;
}

export async function createLearningLayer(options: LearningLayerOptions): Promise<LearningLayer> {
  const store = await createTelemetryStore({
    dbPath: options.dbPath,
    retentionDays: options.retentionDays,
  });
  const collector = createTelemetryCollector(store);
  const analytics = createAnalyticsEngine(store);
  const patterns = createPatternDetector();
  const recommendations = createRecommendationEngine();
  const governance = createGovernanceLayer();
  const scheduler = createScheduledAnalyzer(
    { analytics, patterns, recommendations },
    { intervalHours: options.intervalHours ?? 24 },
  );

  return { collector, store, analytics, patterns, recommendations, governance, scheduler };
}

export async function runAnalysis(
  layer: LearningLayer,
  options?: { timeRange?: { days: number } },
): Promise<AnalysisResult> {
  return layer.scheduler.runAnalysis(options);
}
