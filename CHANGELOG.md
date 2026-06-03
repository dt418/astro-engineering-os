# Changelog

> **Audience:** Humans (project users and maintainers tracking changes)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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