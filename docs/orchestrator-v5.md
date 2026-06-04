# Runtime Orchestrator v5

> Discovery, classification, planning, and resolution of capabilities from markdown catalogs. Foundation layer + Execution Runtime.

## What is it?

The orchestrator v5 is a TypeScript runtime that turns natural-language task descriptions into fully-resolved `ExecutionPlan` objects, then executes them through a sequential execution engine.

It loads capability definitions (skills, agents, workflows, reviewers) and intent-to-capability mappings from human-readable Markdown, then exposes a factory that:

1. Validates every cross-reference (e.g. an intent that names a non-existent skill fails fast).
2. Classifies the input string into one of 8 intents (blog, docs, saas, ecommerce, architecture, refactor, migration, unknown).
3. Resolves the matched intent into a plan: the full set of skills, agents, workflows, and reviewers the work would need.
4. Executes the plan and returns aggregated `ExecutionResult`.

The v4 runtime (`orchestrator/src/index.ts`) is unchanged. v5 is an additive subpath export (`astro-orchestrator/v5`) — import it explicitly.

## Quick start

### Planning only

```ts
import { createOrchestratorV5 } from 'astro-orchestrator/v5';

const orch = await createOrchestratorV5({ basePath: './orchestrator' });
const plan = orch.plan({ input: 'Create an Astro blog with RSS feed' });

console.log(plan.intent);          // 'blog'
console.log(plan.skills);           // [astro-blog, astro-core]
console.log(plan.agents);           // [implementer, documentation]
console.log(plan.workflows);        // [feature-development']
console.log(plan.reviewers);        // [blog-reviewer]
console.log(plan.trace);            // { classificationSignals: [...], resolvedIntent: 'blog' }
```

### Planning + Execution

```ts
import { createOrchestratorV5 } from 'astro-orchestrator/v5';

const orch = await createOrchestratorV5({ basePath: './orchestrator' });
const response = await orch.executeAsync({ input: 'Create an Astro blog with RSS feed' });

console.log(response.requestId);     // UUID
console.log(response.classification); // { intent, confidence, signals }
console.log(response.plan);          // ExecutionPlan
console.log(response.result);        // ExecutionResult
```

## Architecture

```
orchestrator/
├── catalog/              # Markdown source of truth for capabilities
│   ├── skills.md
│   ├── agents.md
│   ├── workflows.md
│   └── reviewers.md
├── routing/              # Markdown source of truth for intent mappings
│   └── intents.md
├── governance/           # Policy layer
│   └── README.md
├── src/
│   ├── registry/         # TS loaders + readonly query APIs
│   ├── routing/         # Intent loader + resolver
│   ├── runtime/         # Execution runtime (NEW in Sub-Spec 2)
│   │   ├── execution-context.ts
│   │   ├── execution-task.ts
│   │   ├── execution-result.ts
│   │   ├── execution-state-machine.ts
│   │   ├── execution-events.ts
│   │   ├── execution-errors.ts
│   │   └── execution-engine.ts
│   ├── executors/       # Executor implementations (NEW)
│   │   ├── skill-executor.ts
│   │   └── workflow-reviewer-executor.ts
│   └── orchestrator-v5.ts
```

**Execution Lifecycle:**

```
Input
  ↓
OrchestratorV5.classify(input)     ← Intent classification
  ↓
OrchestratorV5.plan({ input })     ← Plan generation
  ↓
ExecutionPlan                      ← Plan output
  ↓
ExecutionEngine.execute(plan)     ← NEW: Execution
  ↓
ExecutionContext (created per run)
  ↓
ExecutionTask[] (built from plan)
  ↓
Sequential task execution (skill → workflow → reviewer)
  ↓
ExecutionResult (aggregated)
```

**Three-layer concern separation:**
- **Capability layer** (`catalog/`) — what exists
- **Routing layer** (`routing/`) — what to use
- **Governance layer** (`governance/`) — what's allowed

Each layer is independent. A capability has no routing metadata. An intent has no policy metadata. This makes OSS contribution safe: a contributor adding a new skill cannot accidentally break the routing or governance layers.

## API

### `createOrchestratorV5(opts?)`

Loads all 4 capability registries, the routing registry, validates cross-references, and returns an `OrchestratorV5` instance. Throws `RegistryValidationError` if any cross-reference is broken.

### `OrchestratorV5.classify(input)`

Returns `{ intent, confidence, signals }` without resolving any plan. Useful for routing decisions that don't need a full plan.

### `OrchestratorV5.plan(request)`

Returns an `ExecutionPlan` with the fully-resolved skill, agent, workflow, and reviewer lists plus trace metadata. Throws `UnknownIntentError` for inputs the classifier can't match.

### `OrchestratorV5.execute(request)` / `executeAsync(request)`

Combines classify + plan + execute into a single call. Returns `ExecutionResponse` with `requestId`, `classification`, `plan`, and `result`.

```ts
interface ExecutionRequest {
  readonly input: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

interface ExecutionResponse {
  readonly requestId: string;
  readonly classification: Classification;
  readonly plan: ExecutionPlan;
  readonly result: ExecutionResult;
}
```

### Readonly registries

The orchestrator exposes `skills`, `agents`, `workflows`, `reviewers`, and `intents` as readonly query APIs. Call `.list()`, `.get(id)`, `.byTag(tag)`, or `.byStatus(status)`.

## Execution Engine

### State Machine

```
planned → running → completed
                 ↘ failed
         → cancelled
```

### Events

- `execution:started` / `execution:completed` / `execution:failed` / `execution:cancelled`
- `task:started` / `task:completed` / `task:failed` / `task:cancelled`

### Error Hierarchy

- `ExecutionError` — base with `code`, `message`, `metadata`
- `TaskExecutionError` — task-level with `taskId`, `taskType`
- `SkillExecutionError` / `WorkflowExecutionError` / `ReviewExecutionError`
- `StateTransitionError`

## Testing

```bash
cd orchestrator
pnpm test
```

Coverage: 90%+ on v5 source. The keystone integration test (`tests/v5/integration.test.ts`) drives the full path: load markdown → instantiate → classify → plan → execute.

## Status

| Layer | Status |
|-------|--------|
| Markdown loader | ✅ Shipped |
| Capability registries (skills, agents, workflows, reviewers) | ✅ Shipped |
| Routing registry | ✅ Shipped |
| Intent classifier | ✅ Shipped |
| Orchestrator foundation + cross-ref validation | ✅ Shipped |
| Integration test coverage | ✅ Shipped |
| Governance documentation | ✅ Shipped |
| Execution runtime (Sequential) | ✅ Sub-Spec 2 COMPLETE |
| Execution engine (parallel task graph) | ✅ Sub-Spec 2.5 COMPLETE |
| Learning + self-improving routing | ⏳ Sub-Spec 3 |
