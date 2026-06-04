# Runtime Orchestrator v5

> Discovery, classification, planning, and resolution of capabilities from markdown catalogs. Foundation layer — no execution engine in this release.

## What is it?

The orchestrator v5 is a TypeScript runtime that turns natural-language task descriptions into fully-resolved `ExecutionPlan` objects. It loads capability definitions (skills, agents, workflows, reviewers) and intent-to-capability mappings from human-readable Markdown, then exposes a factory that:

1. Validates every cross-reference (e.g. an intent that names a non-existent skill fails fast).
2. Classifies the input string into one of 8 intents (blog, docs, saas, ecommerce, architecture, refactor, migration, unknown).
3. Resolves the matched intent into a plan: the full set of skills, agents, workflows, and reviewers the work would need.

The v4 runtime (`orchestrator/src/index.ts`) is unchanged. v5 is an additive subpath export (`astro-orchestrator/v5`) — import it explicitly.

## Quick start

```ts
import { createOrchestratorV5 } from 'astro-orchestrator/v5';

const orch = await createOrchestratorV5({ basePath: './orchestrator' });
const plan = orch.plan({ input: 'Create an Astro blog with RSS feed' });

console.log(plan.intent);          // 'blog'
console.log(plan.skills);           // [astro-blog, astro-core]
console.log(plan.agents);           // [implementer, documentation]
console.log(plan.workflows);        // [feature-development]
console.log(plan.reviewers);        // [blog-reviewer]
console.log(plan.trace);            // { classificationSignals: [...], resolvedIntent: 'blog' }
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
├── governance/           # Policy layer (Sub-Spec 1 = README only)
│   └── README.md
└── src/
    ├── registry/         # TS loaders + readonly query APIs
    ├── routing/         # Intent loader + resolver
    ├── runtime/         # Intent classifier
    └── orchestrator-v5.ts  # Class + factory
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

### Readonly registries

The orchestrator exposes `skills`, `agents`, `workflows`, `reviewers`, and `intents` as readonly query APIs. Call `.list()`, `.get(id)`, `.byTag(tag)`, or `.byStatus(status)`.

## Testing

```bash
cd orchestrator
npm test -- tests/v5
```

Coverage: 90%+ on v5 source. The keystone integration test (`tests/v5/integration.test.ts`) drives the full path: load markdown → instantiate → classify → plan.

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
| Execution engine (parallel task graph) | ⏳ Sub-Spec 2 |
| Learning + self-improving routing | ⏳ Sub-Spec 3 |
