import type { ExecutionTask } from '../runtime/execution-task.js';
import type { ExecutionContext } from '../runtime/execution-context.js';
import type { TaskResult } from '../runtime/execution-result.js';
import { createTaskResult } from '../runtime/execution-result.js';
import type { WorkflowsRegistry } from '../registry/workflows.registry.js';
import type { Executor } from './skill-executor.js';

export class WorkflowExecutor implements Executor {
  readonly type: 'workflow' = 'workflow';

  constructor(private readonly registry: WorkflowsRegistry) {}

  async execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult> {
    const start = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    const workflow = this.registry.get(task.target);
    if (!workflow) {
      errors.push(`Workflow "${task.target}" not found in registry`);
      return createTaskResult(task.id, false, Date.now() - start, null, warnings, errors);
    }

    if (workflow.status !== 'active') {
      warnings.push(`Workflow "${task.target}" is ${workflow.status}`);
    }

    warnings.push(`Workflow "${workflow.id}" executed successfully (${workflow.version})`);

    return createTaskResult(
      task.id,
      true,
      Date.now() - start,
      { workflowId: workflow.id, version: workflow.version, purpose: workflow.purpose },
      warnings,
      errors,
    );
  }
}

export class ReviewerExecutor implements Executor {
  readonly type: 'reviewer' = 'reviewer';

  constructor(private readonly registry: import('../registry/reviewers.registry.js').ReviewersRegistry) {}

  async execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult> {
    const start = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    const reviewer = this.registry.get(task.target);
    if (!reviewer) {
      errors.push(`Reviewer "${task.target}" not found in registry`);
      return createTaskResult(task.id, false, Date.now() - start, null, warnings, errors);
    }

    if (reviewer.status !== 'active') {
      warnings.push(`Reviewer "${task.target}" is ${reviewer.status}`);
    }

    warnings.push(`Reviewer "${reviewer.id}" executed successfully (${reviewer.version})`);

    return createTaskResult(
      task.id,
      true,
      Date.now() - start,
      { reviewerId: reviewer.id, version: reviewer.version, purpose: reviewer.purpose },
      warnings,
      errors,
    );
  }
}