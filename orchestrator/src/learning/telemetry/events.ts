import { randomUUID } from 'node:crypto';

export type EventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'classification.confidence'
  | 'classification.resolved'
  | 'reviewer.invoked'
  | 'reviewer.completed'
  | 'workflow.completed';

export const EXECUTION_EVENT_TYPES = [
  'execution.started',
  'execution.completed',
  'execution.failed',
] as const satisfies readonly EventType[];

export const CLASSIFICATION_EVENT_TYPES = [
  'classification.confidence',
  'classification.resolved',
] as const satisfies readonly EventType[];

export const REVIEWER_EVENT_TYPES = [
  'reviewer.invoked',
  'reviewer.completed',
] as const satisfies readonly EventType[];

export interface ExecutionPayload {
  taskId: string;
  taskType: 'skill' | 'workflow' | 'reviewer';
  taskName: string;
  durationMs?: number;
  success?: boolean;
  error?: string;
}

export interface ClassificationPayload {
  intent: string;
  confidence: number;
  signals: string[];
}

export interface ReviewerPayload {
  reviewerId: string;
  outcome: 'approved' | 'rejected' | 'skipped';
  durationMs?: number;
}

export interface WorkflowPayload {
  workflowId: string;
  outcome: 'completed' | 'failed' | 'cancelled';
  durationMs?: number;
  taskCount?: number;
}

export type EventPayload = ExecutionPayload | ClassificationPayload | ReviewerPayload | WorkflowPayload;

export interface TelemetryEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  requestId?: string;
  intent?: string;
  payload: EventPayload;
}

export function createTelemetryEvent(
  type: EventType,
  payload: EventPayload,
  requestId?: string,
  intent?: string,
): TelemetryEvent {
  return {
    id: randomUUID(),
    type,
    timestamp: new Date(),
    requestId,
    intent,
    payload,
  };
}
