import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionEngine } from '../../src/runtime/execution-engine.js';
import type { ExecutionPlan } from '../../src/orchestrator-v5.js';
import type { TaskResult } from '../../src/runtime/execution-result.js';
import type { Executor } from '../../src/executors/skill-executor.js';
import type { ExecutionTask } from '../../src/runtime/execution-task.js';
import type { ExecutionContext } from '../../src/runtime/execution-context.js';

const createMockPlan = (skills: string[] = [], workflows: string[] = [], reviewers: string[] = []): ExecutionPlan => ({
  intent: 'blog' as any,
  confidence: 0.9,
  skills: skills.map(id => ({ id, version: '1.0.0', status: 'active', purpose: '', tags: [] })),
  agents: [],
  workflows: workflows.map(id => ({ id, version: '1.0.0', status: 'active', purpose: '', tags: [] })),
  reviewers: reviewers.map(id => ({ id, version: '1.0.0', status: 'active', purpose: '', tags: [] })),
  metadata: { generatedAt: new Date().toISOString(), source: 'classifier' },
  trace: { classificationSignals: [], resolvedIntent: 'blog' },
});

const createMockExecutor = (): Executor & { execute: ReturnType<typeof vi.fn> } => {
  const executor = {
    type: 'skill' as const,
    execute: vi.fn<[ExecutionTask, ExecutionContext], Promise<TaskResult>>(),
  };
  executor.execute.mockResolvedValue({
    taskId: 'task-1',
    success: true,
    durationMs: 10,
    output: {},
    warnings: [],
    errors: [],
  });
  return executor;
};

describe('ExecutionEngine', () => {
  describe('execute', () => {
    it('should execute a single skill task', async () => {
      const mockExecutor = createMockExecutor();
      const engine = new ExecutionEngine(new Map([['skill', mockExecutor]]));
      const plan = createMockPlan(['astro-blog']);

      const result = await engine.execute(plan, 'req-123');

      expect(result.requestId).toBe('req-123');
      expect(result.totalTasks).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should execute multiple tasks sequentially', async () => {
      const skillExecutor = createMockExecutor();
      const workflowExecutor = createMockExecutor();
      workflowExecutor.execute.mockResolvedValue({
        taskId: 'task-2',
        success: true,
        durationMs: 20,
        output: {},
        warnings: [],
        errors: [],
      });

      const engine = new ExecutionEngine(
        new Map([
          ['skill', skillExecutor],
          ['workflow', workflowExecutor],
        ]),
      );
      const plan = createMockPlan(['astro-blog'], ['feature-development']);

      const result = await engine.execute(plan, 'req-456');

      expect(result.totalTasks).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should handle task failure without halting execution', async () => {
      const skillExecutor = createMockExecutor();
      skillExecutor.execute.mockResolvedValueOnce({
        taskId: 'task-1',
        success: false,
        durationMs: 10,
        output: null,
        warnings: [],
        errors: ['Skill execution failed'],
      });

      const engine = new ExecutionEngine(new Map([['skill', skillExecutor]]));
      const plan = createMockPlan(['astro-blog']);

      const result = await engine.execute(plan, 'req-789');

      expect(result.success).toBe(false);
      expect(result.failedTasks).toBe(1);
    });
  });

  describe('retry logic', () => {
    it('should retry failed tasks', async () => {
      const mockExecutor = createMockExecutor();
      mockExecutor.execute
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          taskId: 'task-1',
          success: true,
          durationMs: 10,
          output: {},
          warnings: [],
          errors: [],
        });

      const engine = new ExecutionEngine(new Map([['skill', mockExecutor]]), { maxRetries: 1 });
      const plan = createMockPlan(['astro-blog']);

      const result = await engine.execute(plan, 'req-retry');

      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });
});
