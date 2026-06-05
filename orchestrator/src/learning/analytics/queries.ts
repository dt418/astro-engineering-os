import type { TelemetryStore } from '../telemetry/store.js';
import type { TelemetryEvent, ExecutionPayload, ClassificationPayload } from '../telemetry/events.js';

export function isExecutionEvent(
  event: TelemetryEvent,
): event is TelemetryEvent & { payload: ExecutionPayload } {
  return event.type.startsWith('execution.');
}

export async function queryExecutionEvents(
  store: TelemetryStore,
  timeRange: { days: number },
): Promise<TelemetryEvent[]> {
  const now = new Date();
  const start = new Date(now.getTime() - timeRange.days * 24 * 60 * 60 * 1000);

  return store.query({
    types: ['execution.started', 'execution.completed', 'execution.failed'],
    timeRange: { start, end: now },
    limit: 10000,
  });
}

export async function queryClassificationEvents(
  store: TelemetryStore,
  timeRange: { days: number },
): Promise<TelemetryEvent[]> {
  const now = new Date();
  const start = new Date(now.getTime() - timeRange.days * 24 * 60 * 60 * 1000);

  return store.query({
    types: ['classification.confidence'],
    timeRange: { start, end: now },
    limit: 10000,
  });
}

export function isClassificationEvent(
  event: TelemetryEvent,
): event is TelemetryEvent & { payload: ClassificationPayload } {
  return event.type === 'classification.confidence';
}
