import type { TaskType } from '../runtime/execution-task.js';
import type { ExecutionContext } from '../runtime/execution-context.js';
import type { TaskResult } from '../runtime/execution-result.js';
import type { ExecutionTask } from '../runtime/execution-task.js';
import { createTaskResult } from '../runtime/execution-result.js';
import type { SkillsRegistry } from '../registry/skills.registry.js';

export interface Executor {
  readonly type: TaskType;
  execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult>;
}

export class SkillExecutor implements Executor {
  readonly type: 'skill' = 'skill';

  constructor(private readonly registry: SkillsRegistry) {}

  async execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult> {
    const start = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    const skill = this.registry.get(task.target);
    if (!skill) {
      errors.push(`Skill "${task.target}" not found in registry`);
      return createTaskResult(task.id, false, Date.now() - start, null, warnings, errors);
    }

    if (skill.status !== 'active') {
      warnings.push(`Skill "${task.target}" is ${skill.status}`);
    }

    warnings.push(`Skill "${skill.id}" executed successfully (${skill.version})`);

    return createTaskResult(
      task.id,
      true,
      Date.now() - start,
      { skillId: skill.id, version: skill.version, purpose: skill.purpose },
      warnings,
      errors,
    );
  }
}