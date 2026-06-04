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

  it('retries on transient failure and completes', async () => {
    let calls = 0;
    const flaky = {
      get: (name: string) => ({
        name,
        async execute(node: TaskNode) {
          calls++;
          if (calls === 1) {
            throw new Error('transient');
          }
          return { output: `ok:${node.input.task}`, durationMs: 5 };
        },
      }),
      list: () => ['flaky'],
    };
    const exec = createExecutor({ agents: flaky as never, concurrency: 1 });
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'r',
      input: { task: 'flaky-task' },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    };
    const [result] = await exec.execute([node]);
    expect(result!.state).toBe('completed');
    expect(result!.attempts).toBe(1);
    expect(calls).toBe(2);
  });

  it('marks task failed after exhausting all attempts', async () => {
    let calls = 0;
    const alwaysFails = {
      get: (name: string) => ({
        name,
        async execute(_node: TaskNode) {
          calls++;
          throw new Error('persistent failure');
        },
      }),
      list: () => ['always-fails'],
    };
    const exec = createExecutor({ agents: alwaysFails as never, concurrency: 1 });
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'r',
      input: { task: 'doomed-task' },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    };
    const [result] = await exec.execute([node]);
    expect(result!.state).toBe('failed');
    expect(result!.attempts).toBe(1);
    expect(result!.result?.error?.code).toBe('TRANSIENT');
    expect(calls).toBe(2);
  });

  it('marks task failed with FATAL error when no agent matches', async () => {
    const emptyRegistry = {
      get: (_name: string) => null,
      list: () => [],
      register: (_agent: never) => {},
    };
    const exec = createExecutor({ agents: emptyRegistry, concurrency: 1 });
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'unknown-rule',
      input: { task: 'orphan-task' },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    };
    const [result] = await exec.execute([node]);
    expect(result!.state).toBe('failed');
    expect(result!.result?.error?.code).toBe('FATAL');
    expect(result!.result?.error?.message).toContain('No agent for: implementer');
  });
});
