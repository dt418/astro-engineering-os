import { describe, it, expect, beforeEach } from 'vitest';
import { createAnalyticsEngine } from '../../../src/learning/analytics/engine.js';
import { createTelemetryStore, type TelemetryStore } from '../../../src/learning/telemetry/store.js';
import { createTelemetryEvent } from '../../../src/learning/telemetry/events.js';

describe('AnalyticsEngine', () => {
  let engine: ReturnType<typeof createAnalyticsEngine>;
  let store: TelemetryStore;

  beforeEach(async () => {
    store = await createTelemetryStore({ dbPath: ':memory:' });
    engine = createAnalyticsEngine(store);
  });

  it('computes execution duration metrics', async () => {
    for (let i = 0; i < 10; i++) {
      await store.store(
        createTelemetryEvent(
          'execution.completed',
          {
            taskId: `task-${i}`,
            taskType: 'skill',
            taskName: 'test-skill',
            durationMs: 100 + i * 10,
            success: true,
          },
          `req-${i}`,
        ),
      );
    }

    const metrics = await engine.computeMetrics({ days: 1 });

    expect(metrics.execution.duration.p50).toBeDefined();
    expect(metrics.execution.duration.p90).toBeDefined();
    expect(metrics.execution.duration.p99).toBeDefined();
  });

  it('computes success rate per intent', async () => {
    await store.store(
      createTelemetryEvent(
        'execution.completed',
        {
          taskId: 'task-1',
          taskType: 'skill',
          taskName: 'skill-a',
          success: true,
        },
        'req-1',
        'intent-a',
      ),
    );

    await store.store(
      createTelemetryEvent(
        'execution.failed',
        {
          taskId: 'task-2',
          taskType: 'skill',
          taskName: 'skill-a',
          success: false,
          error: 'timeout',
        },
        'req-2',
        'intent-a',
      ),
    );

    const stats = await engine.getIntentStats('intent-a');

    expect(stats.totalExecutions).toBe(2);
    expect(stats.successRate).toBe(0.5);
  });

  it('computes skill utilization rates', async () => {
    const skillIds = ['skill-1', 'skill-2', 'skill-3'];

    for (const skillId of skillIds) {
      await store.store(
        createTelemetryEvent('execution.completed', {
          taskId: `task-${skillId}`,
          taskType: 'skill',
          taskName: skillId,
          success: true,
        }),
      );
    }

    const stats = await engine.getSkillStats('skill-1');

    expect(stats.invocationCount).toBeGreaterThan(0);
  });
});
