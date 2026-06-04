export type TaskId = string & { readonly __brand: 'TaskId' };

export function newTaskId(): TaskId {
  return `t-${crypto.randomUUID()}` as TaskId;
}

export type TaskState =
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked';

export interface RoutingRule {
  id: string;
  pattern: string;
  agent: string;
  priority: number;
  config?: Record<string, unknown>;
}

export interface TaskInput {
  task: string;
  context?: Record<string, unknown>;
}

export interface TaskError {
  code: 'TRANSIENT' | 'FATAL' | 'VALIDATION';
  message: string;
  cause?: unknown;
  causeMessage?: string;
}

export interface TaskResult {
  output: unknown;
  durationMs: number;
  error?: TaskError;
}

export interface TaskNode {
  id: TaskId;
  rule: string;
  input: TaskInput;
  state: TaskState;
  dependsOn: TaskId[];
  attempts: number;
  result?: TaskResult;
}

export interface OrchestratorConfig {
  concurrency: number;
  dbPath: string;
  rulesPath: string;
}

export const DEFAULT_CONFIG: OrchestratorConfig = {
  concurrency: 3,
  dbPath: '.orchestrator/history.db',
  rulesPath: 'orchestrator/astro-orchestrator.md',
};
