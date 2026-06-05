import { describe, it, expect, vi } from 'vitest';
import { createTelemetryCollector } from '../../../src/learning/telemetry/collector.js';
import type { TelemetryStore } from '../../../src/learning/telemetry/store.js';
import { createTelemetryEvent, type ExecutionPayload } from '../../../src/learning/telemetry/events.js';

function createMockStore(): TelemetryStore {
  return {
    store: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({ total: 0, byType: {}, byIntent: {} }),
    close: vi.fn(),
  };
}

describe('TelemetryCollector', () => {
  it('emits events to store', async () => {
    const mockStore = createMockStore();
    const collector = createTelemetryCollector(mockStore);

    const payload: ExecutionPayload = {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test-skill',
      durationMs: 100,
      success: true,
    };

    collector.emit(createTelemetryEvent('execution.completed', payload, 'req-1', 'test-intent'));

    await collector.flush();

    expect(mockStore.store).toHaveBeenCalledTimes(1);
  });

  it('queues events without blocking', () => {
    const mockStore = createMockStore();
    const collector = createTelemetryCollector(mockStore);
    const start = Date.now();

    collector.emit(
      createTelemetryEvent('execution.started', { taskId: 't1', taskType: 'skill', taskName: 's1' }),
    );
    collector.emit(
      createTelemetryEvent('execution.started', { taskId: 't2', taskType: 'skill', taskName: 's2' }),
    );
    collector.emit(
      createTelemetryEvent('execution.started', { taskId: 't3', taskType: 'skill', taskName: 's3' }),
    );

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('flushes all pending events', async () => {
    const mockStore = createMockStore();
    const collector = createTelemetryCollector(mockStore);

    for (let i = 0; i < 5; i++) {
      collector.emit(
        createTelemetryEvent('execution.started', {
          taskId: `task-${i}`,
          taskType: 'skill',
          taskName: `skill-${i}`,
        }),
      );
    }

    await collector.flush();

    expect(mockStore.store).toHaveBeenCalledTimes(5);
    expect(collector.getQueueSize()).toBe(0);
  });
});
