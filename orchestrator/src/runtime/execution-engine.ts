import type { ExecutionPlan } from '../orchestrator-v5.js';
import type { TaskResult } from './execution-result.js';
import type { ExecutionTask } from './execution-task.js';
import type { Executor } from '../executors/skill-executor.js';
import type { ExecutionContext } from './execution-context.js';
import { createExecutionContext } from './execution-context.js';
import { createExecutionResult } from './execution-result.js';
import { createExecutionTask } from './execution-task.js';
import { ExecutionEventEmitter, type ExecutionEvent } from './execution-events.js';
import type { TaskType } from './execution-task.js';
import { buildGraph, detectCycles, topologicalSort, updatePendingDegrees } from './dependency-graph.js';
import { ReadyQueue } from './ready-queue.js';
import { WorkerPool } from './worker-pool.js';
import { cpus } from 'node:os';

export interface ExecutionEngineConfig {
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly timeoutMs?: number;
}

export interface ParallelExecutionConfig extends ExecutionEngineConfig {
  readonly maxConcurrency?: number;
}

export class ExecutionEngine {
  constructor(
    private readonly executors: ReadonlyMap<TaskType, Executor>,
    private readonly config: ExecutionEngineConfig = {},
  ) {}

  async execute(plan: ExecutionPlan, requestId: string): Promise<import('./execution-result.js').ExecutionResult> {
    const emitter = new ExecutionEventEmitter();
    const startedAt = new Date();
    const context = createExecutionContext(requestId, plan.intent, plan);

    const tasks = this.buildTasks(plan, requestId);
    const results: TaskResult[] = [];

    emitter.emit({ type: 'execution:started', requestId, timestamp: new Date(), data: { taskCount: tasks.length } });

    let executionSuccess = true;

    for (const task of tasks) {
      const taskResult = await this.executeTask(task, context, emitter);
      results.push(taskResult);

      if (!taskResult.success) {
        executionSuccess = false;
        emitter.emit({ type: 'task:failed', requestId, timestamp: new Date(), data: { taskId: task.id } });
      } else {
        emitter.emit({ type: 'task:completed', requestId, timestamp: new Date(), data: { taskId: task.id } });
      }
    }

    const result = createExecutionResult(requestId, results, startedAt);

    emitter.emit({
      type: executionSuccess ? 'execution:completed' : 'execution:failed',
      requestId,
      timestamp: new Date(),
      data: { result },
    });

    return result;
  }

  async executeParallel(
    plan: ExecutionPlan,
    requestId: string,
    config: ParallelExecutionConfig = {},
  ): Promise<import('./execution-result.js').ExecutionResult> {
    const emitter = new ExecutionEventEmitter();
    const startedAt = new Date();
    const context = createExecutionContext(requestId, plan.intent, plan);

    const tasks = this.buildTasks(plan, requestId);
    const graph = buildGraph(tasks);

    const cycleError = detectCycles(graph);
    if (cycleError) {
      throw Object.assign(new Error(cycleError.message), { code: cycleError.code, cycleNodes: cycleError.cycleNodes });
    }

    const levels = topologicalSort(graph);
    const results: TaskResult[] = [];
    const completed = new Set<string>();
    const pendingDegrees = new Map<string, number>();

    for (const [id, node] of graph.nodes) {
      pendingDegrees.set(id, node.dependencies.length);
    }

    const maxConcurrency = config.maxConcurrency ?? Math.max(1, cpus().length - 1);
    const workerPool = new WorkerPool<ExecutionTask, TaskResult>({ maxWorkers: maxConcurrency });

    emitter.emit({ type: 'execution:started', requestId, timestamp: new Date(), data: { taskCount: tasks.length, parallel: true } });

    const taskMap = new Map<string, ExecutionTask>();
    for (const task of tasks) taskMap.set(task.id, task);

    const queue = new ReadyQueue();
    for (const level of levels) queue.enqueueBatch(level);

    while (completed.size < tasks.length) {
      const ready = queue.dequeueN(maxConcurrency);
      if (ready.length === 0) break;

      const readyTasks = ready.map(id => taskMap.get(id)!).filter(Boolean);
      const levelResults = await workerPool.run(readyTasks, task => this.executeTask(task, context, emitter));

      for (let i = 0; i < ready.length; i++) {
        const taskId = ready[i]!;
        const result = levelResults[i];
        if (result && taskId) {
          results.push(result);
          completed.add(taskId);
          updatePendingDegrees(graph, taskId, pendingDegrees);
        }
      }

      for (const [id, degree] of pendingDegrees) {
        if (!completed.has(id) && degree === 0 && !queue.peek()?.includes(id)) {
          queue.enqueue(id);
        }
      }
    }

    const success = results.every(r => r.success);
    const result = createExecutionResult(requestId, results, startedAt);

    emitter.emit({
      type: success ? 'execution:completed' : 'execution:failed',
      requestId,
      timestamp: new Date(),
      data: { result },
    });

    return result;
  }

  private async executeTask(task: ExecutionTask, context: ExecutionContext, emitter: ExecutionEventEmitter): Promise<TaskResult> {
    emitter.emit({ type: 'task:started', requestId: context.requestId, timestamp: new Date(), data: { taskId: task.id } });

    const executor = this.executors.get(task.type);
    if (!executor) {
      return {
        taskId: task.id,
        success: false,
        durationMs: 0,
        output: null,
        warnings: [],
        errors: [`No executor found for task type: ${task.type}`],
      };
    }

    const maxRetries = this.config.maxRetries ?? 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await executor.execute(task, context);
        if (result.success || attempt === maxRetries) {
          return result;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries && this.config.retryDelayMs) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }

    return {
      taskId: task.id,
      success: false,
      durationMs: 0,
      output: null,
      warnings: [],
      errors: [lastError?.message ?? 'Unknown error'],
    };
  }

  private buildTasks(plan: ExecutionPlan, requestId: string): ExecutionTask[] {
    const tasks: ExecutionTask[] = [];
    let taskIndex = 0;

    for (const skill of plan.skills) {
      tasks.push(createExecutionTask(`task-${requestId}-${taskIndex++}`, 'skill', skill.id, plan.intent));
    }

    for (const workflow of plan.workflows) {
      tasks.push(createExecutionTask(`task-${requestId}-${taskIndex++}`, 'workflow', workflow.id, plan.intent));
    }

    for (const reviewer of plan.reviewers) {
      tasks.push(createExecutionTask(`task-${requestId}-${taskIndex++}`, 'reviewer', reviewer.id, plan.intent));
    }

    return tasks;
  }
}