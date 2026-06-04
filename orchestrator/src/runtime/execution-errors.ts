import type { ExecutionState } from './execution-state-machine.js';
import type { TaskType } from './execution-task.js';

export class ExecutionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly metadata?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class TaskExecutionError extends ExecutionError {
  constructor(
    public readonly taskId: string,
    public readonly taskType: TaskType,
    message: string,
    metadata?: Readonly<Record<string, unknown>>,
  ) {
    super('TASK_EXECUTION_ERROR', message, metadata);
    this.name = 'TaskExecutionError';
  }
}

export class SkillExecutionError extends TaskExecutionError {
  constructor(taskId: string, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(taskId, 'skill', message, metadata);
    this.name = 'SkillExecutionError';
  }
}

export class WorkflowExecutionError extends TaskExecutionError {
  constructor(taskId: string, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(taskId, 'workflow', message, metadata);
    this.name = 'WorkflowExecutionError';
  }
}

export class ReviewerExecutionError extends TaskExecutionError {
  constructor(taskId: string, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(taskId, 'reviewer', message, metadata);
    this.name = 'ReviewerExecutionError';
  }
}

export class StateTransitionError extends ExecutionError {
  constructor(
    public readonly fromState: ExecutionState,
    public readonly toState: ExecutionState,
    message: string,
  ) {
    super('STATE_TRANSITION_ERROR', message);
    this.name = 'StateTransitionError';
  }
}