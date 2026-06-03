/**
 * Generator for the `hooks/` directory. Produces git hooks that
 * enforce Engineering OS conventions: pre-commit (lint, typecheck),
 * pre-push (tests, audit), commit-msg (conventional commits).
 */
import type { WriteFileOptions } from '../shared/write-file';
import { writeFiles } from '../shared/write-file';

const PRE_COMMIT = `#!/usr/bin/env bash
# Pre-commit hook: run lint and typecheck on staged files.
# Install with: pnpm exec git-hooks install

set -e

echo "Running pre-commit checks..."

# Run formatter
pnpm exec prettier --check .

# Run linter
pnpm run lint

# Run typecheck
pnpm run typecheck

echo "Pre-commit checks passed."
`;

const PRE_PUSH = `#!/usr/bin/env bash
# Pre-push hook: run tests and dependency audit before pushing.
# Install with: pnpm exec git-hooks install

set -e

echo "Running pre-push checks..."

# Run tests
pnpm run test

# Run dependency audit
pnpm audit --prod --audit-level=high

echo "Pre-push checks passed."
`;

const COMMIT_MSG = `#!/usr/bin/env bash
# Commit-msg hook: enforce Conventional Commits format.
# Install with: pnpm exec git-hooks install

set -e

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Conventional Commits regex
PATTERN='^(feat|fix|chore|docs|refactor|perf|test|build|ci|revert)(\\([a-z0-9-]+\\))?!?: .{1,50}'

if ! echo "$COMMIT_MSG" | head -n 1 | grep -qE "$PATTERN"; then
  echo "Error: commit message does not follow Conventional Commits format."
  echo "Expected: <type>(<scope>): <subject>"
  echo "Example: feat(auth): add password reset endpoint"
  exit 1
fi
`;

const INSTALL_SCRIPT = `#!/usr/bin/env bash
# Install git hooks into .git/hooks.
# Run from the project root.

set -e

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

cp "$HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
cp "$HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
cp "$HOOKS_DIR/commit-msg" "$GIT_HOOKS_DIR/commit-msg"

chmod +x "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-push"
chmod +x "$GIT_HOOKS_DIR/commit-msg"

echo "Git hooks installed to $GIT_HOOKS_DIR"
`;

export function buildHookFiles(): ReadonlyArray<WriteFileOptions> {
  return [
    { path: 'hooks/pre-commit', content: PRE_COMMIT },
    { path: 'hooks/pre-push', content: PRE_PUSH },
    { path: 'hooks/commit-msg', content: COMMIT_MSG },
    { path: 'hooks/install.sh', content: INSTALL_SCRIPT },
  ];
}

export async function generateHooks(): Promise<void> {
  const { summary } = await writeFiles(buildHookFiles());
  console.log(`hooks: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateHooks();
}
