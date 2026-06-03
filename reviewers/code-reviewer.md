# Code Reviewer

> **Audience:** Humans (contributors, reviewers) + AI agents

Automated code quality compliance checking for Astro projects.

## Review Objectives

### Primary Goals

1. **Code Quality** - Maintainable, readable code
2. **Type Safety** - TypeScript correctness
3. **Testing** - Adequate test coverage
4. **Style** - Consistent code formatting
5. **Best Practices** - Follow language idioms

### Quality Targets

| Metric | Target | Enforcement |
|--------|--------|-------------|
| TypeScript errors | 0 | CI required |
| Lint errors | 0 | CI required |
| Test coverage | 80% | Per component |
| Complexity | < 10 | Per function |

---

## Review Categories

### 1. TypeScript & Types (25%)

#### Type Safety

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| No implicit any | All types explicit | 0-5 |
| Strict mode | strict: true in tsconfig | 0-5 |
| Type exports | Public types exported | 0-5 |
| Interface usage | Interfaces over types | 0-5 |

#### Type Patterns

```typescript
// Good: Explicit types
interface UserProps {
  userId: string;
  name: string;
  email: string;
}

export function UserProfile({ userId, name, email }: UserProps) {
  return <div>{name}</div>;
}

// Bad: Implicit any
function UserProfile({ userId, name, email }) {
  return <div>{name}</div>;
}

// Bad: Using any
function processData(data: any) {
  return data.id;
}
```

#### Generic Usage

```typescript
// Good: Generics
function map<T, U>(array: T[], fn: (item: T) => U): U[] {
  return array.map(fn);
}

// Bad: Any in generics
function identity(array: any[]): any[] {
  return array;
}
```

### 2. Component Quality (20%)

#### Component Patterns

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Props interface | Explicit props type | 0-5 |
| Single responsibility | One purpose | 0-5 |
| Composition | Well-composed | 0-5 |
| Reusability | Clear API | 0-5 |

#### Component Rules

```typescript
// Good: Props interface
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Bad: No interface
export function Button(props) { ... }

// Good: Single responsibility
export function UserAvatar({ userId, size }: AvatarProps) {
  const user = useUser(userId);
  return <img src={user.avatar} alt={user.name} class={`avatar-${size}`} />;
}

// Bad: Multiple responsibilities
export function UserCard({ userId }) {
  // Fetches user, shows avatar, shows posts, handles follow...
}
```

### 3. Testing (20%)

#### Test Coverage

| Check | Criteria | Points |
|-------|----------|--------|
| Unit tests | 80% coverage | 0-5 |
| Integration tests | All features | 0-5 |
| E2E tests | Critical paths | 0-5 |
| Test quality | Meaningful tests | 0-5 |

#### Test Patterns

```typescript
// Good: Comprehensive test
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

// Bad: Shallow test
it('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeTruthy();
});
```

### 4. Error Handling (15%)

#### Error Patterns

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Try-catch | Async errors handled | 0-5 |
| Error types | Custom error types | 0-5 |
| Error boundaries | React error boundaries | 0-5 |

#### Error Handling

```typescript
// Good: Async error handling
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new UserFetchError('Network failed', { cause: error });
    }
    throw error;
  }
}

// Bad: Unhandled error
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json(); // Could throw!
}
```

### 5. Code Style (10%)

#### Style Rules

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Formatting | Prettier applied | 0-5 |
| Naming | Consistent conventions | 0-5 |
| Imports | Organized imports | 0-5 |
| Comments | Meaningful comments | 0-5 |

#### Import Organization

```typescript
// Good: Organized imports
import { promises as fs } from 'fs';           // Node.js
import path from 'path';                          // Node.js

import { z } from 'zod';                          // External
import { debounce } from 'lodash-es';

import { defineConfig } from 'astro/config';      // Astro

import { db } from 'astro:db';                    // Internal

import { Button } from '../components/ui/Button'; // Relative
import { formatDate } from '../lib/date';

import type { User } from '../types/user';        // Type imports
```

---

## Code Smells

### Complexity Smells

| Smell | Threshold | Fix |
|-------|-----------|-----|
| Function length | > 50 lines | Split |
| Cyclomatic complexity | > 10 | Simplify |
| Parameters | > 4 | Use object |
| Nesting | > 3 levels | Extract |

### Naming Smells

| Smell | Problem | Fix |
|-------|---------|-----|
| Single letters | Unclear purpose | `index`, `count` ok |
| Abbreviations | Hard to read | `getUser` not `getUsr` |
| Hungarian | Redundant typing | `userId` not `strUserId` |
| Magic numbers | No context | Named constants |

### Structure Smells

| Smell | Problem | Fix |
|-------|---------|-----|
| God object | Too much responsibility | Split |
| Shotgun surgery | Changes everywhere | Cohere |
| Parallel classes | Duplication | Merge |
| Feature envy | Envies other class | Move method |

---

## Review Process

### 1. Lint Check

```bash
# Run ESLint
npm run lint

# Fix auto-fixable
npm run lint:fix
```

### 2. Type Check

```bash
# Run TypeScript
npm run typecheck

# With Astro check
npx astro check
```

### 3. Test Check

```bash
# Run tests
npm run test

# With coverage
npm run test:coverage
```

### 4. Format Check

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

---

## Findings Format

```markdown
## Code Quality Finding: [Title]

**Category:** [Types | Components | Testing | Errors | Style]
**Severity:** [Critical | High | Medium | Low]
**Location:** [File:Line]

### Issue

[What code quality issue exists]

### Current Code

```typescript
[problematic code]
```

### Problem

[Why this is an issue]

### Recommendation

```typescript
[fixed code]
```

### Effort

[Low | Medium | High]
```

---

## Rejection Criteria

### Automatic Rejection

- TypeScript errors
- ESLint errors
- Failing tests
- Security vulnerabilities

### Should Fix

- Complexity > 15
- Coverage < 70%
- Naming violations
- Missing tests on new code

---

## Quality Gates

### PR Requirements

| Check | Requirement |
|-------|-------------|
| TypeScript | 0 errors |
| ESLint | 0 errors |
| Prettier | No changes |
| Tests | All passing |
| Coverage | ≥ 70% |

### Approval Requirements

| Change Type | Reviewer Count |
|-------------|---------------|
| Hotfix | 1 |
| Feature | 2 |
| Architecture | 3 |

---

## Checklist

### Types

- [ ] No implicit any
- [ ] Strict TypeScript mode
- [ ] Public types exported
- [ ] Generic types used correctly

### Components

- [ ] Props interface defined
- [ ] Single responsibility
- [ ] Well-composed
- [ ] Reusable API

### Tests

- [ ] Unit tests written
- [ ] Integration tests for features
- [ ] E2E for critical paths
- [ ] Coverage ≥ 80%

### Error Handling

- [ ] Async errors caught
- [ ] Custom error types
- [ ] Error boundaries used
- [ ] Logging implemented

### Style

- [ ] Prettier applied
- [ ] Consistent naming
- [ ] Organized imports
- [ ] Meaningful comments

---

## CI Configuration

```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run typecheck

- name: Lint
  run: npm run lint

- name: Format Check
  run: npm run format:check

- name: Tests
  run: npm run test -- --coverage

- name: Bundle Check
  run: npx bundlesize
```

---

## Anti-Patterns

### Code Patterns to Avoid

```typescript
// Bad: any usage
function process(data: any) { ... }

// Bad: type assertions
const value = data as string;

// Bad: non-null assertions
const name = user!.name;

// Bad: for...in without checks
for (const key in object) {
  if (object.hasOwnProperty(key)) { ... }
}

// Bad: magic numbers
if (delay > 5000) { ... }

// Good: named constants
const MAX_DELAY_MS = 5000;
if (delay > MAX_DELAY_MS) { ... }
```

### React Anti-Patterns

```tsx
// Bad: Inline functions in render
<button onClick={() => handleClick(id)}>Click</button>

// Good: Stable reference
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, []);
<button onClick={() => handleClick(id)}>Click</button>

// Bad: Object in render
<Component style={{ display: 'flex' }} />

// Good: CSS class
<Component className="flex" />
```

---

## Usage by AI Agents

### Implementer Agent

Self-review before PR:
1. Run `npm run lint:fix`
2. Run `npm run typecheck`
3. Run `npm run test`
4. Check complexity

### Reviewer Agent

Review for:
- Type safety
- Component patterns
- Test quality
- Error handling

---

## Configuration

### ESLint

```javascript
// .eslintrc.cjs
module.exports = {
  extends: ['astro'],
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
  }
};
```

### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```