# Orchestrator Guide

> **Audience:** Humans (project users, contributors) + AI agents

The central coordination layer for AI agents.

## Overview

The orchestrator analyzes requests, routes to appropriate agents, and coordinates workflows.

## Request Flow

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
│  Identify Type   │───► Blog / Docs / SaaS / Custom
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Assess Complexity│───► Simple / Moderate / Complex
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select Skills   │───► Core + Domain Pack
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route to Agents │───► Architect → Implementer → Reviewer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aggregate Output │───► Implementation + Reviews + Docs
└─────────────────┘
```

## Skill Pack Selection

### Always Included

`astro-core` - Framework knowledge

### Domain Packs

| Project Type | Pack |
|--------------|------|
| Blog | blog |
| Documentation | docs |
| SaaS | saas |
| E-commerce | ecommerce |

## Agent Routing

### Routing Rules

| Request Type | Agent | Example |
|--------------|-------|----------|
| New project | Architect | Create initial structure |
| Feature | Implementer | Build new feature |
| Bug fix | Implementer | Fix reported issue |
| Architecture | Architect | Design system |
| Security | Reviewer | Validate auth |

### Coordination

| Pattern | When |
|---------|------|
| Parallel | Independent tasks |
| Sequential | Dependent tasks |
| Coordinated | Cross-cutting concerns |

## Constraints

### Must Never

- Implement directly
- Perform reviews directly
- Skip delegation
- Bypass governance

### Must Always

- Delegate to agents
- Validate outputs
- Document decisions
- Follow workflows

## Extension Points

### Adding Agents

1. Define in `agents/`
2. Register in routing table
3. Configure inputs/outputs
4. Add coordination patterns

### Adding Skills

1. Create in `skills/`
2. Define patterns
3. Register in manifest
4. Update detection

### Adding Workflows

1. Define in `workflows/`
2. Register triggers
3. Configure coordination
4. Add to orchestrator