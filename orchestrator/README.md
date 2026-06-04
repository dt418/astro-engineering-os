# Astro Orchestrator

Multi-agent orchestration runtime for `astro-engineering-os`.

Two versions live side by side in `src/`:

- **v4 (legacy)** — `src/index.ts` etc. — sync/async orchestrator + executor + history + CLI + MCP wrapper
- **v5 (foundation, this branch)** — `src/registry/`, `src/routing/`, `src/runtime/`, `src/orchestrator-v5.ts` — markdown-as-source-of-truth, class + DI + factory

Markdown catalogs of capabilities live in `catalog/`, routing in `routing/`, governance docs in `governance/`.
