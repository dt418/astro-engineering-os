# Architecture Guide

Astro Engineering OS is organized as a **three-layer operating system**. This document explains each layer, their responsibilities, and how they interact.

## Three-Layer Model

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 3 — Engineering Harness (reserved)                     │
│  Validators · Auditors · Policies · Automation · Quality Gates│
│  → Continuous enforcement, drift detection, automation      │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ consumes
┌──────────────────────────────────────────────────────────────┐
│ Layer 2 — Agent Orchestration (active)                       │
│  Orchestrator · 4 Agents · Skill routing · Workflow coord.   │
│  → AI-native execution: analyze, route, delegate, aggregate  │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ enforces
┌──────────────────────────────────────────────────────────────┐
│ Layer 1 — Engineering OS (foundation)                        │
│  Skills · Governance · Reviewers · Workflows · ADRs · Docs   │
│  → Normative knowledge, standards, and process definitions   │
└──────────────────────────────────────────────────────────────┘
```

## Layer 1 — Engineering OS

The foundational layer provides **what is correct** and **what is required**.

### Skills

Framework knowledge as composable, structured Markdown that AI agents can load and reference.

- **astro-core** — canonical Astro knowledge (rendering, content, data, performance, Cloudflare)
- **packs** — domain knowledge extending astro-core (blog, docs, saas, ecommerce)
- **specializations** — cross-cutting concerns (performance, security, SEO, cloudflare)

### Governance

Seven normative documents that define project structure, file organization, dependency policy, design system, feature boundaries, naming conventions, and architectural rules. Governance is **enforceable** — reviewers and (future) validators consume it directly.

### Reviewers

Six reviewer specs covering architecture, security, performance, accessibility, SEO, and code quality. Each uses 0–5 scoring across 4 categories. A score below 3 in any category is an automatic reject. Reviewers are designed to be **reusable by AI agents**.

### Workflows

Five process workflows — feature development, architecture review, migration, release, and refactoring. Each workflow defines phases with goals, inputs, activities, outputs, and quality gates.

### ADRs

Seven architecture decision records capturing rendering strategy, database choice, authentication, content, caching, deployment, and design system. Each ADR follows Context / Decision / Alternatives / Tradeoffs / Consequences / Future Considerations.

### GitHub Standards

Pull request template, three issue templates (bug, feature, refactor), and two CI workflows (ci, release). Defines the team's collaborative surface.

### Templates

ADR, RFC, spec, and refactor templates to ensure consistent authoring.

## Layer 2 — Agent Orchestration

The active layer provides **how work is performed** by AI agents.

### Orchestrator

`orchestrator/astro-orchestrator.md` is the central coordination layer. It:

- Analyzes incoming engineering requests
- Identifies project type and complexity
- Selects skill packs (core + domain + specialization)
- Routes to agents
- Coordinates multi-agent workflows
- Aggregates outputs

The orchestrator **MUST NEVER** implement, review, or generate architecture directly. Delegation is mandatory.

### Agents

Four specialized agents, each with a fixed structure (Purpose, Responsibilities, Inputs, Outputs, Workflow Participation, Decision Boundaries, Anti-Patterns):

| Agent | Scope |
|-------|-------|
| `architect` | Architecture, rendering strategy, folder structure, data strategy |
| `implementer` | Implementation, refactoring, code generation |
| `reviewer` | Architecture / performance / security review |
| `documentation` | README, ADRs, architecture documentation, migration guides |

Avoid creating excessive specialized agents. The initial system is intentionally small.

### Skill Routing

The orchestrator selects skill packs per request:

- **Core pack (always):** astro-core
- **Domain pack (per project type):** blog | docs | saas | ecommerce
- **Specialization packs (per requirement):** performance | security | SEO | cloudflare

### Workflow Coordination

Three execution modes:

- **Sequential** — Architect → Implementer → Reviewer → Documentation
- **Parallel** — independent tasks run concurrently
- **Coordinated** — multiple agents work on the same artifact
- **Escalation** — orchestrator surfaces items that exceed agent authority

## Layer 3 — Engineering Harness (Reserved)

> **Status:** Reserved architecture. Not implemented in v1.

The Harness is the **enforcement layer** that turns Layer 1 governance and Layer 2 agents into continuous, automated quality assurance. Each subsystem has a directory in the repository root with its own README explaining purpose, reserved responsibilities, and promotion criteria.

### Validators

`validators/` — automated policy and standard enforcement. Validators run on demand (pre-commit, CI) and report violations with location, severity, and recommended fix.

### Auditors

`auditors/` — continuous compliance and drift detection. Auditors run on a schedule and compare current state against historical baselines, producing trend reports.

### Policies

`policies/` — declarative rule specifications. Policies are the source of truth that validators and auditors consume. Versioned alongside governance.

### Automation

`automation/` — scaffolders, content generators, and transformers. Automation turns policies and ADRs into repeatable actions (scaffold a new feature, run a migration, generate release notes).

### Quality Gates

`quality-gates/` — merge-blocking enforcement points. Quality gates aggregate validator, auditor, and reviewer signals into a single pass/fail decision per change.

### Why Reserved

Building Harness infrastructure before Layer 1 and Layer 2 are stable produces lock-in, premature complexity, and brittle enforcement. Each subsystem is intentionally placed in a reserved directory with a clear promotion criterion. The criteria focus on stability of the layer above (Layer 1 governance, then Layer 2 agents) before activating the corresponding Harness subsystem.

## Design Principles

### 1. Feature-First Architecture

Organize code by feature, not by technical layer:

```
src/features/
├── auth/
│   ├── components/
│   ├── actions/
│   ├── lib/
│   └── types/
└── products/
    ├── components/
    ├── actions/
    └── lib/
```

### 2. Explicit Dependencies

All dependencies are declared and traceable:

- No circular dependencies
- Clear module boundaries
- Explicit imports
- No hidden coupling

### 3. Separation of Concerns

Each module has a single responsibility:

| Module | Responsibility |
|--------|----------------|
| `pages/` | Route handling |
| `components/` | UI rendering |
| `actions/` | Business logic |
| `lib/` | Utilities |
| `layouts/` | Page structure |

### 4. Delegation Over Execution

Agents and the orchestrator do only what their role authorizes. They escalate, route, or hand off — they do not overstep.

### 5. Reversibility

Architecture, governance, and workflow decisions are reversible until merged. Irreversible choices require an ADR and reviewer approval.

## Rendering Architecture

### Strategy Selection

| Content Type | Strategy | Rationale |
|--------------|----------|-----------|
| Blog posts | SSG | Maximum performance |
| Dashboards | SSR | User-specific content |
| Product pages | Hybrid | Static + dynamic sections |
| Shopping cart | Islands | Interactive but isolated |
| Live inventory | Server Islands | Real-time in static shell |

### Hydration Strategy

| Component | Directive | JavaScript |
|-----------|-----------|------------|
| Header | `client:load` | Immediate |
| Search | `client:visible` | On scroll |
| Analytics | `client:idle` | When idle |
| Newsletter | `client:media` | Conditional |
| Legacy widget | `client:only` | Client-only |

## Data Architecture

### Data Flow

```
Page → Loader → Data → Component
          ↓
      Action → Validation → Handler → Response
```

### State Management

| State Type | Storage | When to Use |
|-----------|---------|-------------|
| URL State | `Astro.url` | Shareable filters |
| Component State | `useState` | Local UI |
| Server State | Loaders | Data from server |
| Global State | Context | Cross-component |
| Persistent State | KV / D1 / R2 | Cross-request |

## Component Architecture

### Hierarchy

```
layouts/              # Page wrappers, meta
    ↓
feature-components/   # Feature-specific UI
    ↓
ui/                   # Reusable primitives
```

### Patterns

- **Compound components** — `<Card><Card.Header /><Card.Body /></Card>`
- **Controlled components** — props with explicit `value` + `onChange`
- **Polymorphic components** — `as` prop for type-flexible rendering

## Integration Patterns

### API Design

| Pattern | Use Case |
|---------|----------|
| REST | Standard CRUD |
| Actions | Form submission (progressive enhancement) |
| API Routes | Programmatic / external clients |

### External Services

```typescript
import { createApiClient } from '../lib/api';

export const api = createApiClient({
  baseUrl: import.meta.env.API_URL,
  headers: { Authorization: `Bearer ${token}` },
});
```

## Performance Architecture

### Bundle Strategy

1. Code splitting by route
2. Lazy loading for below-fold
3. Tree shaking for unused code
4. Preloading for critical paths

### Image Strategy

```astro
<Image
  src={image}
  width={800}
  height={600}
  format="webp"
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

## Security Architecture

### Auth Flow

```
Request → Middleware → Session Check → Route Handler
                      ↓
                Unauthorized → Redirect
```

### Data Protection

1. **Input Validation** — Zod schemas
2. **Output Encoding** — Template escaping
3. **SQL Injection** — Parameterized queries
4. **XSS** — Content sanitization

## Scalability

### File Limits

| Type | Maximum Lines |
|------|---------------|
| Components | 150 |
| Pages | 200 |
| Actions | 100 |
| Utilities | 80 |

### Component Limits

| Metric | Maximum |
|--------|---------|
| Props | 10 |
| Nesting | 5 levels |
| Variants | 8 |

## Extension Points

### Adding Skills

1. Create skill in `skills/`
2. Define patterns and anti-patterns
3. Add to repository manifest
4. Update orchestrator routing

### Adding Reviewers

1. Create reviewer in `reviewers/`
2. Define scoring criteria
3. Add to review workflow
4. Configure thresholds

### Adding Workflows

1. Create workflow in `workflows/`
2. Define phases and steps
3. Add to orchestrator
4. Configure integration

### Adding Agents

1. Create agent in `agents/` using the standard structure
2. Register in orchestrator routing rules
3. Define input/output schemas
4. Add to coordination patterns

### Adding Domain Packs

1. Create pack in `skills/astro-core/packs/`
2. Define domain-specific patterns
3. Register in skill pack registry
4. Update project type detection

### Activating Layer 3 Subsystems

Each Layer 3 directory's README defines promotion criteria. When met, move the subsystem from `reserved` to `active` and implement the planned components.
