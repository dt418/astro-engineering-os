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
  /** Emit telemetry events; flushed automatically or via flush(). */
  emit(event: import('./telemetry/events.js').TelemetryEvent): void;
  flush(): Promise<void>;
  /** Run a one-shot analysis; thin wrapper over the scheduler. */
  runAnalysis(options?: { timeRange?: { days: number } }): Promise<AnalysisResult>;
  /** Submit a recommendation as a governance ticket. */
  submitRecommendation(rec: import('./recommendations/engine.js').Recommendation): Promise<import('./governance/tickets.js').GovernanceTicket>;
  /** Approve or reject a pending ticket. */
  approveRecommendation(ticketId: string, reviewedBy?: string): Promise<void>;
  rejectRecommendation(ticketId: string, reason: string, reviewedBy?: string): Promise<void>;
  /** Inspect governance state. */
  getPendingRecommendations(): Promise<import('./governance/tickets.js').GovernanceTicket[]>;
  getAuditEntries(ticketId?: string): Promise<import('./governance/audit.js').AuditEntry[]>;
  /** Lower-level access for advanced consumers. */
  internals: {
    store: TelemetryStore;
    collector: TelemetryCollector;
    analytics: AnalyticsEngine;
    patterns: PatternDetector;
    recommendations: RecommendationEngine;
    governance: GovernanceLayer;
    scheduler: ScheduledAnalyzer;
  };
}

export interface LearningLayerOptions extends TelemetryStoreOptions {
  intervalHours?: number;
  auditPersistPath?: string;
}

export class LearningLayerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningLayerValidationError';
  }
}

export async function createLearningLayer(options: LearningLayerOptions): Promise<LearningLayer> {
  if (!options.dbPath || typeof options.dbPath !== 'string') {
    throw new LearningLayerValidationError(
      'createLearningLayer: dbPath is required (use ":memory:" for in-memory)',
    );
  }
  if (options.intervalHours !== undefined && (!Number.isFinite(options.intervalHours) || options.intervalHours <= 0)) {
    throw new LearningLayerValidationError(
      `createLearningLayer: intervalHours must be a positive number, received ${options.intervalHours}`,
    );
  }

  const store = await createTelemetryStore({
    dbPath: options.dbPath,
    retentionDays: options.retentionDays,
  });
  const collector = createTelemetryCollector(store);
  const analytics = createAnalyticsEngine(store);
  const patterns = createPatternDetector();
  const recommendations = createRecommendationEngine();
  const governance = createGovernanceLayer(
    options.auditPersistPath ? { audit: { persistPath: options.auditPersistPath } } : {},
  );
  const scheduler = createScheduledAnalyzer(
    { analytics, patterns, recommendations },
    { intervalHours: options.intervalHours },
  );

  return {
    emit: (event) => collector.emit(event),
    flush: () => collector.flush(),
    runAnalysis: (opts) => scheduler.runAnalysis(opts),
    submitRecommendation: (rec) => governance.submitRecommendation(rec),
    approveRecommendation: (id, by) => governance.approveRecommendation(id, by),
    rejectRecommendation: (id, reason, by) => governance.rejectRecommendation(id, reason, by),
    getPendingRecommendations: () => governance.getPendingRecommendations(),
    getAuditEntries: (id) => governance.getAuditEntries(id),
    internals: { store, collector, analytics, patterns, recommendations, governance, scheduler },
  };
}

export async function runAnalysis(
  layer: LearningLayer,
  options?: { timeRange?: { days: number } },
): Promise<AnalysisResult> {
  return layer.runAnalysis(options);
}
