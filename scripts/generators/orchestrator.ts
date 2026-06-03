/**
 * Orchestrator Generator
 *
 * Generates the orchestrator specification that routes incoming requests to
 * agents, skill packs, and workflows. The orchestrator NEVER implements,
 * reviews, or designs directly — it only delegates.
 */

import type { GenerationContext } from './types';

const ORCHESTRATOR_FILE = 'orchestrator/astro-orchestrator.md';

function renderOrchestrator(): string {
  return `# Astro Orchestrator

The Astro Orchestrator is the central coordination layer for AI agents working on Astro projects. It analyzes incoming requests, routes them to the appropriate agents, and coordinates workflows — **without implementing features, performing reviews, or generating architecture directly**.

> **Delegation Mandate:** The orchestrator's value lies in coordination, not execution. Any action that writes code, reviews code, or produces architecture MUST be delegated to the corresponding agent.

## Purpose

The orchestrator serves as the intelligent router that:

- Analyzes incoming engineering requests
- Identifies project type and complexity
- Selects appropriate skill packs and agents
- Coordinates multi-agent workflows
- Aggregates outputs into coherent results

## Core Principles

### Delegation Mandate — What the Orchestrator Must NEVER Do

The orchestrator **MUST NEVER**:

- Implement features directly (no code writing)
- Perform reviews directly (no scoring or approval)
- Generate architecture directly (no ADRs, no component design)
- Write code without delegating to the `implementer` agent
- Approve PRs without `reviewer` agent input
- Author documentation without `documentation` agent input
- Bypass governance or reviewer thresholds
- Execute workflows in parallel when they have ordering dependencies

The orchestrator's value lies in coordination, not execution.

### Request Analysis

Every request undergoes analysis across multiple dimensions before delegation:

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

\`\`\`
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
│Assess Complexity│───► Simple / Moderate / Complex / Enterprise
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Select Skill Packs│───► Core + Domain + Specialization
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route to Agents │───► Architect → Implementer → Reviewer → Documentation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Aggregate Output │───► Implementation + Reviews + Docs
└─────────────────┘
\`\`\`

## Skill Pack Selection

### Core Pack (Always Included)

The \`astro-core\` pack provides foundational knowledge:
- Rendering strategies (SSG, SSR, Hybrid, Islands, Server Islands)
- Content management (Collections, MDX, Live Collections)
- Data handling (Actions, API Routes, Astro DB)
- Performance patterns (hydration, image, font)
- Cloudflare integration (Workers, D1, R2, KV)
- Decision frameworks (when to use what)
- Tradeoff analysis (pros, cons, recommendations)

### Domain Packs (Selected by Project Type)

| Project Type | Domain Pack |
|--------------|-------------|
| Blog | \`blog\` |
| Documentation | \`docs\` |
| SaaS | \`saas\` |
| E-commerce | \`ecommerce\` |

### Specialization Packs

| Requirement | Pack |
|-------------|------|
| Performance-critical | \`astro-performance\` |
| Security-sensitive | \`astro-security\` |
| SEO-focused | \`astro-seo\` |
| Cloudflare deployment | \`astro-cloudflare\` |

## Agent Coordination

### Routing Rules

1. **Architecture Requests** → \`architect\` agent
   - Trigger: New project, major refactor, performance diagnosis
2. **Implementation Requests** → \`implementer\` agent
   - Trigger: Feature development, bug fix, enhancement
3. **Review Requests** → \`reviewer\` agent
   - Trigger: PR creation, pre-commit validation, architecture decision
4. **Documentation Requests** → \`documentation\` agent
   - Trigger: README, ADR, migration guide, architecture doc

### Execution Modes

1. **Sequential Execution** (default when output is dependent)
   - Architect → Implementer → Reviewer → Documentation
2. **Parallel Execution** (when outputs are independent)
   - Documentation drafting in parallel with Implementer
3. **Coordinated Execution** (cross-cutting)
   - Architect + Reviewer validate architecture together
4. **Escalation** (when an agent refuses or escalates)
   - Orchestrator routes the escalation back to the human or to a higher-authority agent

## Output Aggregation

The orchestrator aggregates outputs from multiple agents into:

1. **Primary Output** — the main deliverable (code, docs, architecture)
2. **Review Summary** — consolidated review feedback with severity counts
3. **Recommendations** — next steps and follow-up actions
4. **Documentation Updates** — auto-generated or updated docs
5. **Escalations** — items that require human or higher-authority intervention

## Error Handling

### Delegation Failures

If an agent fails to complete its task:

1. Log the failure with full context
2. Attempt re-delegation with modified scope
3. If persistent failure, escalate to human intervention
4. Preserve partial outputs for later recovery

### Workflow Failures

If a workflow fails at any step:

1. Preserve partial outputs
2. Document the failure point
3. Provide rollback recommendations
4. Notify the appropriate agent for recovery

## Configuration

The orchestrator reads configuration from \`repository.manifest.json\`:

\`\`\`json
{
  "orchestrator": {
    "defaultAgents": ["architect", "implementer", "reviewer", "documentation"],
    "workflows": ["feature-development", "architecture-review", "migration", "release", "refactoring"],
    "skillPacks": ["astro-core", "blog", "docs", "saas", "ecommerce"]
  }
}
\`\`\`

## Quality Assurance

The orchestrator enforces quality through:

1. **Agent Output Validation** — verify outputs meet requirements before aggregation
2. **Review Integration** — all major outputs reviewed by \`reviewer\` agent
3. **Documentation Requirements** — implementation without documentation is incomplete
4. **Governance Compliance** — outputs must comply with governance rules

## Anti-Patterns

### Orchestrator Anti-Patterns

- **Monolithic execution** — never try to do everything yourself
- **Direct implementation** — never write code without delegating to \`implementer\`
- **Skip reviews** — never approve outputs without \`reviewer\` validation
- **Ignore governance** — never bypass governance requirements
- **Skip documentation** — never finalize without \`documentation\` agent
- **Make architecture decisions** — never replace \`architect\` agent

### Delegation Anti-Patterns

- **Over-delegation** — don't delegate trivial tasks
- **Under-delegation** — don't handle complex tasks alone
- **Unclear delegation** — always provide clear context and requirements
- **Missing feedback** — always provide feedback to delegating agents
- **Untracked escalations** — always preserve escalation context

## Extension Points

### Adding New Agents

1. Define agent capabilities in \`agents/<name>.md\` using the standard structure (Purpose, Responsibilities, Inputs, Outputs, Workflow Participation, Decision Boundaries, Anti-Patterns)
2. Register agent in orchestrator routing rules
3. Define input/output schemas
4. Add to coordination patterns

### Adding New Domain Packs

1. Create pack in \`skills/astro-core/packs/\`
2. Define domain-specific patterns
3. Register in skill pack registry
4. Update project type detection

### Adding New Workflows

1. Define workflow in \`workflows/\` using the standard structure (Purpose, Inputs, Process, Outputs, Success Criteria, Decision Points)
2. Register workflow triggers
3. Define agent participation patterns
4. Add to workflow coordination engine

## Future Evolution (Layer 3)

Reserved for Harness integration:

- **Validators** — automated policy enforcement
- **Auditors** — continuous governance auditing
- **Policies** — declarative policy definitions
- **Automation** — task automation
- **Quality Gates** — pre-merge quality enforcement

These are intentionally not implemented in the initial release. Focus on establishing a strong Layer 1 + Layer 2 foundation first.

---
*Generated by Astro Engineering OS Bootstrap Generator (Layer 2: Agent Orchestration)*
`;
}

export function generate(context: GenerationContext): { errors: string[] } {
  const errors: string[] = [];

  try {
    const content = renderOrchestrator();
    const result = context.writeFile(ORCHESTRATOR_FILE, content);
    if (!result.success && result.error) {
      errors.push(`${ORCHESTRATOR_FILE}: ${result.error}`);
    }
  } catch (error) {
    errors.push(`Orchestrator generation failed: ${String(error)}`);
  }

  return { errors };
}

export const orchestrator = { generate };
