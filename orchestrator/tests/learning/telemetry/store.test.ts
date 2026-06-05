import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTelemetryStore, type TelemetryStore, type TimeRange } from '../../../src/learning/telemetry/store.js';
import { createTelemetryEvent, type ExecutionPayload } from '../../../src/learning/telemetry/events.js';

describe('TelemetryStore', () => {
  let store: TelemetryStore;

  beforeEach(async () => {
    store = await createTelemetryStore({ dbPath: ':memory:' });
  });

  afterEach(() => {
    store.close();
  });

  it('stores and retrieves telemetry events', async () => {
    const payload: ExecutionPayload = {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test-skill',
      durationMs: 100,
      success: true,
    };
    const event = createTelemetryEvent('execution.completed', payload, 'req-1', 'test-intent');

    await store.store(event);

    const retrieved = await store.query({ requestId: 'req-1' });
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].payload).toEqual(payload);
  });

  it('queries events by time range', async () => {
    const now = new Date();
    const event = createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test',
    });

    await store.store(event);

    const range: TimeRange = {
      start: new Date(now.getTime() - 60000),
      end: new Date(now.getTime() + 60000),
    };
    const results = await store.query({ timeRange: range });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('queries events by event type', async () => {
    const event = createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test',
    });

    await store.store(event);

    const results = await store.query({ types: ['execution.completed'] });
    expect(results.every((e) => e.type === 'execution.completed')).toBe(true);
  });

  it('returns stats for time range', async () => {
    const event = createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test',
      success: true,
    });

    await store.store(event);

    const now = new Date();
    const stats = await store.getStats({
      start: new Date(now.getTime() - 60000),
      end: new Date(now.getTime() + 60000),
    });
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.byType).toHaveProperty('execution.completed');
  });
});
