# Orchestrator Runtime — Design

**Date:** 2026-06-04
**Repo:** astro-engineering-os
**Status:** IMPLEMENTED (Sub-Spec 2 Complete)
**Goal:** Evolve the orchestrator from a markdown spec into a multi-agent orchestration runtime (v5).

## Problem

The repo has a sophisticated orchestration specification (`orchestrator/astro-orchestrator.md`) with routing rules, governance, and validation patterns. It has skills, agents, governance rules, and reviewers — but no TypeScript engine to execute the workflow. Every multi-agent task is manual.

## Approach (Approved)

**Incremental Layer Addition** — build a TypeScript runtime on top of the existing docs, preserving all current assets (skills, agents, governance). Each phase is independently usable.

## Phases

### Phase 1: Core Engine (Foundation)

**Deliverables:**
- `orchestrator/engine.ts` — parses `astro-orchestrator.md` routing rules into executable AST
- `orchestrator/state.ts` — execution state machine (`pending → running → completed | failed | blocked`)
- `orchestrator/cli.ts` — CLI: `astro-orch run <task>`, `astro-orch list`, `astro-orch status <id>`
- `orchestrator/index.ts` — programmatic entry: `createOrchestrator().run(task)`
- `package.json` — dual export: bin (CLI) + `main`/`types` for library import
- `tsconfig.json` — strict, ES2022, NodeNext

**Distribution:** npm package (relative) consumed by OpenCode via direct import or workspace link.

### Phase 2: Parallel Execution & Agent Dispatch

**Deliverables:**
- `orchestrator/executor.ts` — task DAG with parallel dispatch
- `orchestrator/queue.ts` — priority queue, configurable concurrency (default 3)
- `orchestrator/agents/` — adapter layer wrapping existing agents (`architect`, `implementer`, `reviewer`, `documentation`)
- `orchestrator/loader.ts` — discovers and imports existing agents/ from the repo

**Execution model:** Tasks form a DAG. `executor.ts` schedules ready nodes, dispatches them to agents in parallel up to concurrency limit, awaits completion, advances state.

### Phase 3: Self-Improvement & Persistence

**Deliverables:**
- `orchestrator/metrics.ts` — execution metrics (duration, success rate, retries, agent scores)
- `orchestrator/history.ts` — SQLite-backed execution log at `.orchestrator/history.db` (configurable)
- `orchestrator/advisor.ts` — historical rule refinement; suggests routing tweaks from aggregate outcomes
- `orchestrator/feedback.ts` — human + agent feedback loop

### Phase 4: OpenCode Integration

**Deliverables:**
- `orchestrator/mcp/server.ts` — MCP server exposing orchestrator as tools
- `opencode.json` snippet for auto-discovery
- Integration: tool surface = `run_task`, `list_tasks`, `get_status`, `cancel_task`, `get_history`

**Integration shape:** MCP server (more portable across OpenCode versions) preferred over direct import. Falls back to direct npm workspace import if MCP unavailable.

## Architecture

```
┌─────────────────┐
│  astro-orch CLI │  ← entry point
└────────┬────────┘
         │
┌────────▼────────┐
│  Engine (parse) │  ← reads astro-orchestrator.md
└────────┬────────┘
         │
┌────────▼────────┐    ┌──────────────┐
│  State Machine  │◀──▶│  SQLite Log  │
└────────┬────────┘    └──────────────┘
         │
┌────────▼────────┐
│  Task Queue     │  ← DAG, priority
└────────┬────────┘
         │
┌────────▼────────┐
│   Executor      │  ← parallel dispatch
└────────┬────────┘
         │
   ┌─────┴──────┐
   ▼            ▼
[Architect] [Implementer] [Reviewer] [Docs]  ← existing agents/
```

## Data Flow

1. User invokes CLI or library: `run("implement-auth")`
2. Engine parses `astro-orchestrator.md`, matches task to routing rule
3. Rule expands into DAG of subtasks
4. State machine initializes root node
5. Executor pulls ready nodes, dispatches to agents
6. Agents run (parallel, up to concurrency limit)
7. Each completion updates state, unblocks children
8. History records outcome
9. Final state returned to caller

## Error Handling

- **Agent failure** → retry (max 2), then mark task `failed`, propagate to parent
- **Routing rule missing** → fail fast with diagnostic
- **Concurrency deadlock** → detector kills stale nodes after timeout
- **State corruption** → recover from SQLite log, resume from last known good

## Testing

- **Unit:** rule parser, state machine transitions, queue scheduling
- **Integration:** end-to-end task execution with mock agents
- **Contract:** CLI output shape, library API surface
- **Coverage target:** 80%+

## Open Decisions (Resolved)

- **Concurrency limit:** configurable, default 3
- **Persistence:** SQLite at `.orchestrator/history.db`, override via `ASTRO_ORCH_DB` env var
- **OpenCode integration:** MCP server (primary) + direct npm import (fallback)
