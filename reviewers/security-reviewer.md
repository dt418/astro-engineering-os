# Security Reviewer

> **Audience:** Humans (contributors, reviewers) + AI agents

Automated security compliance checking for Astro projects.

## Review Objectives

### Primary Goals

1. **Authentication** - Verify auth implementation
2. **Authorization** - Check permission enforcement
3. **Input Validation** - Prevent injection attacks
4. **Output Encoding** - Prevent XSS
5. **Data Protection** - Secure sensitive data

### Secondary Goals

- Dependency vulnerability scanning
- Configuration security
- Cookie and session security
- API security hardening

---

## Security Domains

### 1. Authentication (25%)

| Check | Pass Criteria | Severity |
|-------|--------------|----------|
| Session management | Secure session handling | Critical |
| Password storage | Hashed passwords | Critical |
| Auth middleware | Protected routes | High |
| Social auth | Secure OAuth flows | High |

#### Session Security

```typescript
// Required: Secure session configuration
session: {
  cookie: {
    name: '_session',
    httpOnly: true,      // Prevent XSS
    secure: true,        // HTTPS only
    sameSite: 'lax',     // CSRF protection
    maxAge: 60 * 60 * 24 // 24 hours
  }
}
```

### 2. Authorization (20%)

| Check | Pass Criteria | Severity |
|-------|--------------|----------|
| Role checks | Proper role validation | Critical |
| Resource ownership | User can only access own resources | High |
| Feature flags | Secure flag checking | Medium |
| API permissions | Proper scope checking | High |

#### Authorization Pattern

```typescript
// Good: Check ownership
if (post.authorId !== session.userId) {
  return new Response('Forbidden', { status: 403 });
}

// Bad: Missing check
const post = await db.select().from(posts).where(eq(posts.id, id));
```

### 3. Input Validation (20%)

| Check | Pass Criteria | Severity |
|-------|--------------|----------|
| Schema validation | Zod/similar for all inputs | Critical |
| SQL injection | Parameterized queries only | Critical |
| Command injection | No shell execution | Critical |
| File upload | Validate file types | High |

#### Validation Pattern

```typescript
// Good: Schema validation
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export const createUser = defineAction({
  input: UserSchema,
  handler: async (data) => { ... }
});

// Bad: No validation
handler: async (data) => {
  await db.insert(users).values(data); // Trusting input
}
```

### 4. Output Encoding (15%)

| Check | Pass Criteria | Severity |
|-------|--------------|----------|
| HTML escaping | Proper escaping in templates | Critical |
| JSON encoding | Safe JSON responses | High |
| URL encoding | Proper URL escaping | Medium |
| CSS sanitization | Safe CSS output | Medium |

### 5. Dependency Security (20%)

| Check | Pass Criteria | Severity |
|-------|--------------|----------|
| Known CVEs | No vulnerable packages | Critical |
| Outdated deps | Security patches applied | High |
| License compliance | Approved licenses only | Medium |

---

## Severity Levels

| Level | Definition | Action |
|-------|------------|--------|
| Critical | RCE, data breach, auth bypass | Immediate fix |
| High | SQL injection, XSS, CSRF | Must fix before merge |
| Medium | Information disclosure | Should fix |
| Low | Best practice violations | Could fix |

---

## Common Vulnerabilities

### Critical Vulnerabilities

| Vulnerability | Pattern | Fix |
|---------------|---------|-----|
| SQL Injection | String concatenation in queries | Use parameterized queries |
| Auth Bypass | Missing auth checks | Add middleware |
| IDOR | Direct object references | Check ownership |
| Command Injection | user input in shell | Avoid shell commands |

### High Vulnerabilities

| Vulnerability | Pattern | Fix |
|---------------|---------|-----|
| XSS | Unescaped user input | Escape in templates |
| CSRF | No CSRF tokens | Use built-in protection |
| Weak Crypto | MD5, SHA1 for passwords | Use bcrypt/argon2 |
| Secrets Exposure | API keys in code | Use environment variables |

### Medium Vulnerabilities

| Vulnerability | Pattern | Fix |
|---------------|---------|-----|
| Information Leak | Verbose errors | Generic error messages |
| Rate Limiting | No rate limits | Add rate limiting |
| CORS | Wildcard origins | Restrict origins |
| HTTPS | HTTP only | Force HTTPS |

---

## Review Process

### 1. Automated Scanning

```bash
# Run security tools
npm audit --audit-level=high
npx snyk test
```

### 2. Manual Review

- [ ] Authentication flow
- [ ] Authorization checks
- [ ] Input validation
- [ ] Output encoding
- [ ] Dependency usage

### 3. Configuration Review

- [ ] Environment variables
- [ ] Cookie settings
- [ ] CORS configuration
- [ ] Security headers

---

## Findings Format

```markdown
## Security Finding: [Title]

**Severity:** [Critical | High | Medium | Low]
**CWE:** [CWE-ID]
**OWASP:** [Top 10 Category]

### Description

[What vulnerability exists and risk]

### Vulnerable Code

```typescript
[vulnerable code]
```

### Attack Scenario

[How an attacker would exploit]

### Impact

[What could happen if exploited]

### Recommendation

[How to fix]

### References

- CWE-[number]: [Description]
- OWASP: [Reference]
```

---

## Rejection Criteria

### Automatic Rejection

Any Critical severity finding blocks merge:
- SQL injection vulnerabilities
- Authentication bypass
- Remote code execution risks
- Hardcoded secrets in code

### Must-Fix Before Merge

All High severity findings must be addressed:
- XSS vulnerabilities
- CSRF vulnerabilities
- Insecure deserialization

---

## Security Checklist

### Authentication

- [ ] Sessions use httpOnly, secure, sameSite
- [ ] Passwords hashed with bcrypt/argon2
- [ ] Auth middleware on protected routes
- [ ] Social auth validates state
- [ ] Session expiry enforced

### Authorization

- [ ] Resource ownership checked
- [ ] Role permissions validated
- [ ] API scope checked
- [ ] Feature flags secured

### Input Validation

- [ ] All user input validated with Zod
- [ ] No string concatenation in queries
- [ ] File uploads validated
- [ ] Type assertions avoided

### Output Encoding

- [ ] Template auto-escaping enabled
- [ ] JSON responses sanitized
- [ ] URLs properly encoded
- [ ] No innerHTML with user input

### Dependencies

- [ ] No known CVEs
- [ ] Security patches applied
- [ ] No deprecated packages
- [ ] License compliance verified

---

## Common Mistakes

### Authentication Mistakes

```typescript
// Bad: Weak password handling
const hash = crypto.createHash('md5').update(password).digest('hex');

// Good: Strong hashing
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
```

### Authorization Mistakes

```typescript
// Bad: Trusting client ID
const post = await db.select().from(posts).where(eq(posts.id, id));

// Good: Verify ownership
const post = await db.select().from(posts)
  .where(and(eq(posts.id, id), eq(posts.userId, session.userId)))
  .get();
if (!post) return new Response('Not found', { status: 404 });
```

### Validation Mistakes

```typescript
// Bad: No validation
await db.insert(users).values(body);

// Good: Validate input
const validated = UserSchema.parse(body);
await db.insert(users).values(validated);
```

---

## Usage by AI Agents

### Architect Agent

Request security review for:
- Authentication architecture
- Authorization design
- Data protection requirements

### Implementer Agent

Request security review before:
- Merging auth changes
- Adding payment processing
- Implementing file uploads

### Reviewer Agent

Perform security review for:
- All PRs touching auth
- Payment-related code
- User data handling

---

## Compliance Requirements

### OWASP Top 10 (2021)

- [ ] A01 - Broken Access Control
- [ ] A02 - Cryptographic Failures
- [ ] A03 - Injection
- [ ] A04 - Insecure Design
- [ ] A05 - Security Misconfiguration
- [ ] A06 - Vulnerable Components
- [ ] A07 - Auth Failures
- [ ] A08 - Data Integrity Failures
- [ ] A09 - Logging Failures
- [ ] A10 - SSRF

### GDPR Considerations

- [ ] Personal data encrypted
- [ ] Consent properly handled
- [ ] Data deletion implemented
- [ ] Privacy by design