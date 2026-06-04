# Runtime Orchestrator v5 — Foundation Design

> **Status:** Approved (8.8/10 architect review)
> **Scope:** Sub-Spec 1 of 3 (Foundation → Runtime+Parallel → Learning+Intelligence)
> **Boundary:** Discovery + Classification + Planning + Resolution only. No execution.

## Goal

Establish the runtime v5 foundation for Astro Engineering OS: a markdown-driven, intent-based orchestration layer that classifies user input, resolves capabilities (skills, agents, workflows, reviewers) from routing rules, and returns a typed execution plan. Discovery and planning without execution. Execution lands in Sub-Spec 2.

## Architecture

**Markdown is the source of truth. TypeScript is a thin runtime engine.**

```
catalog/*.md          → human-edited capability definitions (skills, agents, workflows, reviewers)
routing/intents.md    → intent → capability mappings (single source of truth for routing)
governance/README.md  → reserved namespace; no engine in Sub-Spec 1
src/**/*.ts           → loaders, readonly registries, classifier, factory
```

**Three-layer concern separation:**

| Layer | Concept | Source | Runtime |
|-------|---------|--------|---------|
| Capability | What exists | `catalog/*.md` | `src/registry/*.registry.ts` |
| Routing | What to use | `routing/intents.md` | `src/routing/intents.ts` |
| Governance | What's allowed | `governance/README.md` (Sub-Spec 1) → `policies.md` (Sub-Spec 2) | (Sub-Spec 2) |

**Evolutionary architecture:** the governance namespace, layer purpose, and roadmap are documented in Sub-Spec 1 even though the policy engine itself is deferred. This gives OSS contributors a stable target without forcing implementation before the runtime can express the concept.

**Public API shape (hybrid class + DI + factory):**

```ts
// Internal: class with constructor DI for testability + plugin support
class OrchestratorV5 {
  constructor(deps: { skills; agents; workflows; reviewers; intents; classifier; })
  classify(input: string): Classification
  plan(request: PlanningRequest): ExecutionPlan
  readonly skills: SkillsRegistry
  readonly agents: AgentsRegistry
  readonly workflows: WorkflowsRegistry
  readonly reviewers: ReviewersRegistry
}

// External: factory hides loader details
async function createOrchestratorV5(opts?: { basePath?: string }): Promise<OrchestratorV5>
```

**Constraints:**
- No global singletons
- Registries are read-only after init (no `register()` methods)
- TS files MUST NOT hardcode capability content — every entity comes from a markdown file
- Routing metadata (intent → skills, etc.) lives ONLY in `routing/intents.md` — never duplicated into capability files

## File inventory (14 files)

### Catalog (source of truth) — 4 files
- `orchestrator/catalog/skills.md` — `## skill: <id>` blocks with required `version` + `status` headers and `- key: value` bullets
- `orchestrator/catalog/agents.md` — `## agent: <id>` blocks (same shape)
- `orchestrator/catalog/workflows.md` — `## workflow: <id>` blocks (same shape)
- `orchestrator/catalog/reviewers.md` — `## reviewer: <id>` blocks (same shape)

**Entity block format (uniform across all 4 catalogs):**
```md
## skill: astro-blog

version: 1.0.0
status: active

purpose: ...
tags: content, seo
```

`version` is a semver string (parsed but not strictly validated in Sub-Spec 1; defaults to `0.0.0` if missing). `status` is one of `active | deprecated | experimental | legacy` (defaults to `active` if missing). Both fields are required for forward-compat: v1/v2 workflows, deprecated skills, experimental agents all become first-class rather than retrofit.

### Routing (source of truth) — 1 file
- `orchestrator/routing/intents.md` — `## intent: <id>` blocks referencing capability IDs

### Governance (real documentation) — 1 file
- `orchestrator/governance/README.md` — documents:
  - Governance layer purpose and scope
  - Future policy engine concept
  - Policy evaluation lifecycle (declarative → evaluated → enforced)
  - Policy ownership (who can author, who can approve)
  - Roadmap per sub-spec (Sub-Spec 1: namespace + docs; Sub-Spec 2: registry + evaluation; Sub-Spec 3: enforcement hooks)
  - Rationale: "namespace exists, architecture exists, implementation deferred" — evolutionary architecture

### Source: shared loader — 1 file
- `orchestrator/src/registry/markdown-loader.ts` — generic `parseEntities<T>(md, entityType)` parser

### Source: capability registries — 4 files
- `orchestrator/src/registry/skills.registry.ts`
- `orchestrator/src/registry/agents.registry.ts`
- `orchestrator/src/registry/workflows.registry.ts`
- `orchestrator/src/registry/reviewers.registry.ts`

### Source: routing loader — 1 file
- `orchestrator/src/routing/intents.ts` — `IntentsRegistry` with `resolve(intent)` and `list()`

### Source: classifier — 1 file
- `orchestrator/src/runtime/intent-classifier.ts` — keyword + rule based, returns `Classification { intent, confidence, signals }`

### Source: main entry — 1 file
- `orchestrator/src/orchestrator-v5.ts` — `class OrchestratorV5` + `createOrchestratorV5` factory

### Tests — separate
- `orchestrator/tests/v5/markdown-loader.test.ts`
- `orchestrator/tests/v5/skills.registry.test.ts`
- `orchestrator/tests/v5/agents.registry.test.ts`
- `orchestrator/tests/v5/workflows.registry.test.ts`
- `orchestrator/tests/v5/reviewers.registry.test.ts`
- `orchestrator/tests/v5/intents.test.ts`
- `orchestrator/tests/v5/intent-classifier.test.ts`
- `orchestrator/tests/v5/orchestrator-v5.test.ts`
- `orchestrator/fixtures/v5/catalog/{valid,invalid}/...`
- `orchestrator/fixtures/v5/routing/{valid,invalid}/...`

## Component contracts

### `markdown-loader.ts`

```ts
export interface EntityBuilder<T> {
  (id: string, fields: ReadonlyMap<string, string>): T;
}

export function parseEntities<T>(
  md: string,
  entityType: string,                    // "skill" | "agent" | "workflow" | "reviewer" | "intent"
  build: EntityBuilder<T>,
  options?: { requiredFields?: readonly string[] },
): Record<string, T>;

export class MarkdownParseError extends Error {
  constructor(public readonly line: number, public readonly entityType: string, message: string)
}
```

- Splits on `/^## ${entityType}:\s+(.+)$/m`
- Each section parses `- key: value` bullets into a `Map<string, string>`
- `build(id, fields)` constructs the typed entity
- Duplicate IDs → throws `MarkdownParseError`
- Missing required fields → throws `MarkdownParseError`

### Capability registries

```ts
export type EntityStatus = 'active' | 'deprecated' | 'experimental' | 'legacy';

export interface Skill {
  readonly id: string;
  readonly version: string;                 // semver, defaults to '0.0.0' if missing in markdown
  readonly status: EntityStatus;            // defaults to 'active' if missing
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];         // parsed from `- tags: foo, bar`
  readonly config?: Readonly<Record<string, string>>;
}

export interface SkillsRegistry {
  list(): ReadonlyMap<string, Skill>;
  get(id: string): Skill | undefined;
  byTag(tag: string): readonly Skill[];
}

export async function loadSkillsRegistry(opts?: { path?: string }): Promise<SkillsRegistry>
```

Each of `agents`, `workflows`, `reviewers` mirrors this shape with its own entity type. `Agent` adds `capabilities: string[]`; `Workflow` adds `steps: string[]`; `Reviewer` adds `focus: string[]`. All four carry `version` and `status` for forward-compat with v1/v2 workflows, deprecation, and experimental state.

### Intents registry

```ts
export type Intent =
  | 'blog' | 'docs' | 'saas' | 'ecommerce'
  | 'architecture' | 'refactor' | 'migration' | 'unknown';

export interface IntentMapping {
  readonly intent: Intent;
  readonly skills: readonly string[];        // skill IDs from catalog/skills.md
  readonly agents: readonly string[];        // agent IDs from catalog/agents.md
  readonly workflows: readonly string[];     // workflow IDs from catalog/workflows.md
  readonly reviewers: readonly string[];     // reviewer IDs from catalog/reviewers.md
}

export interface IntentsRegistry {
  resolve(intent: Intent): IntentMapping | undefined;
  list(): readonly Intent[];
}

export async function loadIntentsRegistry(opts?: { path?: string }): Promise<IntentsRegistry>
```

`intents.md` format:
```markdown
## intent: blog
- skills: astro-core, blog
- agents: implementer, documentation
- workflows: feature-development
- reviewers: style-reviewer
```

### Intent classifier

```ts
export interface Classification {
  readonly intent: Intent;
  readonly confidence: number;              // 0..1
  readonly signals: readonly string[];      // matched keywords for debuggability
}

export interface IntentClassifier {
  classify(input: string): Classification;
}

export function createIntentClassifier(
  rules: ReadonlyMap<Intent, readonly string[]>,   // intent → keywords
): IntentClassifier
```

Default keyword rules (overrideable by user):
- `blog`: "blog", "post", "article", "content"
- `docs`: "doc", "documentation", "readme", "guide"
- `saas`: "saas", "subscription", "billing", "tenant"
- `ecommerce`: "shop", "cart", "product", "checkout"
- `architecture`: "architect", "design", "adr", "rfc"
- `refactor`: "refactor", "cleanup", "restructure", "rename"
- `migration`: "migrate", "upgrade", "port", "convert"
- else → `unknown` with confidence 0

### Orchestrator v5

```ts
export interface PlanningRequest {
  readonly input: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ExecutionPlan {
  readonly intent: Intent;
  readonly skills: readonly Skill[];
  readonly agents: readonly Agent[];
  readonly workflows: readonly Workflow[];
  readonly reviewers: readonly Reviewer[];
  readonly confidence: number;
  readonly metadata: {
    readonly generatedAt: string;          // ISO timestamp
    readonly source: 'classifier';
  };
  readonly trace: {
    readonly classificationSignals: readonly string[];   // matched keywords from classifier
    readonly resolvedIntent: string;                      // echoes plan.intent for downstream consumers
  };
}

export class OrchestratorV5 {
  constructor(deps: OrchestratorV5Deps)
  classify(input: string): Classification
  plan(request: PlanningRequest): ExecutionPlan
  readonly skills: SkillsRegistry
  readonly agents: AgentsRegistry
  readonly workflows: WorkflowsRegistry
  readonly reviewers: ReviewersRegistry
}

export interface OrchestratorV5Deps {
  readonly skills: SkillsRegistry;
  readonly agents: AgentsRegistry;
  readonly workflows: WorkflowsRegistry;
  readonly reviewers: ReviewersRegistry;
  readonly intents: IntentsRegistry;
  readonly classifier: IntentClassifier;
}

export async function createOrchestratorV5(
  opts?: { basePath?: string; classifierRules?: ReadonlyMap<Intent, readonly string[]> }
): Promise<OrchestratorV5>
```

**`createOrchestratorV5` factory semantics:**
1. Resolve catalog paths from `basePath` (default: `orchestrator/`)
2. Load all four capability registries (skills, agents, workflows, reviewers) in parallel
3. Load `intents` registry
4. **Cross-reference validation:** for every `IntentMapping`, verify each referenced ID exists in its corresponding capability registry. On any missing reference, throw `RegistryValidationError` listing every missing reference. Fail fast.
5. Build the `IntentClassifier` from default or user-supplied keyword rules
6. Return a wired `OrchestratorV5` instance

**`plan()` semantics:**
1. Call `classifier.classify(input)` → `Classification`
2. Call `intents.resolve(classification.intent)` → `IntentMapping` or undefined
3. If undefined (e.g., `unknown` intent), throw `UnknownIntentError`
4. Resolve each ID against the corresponding capability registry; throw `UnresolvedCapabilityError` for any missing ID
5. Return `ExecutionPlan` with resolved entities, confidence, and trace

**`trace` rationale:** `classificationSignals` + `resolvedIntent` are the audit trail that bridges to Sub-Spec 2 (parallel execution) and Sub-Spec 3 (self-improving routing via execution history feedback). The trace is always populated; consumers can ignore it but cannot lose it.

## Data flow

```
input string
  → IntentClassifier.classify(input)
  → Classification { intent, confidence, signals }
  → IntentsRegistry.resolve(intent)
  → IntentMapping { skills, agents, workflows, reviewers }
  → for each ID, fetch from corresponding CapabilityRegistry
  → ExecutionPlan
```

The plan is a value object — no side effects, no execution. Sub-Spec 2's `runtime/agent-dispatcher.ts` and `parallel/parallel-engine.ts` will consume plans.

## Error handling

| Error class | Thrown by | Carries |
|-------------|-----------|---------|
| `MarkdownParseError` | `parseEntities` | `line`, `entityType`, `message` |
| `LoaderError` | registry loaders | wrapped `MarkdownParseError` + `path` |
| `RegistryValidationError` | `createOrchestratorV5` factory | `missing: { kind, id }[]` (every broken reference) |
| `UnknownIntentError` | `OrchestratorV5.plan` | `intent`, `knownIntents` |
| `UnresolvedCapabilityError` | `OrchestratorV5.plan` | `intent`, `missing: { kind, id }[]` |

All errors are exported from `src/orchestrator-v5.ts` and re-exported from a barrel. Duplicate IDs across all entity types (capability + intent) throw `MarkdownParseError` — no warnings. **Fail fast > silent ambiguity** (per architect review). `RegistryValidationError` is the only error thrown at factory startup; the rest are runtime errors thrown by `plan()`.

## Testing strategy

- **Per-loader unit test**: feed markdown strings, assert parsed entities
- **Per-registry test**: load fixture file, query `list()`/`get()`/`byTag()`
- **Classifier test**: input string → expected `Classification` with `signals`
- **`OrchestratorV5` integration test**: load fixture registries, call `classify()` and `plan()`, assert resolved plans
- **Fixture structure**:
  ```
  fixtures/v5/
  ├── catalog/
  │   ├── valid/{skills,agents,workflows,reviewers}.md
  │   └── invalid/{skills,agents,workflows,reviewers}.md   # duplicates, missing fields, malformed
  └── routing/
      ├── valid/intents.md
      └── invalid/intents.md
  ```
- **Coverage target**: 90%+ on TS source. Markdown is data, not tested directly.
- **No regression**: all 69 existing v4 tests must still pass. v4 runtime is untouched.

## Backward compatibility

- v4 runtime (`src/types,state,engine,queue,executor,history,index,cli,bin,mcp`) UNTOUCHED
- v5 files added alongside in `src/orchestrator-v5.ts` + `src/registry/*` + `src/routing/*` + `src/runtime/*`
- `package.json` exports both v4 (default entry) and v5 (subpath export `astro-orchestrator/v5`)
- README documents v5 as the canonical path; v4 stays for compat

## Out of scope (deferred to later sub-specs)

- **Sub-Spec 2** (runtime + parallel): `agent-dispatcher.ts`, `workflow-engine.ts`, `parallel-engine.ts`, `execution-pool.ts`, `conflict-resolver.ts`, `result-aggregator.ts`, `task-graph.ts`, `execution-state.ts`, `context-manager.ts`, **policy engine** (`governance/policies.md` + `src/governance/policies.ts` + evaluation lifecycle)
- **Sub-Spec 3** (learning + intelligence): `execution-tracker.ts`, `feedback-collector.ts`, `routing-optimizer.ts`, `pattern-detector.ts`, `decision-engine.ts`, `adaptive-router.ts`, `context-memory.ts`, plus all `*.registry.ts` performance variants. Sub-Spec 3 also consumes `ExecutionPlan.trace` to seed the feedback loop.
- **Migration audit, architecture validation, top-level README** — completed in a separate housekeeping pass after Sub-Spec 3

## Open decisions resolved by this spec

| Decision | Resolution |
|----------|------------|
| Where does routing metadata live? | `routing/intents.md` only |
| Should TS hardcode entities? | No — loaders parse markdown at startup |
| Public API: class or factory? | Both — class for DI, factory as default entry |
| `getRegistry(name)` service locator? | Dropped. Readonly properties on the class |
| Duplicate IDs across files? | Hard error (throw) for everything |
| Fixture layout? | `valid/` + `invalid/` subdirs |
| Classifier debuggability? | Return `signals: string[]` on `Classification`; full audit trail in `ExecutionPlan.trace` |
| Governance in Sub-Spec 1? | Namespace + real documentation README; engine deferred to Sub-Spec 2 |
| Entity version/status metadata? | Required on all four capability types. `version: semver` (default `0.0.0`), `status: active\|deprecated\|experimental\|legacy` (default `active`) |
| Cross-reference validation timing? | Factory startup. Every `IntentMapping` reference is resolved against the corresponding capability registry. Throw `RegistryValidationError` listing all missing references |
| Execution plan audit trail? | `ExecutionPlan.trace = { classificationSignals, resolvedIntent }` — bridges to Sub-Spec 2 execution + Sub-Spec 3 self-improving routing |

## Self-review

- **Placeholders**: none. All entity types, methods, error classes, and metadata fields are specified.
- **Internal consistency**: every type referenced in `OrchestratorV5` is defined. Every `load*` function returns its registry type. `plan()`'s contract matches `ExecutionPlan` shape including `trace`. `Skill`/`Agent`/`Workflow`/`Reviewer` all carry `version` and `status`. `RegistryValidationError` is in the error table and referenced in factory semantics. Governance README is described in the file inventory.
- **Scope**: foundation only — no execution, no policy engine, no learning. Within a single implementation plan.
- **Ambiguity**: `unknown` intent's behavior is explicit (throw `UnknownIntentError`). Missing capability ID is explicit (throw `UnresolvedCapabilityError`). Cross-reference validation is explicit (throw `RegistryValidationError` at factory startup, listing every missing reference). Entity version/status defaults are explicit (`0.0.0` / `active`).
