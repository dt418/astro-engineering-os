export interface TaskResult {
  readonly taskId: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly output: unknown;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface ExecutionResult {
  readonly requestId: string;
  readonly success: boolean;
  readonly tasks: readonly TaskResult[];
  readonly durationMs: number;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly startedAt: Date;
  readonly completedAt: Date;
}

export function createTaskResult(
  taskId: string,
  success: boolean,
  durationMs: number,
  output: unknown,
  warnings: readonly string[] = [],
  errors: readonly string[] = [],
): TaskResult {
  return { taskId, success, durationMs, output, warnings, errors };
}

export function createExecutionResult(
  requestId: string,
  tasks: readonly TaskResult[],
  startedAt: Date,
): ExecutionResult {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.success).length;
  const failedTasks = totalTasks - completedTasks;
  const warnings = tasks.flatMap(t => t.warnings);
  const errors = tasks.flatMap(t => t.errors);
  const success = failedTasks === 0;

  return {
    requestId,
    success,
    tasks,
    durationMs,
    totalTasks,
    completedTasks,
    failedTasks,
    warnings,
    errors,
    startedAt,
    completedAt,
  };
}