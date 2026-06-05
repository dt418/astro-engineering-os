# Changelog

> **Audience:** Humans (project users and maintainers tracking changes)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- feat(learning): telemetry event types — typed `EventType` union and payload interfaces for execution, classification, reviewer, and workflow events (320be54)
- feat(learning): telemetry store with query support — in-memory `TelemetryStore` with time-range filtering and stats (2cefc3b)
- feat(learning): telemetry collector with async flush — re-entrancy-safe async queue with 10-event auto-flush threshold (95f8f18)
- feat(learning): analytics engine with metrics computation — typed predicates, execution/routing/reviewer metrics (f5e6ab9)
- feat(learning): pattern detector with threshold-based detection — recurring behaviors from telemetry (bb5c9f4)
- feat(learning): recommendation engine with pattern-based generation — scoring + clamp helpers, pattern-boost caps (ffebe88)
- feat(learning): governance layer with approval workflow — JSONL audit trail, ring buffer, human-only mutation (8664a11)
- feat(learning): scheduled analyzer with interval support — periodic recompute with `SchedulerValidationError` (2ab6f61)
- feat(learning): learning layer index and factory function — curated `LearningLayer` interface + `LearningLayerValidationError` (4fca505)
- feat(learning): analytics CLI with command parsing — `analyze | patterns | recommendations | status` commands (c976d8b)
- test(learning): integration test for full workflow — end-to-end exercise of telemetry → analytics → patterns → recommendations (68da1c1)
- docs(sub-spec-3): learning layer architecture design — design doc for the observability-first sidecar (5173bbb)
- docs(learning): Sub-Spec 3 completion sync — design, plan, runtime, and `astro-orchestrator` docs marked complete (7935d0f)

### Fixed

- fix(learning): narrow payload types and fix scheduler options (39f371a)
- fix(learning): address all 17 code review findings across the learning layer — type-narrowed predicates, validation errors, persistence, audit wiring (fb60c36)

## [1.0.0] - 2024-01-01

### Added

- Initial release of Astro Engineering OS
- Core skills: astro-core, astro-blog, astro-docs, astro-saas, astro-ecommerce
- Performance skills: astro-performance, astro-seo, astro-security, astro-cloudflare
- Governance framework with architecture, component, file, and dependency rules
- Review system with architecture, security, performance, accessibility, SEO, and code reviewers
- Feature development, architecture review, migration, release, and refactoring workflows
- Architecture Decision Records (ADRs) for rendering, database, authentication, content, caching, deployment, and design system
- GitHub workflows for CI and releases
- Bootstrap generator for repository scaffolding
- Comprehensive documentation for all subsystems

## [1.0.1] - 2026-06-04

### Changed

- Switched package manager from npm to pnpm (with `packageManager: pnpm@10.33.2` in `package.json` and committed `pnpm-lock.yaml`)
- Bumped `actions/checkout`, `actions/setup-node`, and `pnpm/action-setup` to v6; opted into the Node.js 24 runner via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` to stay ahead of the June 2026 deprecation
- Simplified CI workflow to two jobs: `Quality Checks` (install + typecheck) and `Security Audit` (install + `pnpm audit`); removed the `lint`, `test`, `build`, and `validate:schemas` steps that referenced scripts not defined in this generator repo

### Fixed

- Three `tsc --noEmit` errors that were silently failing CI: unescaped backticks in the markdown template literals of `scripts/generators/orchestrator.ts` (lines 39-41) and `scripts/generators/examples.ts` (line 16) were prematurely closing the string; `ensureParentDirectory` in `scripts/shared/write-directory.ts` was declared to return `Promise<void>` but `mkdir()` returns `Promise<string | undefined>`; `writeFiles` in `scripts/shared/write-file.ts` was forwarding optional fields that conflicted with `exactOptionalPropertyTypes`
- Added `@types/node@^22.0.0` to `devDependencies` (the existing `tsconfig.json` already referenced it under `types: ["node"]`)