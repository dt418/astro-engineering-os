# Astro Orchestrator

> **Audience:** AI agents (primary) + Humans (orchestrator authors)

The Astro Orchestrator is the central coordination layer for AI agents working on Astro projects. It analyzes requests, routes to appropriate agents, and coordinates workflows without implementing features directly.

## Purpose

The orchestrator serves as the intelligent router that:
- Analyzes incoming engineering requests
- Identifies project type and context
- Selects appropriate skill packs and agents
- Coordinates multi-agent workflows
- Aggregates outputs into coherent results

## Core Principles

### Delegation Mandate

The orchestrator **must never**:
- Implement features directly
- Perform reviews directly
- Generate architecture directly
- Write code without agent delegation
- Approve PRs without reviewer input

The orchestrator's value lies in coordination, not execution.

### Request Analysis

Every request undergoes analysis across multiple dimensions:

1. **Project Type Detection**
   - Blog / Content site
   - Documentation site
   - SaaS application
   - E-commerce platform
   - Custom application

2. **Complexity Assessment**
   - Simple (single component/feature)
   - Moderate (multiple components, single domain)
   - Complex (cross-domain, architectural)
   - Enterprise (system-level, multi-team)

3. **Required Capabilities**
   - Frontend implementation
   - Backend/API integration
   - Database design
   - Authentication
   - Performance optimization
   - Accessibility compliance

4. **Workflow Determination**
   - Feature development
   - Architecture review
   - Migration
   - Refactoring
   - Release

## Request Processing Flow

```
Incoming Request
       │
       ▼
┌─────────────────┐
│  Parse & Classify │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Identify Type   │───► Blog / Docs / SaaS / Ecommerce / Custom
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Assess Complexity│───► Simple / Moderate / Complex / Enterprise
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select Skill Packs│───► Core + Domain-specific
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route to Agents │───► Architect → Implementer → Reviewer → Doc
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aggregate Output│───► Implementation + Reviews + Docs
└─────────────────┘
```

## Skill Pack Selection

### Core Pack (Always Included)

The `astro-core` pack provides foundational knowledge:
- Rendering strategies (SSG, SSR, Hybrid, Server Islands)
- Component patterns
- Type system configuration
- Build optimization
- Cloudflare integration

### Domain Packs (Selected by Project Type)

| Project Type | Domain Packs |
|--------------|--------------|
| Blog | `blog` |
| Documentation | `docs` |
| SaaS | `saas` |
| E-commerce | `ecommerce` |

### Specialization Packs

| Requirement | Pack |
|-------------|------|
| Performance-critical | `astro-performance` |
| Security-sensitive | `astro-security` |
| SEO-focused | `astro-seo` |
| Cloudflare deployment | `astro-cloudflare` |

## Agent Coordination

### Routing Rules

1. **Architecture Requests**
   - Route to: `architect` agent
   - Trigger: New project, major refactor, performance issues

2. **Implementation Requests**
   - Route to: `implementer` agent
   - Trigger: Feature development, bug fixes, enhancements

3. **Review Requests**
   - Route to: `reviewer` agent
   - Trigger: PR creation, pre-commit validation

4. **Documentation Requests**
   - Route to: `documentation` agent
   - Trigger: README updates, ADR creation, migration guides

### Workflow Coordination

For complex requests requiring multiple agents:

1. **Parallel Execution** (when possible)
   - Independent tasks run concurrently
   - Example: Implementer writes code while Documentation creates README

2. **Sequential Execution** (when dependent)
   - Architect designs before Implementer builds
   - Example: Reviewer validates after Implementer completes

3. **Coordinated Execution** (cross-cutting concerns)
   - Multiple agents work on same artifact
   - Example: Architect + Reviewer validate architecture together

## Output Aggregation

The orchestrator aggregates outputs from multiple agents into:

1. **Primary Output** - The main deliverable (code, docs, architecture)
2. **Review Summary** - Consolidated review feedback
3. **Recommendations** - Next steps and follow-up actions
4. **Documentation Updates** - Auto-generated or updated docs

## Error Handling

### Delegation Failures

If an agent fails to complete its task:
1. Log the failure with context
2. Attempt re-delegation with modified scope
3. If persistent failure, escalate to human intervention

### Workflow Failures

If a workflow fails at any step:
1. Preserve partial outputs
2. Document failure point
3. Provide rollback recommendations
4. Notify appropriate agent for recovery

## Extension Points

The orchestrator is designed for extension:

### Adding New Agents

1. Define agent capabilities in `agents/` directory
2. Register agent in orchestrator routing table
3. Define input/output schemas
4. Add to coordination patterns

### Adding New Domain Packs

1. Create pack in `skills/astro-core/packs/`
2. Define domain-specific patterns
3. Register in skill pack registry
4. Update project type detection

### Adding New Workflows

1. Define workflow in `workflows/` directory
2. Register workflow triggers
3. Define agent participation patterns
4. Add to workflow coordination engine

## Configuration

The orchestrator reads configuration from `repository.manifest.json`:

```json
{
  "orchestrator": {
    "defaultAgents": ["architect", "implementer", "reviewer"],
    "workflows": ["feature-development", "architecture-review"],
    "skillPacks": ["astro-core", "blog", "docs", "saas", "ecommerce"]
  }
}
```

## Quality Assurance

The orchestrator enforces quality through:

1. **Agent Output Validation** - Verify agent outputs meet requirements
2. **Review Integration** - All major outputs reviewed by appropriate reviewer
3. **Documentation Requirements** - Implementation without documentation is incomplete
4. **Governance Compliance** - Outputs must comply with governance rules

## Anti-Patterns

### Orchestrator Anti-Patterns

- **Monolithic execution** - Never try to do everything yourself
- **Direct implementation** - Never write code without delegating to implementer
- **Skip reviews** - Never approve outputs without reviewer validation
- **Ignore governance** - Never bypass governance requirements

### Delegation Anti-Patterns

- **Over-delegation** - Don't delegate trivial tasks
- **Under-delegation** - Don't handle complex tasks alone
- **Unclear delegation** - Always provide clear context and requirements
- **Missing feedback** - Always provide feedback to delegating agents

## Future Evolution

Reserved for Layer 3 integration:

- Automated quality gates
- Policy enforcement
- Audit logging
- Performance tracking
- Agent performance metrics

## Learning Layer (Sub-Spec 3)

An **observability-first sidecar** is now part of the orchestrator package. It watches executions, detects patterns, and proposes routing improvements for human review. **No autonomous mutation** — every recommendation is human-governed.

### What it gives you

- **Telemetry** — every `execution.*`, `classification.*`, `reviewer.*`, and `workflow.completed` event is captured via an in-memory `TelemetryCollector` (auto-flush at 10 events, re-entrancy-safe).
- **Analytics** — duration percentiles, per-intent / per-skill success rates, classification confidence distributions.
- **Pattern detection** — flags `high_failure_rate`, `low_confidence`, `slow_execution`, `unused_capability` against configurable thresholds.
- **Recommendations** — six typed suggestions with confidence clamped to [0, 1].
- **Governance** — every recommendation becomes a `GovernanceTicket` with full JSONL audit trail. `submit → approve/reject` workflow.
- **CLI** — `pnpm analytics {analyze,patterns,recommendations,status}` with structured JSON output.

### Public API

```ts
import { createLearningLayer, runAnalysis } from 'astro-orchestrator/learning';

const layer = await createLearningLayer({
  dbPath: ':memory:',
  intervalHours: 24,
  auditPersistPath: './audit.jsonl', // optional, survives restarts
});

layer.emit(createTelemetryEvent('execution.completed', payload, requestId, intent));
await layer.flush();

const result = await runAnalysis(layer, { timeRange: { days: 7 } });
// result.metrics, result.patterns, result.recommendations

const ticket = await layer.submitRecommendation(recommendation);
await layer.approveRecommendation(ticket.id, 'admin');
const audit = await layer.getAuditEntries(ticket.id);
```

See [`docs/orchestrator-v5.md`](../../docs/orchestrator-v5.md#learning-layer-sub-spec-3) for the full reference and design notes.