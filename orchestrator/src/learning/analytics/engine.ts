import type { TelemetryStore } from '../telemetry/store.js';
import type {
  AnalyticsMetrics,
  ExecutionMetrics,
  IntentMetrics,
  SkillMetrics,
} from './metrics.js';
import type { TelemetryEvent, ClassificationPayload } from '../telemetry/events.js';
import {
  queryExecutionEvents,
  queryClassificationEvents,
  isExecutionEvent,
  isClassificationEvent,
} from './queries.js';

export interface AnalyticsEngine {
  computeMetrics(timeRange: { days: number }): Promise<AnalyticsMetrics>;
  getIntentStats(intent: string): Promise<IntentMetrics>;
  getSkillStats(skillId: string): Promise<SkillMetrics>;
}

export function createAnalyticsEngine(store: TelemetryStore): AnalyticsEngine {
  return {
    async computeMetrics(timeRange) {
      const execEvents = await queryExecutionEvents(store, timeRange);
      const classEvents = await queryClassificationEvents(store, timeRange);

      const execution = computeExecutionMetrics(execEvents);
      const byIntent = computeIntentMetrics(execEvents);
      const bySkill = computeSkillMetrics(execEvents);
      const classificationConfidence = computeClassificationMetrics(classEvents);

      return { execution, byIntent, bySkill, classificationConfidence };
    },

    async getIntentStats(intent) {
      const events = await store.query({ intent, limit: 1000 });
      const execEvents = events.filter(isExecutionEvent);

      if (execEvents.length === 0) {
        return { totalExecutions: 0, successRate: 0, avgConfidence: 0, avgDurationMs: 0 };
      }

      const successes = execEvents.filter((e) => e.payload.success === true).length;
      const durations = execEvents
        .map((e) => e.payload.durationMs ?? 0)
        .filter((d) => d > 0);

      return {
        totalExecutions: execEvents.length,
        successRate: successes / execEvents.length,
        avgConfidence: 0,
        avgDurationMs:
          durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      };
    },

    async getSkillStats(skillId) {
      const events = await store.query({ limit: 1000 });
      const execEvents = events
        .filter(isExecutionEvent)
        .filter((e) => e.payload.taskName === skillId);

      if (execEvents.length === 0) {
        return { invocationCount: 0, successRate: 0, avgDurationMs: 0 };
      }

      const successes = execEvents.filter((e) => e.payload.success === true).length;
      const durations = execEvents
        .map((e) => e.payload.durationMs ?? 0)
        .filter((d) => d > 0);
      const lastInvoked = execEvents.reduce(
        (latest, e) => (e.timestamp > latest ? e.timestamp : latest),
        new Date(0),
      );

      return {
        invocationCount: execEvents.length,
        successRate: successes / execEvents.length,
        avgDurationMs:
          durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        lastInvoked: lastInvoked.getTime() > 0 ? lastInvoked : undefined,
      };
    },
  };
}

function computeExecutionMetrics(events: TelemetryEvent[]): ExecutionMetrics {
  const completedEvents = events.filter(
    (e) => e.type === 'execution.completed' && e.payload.durationMs !== undefined,
  );

  if (completedEvents.length === 0) {
    return {
      duration: { p50: 0, p90: 0, p99: 0, avg: 0, min: 0, max: 0 },
      successRate: 0,
      failureRate: 0,
    };
  }

  const durations = completedEvents
    .map((e) => e.payload.durationMs!)
    .sort((a, b) => a - b);
  const successes = completedEvents.filter((e) => e.payload.success === true).length;

  return {
    duration: {
      p50: percentile(durations, 50),
      p90: percentile(durations, 90),
      p99: percentile(durations, 99),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: durations[0]!,
      max: durations[durations.length - 1]!,
    },
    successRate: successes / completedEvents.length,
    failureRate: (completedEvents.length - successes) / completedEvents.length,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function computeIntentMetrics(events: TelemetryEvent[]): Record<string, IntentMetrics> {
  const byIntent: Record<string, { total: number; successes: number; durations: number[] }> = {};

  for (const event of events) {
    if (!event.intent) continue;

    if (!byIntent[event.intent]) {
      byIntent[event.intent] = { total: 0, successes: 0, durations: [] };
    }

    byIntent[event.intent]!.total++;
    if (event.payload.success === true) byIntent[event.intent]!.successes++;
    if (event.payload.durationMs !== undefined) byIntent[event.intent]!.durations.push(event.payload.durationMs);
  }

  const result: Record<string, IntentMetrics> = {};
  for (const [intent, data] of Object.entries(byIntent)) {
    result[intent] = {
      totalExecutions: data.total,
      successRate: data.total > 0 ? data.successes / data.total : 0,
      avgConfidence: 0,
      avgDurationMs:
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : 0,
    };
  }

  return result;
}

function computeSkillMetrics(events: TelemetryEvent[]): Record<string, SkillMetrics> {
  const bySkill: Record<string, { count: number; successes: number; durations: number[] }> = {};

  for (const event of events) {
    const name = event.payload.taskName;
    if (!name) continue;

    if (!bySkill[name]) {
      bySkill[name] = { count: 0, successes: 0, durations: [] };
    }

    bySkill[name]!.count++;
    if (event.payload.success === true) bySkill[name]!.successes++;
    if (event.payload.durationMs !== undefined) bySkill[name]!.durations.push(event.payload.durationMs);
  }

  const result: Record<string, SkillMetrics> = {};
  for (const [skill, data] of Object.entries(bySkill)) {
    result[skill] = {
      invocationCount: data.count,
      successRate: data.count > 0 ? data.successes / data.count : 0,
      avgDurationMs:
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : 0,
    };
  }

  return result;
}

function computeClassificationMetrics(events: TelemetryEvent[]): {
  avg: number;
  distribution: { bucket: string; count: number }[];
} {
  if (events.length === 0) {
    return { avg: 0, distribution: [] };
  }

  const confidences = events
    .filter(isClassificationEvent)
    .map((e) => (e.payload as ClassificationPayload).confidence);

  if (confidences.length === 0) {
    return { avg: 0, distribution: [] };
  }

  const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const buckets = [
    { bucket: '0.0-0.2', min: 0, max: 0.2 },
    { bucket: '0.2-0.4', min: 0.2, max: 0.4 },
    { bucket: '0.4-0.6', min: 0.4, max: 0.6 },
    { bucket: '0.6-0.8', min: 0.6, max: 0.8 },
    { bucket: '0.8-1.0', min: 0.8, max: 1.0 },
  ];

  const distribution = buckets.map((b) => ({
    bucket: b.bucket,
    count: confidences.filter((c) => c >= b.min && c < b.max).length,
  }));

  return { avg, distribution };
}
