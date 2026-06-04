import { describe, it, expect } from 'vitest';
import {
  type TelemetryEvent,
  type ExecutionPayload,
  type ClassificationPayload,
  type ReviewerPayload,
  type WorkflowPayload,
  type EventType,
  createTelemetryEvent,
} from '../../../src/learning/telemetry/events.js';

describe('TelemetryEvent', () => {
  it('creates execution event with required fields', () => {
    const payload: ExecutionPayload = {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test-skill',
      durationMs: 100,
      success: true,
    };
    const event = createTelemetryEvent('execution.completed', payload);
    
    expect(event.id).toBeDefined();
    expect(event.type).toBe('execution.completed');
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.payload).toEqual(payload);
  });

  it('creates classification event with confidence', () => {
    const payload: ClassificationPayload = {
      intent: 'code-review',
      confidence: 0.95,
      signals: ['keyword:review', 'keyword:code'],
    };
    const event = createTelemetryEvent('classification.confidence', payload, 'req-123', 'code-review');
    
    expect(event.requestId).toBe('req-123');
    expect(event.intent).toBe('code-review');
  });

  it('creates reviewer event with outcome', () => {
    const payload: ReviewerPayload = {
      reviewerId: 'expert-reviewer',
      outcome: 'approved',
      durationMs: 250,
    };
    const event = createTelemetryEvent('reviewer.completed', payload);
    
    expect(event.payload.outcome).toBe('approved');
  });
});
