# Release Workflow

> **Audience:** Humans (contributors, reviewers) + AI agents

## Purpose

This workflow defines the process for releasing new versions of Astro Engineering OS, ensuring quality, consistency, and traceability.

---

## Inputs

### Required

- Version number (semver)
- Changelog
- Release notes
- Build artifacts

### Optional

- Migration guide
- Breaking changes
- Deprecations

---

## Versioning Strategy

### Semantic Versioning

| Version | Type | When |
|---------|------|------|
| Major (X.0.0) | Breaking | Breaking changes |
| Minor (0.X.0) | Feature | New functionality |
| Patch (0.0.X) | Fix | Bug fixes |

### Version Branches

```
main                # Current release
├── release/X.Y     # Release preparation
└── develop         # Next release (if applicable)
```

---

## Process

### Phase 1: Preparation

#### 1.1 Changelog Review

```markdown
## Changelog for v2.0.0

### Added
- New `astro-core` skill with rendering strategies
- Domain packs for blog, docs, saas, ecommerce
- Orchestrator system for agent coordination
- Architecture Decision Records (ADRs)

### Changed
- Updated governance documents with size limits
- Enhanced reviewers with scoring systems
- Improved workflows with decision points

### Deprecated
- Legacy component patterns (use new patterns)
- Old naming conventions (see naming.md)

### Removed
- Unused configuration options
- Deprecated APIs

### Fixed
- Security vulnerabilities in auth patterns
- Performance issues in hydration
```

#### 1.2 Pre-Release Checklist

| Check | Status | Notes |
|-------|--------|-------|
| All tests pass | ✓ | |
| Build succeeds | ✓ | |
| Documentation updated | ✓ | |
| Changelog accurate | ✓ | |
| Migration guide ready | ✓ | (if breaking) |
| Version bumped | ✓ | |

#### 1.3 Version Bump

```bash
# Update version in package.json
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

---

### Phase 2: Build & Test

#### 2.1 CI Pipeline

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install
        run: npm ci
      
      - name: Type Check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm run test
      
      - name: Build
        run: npm run build
      
      - name: Schema Validation
        run: npm run validate:schemas

  release:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/**
          generate_release_notes: true
```

#### 2.2 Quality Gates

| Gate | Threshold | Fail Action |
|------|-----------|-------------|
| TypeScript | 0 errors | Stop |
| ESLint | 0 errors | Stop |
| Tests | 100% pass | Stop |
| Coverage | ≥ 80% | Warning |
| Bundle Size | < 200KB | Warning |

---

### Phase 3: Documentation

#### 3.1 Release Documentation

```markdown
# Release v2.0.0

## Highlights

### New Orchestrator System
AI agent coordination layer for project management.

### Domain Packs
Specialized knowledge for blog, docs, SaaS, and e-commerce projects.

### Enhanced Governance
Updated file size limits, component patterns, and naming conventions.

## Breaking Changes

### Migration Required
If upgrading from v1.x:
1. Review updated governance documents
2. Update component patterns
3. Run migration scripts

See [Migration Guide](docs/migration/v2.md) for details.

## What's Changed

| Component | Change |
|-----------|--------|
| Skills | New structure with packs |
| Governance | Updated limits |
| Reviewers | New scoring system |
```

#### 3.2 Generate Artifacts

```bash
# Generate API documentation
npm run docs:api

# Generate changelog
npm run changelog

# Package distribution
npm pack
```

---

### Phase 4: Release

#### 4.1 Tag Creation

```bash
# Create and push tag
git tag -a v2.0.0 -m "Release v2.0.0

Features:
- Orchestrator system
- Domain packs
- Enhanced governance

Breaking changes:
- Component patterns updated
- Migration required from v1.x"

git push origin v2.0.0
```

#### 4.2 GitHub Release

The CI/CD automatically:
1. Creates GitHub release
2. Uploads artifacts
3. Generates release notes
4. Notifies subscribers

#### 4.3 Distribution

| Channel | Method |
|---------|--------|
| npm | Published to npm registry |
| GitHub | Release page with downloads |
| Documentation | Auto-deployed to docs site |

---

### Phase 5: Post-Release

#### 5.1 Announcement

```markdown
## Release Announcement

🚀 **Astro Engineering OS v2.0.0 is now available!**

### What's New

🎯 **Orchestrator System** - AI agent coordination
📚 **Domain Packs** - Specialized knowledge bases
📋 **Enhanced Governance** - Updated standards

### Breaking Changes

Migration required from v1.x. See [Migration Guide](docs/migration/v2.md).

### Get Started

```bash
npm install astro-engineering-os@latest
```

### Resources

- [Release Notes](CHANGELOG.md)
- [Documentation](docs/)
- [Migration Guide](docs/migration/v2.md)
```

#### 5.2 Post-Release Checklist

| Task | Status | Owner |
|------|--------|-------|
| GitHub release created | ✓ | CI |
| npm package published | ✓ | CI |
| Documentation deployed | ✓ | CI |
| Announcement sent | ○ | Team |
| Community notified | ○ | Team |

---

## Outputs

### Release Package

```
dist/
├── astro-engineering-os-v2.0.0.tgz
├── schemas/
├── skills/
├── governance/
├── reviewers/
├── workflows/
├── adr/
└── README.md
```

### Release Notes

```markdown
# v2.0.0 (2024-01-15)

## Breaking Changes

### Migration Required
This release introduces significant architectural changes.
See [Migration Guide](docs/migration/v2.md) for upgrade instructions.

### Component Patterns
- Maximum component size reduced to 150 lines
- Props interface required for all components
- Single responsibility enforced

## Features

### Orchestrator System
AI agent coordination for project management.

### Domain Packs
Specialized knowledge for:
- Blog sites
- Documentation
- SaaS applications
- E-commerce

## Bug Fixes

- Fixed security issue in auth patterns (#123)
- Fixed performance regression in hydration (#124)
- Fixed missing type definitions (#125)

## Documentation

- Updated getting started guide
- Added migration guide for v1.x users
- Enhanced API documentation
```

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Build passes | 100% |
| Tests pass | 100% |
| Documentation complete | 100% |
| Changelog accurate | 100% |
| Distribution successful | 100% |

---

## Rollback Procedure

### If Issues Detected Post-Release

```bash
# Revert to previous version
git revert HEAD
git push

# Unpublish from npm
npm unpublish astro-engineering-os@2.0.0

# Notify users
```

### Hotfix Process

1. Create fix branch
2. Apply minimal fix
3. Test thoroughly
4. Release as patch version
5. Document in changelog

---

## Anti-Patterns

### Avoid

- **Skipping tests** - Quality gates exist for a reason
- **Incomplete changelog** - Users need accurate info
- **Skipping documentation** - New features need docs
- **Skipping announcement** - Community needs to know