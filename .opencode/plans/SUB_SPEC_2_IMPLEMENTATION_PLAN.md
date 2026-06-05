# Sub-Spec 2 Implementation Plan: Runtime Execution Engine

> **Status:** COMPLETE ✅
> **Predecessor:** Sub-Spec 1 (Foundation — ✅ COMPLETE)
> **This spec:** Runtime + Sequential Execution only. No parallel, no learning.

## Overview

Transform Orchestrator V5 from a **Planning System** into a **Planning + Execution Runtime**.

```
Input → Intent Classification → Planning → Execution → Result
```

Sub-Spec 2 adds an `execute()` method to `OrchestratorV5` and implements the execution pipeline that consumes `ExecutionPlan` output from Sub-Spec 1.

---

## Scope

### In Scope

- Execution runtime contracts (`execution-context.ts`, `execution-task.ts`, `execution-result.ts`)
- State machine with explicit transitions (`execution-state-machine.ts`)
- Typed event system (`execution-events.ts`, `ExecutionEventEmitter`)
- Error model (`execution-errors.ts`)
- Executor abstraction layer (`executors/skill-executor.ts`, `workflow-executor.ts`, `reviewer-executor.ts`)
- Execution engine (`execution-engine.ts`)
- OrchestratorV5.execute() integration
- Full test coverage (90%+)
- Documentation (`docs/runtime-execution.md`)

### NOT In Scope

- Parallel execution
- Multi-agent execution
- Learning engine
- Adaptive routing
- Self-improving orchestration
- Policy engine
- V4 runtime modifications

---

## Dependencies

**Prerequisite:** Sub-Spec 1 must be complete before Sub-Spec 2 implementation begins.

Sub-Spec 2 depends on:
- `OrchestratorV5.classify(input)` — intent classification
- `OrchestratorV5.plan(request)` — execution plan generation
- `ExecutionPlan` interface — the plan shape
- `Skill`, `Agent`, `Workflow`, `Reviewer` entities — resolved capabilities
- `IntentsRegistry`, `SkillsRegistry`, etc. — capability registries

**If Sub-Spec 1 is not yet implemented**, Sub-Spec 2 must include stub implementations of the prerequisite interfaces or the build will fail. Recommend building Sub-Spec 1 first.

---

## Architecture

### Execution Lifecycle

```
Input
  ↓
OrchestratorV5.classify(input)     ← Sub-Spec 1
  ↓
OrchestratorV5.plan({ input })     ← Sub-Spec 1
  ↓
ExecutionPlan                      ← Sub-Spec 1 output
  ↓
ExecutionEngine.execute(plan)      ← NEW in Sub-Spec 2
  ↓
ExecutionContext (created per run)
  ↓
ExecutionTask[] (built from plan)
  ↓
Sequential task execution
  ↓
ExecutionResult (aggregated)
```

### File Inventory

```
orchestrator/src/runtime/
├── execution-context.ts     NEW
├── execution-task.ts        NEW
├── execution-result.ts      NEW
├── execution-state-machine.ts  NEW
├── execution-events.ts      NEW
├── execution-errors.ts      NEW
├── execution-engine.ts      NEW

orchestrator/src/executors/
├── skill-executor.ts        NEW
├── workflow-executor.ts     NEW
├── reviewer-executor.ts     NEW

orchestrator/src/orchestrator-v5.ts   MODIFY (add execute())

orchestrator/tests/runtime/
├── execution-engine.test.ts
├── execution-state-machine.test.ts
├── execution-events.test.ts
├── executors.test.ts
├── orchestrator-v5-execute.test.ts
├── integration.test.ts

orchestrator/fixtures/runtime/
├── valid/
│   ├── plan-single-skill.yaml
│   ├── plan-multi-capability.yaml
│   └── plan-empty.yaml
├── invalid/
│   ├── plan-missing-skill.yaml
│   └── plan-missing-agent.yaml

orchestrator/docs/runtime-execution.md   NEW

Total: 8 source files, 6 test files, 4 fixtures, 1 doc
```

---

## Contracts

### execution-context.ts

```ts
export interface ExecutionContext {
  readonly requestId: string;
  readonly intent: Intent;
  readonly plan: ExecutionPlan;
  readonly startedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export function createExecutionContext(
  requestId: string,
  intent: Intent,
  plan: ExecutionPlan,
  metadata?: Readonly<Record<string, unknown>>,
): ExecutionContext
```

### execution-task.ts

```ts
export type TaskType = 'skill' | 'workflow' | 'reviewer';

export interface ExecutionTask {
  readonly id: string;
  readonly type: TaskType;
  readonly target: string;              // capability ID
  readonly intent: Intent;
  readonly priority: number;
  readonly dependencies: readonly string[];  // task IDs that must complete first
}
```

### execution-result.ts

```ts
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
```

### execution-state-machine.ts

```ts
export type ExecutionState =
  | 'planned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface StateTransition {
  readonly from: ExecutionState;
  readonly to: ExecutionState;
  readonly allowed: boolean;
}

export class ExecutionStateMachine {
  constructor(initialState?: ExecutionState)
  readonly state: ExecutionState;
  transition(next: ExecutionState): boolean;   // true = success, false = invalid
  canTransition(next: ExecutionState): boolean;
  reset(): void;
}

export const VALID_TRANSITIONS: ReadonlyMap<ExecutionState, readonly ExecutionState[]>;
```

### execution-events.ts

```ts
export type ExecutionEventType =
  | 'execution:started'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled';

export interface ExecutionEvent {
  readonly type: ExecutionEventType;
  readonly requestId: string;
  readonly timestamp: Date;
  readonly data: Record<string, unknown>;
}

export type EventListener = (event: ExecutionEvent) => void;

export class ExecutionEventEmitter {
  on(event: ExecutionEventType, listener: EventListener): () => void;
  off(event: ExecutionEventType, listener: EventListener): void;
  emit(event: ExecutionEvent): void;
  removeAllListeners(): void;
}
```

### execution-errors.ts

```ts
export class ExecutionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly metadata?: Readonly<Record<string, unknown>>,
  );
}

export class TaskExecutionError extends ExecutionError {
  constructor(
    public readonly taskId: string,
    public readonly taskType: TaskType,
    message: string,
    metadata?: Readonly<Record<string, unknown>>,
  );
}

export class SkillExecutionError extends TaskExecutionError {
  constructor(taskId: string, message: string, metadata?: Readonly<Record<string, unknown>>);
}

export class WorkflowExecutionError extends TaskExecutionError {
  constructor(taskId: string, message: string, metadata?: Readonly<Record<string, unknown>>);
}

export class ReviewExecutionError extends TaskExecutionError {
  constructor(taskId: string, message: string, metadata?: Readonly<Record<string, unknown>>);
}

export class StateTransitionError extends ExecutionError {
  constructor(
    public readonly fromState: ExecutionState,
    public readonly toState: ExecutionState,
    message: string,
  );
}
```

---

## Executor Layer

### Base Interface

```ts
export interface Executor {
  readonly type: TaskType;
  execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult>;
}
```

### SkillExecutor

```ts
export class SkillExecutor implements Executor {
  readonly type: 'skill' = 'skill';
  constructor(private readonly registry: SkillsRegistry);
  execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult>;
}
```

### WorkflowExecutor

```ts
export class WorkflowExecutor implements Executor {
  readonly type: 'workflow' = 'workflow';
  constructor(private readonly registry: WorkflowsRegistry);
  execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult>;
}
```

### ReviewerExecutor

```ts
export class ReviewerExecutor implements Executor {
  readonly type: 'reviewer' = 'reviewer';
  constructor(private readonly registry: ReviewersRegistry);
  execute(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult>;
}
```

### Execution Engine

```ts
export interface ExecutionEngineConfig {
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly timeoutMs?: number;
}

export class ExecutionEngine {
  constructor(
    private readonly executors: ReadonlyMap<TaskType, Executor>,
    private readonly config?: ExecutionEngineConfig,
  );
  async execute(plan: ExecutionPlan, requestId: string): Promise<ExecutionResult>;
  private executeTask(task: ExecutionTask, context: ExecutionContext): Promise<TaskResult>;
  private aggregateResults(results: TaskResult[]): ExecutionResult;
}
```

**Sequential execution only.** No parallel task scheduling. Tasks execute in dependency order within the plan.

---

## OrchestratorV5 Integration

```ts
// Add to OrchestratorV5 class
export interface ExecutionRequest {
  readonly input: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ExecutionResponse {
  readonly requestId: string;
  readonly classification: Classification;
  readonly plan: ExecutionPlan;
  readonly result: ExecutionResult;
}

// New methods
execute(request: ExecutionRequest): ExecutionResponse;
executeAsync(request: ExecutionRequest): Promise<ExecutionResponse>;
```

---

## Testing Strategy

### Unit Tests

| File | Coverage Target | Scenarios |
|------|----------------|------------|
| `execution-state-machine.test.ts` | 95%+ | valid transitions, invalid transitions, reset |
| `execution-events.test.ts` | 95%+ | emit, subscribe, unsubscribe, removeAllListeners |
| `execution-engine.test.ts` | 90%+ | sequential execution, task failure, retry logic |
| `executors.test.ts` | 90%+ | skill execution, workflow execution, reviewer execution |

### Integration Tests

| File | Coverage Target | Scenarios |
|------|----------------|------------|
| `orchestrator-v5-execute.test.ts` | 90%+ | full pipeline, classification, planning, execution |
| `integration.test.ts` | 90%+ | end-to-end with fixtures |

### Fixture Structure

```
fixtures/runtime/
├── valid/
│   ├── plan-single-skill.yaml    → plan with 1 skill, 0 dependencies
│   ├── plan-multi-capability.yaml → plan with skill + workflow + reviewer
│   └── plan-empty.yaml           → plan with no capabilities (edge case)
└── invalid/
    ├── plan-missing-skill.yaml    → references non-existent skill
    └── plan-missing-agent.yaml    → references non-existent agent
```

---

## Validation Checklist

Before claiming completion:

- [ ] `execute()` method exists on `OrchestratorV5`
- [ ] `ExecutionEngine` receives `ExecutionPlan`, emits events, returns `ExecutionResult`
- [ ] State machine rejects invalid transitions (e.g., `cancelled` → `running`)
- [ ] Event emitter fires events in correct order: `execution:started` before any task events
- [ ] Task failures don't stop subsequent tasks (sequential, continue on error)
- [ ] Result aggregation includes all task results, not just successful ones
- [ ] Error types contain `code`, `message`, `metadata`
- [ ] No parallel execution introduced
- [ ] V4 compatibility preserved (no breaking changes to existing runtime)
- [ ] 90%+ test coverage on runtime source files
- [ ] All 69 existing v4 tests still pass
- [ ] Documentation covers architecture, lifecycle, extension points

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sub-Spec 1 not built yet | HIGH | Build Sub-Spec 1 first; include stubs if needed |
| Circular dependency on registries | MEDIUM | Executors only READ registries, never write |
| Event emitter memory leaks | MEDIUM | Return unsubscribe function from `on()`; enforce cleanup |
| State machine race conditions | LOW | Sequential execution only; single thread per context |
| Test coverage gaps | MEDIUM | Use coverage tools; enforce 90% threshold in CI |

---

## Commit Sequence

1. **feat(v5): introduce execution runtime contracts** — context, task, result types
2. **feat(v5): implement execution state machine** — transitions, guards, validation
3. **feat(v5): add execution event system** — typed events, emitter, listeners
4. **feat(v5): implement execution engine** — sequential task execution, result aggregation
5. **feat(v5): add executor abstraction layer** — skill, workflow, reviewer executors
6. **test(v5): add runtime execution coverage** — state machine, events, engine, executors
7. **docs(v5): document execution runtime** — architecture, lifecycle, extension points

---

## Acceptance Criteria

- [ ] `ExecutionContext`, `ExecutionTask`, `ExecutionResult` contracts in place
- [ ] `ExecutionStateMachine` with valid/invalid transition detection
- [ ] `ExecutionEventEmitter` with typed events and unsubscribe
- [ ] `ExecutionError` hierarchy with code + metadata
- [ ] `SkillExecutor`, `WorkflowExecutor`, `ReviewerExecutor` implementations
- [ ] `ExecutionEngine.execute(plan)` returns `ExecutionResult`
- [ ] `OrchestratorV5.execute(request)` → `ExecutionResponse`
- [ ] Sequential execution (no parallel)
- [ ] Task failures don't halt subsequent tasks
- [ ] 90%+ test coverage on runtime source
- [ ] All 69 v4 tests pass
- [ ] `docs/runtime-execution.md` created with architecture docs
- [ ] V4 runtime unmodified

---

## Extension Points

Future sub-specs can extend:

1. **Parallel execution** — add `ParallelExecutionEngine` that uses `dependencies` field
2. **Retry policies** — configure per-task-type retry strategies
3. **Timeout management** — per-task and global execution timeouts
4. **Result caching** — cache task results based on `target` + `context` hash
5. **Cancellation** — support `cancelled` state with graceful task cleanup

Sub-Spec 2 provides the foundation without locking in future extension paths.