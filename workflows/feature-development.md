# Feature Development Workflow

## Purpose

This workflow defines the process for developing new features in Astro Engineering OS projects, from initial concept through implementation and deployment.

---

## Inputs

### Required

- Feature description or user story
- Acceptance criteria
- Project context
- Affected components

### Optional

- Design mockups
- Technical constraints
- Performance requirements
- Security requirements

---

## Process

### Phase 1: Analysis

#### 1.1 Requirements Understanding

```markdown
## Feature: User Authentication

### User Story
As a user, I want to log in with email/password so that I can access my account.

### Acceptance Criteria
- [ ] User can enter email and password
- [ ] System validates credentials
- [ ] User sees success/error feedback
- [ ] Session persists across page loads

### Constraints
- Must work without JavaScript (progressive enhancement)
- Password must be hashed
- Session expires after 7 days
```

#### 1.2 Impact Assessment

| Area | Impact | Notes |
|------|--------|-------|
| Components | AuthForm, AuthLayout | New components |
| Pages | /login, /signup | New routes |
| State | Session management | New state |
| API | /api/auth/* | New endpoints |
| Security | Auth middleware | Required |

#### 1.3 Skill Selection

```markdown
## Skill Selection

**Core Pack:** astro-core
- Rendering (SSR for auth)
- Actions (form handling)
- Session management

**Domain Pack:** saas (if SaaS project)
- Auth patterns
- Multi-tenancy
```

---

### Phase 2: Architecture

#### 2.1 Design

The **Architect Agent** creates:

1. **Component Structure**
   ```
   src/features/auth/
   ├── components/
   │   ├── LoginForm.tsx
   │   ├── SignupForm.tsx
   │   └── PasswordReset.tsx
   ├── actions/
   │   ├── login.ts
   │   ├── signup.ts
   │   └── reset.ts
   ├── lib/
   │   ├── session.ts
   │   └── validation.ts
   └── pages/
       ├── login.astro
       └── signup.astro
   ```

2. **Data Flow**
   ```
   User Input → Form Validation → Action → Auth Provider → Session
   ```

3. **Security Considerations**
   - Password hashing (bcrypt)
   - Session tokens (httpOnly, secure)
   - CSRF protection
   - Rate limiting

#### 2.2 Review

Before implementation, architecture is reviewed by:
1. **Security Reviewer** - Auth patterns
2. **Architecture Reviewer** - Component design
3. **Performance Reviewer** - Loading strategy

---

### Phase 3: Implementation

#### 3.1 Setup

```bash
# Create feature branch
git checkout -b feature/user-authentication

# Pull latest main
git pull origin main
```

#### 3.2 Implementation Order

| Order | Component | Reason |
|-------|-----------|--------|
| 1 | Types and interfaces | Define contracts |
| 2 | Validation schemas | Reusable |
| 3 | Actions | Business logic |
| 4 | Components | UI layer |
| 5 | Pages | Integration |
| 6 | Tests | Verify functionality |

#### 3.3 Component Implementation

```typescript
// src/features/auth/actions/login.ts
import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { verifyPassword, createSession } from '../lib/auth';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const login = defineAction({
  accept: 'form',
  input: LoginSchema,
  handler: async ({ email, password }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !await verifyPassword(password, user.passwordHash)) {
      return fail(401, { error: 'Invalid credentials' });
    }

    const session = await createSession(user.id);
    return { success: true, session };
  },
});
```

```typescript
// src/features/auth/components/LoginForm.tsx
import { useState } from 'preact/hooks';
import { login } from '../actions/login';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const result = await login(formData);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

#### 3.4 Testing

```typescript
// src/features/auth/__tests__/login.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import { LoginForm } from '../components/LoginForm';

describe('LoginForm', () => {
  it('renders form elements', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    render(<LoginForm />);
    const button = screen.getByRole('button');
    
    fireEvent.submit(button);
    
    await waitFor(() => {
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    });
  });
});
```

---

### Phase 4: Review

#### 4.1 Self-Review Checklist

- [ ] TypeScript compiles without errors
- [ ] Lint passes
- [ ] Tests pass (80%+ coverage)
- [ ] Accessibility compliance
- [ ] SEO meta tags added
- [ ] Documentation updated

#### 4.2 Agent Review

| Reviewer | Focus | Required |
|----------|--------|-----------|
| Architecture | Component design | Yes |
| Security | Auth patterns | Yes |
| Performance | Loading strategy | Yes |
| Accessibility | a11y compliance | Yes |
| Code | Quality standards | Yes |

#### 4.3 Fixes

Address all blocking issues before merge.

---

### Phase 5: Deployment

#### 5.1 Pre-Deployment

```bash
# Run full validation
npm run validate

# Build production
npm run build

# Test in staging
# Verify all acceptance criteria
```

#### 5.2 Deployment

1. Merge to main branch
2. CI/CD deploys to staging
3. Smoke tests pass
4. Manual QA verification
5. Deploy to production

---

## Outputs

### Deliverables

1. **Implementation**
   - Components in `src/features/[feature]/`
   - Pages in `src/pages/`
   - Actions in `src/actions/`

2. **Tests**
   - Unit tests in `__tests__/`
   - Integration tests
   - E2E tests for critical paths

3. **Documentation**
   - README update
   - API documentation
   - Migration guide (if breaking)

4. **Artifacts**
   - ADR (if architectural decision)
   - Changelog entry
   - Release notes

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Functionality | All acceptance criteria met |
| Quality | 0 TypeScript errors, 0 lint errors |
| Testing | 80%+ test coverage |
| Performance | LCP < 2.5s, FID < 100ms |
| Accessibility | WCAG 2.1 AA compliant |
| Security | All security checks pass |

---

## Decision Points

### When to Stop?

| Condition | Action |
|-----------|--------|
| Requirements unclear | Pause, clarify with stakeholders |
| Technical blocker | Escalate to architect |
| Scope creep | Reject, focus on core |
| Quality issues | Fix before continuing |

### When to Pivot?

| Condition | Action |
|-----------|--------|
| Better solution found | Update architecture |
| Requirements changed | Restart from Phase 1 |
| Tech stack issue | Consult with team |

---

## Anti-Patterns

### Avoid

- **Big bang implementation** - Ship incrementally
- **Premature optimization** - First make it work
- **Scope creep** - Stick to acceptance criteria
- **Skipping tests** - Every feature needs tests
- **Ignoring review feedback** - Address all comments