import { describe, it, expect, vi } from 'vitest';
import { createExecutor } from '../src/executor.js';
import { createBuiltinAgents } from '../src/agents/builtin.js';
import type { TaskNode, TaskId } from '../src/types.js';

describe('Executor', () => {
  it('runs single task to completion', async () => {
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'r',
      input: { task: 'do-thing' },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    };
    const result = await exec.execute([node]);
    expect(result[0]!.state).toBe('completed');
    expect(result[0]!.result?.output).toBeDefined();
  });

  it('runs multiple tasks in parallel up to concurrency', async () => {
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const nodes: TaskNode[] = [1, 2, 3, 4].map((i) => ({
      id: `t${i}` as TaskId,
      rule: 'r',
      input: { task: `task-${i}` },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    }));
    const results = await exec.execute(nodes);
    expect(results.every((r) => r.state === 'completed')).toBe(true);
  });

  it('respects concurrency limit', async () => {
    const agents = createBuiltinAgents();
    let active = 0;
    let maxActive = 0;
    const wrapped = {
      get: (name: string) => ({
        name,
        async execute(node: TaskNode) {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((r) => setTimeout(r, 20));
          active--;
          return { output: node.input.task, durationMs: 20 };
        },
      }),
      list: () => ['mock'],
    };
    const exec = createExecutor({ agents: wrapped as never, concurrency: 2 });
    const nodes: TaskNode[] = [1, 2, 3, 4, 5].map((i) => ({
      id: `t${i}` as TaskId,
      rule: 'r',
      input: { task: `t-${i}` },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    }));
    await exec.execute(nodes);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
