import type { Intent } from '../routing/types.js';
import type { ExecutionPlan } from '../orchestrator-v5.js';

export interface ExecutionContext {
  readonly requestId: string;
  readonly intent: Intent;
  readonly plan: ExecutionPlan;
  readonly startedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export function createExecutionContext(
  requestId: string,
  intent: Intent,
  plan: ExecutionPlan,
  metadata: Readonly<Record<string, unknown>> = {},
): ExecutionContext {
  return {
    requestId,
    intent,
    plan,
    startedAt: new Date(),
    metadata,
  };
}