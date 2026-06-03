# ADR-003: Authentication Strategy

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

Authentication is critical for:
- Protecting user data
- Managing access control
- Enabling user-specific features
- E-commerce and SaaS applications

The choice of authentication strategy affects:
- Security posture
- User experience
- Development complexity
- Infrastructure requirements
- Compliance requirements

### Decision Drivers

1. **Security requirements** - Password hashing, session management, MFA
2. **User experience** - Login friction, session persistence
3. **Integration complexity** - Third-party auth, social login
4. **Infrastructure** - Server-side vs. edge deployment
5. **Compliance** - GDPR, SOC2, etc.
6. **Team expertise** - Familiarity with auth patterns

## Decision

We adopt a **session-based authentication with secure defaults** using Better Auth:

### Primary: Better Auth

Modern authentication library optimized for Astro with edge compatibility.

**Features:**
- Session management
- Password hashing (bcrypt/argon2)
- OAuth/social login
- Magic links
- Email verification
- Rate limiting

**Implementation:**
```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from 'astro:db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: import.meta.env.GITHUB_CLIENT_ID,
      clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
});
```

### Session Middleware

```typescript
// src/middleware.ts
import { auth } from './lib/auth';
import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const session = await auth.getSession(context.request);
  
  // Protect routes
  const protectedPaths = ['/dashboard', '/settings', '/billing'];
  if (protectedPaths.some(p => context.url.pathname.startsWith(p))) {
    if (!session) {
      return context.redirect('/login');
    }
  }
  
  return next();
};
```

### Actions

```typescript
// src/actions/auth.ts
import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { auth } from '../lib/auth';

export const login = defineAction({
  accept: 'form',
  input: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  handler: async ({ email, password }) => {
    try {
      const session = await auth.signIn.emailPassword(email, password);
      return { success: true, session };
    } catch (error) {
      return fail(401, { error: 'Invalid credentials' });
    }
  },
});
```

## Alternatives Considered

### Option 1: Auth.js (NextAuth)

**Description:** Use Auth.js for authentication

**Pros:**
- Large community
- Many integrations
- Well-documented

**Cons:**
- Originally designed for Next.js
- Edge compatibility issues
- Over-engineered for simple cases

**Verdict:** Considered but rejected. Better Auth is more Astro-native.

### Option 2: Clerk

**Description:** Use Clerk for authentication

**Pros:**
- Complete auth solution
- Great UX components
- Handles edge cases

**Cons:**
- External dependency
- Vendor lock-in
- Cost for large applications
- Widget approach conflicts with Astro patterns

**Verdict:** Considered but rejected. Prefer self-hosted solution.

### Option 3: Custom JWT Implementation

**Description:** Build custom JWT-based authentication

**Pros:**
- Full control
- No dependencies
- Lightweight

**Cons:**
- Security vulnerabilities easy to introduce
- Missing features (OAuth, magic links)
- High maintenance burden

**Verdict:** Rejected. Too risky for production applications.

## Security Considerations

### Password Hashing

```typescript
// Secure by default
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(password, hash);
```

### Session Security

```typescript
// Secure session configuration
session: {
  cookie: {
    name: '_session',
    httpOnly: true,     // Prevent XSS
    secure: true,       // HTTPS only
    sameSite: 'lax',    // CSRF protection
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}
```

### Rate Limiting

```typescript
// Built-in rate limiting
const rateLimit = await auth.rateLimit(request, {
  max: 5,
  window: 60, // 5 attempts per minute
});

if (!rateLimit.success) {
  return fail(429, { error: 'Too many attempts' });
}
```

## Multi-Tenancy

For SaaS applications requiring multi-tenancy:

```typescript
// Tenant resolution
export async function getTenant(request: Request) {
  const session = await auth.getSession(request);
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    with: { tenant: true },
  });
  return user?.tenant;
}

// Tenant-scoped queries
export async function getUserData(userId: string, tenantId: string) {
  return db.select().from(UserData)
    .where(and(
      eq(UserData.userId, userId),
      eq(UserData.tenantId, tenantId)
    ));
}
```

## Tradeoffs

### Session vs. JWT

| Aspect | Sessions | JWT |
|--------|----------|-----|
| Storage | Server-side | Stateless |
| Revocation | Immediate | Complex |
| Size | Small cookie | Larger token |
| Security | Better (httponly) | Good |
| Scalability | Requires state | Stateless |

**Our choice:** Sessions for better security and revocation capabilities.

### Managed vs. Self-Hosted

| Aspect | Managed (Clerk) | Self-Hosted (Better Auth) |
|--------|-----------------|--------------------------|
| Maintenance | Low | Medium |
| Cost | Variable | Fixed (hosting) |
| Control | Limited | Full |
| Compliance | Handled | Self-managed |
| Vendor lock-in | High | None |

**Our choice:** Self-hosted for control and cost predictability.

## Consequences

### Positive

1. **Security-first design** - Built with security in mind
2. **Edge compatible** - Works on Cloudflare Workers, Vercel Edge
3. **Complete solution** - OAuth, magic links, MFA support
4. **Type safe** - Full TypeScript integration
5. **No vendor lock-in** - Self-hosted and portable

### Negative

1. **Maintenance responsibility** - Security updates, dependency management
2. **Compliance burden** - Self-managed compliance
3. **Feature additions** - Must implement new features ourselves

### Neutral

1. **Learning curve** - Better Auth specific patterns
2. **Documentation** - Less extensive than established solutions
3. **Community** - Smaller than Auth.js or Clerk

## Implementation Checklist

### Setup

- [ ] Install better-auth
- [ ] Configure database schema
- [ ] Set up environment variables
- [ ] Configure OAuth providers
- [ ] Implement session middleware

### Security

- [ ] Enable rate limiting
- [ ] Configure secure cookies
- [ ] Set up password hashing
- [ ] Enable HTTPS in production
- [ ] Configure CORS if needed

### Testing

- [ ] Unit tests for auth functions
- [ ] Integration tests for login/logout
- [ ] E2E tests for auth flows
- [ ] Security tests for auth bypass

## Future Considerations

### Revisit Triggers

1. **Better Auth major changes** - API changes
2. **Security vulnerabilities** - Must adapt
3. **Compliance requirements** - May need managed solution
4. **Team feedback** - Developer experience

### Potential Extensions

1. **MFA integration** - TOTP, WebAuthn
2. **SSO integration** - SAML, OIDC enterprise
3. **Password reset flow** - Email-based reset
4. **Account deletion** - GDPR compliance

## Related ADRs

- [ADR-002: Database](./ADR-002-database.md) - User data storage
- [ADR-006: Deployment](./ADR-006-deployment.md) - Edge deployment
- [Security Reviewer](../reviewers/security-reviewer.md) - Security validation