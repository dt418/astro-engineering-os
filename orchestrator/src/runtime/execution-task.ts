import type { Intent } from '../routing/types.js';

export type TaskType = 'skill' | 'workflow' | 'reviewer';

export interface ExecutionTask {
  readonly id: string;
  readonly type: TaskType;
  readonly target: string;
  readonly intent: Intent;
  readonly priority: number;
  readonly dependencies: readonly string[];
}

export function createExecutionTask(
  id: string,
  type: TaskType,
  target: string,
  intent: Intent,
  priority: number = 0,
  dependencies: readonly string[] = [],
): ExecutionTask {
  return { id, type, target, intent, priority, dependencies };
}