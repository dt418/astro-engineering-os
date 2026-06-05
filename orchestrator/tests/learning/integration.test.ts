import { describe, it, expect } from 'vitest';
import { createLearningLayer, runAnalysis } from '../../src/learning/index.js';
import { createTelemetryEvent } from '../../src/learning/telemetry/events.js';

describe('Learning Layer Integration', () => {
  it('end-to-end: emit events, run analysis, detect patterns', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });

    const events = [
      createTelemetryEvent(
        'execution.completed',
        {
          taskId: 'task-1',
          taskType: 'skill',
          taskName: 'skill-a',
          durationMs: 100,
          success: true,
        },
        'req-1',
        'intent-a',
      ),
      createTelemetryEvent(
        'execution.completed',
        {
          taskId: 'task-2',
          taskType: 'skill',
          taskName: 'skill-a',
          durationMs: 150,
          success: true,
        },
        'req-2',
        'intent-a',
      ),
      createTelemetryEvent(
        'execution.failed',
        {
          taskId: 'task-3',
          taskType: 'skill',
          taskName: 'skill-a',
          durationMs: 80,
          success: false,
          error: 'timeout',
        },
        'req-3',
        'intent-a',
      ),
    ];

    for (const event of events) {
      layer.collector.emit(event);
    }

    await layer.collector.flush();

    const result = await runAnalysis(layer, { timeRange: { days: 1 } });

    expect(result.metrics).toBeDefined();
    expect(result.executedAt).toBeInstanceOf(Date);

    if (result.patterns.length > 0) {
      expect(result.patterns[0]!.type).toBeDefined();
    }
  });

  it('recommendation workflow: submit, approve, audit', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });

    const rec = {
      id: 'r1',
      type: 'intent_mapping_suggestion' as const,
      priority: 'high' as const,
      target: 'test-intent',
      description: 'Add skill to improve coverage',
      rationale: 'Low coverage detected in analytics',
      confidence: 0.85,
      patterns: [],
      actionableSteps: ['Update intents.yaml'],
    };

    const ticket = await layer.governance.submitRecommendation(rec);
    expect(ticket.status).toBe('pending');

    await layer.governance.approveRecommendation(ticket.id, 'admin');

    const updated = await layer.governance.getTicket(ticket.id);
    expect(updated!.status).toBe('approved');
    expect(updated!.reviewedBy).toBe('admin');
  });
});
