import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionPlan } from '../../src/orchestrator-v5.js';
import type { Executor } from '../../src/executors/skill-executor.js';
import type { ExecutionTask, TaskType } from '../../src/runtime/execution-task.js';
import { ExecutionEngine } from '../../src/runtime/execution-engine.js';

function createMockExecutor(success = true): Executor {
  return {
    type: 'skill' as TaskType,
    execute: vi.fn().mockResolvedValue({
      taskId: 'test',
      success,
      durationMs: 10,
      output: { result: 'done' },
      warnings: [],
      errors: [],
    }),
  } as Executor;
}

function createMockPlan(): ExecutionPlan {
  return {
    intent: 'blog',
    confidence: 0.9,
    skills: [{ id: 'skill-1', name: 'Skill 1', description: '', tags: [], status: 'stable', location: '' }],
    agents: [],
    workflows: [],
    reviewers: [],
    metadata: { generatedAt: new Date().toISOString(), source: 'classifier' },
    trace: { classificationSignals: [], resolvedIntent: 'blog' },
  };
}

describe('ExecutionEngine', () => {
  describe('execute (sequential)', () => {
    it('executes all tasks sequentially', async () => {
      const executor = createMockExecutor();
      const engine = new ExecutionEngine(new Map([['skill', executor]]));
      const plan = createMockPlan();

      const result = await engine.execute(plan, 'req-1');

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(executor.execute).toHaveBeenCalledTimes(1);
    });

    it('aggregates results correctly', async () => {
      const executor = createMockExecutor();
      const engine = new ExecutionEngine(new Map([['skill', executor]]));
      const plan = createMockPlan();

      const result = await engine.execute(plan, 'req-1');

      expect(result.totalTasks).toBe(1);
      expect(result.completedTasks).toBe(1);
      expect(result.failedTasks).toBe(0);
    });
  });

  describe('executeParallel', () => {
    it('executes independent tasks in parallel', async () => {
      const executor = createMockExecutor();
      const engine = new ExecutionEngine(new Map([['skill', executor]]));
      const plan: ExecutionPlan = {
        ...createMockPlan(),
        skills: [
          { id: 'skill-1', name: 'S1', description: '', tags: [], status: 'stable', location: '' },
          { id: 'skill-2', name: 'S2', description: '', tags: [], status: 'stable', location: '' },
        ],
      };

      const result = await engine.executeParallel(plan, 'req-2', { maxConcurrency: 2 });

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(2);
    });

    it('respects maxConcurrency', async () => {
      const executor = createMockExecutor();
      const engine = new ExecutionEngine(new Map([['skill', executor]]));
      const plan: ExecutionPlan = {
        ...createMockPlan(),
        skills: [
          { id: 'skill-1', name: 'S1', description: '', tags: [], status: 'stable', location: '' },
          { id: 'skill-2', name: 'S2', description: '', tags: [], status: 'stable', location: '' },
          { id: 'skill-3', name: 'S3', description: '', tags: [], status: 'stable', location: '' },
        ],
      };

      const result = await engine.executeParallel(plan, 'req-3', { maxConcurrency: 1 });

      expect(result.tasks).toHaveLength(3);
    });

    it('handles task failure in parallel', async () => {
      let callCount = 0;
      const executor: Executor = {
        type: 'skill' as TaskType,
        execute: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            taskId: 'test',
            success: callCount > 1 ? false : true,
            durationMs: 10,
            output: null,
            warnings: [],
            errors: callCount > 1 ? ['Task failed'] : [],
          };
        }),
      } as Executor;
      const engine = new ExecutionEngine(new Map([['skill', executor]]));
      const plan: ExecutionPlan = {
        ...createMockPlan(),
        skills: [
          { id: 'skill-1', name: 'S1', description: '', tags: [], status: 'stable', location: '' },
          { id: 'skill-2', name: 'S2', description: '', tags: [], status: 'stable', location: '' },
        ],
      };

      const result = await engine.executeParallel(plan, 'req-4');

      expect(result.tasks.some(t => !t.success)).toBe(true);
    });
  });
});