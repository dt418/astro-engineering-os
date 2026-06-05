# Sub-Spec 2.5: Parallel Task Execution

> **Status:** COMPLETE ✅
> **Predecessor:** Sub-Spec 2 (Sequential Execution — ✅ COMPLETE)
> **This spec:** Parallel task graph execution with dependency resolution

---

## Overview

Extend the execution engine from sequential-only to parallel task execution. Uses dependency graph to identify tasks that can run concurrently, with configurable worker pool size.

```
Input → Dependency Graph → Topological Sort → Parallel Execution → Results
                          ↓
                    Ready Tasks Queue
                          ↓
                    Worker Pool (N workers)
                          ↓
                    Task Complete → Check Dependents → Enqueue Ready
```

---

## Scope

### In Scope

- Dependency graph with task dependencies
- Topological sort with cycle detection
- Parallel execution with worker pool (configurable concurrency)
- Ready queue management
- Dependency tracking and completion signaling
- Configurable max workers (default: CPU cores)
- Update existing `ExecutionEngine` with parallel mode
- Full test coverage

### NOT In Scope

- Distributed execution (multi-machine)
- Priority queue scheduling
- Load balancing
- Task preemption
- Retry policies (handled in Sub-Spec 2)

---

## Architecture

### Dependency Graph

```ts
interface TaskNode {
  readonly id: string;
  readonly type: TaskType;
  readonly target: string;
  readonly dependencies: readonly string[];  // task IDs
}

interface DependencyGraph {
  readonly nodes: readonly TaskNode[];
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
}

function buildGraph(tasks: ExecutionTask[]): DependencyGraph;
function topologicalSort(graph: DependencyGraph): string[][];  // levels
function detectCycles(graph: DependencyGraph): string[] | null;  // cycle node IDs
```

### Worker Pool

```ts
interface WorkerPoolConfig {
  readonly maxWorkers: number;  // default: os.cpus().length
}

class WorkerPool<Task, Result> {
  constructor(config: WorkerPoolConfig);
  async run(tasks: Task[], handler: (task: Task) => Promise<Result>): Promise<Result[]>;
  shutdown(): Promise<void>;
}
```

### Parallel Execution Engine

```ts
interface ParallelExecutionConfig extends ExecutionEngineConfig {
  readonly maxConcurrency?: number;  // default: 4
  readonly mode: 'parallel';
}

class ExecutionEngine {
  // Existing sequential mode
  async execute(plan: ExecutionPlan, requestId: string): Promise<ExecutionResult>;
  
  // NEW: Parallel mode
  async executeParallel(plan: ExecutionPlan, requestId: string, config?: ParallelExecutionConfig): Promise<ExecutionResult>;
}
```

### Ready Queue

```ts
class ReadyQueue {
  enqueue(taskId: string): void;
  dequeue(): string | null;
  size(): number;
  isEmpty(): boolean;
}
```

---

## Execution Flow

1. Build `DependencyGraph` from `ExecutionPlan` tasks
2. Detect cycles — throw `CycleDetectedError` if found
3. Topological sort → returns levels (tasks in same level are parallel-ready)
4. Initialize `WorkerPool` with `maxConcurrency`
5. Enqueue all level-0 tasks (no dependencies)
6. While queue not empty:
   - Dequeue up to `maxConcurrency` tasks
   - Execute in parallel (worker pool)
   - On completion: check dependent tasks, enqueue if all deps satisfied
7. Aggregate all results and return `ExecutionResult`

---

## File Changes

### Modify

```
orchestrator/src/runtime/
├── execution-engine.ts     ADD: parallel mode, buildGraph, topologicalSort, cycle detection
├── execution-task.ts      ADD: dependencies field usage

orchestrator/src/orchestrator-v5.ts   ADD: executeParallel() method
```

### New

```
orchestrator/src/runtime/
├── dependency-graph.ts    NEW: buildGraph, topologicalSort, cycle detection
├── ready-queue.ts         NEW: ReadyQueue implementation
├── worker-pool.ts        NEW: WorkerPool generic class

orchestrator/tests/runtime/
├── parallel-execution.test.ts   NEW: parallel execution tests
├── dependency-graph.test.ts    NEW: graph algorithm tests
```

---

## Key Algorithms

### Cycle Detection (Kahn's algorithm variant)

```ts
function detectCycles(nodes: TaskNode[]): string[] | null {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
      adjacency.get(node.id)?.push(dep);
    }
  }
  
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }
  
  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    processed++;
    for (const neighbor of adjacency.get(id) ?? []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }
  
  return processed === nodes.length ? null : nodes.filter(n => !inDegree.has(n.id)).map(n => n.id);
}
```

### Topological Sort (Level-based)

```ts
function topologicalSort(nodes: TaskNode[]): string[][] {
  const levels: string[][] = [];
  const completed = new Set<string>();
  
  while (completed.size < nodes.length) {
    const level: string[] = [];
    
    for (const node of nodes) {
      if (completed.has(node.id)) continue;
      if (node.dependencies.every(dep => completed.has(dep))) {
        level.push(node.id);
      }
    }
    
    if (level.length === 0 && completed.size < nodes.length) {
      throw new CycleDetectedError([...nodes].find(n => !completed.has(n.id))!);
    }
    
    levels.push(level);
    level.forEach(id => completed.add(id));
  }
  
  return levels;
}
```

---

## Tests

| Scenario | Description |
|----------|-------------|
| Simple parallel | 3 tasks, no dependencies → all run together |
| Sequential dependency | A→B→C → execute in order |
| Diamond dependency | A→B, A→C, B→D, C→D → B and C run after A, D after both |
| Cycle detection | A→B→C→A → throws CycleDetectedError |
| Empty plan | No tasks → empty result |
| Partial failure | One task fails → others continue, aggregate shows failures |

---

## Acceptance Criteria

- [ ] `buildGraph()` creates adjacency list from task dependencies
- [ ] `detectCycles()` returns cycle nodes or null
- [ ] `topologicalSort()` returns level-based ordering
- [ ] `WorkerPool` executes N tasks concurrently
- [ ] `executeParallel()` uses all 3 components
- [ ] Cycle detection throws `CycleDetectedError`
- [ ] Tasks without dependencies run immediately
- [ ] Dependent tasks wait for all dependencies
- [ ] Results aggregated correctly (all tasks, not just first batch)
- [ ] 90%+ test coverage on new code
- [ ] All 152 existing tests pass

---

## Commit Sequence

1. **feat(runtime): add dependency-graph utilities** — buildGraph, topologicalSort, cycle detection
2. **feat(runtime): add ReadyQueue implementation**
3. **feat(runtime): add WorkerPool generic class**
4. **feat(execution): add parallel mode to ExecutionEngine**
5. **test(runtime): add parallel execution tests**
6. **docs: update orchestrator-v5.md with parallel mode**

---

## Extension Points

- Priority scheduling (weighted topological sort)
- Load-based auto-scaling (dynamic worker count)
- Task timeouts (per-worker timeout tracking)
- Distributed execution (worker pool across machines)