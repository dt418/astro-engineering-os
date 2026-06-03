# Contributing to Astro Engineering OS

Thank you for your interest in contributing to Astro Engineering OS.

## Ways to Contribute

- Report bugs and issues
- Suggest new features
- Improve documentation
- Submit code changes
- Review pull requests
- Share use cases and success stories

## Development Workflow

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/astro-engineering-os.git
cd astro-engineering-os
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Changes

Follow the governance guidelines in `/governance` when making changes.

### 5. Test Changes

```bash
npm run validate
```

### 6. Commit Changes

Use conventional commits format:

```bash
git commit -m "feat(scope): add new feature"
```

### 7. Push and Create PR

```bash
git push origin feature/your-feature-name
```

## Governance Compliance

All contributions must comply with the governance documents:

- [Architecture Governance](/governance/architecture.md)
- [Component Governance](/governance/components.md)
- [File Governance](/governance/files.md)
- [Dependency Governance](/governance/dependencies.md)

## Review Requirements

All PRs require review from at least one code owner. Larger changes may require additional reviewers based on the affected areas.

## Questions?

Open an issue for discussion before starting large contributions.