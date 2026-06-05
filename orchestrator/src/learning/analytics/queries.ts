import type { TelemetryStore } from '../telemetry/store.js';
import { daysToTimeRange } from '../telemetry/store.js';
import type { TelemetryEvent, ExecutionPayload, ClassificationPayload } from '../telemetry/events.js';
import { EXECUTION_EVENT_TYPES, CLASSIFICATION_EVENT_TYPES } from '../telemetry/events.js';

export function isExecutionEvent(
  event: TelemetryEvent,
): event is TelemetryEvent & { payload: ExecutionPayload } {
  return (EXECUTION_EVENT_TYPES as readonly string[]).includes(event.type);
}

export async function queryExecutionEvents(
  store: TelemetryStore,
  timeRange: { days: number },
): Promise<TelemetryEvent[]> {
  return store.query({
    types: [...EXECUTION_EVENT_TYPES],
    timeRange: daysToTimeRange(timeRange.days),
    limit: 10000,
  });
}

export async function queryClassificationEvents(
  store: TelemetryStore,
  timeRange: { days: number },
): Promise<TelemetryEvent[]> {
  return store.query({
    types: [...CLASSIFICATION_EVENT_TYPES],
    timeRange: daysToTimeRange(timeRange.days),
    limit: 10000,
  });
}

export function isClassificationEvent(
  event: TelemetryEvent,
): event is TelemetryEvent & { payload: ClassificationPayload } {
  return event.type === 'classification.confidence';
}
